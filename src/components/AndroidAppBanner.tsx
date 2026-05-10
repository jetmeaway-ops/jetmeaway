'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Android smart-banner equivalent.
 *
 * iOS gets the native Smart App Banner via `metadata.itunes` in
 * src/app/layout.tsx. Android Chrome has no native equivalent — this
 * component fills the gap with a slim dismissible bottom bar that fires
 * an Android intent to open the JetMeAway app at the same URL the user
 * is currently on, falling back to the Play Store listing if the app
 * isn't installed.
 *
 * Why a separate component (vs trying to deep-link from the existing
 * Footer / Hero "Get the app" tiles): those tiles always navigate to
 * the Play Store. A user who already has the app installed gets bounced
 * out to the store and back — bad UX. The intent:// URL below routes to
 * the app first (Android App Links + assetlinks.json verified) and only
 * falls through to the store if the app isn't found.
 *
 * Banner visibility rules:
 *  - Android UA only (iOS gets metadata.itunes, desktop gets nothing).
 *  - Hidden when the page is already loaded inside the JetMeAway
 *    WebView (UA contains "JetMeAway/x.x.x Mobile").
 *  - Hidden on /admin/*, /checkout/*, /api/* — never block sensitive
 *    flows with promo chrome.
 *  - Dismissible. Dismiss state stored in localStorage with a 14-day
 *    TTL so the banner can come back after a fortnight without
 *    annoying the user every visit.
 */

const DISMISS_KEY = 'jma-android-banner-dismissed-at';
const DISMISS_WINDOW_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const PACKAGE_NAME = 'uk.co.jetmeaway.app';
const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${PACKAGE_NAME}`;
const APP_UA_SIGNATURE = /JetMeAway\/[\d.]+\s+Mobile/;

const HIDDEN_PATH_PREFIXES = ['/admin', '/checkout', '/api'];

export default function AndroidAppBanner() {
  const pathname = usePathname() || '/';
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Path gate
    if (HIDDEN_PATH_PREFIXES.some((p) => pathname.startsWith(p))) return;

    // UA gate — Android Chrome only, skip in-app WebView
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
    if (!ua) return;
    if (APP_UA_SIGNATURE.test(ua)) return; // already in JetMeAway app
    if (!/Android/i.test(ua)) return; // not Android — bail
    // Detect Chrome / Samsung Internet / Edge mobile (the browsers that
    // actually honour intent:// URLs). Firefox Mobile is excluded because
    // its intent handling is unreliable.
    if (!/Chrome|SamsungBrowser|EdgA/i.test(ua)) return;

    // Dismiss-window gate
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (raw) {
        const dismissedAt = Number(raw);
        if (
          Number.isFinite(dismissedAt) &&
          Date.now() - dismissedAt < DISMISS_WINDOW_MS
        ) {
          return;
        }
      }
    } catch {
      // localStorage unavailable (privacy mode) — show banner anyway
    }

    setVisible(true);
  }, [pathname]);

  if (!visible) return null;

  // Build the intent:// URL with the current path + query string.
  // S.browser_fallback_url handles the "app not installed" case by
  // sending the user to the Play Store listing.
  const target = encodeURIComponent(`https://jetmeaway.co.uk${pathname}`);
  const fallback = encodeURIComponent(PLAY_STORE_URL);
  const intentUrl =
    `intent://jetmeaway.co.uk${pathname}` +
    `#Intent;scheme=https;package=${PACKAGE_NAME};` +
    `S.browser_fallback_url=${fallback};end`;

  const onDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  return (
    <div
      role="complementary"
      aria-label="Open JetMeAway in the Android app"
      className="fixed inset-x-0 bottom-0 z-[150] bg-[#0F1119] border-t border-white/10 shadow-[0_-4px_24px_rgba(0,0,0,0.25)] safe-area-pb"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      data-target={target}
    >
      <div className="max-w-[1100px] mx-auto px-4 py-2.5 flex items-center gap-3">
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss app banner"
          className="text-white/60 hover:text-white/90 text-lg leading-none px-1.5 -ml-1.5 transition-colors"
        >
          ×
        </button>

        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <span
            aria-hidden="true"
            className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0"
          >
            <i className="fa-brands fa-google-play text-white text-[1rem]" />
          </span>
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-white text-[.82rem] font-bold truncate">
              JetMeAway for Android
            </span>
            <span className="text-white/65 text-[.68rem] font-medium truncate">
              Faster booking, offline trips, £5 cashback on 2nd booking.
            </span>
          </div>
        </div>

        <a
          href={intentUrl}
          aria-label="Open JetMeAway app"
          className="shrink-0 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#0066FF] text-white text-[.78rem] font-bold hover:bg-[#0052CC] transition-colors"
        >
          Open
        </a>
      </div>
    </div>
  );
}
