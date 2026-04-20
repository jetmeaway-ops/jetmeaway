import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { kv } from '@vercel/kv';
import { cancelBooking } from '@/lib/liteapi';
import { upsertBooking, getBooking, type Booking } from '@/lib/bookings';
import type { PendingBooking } from '@/app/api/hotels/start-booking/route';
import type { PendingGuest } from '@/app/api/hotels/pending/[ref]/guest/route';

export const runtime = 'nodejs';
export const maxDuration = 30;

type StoredPending = PendingBooking & {
  guest?: PendingGuest;
  state?: string;
  liteapiBookingId?: string;
  liteapiConfirmationCode?: string | null;
  stripePaymentIntentId?: string;
};

/**
 * POST /api/admin/cancel-booking
 * Body: { ref: string }
 *
 * Admin-only. Cancels the underlying LiteAPI booking (if any) and updates
 * both the KV pending record and the unified admin booking store.
 *
 * Returns the LiteAPI response so the admin UI can show what happened —
 * including refund amount when the API provides it. Even when LiteAPI
 * refuses (past deadline, already cancelled), we mark the admin record
 * as 'cancelled' with the supplier error in the notes, because for
 * admin-triage purposes it's still useful to record the intent.
 */
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('jma_admin')?.value || '';
  const secret = process.env.ADMIN_SECRET || '';
  if (!secret || token !== secret) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: { ref?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }
  const { ref } = body;
  if (!ref) return NextResponse.json({ success: false, error: 'ref required' }, { status: 400 });

  const pending = await kv.get<StoredPending>(`pending-booking:${ref}`);
  const existing = await getBooking(ref);

  const liteapiBookingId = pending?.liteapiBookingId || existing?.supplierRef || '';
  if (!liteapiBookingId) {
    return NextResponse.json(
      { success: false, error: 'No LiteAPI booking id on record — cannot cancel via supplier' },
      { status: 400 },
    );
  }

  const cancel = await cancelBooking(liteapiBookingId);

  // Mark pending record as cancelled regardless — admin intent is recorded.
  if (pending) {
    await kv.set(
      `pending-booking:${ref}`,
      { ...pending, state: 'cancelled' as const },
      { ex: 30 * 24 * 60 * 60 },
    );
  }

  // Upsert the admin store with new status.
  const nowIso = new Date().toISOString();
  const base: Booking = existing ?? {
    id: ref,
    type: 'hotel',
    supplier: 'liteapi',
    supplierRef: liteapiBookingId,
    status: 'cancelled',
    customerName:
      `${pending?.guest?.firstName || ''} ${pending?.guest?.lastName || ''}`.trim() || 'Guest',
    customerEmail: pending?.guest?.email || '',
    customerPhone: pending?.guest?.phone || null,
    destination: pending?.city || '',
    checkIn: pending?.checkIn || null,
    checkOut: pending?.checkOut || null,
    guests: (pending?.adults || 0) + (pending?.children || 0),
    title: pending?.hotelName || 'Hotel booking',
    totalPence: Math.round((pending?.totalPrice || 0) * 100),
    netPence: 0,
    marginPence: 0,
    stripePaymentId: pending?.stripePaymentIntentId || null,
    paymentStatus: 'paid',
    createdAt: nowIso,
    updatedAt: nowIso,
    notes: null,
  };

  const cancelNote = cancel.ok
    ? `Cancelled via admin. LiteAPI status: ${cancel.status}${cancel.refundAmount != null ? ` — refund ${cancel.refundAmount}` : ''}`
    : `Admin marked cancelled. LiteAPI error: ${cancel.error ?? 'unknown'}`;

  const updated: Booking = {
    ...base,
    status: 'cancelled',
    paymentStatus: cancel.refundAmount && cancel.refundAmount > 0 ? 'refunded' : base.paymentStatus,
    updatedAt: nowIso,
    notes: base.notes ? `${base.notes}\n\n${cancelNote}` : cancelNote,
  };
  await upsertBooking(updated);

  return NextResponse.json({
    success: cancel.ok,
    liteapi: {
      ok: cancel.ok,
      status: cancel.status,
      refundAmount: cancel.refundAmount,
      error: cancel.error ?? null,
    },
    booking: updated,
  });
}
