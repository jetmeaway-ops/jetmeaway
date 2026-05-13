import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  payBooking,
  KyteAuthError,
  KyteConfigError,
  KyteProxyError,
  KyteServerError,
  KyteValidationError,
  type KyteCard,
  type KytePayer,
  type KytePaymentRequest,
  type Title,
} from '@/lib/kyte';
import { upsertBooking, type Booking } from '@/lib/bookings';
import { notifyBookingConfirmed } from '@/lib/notifications';
import { reportBug } from '@/lib/report-bug';

/* ═══════════════════════════════════════════════════════════════════════════
   POST /api/flights/kyte/payment   (Phase 3 — the "Bridge")

   Pivoted from Path B (customer card direct) to Path A (agency-card bridge).
   No longer accepts customer card data in the request body. Instead:

   1. Reads AGENCY_CARD_* env vars (10 sensitive vars in Vercel) to build
      the KyteCard payload — JetMeAway's own business credit card.
   2. Calls Kyte payBooking() with the agency card.
   3. On success (status === 'ok'): captures the previously-authorised
      Stripe PaymentIntent (Auth + Hold from Phase 1).
   4. On failure: cancels the PI hold (or refunds if already captured) so
      the customer is not charged for a booking that didn't happen.

   ⚠ Node runtime — undici.ProxyAgent + Stripe SDK both require Node.

   Body: {
     transactionId, bookingId, amount, paymentIntentId,
     payer: { firstName, lastName, title, email, phone: { countryCode, number } },
     transactionType?: 'moto',           // Ryanair OTA
     codegen?: boolean,                  // Ryanair OTA
     tripContext?: { destination, departureDate, returnDate, passengerCount, title },
   }

   Response (200): { status: 'ok', internalBookingId, captured: boolean }
   Response (4xx/5xx): { error }

   PCI scope: SAQ A on the customer card (Stripe Elements + Stripe-hosted
   collection in Phase 2 + capture from server post-Kyte). The agency
   card is JetMeAway's own card — handled at the secrets-management
   level (Vercel Sensitive env vars), not subject to vaulting / SAQ-D.
   ═══════════════════════════════════════════════════════════════════════════ */

export const runtime = 'nodejs';
export const maxDuration = 60;

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || '';

type Body = {
  transactionId?: string;
  bookingId?: string;
  amount?: number;
  /** Stripe PaymentIntent ID from Phase 1 — in `requires_capture` state. */
  paymentIntentId?: string;
  payer?: {
    firstName?: string;
    lastName?: string;
    title?: Title;
    email?: string;
    phone?: { countryCode?: string; number?: string };
  };
  transactionType?: 'moto';
  codegen?: boolean;
  tripContext?: {
    destination?: string;
    departureDate?: string;
    returnDate?: string | null;
    passengerCount?: number;
    title?: string;
  };
};

