import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { WebView, WebViewMessageEvent, WebViewNavigation } from 'react-native-webview';
import * as WebBrowser from 'expo-web-browser';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';

import { APP_USER_AGENT } from './src/constants/app';
import { Colors } from './src/constants/colors';
import { registerForPushNotifications, syncPushTokenToBackend, getStoredPushToken } from './src/services/push';
import * as Notifications from 'expo-notifications';
import { saveBooking, parseBookingMessage } from './src/services/offline-bookings';
import { INJECTED_BRIDGE, parseMessage } from './src/services/webview-bridge';
import { MyTripsModal } from './src/screens/MyTripsModal';
import StackedWebViewScreen, { stackedBackHandler } from './src/screens/StackedWebViewScreen';
import { decideNavigation } from './src/lib/webview-routing';
import { signInWithApple, signInWithGoogle, signOut } from './src/services/auth';
import { recordSession, maybeReviewAfterEngagement, reviewAfterBooking } from './src/services/review';

const HOME_URL = 'https://jetmeaway.co.uk/';
const INTERNAL_HOST = 'jetmeaway.co.uk';
const INTERNAL_HOSTS = new Set([INTERNAL_HOST, `www.${INTERNAL_HOST}`]);

/** Either WebView the bridge can be talking to — the shell or a stacked screen. */
type WebViewRef = React.RefObject<WebView | null>;

/**
 * If the app was launched via a universal/app link to jetmeaway.co.uk,
 * return the path-and-query so the WebView can navigate there instead of
 * starting at HOME_URL. Returns null for plain app launches.
 */
function pathFromInboundUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!INTERNAL_HOSTS.has(u.hostname)) return null;
    return `${u.pathname}${u.search}${u.hash}` || '/';
  } catch {
    return null;
  }
}

/**
 * JetMeAway mobile shell — full-screen WebView over the production site,
 * augmented with native capabilities (push, offline bookings, share, location,
 * haptics) so it clears App Store Guideline 4.2 ("Minimum Functionality").
 *
 * The WebView still drives the entire UX. The native side adds:
 *   - Push opt-in + token capture on first launch
 *   - Local AsyncStorage of booking confirmations for offline access
 *   - Native share sheet (iOS UIActivityViewController, Android Intent)
 *   - Location permission + lat/lng resolve for the hotels destination prefill
 *   - Haptic feedback on key web events
 *   - Floating "My Trips" button → MyTripsModal
 *
 * Web triggers these by calling `window.JetMeAwayNative.<method>(...)`. See
 * src/services/webview-bridge.ts for the JavaScript that gets injected.
 */
