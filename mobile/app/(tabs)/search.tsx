/**
 * Search tab — native home hero mirroring the website landing page.
 *
 * Replaces the old 2×2 category-tile grid (which testers found confusing:
 * "we don't understand what to do" — and the white Hotels/Cars tiles had
 * invisible labels). The new layout matches jetmeaway.co.uk's homepage so
 * the app feels familiar to anyone who has seen the site:
 *   eyebrow → headline ("Find Your Perfect Trip for Less") → stats band →
 *   a prominent search bar (origin chip + "Where will Scout take you?" + GO)
 *   → quick-destination chips → category switch row → also-in-the-app rows.
 *
 * The search bar and category pills push into the existing native search
 * forms (/flights/search etc.) — those forms keep their LocationPicker,
 * date range and passenger UI, and post to the results webview. This screen
 * is the entry, not a duplicate of the form.
 *
 * Note: the app is currently hardcoded to the dark navy theme (see
 * src/theme). Light/auto theming is a separate app-wide change.
 */

import { useCallback } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Card } from '../../src/components/primitives';
import { colors, radii, spacing, typography } from '../../src/theme';
import { haptics } from '../../src/hooks/useHaptics';

// Website hero accents — gold headline highlight + orange search CTA.
// These mirror jetmeaway.co.uk's homepage exactly (brand blue stays #0066FF).
const GOLD = '#F5A623';
const ORANGE = '#F97316';

type Stat = { value: string; label: string };
const STATS: Stat[] = [
  { value: '15+', label: 'Providers' },
  { value: '2M+', label: 'Hotels' },
  { value: '90s', label: 'Avg. Checkout' },
  { value: '24/7', label: 'AI Assistant' },
];

type Category = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
};
const CATEGORIES: Category[] = [
  { id: 'flights', label: 'Flights', icon: 'airplane', route: '/flights/search' },
  { id: 'hotels', label: 'Hotels', icon: 'bed', route: '/hotels/search' },
  { id: 'cars', label: 'Cars', icon: 'car-sport', route: '/cars/search' },
  { id: 'packages', label: 'Packages', icon: 'cube', route: '/packages/search' },
];

const QUICK_DESTINATIONS = ['Barcelona', 'Dubai', 'Tenerife', 'Palma', 'Antalya'];

type AffiliateRow = {
  slug: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
};
const AFFILIATE_ROWS: AffiliateRow[] = [
  {
    slug: 'esim',
    icon: 'wifi-outline',
    title: 'eSIM data',
    body: '150+ countries · Airalo + Yesim · install before you fly',
  },
  {
    slug: 'insurance',
    icon: 'shield-outline',
    title: 'Travel insurance',
    body: 'Single-trip, annual, family, adventure cover compared',
  },
  {
    slug: 'explore',
    icon: 'compass-outline',
    title: 'Tours & experiences',
    body: 'GetYourGuide and Viator · book before you leave',
  },
];

