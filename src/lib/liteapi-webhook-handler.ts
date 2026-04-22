/**
 * Shared LiteAPI webhook event-processing logic.
 *
 * Extracted so both the legacy `/api/webhooks/liteapi` route (header/HMAC auth)
 * and the newer `/api/webhooks/liteapi/[token]` route (path-segment auth) can
 * feed LiteAPI events through the same normalisation + KV update pipeline.
 *
 * Why the split: LiteAPI's dashboard silently drops the Authentication Token
 * value (Authorization header arrives empty) AND strips ?query params from
 * saved webhook URLs. The only reliable place to carry a shared secret is in
 * the URL path — hence the dynamic `[token]` segment.
 *
 * Edge-safe: no node:* imports, uses Web Crypto (for the legacy HMAC path,
 * which lives in the route file) and the Vercel KV client.
 */

import { kv } from '@vercel/kv';
import {
  listBookings,
  upsertBooking,
  type BookingStatus,
} from './bookings';
import type { PendingBooking } from '@/app/api/hotels/start-booking/route';

/* ---------------------------- payload parsing --------------------------- */

export function mapLiteApiStatus(raw: string | undefined | null): BookingStatus | null {
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
      return 'failed';
    case 'pending':
      return 'pending';
  }
}

export type NormalisedEvent = {
  eventType: string;
  clientReference: string | null;
  bookingId: string | null;
  status: BookingStatus | null;
  hotelConfirmationCode: string | null;
  rawStatus: string | null;
};

export function mapLiteApiEventName(name: string | undefined | null): BookingStatus | null {
  if (!name) return null;
  const n = String(name).toLowerCase().trim();
  if (n === 'booking.book' || n === 'booking.book.hotelconfirmationnumber') {
    return 'confirmed';
  }
  if (n === 'booking.rebook.rfn' || n === 'booking.rebook.nrfn') {
    return 'confirmed';
  }
  if (n === 'booking.amendment' || n === 'booking.amendment.relocation') {
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

function firstString(...vals: unknown[]): string | null {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

export function normaliseEvent(payload: unknown): NormalisedEvent {
  const p = (payload ?? {}) as Record<string, unknown>;

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

/* ------------------------------ KV updates ------------------------------ */

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

    const ttl = nextState === 'confirmed' ? 30 * 24 * 60 * 60 : 24 * 60 * 60;
    await kv.set(`pending-booking:${ref}`, updated, { ex: ttl });
    return true;
  } catch (err) {
    console.error('[liteapi-webhook] pending update failed', err);
    return false;
  }
}

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

/* ------------------------------ main entry ------------------------------ */

export type ProcessResult = {
  received: true;
  parsed: boolean;
  event?: string;
  status?: BookingStatus | null;
  pendingUpdated?: boolean;
  unifiedUpdated?: boolean;
  acted?: boolean;
};

/**
 * Given an already-authenticated raw request body, normalise and persist the
 * LiteAPI event. Never throws. Returns a result object suitable for the HTTP
 * response — callers should always return 200 OK so LiteAPI doesn't retry.
 */
export async function processLiteApiWebhook(rawBody: string): Promise<ProcessResult> {
  let payload: unknown;
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    console.error('[liteapi-webhook] invalid JSON body');
    return { received: true, parsed: false };
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
    console.warn('[liteapi-webhook] unmapped status', event.rawStatus);
    return { received: true, parsed: true, acted: false };
  }

  let actedOnPending = false;
  let actedOnUnified = false;

  if (event.clientReference) {
    actedOnPending = await updatePendingByRef(event.clientReference, event);
  }
  actedOnUnified = await updateUnifiedBooking(event);

  return {
    received: true,
    parsed: true,
    event: event.eventType,
    status: event.status,
    pendingUpdated: actedOnPending,
    unifiedUpdated: actedOnUnified,
  };
}

/**
 * Constant-time string compare — suitable for secret comparison.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
