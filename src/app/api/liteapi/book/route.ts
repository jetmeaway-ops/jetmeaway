import { NextRequest, NextResponse } from 'next/server';
import { completeBooking } from '@/lib/liteapi';

export const runtime = 'edge';

/**
 * POST /api/liteapi/book
 * Body: {
 *   offerId: string,
 *   guest: { firstName, lastName, email, phone?, nationality? },
 *   stripePaymentIntentId?: string
 * }
 *
 * Privacy Shield: the customer must have already paid on jetmeaway.co.uk via
 * Stripe before this endpoint is called. Pass the Stripe PaymentIntent ID as
 * stripePaymentIntentId so LiteAPI can reference it against our merchant
 * wallet. The user never leaves the site for payment.
 */
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const { offerId, guest, stripePaymentIntentId } = body || {};

  if (!offerId) {
    return NextResponse.json(
      { success: false, error: 'offerId is required' },
      { status: 400 },
    );
  }
  if (!guest?.firstName || !guest?.lastName || !guest?.email) {
    return NextResponse.json(
      { success: false, error: 'guest.firstName, lastName and email are required' },
      { status: 400 },
    );
  }

  try {
    const booking = await completeBooking({
      offerId,
      guest,
      stripePaymentIntentId,
    });
    return NextResponse.json({ success: true, booking });
  } catch (err: any) {
    console.error('[liteapi/book]', err?.message || err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Booking failed' },
      { status: 500 },
    );
  }
}
