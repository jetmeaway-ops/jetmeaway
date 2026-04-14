import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { listBookings, upsertBooking } from '@/lib/bookings';

export const runtime = 'nodejs';

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || '';
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

/**
 * POST /api/stripe/webhook — Stripe async event handler.
 *
 * Listens for:
 *   - charge.refunded → mark booking refunded
 *   - charge.dispute.created → mark booking disputed, alert admin
 *   - payment_intent.payment_failed → mark booking failed
 *
 * To configure: in Stripe dashboard, add webhook endpoint:
 *   https://jetmeaway.co.uk/api/stripe/webhook
 * Copy the signing secret into STRIPE_WEBHOOK_SECRET env var.
 */
export async function POST(req: NextRequest) {
  if (!STRIPE_KEY || !WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  const stripe = new Stripe(STRIPE_KEY);
  const rawBody = await req.text();
  const sig = req.headers.get('stripe-signature') || '';

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('Webhook signature verification failed', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        await markByPaymentIntent(charge.payment_intent as string, {
          status: 'refunded',
          paymentStatus: 'refunded',
          note: `Stripe refund processed (${charge.amount_refunded / 100} GBP)`,
        });
        break;
      }
      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute;
        await markByPaymentIntent(dispute.payment_intent as string, {
          paymentStatus: 'disputed',
          note: `⚠️ CHARGEBACK: ${dispute.reason}. Respond by ${
            dispute.evidence_details?.due_by
              ? new Date(dispute.evidence_details.due_by * 1000).toISOString()
              : 'unknown'
          }`,
        });
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await markByPaymentIntent(pi.id, {
          status: 'failed',
          note: `Payment failed: ${pi.last_payment_error?.message || 'unknown'}`,
        });
        break;
      }
      default:
        // Ignore other events
        break;
    }
  } catch (err) {
    console.error('Webhook handler error', err);
  }

  return NextResponse.json({ received: true });
}

async function markByPaymentIntent(
  piId: string,
  patch: {
    status?: 'refunded' | 'failed';
    paymentStatus?: 'refunded' | 'disputed';
    note: string;
  },
) {
  const all = await listBookings();
  const booking = all.find(b => b.stripePaymentId === piId);
  if (!booking) return;

  await upsertBooking({
    ...booking,
    status: patch.status || booking.status,
    paymentStatus: patch.paymentStatus || booking.paymentStatus,
    notes: [booking.notes, patch.note].filter(Boolean).join('\n'),
    updatedAt: new Date().toISOString(),
  });
}
