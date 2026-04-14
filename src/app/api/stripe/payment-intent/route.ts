import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export const runtime = 'nodejs';

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || '';

/**
 * POST /api/stripe/payment-intent
 *
 * Creates a Stripe PaymentIntent on OUR Stripe account (not Duffel's).
 * We are Merchant of Record: customer pays JetMeAway, we then pay Duffel
 * out of our prepaid balance.
 *
 * Body: { amount: number (pence), currency: 'gbp', offerId: string, sessionId?: string }
 * Returns: { clientSecret, paymentIntentId }
 */
export async function POST(req: NextRequest) {
  try {
    if (!STRIPE_KEY) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 503 },
      );
    }

    const { amount, currency, offerId, sessionId } = await req.json();

    if (!amount || !currency || !offerId) {
      return NextResponse.json(
        { error: 'Missing amount, currency, or offerId' },
        { status: 400 },
      );
    }

    const stripe = new Stripe(STRIPE_KEY);

    const pi = await stripe.paymentIntents.create({
      amount: Math.round(Number(amount)), // pence
      currency: String(currency).toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: {
        offerId,
        sessionId: sessionId || '',
        source: 'jetmeaway_flights',
      },
      description: `JetMeAway flight booking (offer ${offerId})`,
    });

    return NextResponse.json({
      success: true,
      clientSecret: pi.client_secret,
      paymentIntentId: pi.id,
    });
  } catch (err: any) {
    console.error('Stripe PI error', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to create PaymentIntent' },
      { status: 500 },
    );
  }
}
