'use client';

import Script from 'next/script';

/* ════════════════════════════════════════════════════════════════════════════
   Microsoft Clarity — free session recording + heatmaps.

   Why we need it on top of GA4:
   - GA fires one pageview per route. Our hotel checkout is a single SPA
     route with internal step state (guest → payment → done), so GA can't
     see how many users drop off between entering details and the card
     form rendering. Clarity records the whole session and lets us watch
     the actual abandonment.
   - Heatmaps show which CTAs get clicked vs scrolled past — directly
     informs CRO priorities for the hotel results + detail pages.

   Loaded via afterInteractive so it never competes with LCP. Silently
   no-ops if NEXT_PUBLIC_CLARITY_ID isn't set, so local dev doesn't ping
   the production Clarity project.

   Sign up: https://clarity.microsoft.com (free, unlimited recordings).
   Project ID lives at Settings → Setup → "Tracking code" → the string
   inside `clarity("set", ...)` and `(window, document, "clarity", ...,
   "PROJECT_ID")`. Drop it into Vercel env as NEXT_PUBLIC_CLARITY_ID
   (no quotes, no `c_` prefix — just the bare ID).
   ════════════════════════════════════════════════════════════════════════════ */

export default function MicrosoftClarity() {
  const projectId = process.env.NEXT_PUBLIC_CLARITY_ID;
  if (!projectId) return null;

  return (
    <Script
      id="ms-clarity"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
(function(c,l,a,r,i,t,y){
  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "${projectId}");
        `.trim(),
      }}
    />
  );
}
