import { NextResponse } from 'next/server';

export const runtime = 'edge';

const DUFFEL_KEY = process.env.DUFFEL_TEST_TOKEN || process.env.DUFFEL_ACCESS_TOKEN || process.env.DUFFEL_API_KEY || '';

/**
 * GET /api/duffel-status
 * Diagnostic — creates a £1 payment intent and reports back which Duffel
 * environment (test vs live) the configured token is hitting. Used to verify
 * test mode is active before running any test bookings.
 */
export async function GET() {
  if (!DUFFEL_KEY) {
    return NextResponse.json({ error: 'No Duffel token configured' }, { status: 503 });
  }

  const tokenPrefix = DUFFEL_KEY.startsWith('duffel_test_')
    ? 'duffel_test'
    : DUFFEL_KEY.startsWith('duffel_live_')
      ? 'duffel_live'
      : 'unknown';

  try {
    const res = await fetch('https://api.duffel.com/payments/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DUFFEL_KEY}`,
        'Duffel-Version': 'v2',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        data: { amount: '1.00', currency: 'GBP' },
      }),
    });

    const body = await res.text();
    let liveMode: boolean | null = null;
    let intentId: string | null = null;
    try {
      const j = JSON.parse(body);
      liveMode = j.data?.live_mode ?? null;
      intentId = j.data?.id ?? null;
    } catch {}

    return NextResponse.json({
      tokenPrefix,
      httpStatus: res.status,
      liveMode,
      intentId,
      isTestMode: liveMode === false,
    });
  } catch (err: any) {
    return NextResponse.json({ tokenPrefix, error: err.message }, { status: 500 });
  }
}
