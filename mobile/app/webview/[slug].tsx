/**
 * Native-chrome WebView wrapper — used for content that isn't worth a full
 * native rewrite (terms, privacy, refund policy, blog posts, partner
 * affiliate flows for cars / packages / eSIM / insurance / explore).
 *
 * Visually it's a native screen: native top bar with back chevron, page
 * title, and a share button. The underlying WebView gets the
 * `JetMeAwayNative` injected bridge so the web side can call native share,
 * haptics, and offline-bookings without leaving the surface.
 *
 * Slug → URL routing:
 *   - Bare slugs that match known JetMeAway pages map to /<slug>
 *   - Slugs prefixed `blog-` map to /blog/<rest>
 *   - Slugs prefixed `cars-`, `packages-`, etc. map to /<category>?<query>
 *   - The query string from the route gets forwarded to the URL so a
 *     deep-link can pass search params end-to-end.
 *
 * If a slug isn't recognised we still render the WebView pointed at
 * jetmeaway.co.uk/<slug> — keeps the route forgiving rather than throwing
 * 404 inside the app.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';

import { colors, spacing, typography } from '../../src/theme';
import { haptics } from '../../src/hooks/useHaptics';
import { INJECTED_BRIDGE } from '../../src/services/webview-bridge';

const SITE_BASE = 'https://jetmeaway.co.uk';

const TITLE_BY_SLUG: Record<string, string> = {
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
  'refund-policy': 'Refund Policy',
  'financial-protection': 'Financial Protection',
  about: 'About',
  contact: 'Contact',
  'oss-licences': 'Open-Source Licences',
  cars: 'Cars',
  packages: 'Packages',
  esim: 'eSIM',
  insurance: 'Insurance',
  explore: 'Explore',
  blog: 'Stories',
};

function resolveTitle(slug: string): string {
  if (TITLE_BY_SLUG[slug]) return TITLE_BY_SLUG[slug];
  if (slug.startsWith('blog-')) return 'Story';
  // Fallback: title-case the slug.
  return slug
    .split('-')
    .map((part) => (part.length > 0 ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ');
}

function resolveUrl(slug: string, queryString: string | undefined): string {
  const query = queryString ? `?${queryString}` : '';
  if (slug === 'oss-licences') {
    // Static OSS licences page — keep it on the marketing site so updates
    // don't require an app rebuild.
    return `${SITE_BASE}/oss-licences${query}`;
  }
  if (slug.startsWith('blog-')) {
    return `${SITE_BASE}/blog/${slug.slice('blog-'.length)}${query}`;
  }
  return `${SITE_BASE}/${slug}${query}`;
}

export default function WebviewSlugScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ slug?: string }>();
  const slug = typeof params.slug === 'string' ? params.slug : '';

  // Anything in `params` that isn't `slug` becomes a query string forwarded
  // to the underlying URL so deep-links can carry context end-to-end.
  const queryString = useMemo(() => {
    const out: string[] = [];
    for (const [k, v] of Object.entries(params)) {
      if (k === 'slug' || v == null) continue;
      const val = Array.isArray(v) ? v[0] : v;
      if (typeof val === 'string') {
        out.push(`${encodeURIComponent(k)}=${encodeURIComponent(val)}`);
      }
    }
    return out.length > 0 ? out.join('&') : undefined;
  }, [params]);

  const url = resolveUrl(slug, queryString);
  const title = resolveTitle(slug);
  const webRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);

  const handleShare = useCallback(async () => {
    haptics.light();
    try {
      await Share.share({
        url,
        message: `${title} — JetMeAway`,
      });
    } catch {
      // User dismissed share sheet or share failed silently — non-fatal.
    }
  }, [url, title]);

  const handleBridgeMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    // We only consume the bridge for `share` here; the existing
    // webview-bridge.ts handles the rest (haptics, save-booking, etc.).
    try {
      const msg = JSON.parse(event.nativeEvent.data) as { type?: string; payload?: unknown };
      if (msg?.type === 'haptic') {
        haptics.light();
      }
      if (msg?.type === 'share' && typeof msg.payload === 'object' && msg.payload) {
        const p = msg.payload as { url?: string; message?: string };
        if (p.url || p.message) {
          Share.share({ url: p.url ?? '', message: p.message ?? '' }).catch(() => {});
        }
      }
    } catch {
      // Non-JSON or malformed payload — drop silently.
    }
  }, []);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={12}
          style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
        >
          <Ionicons name="chevron-back" size={26} color={colors.brand} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Pressable
          onPress={handleShare}
          accessibilityRole="button"
          accessibilityLabel="Share"
          hitSlop={12}
          style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
        >
          <Ionicons name="share-outline" size={22} color={colors.brand} />
        </Pressable>
      </View>

      <View style={styles.webWrap}>
        {loading ? (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator color={colors.brand} />
          </View>
        ) : null}
        <WebView
          ref={webRef}
          source={{ uri: url }}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={(e) => {
            setLoading(false);
            Alert.alert(
              "Couldn't load page",
              `The page failed to load: ${e.nativeEvent.description ?? 'Unknown error'}`,
            );
          }}
          injectedJavaScriptBeforeContentLoaded={INJECTED_BRIDGE}
          onMessage={handleBridgeMessage}
          sharedCookiesEnabled
          allowsBackForwardNavigationGestures
          decelerationRate="normal"
          contentInsetAdjustmentBehavior="automatic"
          style={styles.web}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonPressed: { opacity: 0.6 },
  title: {
    flex: 1,
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  webWrap: { flex: 1, position: 'relative' },
  web: { flex: 1, backgroundColor: colors.surface },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
});
