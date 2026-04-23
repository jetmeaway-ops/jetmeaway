import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { upsertBooking, getBooking } from '@/lib/bookings';

/**
 * POST /api/admin/issue-refund
 * Body: { ref: string, amountPence?: number, reason?: string }
 *
 * Admin-only. Issues a Stripe refund against the booking's captured
 * PaymentIntent and updates the unified booking store.
 *
 * - If `amountPence` is omitted or equals `totalPence`, issues a FULL refund
 *   and flips the booking to status='refunded' / paymentStatus='refunded'.
 * - If `amountPence` is less than `totalPence`, issues a PARTIAL refund,
 *   appends a note, and leaves status alone — the admin decides whether
 *   to mark the whole booking cancelled separately.
 *
 * Never throws to the caller: all failures return { success: false, error }.
 *
 * This endpoint does NOT call the supplier (LiteAPI / Duffel) — use
 * /api/admin/cancel-booking for that. A refund is purely a money movement
 * on the Stripe side; the supplier-side booking status has to be reconciled
 * separately. When both happen, call cancel-booking FIRST so LiteAPI's own
 * auto-refund doesn't race our manual one.
 */
export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('jma_admin')?.value || '';
  const secret = process.env.ADMIN_SECRET || '';
  if (!secret || token !== secret) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: { ref?: string; amountPence?: number; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }
  const { ref, amountPence, reason } = body;
  if (!ref) {
    return NextResponse.json({ success: false, error: 'ref required' }, { status: 400 });
  }

  const booking = await getBooking(ref);
  if (!booking) {
    return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
  }
  if (!booking.stripePaymentId) {
    return NextResponse.json(
      { success: false, error: 'No Stripe payment on this booking — nothing to refund' },
      { status: 400 },
    );
  }
  if (booking.paymentStatus === 'refunded') {
    return NextResponse.json(
      { success: false, error: 'Already marked refunded in admin store' },
      { status: 409 },
    );
  }

  // Determine amount. If caller omitted, refund the full paid total.
  const requested = typeof amountPence === 'number' && Number.isFinite(amountPence) && amountPence > 0
    ? Math.round(amountPence)
    : booking.totalPence;
  if (requested > booking.totalPence) {
    return NextResponse.json(
      { success: false, error: `Refund amount exceeds paid total (${booking.totalPence} pence)` },
      { status: 400 },
    );
  }
  const isFullRefund = requested >= booking.totalPence;

  // Stripe refund — dynamic import keeps Stripe SDK out of Edge bundles.
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return NextResponse.json(
      { success: false, error: 'Stripe is not configured' },
      { status: 503 },
    );
  }
  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(key, { apiVersion: '2026-03-25.dahlia' as any, typescript: true });

  let refundId: string;
  let refundStatus: string;
  try {
    const refund = await stripe.refunds.create({
      payment_intent: booking.stripePaymentId,
      amount: requested,
      reason: 'requested_by_customer',
      metadata: {
        admin_issued: 'true',
        jma_ref: ref,
        admin_reason: (reason || '').slice(0, 500),
      },
    });
    refundId = refund.id;
    refundStatus = refund.status || 'unknown';
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Stripe refund failed';
    console.error('[admin/issue-refund] Stripe error', message);
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }

  // Mirror to admin store.
  const nowIso = new Date().toISOString();
  const gbp = (p: number) => `£${(p / 100).toFixed(2)}`;
  const noteLine = isFullRefund
    ? `Manual full refund ${gbp(requested)} via Stripe (${refundId}, ${refundStatus}) at ${nowIso}${reason ? ` — ${reason}` : ''}`
    : `Manual partial refund ${gbp(requested)} / ${gbp(booking.totalPence)} via Stripe (${refundId}, ${refundStatus}) at ${nowIso}${reason ? ` — ${reason}` : ''}`;

  const updated = {
    ...booking,
    status: isFullRefund ? ('refunded' as const) : booking.status,
    paymentStatus: isFullRefund ? ('refunded' as const) : booking.paymentStatus,
    updatedAt: nowIso,
    notes: booking.notes ? `${booking.notes}\n${noteLine}` : noteLine,
  };
  try {
    await upsertBooking(updated);
  } catch (err) {
    // Refund already happened at Stripe — don't fail the response, but log loudly.
    console.error('[admin/issue-refund] upsertBooking failed after successful Stripe refund', err);
  }

  return NextResponse.json({
    success: true,
    refundId,
    refundStatus,
    amountPence: requested,
    isFullRefund,
  });
}
