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
    const t1 = setTimeout(() => setPhase(1), 6000);
    const t2 = setTimeout(() => setPhase(2), 8000);
    const t3 = setTimeout(() => setPhase(3), 10000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
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
      {phase >= 3 && <PushNotificationPrompt />}
    </>
  );
}
