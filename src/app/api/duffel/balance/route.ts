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
    // Degrade to 200 so Vercel doesn't flag this as a 5xx anomaly — the
    // widget handles null gracefully. Duffel's /airlines/balances endpoint
    // isn't publicly exposed, so this fails by design until we wire up a
    // real source of truth for the balance.
    return NextResponse.json({
      available: null,
      error: 'Balance unavailable',
      checkedAt: new Date().toISOString(),
    });
  }
  return NextResponse.json({
    available: balance.available,
    currency: balance.currency,
    raw: balance.raw,
    checkedAt: new Date().toISOString(),
  });
}
