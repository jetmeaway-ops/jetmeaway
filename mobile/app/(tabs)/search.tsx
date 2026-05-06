/**
 * Search tab — unified entry to every search category. Phase 7b.
 *
 * Layout:
 *   Hero greeting
 *   2×2 grid of native search tiles (Flights / Hotels / Cars / Packages)
 *     — each pushes to its native search form
 *   Row of affiliate / info categories (eSIM / Insurance / Tours)
 *     — each pushes to /webview/<slug> via the native-chrome shell
 *
 * Tiles use brand-blue accent gradients (solid colour for v1; gradient
 * polish in Phase 9) so the grid reads at a glance.
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

type SearchTile = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  route: string;
  accent: 'brand' | 'navy';
};

const PRIMARY_TILES: SearchTile[] = [
  {
    id: 'flights',
    icon: 'airplane',
    title: 'Flights',
    subtitle: 'Direct + connections from 15+ feeds',
    route: '/flights/search',
    accent: 'brand',
  },
  {
    id: 'hotels',
    icon: 'bed',
    title: 'Hotels',
    subtitle: 'Live rates, refundable filter, 90s checkout',
    route: '/hotels/search',
    accent: 'navy',
  },
  {
    id: 'cars',
    icon: 'car',
    title: 'Car hire',
    subtitle: 'Compare 7 providers · one-way OK',
    route: '/cars/search',
    accent: 'navy',
  },
  {
    id: 'packages',
    icon: 'gift',
    title: 'Packages',
    subtitle: 'Flight + hotel bundles, ATOL via partner',
    route: '/packages/search',
    accent: 'brand',
  },
];

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

  const handleNavigate = useCallback(
    (route: string) => {
      haptics.light();
      router.push(route);
    },
    [router],
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>FIND YOUR TRIP</Text>
        <Text style={styles.heading}>Search</Text>
        <Text style={styles.lede}>
          Compare flights, hotels, cars, and packages across our partner network —
          plus eSIM, insurance, and experiences alongside.
        </Text>

        <View style={styles.grid}>
          {PRIMARY_TILES.map((tile) => (
            <Pressable
              key={tile.id}
              onPress={() => handleNavigate(tile.route)}
              accessibilityRole="button"
              accessibilityLabel={tile.title}
              style={({ pressed }) => [
                styles.tile,
                tile.accent === 'brand' ? styles.tileBrand : styles.tileNavy,
                pressed && styles.tilePressed,
              ]}
            >
              <View style={styles.tileIcon}>
                <Ionicons name={tile.icon} size={26} color={colors.surface} />
              </View>
              <Text style={styles.tileTitle}>{tile.title}</Text>
              <Text style={styles.tileSub} numberOfLines={2}>{tile.subtitle}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>ALSO IN THE APP</Text>
        <Card style={[styles.affiliateCard, styles.padNone]}>
          {AFFILIATE_ROWS.map((row, i) => (
            <Pressable
              key={row.slug}
              onPress={() => handleNavigate(`/webview/${row.slug}`)}
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
          Flight + hotel bookings stay on-device through Apple Pay (rolling out).
          Cars, packages, eSIM, and insurance redirect to partners with your
          search prefilled — no markup.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceAlt },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  eyebrow: { ...typography.overline, color: colors.brand },
  heading: { ...typography.display, color: colors.textPrimary },
  lede: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tile: {
    flexBasis: '48%',
    flexGrow: 1,
    aspectRatio: 1.05,
    borderRadius: radii.xl,
    padding: spacing.md,
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  tileBrand: { backgroundColor: colors.brand },
  tileNavy: { backgroundColor: colors.surfaceInverse },
  tilePressed: { opacity: 0.85 },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTitle: {
    ...typography.h2,
    color: colors.textOnBrand,
  },
  tileSub: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.85)',
  },

  sectionLabel: {
    ...typography.overline,
    color: colors.textMuted,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  affiliateCard: {},
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
  affiliateBody: {
    ...typography.caption,
    color: colors.textSecondary,
  },

  footnote: {
    ...typography.caption,
    color: colors.textMuted,
    paddingHorizontal: spacing.xs,
    marginTop: spacing.md,
  },
});
