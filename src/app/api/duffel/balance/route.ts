import { NextResponse } from 'next/server';
import { getBalance } from '@/lib/duffel';

export const runtime = 'edge';

/**
 * GET /api/duffel/balance
 *
 * Returns the current prepaid Duffel balance. Used by:
 *   - Admin dashboard widget (displayed top-right)
 *   - Pre-flight balance check on the checkout page
 *     (if balance < offerTotal + £10 buffer → hide Pay button)
 */
export async function GET() {
  const balance = await getBalance();
  if (!balance) {
    return NextResponse.json(
      { available: null, error: 'Balance unavailable' },
      { status: 503 },
    );
  }
  return NextResponse.json({
    available: balance.available,
    currency: balance.currency,
    raw: balance.raw,
    checkedAt: new Date().toISOString(),
  });
}
