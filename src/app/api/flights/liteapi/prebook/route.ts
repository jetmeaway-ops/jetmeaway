import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import {
  verifyFlight,
  prebookFlight,
  type FlightContact,
  type FlightPassenger,
} from '@/lib/liteapi-flights';
import { reportBug } from '@/lib/report-bug';

// Node runtime — LiteAPI verify + prebook is a two-call chain that can take
// 15-30s combined; Edge times out too early. (Mirrors the hotels prebook
// route, which runs on Node for the same reason.)
export const runtime = 'nodejs';
export const maxDuration = 60;

// Parking gate (Kyte pattern). Prod leaves this unset → every flight write
// route 404s → checkout is unreachable → nothing changes for live users.
const LITEAPI_FLIGHTS_ENABLED = process.env.LITEAPI_FLIGHTS_ENABLED === 'true';

const PENDING_TTL_SECONDS = 4 * 60 * 60; // 4h to complete checkout

/**
 * Pending flight booking record — KV key `pending-flight:{ref}`.
 *
 * SEPARATE namespace from hotels' `pending-booking:`. Written by
 * start-booking, grown through the flow. Defined locally here (rather than
 * imported from the start-booking route) to keep this route self-contained.
 * Field shapes match scratch/flights-build-spec.md §KV.
 */
interface FlightTrip {
  origin: string;
  destination: string;
  depDate: string;
  retDate?: string;
  adults: number;
  children: number;
  infants: number;
  cabin: string;
  currency: string;
  totalPrice: number;
  airline?: string;
  airlineName?: string;
  segments?: unknown[];
}

