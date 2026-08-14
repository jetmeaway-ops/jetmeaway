/**
 * Where should a WebView navigation actually go?
 *
 * One pure function so the root shell and the stacked detail screen can never
 * drift apart, and so the rules are readable in one place.
 *
 * The important one is `push`. Tapping a hotel used to navigate the single
 * WebView away from the results, which is a full page load: the results list
 * was destroyed and coming back re-ran the whole search and lost the scroll
 * position. On the web we fixed that by opening a new tab — but
 * `target="_blank"` is a NO-OP inside react-native-webview when no
 * `onOpenWindow` handler is set (`createWebViewWithConfiguration` in
 * RNCWebViewImpl.m falls back to `[webView loadRequest:…]`, i.e. the SAME
 * WebView), and `setSupportMultipleWindows` is false on Android.
 *
 * So the app does the equivalent natively: these URLs are intercepted and
 * opened as a screen stacked ON TOP, with a native back arrow. The results
 * WebView underneath is never unloaded, so going back is instant and its
 * scroll position is simply still there — nothing to save or restore.
 *
 * Matching is on the URL rather than on `target="_blank"` deliberately: the
 * markup can change without silently breaking the app.
 *
 * Note on locales: the site resolves language from a cookie/header (see
 * src/proxy.ts), NOT from a path prefix — `/hotels/<id>` is identical in all
 * 13 languages, so these patterns need no locale handling. (Only the blog uses
 * `/de/…` style paths, and the blog is not stackable.)
 */

export const INTERNAL_HOST = 'jetmeaway.co.uk';
const INTERNAL_HOSTS = new Set([INTERNAL_HOST, `www.${INTERNAL_HOST}`]);

/**
 * Payment pages. These are forced into the system browser even though they're
 * on our own domain: Stripe Elements (Duffel flights) and LiteAPI's Payment SDK
 * (hotels) both create third-party iframes that render BLANK in WKWebView
 * regardless of sharedCookiesEnabled / thirdPartyCookiesEnabled. Customers were
 * silently blocked at the Pay step — bookings were lost on 2026-05-01/02.
 */
const CHECKOUT_PATTERNS: RegExp[] = [
  /^\/checkout(?:\/|$)/,
  /^\/hotels\/checkout(?:\/|$)/,
];

/**
 * Pages that open as a stacked screen so the list behind them stays alive.
 *   /hotels/<id>            hotel detail (NOT /hotels/checkout/<ref>)
 *   /flights/kyte/<offerId> Kyte flight booking
 *   /redirect               affiliate interstitial — it bounces straight out to
 *                           the partner, and without this the results WebView
 *                           would be left sitting on a dead interstitial page.
 */
const STACKABLE_PATTERNS: RegExp[] = [
  /^\/hotels\/(?!checkout(?:\/|$))[^/]+\/?$/,
  /^\/flights\/kyte\/[^/]+\/?$/,
  /^\/redirect\/?$/,
];

/**
 * The list pages. Only meaningful from inside a stacked screen: the detail
 * page's own "Back to search results" link points here, and following it would
 * load a SECOND copy of the results inside the stacked screen. Closing instead
 * drops the visitor back onto the live list they never left.
 */
const RESULTS_PATTERNS: RegExp[] = [/^\/hotels\/?$/, /^\/flights\/?$/];

export type NavContext = 'root' | 'stacked';

export type NavDecision =
  /** Let this WebView load it. */
  | { kind: 'allow' }
  /** Hand off to the system browser / Safari View Controller. */
  | { kind: 'external' }
  /** Open as a screen on top; the WebView underneath stays mounted. */
  | { kind: 'push'; url: string }
  /** Close the stacked screen and reveal the live list underneath. */
  | { kind: 'close' };

function match(patterns: RegExp[], pathname: string): boolean {
  return patterns.some((re) => re.test(pathname));
}

export function isInternalHost(hostname: string): boolean {
  return INTERNAL_HOSTS.has(hostname);
}

/** Exported for the stacked screen's own guard + for readability in tests. */
export function isStackablePath(pathname: string): boolean {
  return match(STACKABLE_PATTERNS, pathname);
}

/**
 * Decide what to do with a navigation.
 *
 * `context` matters: from the root shell a tap on a hotel PUSHES a screen,
 * while the same URL arriving inside an already-stacked screen is just normal
 * in-screen navigation (that screen keeps its own history and its own back
 * arrow, so we never build an unbounded pile of WebViews).
 */
export function decideNavigation(rawUrl: string, context: NavContext): NavDecision {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    // Unparseable (about:srcdoc and friends) — let the WebView deal with it.
    return { kind: 'allow' };
  }

  if (url.protocol === 'about:' || url.protocol === 'data:') return { kind: 'allow' };

  if (!isInternalHost(url.hostname)) return { kind: 'external' };

  const { pathname } = url;

  if (match(CHECKOUT_PATTERNS, pathname)) return { kind: 'external' };

  if (context === 'root') {
    if (isStackablePath(pathname)) return { kind: 'push', url: rawUrl };
    return { kind: 'allow' };
  }

  // Inside a stacked screen.
  if (match(RESULTS_PATTERNS, pathname)) return { kind: 'close' };
  return { kind: 'allow' };
}
