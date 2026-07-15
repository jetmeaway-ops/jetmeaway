import { kv } from '@vercel/kv';
import {
  bookFlight,
  type FlightBookResult,
  type FlightContact,
  type FlightPassenger,
} from '@/lib/liteapi-flights';
import { upsertBooking, type Booking } from '@/lib/bookings';
import {
  notifyBookingConfirmed,
  notifyBookingDeclined,
  notifyOwnerOpsAlert,
} from '@/lib/notifications';

/**
 * Shared LiteAPI flight booking finaliser.
 *
 * The core "the customer has paid — now confirm the booking" logic, extracted so
 * it can be called BOTH by the /api/flights/liteapi/book route AND directly by
 * the confirm page. The confirm page used to finalise via a server-to-server
 * HTTP fetch to the book route; on a Vercel password-protected deployment that
 * internal call is blocked (401 "Protected deployment"), and even in production
 * an internal HTTP hop is an unnecessary failure point in a payment flow. Calling
 * this function directly removes both problems.
 *
 * Node runtime only (LiteAPI /flights/bookings can take 15–25s).
 */

const CONFIRMED_TTL_SECONDS = 30 * 24 * 60 * 60; // 30d once booked
const FAILED_TTL_SECONDS = 24 * 60 * 60; // 24h for triage
const MAX_BOOK_RETRIES = 2; // ≤2 retries on transient error (3 attempts total)

/* ── pending-flight KV record (SEPARATE namespace from hotels' pending-booking:) ── */

