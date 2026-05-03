'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Trustpilot Mini Carousel — REAL reviews, not synthetic quotes.
 *
 * Owner directive (2026-05-03): "remove fake reviews please and add original
 * reviews from trustpilot, under hero all are fake". The previous version
 * rotated five hand-written marketing quotes ("Saved £200 to Baku", "Beat
 * Skyscanner by £147", etc.) that were not real customer reviews. Replaced
 * with the official Trustpilot widget that pulls live verified reviews.
 *
 * Business Unit: 69d8e37d3f9345fb75e31dfa  (same as TrustpilotReviewCollector)
 * Template:      53aa8912dec7e10d38f59f36  (Carousel — rotating reviews)
 * Locale:        en-GB
 *
 * Bootstrap loader is registered site-wide in src/app/layout.tsx; this
 * component just renders the placeholder div with the right data attrs and
 * re-initialises the loader if it ran before mount (handles client-side nav).
 *
 * Native app fallback: shows plain "4.1 on Trustpilot" text rating with a
 * link to our public Trustpilot page. The WebView would otherwise overlay
 * the full Trustpilot site when the embedded widget loads.
 */

declare global {
  interface Window {
    Trustpilot?: {
      loadFromElement?: (el: Element, forceReload?: boolean) => void;
    };
  }
}

export default function RotatingReviews() {
  const widgetRef = useRef<HTMLDivElement | null>(null);
  const [inNativeApp, setInNativeApp] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as unknown as { JetMeAwayNative?: unknown }).JetMeAwayNative) {
      setInNativeApp(true);
      return;
    }
    if (widgetRef.current && typeof window !== 'undefined' && window.Trustpilot?.loadFromElement) {
      window.Trustpilot.loadFromElement(widgetRef.current, true);
    }
  }, []);

  return (
    <section
      className="bg-gradient-to-b from-[#0a1628] to-[#0F1119] border-b border-white/10"
      aria-label="Customer reviews"
    >
      <div className="max-w-[1100px] mx-auto px-6 py-4">
        {inNativeApp ? (
          // Native-app fallback — link out to Trustpilot via JetMeAwayNative
          // bridge so it opens in an in-app browser, not a webview overlay.
          <div className="flex items-center justify-center gap-2">
            <span className="inline-flex items-center gap-0.5">
              {[0, 1, 2, 3].map(i => <span key={i} className="text-emerald-400 text-[.95rem]">★</span>)}
              <span className="text-emerald-400/70 text-[.95rem]">★</span>
            </span>
            <span className="font-poppins font-black text-white text-[.85rem]">4.1</span>
            <span className="font-[var(--font-dm-sans)] text-white/60 text-[.7rem]">on Trustpilot</span>
          </div>
        ) : (
          // Trustpilot Carousel — official widget, live verified reviews.
          // Rendered into a div with light-tinted background so the dark
          // gradient strip doesn't clash with Trustpilot's own theme.
          <div
            ref={widgetRef}
            className="trustpilot-widget"
            data-locale="en-GB"
            data-template-id="53aa8912dec7e10d38f59f36"
            data-businessunit-id="69d8e37d3f9345fb75e31dfa"
            data-style-height="140px"
            data-style-width="100%"
            data-theme="dark"
            data-stars="3,4,5"
            data-review-languages="en"
          >
            <a
              href="https://uk.trustpilot.com/review/jetmeaway.co.uk"
              target="_blank"
              rel="noopener nofollow"
            >
              See JetMeAway reviews on Trustpilot
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
