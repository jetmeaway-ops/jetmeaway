import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * WebBeds booking creation endpoint — placeholder.
 *
 * PAYMENT FLOW:
 *   1. Customer pays JetMeAway retail price via Stripe checkout
 *   2. Stripe confirms payment success → webhook triggers this route
 *   3. This route calls WebBeds with JetMeAway's virtual/corporate card
 *      charging the net (wholesale) rate
 *   4. Margin = retail - net, retained by JetMeAway
 *   5. On WebBeds success → booking confirmed, email + SMS sent
 *   6. On WebBeds failure → auto-refund customer via Stripe
 *
 * Note: JetMeAway is liable for chargebacks, refunds, and customer
 * service under this model. Wire-up TBC post-onboarding.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return NextResponse.json({
      ready: false,
      message: 'WebBeds booking not yet connected',
      received: Object.keys(body),
    });
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
}
