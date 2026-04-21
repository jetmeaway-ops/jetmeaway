/**
 * POST /api/account/bookings/cancel
 *
 * BACKLOG B3 (2026-04-21): Customer-facing self-service cancellation.
 *
 * Gated on THREE conditions, any of which fails → 4xx:
 *   1. The caller is signed in AND owns the booking
 *      (bookings.customerEmail === session email)
 *   2. The booking was fulfilled by LiteAPI (DOTW doesn't expose a cancel
 *      endpoint we can safely call in-flow, and we don't resell other
 *      suppliers through the same path yet).
 *   3. `cancellationDeadline` is a real ISO string AND is still in the
 *      future. Non-refundable rates never have a deadline; past-deadline
 *      bookings need human support to work out goodwill cancellations.
 *
 * On success: calls LiteAPI cancelBooking() via the lib helper, then marks
 * the unified-store Booking as cancelled with a dated note. If LiteAPI
 * refuses (e.g. already cancelled, or race vs. deadline), we return their
 * error verbatim and DO NOT update our store — the truth about whether a
 * cancellation succeeded has to be the supplier, not us.
 *
 * Refund processing (Stripe side) is explicitly out of scope here — per the
 * BACKLOG note — and is handled separately by the LiteAPI webhook / an
 * admin-run refund helper.
 */
import { NextRequest, NextResponse } from 'next/server';
import { readSessionEmail } from '@/lib/session';
import { getBooking, upsertBooking } from '@/lib/bookings';
import { cancelBooking as liteapiCancel } from '@/lib/liteapi';

// Node runtime — LiteAPI cancel can take several seconds and we want
// reliable cookie parsing + KV writes in production.
export const runtime = 'nodejs';
export const maxDuration = 30;

type CancelRequest = {
  bookingId?: string;
};

export async function POST(req: NextRequest) {
  const email = await readSessionEmail(req.headers.get('cookie'));
  if (!email) {
    return NextResponse.json(
      { success: false, error: 'Not signed in' },
      { status: 401 },
    );
  }

  let body: CancelRequest = {};
  try {
    body = (await req.json()) as CancelRequest;
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const bookingId = (body.bookingId || '').trim();
  if (!bookingId) {
    return NextResponse.json(
      { success: false, error: 'bookingId is required' },
      { status: 400 },
    );
  }

  const booking = await getBooking(bookingId);
  if (!booking) {
    return NextResponse.json(
      { success: false, error: 'Booking not found' },
      { status: 404 },
    );
  }

  // Ownership — prevent enumeration / cross-account cancellation.
  if ((booking.customerEmail || '').toLowerCase() !== email) {
    // Generic 404 not 403 — don't confirm to the caller that the booking
    // exists under another email.
    return NextResponse.json(
      { success: false, error: 'Booking not found' },
      { status: 404 },
    );
  }

  // Already cancelled / refunded / completed → no-op with a clean message.
  if (['cancelled', 'refunded', 'failed'].includes(booking.status)) {
    return NextResponse.json(
      { success: false, error: `Booking already ${booking.status}` },
      { status: 409 },
    );
  }
  if (booking.status === 'completed') {
    return NextResponse.json(
      {
        success: false,
        error: 'Stay already completed — please contact support for post-stay issues.',
      },
      { status: 409 },
    );
  }

  // Supplier gate — LiteAPI only for now. DOTW / affiliate bookings route
  // to support.
  if (booking.supplier !== 'liteapi') {
    return NextResponse.json(
      {
        success: false,
        error:
          'Self-service cancellation is only available for LiteAPI bookings. Please contact support to cancel this one.',
      },
      { status: 403 },
    );
  }

  // Deadline gate — must have a real deadline in the future. Non-refundable
  // rates (no deadline) and past-deadline bookings route to support.
  const deadline = booking.cancellationDeadline
    ? new Date(booking.cancellationDeadline)
    : null;
  if (!deadline || Number.isNaN(deadline.getTime())) {
    return NextResponse.json(
      {
        success: false,
        error:
          'This rate is non-refundable. Please contact support if you have a special circumstance.',
      },
      { status: 403 },
    );
  }
  if (deadline.getTime() <= Date.now()) {
    return NextResponse.json(
      {
        success: false,
        error: `Free-cancellation deadline (${deadline.toUTCString()}) has passed. Please contact support.`,
      },
      { status: 403 },
    );
  }

  // Call LiteAPI. We use the supplier booking id when we have one (that's
  // the id LiteAPI issued at confirm time); otherwise fall back to our
  // client reference, which we also passed as `clientReference` so LiteAPI
  // can resolve it either way.
  const supplierId = booking.supplierRef || booking.id;
  const res = await liteapiCancel(supplierId);
  if (!res.ok) {
    // Don't mutate our store when supplier refused — the truth lives with
    // the supplier. Surface their error verbatim to the admin notes via
    // the response, but show a polite version to the customer.
    console.warn('[account/bookings/cancel] LiteAPI refused', {
      bookingId,
      supplierId,
      error: res.error,
    });
    return NextResponse.json(
      {
        success: false,
        error:
          "We couldn't complete the cancellation with the property. This can happen if the booking was already cancelled, or if the supplier has a hold on the room. Please contact support.",
      },
      { status: 502 },
    );
  }

  // Success — mirror the status change into our unified store with a dated
  // note. The LiteAPI webhook will also reconcile this later, which is fine
  // (idempotent writes on the same id).
  const now = new Date().toISOString();
  const refundChunk =
    typeof res.refundAmount === 'number'
      ? ` — refund £${res.refundAmount.toFixed(2)}`
      : '';
  await upsertBooking({
    ...booking,
    status: 'cancelled',
    paymentStatus: 'refunded',
    updatedAt: now,
    notes: [
      booking.notes || '',
      `[${now.slice(0, 10)}] Customer self-cancelled via /account/bookings${refundChunk}.`,
    ]
      .filter(Boolean)
      .join('\n')
      .slice(0, 2000),
  });

  return NextResponse.json({
    success: true,
    status: res.status,
    refundAmount: res.refundAmount,
  });
}
