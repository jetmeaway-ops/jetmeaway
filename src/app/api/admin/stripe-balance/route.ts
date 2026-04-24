import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * GET /api/admin/stripe-balance
 *
 * Admin-only. Returns current Stripe balance (available + pending) plus a
 * 7-day trailing charge volume and the next scheduled payout, if any.
 *
 * Response shape:
 *   {
 *     available: number   // GBP, float
 *     pending: number     // GBP, float
 *     currency: 'GBP'
 *     last7Volume: number // GBP, float (succeeded charges only)
 *     last7Count: number
 *     nextPayout: { amount: number, arrivalDate: string } | null
 *     checkedAt: string
 *   }
 *
 * All values are converted from pence. If Stripe returns multiple currencies
 * we only surface GBP — anything else is ignored (we don't sell in other
 * currencies yet).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('jma_admin')?.value || '';
  const secret = process.env.ADMIN_SECRET || '';
  if (!secret || token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(key, {
    apiVersion: '2026-03-25.dahlia' as any,
    typescript: true,
  });

  try {
    const pickGbp = (
      arr: Array<{ amount: number; currency: string }> | undefined,
    ) => {
      const row = arr?.find(b => b.currency === 'gbp');
      return row ? row.amount / 100 : 0;
    };

    const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;

    const [balance, charges, payouts] = await Promise.all([
      stripe.balance.retrieve(),
      stripe.charges.list({
        created: { gte: sevenDaysAgo },
        limit: 100,
      }),
      stripe.payouts.list({ limit: 1, status: 'pending' }),
    ]);

    const available = pickGbp(balance.available);
    const pending = pickGbp(balance.pending);

    const succeeded = charges.data.filter(c => c.status === 'succeeded' && c.currency === 'gbp');
    const last7Volume = succeeded.reduce((sum, c) => sum + c.amount, 0) / 100;
    const last7Count = succeeded.length;

    const nextPayoutRow = payouts.data[0];
    const nextPayout = nextPayoutRow
      ? {
          amount: nextPayoutRow.amount / 100,
          arrivalDate: new Date(nextPayoutRow.arrival_date * 1000).toISOString(),
        }
      : null;

    return NextResponse.json({
      available,
      pending,
      currency: 'GBP',
      last7Volume,
      last7Count,
      nextPayout,
      checkedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Stripe balance lookup failed';
    console.error('[admin/stripe-balance]', message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