export default function SearchScreen() {
  const router = useRouter();

  const go = useCallback(
    (route: string) => {
      haptics.light();
      router.push(route);
    },
    [router],
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero — mirrors the website homepage */}
        <Text style={styles.eyebrow}>UK&apos;S SMARTEST TRAVEL COMPARISON</Text>
        <Text style={styles.headline}>
          Find Your Perfect Trip for{' '}
          <Text style={styles.headlineGold}>Less</Text>
        </Text>
        <Text style={styles.lede}>
          Compare flights, hotels, car hire and more from 15+ trusted providers.
          Real prices, in seconds.
        </Text>

        {/* Stats band */}
        <View style={styles.stats}>
          {STATS.map((s) => (
            <View key={s.label} style={styles.statItem}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Primary search bar → flight search form */}
        <Pressable
          onPress={() => go('/flights/search')}
          accessibilityRole="button"
          accessibilityLabel="Search flights"
          style={({ pressed }) => [styles.searchBar, pressed && styles.pressed]}
        >
          <View style={styles.originChip}>
            <Ionicons name="airplane" size={14} color={colors.textPrimary} />
            <Text style={styles.originText}>LON</Text>
            <Ionicons name="chevron-down" size={13} color={colors.textMuted} />
          </View>
          <Text style={styles.searchPlaceholder} numberOfLines={1}>
            Where will Scout take you?
          </Text>
          <View style={styles.goButton}>
            <Ionicons name="search" size={15} color="#FFFFFF" />
            <Text style={styles.goText}>GO</Text>
          </View>
        </Pressable>

        {/* Quick destination chips */}
        <View style={styles.chips}>
          {QUICK_DESTINATIONS.map((city) => (
            <Pressable
              key={city}
              onPress={() => go('/flights/search')}
              accessibilityRole="button"
              accessibilityLabel={`Search trips to ${city}`}
              style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
            >
              <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
              <Text style={styles.chipText}>{city}</Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => go('/flights/search')}
            accessibilityRole="button"
            accessibilityLabel="Surprise me"
            style={({ pressed }) => [styles.chip, styles.chipAccent, pressed && styles.pressed]}
          >
            <Ionicons name="shuffle" size={13} color={GOLD} />
            <Text style={[styles.chipText, { color: GOLD }]}>Surprise me</Text>
          </Pressable>
        </View>

        {/* Category switch — quick access to the other search forms */}
        <Text style={styles.sectionLabel}>SEARCH BY CATEGORY</Text>
        <View style={styles.categoryRow}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat.id}
              onPress={() => go(cat.route)}
              accessibilityRole="button"
              accessibilityLabel={cat.label}
              style={({ pressed }) => [styles.categoryPill, pressed && styles.pressed]}
            >
              <Ionicons name={cat.icon} size={20} color={colors.brand} />
              <Text style={styles.categoryLabel}>{cat.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Also in the app */}
        <Text style={styles.sectionLabel}>ALSO IN THE APP</Text>
        <Card style={styles.padNone}>
          {AFFILIATE_ROWS.map((row, i) => (
            <Pressable
              key={row.slug}
              onPress={() => go(`/webview/${row.slug}`)}
              accessibilityRole="link"
              accessibilityLabel={row.title}
              style={({ pressed }) => [
                styles.affiliateRow,
                i < AFFILIATE_ROWS.length - 1 && styles.affiliateRowBorder,
                pressed && styles.affiliateRowPressed,
              ]}
            >
              <View style={styles.affiliateIcon}>
                <Ionicons name={row.icon} size={22} color={colors.brand} />
              </View>
              <View style={styles.affiliateText}>
                <Text style={styles.affiliateTitle}>{row.title}</Text>
                <Text style={styles.affiliateBody}>{row.body}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ))}
        </Card>

        <Text style={styles.footnote}>
          Prices locked at booking — we never call or email you for extra payment.
          Cars, packages, eSIM and insurance redirect to partners with your search
          prefilled, no markup.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },

  eyebrow: { ...typography.overline, color: GOLD, marginBottom: spacing.xs },
  headline: { ...typography.display, color: colors.textPrimary },
  headlineGold: { color: GOLD },
  lede: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },

  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: {
    fontFamily: 'Poppins_800ExtraBold',
    fontSize: 22,
    color: colors.textPrimary,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xs,
    paddingLeft: spacing.sm,
    gap: spacing.sm,
  },
  originChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceMuted,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radii.md,
  },
  originText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: colors.textPrimary,
  },
  searchPlaceholder: {
    ...typography.body,
    color: colors.textMuted,
    flex: 1,
  },
  goButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: ORANGE,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: radii.lg,
  },
  goText: { fontFamily: 'Poppins_800ExtraBold', fontSize: 14, color: '#FFFFFF' },

  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
  },
  chipAccent: { borderColor: 'rgba(245,166,35,0.5)' },
  chipText: {
    ...typography.bodySm,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textSecondary,
  },

  sectionLabel: {
    ...typography.overline,
    color: colors.textMuted,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xxs,
  },
  categoryRow: { flexDirection: 'row', gap: spacing.sm },
  categoryPill: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
  },
  categoryLabel: {
    ...typography.caption,
    color: colors.textPrimary,
  },

  padNone: { padding: 0 },
  affiliateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  affiliateRowBorder: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  affiliateRowPressed: { backgroundColor: colors.surfaceMuted },
  affiliateIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.lg,
    backgroundColor: colors.brandSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  affiliateText: { flex: 1, gap: 2 },
  affiliateTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: 'Poppins_700Bold',
  },
  affiliateBody: { ...typography.caption, color: colors.textSecondary },

  pressed: { opacity: 0.85 },

  footnote: {
    ...typography.caption,
    color: colors.textMuted,
    paddingHorizontal: spacing.xxs,
    marginTop: spacing.lg,
  },
});
