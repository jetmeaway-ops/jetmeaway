/**
 * Discover tab — Phase 4 home for the native app.
 *
 * Sections (top → bottom):
 *   1. Hero greeting + sub-line
 *   2. Hot Flight Deals (horizontal carousel — /api/flights/deals)
 *   3. Hot Hotel Deals (horizontal carousel — /api/hotels/deals)
 *   4. More to do (chevron rows for cars / packages / eSIM / insurance /
 *      explore — each opens the partner flow inside the native-chrome
 *      WebView shell)
 *   5. Brand-strip footer ("Live prices from Duffel · LiteAPI · Trip.com
 *      · …")
 *
 * Tapping a flight deal pushes /flights/search with the destination
 * prefilled (Phase 5 will turn that into a native search; until then the
 * WebView shell handles the URL). Tapping a hotel deal pushes
 * /hotels/search.
 *
 * Skeleton loaders cover the deals fetch on cold start. Errors degrade
 * to a friendly "couldn't load deals" card without breaking the rest of
 * the screen.
 */

import { useCallback } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { Card, Skeleton } from '../../src/components/primitives';
import {
  FlightDealCard,
  HotelDealCard,
} from '../../src/components/search/DealCard';
import {
  useFlightDeals,
  useHotelDeals,
  flightDealsQueryKey,
  hotelDealsQueryKey,
  type FlightDeal,
  type HotelDealDestination,
} from '../../src/api/deals';
import { colors, radii, spacing, typography } from '../../src/theme';
import { haptics } from '../../src/hooks/useHaptics';
import { useNetwork } from '../../src/hooks/useNetwork';

type CategoryRow = {
  slug: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
};

const CATEGORY_ROWS: CategoryRow[] = [
  {
    slug: 'cars',
    icon: 'car-outline',
    title: 'Car hire',
    body: 'Compare seven providers — search params pass through with a tap.',
  },
  {
    slug: 'packages',
    icon: 'gift-outline',
    title: 'Holiday packages',
    body: 'Flight + hotel bundles across Expedia, Trip.com, Booking, and Klook.',
  },
  {
    slug: 'esim',
    icon: 'wifi-outline',
    title: 'eSIM data',
    body: '150+ countries — Airalo and Yesim, instant install over Wi-Fi.',
  },
  {
    slug: 'insurance',
    icon: 'shield-outline',
    title: 'Travel insurance',
    body: 'Single-trip, annual, family, and adventure cover compared honestly.',
  },
  {
    slug: 'explore',
    icon: 'compass-outline',
    title: 'Tours & activities',
    body: 'GetYourGuide and Viator — book before you leave the hotel.',
  },
];

const BRAND_STRIP = [
  'Duffel', 'LiteAPI', 'Trip.com', 'Expedia', 'Booking.com',
  'Aviasales', 'Hotellook', 'Klook', 'Airalo', 'Stripe',
];

