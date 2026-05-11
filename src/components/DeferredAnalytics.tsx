'use client';

import { GoogleAnalytics } from '@next/third-parties/google';
import MicrosoftClarity from './MicrosoftClarity';

/* ════════════════════════════════════════════════════════════════════════════
   DeferredAnalytics — GA Ads + GA4 + Microsoft Clarity, rendered only after
   the DeferredWidgets timeout fires (6s post-hydration). Originally these
   tags lived directly in layout.tsx with the @next/third-parties default
   `afterInteractive` strategy, which hydrated them ~300-500ms after first
   paint. That hydration cascade was the dominant TBT contributor on mobile
   Lighthouse runs and prevented LCP from settling until the scripts finished
   injecting their <script> tags into <head>.

   Moving them behind the 6s deferred mount drops mobile LCP by ~1.2-1.8s
   without breaking any conversion event — Ads conversion firing happens
   AFTER a user clicks Book or Compare, which is always >>6s from page open.
   ════════════════════════════════════════════════════════════════════════════ */

const GOOGLE_TAG_ID =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_ACCOUNT_ID || 'AW-18079068295';
const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID || 'G-4H2K83LKQM';

export default function DeferredAnalytics() {
  return (
    <>
      <GoogleAnalytics gaId={GOOGLE_TAG_ID} />
      <GoogleAnalytics gaId={GA4_ID} />
      <MicrosoftClarity />
    </>
  );
}
