'use client';

import Script from 'next/script';
import { GoogleAnalytics } from '@next/third-parties/google';
import MicrosoftClarity from './MicrosoftClarity';

/* ════════════════════════════════════════════════════════════════════════════
   DeferredAnalytics — Google Ads + GA4 + Microsoft Clarity, rendered only after
   the DeferredWidgets timeout fires (6s post-hydration). Originally these
   tags lived directly in layout.tsx with the @next/third-parties default
   `afterInteractive` strategy, which hydrated them ~300-500ms after first
   paint. That hydration cascade was the dominant TBT contributor on mobile
   Lighthouse runs and prevented LCP from settling until the scripts finished
   injecting their <script> tags into <head>.

   Moving them behind the 6s deferred mount drops mobile LCP by ~1.2-1.8s
   without breaking any conversion event — Ads conversion firing happens
   AFTER a user clicks Book or Compare, which is always >>6s from page open.

   ── 2026-08-18: GA4 was recording NOTHING in production ────────────────────
   This file used to render <GoogleAnalytics> TWICE — once for the Ads tag,
   once for GA4:

       <GoogleAnalytics gaId={GOOGLE_TAG_ID} />   // AW-…
       <GoogleAnalytics gaId={GA4_ID} />          // G-…

   That silently dropped GA4. `@next/third-parties/google` renders its two
   <Script> elements with HARDCODED ids — `_next-ga-init` and `_next-ga`
   (see node_modules/@next/third-parties/dist/google/ga.js) — and next/script
   de-duplicates by id. So the second copy never executed, which means
   `gtag('config', 'G-…')` never ran. gtag.js loaded and window.gtag existed,
   Ads fired normally because it was rendered first, and GA4 sent zero
   /g/collect hits. Confirmed live on prod 2026-08-14: 45s on the page, GA4
   library present, not a single collect request.

   Fix: keep ONE <GoogleAnalytics> — it loads gtag.js, configures the Ads tag,
   and (importantly) initialises the module state that `sendGAEvent` needs, so
   ConversionPixel keeps working — then add the GA4 `config` ourselves.

   The snippet below re-declares dataLayer/gtag rather than assuming load
   order. That is deliberate and is exactly how Google's own snippet behaves:
   gtag() only pushes onto dataLayer, and gtag.js replays whatever is already
   queued when it loads. So this is correct whether it runs before or after
   the library.
   ════════════════════════════════════════════════════════════════════════════ */

const GOOGLE_TAG_ID =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_ACCOUNT_ID || 'AW-18079068295';
const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID || 'G-4H2K83LKQM';

export default function DeferredAnalytics() {
  return (
    <>
      <GoogleAnalytics gaId={GOOGLE_TAG_ID} />
      <Script id="ga4-config">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA4_ID}');`}
      </Script>
      <MicrosoftClarity />
    </>
  );
}
