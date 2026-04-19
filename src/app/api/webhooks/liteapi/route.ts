/**
 * POST /api/webhooks/liteapi — LiteAPI async status-change receiver.
 *
 * Why this exists:
 *   Our LiteAPI "Golden Path" (prebook → Payment SDK → book → /success) confirms
 *   most bookings synchronously. But the supplier can still modify, cancel, or
 *   fail the booking *after* we've told the customer they're confirmed — a hotel
 *   oversells, a room type gets withdrawn, the rate is rejected on reconciliation,
 *   etc. Without this endpoint we'd only ever find out at check-in. With it, we
 *   know the moment LiteAPI knows, and can proactively re-home the guest.
 *
 * What LiteAPI sends (as observed in their dashboard + code samples, Apr 2026):
 *   POST /webhook  Content-Type: application/json
 *   Auth: the dashboard exposes a single "Authentication Token" field which
 *         LiteAPI forwards verbatim in the `Authorization` header (no HMAC,
 *         no body signing — the official Node.js/Go examples don't verify
 *         anything, they just trust the body). We treat it as a shared bearer
 *         secret: compare the incoming header to LITEAPI_WEBHOOK_SECRET in
 *         constant time.
 *   Body (LiteAPI's own sample code):
 *     { event_name: "booking.book" | "booking.cancel" | "booking.prebook" |
 *                   "booking.book_error" | "booking.prebook_error" |
 *                   "booking.cancel_error" | "booking.rebook.rfn" |
 *                   "booking.rebook.nrfn" | "booking.amendment" |
 *                   "booking.amendment.relocation" |
 *                   "booking.book.hotelConfirmationNumber",
 *       request: { ... original call body, carries clientReference ... },
 *       response: { ... LiteAPI's response with bookingId/status/... } }
 *   We also keep support for older/alternative shapes (event+data, type+booking,
 *   flat) in case LiteAPI changes the payload again — they've done it before.
 *
 * What we do:
 *   1. verify the Authorization header matches LITEAPI_WEBHOOK_SECRET
 *      (with an HMAC-SHA256 body check as a harmless fallback — if LiteAPI ever
 *      switches on signing, we'll start accepting that form too)
 *   2. extract { clientReference (our ref), bookingId, status } from whichever
 *      shape arrived
 *   3. update the pending-booking KV record (the source of truth for /success
 *      and /hotels/checkout) so the user's dashboard reflects reality
 *   4. mirror the status into the unified bookings store (src/lib/bookings.ts)
 *      so the admin portal shows it too
 *   5. ALWAYS return 200 OK fast — otherwise LiteAPI will retry indefinitely
 *      and back up its queue. Errors are logged, not surfaced.
 *
 * Configuration:
 *   - Env: LITEAPI_WEBHOOK_SECRET (or LITE_API_WEBHOOK_SECRET) — the shared
 *     token you paste into the LiteAPI dashboard's "Authentication Token" field
 *   - Dashboard: point LiteAPI webhook URL to
 *     https://jetmeaway.co.uk/api/webhooks/liteapi
 */

import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import {
  listBookings,
  upsertBooking,
  type BookingStatus,
} from '@/lib/bookings';
import type { PendingBooking } from '../../hotels/start-booking/route';

// Edge runtime: we only need fetch + Web Crypto (subtle.crypto) for HMAC.
export const runtime = 'edge';

const WEBHOOK_SECRET =
  process.env.LITEAPI_WEBHOOK_SECRET ||
  process.env.LITE_API_WEBHOOK_SECRET ||
  '';

/* --------------------------- signature verification --------------------- */

/**
 * HMAC-SHA256 of `body` keyed by `secret`, hex-encoded.
 * Uses Web Crypto so it runs on Vercel Edge.
 */
async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body));
  const bytes = new Uint8Array(sig);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Pull the shared secret out of the Authorization header. LiteAPI's UI labels
 * it "Authentication Token" and forwards it verbatim — in practice that ends
 * up as either `Authorization: Bearer <token>` or `Authorization: <token>`
 * depending on whether the customer included the Bearer prefix themselves.
 * A couple of custom header names are also accepted in case the dashboard
 * behaviour changes.
 */
