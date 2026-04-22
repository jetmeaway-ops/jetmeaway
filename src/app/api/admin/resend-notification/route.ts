import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getBooking } from '@/lib/bookings';
import {
  notifyBookingConfirmed,
  notifyBookingDeclined,
} from '@/lib/notifications';

export const runtime = 'nodejs';

/**
 * POST /api/admin/resend-notification
 * Body: { ref: string, channel: 'email' | 'sms' | 'both', kind?: 'auto' | 'confirmed' | 'declined', reason?: string }
 *
 * Admin-only. Re-sends the confirmation (or decline) email and/or SMS to the
 * customer for an existing booking. `kind=auto` (default) picks confirmed/
 * declined based on the booking's current status.
 *
 * Unlike the auto-send paths in /api/flights/book and /api/hotels/book, this
 * route AWAITS delivery and reports the per-channel outcome back to the admin
 * UI so we can show a proper success/failure result.
 */
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('jma_admin')?.value || '';
  const secret = process.env.ADMIN_SECRET || '';
  if (!secret || token !== secret) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    ref?: string;
    channel?: 'email' | 'sms' | 'both';
    kind?: 'auto' | 'confirmed' | 'declined';
    reason?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const ref = body.ref;
  const channel = body.channel || 'both';
  const kind = body.kind || 'auto';
  if (!ref) {
    return NextResponse.json({ success: false, error: 'ref required' }, { status: 400 });
  }

  const booking = await getBooking(ref);
  if (!booking) {
    return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
  }

  // Clone so we can mask the channels we don't want the helper to send on.
  const target = { ...booking };
  if (channel === 'email') target.customerPhone = null;
  if (channel === 'sms') target.customerEmail = '';

  if (channel === 'email' && !booking.customerEmail) {
    return NextResponse.json(
      { success: false, error: 'No customer email on record' },
      { status: 400 },
    );
  }
  if (channel === 'sms' && !booking.customerPhone) {
    return NextResponse.json(
      { success: false, error: 'No customer phone on record' },
      { status: 400 },
    );
  }

  const resolvedKind: 'confirmed' | 'declined' =
    kind === 'auto'
      ? booking.status === 'confirmed' || booking.status === 'completed'
        ? 'confirmed'
        : 'declined'
      : kind;

  try {
    if (resolvedKind === 'confirmed') {
      await notifyBookingConfirmed(target);
    } else {
      const reason =
        body.reason?.trim() ||
        booking.notes?.split('\n')[0]?.trim() ||
        'Booking could not be completed';
      await notifyBookingDeclined(target, reason);
    }
    return NextResponse.json({
      success: true,
      kind: resolvedKind,
      channel,
      sentTo: {
        email: channel !== 'sms' ? booking.customerEmail || null : null,
        phone: channel !== 'email' ? booking.customerPhone || null : null,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to send';
    console.error('[admin/resend-notification]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
