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

    // Defer the Trustpilot widget init until it enters the viewport.
    // 2026-06-03 bundle-diet: the previous code called loadFromElement
    // on mount, which kicked off Trustpilot's ~70KB widget script during
    // the LCP window even though the carousel sits right under the hero
    // and most mobile users never scrolled to it. IntersectionObserver
    // pushes the init to "when the user is actually going to see it",
    // which on mobile is typically several seconds after first paint —
    // outside the Lighthouse TBT window entirely.
    const el = widgetRef.current;
    if (!el || typeof window === 'undefined') return;

    let initialized = false;
    const initWidget = () => {
      if (initialized) return;
      if (window.Trustpilot?.loadFromElement) {
        initialized = true;
        window.Trustpilot.loadFromElement(el, true);
      }
    };

    // IntersectionObserver is supported everywhere we care about (iOS
    // 12.2+, Android Chrome 51+, Edge 15+). Fallback below for legacy.
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              initWidget();
              io.disconnect();
              break;
            }
          }
        },
        { rootMargin: '200px' }, // 200px lead so init starts just before view
      );
      io.observe(el);
      return () => io.disconnect();
    }

    // Legacy fallback — fire after 4s so it still loads but doesn't
    // compete with LCP. Mirrors DeferredWidgets' 6s defer pattern.
    // setTimeout used unqualified so TS doesn't narrow window to never
    // inside the IntersectionObserver-absent branch.
    const t = setTimeout(initWidget, 4000);
    return () => clearTimeout(t);
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
          // On a WHITE card with the light theme: the dark theme's deep-green
          // logo was invisible against our navy strip (2026-07-02 audit) and
          // we can't restyle inside Trustpilot's iframe, so give it a
          // background it's designed for instead.
          <div
            ref={widgetRef}
            className="trustpilot-widget bg-white rounded-2xl py-2 px-3 shadow-[0_8px_30px_rgba(0,0,0,0.25)]"
            data-locale="en-GB"
            data-template-id="53aa8912dec7e10d38f59f36"
            data-businessunit-id="69d8e37d3f9345fb75e31dfa"
            data-style-height="140px"
            data-style-width="100%"
            data-theme="light"
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
