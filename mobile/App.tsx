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

import { Colors } from './src/constants/colors';
import { registerForPushNotifications, syncPushTokenToBackend } from './src/services/push';
import { saveBooking, parseBookingMessage } from './src/services/offline-bookings';
import { INJECTED_BRIDGE, parseMessage } from './src/services/webview-bridge';
import { MyTripsModal } from './src/screens/MyTripsModal';
import { signInWithApple, signInWithGoogle, signOut } from './src/services/auth';

const HOME_URL = 'https://jetmeaway.co.uk/';
const INTERNAL_HOST = 'jetmeaway.co.uk';
const INTERNAL_HOSTS = new Set([INTERNAL_HOST, `www.${INTERNAL_HOST}`]);

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
      const safe = path.replace(/'/g, "\\'");
      webviewRef.current.injectJavaScript(`window.location.href = 'https://${INTERNAL_HOST}${safe}'; true;`);
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  // Android hardware back → WebView back when possible
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack && webviewRef.current) {
        webviewRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [canGoBack]);

  const onNavigationStateChange = useCallback((nav: WebViewNavigation) => {
    setCanGoBack(nav.canGoBack);
  }, []);

  /**
   * Intercept loads to external domains — open them in the system browser
   * instead of inside the WebView. Keeps the app clean and lets affiliate
   * sites run their own Stripe / auth flows without breaking.
   */
  const onShouldStartLoadWithRequest = useCallback((req: { url: string }) => {
    try {
      const u = new URL(req.url);
      if (u.hostname === INTERNAL_HOST || u.hostname === `www.${INTERNAL_HOST}`) {
        return true;
      }
      if (u.protocol === 'about:' || u.protocol === 'data:') return true;
      WebBrowser.openBrowserAsync(req.url).catch(() => Linking.openURL(req.url));
      return false;
    } catch {
      return true;
    }
  }, []);

  /**
   * Resolve a pending bridge call by injecting a script that calls back into
   * the web's __JMA_RESOLVE__ function.
   */
  const resolveBridge = useCallback((id: string, value: unknown) => {
    if (!webviewRef.current || !id) return;
    const json = JSON.stringify(value).replace(/'/g, "\\'");
    webviewRef.current.injectJavaScript(`window.__JMA_RESOLVE__ && window.__JMA_RESOLVE__('${id}', ${json}); true;`);
  }, []);

  const rejectBridge = useCallback((id: string, reason: string) => {
    if (!webviewRef.current || !id) return;
    const safe = reason.replace(/'/g, "\\'").slice(0, 200);
    webviewRef.current.injectJavaScript(`window.__JMA_REJECT__ && window.__JMA_REJECT__('${id}', '${safe}'); true;`);
  }, []);

  const handleMessage = useCallback(async (event: WebViewMessageEvent) => {
    const msg = parseMessage(event.nativeEvent.data);
    if (!msg) return;
    const id = msg.id ?? '';

    try {
      if (msg.type === 'share') {
        const p = (msg.payload ?? {}) as { title?: string; text?: string; url?: string };
        await Share.share({
          title: typeof p.title === 'string' ? p.title : 'JetMeAway',
          message: [p.text, p.url].filter(Boolean).join(' — ') || 'JetMeAway',
          url: typeof p.url === 'string' ? p.url : undefined,
        });
        resolveBridge(id, { ok: true });
        return;
      }

      if (msg.type === 'saveBooking') {
        const booking = parseBookingMessage(msg.payload);
        if (!booking) {
          rejectBridge(id, 'Invalid booking payload');
          return;
        }
        await saveBooking(booking);
        resolveBridge(id, { ok: true, savedAt: Date.now() });
        return;
      }

      if (msg.type === 'requestLocation') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          rejectBridge(id, 'Permission denied');
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        resolveBridge(id, { lat: pos.coords.latitude, lng: pos.coords.longitude });
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
        resolveBridge(id, { ok: true });
        return;
      }

      if (msg.type === 'signInWithApple') {
        const result = await signInWithApple();
        if (result.ok) {
          resolveBridge(id, { ok: true, email: result.email });
        } else {
          rejectBridge(id, result.error);
        }
        return;
      }

      if (msg.type === 'signInWithGoogle') {
        const result = await signInWithGoogle();
        if (result.ok) {
          resolveBridge(id, { ok: true, email: result.email });
        } else {
          rejectBridge(id, result.error);
        }
        return;
      }

      if (msg.type === 'signOut') {
        await signOut();
        resolveBridge(id, { ok: true });
        return;
      }
    } catch (err) {
      rejectBridge(id, err instanceof Error ? err.message : 'Native call failed');
    }
  }, [resolveBridge, rejectBridge]);

  const openTrips = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setTripsVisible(true);
  }, []);

  const navigateInWebview = useCallback((url: string) => {
    if (!webviewRef.current) return;
    const safe = url.replace(/'/g, "\\'");
    webviewRef.current.injectJavaScript(`window.location.href = '${safe}'; true;`);
  }, []);

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
          onMessage={handleMessage}
          injectedJavaScriptBeforeContentLoaded={INJECTED_BRIDGE}
          injectedJavaScript={INJECTED_BRIDGE}
          onLoadStart={() => {
            if (!hasFirstLoaded) setIsLoading(true);
          }}
          onLoadEnd={() => {
            setIsLoading(false);
            setHasFirstLoaded(true);
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
          applicationNameForUserAgent="JetMeAway/1.0.5 Mobile"
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