function extractBearer(req: NextRequest): string | null {
  const auth = req.headers.get('authorization') || '';
  if (auth) {
    const trimmed = auth.trim();
    if (/^bearer\s+/i.test(trimmed)) {
      return trimmed.replace(/^bearer\s+/i, '').trim() || null;
    }
    return trimmed || null;
  }
  const alt =
    req.headers.get('x-auth-token') ||
    req.headers.get('x-api-key') ||
    req.headers.get('x-liteapi-token') ||
    '';
  const trimmed = alt.trim();
  return trimmed || null;
}

/**
 * Constant-time string compare (prevents timing attacks on signature check).
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/* ---------------------------- payload parsing --------------------------- */

/**
 * LiteAPI booking status strings → our unified BookingStatus.
 * Anything unrecognised falls through to the caller's default.
 */
function mapLiteApiStatus(raw: string | undefined | null): BookingStatus | null {
  if (!raw) return null;
  const s = String(raw).toUpperCase().trim();
  switch (s) {
    case 'CONFIRMED':
    case 'OK':
    case 'BOOKED':
      return 'confirmed';
    case 'COMPLETED':
    case 'CHECKED_OUT':
      return 'completed';
    case 'CANCELLED':
    case 'CANCELED':
    case 'VOIDED':
      return 'cancelled';
    case 'REFUNDED':
      return 'refunded';
    case 'FAILED':
    case 'REJECTED':
    case 'NO_SHOW':
    case 'ERROR':
      return 'failed';
    case 'PENDING':
    case 'PROCESSING':
      return 'pending';
    default:
      return null;
  }
}

/** Pending-booking state the webhook can transition to. Narrower than BookingStatus. */
type PendingState = PendingBooking['state'];

function bookingStatusToPendingState(s: BookingStatus): PendingState {
  switch (s) {
    case 'confirmed':
    case 'completed':
      return 'confirmed';
    case 'failed':
      return 'failed';
    case 'cancelled':
    case 'refunded':
      // These all mean "the booking isn't live any more" — we surface them
      // on the checkout page as 'failed' so the UI shows the refund/cancel
      // path rather than a misleading "confirmed".
      return 'failed';
    case 'pending':
      return 'pending';
  }
}

type NormalisedEvent = {
  eventType: string;
  clientReference: string | null; // our JMA-H-XXXXXXXX ref
  bookingId: string | null;       // LiteAPI's bookingId
  status: BookingStatus | null;
  hotelConfirmationCode: string | null;
  rawStatus: string | null;
};

/**
 * Map LiteAPI's event_name (e.g. `booking.book`, `booking.cancel_error`) to
 * our unified BookingStatus. Only used when the payload omits an explicit
 * status field — which is the case for LiteAPI's current {event_name, request,
 * response} shape.
 */
function mapLiteApiEventName(name: string | undefined | null): BookingStatus | null {
  if (!name) return null;
  const n = String(name).toLowerCase().trim();
  if (n === 'booking.book' || n === 'booking.book.hotelconfirmationnumber') {
    return 'confirmed';
  }
  if (n === 'booking.rebook.rfn' || n === 'booking.rebook.nrfn') {
    return 'confirmed';
  }
  if (n === 'booking.amendment' || n === 'booking.amendment.relocation') {
    // Amendment means the booking still exists but changed; keep it confirmed
    // but we'll log details via the note.
    return 'confirmed';
  }
  if (n === 'booking.cancel') return 'cancelled';
  if (n === 'booking.prebook') return 'pending';
  if (
    n === 'booking.book_error' ||
    n === 'booking.prebook_error' ||
    n === 'booking.cancel_error'
  ) {
    return 'failed';
  }
  return null;
}

/**
 * LiteAPI has historically changed its webhook payload shape more than once;
 * we accept the union and extract what we need with defensive field lookups.
 *
 * Today's shape (Apr 2026): `{ event_name, request, response }` — `request`
 * is the body we originally sent (carries clientReference) and `response` is
 * LiteAPI's outbound response (carries bookingId + status + confirmation).
 * Older/alternate shapes (`event`+`data`, `type`+`booking`, flat) also work.
 */
