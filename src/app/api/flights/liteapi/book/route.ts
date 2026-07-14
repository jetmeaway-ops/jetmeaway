import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import {
  bookFlight,
  type FlightBookResult,
  type FlightContact,
  type FlightPassenger,
} from '@/lib/liteapi-flights';
import { upsertBooking, type Booking } from '@/lib/bookings';
import { notifyBookingConfirmed, notifyBookingDeclined } from '@/lib/notifications';

/**
 * POST /api/flights/liteapi/book — finalise a LiteAPI flight booking.
 *
 * Called by the confirm page AFTER the customer has paid via LiteAPI's hosted
 * Payment SDK (LiteAPI is merchant-of-record — same model as hotels; JetMeAway
 * never sees the card, and there is NO Stripe on our side).
 *
 * Body: { ref, prebookId, transactionId }
 * Success: { ok: true, ref, bookingRef }
 *
 * Contract (scratch/flights-build-spec.md §6):
 *   - Parked behind LITEAPI_FLIGHTS_ENABLED (Kyte pattern): off → 404.
 *   - Idempotent: if the record is already 'confirmed', echo the stored PNR.
 *   - Guard prebookId + transactionId against the stored prebook (409 'stale').
 *   - bookFlight retry ≤2 on network/transient error (book is idempotent per
 *     prebookId, so retrying is safe).
 *   - On success: stamp the pending-flight record confirmed (30d TTL), mirror
 *     into bookings:all via upsertBooking, and notifyBookingConfirmed.
 *   - On terminal failure: stamp 'failed', notifyBookingDeclined, 502.
 *
 * Node runtime — LiteAPI book can take 15-25s.
 */

const LITEAPI_FLIGHTS_ENABLED = process.env.LITEAPI_FLIGHTS_ENABLED === 'true';

export const runtime = 'nodejs';
export const maxDuration = 60;

const CONFIRMED_TTL_SECONDS = 30 * 24 * 60 * 60; // 30d once booked
const FAILED_TTL_SECONDS = 24 * 60 * 60; // 24h for triage
const MAX_BOOK_RETRIES = 2; // ≤2 retries on transient error (3 attempts total)

/* ── pending-flight KV record (spec §KV — SEPARATE namespace from hotels) ──── */

interface FlightTrip {
  origin: string;
  destination: string;
  depDate: string;
  retDate?: string;
  adults: number;
  children?: number;
  infants?: number;
  cabin: string;
  currency: string;
  totalPrice: number; // GBP major units, full trip
  airline?: string;
  airlineName?: string;
  segments?: unknown[];
}

