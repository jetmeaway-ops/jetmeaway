import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  offerDetails,
  newKyteContext,
  KyteConfigError,
  KyteProxyError,
  KyteAuthError,
  KyteValidationError,
  KyteServerError,
} from '@/lib/kyte';
import { reportBug } from '@/lib/report-bug';

/* ═══════════════════════════════════════════════════════════════════════════
   POST /api/flights/kyte/create-payment-intent

   Phase 1 of the agency-card payment bridge.

   Creates a Stripe PaymentIntent in `capture_method: 'manual'` mode (Auth +
   Hold). The customer's card is authorised but no money moves until we
   capture (Phase 3, after Kyte's payBooking returns status:'ok').

   PRICE AUTHORITY: server-side only. The airline price is fetched fresh
   from Kyte via offerDetails() — the client cannot tamper with the price.

   GROSS-UP MATH: customer pays (airline + £0.50 Kyte + £0.20 Stripe fixed)
   grossed up by Stripe's 1.5% UK card rate, so JetMeAway nets exactly
   `airline + £0.50` after Stripe takes its cut. Zero margin on the flight;
   profit comes from Kyte ancillaries (seat/bag commission), not the base
   fare. Matches CLAUDE.md's "no markup" promise for direct bookings.

   Body:  { offerId: string, transactionId: string }
   Reply: { clientSecret, paymentIntentId, total, breakdown }
   ═══════════════════════════════════════════════════════════════════════════ */

export const runtime = 'nodejs';
export const maxDuration = 60;

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || '';

/** Kyte's per-segment booking fee (sandbox value; verify against signed
 *  pricing letter when LIVE keys arrive). One-way = 1 segment = £0.50. */
const KYTE_SEGMENT_FEE_PENCE = 50;

/** Stripe UK card-present pricing components, used in the gross-up math.
 *  EU/UK cards: 1.5% + 20p. International cards are higher (2.5% + 20p)
 *  but we hard-code UK rate here — international customers slightly
 *  over-fund the airline charge, JetMeAway absorbs the ~1p delta. */
const STRIPE_FIXED_PENCE = 20;
const STRIPE_PCT = 0.015;

type Body = {
  offerId?: string;
  transactionId?: string;
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

  const offerId = (body.offerId || '').trim();
  const transactionId = (body.transactionId || '').trim();
  if (!offerId) {
    return NextResponse.json({ error: 'offerId is required' }, { status: 400 });
  }
  if (!transactionId) {
    return NextResponse.json({ error: 'transactionId is required' }, { status: 400 });
  }

  /* ---------- 1. Verify price with Kyte (server is the price authority) ---------- */
  let airlinePence: number;
  let currencyCode = 'GBP';
  try {
    const ctx = newKyteContext({ transactionId, posCountry: 'GB', currency: 'GBP' });
    const details = (await offerDetails([offerId], ctx)) as Record<string, unknown>;

    // offerDetails response shape can vary — try the most likely paths,
    // fall through defensively, and reportBug if none yield a usable price.
    const extracted = extractOfferPrice(details, offerId);
    if (!extracted) {
      reportBug('kyte create-payment-intent: offer price unavailable', {
        offerId,
        responseKeys: Object.keys(details || {}),
      });
      return NextResponse.json({ error: 'offer price unavailable' }, { status: 404 });
    }
    airlinePence = extracted.pence;
    if (extracted.currency) currencyCode = extracted.currency;
  } catch (err) {
    return mapKyteError(err);
  }

  /* ---------- 2. Gross-up calculation ---------- */
  // total = (airline + kyte_fee + stripe_fixed) / (1 - stripe_pct)
  // All integer-pence to dodge floating-point drift.
  const subtotalPence = airlinePence + KYTE_SEGMENT_FEE_PENCE + STRIPE_FIXED_PENCE;
  const totalPence = Math.ceil(subtotalPence / (1 - STRIPE_PCT));
  // What Stripe takes from us. Always >= STRIPE_FIXED_PENCE + 1.5% of total.
  const stripeFeePence = totalPence - airlinePence - KYTE_SEGMENT_FEE_PENCE;

  /* ---------- 3. Create the PaymentIntent (Auth + Hold) ---------- */
  let pi;
  try {
    const stripe = new Stripe(STRIPE_KEY);
    pi = await stripe.paymentIntents.create({
      amount: totalPence,
      currency: currencyCode.toLowerCase(),
      capture_method: 'manual', // <-- the Auth + Hold pattern
      automatic_payment_methods: { enabled: true },
      description: `JetMeAway flight (offer ${offerId.slice(0, 12)}…)`,
      metadata: {
        source: 'kyte',
        kyte_offer_id: offerId,
        kyte_transaction_id: transactionId,
        airline_pence: String(airlinePence),
        kyte_fee_pence: String(KYTE_SEGMENT_FEE_PENCE),
        stripe_fee_pence: String(stripeFeePence),
        total_pence: String(totalPence),
        currency_code: currencyCode,
      },
    });
  } catch (err) {
    reportBug('kyte create-payment-intent: stripe create failed', {
      offerId,
      airlinePence,
      totalPence,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'failed to create payment intent' }, { status: 502 });
  }

  /* ---------- 4. Return clientSecret + breakdown for the frontend ---------- */
  return NextResponse.json({
    clientSecret: pi.client_secret,
    paymentIntentId: pi.id,
    total: totalPence,
    breakdown: {
      airline: airlinePence,
      kyteFee: KYTE_SEGMENT_FEE_PENCE,
      processing: stripeFeePence,
      currency: currencyCode,
    },
  });
}

