import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent, WebViewNavigation } from 'react-native-webview';

import { APP_USER_AGENT } from '../constants/app';
import { Colors } from '../constants/colors';
import { INJECTED_BRIDGE } from '../services/webview-bridge';

/**
 * A WebView screen that slides in OVER the main shell.
 *
 * This is the app's answer to "open the hotel in a new tab". The results
 * WebView underneath is never unmounted, so closing this screen puts the
 * visitor straight back on their list with the scroll position, filters and
 * pagination exactly as they left them — there is nothing to save or restore.
 *
 * It carries the same native bridge as the root shell, so share, save-booking,
 * location, haptics and sign-in all keep working from a hotel detail page.
 * Bridge replies are injected into THIS WebView (not the root), which is why
 * `onMessage` hands the ref back to the caller.
 */
export default function StackedWebViewScreen({
  url,
  onClose,
  onShouldStartLoadWithRequest,
  onMessage,
}: {
  url: string;
  onClose: () => void;
  /** Shared routing rules — see src/lib/webview-routing.ts. */
  onShouldStartLoadWithRequest: (req: { url: string }) => boolean;
  /** Receives the event plus this screen's own ref, so replies come back here. */
  onMessage: (event: WebViewMessageEvent, ref: React.RefObject<WebView | null>) => void;
}) {
  const insets = useSafeAreaInsets();
  const webviewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);

  // Slide in from the right — the platform-standard "push" gesture, so the
  // screen reads as stacked rather than as a page swap.
  const slide = useRef(new Animated.Value(Dimensions.get('window').width)).current;
  useEffect(() => {
    Animated.timing(slide, {
      toValue: 0,
      duration: 240,
      useNativeDriver: true,
    }).start();
  }, [slide]);

  /** Slide back out, then unmount. Keeps close feeling like a real pop. */
  const dismiss = useCallback(() => {
    Animated.timing(slide, {
      toValue: Dimensions.get('window').width,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onClose());
  }, [onClose, slide]);

  /**
   * Back arrow: walk this screen's own history first (detail → room → back),
   * and only close once there's nothing left to go back to.
   */
  const goBack = useCallback(() => {
    if (canGoBack && webviewRef.current) {
      webviewRef.current.goBack();
      return;
    }
    dismiss();
  }, [canGoBack, dismiss]);

  // The parent drives Android's hardware back button through this.
  useEffect(() => {
    stackedBackHandler.current = goBack;
    return () => {
      if (stackedBackHandler.current === goBack) stackedBackHandler.current = null;
    };
  }, [goBack]);

  const onNavigationStateChange = useCallback((nav: WebViewNavigation) => {
    setCanGoBack(nav.canGoBack);
    if (nav.title && !/^https?:/i.test(nav.title)) setTitle(nav.title);
  }, []);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => onMessage(event, webviewRef),
    [onMessage],
  );

  return (
    <Animated.View
      style={[styles.root, { transform: [{ translateX: slide }] }]}
      // Sits above the shell's own chrome (e.g. the My Trips button) so nothing
      // from the screen underneath can be tapped through.
      pointerEvents="auto"
    >
      {/* The screen covers the whole window, so the header owns the notch/status
          bar inset itself and its white background runs up behind it. */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={goBack}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Back to results"
          // Generous target — the owner's UX pass sets a 42px minimum.
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backChevron}>‹</Text>
          <Text style={styles.backLabel}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {title || 'JetMeAway'}
        </Text>
        {/* Balances the back button so the title stays optically centred. */}
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.body}>
        <WebView
          ref={webviewRef}
          source={{ uri: url }}
          onNavigationStateChange={onNavigationStateChange}
          onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
          onMessage={handleMessage}
          injectedJavaScriptBeforeContentLoaded={INJECTED_BRIDGE}
          injectedJavaScript={INJECTED_BRIDGE}
          onLoadEnd={() => setLoading(false)}
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
        {loading ? (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

/**
 * Android's hardware back is registered once in App.tsx, but the handler has to
 * act on whichever stacked screen is currently on top. The screen parks its own
 * `goBack` here on mount so App.tsx can call it without re-registering the
 * listener (and without prop-drilling a callback back up).
 */
export const stackedBackHandler: { current: (() => void) | null } = { current: null };

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.background,
    zIndex: 50,
    elevation: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 10,
    backgroundColor: Colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 78,
    minHeight: 42,
    paddingHorizontal: 8,
    gap: 2,
  },
  backChevron: {
    color: Colors.primary,
    fontSize: 30,
    lineHeight: 34,
    marginTop: -4,
    fontWeight: '400',
  },
  backLabel: {
    color: Colors.primary,
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: Colors.dark,
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
  },
  headerSpacer: { width: 78 },
  body: { flex: 1 },
  webview: { flex: 1, backgroundColor: Colors.background },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
});
