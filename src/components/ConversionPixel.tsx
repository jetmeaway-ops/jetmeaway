'use client';

import { useEffect } from 'react';
import { sendGAEvent } from '@next/third-parties/google';

/**
 * Fires a Google Ads `conversion` event exactly once per booking reference.
 *
 * gtag.js itself is already loaded site-wide from src/app/layout.tsx via
 * <GoogleAnalytics gaId="AW-16538356166" />. This component just pushes
 * the event into the dataLayer on mount.
 *
 * Dedup: we key on the booking ref in sessionStorage so a page refresh,
 * back-nav, or Next.js route replay doesn't double-count the conversion
 * (Google Ads does its own dedup server-side, but belt + braces keeps
 * reporting clean).
 *
 * Configuration:
 *   AW-16538356166                    (in layout.tsx, fixed)
 *   NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL
 *     e.g. "abc123XYZ" — copy from Google Ads → Tools → Conversions →
 *     [Your conversion action] → "Use Google tag" → grab the string
 *     after the "/" in send_to: 'AW-16538356166/abc123XYZ'.
 *
 * If the env var is missing we fire the event with just the account id.
 * That still registers as a raw event (useful during setup) but Google
 * Ads won't attribute it to a specific conversion action until the label
 * is filled in.
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

    const accountId = 'AW-16538356166';
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
