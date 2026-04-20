import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { upsertBooking, getBooking } from '@/lib/bookings';

export const runtime = 'nodejs';

/**
 * POST /api/admin/mark-cancelled
 * Body: { ref: string, reason?: string }
 *
 * Admin-only. Marks the booking as cancelled in the admin store ONLY —
 * does NOT call the supplier. Use this when the supplier has already
 * cancelled/refunded outside our system (e.g. pre-wiring cleanup, or
 * manual phone cancellation with LiteAPI) and we just need the admin
 * record to reflect reality.
 */
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('jma_admin')?.value || '';
  const secret = process.env.ADMIN_SECRET || '';
  if (!secret || token !== secret) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: { ref?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }
  const { ref, reason } = body;
  if (!ref) return NextResponse.json({ success: false, error: 'ref required' }, { status: 400 });

  const existing = await getBooking(ref);
  if (!existing) {
    return NextResponse.json({ success: false, error: 'Booking not found in admin store' }, { status: 404 });
  }

  const note = `Marked cancelled by admin (no supplier call). Reason: ${reason || 'not provided'}`;
  await upsertBooking({
    ...existing,
    status: 'cancelled',
    paymentStatus: 'refunded',
    updatedAt: new Date().toISOString(),
    notes: existing.notes ? `${existing.notes}\n\n${note}` : note,
  });

  return NextResponse.json({ success: true });
}