interface PendingFlight {
  ref: string;
  type: 'flight';
  supplier: 'liteapi';
  state: 'pending' | 'prebooked' | 'confirmed' | 'failed';
  offerId: string;
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
  error?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Transient errors we retry: timeouts, network drops, 5xx upstream. 4xx
 *  (validation / stale offer) is terminal and must not be retried. */
function isTransient(err: unknown): boolean {
  const m = err instanceof Error ? err.message : String(err);
  return /timeout|fetch failed|network|socket|ECONN|ETIMEDOUT|EAI_AGAIN|\b50[234]\b/i.test(m);
}

/** Map a confirmed/failed pending-flight record onto the unified Booking shape.
 *  Money is stored in GBP PENCE. Field names come straight from src/lib/bookings.ts
 *  (id / supplierRef / customerPhone / totalPence are never renamed). */
function toBooking(
  record: PendingFlight,
  opts: { status: Booking['status']; supplierRef: string | null; notes: string },
): Booking {
  const trip = record.trip;
  const contact = record.contact;

  // Amount actually charged = the verified/prebooked price where available,
  // else the trip total captured at start-booking.
  const amountMajor =
    typeof record.verifiedPrice === 'number' && record.verifiedPrice > 0
      ? record.verifiedPrice
      : Number(trip.totalPrice) || 0;
  const totalPence = Math.round(amountMajor * 100);

  const customerName = contact
    ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Guest'
    : 'Guest';
  const customerEmail = contact?.email || '';
  const customerPhone =
    contact && contact.phoneNumber
      ? `+${String(contact.phoneCountryCode || '').replace(/\D/g, '')}${contact.phoneNumber}`
      : null;

  const route = `${trip.origin} → ${trip.destination}`;
  const title = trip.retDate ? `${route} (return)` : route;
  const guests = Math.max(
    1,
    (Number(trip.adults) || 0) + (Number(trip.children) || 0) + (Number(trip.infants) || 0),
  );

  const nowIso = new Date().toISOString();

  return {
    id: record.ref, // JMA-F-XXXXXXXX — matches clientReference sent to LiteAPI
    type: 'flight',
    supplier: 'liteapi',
    supplierRef: opts.supplierRef, // LiteAPI bookingId
    status: opts.status,
    customerName,
    customerEmail,
    customerPhone,
    destination: trip.destination || '',
    checkIn: trip.depDate || null, // flights: travel/departure date
    checkOut: trip.retDate || null, // return date if round-trip, else null
    guests,
    title, // flight route
    totalPence,
    // Flights don't surface a commission on the pending record → margin not
    // tracked yet; net == gross. Mirrors the hotels first-pass behaviour.
    netPence: totalPence,
    marginPence: 0,
    stripePaymentId: null, // LiteAPI is MoR — no Stripe PI on our side
    paymentStatus: opts.status === 'confirmed' ? 'paid' : 'pending',
    createdAt: nowIso,
    updatedAt: nowIso,
    notes: opts.notes,
  };
}

export async function POST(req: NextRequest) {
  // Parking gate — production leaves the flag unset → this route is invisible.
  if (!LITEAPI_FLIGHTS_ENABLED) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  let body: { ref?: string; prebookId?: string; transactionId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const ref = typeof body.ref === 'string' ? body.ref.trim() : '';
  const prebookId = typeof body.prebookId === 'string' ? body.prebookId.trim() : '';
  const transactionId = typeof body.transactionId === 'string' ? body.transactionId.trim() : '';
  if (!ref || !prebookId || !transactionId) {
    return NextResponse.json(
      { error: 'ref, prebookId and transactionId are required' },
      { status: 400 },
    );
  }

  const record = await kv.get<PendingFlight>(`pending-flight:${ref}`);
  if (!record) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  // Idempotency — already booked. Echo the stored PNR without re-charging.
  if (record.state === 'confirmed') {
    return NextResponse.json({
      ok: true,
      ref,
      bookingRef: record.bookingRef ?? record.bookingId ?? null,
    });
  }

  // Idempotency — a TERMINAL failure must not re-run bookFlight or re-fire the
  // decline email/SMS on a confirm-page reload (that page is force-dynamic and
  // re-POSTs /book on every load). Echo the stored error instead.
  if (record.state === 'failed') {
    // Always emit a STRING error — the confirm page renders this value, and an
    // object here would crash its render (500) instead of showing the graceful
    // "needs attention" card.
    const storedErr =
      typeof record.error === 'string' && record.error
        ? record.error
        : record.error
          ? JSON.stringify(record.error)
          : 'book_failed';
    return NextResponse.json({ error: storedErr }, { status: 502 });
  }

  // Guard — the prebook the customer paid for must match the one on file.
  // (record.prebookId is only set once prebook succeeded, so this also blocks
  // booking a record that never reached the prebooked state.)
  if (record.prebookId !== prebookId || record.transactionId !== transactionId) {
    return NextResponse.json({ error: 'stale' }, { status: 409 });
  }

  // ── BOOK with bounded retry on transient errors (bookFlight is idempotent
  //    per prebookId, so a retry can't double-book). ──────────────────────────
  let result: FlightBookResult | null = null;
  let lastError = '';
  for (let attempt = 0; attempt <= MAX_BOOK_RETRIES; attempt++) {
    try {
      const r = await bookFlight({ prebookId, transactionId, clientReference: ref });
      if (!r || !r.bookingId) {
        // Empty until the PaymentIntent fully settles — treat as transient.
        lastError = 'empty_book_result';
        if (attempt < MAX_BOOK_RETRIES) {
          await sleep(2000);
          continue;
        }
        break;
      }
      result = r;
      break;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error(
        `[flights/liteapi/book] attempt ${attempt + 1}/${MAX_BOOK_RETRIES + 1} failed:`,
        lastError,
      );
      if (attempt < MAX_BOOK_RETRIES && isTransient(err)) {
        await sleep(2000);
        continue;
      }
      break;
    }
  }

  /* ─────────────────────────── SUCCESS ─────────────────────────── */
  if (result && result.bookingId) {
    const bookingId = result.bookingId;
    const bookingRef = result.bookingRef || result.bookingId;

    const updated: PendingFlight = {
      ...record,
      state: 'confirmed',
      bookingId,
      bookingRef,
      updatedAt: Date.now(),
    };
    try {
      await kv.set(`pending-flight:${ref}`, updated, { ex: CONFIRMED_TTL_SECONDS });
    } catch (e) {
      console.error('[flights/liteapi/book] KV confirm write failed', e);
    }

    // Mirror into the unified admin/IVR/account bookings store.
    const booking = toBooking(record, {
      status: 'confirmed',
      supplierRef: bookingId,
      notes: `LiteAPI flight confirmed. PNR ${bookingRef}${
        record.trip.airlineName ? ` · ${record.trip.airlineName}` : ''
      }`,
    });
    await upsertBooking(booking);

    // Await notification — a background promise would be killed once we return.
    // Never let a mailer/SMS failure break the confirmation.
    await notifyBookingConfirmed(booking).catch((e) =>
      console.error('[flights/liteapi/book] notifyBookingConfirmed failed', e),
    );

    return NextResponse.json({ ok: true, ref, bookingRef });
  }

  /* ─────────────────────────── FAILURE ─────────────────────────── */
  console.error(`[flights/liteapi/book] terminal failure for ${ref}: ${lastError}`);
  const failed: PendingFlight = {
    ...record,
    state: 'failed',
    updatedAt: Date.now(),
    error: lastError,
  };
  try {
    await kv.set(`pending-flight:${ref}`, failed, { ex: FAILED_TTL_SECONDS });
  } catch (e) {
    console.error('[flights/liteapi/book] KV failure write failed', e);
  }

  const declined = toBooking(record, {
    status: 'failed',
    supplierRef: null,
    notes: `LiteAPI flight book failed: ${lastError}`,
  });
  await notifyBookingDeclined(declined, lastError).catch((e) =>
    console.error('[flights/liteapi/book] notifyBookingDeclined failed', e),
  );

  return NextResponse.json({ error: 'book_failed' }, { status: 502 });
}