export async function POST(req: NextRequest) {
  if (!STRIPE_KEY) {
    return NextResponse.json({ error: 'stripe not configured' }, { status: 503 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid json body' }, { status: 400 });
  }

  /* ---------- 1. Validate request body ---------- */
  const transactionId = (body.transactionId || '').trim();
  const bookingId = (body.bookingId || '').trim();
  const paymentIntentId = (body.paymentIntentId || '').trim();
  const amount = Number(body.amount);
  if (!transactionId) {
    return NextResponse.json({ error: 'transactionId is required' }, { status: 400 });
  }
  if (!bookingId) {
    return NextResponse.json({ error: 'bookingId is required' }, { status: 400 });
  }
  if (!paymentIntentId) {
    return NextResponse.json({ error: 'paymentIntentId is required' }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
  }

  const p = body.payer || {};
  if (
    !p.firstName ||
    !p.lastName ||
    !p.title ||
    !p.email ||
    !p.phone?.countryCode ||
    !p.phone?.number
  ) {
    return NextResponse.json(
      { error: 'payer requires firstName, lastName, title, email, phone' },
      { status: 400 },
    );
  }

  /* ---------- 2. Build the agency-card payload from env vars ---------- */
  let agencyCard: KyteCard;
  try {
    agencyCard = readAgencyCardFromEnv();
  } catch (err) {
    reportBug('kyte payment: agency card env vars missing/invalid', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'agency card not configured' }, { status: 503 });
  }

  const stripe = new Stripe(STRIPE_KEY);

  /* ---------- 3. Verify the Stripe PI is in the expected state ---------- */
  // Defence: if the PI was already captured (retry) or cancelled (race),
  // don't waste a Kyte call. Customer state must be `requires_capture`.
  let pi: Stripe.PaymentIntent;
  try {
    pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch (err) {
    reportBug('kyte payment: stripe PI retrieve failed', {
      paymentIntentId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'payment intent not found' }, { status: 404 });
  }
  if (pi.status !== 'requires_capture') {
    return NextResponse.json(
      { error: `payment intent in unexpected state: ${pi.status}` },
      { status: 409 },
    );
  }

  const payer: KytePayer = {
    id: agencyCard.owner,
    firstName: p.firstName!,
    lastName: p.lastName!,
    title: p.title!,
    contactInformation: {
      email: p.email!,
      phone: [{ countryCode: p.phone!.countryCode!, number: p.phone!.number!, type: 'Home' }],
    },
  };

  const payment: KytePaymentRequest = {
    method: 'card',
    amount,
    creditCardInfo: [agencyCard],
    payerInformation: [payer],
  };
  if (body.transactionType === 'moto') payment.transactionType = 'moto';
  if (body.codegen === true) payment.codegen = true;

  /* ---------- 4. Call Kyte payBooking with the agency card ---------- */
  let kyteStatus: string;
  try {
    const res = await payBooking(bookingId, payment, { transactionId });
    kyteStatus = res.status ?? 'unknown';
  } catch (err) {
    // Kyte rejected the payment. Customer's Stripe hold must be released
    // so they don't get a "pending" line that sits for days.
    await releasePaymentIntent(stripe, paymentIntentId, pi.status);
    reportBug('kyte payment: payBooking failed — Stripe hold released', {
      paymentIntentId,
      bookingId,
      error: err instanceof Error ? err.message : String(err),
    });
    return mapError(err);
  }

  if (kyteStatus !== 'ok') {
    // Kyte returned 200 but with a non-ok status (rare — usually means
    // the booking went into a held/pending state). Release the hold and
    // surface so the customer can retry.
    await releasePaymentIntent(stripe, paymentIntentId, pi.status);
    reportBug('kyte payment: status not ok — Stripe hold released', {
      paymentIntentId,
      bookingId,
      kyteStatus,
    });
    return NextResponse.json(
      { error: 'kyte returned non-ok status', kyteStatus },
      { status: 502 },
    );
  }

  /* ---------- 5. CAPTURE the Stripe PaymentIntent (with retry) ---------- */
  // THE money-leakage hotspot — if Kyte booked but Stripe capture fails,
  // we paid the airline with our agency card and the customer didn't pay
  // us. Retry once after 1s; if both attempts fail, log CRITICAL and
  // STILL return success to the customer (their booking exists, we owe
  // the airline; owner reconciles via Stripe dashboard).
  let captured = false;
  try {
    await stripe.paymentIntents.capture(paymentIntentId);
    captured = true;
  } catch (firstErr) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      await stripe.paymentIntents.capture(paymentIntentId);
      captured = true;
    } catch (secondErr) {
      reportBug('CRITICAL: kyte booked but stripe capture failed', {
        paymentIntentId,
        bookingId,
        priority: 'high',
        firstError: firstErr instanceof Error ? firstErr.message : String(firstErr),
        secondError:
          secondErr instanceof Error ? secondErr.message : String(secondErr),
      });
      // Do NOT return an error. Customer booking is real — owner must
      // capture manually from Stripe Dashboard. Surfacing failure here
      // would tell the customer their booking didn't work when in fact
      // their ticket is issued.
    }
  }

  /* ---------- 6. Persist booking + fire confirmation email ---------- */
  let internalBookingId: string | undefined;
  if (body.tripContext) {
    internalBookingId = await persistBooking(body, bookingId, amount, paymentIntentId);
  }

  return NextResponse.json({
    status: 'ok',
    internalBookingId,
    captured,
  });
}

/* ───────────────────────────── helpers ───────────────────────────── */

/**
 * Read the 10 AGENCY_CARD_* env vars and assemble a KyteCard. Throws
 * with a clear message if any required field is missing — handled at
 * the route-level catch with a 503 + reportBug.
 *
 * Note on year: AGENCY_CARD_EXP_YEAR is stored as 4 digits ("2027"),
 * but Kyte's `valid.year` field wants 2 digits (27). We mod-100 here.
 */
function readAgencyCardFromEnv(): KyteCard {
  const required = [
    'AGENCY_CARD_NUMBER',
    'AGENCY_CARD_EXP_MONTH',
    'AGENCY_CARD_EXP_YEAR',
    'AGENCY_CARD_CVC',
    'AGENCY_CARD_HOLDER_NAME',
    'AGENCY_CARD_TYPE',
    'AGENCY_CARD_BILLING_LINE1',
    'AGENCY_CARD_BILLING_CITY',
    'AGENCY_CARD_BILLING_POSTAL',
    'AGENCY_CARD_BILLING_COUNTRY',
  ] as const;
  for (const k of required) {
    if (!process.env[k]) throw new Error(`missing env var: ${k}`);
  }

  const month = Number(process.env.AGENCY_CARD_EXP_MONTH);
  const year4 = Number(process.env.AGENCY_CARD_EXP_YEAR);
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('AGENCY_CARD_EXP_MONTH must be an integer 1-12');
  }
  if (!Number.isInteger(year4) || year4 < 2000 || year4 > 2099) {
    throw new Error('AGENCY_CARD_EXP_YEAR must be a 4-digit year');
  }
  const year2 = year4 % 100; // Kyte wants 2-digit year

  const type = process.env.AGENCY_CARD_TYPE as KyteCard['type'];
  const validTypes: KyteCard['type'][] = [
    'visa-credit',
    'visa-debit',
    'mastercard-credit',
    'mastercard-debit',
    'amex',
  ];
  if (!validTypes.includes(type)) {
    throw new Error(
      `AGENCY_CARD_TYPE must be one of ${validTypes.join('|')} — got: ${type}`,
    );
  }

  return {
    number: (process.env.AGENCY_CARD_NUMBER || '').replace(/\s+/g, ''),
    cardholderName: process.env.AGENCY_CARD_HOLDER_NAME!.trim(),
    valid: { month, year: year2 },
    security: (process.env.AGENCY_CARD_CVC || '').trim(),
    type,
    isCorporate: false,
    address: {
      addressLines: [process.env.AGENCY_CARD_BILLING_LINE1!.trim()],
      city: process.env.AGENCY_CARD_BILLING_CITY!.trim(),
      postalCode: process.env.AGENCY_CARD_BILLING_POSTAL!.trim(),
      countryCode: process.env.AGENCY_CARD_BILLING_COUNTRY!.trim(),
    },
    owner: '1', // matches payer.id below
  };
}

