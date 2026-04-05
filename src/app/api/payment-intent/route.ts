import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const DUFFEL_KEY = process.env.DUFFEL_TEST_TOKEN || process.env.DUFFEL_ACCESS_TOKEN || process.env.DUFFEL_API_KEY || '';

/**
 * POST /api/payment-intent
 * Creates a Duffel Payment Intent for card collection.
 * Body: { amount: string, currency: string }
 * Returns: { clientToken, paymentIntentId }
 */
export async function POST(req: NextRequest) {
  try {
    const { amount, currency } = await req.json();

    if (!amount || !currency) {
      return NextResponse.json({ error: 'Missing amount or currency' }, { status: 400 });
    }

    if (!DUFFEL_KEY) {
      return NextResponse.json({ error: 'Payment service unavailable' }, { status: 503 });
    }

    const res = await fetch('https://api.duffel.com/payments/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DUFFEL_KEY}`,
        'Duffel-Version': 'v2',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        data: {
          amount: String(amount),
          currency: currency.toUpperCase(),
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Duffel payment intent error:', res.status, errText);

      let message = 'Failed to initialise payment. Please try again.';
      try {
        const errJson = JSON.parse(errText);
        message = errJson.errors?.[0]?.message || message;
      } catch {}

      return NextResponse.json({ error: message }, { status: res.status });
    }

    const json = await res.json();
    const pi = json.data;

    return NextResponse.json({
      success: true,
      clientToken: pi.client_token,
      paymentIntentId: pi.id,
    });
  } catch (err: any) {
    console.error('Payment intent error:', err);
    return NextResponse.json({ error: 'Failed to initialise payment' }, { status: 500 });
  }
}
