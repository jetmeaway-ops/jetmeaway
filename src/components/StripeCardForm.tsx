'use client';

import { useState } from 'react';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { loadStripe, Stripe } from '@stripe/stripe-js';

/**
 * Merchant-of-record Stripe card form.
 *
 *   clientSecret  — from /api/stripe/payment-intent
 *   returnUrl     — absolute URL Stripe can redirect back to (for 3DS)
 *   onSucceeded   — called when PaymentIntent.status === 'succeeded'
 *   onError       — called on any card decline / network failure
 *   disabled      — lock the Pay button (e.g. fare-ack checkbox unticked)
 *   amountLabel   — label like "£123.45" shown on the Pay button
 */

const STRIPE_PK = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
let stripePromise: Promise<Stripe | null> | null = null;
function getStripe() {
  if (!stripePromise && STRIPE_PK) stripePromise = loadStripe(STRIPE_PK);
  return stripePromise;
}

type Props = {
  clientSecret: string;
  returnUrl?: string;
  onSucceeded: () => void;
  onError: (msg: string) => void;
  disabled?: boolean;
  amountLabel?: string;
};

export default function StripeCardForm(props: Props) {
  if (!STRIPE_PK) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-[.78rem] text-red-700 font-semibold">
        Payment system not configured (missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY).
      </div>
    );
  }

  const stripe = getStripe();
  if (!stripe) return null;

  return (
    <Elements
      stripe={stripe}
      options={{
        clientSecret: props.clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#0066FF',
            fontFamily: 'Poppins, system-ui, sans-serif',
            borderRadius: '12px',
          },
        },
      }}
    >
      <InnerForm {...props} />
    </Elements>
  );
}

function InnerForm({ onSucceeded, onError, disabled, amountLabel, returnUrl }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || submitting || disabled) return;

    setSubmitting(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: returnUrl || (typeof window !== 'undefined' ? window.location.href : ''),
        },
        redirect: 'if_required',
      });

      if (error) {
        onError(error.message || 'Your card was declined. Please try a different card.');
        // Re-enable on error so the customer can fix their card and retry.
        setSubmitting(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        onSucceeded();
        // DELIBERATELY do NOT setSubmitting(false) here. Parent transitions
        // to step='processing' which unmounts this form; if we re-enabled
        // the Pay button there'd be a window where a frantic customer can
        // double-tap and trigger "PaymentIntent already succeeded" toasts.
        return;
      }
      if (paymentIntent) {
        onError(`Payment status: ${paymentIntent.status}. Please try again.`);
        setSubmitting(false);
      } else {
        onError('Payment could not be confirmed. Please try again.');
        setSubmitting(false);
      }
    } catch (err: any) {
      onError(err?.message || 'Payment failed. Please try again.');
      setSubmitting(false);
    }
    // No `finally` block — the success branch deliberately leaves
    // `submitting=true` so the button stays disabled while the parent
    // unmounts us. Each error branch resets submitting itself.
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{ layout: 'tabs' }}
      />
      <button
        type="submit"
        disabled={!stripe || !elements || submitting || disabled}
        className="w-full bg-[#0066FF] hover:bg-[#0052CC] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-poppins font-black text-[.9rem] py-3.5 rounded-xl transition-all"
      >
        {submitting ? 'Processing…' : `Pay ${amountLabel || ''}`.trim()}
      </button>
    </form>
  );
}
