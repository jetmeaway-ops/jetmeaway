'use client';

import { useState } from 'react';
import {
  createCheckoutSession,
  type CheckoutLineItems,
  type TravelerDetails,
} from '@/app/actions/stripe';

interface BookAndSecureButtonProps {
  lineItems: CheckoutLineItems;
  traveler: TravelerDetails;
  /** Optional label override */
  label?: string;
  /** Optional className override for custom styling */
  className?: string;
  /** Disable the button externally (e.g. while form is invalid) */
  disabled?: boolean;
}

/**
 * Single-click checkout: calls the Stripe server action, then redirects the
 * browser to Stripe's hosted checkout page.
 */
export default function BookAndSecureButton({
  lineItems,
  traveler,
  label = 'Book & Secure',
  className,
  disabled,
}: BookAndSecureButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await createCheckoutSession(lineItems, traveler);
      if (!result.success || !result.url) {
        setError(result.error || 'Could not start checkout');
        setLoading(false);
        return;
      }
      // Redirect to Stripe's hosted Checkout page
      window.location.assign(result.url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unexpected error');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading || disabled}
        className={
          className ??
          'w-full bg-[#0066FF] hover:bg-[#0052CC] disabled:opacity-60 disabled:cursor-not-allowed text-white font-[Poppins] font-black text-[.95rem] py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(0,102,255,0.3)] flex items-center justify-center gap-2'
        }
      >
        {loading ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Redirecting to Stripe…
          </>
        ) : (
          <>
            <i className="fa-solid fa-lock text-[.85rem]" /> {label}
          </>
        )}
      </button>
      {error && (
        <p className="text-[.72rem] font-bold text-red-600 text-center">{error}</p>
      )}
    </div>
  );
}
