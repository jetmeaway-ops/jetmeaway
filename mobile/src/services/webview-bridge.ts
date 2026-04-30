/**
 * WebView ↔ Native bridge. Injected on every page load.
 *
 * Exposes `window.JetMeAwayNative` so the React web app can call into the
 * native shell for capabilities the web alone cannot deliver:
 *
 *   - JetMeAwayNative.share({ title, text, url })  → native share sheet
 *   - JetMeAwayNative.saveBooking(payload)         → AsyncStorage offline copy
 *   - JetMeAwayNative.requestLocation()            → resolves to { lat, lng }
 *   - JetMeAwayNative.haptic('light' | 'medium' | 'heavy' | 'success')
 *
 * The web detects the bridge via `if (window.JetMeAwayNative)` — when the
 * site is loaded outside the app (regular browser), the bridge is undefined
 * and the web falls back to its own implementations (web Share API, etc.).
 *
 * The native side listens to messages via `WebView.onMessage` and dispatches
 * by `type`. Replies (e.g. for requestLocation) are sent back via
 * webviewRef.injectJavaScript(`window.__JMA_RESOLVE__('${id}', ${json})`).
 */

export const INJECTED_BRIDGE = `
(function () {
  if (window.JetMeAwayNative) return;

  var pending = {};
  var nextId = 1;

  function callNative(type, payload) {
    return new Promise(function (resolve, reject) {
      var id = String(nextId++);
      pending[id] = { resolve: resolve, reject: reject };
      try {
        window.ReactNativeWebView.postMessage(JSON.stringify({ id: id, type: type, payload: payload || {} }));
      } catch (err) {
        delete pending[id];
        reject(err);
      }
    });
  }

  window.__JMA_RESOLVE__ = function (id, value) {
    var p = pending[id];
    if (!p) return;
    delete pending[id];
    p.resolve(value);
  };

  window.__JMA_REJECT__ = function (id, reason) {
    var p = pending[id];
    if (!p) return;
    delete pending[id];
    p.reject(new Error(reason || 'Rejected'));
  };

  window.JetMeAwayNative = {
    isNative: true,
    platform: 'mobile',
    share: function (opts) { return callNative('share', opts); },
    saveBooking: function (payload) { return callNative('saveBooking', payload); },
    requestLocation: function () { return callNative('requestLocation'); },
    haptic: function (style) { return callNative('haptic', { style: style || 'light' }); },
    // ── Account / sign-in ─────────────────────────────────────────────
    // signInWithApple() / signInWithGoogle() trigger the native flow,
    // POST the resulting ID token to /api/account/social-signin, set the
    // session cookie (shared with this WebView via sharedCookiesEnabled),
    // and resolve to { ok, email }. Web pages don't call the cookie API
    // directly — they trust that a 200 from /api/account/me means signed in.
    signInWithApple: function () { return callNative('signInWithApple'); },
    signInWithGoogle: function () { return callNative('signInWithGoogle'); },
    signOut: function () { return callNative('signOut'); },
    appVersion: '1.0.5',
  };

  // Dispatch a 'jetmeaway-native-ready' event so the web can react if it
  // wants to (e.g. show a "Save to phone" button on the success page).
  try {
    window.dispatchEvent(new Event('jetmeaway-native-ready'));
  } catch (_) {}

  true; // required by react-native-webview injectedJavaScript
})();
true;
`;

export type NativeMessageType =
  | 'share'
  | 'saveBooking'
  | 'requestLocation'
  | 'haptic'
  | 'signInWithApple'
  | 'signInWithGoogle'
  | 'signOut';

export type NativeMessage = {
  id?: string;
  type: NativeMessageType;
  payload?: unknown;
};

const VALID_TYPES: ReadonlySet<NativeMessageType> = new Set([
  'share',
  'saveBooking',
  'requestLocation',
  'haptic',
  'signInWithApple',
  'signInWithGoogle',
  'signOut',
]);

export function parseMessage(raw: string): NativeMessage | null {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const t = (parsed as Record<string, unknown>).type;
    if (typeof t !== 'string' || !VALID_TYPES.has(t as NativeMessageType)) return null;
    return parsed as NativeMessage;
  } catch {
    return null;
  }
}
