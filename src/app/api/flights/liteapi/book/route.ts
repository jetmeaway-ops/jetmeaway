import { NextRequest, NextResponse } from 'next/server';
import { finalizeFlightBooking } from '@/lib/finalize-flight-booking';

/**
 * POST /api/flights/liteapi/book — finalise a LiteAPI flight booking.
 *
 * Called AFTER the customer has paid via LiteAPI's hosted Payment SDK (LiteAPI is
 * merchant-of-record — same model as hotels; JetMeAway never sees the card, and
 * there is NO Stripe on our side).
 *
 * Body: { ref, prebookId, transactionId }  →  { ok, ref, bookingRef } | { error }
 *
 * The finalise LOGIC lives in @/lib/finalize-flight-booking so the confirm page
 * can call it DIRECTLY (no internal HTTP hop that a protected deployment would
 * 401, and no extra failure point in the payment flow). This route is a thin
 * HTTP wrapper for the Payment SDK returnUrl / client retries.
 *
 * Node runtime — LiteAPI book can take 15-25s.
 */

const LITEAPI_FLIGHTS_ENABLED = process.env.LITEAPI_FLIGHTS_ENABLED === 'true';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // Parking gate — production leaves the flag unset → this route is invisible.
  if (!LITEAPI_FLIGHTS_ENABLED) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  let body: { ref?: string; prebookId?: string; transactionId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const result = await finalizeFlightBooking(
    typeof body.ref === 'string' ? body.ref : '',
    typeof body.prebookId === 'string' ? body.prebookId : '',
    typeof body.transactionId === 'string' ? body.transactionId : '',
  );

  if (result.ok) {
    return NextResponse.json({
      ok: true,
      ref: result.ref,
      bookingRef: result.bookingRef ?? null,
      ...(result.reconcile ? { reconcile: true } : {}),
    });
  }

  return NextResponse.json({ error: result.error ?? 'book_failed' }, { status: result.status });
}