function normaliseEvent(payload: unknown): NormalisedEvent {
  const p = (payload ?? {}) as Record<string, unknown>;

  // Treat `response` as the primary data bag for the current shape; fall back
  // to the older containers. We also merge the inner `data.booking` pocket if
  // LiteAPI nests it one level deeper (seen on some event types).
  const response = (p.response ?? {}) as Record<string, unknown>;
  const request = (p.request ?? {}) as Record<string, unknown>;
  const legacy = (p.data ?? p.booking ?? p.payload ?? {}) as Record<string, unknown>;
  const responseData =
    ((response as { data?: unknown }).data as Record<string, unknown> | undefined) ??
    ((response as { booking?: unknown }).booking as Record<string, unknown> | undefined) ??
    {};

  const data: Record<string, unknown> = {
    ...legacy,
    ...responseData,
    ...response,
  };

  const eventType = String(
    p.event_name ?? p.event ?? p.type ?? p.eventType ?? 'unknown',
  );

  const clientReference =
    firstString(
      data.clientReference,
      data.client_reference,
      (data as { metadata?: Record<string, unknown> }).metadata?.clientReference,
      request.clientReference,
      (request as { client_reference?: unknown }).client_reference,
      p.clientReference,
    ) ?? null;

  const bookingId =
    firstString(
      data.bookingId,
      data.booking_id,
      data.id,
      p.bookingId,
    ) ?? null;

  const rawStatus =
    firstString(
      data.status,
      data.bookingStatus,
      data.booking_status,
      p.status,
    ) ?? null;

  const hotelConfirmationCode =
    firstString(
      data.hotelConfirmationCode,
      data.hotel_confirmation_code,
      data.supplierConfirmationNumber,
    ) ?? null;

  // Prefer an explicit status field; otherwise derive from event_name.
  const status = mapLiteApiStatus(rawStatus) ?? mapLiteApiEventName(eventType);

  return {
    eventType,
    clientReference,
    bookingId,
    status,
    hotelConfirmationCode,
    rawStatus,
  };
}

