import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  createBalanceOrder,
  getBalance,
  refreshOfferTotal,
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

  /* ── Step 3: Price-drift check ───────────────────────────────────── */
  const refreshed = await refreshOfferTotal(offerId);
  if (!refreshed) {
    await refundAndFail(stripe, pi.id, pendingBooking, 'Offer no longer available');
    return NextResponse.json({ error: 'Offer no longer available — refunded' }, { status: 410 });
  }

  // Invert the percentage markup to recover the airline-quoted base price.
  const paidPerPerson = paidGbp / passengers.length;
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

  /* ── Step 4: Balance check ───────────────────────────────────────── */
  const balance = await getBalance();
  if (!balance) {
    await refundAndFail(stripe, pi.id, pendingBooking, 'Balance service unavailable');
    return NextResponse.json({ error: 'Booking system busy — refunded' }, { status: 503 });
  }

  if (balance.available < refreshed.total + 10) {
    await refundAndFail(
      stripe,
      pi.id,
      pendingBooking,
      `Balance insufficient (have £${balance.available.toFixed(2)}, need £${refreshed.total.toFixed(2)})`,
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
    amount: refreshed.total.toFixed(2),
    currency: refreshed.currency,
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
  const netPence = Math.round(refreshed.total * 100);
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
