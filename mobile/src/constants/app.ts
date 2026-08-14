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

/**
 * Keep in sync with `expo.version` in app.json.
 *
 * 2026-08-14: this said 1.0.6 while the App Store was already on 1.3.2
 * approved (1.3.3 closed). Apple rejected build 52 for exactly that —
 * ITMS-90062: CFBundleShortVersionString must be HIGHER than the last approved
 * version. `eas.json` sets `appVersionSource: "remote"`, so EAS owns the build
 * NUMBER (buildNumber/versionCode auto-increment) but the version STRING still
 * comes from app.json — which is why the local drift reached Apple.
 */
export const APP_VERSION = '1.3.4';

export const APP_USER_AGENT = `JetMeAway/${APP_VERSION} Mobile`;
