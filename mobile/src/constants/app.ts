/**
 * App identity, in one place.
 *
 * This used to be written out by hand in three files (App.tsx's WebView UA,
 * the stacked screen's UA, and `appVersion` in the injected bridge) and had
 * already drifted — app.json said 1.0.6 while the UA still claimed 1.0.5.
 *
 * The UA matters: the web detects the app shell with `/JetMeAway\/[\d.]+\s+Mobile/`
 * (see src/components/AndroidAppBanner.tsx and src/lib/new-tab.ts) to hide
 * "download the app" prompts and to keep hotel links same-tab so the native
 * stacked screen can intercept them. Every WebView in the app must send it, or
 * a stacked screen would behave like a plain browser.
 */

/** Keep in sync with `expo.version` in app.json. */
export const APP_VERSION = '1.0.6';

export const APP_USER_AGENT = `JetMeAway/${APP_VERSION} Mobile`;
