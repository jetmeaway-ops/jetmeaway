'use client';

/**
 * Binds the app's push token to the signed-in account — from the one place
 * that can.
 *
 * The mobile shell captures an Expo push token and used to POST it to
 * /api/push-token from React Native. That request carries NO session cookie
 * (React Native's fetch and the WKWebView keep separate cookie jars — the
 * same split social sign-in works around), so the server could never write
 * `push:by-email:<email>`, and every account-targeted push went to nobody.
 * The saved-search push has been silently sending nothing since it shipped
 * because of exactly this.
 *
 * The fix is to make the WEB do the registering: this component runs inside
 * the WebView, asks the native shell for its token over the bridge, and POSTs
 * it same-origin — so the session cookie rides along and the server finally
 * learns whose device this is. Outside the app, `window.JetMeAwayNative` is
 * undefined and this renders nothing and does nothing.
 *
 * Re-binds at most once a day per token (localStorage), and re-runs on
 * sign-in changes naturally: it fires on every full page load, and the
 * server moves a token between accounts when the session email changes.
 */
import { useEffect } from 'react';

type NativeBridge = {
  getPushToken?: () => Promise<{ token: string | null; platform?: string }>;
};

const BOUND_KEY = 'jma:push:boundAt';
const BIND_EVERY_MS = 24 * 60 * 60 * 1000;

export default function NativePushBinder() {
  useEffect(() => {
    const native = (window as unknown as { JetMeAwayNative?: NativeBridge }).JetMeAwayNative;
    // Older app builds have the bridge but not getPushToken — nothing to do
    // there; the 1.3.6+ shell is the one that can hand the token over.
    if (!native?.getPushToken) return;

    let cancelled = false;
    (async () => {
      try {
        const last = (() => {
          try { return JSON.parse(localStorage.getItem(BOUND_KEY) || 'null'); } catch { return null; }
        })() as { token?: string; at?: number } | null;

        const { token, platform } = await native.getPushToken!();
        if (cancelled || !token) return;
        if (last && last.token === token && Date.now() - (last.at || 0) < BIND_EVERY_MS) return;

        const res = await fetch('/api/push-token', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          // Same-origin from inside the WebView: the session cookie is
          // attached automatically. That cookie IS the point of this file.
          body: JSON.stringify({ token, platform: platform || 'unknown' }),
        });
        if (res.ok) {
          try { localStorage.setItem(BOUND_KEY, JSON.stringify({ token, at: Date.now() })); } catch { /* private mode */ }
        }
      } catch {
        // Binding is an optimisation — never let it surface to the page.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return null;
}
