import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
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
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    webviewRef.current?.reload();
    // WebView onLoadEnd will clear it; belt-and-braces timeout
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.flex}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          // WebView owns scroll; ScrollView is just the pull-to-refresh host
          scrollEnabled={false}
        >
          <WebView
            ref={webviewRef}
            source={{ uri: HOME_URL }}
            onNavigationStateChange={onNavigationStateChange}
            onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => {
              setIsLoading(false);
              setRefreshing(false);
            }}
            startInLoadingState
            allowsBackForwardNavigationGestures
            pullToRefreshEnabled
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            originWhitelist={['https://*', 'http://*']}
            setSupportMultipleWindows={false}
            applicationNameForUserAgent="JetMeAway/1.0 Mobile"
            style={styles.webview}
          />
          {isLoading ? (
            <View style={styles.loadingOverlay} pointerEvents="none">
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : null}
        </ScrollView>
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