export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular: require('./assets/fonts/Poppins_400Regular.ttf'),
    Poppins_600SemiBold: require('./assets/fonts/Poppins_600SemiBold.ttf'),
    Poppins_700Bold: require('./assets/fonts/Poppins_700Bold.ttf'),
    Poppins_800ExtraBold: require('./assets/fonts/Poppins_800ExtraBold.ttf'),
    Poppins_900Black: require('./assets/fonts/Poppins_900Black.ttf'),
  });

  const webviewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [hasFirstLoaded, setHasFirstLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [tripsVisible, setTripsVisible] = useState(false);
  const [initialUrl, setInitialUrl] = useState<string>(HOME_URL);

  /**
   * URL of the screen stacked on top of the shell, if any (hotel detail, Kyte
   * booking, affiliate interstitial). While this is set the shell's WebView
   * stays mounted and untouched underneath — that is the whole point: closing
   * the stacked screen returns the visitor to their results with the scroll
   * position and filters simply still there, instead of re-running the search.
   */
  const [stackedUrl, setStackedUrl] = useState<string | null>(null);

  /**
   * Whether the shell has any page under it yet. Read inside
   * `onShouldStartLoadWithRequest`, so it's a ref rather than state — the
   * callback must see the current value without being rebuilt.
   *
   * Guards a cold start straight into a detail page: a universal link or push
   * notification to /hotels/<id> makes that URL the shell's FIRST load, and
   * stacking a screen over a shell that never loaded anything would leave a
   * blank page behind it. In that case there is no results list to protect
   * either, so the detail simply loads in the shell as it always did.
   */
  const hasLoadedOnceRef = useRef(false);

  // Review-prompt scheduling (see src/services/review.ts). We ask a RETURNING
  // user for a rating a short while after first content load — never at cold
  // launch — and only once per app process.
  const reviewScheduledRef = useRef(false);
  const reviewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Count this session for the review cadence; clear the pending timer on exit.
  useEffect(() => {
    recordSession();
    return () => {
      if (reviewTimerRef.current) clearTimeout(reviewTimerRef.current);
    };
  }, []);

  // Push opt-in on first launch — fire-and-forget. We don't block the UI on it.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await registerForPushNotifications();
      if (cancelled || !token) return;
      await syncPushTokenToBackend(token);
    })();
    return () => { cancelled = true; };
  }, []);

  // A tapped notification must OPEN what it is about. Until 1.3.6 no listener
  // existed, so a tap just foregrounded the app wherever it last was — which
  // is why every fact had to live in the push body. The push's data.url names
  // a path on our site; anything else is ignored (a push is still input from
  // outside — never navigate to a foreign origin because a payload asked).
  useEffect(() => {
    const openFromNotification = (data: unknown) => {
      const raw = (data as { url?: unknown })?.url;
      let path = '/account/bookings';
      if (typeof raw === 'string' && raw) {
        const fromUrl = pathFromInboundUrl(raw);
        if (fromUrl) path = fromUrl;
        else if (raw.startsWith('/') && !raw.startsWith('//')) path = raw;
      }
      setStackedUrl(null);
      const safe = path.replace(/'/g, "\\'");
      if (webviewRef.current) {
        webviewRef.current.injectJavaScript(`window.location.href = 'https://${INTERNAL_HOST}${safe}'; true;`);
      } else {
        setInitialUrl(`https://${INTERNAL_HOST}${path}`);
      }
    };
    // Cold start: the tap that LAUNCHED us fires no event — it is fetched.
    (async () => {
      try {
        const last = await Notifications.getLastNotificationResponseAsync();
        if (last) openFromNotification(last.notification.request.content.data);
      } catch { /* no notification module on this platform build */ }
    })();
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      openFromNotification(response.notification.request.content.data);
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Universal/app links — if the OS launched us with a jetmeaway.co.uk URL,
  // navigate the WebView there. Magic-link emails, push-notification taps,
  // and links shared from other apps all flow through this path.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const launchUrl = await Linking.getInitialURL();
        if (cancelled) return;
        const path = pathFromInboundUrl(launchUrl);
        if (path) setInitialUrl(`https://${INTERNAL_HOST}${path}`);
      } catch { /* fall back to HOME_URL */ }
    })();
    const sub = Linking.addEventListener('url', (event) => {
      const path = pathFromInboundUrl(event.url);
      if (!path || !webviewRef.current) return;
      // An inbound link is an explicit "take me here" — close any stacked
      // screen first, or the destination would load hidden behind it.
      setStackedUrl(null);
      const safe = path.replace(/'/g, "\\'");
      webviewRef.current.injectJavaScript(`window.location.href = 'https://${INTERNAL_HOST}${safe}'; true;`);
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  // Android hardware back → stacked screen first, then WebView back, then exit.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      // A stacked screen owns Back while it's open: it walks its own history
      // and only closes once there's nothing left to go back to.
      if (stackedUrl && stackedBackHandler.current) {
        stackedBackHandler.current();
        return true;
      }
      if (canGoBack && webviewRef.current) {
        webviewRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [canGoBack, stackedUrl]);

  const onNavigationStateChange = useCallback((nav: WebViewNavigation) => {
    setCanGoBack(nav.canGoBack);
  }, []);

  /**
   * Hand a URL to the system browser / Safari View Controller. Used for
   * affiliate domains (so partners can run their own Stripe / auth flows) and
   * for our own checkout pages — see the `external` rules in
   * src/lib/webview-routing.ts for why checkout can't stay in the WebView.
   *
   * NOTE (2026-05-03): we deliberately do NOT redirect the WebView anywhere
   * once the SVC closes. We used to send it to /account/bookings, which broke
   * decline-and-retry — a customer with a declined card would close the SVC to
   * try again and land on /account/bookings, losing their search and booking
   * context. Leaving the WebView on whichever page launched the SVC keeps retry
   * one tap away, and on success the SVC's own /success page is what they read.
   */
  const openExternally = useCallback((url: string) => {
    WebBrowser.openBrowserAsync(url).catch(() => Linking.openURL(url));
  }, []);

  /**
   * Root shell navigation. Rules live in src/lib/webview-routing.ts so this and
   * the stacked screen can't drift apart.
   *
   * The `push` case is the fix for the results-page problem: a hotel tap no
   * longer navigates this WebView at all, so the list is never destroyed.
   */
  const onShouldStartLoadWithRequest = useCallback(
    (req: { url: string }) => {
      const decision = decideNavigation(req.url, 'root');
      if (decision.kind === 'external') {
        openExternally(req.url);
        return false;
      }
      if (decision.kind === 'push') {
        // Cold start straight into a detail page — nothing to stack over, and
        // no results list to protect. Let the shell load it normally.
        if (!hasLoadedOnceRef.current) return true;
        setStackedUrl(decision.url);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        return false;
      }
      return true;
    },
    [openExternally],
  );

  /**
   * Navigation from inside a stacked screen. Same external/checkout rules, plus
   * one extra: the detail page's own "Back to search results" link would load a
   * SECOND copy of the results inside this screen, so following it closes the
   * screen instead and reveals the live list that was there all along.
   */
  const onStackedShouldStartLoadWithRequest = useCallback(
    (req: { url: string }) => {
      const decision = decideNavigation(req.url, 'stacked');
      if (decision.kind === 'external') {
        openExternally(req.url);
        return false;
      }
      if (decision.kind === 'close') {
        setStackedUrl(null);
        return false;
      }
      return true;
    },
    [openExternally],
  );

  /**
   * Resolve a pending bridge call by injecting a script that calls back into
   * the web's __JMA_RESOLVE__ function.
   *
   * The reply must go back to the WebView that ASKED — a share or sign-in
   * started from a stacked hotel detail page has its pending promise in that
   * WebView, not in the shell — so the source ref travels with the call.
   */
  const resolveBridge = useCallback((ref: WebViewRef, id: string, value: unknown) => {
    if (!ref.current || !id) return;
    const json = JSON.stringify(value).replace(/'/g, "\\'");
    ref.current.injectJavaScript(`window.__JMA_RESOLVE__ && window.__JMA_RESOLVE__('${id}', ${json}); true;`);
  }, []);

  const rejectBridge = useCallback((ref: WebViewRef, id: string, reason: string) => {
    if (!ref.current || !id) return;
    const safe = reason.replace(/'/g, "\\'").slice(0, 200);
    ref.current.injectJavaScript(`window.__JMA_REJECT__ && window.__JMA_REJECT__('${id}', '${safe}'); true;`);
  }, []);

  const handleMessage = useCallback(async (event: WebViewMessageEvent, source: WebViewRef) => {
    const msg = parseMessage(event.nativeEvent.data);
    if (!msg) return;
    const id = msg.id ?? '';
    const resolve = (value: unknown) => resolveBridge(source, id, value);
    const reject = (reason: string) => rejectBridge(source, id, reason);

    try {
      if (msg.type === 'getPushToken') {
        // Stored token first; if the user only now grants permission, register
        // on the spot so the very first ask can still succeed.
        const token = (await getStoredPushToken()) ?? (await registerForPushNotifications());
        resolve({ token, platform: Platform.OS });
        return;
      }

      if (msg.type === 'share') {
        const p = (msg.payload ?? {}) as { title?: string; text?: string; url?: string };
        await Share.share({
          title: typeof p.title === 'string' ? p.title : 'JetMeAway',
          message: [p.text, p.url].filter(Boolean).join(' — ') || 'JetMeAway',
          url: typeof p.url === 'string' ? p.url : undefined,
        });
        resolve({ ok: true });
        return;
      }

      if (msg.type === 'saveBooking') {
        const booking = parseBookingMessage(msg.payload);
        if (!booking) {
          reject('Invalid booking payload');
          return;
        }
        await saveBooking(booking);
        resolve({ ok: true, savedAt: Date.now() });
        // A confirmed booking is the strongest positive moment — ask for a
        // review (rate-limited in review.ts; the OS no-ops if already rated
        // or the yearly budget is spent).
        void reviewAfterBooking();
        return;
      }

      if (msg.type === 'requestLocation') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          reject('Permission denied');
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        return;
      }

      if (msg.type === 'haptic') {
        const style = (msg.payload as { style?: string })?.style ?? 'light';
        const style2impact: Record<string, Haptics.ImpactFeedbackStyle> = {
          light: Haptics.ImpactFeedbackStyle.Light,
          medium: Haptics.ImpactFeedbackStyle.Medium,
          heavy: Haptics.ImpactFeedbackStyle.Heavy,
        };
        if (style === 'success') {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          await Haptics.impactAsync(style2impact[style] ?? Haptics.ImpactFeedbackStyle.Light);
        }
        resolve({ ok: true });
        return;
      }

      if (msg.type === 'signInWithApple') {
        const result = await signInWithApple();
        if (result.ok) {
          // Hand the raw ID token to the WebView. The web side POSTs to
          // /api/account/social-signin from inside the WKWebView so the
          // session cookie lands in WKHTTPCookieStore directly — fixes the
          // "signed in but page says signed-out" race we hit when posting
          // from React Native (cookie went to NSHTTPCookieStorage and didn't
          // sync to WKHTTPCookieStore before the redirect fired).
          resolve({ ok: true, idToken: result.idToken, provider: 'apple' });
        } else {
          reject(result.error);
        }
        return;
      }

      if (msg.type === 'signInWithGoogle') {
        const result = await signInWithGoogle();
        if (result.ok) {
          resolve({ ok: true, idToken: result.idToken, provider: 'google' });
        } else {
          reject(result.error);
        }
        return;
      }

      if (msg.type === 'signOut') {
        await signOut();
        resolve({ ok: true });
        return;
      }
    } catch (err) {
      reject(err instanceof Error ? err.message : 'Native call failed');
    }
  }, [resolveBridge, rejectBridge]);

  const openTrips = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setTripsVisible(true);
  }, []);

  const navigateInWebview = useCallback((url: string) => {
    if (!webviewRef.current) return;
    // Opening a booking is a jump to somewhere else entirely — drop any stacked
    // screen first so the destination isn't hidden behind a hotel detail.
    setStackedUrl(null);
    const safe = url.replace(/'/g, "\\'");
    webviewRef.current.injectJavaScript(`window.location.href = '${safe}'; true;`);
  }, []);

  /** The shell's own bridge messages resolve back into the shell. */
  const handleRootMessage = useCallback(
    (event: WebViewMessageEvent) => { void handleMessage(event, webviewRef); },
    [handleMessage],
  );

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
        <WebView
          ref={webviewRef}
          source={{ uri: initialUrl }}
          onNavigationStateChange={onNavigationStateChange}
          onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
          onMessage={handleRootMessage}
          injectedJavaScriptBeforeContentLoaded={INJECTED_BRIDGE}
          injectedJavaScript={INJECTED_BRIDGE}
          onLoadStart={() => {
            if (!hasFirstLoaded) setIsLoading(true);
          }}
          onLoadEnd={() => {
            setIsLoading(false);
            setHasFirstLoaded(true);
            hasLoadedOnceRef.current = true;
            // First successful content load → after ~25s of engagement, ask a
            // returning user for a rating. Scheduled once per process; the
            // guard + cool-downs live in review.ts.
            if (!reviewScheduledRef.current) {
              reviewScheduledRef.current = true;
              reviewTimerRef.current = setTimeout(() => {
                void maybeReviewAfterEngagement();
              }, 25_000);
            }
          }}
          startInLoadingState
          allowsBackForwardNavigationGestures
          pullToRefreshEnabled={false}
          bounces={false}
          overScrollMode="never"
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          originWhitelist={['https://*', 'http://*']}
          setSupportMultipleWindows={false}
          applicationNameForUserAgent={APP_USER_AGENT}
          style={styles.webview}
        />
        {isLoading && !hasFirstLoaded ? (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : null}
        <MyTripsModal
          visible={tripsVisible}
          onClose={() => setTripsVisible(false)}
          onOpenBooking={navigateInWebview}
        />
      </SafeAreaView>
      {/* Stacked detail screen — deliberately a sibling of the SafeAreaView, not
          a child of it. It is ON TOP of the shell, never instead of it, so the
          results list underneath keeps its scroll position, filters and
          pagination while the visitor reads a hotel; closing it restores
          nothing because nothing was ever lost.

          Outside the SafeAreaView because that view already pads for the notch:
          an absolutely-positioned child would start below that padding and the
          screen's own `insets.top` would then pad a second time. Out here it
          covers the full window and owns its own inset. */}
      {stackedUrl ? (
        <StackedWebViewScreen
          url={stackedUrl}
          onClose={() => setStackedUrl(null)}
          onShouldStartLoadWithRequest={onStackedShouldStartLoadWithRequest}
          onMessage={handleMessage}
        />
      ) : null}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  webview: { flex: 1, backgroundColor: Colors.background },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  tripsFab: {
    position: 'absolute',
    bottom: 88,
    left: 16,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 6,
  },
  tripsFabIcon: { color: Colors.white, fontSize: 14, fontFamily: 'Poppins_900Black' },
  tripsFabText: { color: Colors.white, fontSize: 13, fontWeight: '800', fontFamily: 'Poppins_800ExtraBold' },
});