function firstString(...vals: unknown[]): string | null {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

/* ------------------------------ KV updates ------------------------------ */

/**
 * Update the pending-booking record keyed by our client reference. This is
 * what the customer's /hotels/checkout/[ref] page and /success read from, so
 * it has to be the first thing we touch — failure here means the customer
 * keeps seeing "confirmed" when the supplier has already cancelled.
 */
async function updatePendingByRef(
  ref: string,
  event: NormalisedEvent,
): Promise<boolean> {
  try {
    const current = await kv.get<PendingBooking>(`pending-booking:${ref}`);
    if (!current) {
      console.warn('[liteapi-webhook] no pending-booking for ref', ref);
      return false;
    }
    if (!event.status) return false;

    const nextState = bookingStatusToPendingState(event.status);
    const note = buildNote(event);
    const updated: PendingBooking = {
      ...current,
      state: nextState,
      ...(event.bookingId ? { liteapiBookingId: event.bookingId } : {}),
      ...(event.rawStatus ? { liteapiStatus: event.rawStatus } : {}),
      ...(event.hotelConfirmationCode
        ? { liteapiConfirmationCode: event.hotelConfirmationCode }
        : {}),
      ...(nextState === 'failed' && note ? { error: note } : {}),
    };

    // Confirmed records live 30 days; everything else keeps the 24h tail
    // so admin still has a window to investigate.
    const ttl = nextState === 'confirmed' ? 30 * 24 * 60 * 60 : 24 * 60 * 60;
    await kv.set(`pending-booking:${ref}`, updated, { ex: ttl });
    return true;
  } catch (err) {
    console.error('[liteapi-webhook] pending update failed', err);
    return false;
  }
}

/**
 * Mirror the new status into the unified bookings store so the admin portal
 * (/admin/bookings etc.) reflects reality without a separate sync job.
 */
async function updateUnifiedBooking(event: NormalisedEvent): Promise<boolean> {
  if (!event.status) return false;
  try {
    const all = await listBookings();
    const found = all.find(
      (b) =>
        b.supplier === 'liteapi' &&
        ((event.bookingId && b.supplierRef === event.bookingId) ||
          (event.clientReference && b.id === event.clientReference) ||
          (event.clientReference && b.supplierRef === event.clientReference)),
    );
    if (!found) return false;

    const note = buildNote(event);
    const paymentStatus =
      event.status === 'refunded'
        ? 'refunded'
        : event.status === 'cancelled'
          ? found.paymentStatus // keep as-is; refund usually comes as its own event
          : found.paymentStatus;

    await upsertBooking({
      ...found,
      status: event.status,
      paymentStatus,
      notes: [found.notes, note].filter(Boolean).join('\n'),
      updatedAt: new Date().toISOString(),
      ...(event.bookingId && !found.supplierRef
        ? { supplierRef: event.bookingId }
        : {}),
    });
    return true;
  } catch (err) {
    console.error('[liteapi-webhook] unified update failed', err);
    return false;
  }
}

function buildNote(event: NormalisedEvent): string {
  const parts = [
    `LiteAPI webhook: ${event.eventType}`,
    event.rawStatus ? `status=${event.rawStatus}` : null,
    event.bookingId ? `bookingId=${event.bookingId}` : null,
  ].filter(Boolean);
  return parts.join(' — ');
}

/* ------------------------------- handler -------------------------------- */

export async function POST(req: NextRequest) {
  // IMPORTANT: read the raw body BEFORE parsing so the signature check
  // compares against the exact bytes LiteAPI signed. Calling req.json() first
  // would force us to re-serialise and subtly break the HMAC.
  const rawBody = await req.text();

  // Auth check. LiteAPI today sends the dashboard's "Authentication Token"
  // as a plain shared secret in the `Authorization` header (no HMAC — their
  // own Node.js/Go samples don't verify anything). So our primary check is a
  // constant-time compare of that header against WEBHOOK_SECRET. We ALSO
  // accept an HMAC-SHA256 signature header as a fallback, so if LiteAPI flips
  // on signing later (or if we put the webhook behind a gateway that signs),
  // it'll just start working.
  if (WEBHOOK_SECRET) {
    const bearer = extractBearer(req);
    const sigHeader =
      req.headers.get('x-liteapi-signature') ||
      req.headers.get('x-signature') ||
      req.headers.get('liteapi-signature') ||
      '';

    let authorised = false;

    // Path A: shared bearer token (what LiteAPI actually sends today)
    if (bearer && timingSafeEqual(bearer, WEBHOOK_SECRET)) {
      authorised = true;
    }

    // Path B: HMAC-SHA256 of the raw body (future-proofing)
    if (!authorised && sigHeader) {
      const expected = await hmacSha256Hex(WEBHOOK_SECRET, rawBody);
      const providedHex = sigHeader.startsWith('sha256=')
        ? sigHeader.slice(7).trim()
        : sigHeader.trim();
      if (
        providedHex &&
        timingSafeEqual(providedHex.toLowerCase(), expected)
      ) {
        authorised = true;
      }
    }

    if (!authorised) {
      console.warn('[liteapi-webhook] auth failed — rejecting');
      return NextResponse.json(
        { received: false, error: 'Invalid signature' },
        { status: 401 },
      );
    }
  } else {
    // Not fatal in dev, but very noisy so it can't be missed in prod logs.
    console.warn(
      '[liteapi-webhook] LITEAPI_WEBHOOK_SECRET unset — accepting unsigned payload',
    );
  }

  let payload: unknown;
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    console.error('[liteapi-webhook] invalid JSON body');
    // Still 200 — we don't want LiteAPI's retry queue to back up on bad data.
    return NextResponse.json({ received: true, parsed: false });
  }

  const event = normaliseEvent(payload);
  console.log(
    '[liteapi-webhook] event=%s status=%s ref=%s bookingId=%s',
    event.eventType,
    event.rawStatus,
    event.clientReference,
    event.bookingId,
  );

  if (!event.status) {
    // Unknown status — log and 200 so LiteAPI stops retrying. Anything
    // actionable (like a new status code) will surface in logs for triage.
    console.warn('[liteapi-webhook] unmapped status', event.rawStatus);
    return NextResponse.json({ received: true, acted: false });
  }

  let actedOnPending = false;
  let actedOnUnified = false;

  // Path 1: we have the clientReference — update the pending record directly.
  if (event.clientReference) {
    actedOnPending = await updatePendingByRef(event.clientReference, event);
  }

  // Path 2: always try the unified store. Even bookings without a
  // clientReference (older Stripe/ACC flow) are keyed there by supplierRef.
  actedOnUnified = await updateUnifiedBooking(event);

  return NextResponse.json({
    received: true,
    event: event.eventType,
    status: event.status,
    pendingUpdated: actedOnPending,
    unifiedUpdated: actedOnUnified,
  });
}

// GET: health check so the LiteAPI dashboard's "Test webhook" button gets a
// friendly 200 instead of a 405.
export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: 'liteapi-webhook',
    signed: Boolean(WEBHOOK_SECRET),
  });
}
