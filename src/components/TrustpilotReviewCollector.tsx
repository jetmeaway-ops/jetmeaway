'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Trustpilot "Review Collector" widget — lets visitors leave a public
 * review straight from the site. The bootstrap loader is registered
 * site-wide in src/app/layout.tsx with lazyOnload so first paint is
 * never blocked by Trustpilot's CDN.
 *
 * Business Unit: 69d8e37d3f9345fb75e31dfa
 * Template:      56278e9abfbbba0bdcd568bc (Review Collector)
 * Token:         565fbeaa-7dba-4328-8878-8da0cafd698c
 *
 * Global types for window.Trustpilot come from Trustpilot's own SDK
 * at runtime — we declare the minimum we need here to avoid pulling
 * in their types package.
 */

declare global {
  interface Window {
    Trustpilot?: {
      loadFromElement?: (el: Element, forceReload?: boolean) => void;
    };
  }
}

export default function TrustpilotReviewCollector() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inNativeApp, setInNativeApp] = useState(false);

  useEffect(() => {
    // Skip the embedded Trustpilot widget in the native app — tapping it
    // pops a full-screen widget.trustpilot.com overlay because the WebView
    // externalises non-jetmeaway domains. The badge in RotatingReviews
    // still surfaces the "4.1" trust signal as plain text.
    if (typeof window !== 'undefined' && (window as any).JetMeAwayNative) {
      setInNativeApp(true);
      return;
    }
    // If the Trustpilot loader has already executed by the time this
    // component mounts, manually re-init so it picks up our widget div.
    // Without this, client-side navigation between pages can leave the
    // widget as a bare anchor tag until a full reload.
    if (ref.current && typeof window !== 'undefined' && window.Trustpilot?.loadFromElement) {
      window.Trustpilot.loadFromElement(ref.current, true);
    }
  }, []);

  if (inNativeApp) return null;

  return (
    <div
      ref={ref}
      className="trustpilot-widget"
      data-locale="en-GB"
      data-template-id="56278e9abfbbba0bdcd568bc"
      data-businessunit-id="69d8e37d3f9345fb75e31dfa"
      data-style-height="52px"
      data-style-width="100%"
      data-token="565fbeaa-7dba-4328-8878-8da0cafd698c"
    >
      <a
        href="https://www.trustpilot.com/review/jetmeaway.co.uk"
        target="_blank"
        rel="noopener noreferrer"
      >
        Trustpilot
      </a>
    </div>
  );
}
