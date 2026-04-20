import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { kv } from '@vercel/kv';
import { upsertBooking, type Booking, type Supplier } from '@/lib/bookings';
import type { PendingBooking } from '@/app/api/hotels/start-booking/route';
import type { PendingGuest } from '@/app/api/hotels/pending/[ref]/guest/route';

export const runtime = 'nodejs';
export const maxDuration = 60;

type StoredPending = PendingBooking & {
  guest?: PendingGuest;
  state?: string;
  liteapiBookingId?: string;
  liteapiConfirmationCode?: string | null;
  dotwBookingRef?: string;
  dotwStatus?: string;
  stripePaymentIntentId?: string;
  error?: string;
};

/**
 * POST /api/admin/backfill-bookings
 *
 * One-shot recovery endpoint. Scans `pending-booking:*` KV keys and mirrors
 * any confirmed (or failed) records into the unified admin bookings store.
 *
 * Exists because LiteAPI bookings finalised on /success were not mirrored
 * to the admin store until the fix landed. Running this once brings the
 * admin dashboard up to date with all historic completed bookings.
 * Idempotent — re-running is safe.
 */
export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get('jma_admin')?.value || '';
  const secret = process.env.ADMIN_SECRET || '';
  if (!secret || token !== secret) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const scanned: string[] = [];
  const mirrored: string[] = [];
  const skipped: { ref: string; reason: string }[] = [];

  // Scan KV for all pending-booking:* keys. Upstash SCAN returns a cursor
  // as [cursor, keys]; we loop until cursor is 0.
  let cursor: string | number = 0;
  const MAX_ITERATIONS = 50;
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const [next, keys] = (await kv.scan(cursor, {
      match: 'pending-booking:*',
      count: 100,
    })) as [string | number, string[]];

    for (const key of keys) {
      scanned.push(key);
      const record = await kv.get<StoredPending>(key);
      if (!record || !record.ref) {
        skipped.push({ ref: key, reason: 'empty/missing' });
        continue;
      }

      const supplier: Supplier = record.supplier === 'dotw' ? 'dotw' : 'liteapi';
      let status: Booking['status'];
      let supplierRef: string | null = null;
      let notes = '';
      let paymentStatus: Booking['paymentStatus'] = 'paid';

      if (record.state === 'confirmed') {
        status = 'confirmed';
        supplierRef = record.liteapiBookingId || record.dotwBookingRef || null;
        notes = supplier === 'dotw'
          ? `DOTW confirmed (${record.dotwStatus ?? 'ok'})`
          : `LiteAPI confirmed. Hotel confirmation: ${record.liteapiConfirmationCode ?? 'pending'}`;
      } else if (record.state === 'failed') {
        status = 'failed';
        notes = `Backfilled failure: ${record.error ?? 'unknown'}`;
      } else {
        skipped.push({ ref: record.ref, reason: `state=${record.state ?? 'none'}` });
        continue;
      }

      const guestName =
        `${record.guest?.firstName || ''} ${record.guest?.lastName || ''}`.trim() || 'Guest';
      const nowIso = new Date().toISOString();

      const booking: Booking = {
        id: record.ref,
        type: 'hotel',
        supplier,
        supplierRef,
        status,
        customerName: guestName,
        customerEmail: record.guest?.email || '',
        customerPhone: record.guest?.phone || null,
        destination: record.city || '',
        checkIn: record.checkIn || null,
        checkOut: record.checkOut || null,
        guests: (record.adults || 0) + (record.children || 0),
        title: record.hotelName || 'Hotel booking',
        totalPence: Math.round((record.totalPrice || 0) * 100),
        netPence: 0,
        marginPence: 0,
        stripePaymentId: record.stripePaymentIntentId || null,
        paymentStatus,
        createdAt: nowIso,
        updatedAt: nowIso,
        notes,
      };

      await upsertBooking(booking);
      mirrored.push(record.ref);
    }

    cursor = next;
    if (cursor === 0 || cursor === '0') break;
  }

  return NextResponse.json({
    success: true,
    scanned: scanned.length,
    mirrored: mirrored.length,
    skipped: skipped.length,
    mirroredRefs: mirrored,
    skippedDetails: skipped,
  });
}
