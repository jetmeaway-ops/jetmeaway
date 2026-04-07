import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { prebookWithPaymentSdk } from '@/lib/liteapi';
import type { PendingBooking } from '../start-booking/route';

export const runtime = 'edge';

/**
 * POST /api/hotels/prebook
 *
 * Body: { ref: string }
 *
 * Looks up the pending booking by ref, calls LiteAPI prebook with
 * usePaymentSdk=true, and returns the secretKey + transactionId + prebookId
 * needed to render the LiteAPI payment form on the client.
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

  const { ref } = body || {};
  if (!ref || typeof ref !== 'string') {
    return NextResponse.json(
      { success: false, error: 'ref is required' },
      { status: 400 },
    );
  }

  try {
    const record = await kv.get<PendingBooking>(`pending-booking:${ref}`);
    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Booking not found or expired' },
        { status: 404 },
      );
    }

    if (!record.offerId) {
      return NextResponse.json(
        { success: false, error: 'No offerId on this booking' },
        { status: 400 },
      );
    }

    const result = await prebookWithPaymentSdk(record.offerId);

    // Store prebookId and transactionId on the KV record for the book step
    await kv.set(`pending-booking:${ref}`, {
      ...record,
      prebookId: result.prebookId,
      transactionId: result.transactionId,
      state: 'pending',
    }, { ex: 2 * 60 * 60 });

    return NextResponse.json({
      success: true,
      prebookId: result.prebookId,
      transactionId: result.transactionId,
      secretKey: result.secretKey,
      price: result.price,
      currency: result.currency,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Prebook failed';
    console.error('[hotels/prebook]', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
