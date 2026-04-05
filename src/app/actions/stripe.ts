'use server';

/**
 * Stripe Checkout (Hosted) — Server Action
 *
 * The customer stays on jetmeaway.co.uk until the "Book & Secure" button is
 * clicked, at which point we create a Stripe Checkout Session server-side and
 * redirect them to Stripe's hosted payment page. After payment Stripe redirects
 * back to /success?session_id=... where we verify the session and finalise
 * downstream bookings (LiteAPI hotel + Duffel flight).
 *
 * Env:
 *   STRIPE_SECRET_KEY              — required
 *   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY — used by the client only (not here)
 */

import Stripe from 'stripe';

const STRIPE_API_VERSION = '2026-03-25.dahlia' as const;

function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key, {
    apiVersion: STRIPE_API_VERSION,
    typescript: true,
    appInfo: { name: 'JetMeAway', url: 'https://jetmeaway.co.uk' },
  });
}

export interface CheckoutLineItems {
  /** Total hotel stay price in GBP (e.g. 412.50). Omit or 0 to skip the line */
  hotelPrice?: number;
  /** Total flight reservation price in GBP. Omit or 0 to skip */
  flightPrice?: number;
  /** JetMeAway Scout concierge fee in GBP. Omit or 0 to skip */
  scoutFee?: number;
  /** ISO 4217. Defaults to 'gbp' */
  currency?: string;
}

export interface TravelerDetails {
  /** Full name of the lead traveler */
  name: string;
  /** Internal booking reference so you can match a Stripe payment to a trip */
  reference: string;
  /** Optional email, used to prefill Stripe Checkout and attach a receipt */
  email?: string;
  /** Optional ISO departure date (YYYY-MM-DD) — shown in dashboard metadata */
  departureDate?: string;
  /** Optional destination city for easy dashboard filtering */
  destination?: string;
}

export interface CreateCheckoutResult {
  success: boolean;
  url?: string;
  sessionId?: string;
  error?: string;
}

/**
 * Create a Stripe Checkout Session for a travel booking and return the
 * hosted-page URL. The caller redirects the browser to `result.url`.
 */
export async function createCheckoutSession(
  lineItems: CheckoutLineItems,
  traveler: TravelerDetails,
): Promise<CreateCheckoutResult> {
  try {
    if (!traveler?.name || !traveler?.reference) {
      return { success: false, error: 'Traveler name and reference are required' };
    }

    const currency = (lineItems.currency || 'gbp').toLowerCase();

    // Build line items from whichever prices the caller supplied.
    // Prices are validated server-side: must be numbers, > 0, < £50,000 each.
    const MAX = 50000;
    type LineItem = {
      quantity: number;
      price_data: {
        currency: string;
        unit_amount: number;
        product_data: { name: string; description?: string };
      };
    };
    const items: LineItem[] = [];

    const push = (label: string, amount: number | undefined, description?: string) => {
      if (amount == null || amount <= 0) return;
      if (!Number.isFinite(amount) || amount > MAX) {
        throw new Error(`Invalid ${label} price`);
      }
      items.push({
        quantity: 1,
        price_data: {
          currency,
          unit_amount: Math.round(amount * 100), // convert GBP → pence
          product_data: {
            name: label,
            ...(description ? { description } : {}),
          },
        },
      });
    };

    push('Hotel Stay', lineItems.hotelPrice, `Booking reference: ${traveler.reference}`);
    push('Flight Reservation', lineItems.flightPrice, `Booking reference: ${traveler.reference}`);
    push('JetMeAway Scout Fee', lineItems.scoutFee, 'Concierge assistance + Deep Neighbourhood guide');

    if (items.length === 0) {
      return { success: false, error: 'At least one line item with a price > 0 is required' };
    }

    const session = await stripe().checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: items,
      success_url: 'https://jetmeaway.co.uk/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://jetmeaway.co.uk/search',
      ...(traveler.email ? { customer_email: traveler.email } : {}),
      // Metadata — visible in the Stripe dashboard so you can see who paid.
      metadata: {
        traveler_name: traveler.name,
        booking_reference: traveler.reference,
        ...(traveler.email ? { traveler_email: traveler.email } : {}),
        ...(traveler.departureDate ? { departure_date: traveler.departureDate } : {}),
        ...(traveler.destination ? { destination: traveler.destination } : {}),
        hotel_price: String(lineItems.hotelPrice ?? 0),
        flight_price: String(lineItems.flightPrice ?? 0),
        scout_fee: String(lineItems.scoutFee ?? 0),
      },
      // PaymentIntent metadata mirrors session metadata — shows up on the
      // underlying charge so LiteAPI/Duffel reconciliation by reference works.
      // `receipt_email` forces Stripe to send a receipt once the payment
      // succeeds; `customer_email` on the session alone only prefills the
      // checkout form in sandbox and does not trigger automatic delivery.
      payment_intent_data: {
        metadata: {
          traveler_name: traveler.name,
          booking_reference: traveler.reference,
        },
        description: `JetMeAway booking ${traveler.reference} — ${traveler.name}`,
        ...(traveler.email ? { receipt_email: traveler.email } : {}),
      },
    });

    if (!session.url) {
      return { success: false, error: 'Stripe did not return a checkout URL' };
    }

    return { success: true, url: session.url, sessionId: session.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[stripe] createCheckoutSession failed:', message);
    return { success: false, error: message };
  }
}
