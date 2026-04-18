import { NextRequest, NextResponse } from 'next/server';
import { prebook } from '@/lib/ratehawk';

export const runtime = 'edge';

/**
 * RateHawk prebook (Phase IV).
 *
 * Validates the rate right before payment. NEVER cached. NEVER retried
 * on non-network failure — a retry after a timeout risks double-locking
 * inventory. The caller is responsible for user-facing retry UX.
 *
 * POST body:
 *   { hash: string, price_increase_percent?: number }
 */
export async function POST(req: NextRequest) {
  let body: { hash?: string; price_increase_percent?: number } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  if (!body.hash) {
    return NextResponse.json({ error: 'hash (book_hash) is required' }, { status: 400 });
  }

  const result = await prebook({
    hash: body.hash,
    price_increase_percent: body.price_increase_percent,
  });

  return NextResponse.json({
    ok: result.ok,
    status: result.status,
    error: result.error,
    requestId: result.requestId,
    data: result.data,
  });
}
