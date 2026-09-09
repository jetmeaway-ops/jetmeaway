'use client';

/**
 * Warms the two heaviest destination routes (/hotels, /flights) during the
 * homepage's idle time, so the FIRST tap on a category isn't a cold download.
 *
 * The problem (owner report 2026-09-09): tapping Hotels or Flights the first
 * time after opening the site/app froze for 10-14s on mobile. Measured cause
 * — the tap navigates instantly (URL flips in ~95ms) but the destination is a
 * large client-only bundle (~300KB gzipped / ~1.1MB parsed) that only
 * downloads and hydrates ON click, because these routes are dynamic and the
 * client component sits behind a loading.tsx boundary (so neither automatic
 * prefetch nor router.prefetch pulls it). Second tap is cached → fast, which
 * is why it was "only the first time".
 *
 * Fix: on idle, (1) pull each route's client chunk via its own import()
 * specifier (deduped to the exact chunk the navigation needs), and
 * (2) router.prefetch the route shell/RSC. Purely additive — if anything here
 * fails or the browser lacks requestIdleCallback, the app behaves exactly as
 * before, just without the head start.
 *
 * Staggered so the two big parses never share one long task, and skipped on
 * Data Saver so we don't spend a metered user's data speculatively.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { prewarmHotelsContent } from '@/app/hotels/hotels-lazy';
import { prewarmFlightsContent } from '@/app/flights/flights-lazy';

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
};

/** Run cb when the main thread is idle; fall back to a plain timer on browsers
 *  (older iOS WKWebView) without requestIdleCallback. Returns nothing — this is
 *  best-effort chrome, there is no cleanup worth tracking. */
function onIdle(cb: () => void, fallbackMs: number) {
  const w = window as IdleWindow;
  if (typeof w.requestIdleCallback === 'function') {
    w.requestIdleCallback(cb, { timeout: fallbackMs + 1500 });
  } else {
    setTimeout(cb, fallbackMs);
  }
}

export default function RoutePrewarmer() {
  const router = useRouter();

  useEffect(() => {
    // Respect an explicit Data Saver preference — don't speculatively pull
    // ~300KB on a metered connection the user asked us to conserve.
    try {
      const conn = (navigator as unknown as { connection?: { saveData?: boolean } }).connection;
      if (conn?.saveData) return;
    } catch { /* connection API absent — proceed */ }

    let cancelled = false;
    const warm = (fn: () => Promise<unknown>, href: string) => {
      if (cancelled) return;
      try {
        fn().catch(() => {});        // download + parse the client chunk
        router.prefetch(href);        // warm the route shell / RSC
      } catch { /* never let a head-start optimisation surface an error */ }
    };

    // Hotels first (most-tapped), flights on a second idle tick so the two
    // parses don't land in one long task on a slow phone.
    onIdle(() => {
      warm(prewarmHotelsContent, '/hotels');
      onIdle(() => warm(prewarmFlightsContent, '/flights'), 600);
    }, 1200);

    return () => { cancelled = true; };
  }, [router]);

  return null;
}