interface PendingFlight {
  ref: string;
  type: 'flight';
  supplier: 'liteapi';
  state: 'pending' | 'prebooked' | 'confirmed' | 'failed';
  offerId: string; // server-side only — NEVER returned to the client
  trip: FlightTrip;
  passengers?: FlightPassenger[];
  contact?: FlightContact;
  prebookId?: string;
  transactionId?: string;
  secretKey?: string;
  verifiedPrice?: number;
  verifiedCurrency?: string;
  bookingId?: string;
  bookingRef?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * POST /api/flights/liteapi/prebook
 *
 * Body: { ref: string }
 *
 * Flow (spec §5):
 *   1. verifyFlight(offerId)  — REQUIRED before prebook; guaranteed price +
 *      `changes` block if the fare shifted since search.
 *   2. prebookFlight(offerId, contact, passengers) — holds the seat, opens
 *      the LiteAPI-hosted payment session (returns a Stripe PI client secret).
 *   3. Drift guard — reject if the prebook price is BOTH > 5% AND > £5 off the
 *      price the customer saw at search time (409 price_changed, no store).
 *   4. Persist prebookId / transactionId / secretKey + guaranteed price and
 *      return them so the checkout page can init the payment SDK.
 *
 * Sold-out (LiteAPI 53010) → 409 sold_out.
 */
export async function POST(req: NextRequest) {
  // Parking gate — write routes 404 while the flag is off.
  if (!LITEAPI_FLIGHTS_ENABLED) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const ref = typeof body?.ref === 'string' ? body.ref.trim() : '';
  if (!ref) {
    return NextResponse.json({ error: 'ref is required' }, { status: 400 });
  }

  try {
    const record = await kv.get<PendingFlight>(`pending-flight:${ref}`);
    if (!record) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    if (!record.offerId) {
      return NextResponse.json({ error: 'no_offer' }, { status: 400 });
    }
    // Passengers + contact are collected on the checkout page BEFORE prebook
    // (unlike hotels). They MUST be on the record by now.
    if (
      !record.contact ||
      !Array.isArray(record.passengers) ||
      record.passengers.length === 0
    ) {
      return NextResponse.json({ error: 'passengers_required' }, { status: 400 });
    }

    // 1. VERIFY — guaranteed price + change detection. Required before prebook.
    //    Verify may also hand back a fresh offerId to carry into prebook.
    const verify = await verifyFlight(record.offerId);
    const changes = (verify as { changes?: unknown } | null)?.changes;
    const hasChanges =
      !!changes &&
      (Array.isArray(changes)
        ? changes.length > 0
        : typeof changes === 'object' && Object.keys(changes as object).length > 0);
    if (hasChanges) {
      // Informational — the drift guard on the prebook price is the real gate.
      console.warn(`[flights/prebook] verify returned a changes block for ${ref}`);
    }
    const verifiedOfferId =
      typeof (verify as { offerId?: unknown })?.offerId === 'string'
        ? ((verify as { offerId: string }).offerId)
        : record.offerId;

    // 2. PREBOOK — collect pax + contact, hold the seat, open payment session.
    const result = await prebookFlight(verifiedOfferId, record.contact, record.passengers);

    const currency = result.currency || record.trip.currency || 'GBP';
    const newPrice = Number(result.price) || 0;
    const searchPrice = Number(record.trip.totalPrice) || 0;

    // 3. DRIFT GUARD — reject only when the prebook price is BOTH > 5% AND
    //    > £5 off what the customer saw at search (spec §5 — note this is AND,
    //    unlike the hotels route's OR). Smaller drifts pass through: the
    //    payment SDK shows the up-to-date figure before card entry. On reject
    //    we do NOT persist anything — the record stays 'pending'.
    if (searchPrice > 0 && newPrice > 0) {
      const driftAbs = Math.abs(newPrice - searchPrice);
      const driftPct = driftAbs / searchPrice;
      if (driftPct > 0.05 && driftAbs > 5) {
        console.warn(
          `[flights/prebook] price drift rejected: search=£${searchPrice.toFixed(2)} ` +
            `new=£${newPrice.toFixed(2)} drift=${(driftPct * 100).toFixed(1)}% (£${driftAbs.toFixed(2)})`,
        );
        reportBug('Flight price drift > 5% & > £5 rejected at prebook', {
          ref,
          searchPrice,
          newPrice,
          driftPercent: Math.round(driftPct * 1000) / 10,
          driftAbs: Math.round(driftAbs * 100) / 100,
        });
        return NextResponse.json(
          {
            error: 'price_changed',
            newPrice,
            currency,
            message: `The price has changed since your search (was £${searchPrice.toFixed(
              2,
            )}, now £${newPrice.toFixed(2)}). Please search again to see the latest fare.`,
          },
          { status: 409 },
        );
      }
    }

    // 4. Persist prebook artefacts + guaranteed price. state → 'prebooked'.
    const updated: PendingFlight = {
      ...record,
      prebookId: result.prebookId,
      transactionId: result.transactionId,
      secretKey: result.secretKey,
      verifiedPrice: newPrice || record.trip.totalPrice,
      verifiedCurrency: currency,
      state: 'prebooked',
      updatedAt: Date.now(),
    };
    await kv.set(`pending-flight:${ref}`, updated, { ex: PENDING_TTL_SECONDS });

    return NextResponse.json({
      prebookId: result.prebookId,
      transactionId: result.transactionId,
      secretKey: result.secretKey,
      price: newPrice || record.trip.totalPrice,
      currency,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[flights/prebook]', message);

    // Sold-out — LiteAPI 53010 "offer sold out" (seat gone between search and
    // prebook, or transient sandbox inventory). Normal supplier behaviour, not
    // a code bug: clean 409 so the checkout page can show its "search again"
    // message instead of a generic 500. No bug report (mirrors hotels' handling
    // of rate_unavailable).
    if (message.includes('53010') || /sold\s*out/i.test(message)) {
      return NextResponse.json({ error: 'sold_out' }, { status: 409 });
    }

    reportBug('Flight prebook failed', {
      ref,
      error: message,
      stack: err instanceof Error ? err.stack?.slice(0, 800) : undefined,
    });
    return NextResponse.json({ error: 'prebook_failed', message }, { status: 500 });
  }
}
