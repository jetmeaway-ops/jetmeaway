import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { WebView, WebViewNavigation } from 'react-native-webview';
import * as WebBrowser from 'expo-web-browser';

import { Colors } from './src/constants/colors';

const HOME_URL = 'https://jetmeaway.co.uk/';
const INTERNAL_HOST = 'jetmeaway.co.uk';

/**
 * JetMeAway mobile shell — a full-screen WebView over the production site.
 *
 * Rationale (2026-04-24): the prior native RN screens had ~1/20th of the
 * site's functionality (no checkout, no account, no hotel detail, no admin).
 * Maintaining two codebases was causing the "ugly / non-functional" complaint.
 * We now render the live site; every web deploy ships to the app instantly.
 *
 * External domains (affiliate links, Stripe checkout on partner domains, etc.)
 * open in the system browser so the user doesn't get trapped inside the app.
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
  // Only the first navigation shows the full-screen spinner. Subsequent
  // SPA route changes inside the WebView are silent — otherwise the
  // overlay flashes on every search submit and competes with the site's
  // own loading UI.
  const [hasFirstLoaded, setHasFirstLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
      // Allow in-app Stripe checkout redirects back (same origin)
      if (u.protocol === 'about:' || u.protocol === 'data:') return true;
      // External — open in system browser, block in-WebView navigation
      WebBrowser.openBrowserAsync(req.url).catch(() => Linking.openURL(req.url));
      return false;
    } catch {
      return true;
    }
  }, []);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
        <WebView
          ref={webviewRef}
          source={{ uri: HOME_URL }}
          onNavigationStateChange={onNavigationStateChange}
          onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
          onLoadStart={() => {
            if (!hasFirstLoaded) setIsLoading(true);
          }}
          onLoadEnd={() => {
            setIsLoading(false);
            setHasFirstLoaded(true);
          }}
          startInLoadingState
          allowsBackForwardNavigationGestures
          // pullToRefreshEnabled removed: scrolling fast to the top of a
          // search results page was triggering a full reload, wiping the
          // user's form state and search results. The site has its own
          // refresh affordances (logo tap, in-page Search button).
          pullToRefreshEnabled={false}
          // bounces=false (iOS) + overScrollMode="never" (Android): without
          // these, the rubber-band overscroll at top/bottom of search pages
          // was being interpreted as a pull-to-refresh gesture and resetting
          // the page even after pullToRefreshEnabled was off.
          bounces={false}
          overScrollMode="never"
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          originWhitelist={['https://*', 'http://*']}
          setSupportMultipleWindows={false}
          applicationNameForUserAgent="JetMeAway/1.0 Mobile"
          style={styles.webview}
        />
        {isLoading && !hasFirstLoaded ? (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : null}
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
});
