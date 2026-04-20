import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { kv } from '@vercel/kv';
import { sendSms, hotelBookingMessage } from '@/lib/twilio';
import type { PendingBooking } from '@/app/api/hotels/start-booking/route';
import type { PendingGuest } from '@/app/api/hotels/pending/[ref]/guest/route';

export const runtime = 'nodejs';

type StoredPending = PendingBooking & { guest?: PendingGuest; state?: string };

/**
 * POST /api/admin/send-booking-sms
 * Body: { ref: string }
 *
 * Admin-only. Re-sends the customer-facing hotel confirmation SMS for a
 * booking that's already in KV. Exists because the Twilio normaliser
 * previously rejected UK-local phone numbers, so customers who booked
 * before that fix never got their confirmation text.
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

  const record = await kv.get<StoredPending>(`pending-booking:${ref}`);
  if (!record) return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
  if (!record.guest?.phone) {
    return NextResponse.json({ success: false, error: 'No phone on record' }, { status: 400 });
  }

  const fmtDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); }
    catch { return d; }
  };

  const result = await sendSms(record.guest.phone, hotelBookingMessage({
    bookingRef: record.ref || '',
    hotelName: record.hotelName || '',
    checkIn: fmtDate(record.checkIn),
    checkOut: fmtDate(record.checkOut),
    city: record.city || '',
  }));

  return NextResponse.json({ success: result.ok, error: result.error });
}
