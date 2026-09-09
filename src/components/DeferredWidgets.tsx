'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const ScoutChat = dynamic(() => import('@/components/ScoutChat'), { ssr: false });
const ServiceWorkerRegistration = dynamic(() => import('@/components/ServiceWorkerRegistration'), { ssr: false });
const PushNotificationPrompt = dynamic(() => import('@/components/PushNotificationPrompt'), { ssr: false });
// Vercel Analytics moved here so its script never competes with LCP/FCP.
// PageSpeed flagged 150ms of render-blocking; Analytics was one of the
// scripts loading inside the first paint window.
const Analytics = dynamic(() => import('@vercel/analytics/react').then(m => m.Analytics), { ssr: false });
// GA Ads + GA4 + Microsoft Clarity. Folded into the deferred mount on
// 2026-05-11 — they were the dominant TBT contributor on Lighthouse mobile
// (used to render in layout.tsx with the @next/third-parties default
// `afterInteractive` strategy, which hydrated them ~300-500ms after first
// paint and kept LCP from settling). Lazy import keeps them out of the
// initial JS bundle.
const DeferredAnalytics = dynamic(() => import('@/components/DeferredAnalytics'), { ssr: false });
// Bundle-diet pass 2026-06-03: BackToTopButton + AndroidAppBanner moved
// here from layout.tsx. Both are chrome that only matters AFTER the
// user has engaged with the page.
const BackToTopButton = dynamic(() => import('@/components/BackToTopButton'), { ssr: false });
const AndroidAppBanner = dynamic(() => import('@/components/AndroidAppBanner'), { ssr: false });
// Floating, draggable soccer-ball CTA → /world-cup-2026 campaign page.
// Same drag UX as Scout/BackToTop; self-hides after the tournament and on
// the funnel/conversion routes. Promo chrome, so it lands in phase 3.
const WorldCupBall = dynamic(() => import('@/components/WorldCupBall'), { ssr: false });

/**
 * Delays mounting of non-critical widgets in three staggered phases so no
 * single render tick has to hydrate the whole pile at once.
 *
 * History:
 *   - 2026-05-11: 3000→6000ms single-shot mount (GA/Clarity moved here).
 *   - 2026-06-03 (early): added B2T + AndroidAppBanner to the same +6s tick.
 *     Lighthouse desktop TBT regressed 5.2s → 9.2s → 15.0s across runs and
 *     "Avoid long main-thread tasks" jumped to 26. Root cause: 7 dynamic
 *     mounts in one render created one enormous long task instead of
 *     several smaller ones.
 *   - 2026-06-03 (later): split into three phases so each tick only fires
 *     2–3 mounts, breaking the long task up.
 *
 * Phasing rationale (TBT is dominated by long single tasks, not total work):
 *   Phase 1 @ +6000ms — lightest stuff that's measurement-sensitive:
 *     Vercel Analytics (own SDK, ~5KB) + ServiceWorker (no UI).
 *   Phase 2 @ +8000ms — heavy analytics scripts + Scout chat:
 *     DeferredAnalytics (GA Ads + GA4 + Microsoft Clarity scripts) +
 *     ScoutChat (owner feedback 2026-06-03: chat was appearing late
 *     when paired with the slow globe; moved one phase earlier so the
 *     "Ask Scout" affordance lands within the typical 8s read window).
 *   Phase 3 @ +10000ms — UI chrome the user only engages with later:
 *     BackToTopButton (drag handlers + localStorage) +
 *     AndroidAppBanner (UA gate + path gate) +
 *     PushNotificationPrompt (user-triggered, no rush).
 *
 * All three phases still fire well before the user's real interaction
 * window (real-world scroll/click averages ~8–10s). Ads conversion + Clarity
 * session recording aren't affected because both are interaction-driven.
 */
export default function DeferredWidgets() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    // Idle-gate each phase (2026-09-09): the base delays below still schedule
    // the pile, but we only actually MOUNT a phase once the main thread is
    // idle — so GA/Clarity/Scout never hydrate in the same tick the user is
    // waiting on a category route to load (the cold first-tap freeze). The
    // requestIdleCallback timeout guarantees the phase still mounts on a
    // persistently busy page, so no tracker is ever dropped. Browsers without
    // requestIdleCallback (older iOS WKWebView) keep the exact prior behaviour
    // — mount at the base delay. Math.max guards against idle callbacks
    // resolving out of order (a late phase-1 must never unmount phase 3).
    type IdleWindow = Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    const w = window as IdleWindow;
    const ric = typeof w.requestIdleCallback === 'function' ? w.requestIdleCallback.bind(w) : null;
    const advance = (n: number) => setPhase((p) => Math.max(p, n));
    const schedule = (n: number, delay: number) =>
      setTimeout(() => {
        if (ric) ric(() => advance(n), { timeout: 4000 });
        else advance(n);
      }, delay);
    const timers = [schedule(1, 6000), schedule(2, 8000), schedule(3, 10000)];
    return () => timers.forEach(clearTimeout);
  }, []);

  if (phase === 0) return null;

  return (
    <>
      {/* Phase 1 — lightest, measurement-sensitive */}
      {phase >= 1 && <Analytics />}
      {phase >= 1 && <ServiceWorkerRegistration />}
      {/* Phase 2 — heavy analytics scripts + Scout chat */}
      {phase >= 2 && <DeferredAnalytics />}
      {phase >= 2 && <ScoutChat />}
      {/* Phase 3 — UI chrome */}
      {phase >= 3 && <BackToTopButton />}
      {phase >= 3 && <AndroidAppBanner />}
      {phase >= 3 && <WorldCupBall />}
      {phase >= 3 && <PushNotificationPrompt />}
    </>
  );
}
