import { NextRequest, NextResponse } from 'next/server';
import { bookForm, bookingStatus, type RHBookFormRequest } from '@/lib/ratehawk';

export const runtime = 'edge';

/**
 * RateHawk booking endpoints (Phase V and VI).
 *
 * POST /api/ratehawk/book       — create reservation (Phase V)
 * GET  /api/ratehawk/book?id=…  — poll reservation status (Phase VI)
 *
 * NEVER cached. Retries disabled on POST — partner_order_id acts as the
 * idempotency key; duplicate submissions with the same id will be rejected
 * by RateHawk rather than creating two reservations.
 */
export async function POST(req: NextRequest) {
  let body: Partial<RHBookFormRequest> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const missing: string[] = [];
  if (!body.partner_order_id) missing.push('partner_order_id');
  if (!body.book_hash) missing.push('book_hash');
  if (!body.user_ip) missing.push('user_ip');
  if (!body.rooms || body.rooms.length === 0) missing.push('rooms');
  if (!body.payment_type) missing.push('payment_type');

  if (missing.length) {
    return NextResponse.json(
      { error: `missing required fields: ${missing.join(', ')}` },
      { status: 400 }
    );
  }

  const result = await bookForm(body as RHBookFormRequest);

  return NextResponse.json({
    ok: result.ok,
    status: result.status,
    error: result.error,
    requestId: result.requestId,
    data: result.data,
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id') || '';

  if (!id) {
    return NextResponse.json(
      { error: 'id (partner_order_id) is required' },
      { status: 400 }
    );
  }

  const result = await bookingStatus(id);
  return NextResponse.json({
    ok: result.ok,
    status: result.status,
    error: result.error,
    requestId: result.requestId,
    data: result.data,
  });
}
