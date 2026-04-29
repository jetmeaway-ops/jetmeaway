import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { prebookWithPaymentSdk } from '@/lib/liteapi';
import type { PendingBooking } from '../start-booking/route';

// Node runtime — LiteAPI prebook can take 15-25s, Edge times out too early
export const maxDuration = 60;

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

    // Price-drift guard. LiteAPI's prebook can return a different price
    // than what the user saw on the search results card (inventory shifts,
    // FX repricing, supplier-side update between search and click-to-book).
    // Threshold: 5% drift OR > £5 absolute = reject the prebook with a
    // clear error so the client can show a "price changed" banner and
    // force the user to re-search. Smaller drifts (< 5%) pass through;
    // the LiteAPI Payment SDK form shows the up-to-date price before the
    // customer enters card details, so they still see the new figure
    // before paying.
    const searchPrice = Number(record.totalPrice) || 0;
    const newPrice = Number(result.price) || 0;
    if (searchPrice > 0 && newPrice > 0) {
      const driftAbs = Math.abs(newPrice - searchPrice);
      const driftPct = driftAbs / searchPrice;
      if (driftPct > 0.05 || driftAbs > 5) {
        console.warn(`[hotels/prebook] price drift rejected: search=£${searchPrice.toFixed(2)} new=£${newPrice.toFixed(2)} drift=${(driftPct * 100).toFixed(1)}% (£${driftAbs.toFixed(2)})`);
        return NextResponse.json({
          success: false,
          error: 'price_changed',
          message: `The price has changed since your search (was £${searchPrice.toFixed(2)}, now £${newPrice.toFixed(2)}). Please search again to see the latest rate.`,
          searchPrice,
          newPrice,
          driftPercent: Math.round(driftPct * 1000) / 10,
        }, { status: 409 });
      }
    }

    // Store prebookId and transactionId on the KV record for the book step
    // Update totalPrice + currency to match the actual prebook price (may differ from search)
    // 4h TTL — customer may take time to enter payment details
    await kv.set(`pending-booking:${ref}`, {
      ...record,
      prebookId: result.prebookId,
      transactionId: result.transactionId,
      totalPrice: result.price ?? record.totalPrice,
      currency: result.currency ?? record.currency,
      state: 'pending',
    }, { ex: 4 * 60 * 60 });

    return NextResponse.json({
      success: true,
      prebookId: result.prebookId,
      transactionId: result.transactionId,
      secretKey: result.secretKey,
      price: result.price,
      currency: result.currency,
      priceDifferencePercent: result.priceDifferencePercent,
      cancellationChanged: result.cancellationChanged,
      boardChanged: result.boardChanged,
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
