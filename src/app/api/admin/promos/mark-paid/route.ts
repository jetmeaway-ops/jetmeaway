import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { upsertBooking, getBooking } from '@/lib/bookings';

export const runtime = 'nodejs';

/**
 * POST /api/admin/promos/mark-paid
 * Body: { ref: string, note?: string }
 *
 * Admin-only. Marks the £5-off-2nd-booking-via-app cashback as paid for
 * the given booking. Sets promoStatus='paid', promoPaidAt=<now>,
 * promoPaidNote=<note>.
 *
 * v1: the actual £5 payout happens manually outside this route — the
 * owner refunds via LiteAPI dashboard / Stripe / Wise / PayPal, then
 * clicks "Mark as paid" here so the admin queue stays accurate. v2 will
 * automate the payout (see ditch-the-5-cash-hazy-toast.md).
 *
 * Idempotent: marking an already-paid booking is a no-op (the new note
 * appends to the existing one, the timestamp does not change).
 */
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('jma_admin')?.value || '';
  const secret = process.env.ADMIN_SECRET || '';
  if (!secret || token !== secret) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: { ref?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const { ref, note } = body;
  if (!ref) {
    return NextResponse.json({ success: false, error: 'ref required' }, { status: 400 });
  }

  const existing = await getBooking(ref);
  if (!existing) {
    return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
  }
  if (existing.promoCode !== 'APP_2ND_5OFF') {
    return NextResponse.json(
      { success: false, error: 'Booking not flagged for APP_2ND_5OFF promo' },
      { status: 400 },
    );
  }

  const trimmedNote = (note || '').trim().slice(0, 280);
  const nowIso = new Date().toISOString();
  const wasAlreadyPaid = existing.promoStatus === 'paid';
  const auditNote =
    `[${nowIso}] Promo APP_2ND_5OFF marked paid${trimmedNote ? ` — ${trimmedNote}` : ''}`;

  await upsertBooking({
    ...existing,
    promoStatus: 'paid',
    // Preserve original paid timestamp on subsequent edits so the queue
    // ages off accurately. Only set on first transition to 'paid'.
    promoPaidAt: existing.promoPaidAt || nowIso,
    promoPaidNote: trimmedNote || existing.promoPaidNote || '',
    updatedAt: nowIso,
    notes: existing.notes ? `${existing.notes}\n\n${auditNote}` : auditNote,
  });

  return NextResponse.json({ success: true, alreadyPaid: wasAlreadyPaid });
}
