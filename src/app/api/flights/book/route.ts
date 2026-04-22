import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  createBalanceOrder,
  getBalance,
  refreshOfferTotal,
  refreshOfferWithServices,
  PRICE_DRIFT_TOLERANCE_GBP,
} from '@/lib/duffel';
import { upsertBooking, type Booking } from '@/lib/bookings';
import { buildDuffelPassengers, pickLeadPassenger } from '@/lib/duffel-passengers';
import { reverseMarkup } from '@/lib/travel-logic';

export const runtime = 'nodejs';

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || '';

/**
 * POST /api/flights/book — THE FLIGHT ORCHESTRATOR.
 *
 * Merchant-of-record flow (post-April 2026):
 *
 *   1. Verify the Stripe PaymentIntent is 'succeeded' on OUR account
 *   2. Write a PENDING booking to our DB (source of truth)
 *   3. Re-quote the Duffel offer → detect price drift
 *      - drift ≤ £2.00 → we eat it, proceed
 *      - drift >  £2.00 → refund Stripe, tell customer
 *   4. Check Duffel balance covers the ticket (+ £10 buffer)
 *   5. Issue Duffel order with payment_type: 'balance'
 *   6. Update DB booking → CONFIRMED + Duffel order_id
 *   7. Return success (email/SMS sent elsewhere)
 *
 * If step 5 fails AFTER Stripe charge succeeded:
 *   - mark booking 'failed', auto-refund the PaymentIntent, surface error
 *
 * Body: {
 *   offerId: string,
 *   paymentIntentId: string,
 *   passengers: [...],
 *   sessionId?: string,
 * }
 */