/**
 * Release a Stripe PaymentIntent hold. Use the right call for the
 * current state — cancel for requires_capture, refund for succeeded.
 * Best-effort: errors are reportBug'd but never propagated.
 */
async function releasePaymentIntent(
  stripe: Stripe,
  paymentIntentId: string,
  currentStatus: string,
): Promise<void> {
  try {
    if (currentStatus === 'requires_capture') {
      await stripe.paymentIntents.cancel(paymentIntentId);
    } else if (currentStatus === 'succeeded') {
      // Race condition: somehow already captured. Refund instead.
      await stripe.refunds.create({ payment_intent: paymentIntentId });
    } else {
      // Other states (canceled, requires_action, etc.) — nothing to release.
    }
  } catch (err) {
    reportBug('kyte payment: release hold failed', {
      paymentIntentId,
      currentStatus,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Write a confirmed Booking row to `bookings:all`. KV write failure is
 * logged but does NOT fail the route — the payment already succeeded on
 * Kyte's side, and a missing KV row is less bad than telling the caller
 * the payment failed (which would cause them to retry).
 */
async function persistBooking(
  body: Body,
  kyteBookingId: string,
  amount: number,
  stripePaymentId: string,
): Promise<string | undefined> {
  const ctx = body.tripContext!;
  const payer = body.payer!;
  const tripTitle = ctx.title || `Kyte flight booking (${ctx.passengerCount ?? 1} pax)`;
  const customerPhone =
    payer.phone?.countryCode && payer.phone?.number
      ? `${payer.phone.countryCode}${payer.phone.number}`
      : null;

  const internalId = `JMA-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const now = new Date().toISOString();
  const record: Booking = {
    id: internalId,
    type: 'flight',
    supplier: 'kyte',
    supplierRef: kyteBookingId,
    status: 'confirmed',
    customerName: `${payer.firstName} ${payer.lastName}`.trim() || 'Guest',
    customerEmail: payer.email!,
    customerPhone,
    destination: ctx.destination || '',
    checkIn: ctx.departureDate || null,
    checkOut: ctx.returnDate || null,
    guests: ctx.passengerCount ?? 1,
    title: tripTitle,
    totalPence: amount,
    netPence: 0,
    marginPence: 0, // zero-profit pass-through: customer paid airline + Stripe + Kyte fee, JetMeAway nets £0
    stripePaymentId,
    paymentStatus: 'paid',
    createdAt: now,
    updatedAt: now,
    notes: null,
  };

  try {
    await upsertBooking(record);
    notifyBookingConfirmed(record).catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[kyte/payment] notifyBookingConfirmed failed', (err as Error).message);
    });
    return internalId;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[kyte/payment] KV upsert failed', (err as Error).message);
    return undefined;
  }
}

function mapError(err: unknown): NextResponse {
  if (err instanceof KyteConfigError) {
    return NextResponse.json({ error: 'kyte not configured' }, { status: 503 });
  }
  if (err instanceof KyteProxyError) {
    return NextResponse.json({ error: 'kyte proxy error' }, { status: 502 });
  }
  if (err instanceof KyteAuthError) {
    return NextResponse.json({ error: 'kyte auth/IP rejected' }, { status: 502 });
  }
  if (err instanceof KyteValidationError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  if (err instanceof KyteServerError) {
    return NextResponse.json({ error: 'kyte upstream error' }, { status: 502 });
  }
  return NextResponse.json({ error: 'unexpected error' }, { status: 500 });
}
