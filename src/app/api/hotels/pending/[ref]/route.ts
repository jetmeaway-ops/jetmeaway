import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import type { PendingBooking } from '../../start-booking/route';

export const runtime = 'edge';

/**
 * GET /api/hotels/pending/[ref]
 *
 * Returns the sanitized pending-booking record the /hotels/checkout/[ref] page
 * renders as an order summary. Offers are intentionally NOT exposed back to the
 * client (we only echo back what the client already knows — price/dates/hotel name).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const { ref } = await params;
  if (!ref) {
    return NextResponse.json({ success: false, error: 'ref is required' }, { status: 400 });
  }

  try {
    const record = await kv.get<PendingBooking>(`pending-booking:${ref}`);
    if (!record) {
      return NextResponse.json({ success: false, error: 'Booking not found or expired' }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      booking: {
        ref: record.ref,
        hotelName: record.hotelName,
        stars: record.stars ?? 0,
        totalPrice: record.totalPrice,
        currency: record.currency,
        checkIn: record.checkIn,
        checkOut: record.checkOut,
        city: record.city,
        adults: record.adults,
        nights: record.nights,
        thumbnail: record.thumbnail,
        refundable: typeof record.refundable === 'boolean' ? record.refundable : null,
        cancellationDeadline: record.cancellationDeadline ?? null,
        state: record.state,
        liteapiBookingId: record.liteapiBookingId ?? null,
        liteapiConfirmationCode: record.liteapiConfirmationCode ?? null,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