export async function POST(req: NextRequest) {
  if (!STRIPE_KEY) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const stripe = new Stripe(STRIPE_KEY);
  const body = await req.json();
  const { offerId, paymentIntentId, passengers, sessionId } = body;
  // Phase 2a — ancillary services selected at checkout.
  // Shape: [{ id: "ase_...", quantity: 1 }]. Quantity is always 1 in our UI
  // but we forward whatever the client sent, then validate against the
  // fresh offer below.
  const rawServices: Array<{ id: string; quantity: number }> = Array.isArray(body.services)
    ? body.services.filter((s: any) => s?.id)
    : [];

  if (!offerId || !paymentIntentId || !passengers?.length) {
    return NextResponse.json(
      { error: 'Missing offerId, paymentIntentId, or passengers' },
      { status: 400 },
    );
  }

  /* ── Step 1: Verify Stripe PaymentIntent ─────────────────────────── */
  let pi: Stripe.PaymentIntent;
  try {
    pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Could not verify payment', detail: err?.message },
      { status: 400 },
    );
  }

  if (pi.status !== 'succeeded') {
    return NextResponse.json(
      { error: `Payment not confirmed (status: ${pi.status})` },
      { status: 402 },
    );
  }

  const lead = pickLeadPassenger(passengers) || passengers[0];
  const bookingId = `JMA-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const paidPence = pi.amount_received || pi.amount;
  const paidGbp = paidPence / 100;

  /* ── Step 2: Write PENDING booking ───────────────────────────────── */
  const pendingBooking: Booking = {
    id: bookingId,
    type: 'flight',
    supplier: 'duffel',
    supplierRef: null,
    status: 'pending',
    customerName: `${lead?.given_name || ''} ${lead?.family_name || ''}`.trim() || 'Guest',
    customerEmail: lead?.email || '',
    customerPhone: lead?.phone || null,
    destination: body.destination || '',
    checkIn: body.departureDate || null,
    checkOut: body.returnDate || null,
    guests: passengers.length,
    title: body.title || `Flight booking (${passengers.length} pax)`,
    totalPence: paidPence,
    netPence: 0,              // filled after Duffel order succeeds
    marginPence: 0,
    stripePaymentId: pi.id,
    paymentStatus: 'paid',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notes: 'Awaiting Duffel fulfilment',
  };

  await upsertBooking(pendingBooking);

  /* ── Step 3: Price-drift check + service validation ──────────────── */
  // If the customer selected any ancillaries we must fetch the offer with
  // available_services inlined — anything else risks booking with a stale
  // service-id and getting a post-charge 4xx. No-ancillary case falls back
  // to the cheaper endpoint.
  const refreshed =
    rawServices.length > 0
      ? await refreshOfferWithServices(offerId)
      : await refreshOfferTotal(offerId);

  if (!refreshed) {
    await refundAndFail(stripe, pi.id, pendingBooking, 'Offer no longer available');
    return NextResponse.json({ error: 'Offer no longer available — refunded' }, { status: 410 });
  }

  // Validate every client-requested service still exists on the fresh offer.
  // Server-side stale guard, complements the client one.
  const refreshedWithServices =
    rawServices.length > 0 && 'availableServiceIds' in refreshed
      ? (refreshed as {
          total: number;
          currency: string;
          availableServiceIds: Set<string>;
          servicePrices: Record<string, { amount: number; currency: string }>;
        })
      : null;

  let servicesTotal = 0;
  if (refreshedWithServices) {
    for (const svc of rawServices) {
      if (!refreshedWithServices.availableServiceIds.has(svc.id)) {
        await refundAndFail(
          stripe,
          pi.id,
          pendingBooking,
          `Ancillary service ${svc.id} no longer available`,
        );
        return NextResponse.json(
          { error: 'One of your extras is no longer available. Your card has been refunded.' },
          { status: 409 },
        );
      }
      const price = refreshedWithServices.servicePrices[svc.id];
      if (price) servicesTotal += price.amount * Math.max(1, Number(svc.quantity || 1));
    }

    // Ancillary price-drift check (bi-directional).
    //
    // "No markup on ancillaries" is a customer promise: if Duffel reprices
    // a bag between the quote and this call, we must refund rather than
    // silently pocket the difference (downward drift) or absorb a loss
    // (upward drift within tolerance). We read the quoted subtotal from
    // Stripe metadata — source of truth for what the customer actually
    // paid — rather than re-deriving it from the client request body.
    //
    // Tolerance: 50p. Larger than any realistic rounding noise, smaller
    // than any real Duffel price change we'd want to let through silently.
    const ANCILLARY_DRIFT_TOLERANCE_GBP = 0.5;
    const quotedServicesPence = Number(pi.metadata?.servicesSubtotalPence || '0');
    const quotedServicesTotal = quotedServicesPence / 100;
    const ancillaryDrift = Math.abs(servicesTotal - quotedServicesTotal);

    if (ancillaryDrift > ANCILLARY_DRIFT_TOLERANCE_GBP) {
      await refundAndFail(
        stripe,
        pi.id,
        pendingBooking,
        `Ancillary drift £${ancillaryDrift.toFixed(2)} (quoted £${quotedServicesTotal.toFixed(2)}, now £${servicesTotal.toFixed(2)})`,
      );
      const direction = servicesTotal > quotedServicesTotal ? 'increased' : 'decreased';
      return NextResponse.json(
        {
          error: `The price of your extras ${direction} by £${ancillaryDrift.toFixed(2)}. Your card has been refunded — please re-review and try again.`,
        },
        { status: 409 },
      );
    }
  }

  // Invert the percentage markup to recover the airline-quoted base price.
  // Services are pass-through at cost so they're NOT subject to the markup
  // inversion — we strip the ancillary portion before checking drift on the
  // base fare.
  const paidBaseFareTotal = paidGbp - servicesTotal;
  const paidPerPerson = paidBaseFareTotal / passengers.length;
  const quotedBasePerPerson = reverseMarkup(paidPerPerson);
  const actualPerPerson = refreshed.total / passengers.length;
  const driftPerPerson = actualPerPerson - quotedBasePerPerson;

  if (driftPerPerson > PRICE_DRIFT_TOLERANCE_GBP) {
    await refundAndFail(
      stripe,
      pi.id,
      pendingBooking,
      `Price increased by £${driftPerPerson.toFixed(2)} p/p — refunded`,
    );
    return NextResponse.json(
      { error: `Price changed by £${driftPerPerson.toFixed(2)} per person. Your card has been refunded.` },
      { status: 409 },
    );
  }

  // Duffel's `payments[].amount` must equal `offer.total_amount` plus the
  // sum of selected service prices to the penny — otherwise the order fails.
  const orderAmount = refreshed.total + servicesTotal;

  /* ── Step 4: Balance check ───────────────────────────────────────── */
  const balance = await getBalance();
  if (!balance) {
    await refundAndFail(stripe, pi.id, pendingBooking, 'Balance service unavailable');
    return NextResponse.json({ error: 'Booking system busy — refunded' }, { status: 503 });
  }

  // Buffer is £2 (not £10). The £10 safety margin was stranding real wallet
  // balance — e.g. £40 balance couldn't ticket a £33 fare because the check
  // demanded £43 available, Stripe auto-refunded, and booking "silently
  // failed". £2 still covers the sub-penny rounding + PRICE_DRIFT_TOLERANCE
  // edge case without gating live cash.
  if (balance.available < orderAmount + 2) {
    await refundAndFail(
      stripe,
      pi.id,
      pendingBooking,
      `Balance insufficient (have £${balance.available.toFixed(2)}, need £${orderAmount.toFixed(2)})`,
    );
    return NextResponse.json(
      { error: 'Booking system busy — your card has been refunded.' },
      { status: 503 },
    );
  }

  /* ── Step 5: Duffel balance order ────────────────────────────────── */
  const duffelPassengers = buildDuffelPassengers(passengers);
  const orderResult = await createBalanceOrder({
    offerId,
    passengers: duffelPassengers,
    amount: orderAmount.toFixed(2),
    currency: refreshed.currency,
    services: rawServices.length > 0
      ? rawServices.map((s) => ({ id: s.id, quantity: Math.max(1, Number(s.quantity || 1)) }))
      : undefined,
  });

  if (!orderResult.ok) {
    await refundAndFail(stripe, pi.id, pendingBooking, `Duffel failed: ${orderResult.error}`);
    return NextResponse.json(
      { error: orderResult.error || 'Booking failed — refunded' },
      { status: orderResult.status },
    );
  }

  const order = orderResult.order;

  /* ── Step 6: Update booking → CONFIRMED ──────────────────────────── */
  // Net cost to us = base fare + pass-through ancillaries.
  // Margin = customer paid − (base fare + ancillaries). Because ancillaries
  // are charged at cost with zero markup, marginPence is driven entirely by
  // the base-fare markup (reverseMarkup above is the inverse of this).
  const netPence = Math.round(orderAmount * 100);
  const marginPence = paidPence - netPence;

  const outSlice = order.slices?.[0];
  const origin = outSlice?.origin?.iata_code || '';
  const destCity = outSlice?.destination?.city_name || outSlice?.destination?.iata_code || '';
  const airline = outSlice?.segments?.[0]?.marketing_carrier?.name || '';

  await upsertBooking({
    ...pendingBooking,
    status: 'confirmed',
    supplierRef: order.id,
    netPence,
    marginPence,
    destination: destCity ? `${origin} → ${destCity}` : pendingBooking.destination,
    title: airline
      ? `${airline} — ${order.booking_reference || order.id}`
      : pendingBooking.title,
    updatedAt: new Date().toISOString(),
    notes: `Confirmed via Duffel balance. Ref: ${order.booking_reference || order.id}`,
  });

  /* ── Step 7: Return ──────────────────────────────────────────────── */
  return NextResponse.json({
    success: true,
    bookingId,
    bookingReference: order.booking_reference || order.id,
    orderId: order.id,
    priceDrift: Number(driftPerPerson.toFixed(2)),
    balance: balance.available,
  });
}

/* ─────────────────────────── helpers ─────────────────────────── */

async function refundAndFail(
  stripe: Stripe,
  piId: string,
  booking: Booking,
  reason: string,
): Promise<void> {
  try {
    await stripe.refunds.create({ payment_intent: piId });
  } catch (err) {
    console.error('Stripe refund failed', err);
  }
  try {
    await upsertBooking({
      ...booking,
      status: 'refunded',
      paymentStatus: 'refunded',
      updatedAt: new Date().toISOString(),
      notes: reason,
    });
  } catch (err) {
    console.error('Booking update after refund failed', err);
  }
}