/**
 * Extract the airline price from Kyte's offerDetails response.
 * The response shape is loosely typed (response objects vary by carrier
 * + endpoint); we try the most likely paths and return null if none hit.
 *
 * Returns price in minor units (pence) per Kyte convention.
 */
function extractOfferPrice(
  details: Record<string, unknown>,
  offerId: string,
): { pence: number; currency?: string } | null {
  // Path 1: details.offers[offerId].totalPrice
  const offers = (details?.offers ?? null) as Record<string, unknown> | null;
  if (offers && typeof offers === 'object') {
    const offer = offers[offerId] as Record<string, unknown> | undefined;
    if (offer) {
      const p = Number(offer.totalPrice);
      const c = (offer.currency as { code?: string } | undefined)?.code;
      if (Number.isFinite(p) && p > 0) return { pence: p, currency: c?.toUpperCase() };
    }

    // Path 2: details.offers[<first key>].totalPrice (if Kyte uses a
    // generated id different from the request offerId — observed in
    // sandbox for some carriers).
    const firstKey = Object.keys(offers)[0];
    if (firstKey) {
      const first = offers[firstKey] as Record<string, unknown> | undefined;
      const p = Number(first?.totalPrice);
      const c = (first?.currency as { code?: string } | undefined)?.code;
      if (Number.isFinite(p) && p > 0) return { pence: p, currency: c?.toUpperCase() };
    }
  }

  // Path 3: top-level totalPrice on the response itself.
  const top = Number((details as { totalPrice?: unknown }).totalPrice);
  if (Number.isFinite(top) && top > 0) return { pence: top };

  return null;
}

function mapKyteError(err: unknown): NextResponse {
  if (err instanceof KyteConfigError) {
    return NextResponse.json({ error: 'kyte not configured' }, { status: 503 });
  }
  if (err instanceof KyteProxyError) {
    return NextResponse.json({ error: 'kyte proxy error' }, { status: 502 });
  }
  if (err instanceof KyteAuthError) {
    return NextResponse.json({ error: 'kyte auth error' }, { status: 502 });
  }
  if (err instanceof KyteValidationError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  if (err instanceof KyteServerError) {
    return NextResponse.json({ error: 'kyte upstream error' }, { status: 502 });
  }
  reportBug('kyte create-payment-intent: unexpected error', {
    error: err instanceof Error ? err.message : String(err),
  });
  return NextResponse.json({ error: 'unexpected error' }, { status: 500 });
}