export default function DiscoverScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { online } = useNetwork();

  const flightDeals = useFlightDeals();
  const hotelDeals = useHotelDeals();

  const onRefresh = useCallback(async () => {
    if (!online) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: flightDealsQueryKey }),
      queryClient.invalidateQueries({ queryKey: hotelDealsQueryKey }),
    ]);
  }, [online, queryClient]);

  const handleFlightDeal = useCallback(
    (deal: FlightDeal) => {
      // Phase 5 will mount /flights/search natively. Until then we route
      // through the WebView shell with prefilled query params so the
      // existing live search flow handles the rest.
      router.push(
        `/webview/flights?to=${deal.dest}&departure=${deal.departureDate}`,
      );
    },
    [router],
  );

  const handleHotelDeal = useCallback(
    (destination: HotelDealDestination) => {
      router.push(
        `/webview/hotels?destination=${encodeURIComponent(destination.city)}&checkin=${destination.checkin}&checkout=${destination.checkout}`,
      );
    },
    [router],
  );

  const handleCategory = useCallback(
    (slug: string) => {
      haptics.light();
      router.push(`/webview/${slug}`);
    },
    [router],
  );

  const flightLoading = flightDeals.isLoading;
  const hotelLoading = hotelDeals.isLoading;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={flightLoading && !!flightDeals.data}
            onRefresh={onRefresh}
            tintColor={colors.brand}
          />
        }
      >
        <Text style={styles.eyebrow}>WHERE NEXT?</Text>
        <Text style={styles.heading}>Discover</Text>
        <Text style={styles.lede}>
          Live prices from sixteen suppliers, refreshed every six hours.
          Tap a deal to start a live search.
        </Text>

        {/* ── Hot Flight Deals ───────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Hot flight deals</Text>
          <Text style={styles.sectionSub}>From London · cheapest first</Text>
        </View>
        {flightLoading && !flightDeals.data ? (
          <FlatList
            data={[0, 1, 2]}
            horizontal
            keyExtractor={(i) => `flight-skel-${i}`}
            contentContainerStyle={styles.carousel}
            ItemSeparatorComponent={() => <View style={{ width: spacing.sm }} />}
            renderItem={() => <Skeleton variant="rect" width={180} height={220} radius={16} />}
            showsHorizontalScrollIndicator={false}
          />
        ) : flightDeals.error ? (
          <FailedCard message="Couldn't load flight deals — pull down to retry." />
        ) : flightDeals.data && flightDeals.data.length > 0 ? (
          <FlatList
            data={flightDeals.data.slice(0, 12)}
            horizontal
            keyExtractor={(d) => `flight-${d.dest}-${d.departureDate}`}
            contentContainerStyle={styles.carousel}
            ItemSeparatorComponent={() => <View style={{ width: spacing.sm }} />}
            renderItem={({ item }) => (
              <FlightDealCard deal={item} onPress={handleFlightDeal} />
            )}
            showsHorizontalScrollIndicator={false}
          />
        ) : (
          <FailedCard message="No flight deals available right now." />
        )}

        {/* ── Hot Hotel Deals ────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Hot hotel deals</Text>
          <Text style={styles.sectionSub}>Next-week stays · live LiteAPI rates</Text>
        </View>
        {hotelLoading && !hotelDeals.data ? (
          <FlatList
            data={[0, 1, 2]}
            horizontal
            keyExtractor={(i) => `hotel-skel-${i}`}
            contentContainerStyle={styles.carousel}
            ItemSeparatorComponent={() => <View style={{ width: spacing.sm }} />}
            renderItem={() => <Skeleton variant="rect" width={260} height={240} radius={16} />}
            showsHorizontalScrollIndicator={false}
          />
        ) : hotelDeals.error ? (
          <FailedCard message="Couldn't load hotel deals — pull down to retry." />
        ) : hotelDeals.data && hotelDeals.data.length > 0 ? (
          <FlatList
            data={hotelDeals.data}
            horizontal
            keyExtractor={(d) => `hotel-${d.city}`}
            contentContainerStyle={styles.carousel}
            ItemSeparatorComponent={() => <View style={{ width: spacing.sm }} />}
            renderItem={({ item }) => (
              <HotelDealCard destination={item} onPress={handleHotelDeal} />
            )}
            showsHorizontalScrollIndicator={false}
          />
        ) : (
          <FailedCard message="No hotel deals available right now." />
        )}

        {/* ── More to do ─────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>More to do</Text>
          <Text style={styles.sectionSub}>Cars, packages, eSIM, insurance, tours</Text>
        </View>
        <Card style={[styles.categoryCard]}>
          {CATEGORY_ROWS.map((row, i) => (
            <Pressable
              key={row.slug}
              onPress={() => handleCategory(row.slug)}
              accessibilityRole="link"
              accessibilityLabel={row.title}
              style={({ pressed }) => [
                styles.categoryRow,
                i < CATEGORY_ROWS.length - 1 && styles.categoryRowBorder,
                pressed && styles.categoryRowPressed,
              ]}
            >
              <View style={styles.categoryIcon}>
                <Ionicons name={row.icon} size={22} color={colors.brand} />
              </View>
              <View style={styles.categoryText}>
                <Text style={styles.categoryTitle}>{row.title}</Text>
                <Text style={styles.categoryBody}>{row.body}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ))}
        </Card>

        {/* ── Brand strip ────────────────────────────────── */}
        <Text style={styles.brandStripLabel}>LIVE PRICES FROM</Text>
        <View style={styles.brandStripWrap}>
          {BRAND_STRIP.map((brand) => (
            <View key={brand} style={styles.brandTag}>
              <Text style={styles.brandText}>{brand}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FailedCard({ message }: { message: string }) {
  return (
    <Card style={styles.failedCard}>
      <Ionicons name="cloud-offline-outline" size={20} color={colors.textMuted} />
      <Text style={styles.failedText}>{message}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceAlt },
  content: { paddingBottom: spacing.xxl, gap: spacing.md },
  eyebrow: {
    ...typography.overline,
    color: colors.brand,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  heading: {
    ...typography.display,
    color: colors.textPrimary,
    paddingHorizontal: spacing.lg,
  },
  lede: {
    ...typography.body,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  sectionSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  carousel: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  categoryCard: {
    marginHorizontal: spacing.lg,
    padding: 0,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  categoryRowBorder: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  categoryRowPressed: { backgroundColor: colors.surfaceMuted },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.lg,
    backgroundColor: colors.brandSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryText: { flex: 1, gap: 2 },
  categoryTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: 'Poppins_700Bold',
  },
  categoryBody: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  brandStripLabel: {
    ...typography.overline,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  brandStripWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  brandTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
  },
  brandText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  failedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
  },
  failedText: { ...typography.bodySm, color: colors.textSecondary, flex: 1 },
});