export interface FlightTrip {
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

export interface PendingFlight {
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

/** Result of a finalise attempt. `status` is an HTTP-style code the API route
 *  echoes; the confirm page reads `ok` / `bookingRef` / `error`. */
export interface FinalizeResult {
  ok: boolean;
  status: number;
  ref: string;
  bookingRef?: string | null;
  error?: string;
  reconcile?: boolean;
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
    id: record.ref,
    type: 'flight',
    supplier: 'liteapi',
    supplierRef: opts.supplierRef,
    status: opts.status,
    customerName,
    customerEmail,
    customerPhone,
    destination: trip.destination || '',
    checkIn: trip.depDate || null,
    checkOut: trip.retDate || null,
    guests,
    title,
    totalPence,
    netPence: totalPence,
    marginPence: 0,
    stripePaymentId: null,
    paymentStatus: opts.status === 'confirmed' ? 'paid' : 'pending',
    createdAt: nowIso,
    updatedAt: nowIso,
    notes: opts.notes,
  };
}

/**
 * Finalise a paid LiteAPI flight booking. Idempotent, retry-bounded, and safe to
 * call repeatedly (confirm-page reloads / API retries).
 *
 * Returns a plain result — the caller decides how to present it. Never throws for
 * the normal outcomes (missing record, stale prebook, book failure); only an
 * unexpected KV/runtime fault would surface as a thrown error the caller catches.
 */
export async function finalizeFlightBooking(
  refIn: string,
  prebookIdIn: string,
  transactionIdIn: string,
): Promise<FinalizeResult> {
  const ref = String(refIn || '').trim();
  const prebookId = String(prebookIdIn || '').trim();
  const transactionId = String(transactionIdIn || '').trim();

  if (!ref || !prebookId || !transactionId) {
    return { ok: false, status: 400, ref, error: 'ref, prebookId and transactionId are required' };
  }

  const record = await kv.get<PendingFlight>(`pending-flight:${ref}`);
  if (!record) return { ok: false, status: 404, ref, error: 'not_found' };

  // Idempotency — already booked. Echo the stored PNR without re-charging.
  if (record.state === 'confirmed') {
    return { ok: true, status: 200, ref, bookingRef: record.bookingRef ?? record.bookingId ?? null };
  }

  // Idempotency — a TERMINAL failure must not re-run bookFlight or re-fire the
  // decline email/SMS. Echo the stored (always-string) error instead.
  if (record.state === 'failed') {
    const storedErr =
      typeof record.error === 'string' && record.error
        ? record.error
        : record.error
          ? JSON.stringify(record.error)
          : 'book_failed';
    return { ok: false, status: 502, ref, error: storedErr };
  }

  // Guard — the prebook the customer paid for must match the one on file.
  if (record.prebookId !== prebookId || record.transactionId !== transactionId) {
    return { ok: false, status: 409, ref, error: 'stale' };
  }

  // ── BOOK with bounded retry on transient errors (bookFlight is idempotent per
  //    prebookId, so a retry can't double-book). ──────────────────────────────
  let result: FlightBookResult | null = null;
  let lastError = '';
  let duplicateExists = false; // 45036 "a booking already exists for this prebookId"
  for (let attempt = 0; attempt <= MAX_BOOK_RETRIES; attempt++) {
    try {
      const r = await bookFlight({ prebookId, transactionId, clientReference: ref });
      if (!r || !r.bookingId) {
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
        `[finalizeFlightBooking] attempt ${attempt + 1}/${MAX_BOOK_RETRIES + 1} failed:`,
        lastError,
      );
      if (/\b45036\b/.test(lastError) || /duplicate booking/i.test(lastError) || /already exists/i.test(lastError)) {
        duplicateExists = true;
        break;
      }
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
      console.error('[finalizeFlightBooking] KV confirm write failed', e);
    }

    const booking = toBooking(record, {
      status: 'confirmed',
      supplierRef: bookingId,
      notes: `LiteAPI flight confirmed. PNR ${bookingRef}${
        record.trip.airlineName ? ` · ${record.trip.airlineName}` : ''
      }`,
    });
    await upsertBooking(booking);

    await notifyBookingConfirmed(booking).catch((e) =>
      console.error('[finalizeFlightBooking] notifyBookingConfirmed failed', e),
    );

    return { ok: true, status: 200, ref, bookingRef };
  }

  /* ─────── ALREADY BOOKED UPSTREAM (45036) — confirm, don't decline ──────── */
  if (duplicateExists) {
    const bookingRef = record.bookingRef || record.bookingId || ref;
    const updated: PendingFlight = {
      ...record,
      state: 'confirmed',
      bookingRef,
      updatedAt: Date.now(),
      error: undefined,
    };
    try {
      await kv.set(`pending-flight:${ref}`, updated, { ex: CONFIRMED_TTL_SECONDS });
    } catch (e) {
      console.error('[finalizeFlightBooking] KV reconcile write failed', e);
    }

    const booking = toBooking(record, {
      status: 'confirmed',
      supplierRef: record.bookingId || null,
      notes:
        `LiteAPI flight already booked upstream (45036 duplicate). Customer paid + ` +
        `reserved; PNR needs reconcile from the Nuitée dashboard for prebook ${prebookId}.`,
    });
    await upsertBooking(booking);

    await notifyOwnerOpsAlert({
      subject: `Flight booking needs PNR reconcile — ${ref}`,
      body:
        `LiteAPI returned 45036 (booking already exists) for prebook ${prebookId}. ` +
        `The reservation + payment succeeded but the book call couldn't read the PNR back. ` +
        `Pull the airline confirmation from the Nuitée dashboard and update booking ${ref}.`,
      tags: { area: 'flights', kind: 'reconcile' },
      extra: { ref, prebookId },
    }).catch((e) => console.error('[finalizeFlightBooking] ops alert failed', e));

    await notifyBookingConfirmed(booking).catch((e) =>
      console.error('[finalizeFlightBooking] notifyBookingConfirmed (reconcile) failed', e),
    );

    return { ok: true, status: 200, ref, bookingRef, reconcile: true };
  }

  /* ─────────────────────────── FAILURE ─────────────────────────── */
  console.error(`[finalizeFlightBooking] terminal failure for ${ref}: ${lastError}`);
  const failed: PendingFlight = {
    ...record,
    state: 'failed',
    updatedAt: Date.now(),
    error: lastError,
  };
  try {
    await kv.set(`pending-flight:${ref}`, failed, { ex: FAILED_TTL_SECONDS });
  } catch (e) {
    console.error('[finalizeFlightBooking] KV failure write failed', e);
  }

  const declined = toBooking(record, {
    status: 'failed',
    supplierRef: null,
    notes: `LiteAPI flight book failed: ${lastError}`,
  });
  await notifyBookingDeclined(declined, lastError).catch((e) =>
    console.error('[finalizeFlightBooking] notifyBookingDeclined failed', e),
  );

  return { ok: false, status: 502, ref, error: 'book_failed' };
}
