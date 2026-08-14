/**
 * Hotel detail links open in a NEW TAB on the web.
 *
 * WHY (measured on production, 2026-08-14): tapping a hotel used to be a
 * same-tab `<a href>` — i.e. a FULL page reload. That did two fatal things:
 *   1. wiped JS memory, so any in-memory results cache was gone; and
 *   2. re-rendered /hotels — which is `ssr:false` (see hotels-lazy.tsx) — as a
 *      zero-height skeleton on Back, so `window.scrollTo(savedY)` clamped to
 *      the top and the visitor landed back at hotel #1.
 * A real Back also arrived with navigation type "navigate" (not
 * "back_forward"), so gating a restore on that never even fired.
 *
 * Opening the detail in a new tab sidesteps all of it: the results tab is
 * never unloaded, so there is no Back to get wrong and no scroll to restore.
 *
 * NOT in the native app shell. react-native-webview loads a `target="_blank"`
 * link into the SAME WebView when no `onOpenWindow` handler is set — see
 * `createWebViewWithConfiguration` in RNCWebViewImpl.m, which falls back to
 * `[webView loadRequest:...]` — and Android's `setSupportMultipleWindows` is
 * false in mobile/App.tsx. So the attribute buys nothing there. The app gets a
 * stacked native detail screen instead (separate change); keeping its links
 * same-tab keeps that native URL interception unambiguous.
 */

/** UA the native shell sends — see `applicationNameForUserAgent` in mobile/App.tsx. */
const APP_UA_SIGNATURE = /JetMeAway\/[\d.]+\s+Mobile/;

/**
 * Query flag stamped onto a detail URL that we opened in a new tab, so the
 * detail page knows it can close itself instead of re-running the search.
 * `rel="noopener"` nulls `window.opener`, and `history.length` is unreliable
 * (a visitor landing straight from Google also has one entry), so the flag is
 * the only deterministic signal.
 */
export const NEW_TAB_PARAM = 'nt';

/** True when the page is running inside the JetMeAway native WebView shell. */
export function isNativeAppShell(): boolean {
  if (typeof window === 'undefined') return false;
  if ((window as unknown as { JetMeAwayNative?: unknown }).JetMeAwayNative) return true;
  return APP_UA_SIGNATURE.test(navigator?.userAgent || '');
}

/** True when hotel detail links should open in a new browser tab. */
export function opensInNewTab(): boolean {
  if (typeof window === 'undefined') return false;
  return !isNativeAppShell();
}

/**
 * Spread onto an `<a>` to send it to a new tab. Returns nothing on the server
 * and inside the app, so those links stay same-tab.
 */
export function newTabProps(): { target?: '_blank'; rel?: string } {
  return opensInNewTab() ? { target: '_blank', rel: 'noopener' } : {};
}

/** Same as `newTabProps`, as an attribute string for raw-HTML popups (Leaflet). */
export function newTabAttrs(): string {
  return opensInNewTab() ? ' target="_blank" rel="noopener"' : '';
}
