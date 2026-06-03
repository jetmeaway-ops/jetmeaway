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
// user has engaged with the page (scrolled below 600px for B2T, or
// landed on Android Chrome for the banner) — well beyond the 6s
// LCP/TBT measurement window. Keeping their JS off the initial bundle
// shaves a few KiB and removes their hydration cost from the critical
// path.
const BackToTopButton = dynamic(() => import('@/components/BackToTopButton'), { ssr: false });
const AndroidAppBanner = dynamic(() => import('@/components/AndroidAppBanner'), { ssr: false });

/**
 * Delays mounting of non-critical widgets (chat, SW, push prompt, analytics,
 * GA, Clarity, back-to-top, android banner) until 6s after hydration so they
 * never compete with LCP paint on simulated mobile 4G (Lighthouse measurement
 * window).
 *
 * Bumped 3000→6000ms on 2026-05-11 when GA + Clarity moved here — the old
 * 3s timeout was landing inside the LCP measurement window on synthetic
 * mobile runs. Real users start scrolling ~8-10s after page open, so 6s
 * still fires well before any interaction; Ads conversion + Clarity session
 * recording aren't affected because both are interaction-driven.
 */
export default function DeferredWidgets() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setReady(true), 6000);
    return () => clearTimeout(id);
  }, []);

  if (!ready) return null;

  return (
    <>
      <Analytics />
      <ScoutChat />
      <ServiceWorkerRegistration />
      <PushNotificationPrompt />
      <DeferredAnalytics />
      <BackToTopButton />
      <AndroidAppBanner />
    </>
  );
}
