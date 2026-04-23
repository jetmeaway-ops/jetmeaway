'use client';

import { useEffect } from 'react';
import { sendGAEvent } from '@next/third-parties/google';

/**
 * Fires a Google Ads `conversion` event exactly once per booking reference.
 *
 * gtag.js itself is already loaded site-wide from src/app/layout.tsx. This
 * component just pushes the event into the dataLayer on mount.
 *
 * Dedup: we key on the booking ref in sessionStorage so a page refresh,
 * back-nav, or Next.js route replay doesn't double-count the conversion
 * (Google Ads does its own dedup server-side, but belt + braces keeps
 * reporting clean).
 *
 * Configuration (both env-var driven so we can rotate the account without
 * a code change):
 *   NEXT_PUBLIC_GOOGLE_ADS_ACCOUNT_ID       e.g. "AW-18079068295"
 *   NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL e.g. "H6OLCI6q7aAcEIfh4qxD"
 *
 * Copy both from Google Ads → Tools → Conversions → [Booking completed] →
 * "See event snippet" — the line `send_to: 'AW-XXX/YYY'` contains the
 * account id (AW-XXX) and the label (YYY).
 *
 * Fallback: if the account-id env is missing we fall back to the last-known
 * live account so existing builds still fire an event. Missing label fires
 * against the bare account id — registers as a raw event but won't attribute
 * to the conversion action.
 */
export default function ConversionPixel({
  bookingRef,
  valueGbp,
  currency = 'GBP',
}: {
  bookingRef: string;
  valueGbp: number;
  currency?: string;
}) {
  useEffect(() => {
    if (!bookingRef) return;

    // Dedup per-ref so refreshes don't re-fire
    const key = `jma_conv_${bookingRef}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      // sessionStorage can throw in private mode / when disabled.
      // Still fire — single over-count is better than under-count.
    }

    const accountId =
      process.env.NEXT_PUBLIC_GOOGLE_ADS_ACCOUNT_ID || 'AW-18079068295';
    const label = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL;
    const sendTo = label ? `${accountId}/${label}` : accountId;

    sendGAEvent('event', 'conversion', {
      send_to: sendTo,
      value: valueGbp,
      currency,
      transaction_id: bookingRef,
    });
  }, [bookingRef, valueGbp, currency]);

  return null;
}
