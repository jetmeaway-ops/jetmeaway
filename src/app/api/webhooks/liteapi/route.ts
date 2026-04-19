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
 * What LiteAPI sends (as observed in their dashboard + docs):
 *   POST /webhook  Content-Type: application/json
 *   Headers (when a signing secret is configured in the dashboard):
 *     X-LiteAPI-Signature: hex-encoded HMAC-SHA256 of the raw body
 *   Body shapes vary across events — we accept several and normalise.
 *     { event: "BOOKING_STATUS_CHANGE",
 *       data: { bookingId, clientReference?, status, hotelConfirmationCode? } }
 *     { type: "booking.status_change", booking: { id, ... } }
 *     { bookingId, status, clientReference }  ← legacy flat shape
 *
 * What we do:
 *   1. (optional) verify HMAC signature against LITEAPI_WEBHOOK_SECRET
 *   2. extract { clientReference (our ref), bookingId, status }
 *   3. update the pending-booking KV record (the source of truth for /success
 *      and /hotels/checkout) so the user's dashboard reflects reality
 *   4. mirror the status into the unified bookings store (src/lib/bookings.ts)
 *      so the admin portal shows it too
 *   5. ALWAYS return 200 OK fast — otherwise LiteAPI will retry indefinitely
 *      and back up its queue. Errors are logged, not surfaced.
 *
 * Configuration:
 *   - Env: LITEAPI_WEBHOOK_SECRET (HMAC key — if unset, signature check is
 *     skipped in dev; in production the endpoint logs a warning)
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
 * LiteAPI has historically changed its webhook payload shape more than once;
 * we accept the union and extract what we need with defensive field lookups.
 */
function normaliseEvent(payload: unknown): NormalisedEvent {
  const p = (payload ?? {}) as Record<string, unknown>;
  const data = (p.data ?? p.booking ?? p.payload ?? p) as Record<string, unknown>;

  const eventType = String(p.event ?? p.type ?? p.eventType ?? 'unknown');

  const clientReference =
    firstString(
      data.clientReference,
      data.client_reference,
      (data as { metadata?: Record<string, unknown> }).metadata?.clientReference,
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

  return {
    eventType,
    clientReference,
    bookingId,
    status: mapLiteApiStatus(rawStatus),
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

  // Signature check. LiteAPI has used a few header names historically; accept
  // any of them to stay resilient.
  if (WEBHOOK_SECRET) {
    const provided =
      req.headers.get('x-liteapi-signature') ||
      req.headers.get('x-signature') ||
      req.headers.get('liteapi-signature') ||
      '';
    const expected = await hmacSha256Hex(WEBHOOK_SECRET, rawBody);
    // Accept both raw hex and `sha256=<hex>` forms.
    const providedHex = provided.startsWith('sha256=')
      ? provided.slice(7).trim()
      : provided.trim();
    if (!providedHex || !timingSafeEqual(providedHex.toLowerCase(), expected)) {
      console.warn('[liteapi-webhook] signature mismatch — rejecting');
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
