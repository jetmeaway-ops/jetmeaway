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

    const { amount, currency, offerId, sessionId, serviceIds, servicesSubtotalPence, source, description } =
      await req.json();

    if (!amount || !currency || !offerId) {
      return NextResponse.json(
        { error: 'Missing amount, currency, or offerId' },
        { status: 400 },
      );
    }

    const stripe = new Stripe(STRIPE_KEY);

    // The same /api/stripe/payment-intent route serves BOTH flights and
    // hotels (DOTW supplier path). Without a caller-supplied label, every
    // hotel booking landed in Stripe metadata as `source: jetmeaway_flights`,
    // which broke revenue reporting and put "JetMeAway flight booking" on
    // the customer's card statement for a hotel night. Accept caller
    // overrides; default to flights for backward compat.
    const sourceLabel =
      typeof source === 'string' && source.length > 0
        ? source.slice(0, 80)
        : 'jetmeaway_flights';
    const descriptionText =
      typeof description === 'string' && description.length > 0
        ? description.slice(0, 140)
        : `JetMeAway flight booking (offer ${offerId})`;

    // Stripe metadata:
    //   - values must be strings, max 500 chars per value, max 50 keys
    //   - we join serviceIds with "," → a typical 2-pax round-trip with 2 bags
    //     is ~80 chars, well inside the cap
    //   - we persist the ancillary subtotal in pence so reconciliation can
    //     verify base-fare vs extras split without re-hitting Duffel
    const serviceIdsArr: string[] = Array.isArray(serviceIds) ? serviceIds.filter(Boolean) : [];
    const serviceIdsJoined = serviceIdsArr.join(',').slice(0, 490); // defensive truncation
    const metadata: Record<string, string> = {
      offerId,
      sessionId: sessionId || '',
      source: sourceLabel,
      serviceIds: serviceIdsJoined,
      serviceCount: String(serviceIdsArr.length),
      servicesSubtotalPence: String(Math.round(Number(servicesSubtotalPence || 0))),
    };

    const pi = await stripe.paymentIntents.create({
      amount: Math.round(Number(amount)), // pence
      currency: String(currency).toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata,
      description: descriptionText,
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
