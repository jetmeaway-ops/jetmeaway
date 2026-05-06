/**
 * Trips tab — three-segment view (Upcoming · Past · Saved Searches) with
 * pull-to-refresh, an offline banner, and a friendly empty state. Reads
 * trips locally first via MMKV (`getBookingsSync` powers `initialData`),
 * then merges remote bookings from `/api/account/me`. Saved searches
 * mirror to MMKV so they're available offline as well.
 *
 * Apple 4.2 angle: the offline banner appears whenever `useNetwork().online`
 * flips false, and the cached list keeps rendering — visibly differentiates
 * the native experience from a web tab.
 */

import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { Banner, SegmentedControl } from '../../src/components/primitives';
import TripCard from '../../src/components/trip/TripCard';
import SavedSearchRow from '../../src/components/trip/SavedSearchRow';
import TripsEmptyState from '../../src/components/trip/TripsEmptyState';

import { colors, spacing, typography } from '../../src/theme';
import { useNetwork } from '../../src/hooks/useNetwork';
import {
  useTrips,
  useSavedSearches,
  tripsQueryKey,
  savedSearchesQueryKey,
} from '../../src/api/account';
import type { SavedBooking } from '../../src/services/offline-bookings';
import type { SavedSearch } from '../../src/api/types';
import { refreshWidgetState } from '../../src/widgets/client';
import { indexSpotlightItems } from '../../src/services/spotlight';
import { donateIntent } from '../../src/services/intents';

const SEGMENTS = ['Upcoming', 'Past', 'Saved Searches'] as const;
type Segment = 'upcoming' | 'past' | 'saved-searches';

export default function TripsScreen() {
  const [segmentIndex, setSegmentIndex] = useState(0);
  const segment: Segment = (
    ['upcoming', 'past', 'saved-searches'] as Segment[]
  )[segmentIndex];

  const { online } = useNetwork();
  const queryClient = useQueryClient();

  const tripsQuery = useTrips();
  const savedSearchesQuery = useSavedSearches();

  const [refreshing, setRefreshing] = useState(false);

  // Refresh whichever segment is showing whenever the screen comes back
  // into focus — covers the case of returning from Trip Detail after a
  // cancel or from Search after saving a new search. Also refreshes the
  // widget state and donates a "show my trips" Siri intent so the OS
  // surfaces it in Spotlight + Shortcuts.
  useFocusEffect(
    useCallback(() => {
      tripsQuery.refetch();
      savedSearchesQuery.refetch();
      const widget = refreshWidgetState();
      donateIntent({ kind: 'show-trips' }).catch(() => {});
      // Index every cached trip + saved search into Spotlight. Bridge is
      // a no-op until the Swift target ships.
      const spotlightItems = [
        ...widget.upcoming.map((t) => ({
          id: `trip:${t.id}`,
          domain: 'trip' as const,
          title: t.title,
          subtitle: t.subtitle,
          deepLink: `/trip/${t.id}`,
        })),
      ];
      if (spotlightItems.length > 0) {
        indexSpotlightItems(spotlightItems).catch(() => {});
      }
      // We intentionally don't depend on the queries' identity — they
      // capture the currently active query references on first focus.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const onRefresh = useCallback(async () => {
    if (!online) return;
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: tripsQueryKey }),
        queryClient.invalidateQueries({ queryKey: savedSearchesQueryKey }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [online, queryClient]);

  const { upcoming, past } = useMemo(
    () => splitByDate(tripsQuery.data ?? []),
    [tripsQuery.data],
  );

  const data = segment === 'saved-searches'
    ? savedSearchesQuery.data ?? []
    : segment === 'upcoming'
      ? upcoming
      : past;

  const isLoading =
    (segment === 'saved-searches' ? savedSearchesQuery.isLoading : tripsQuery.isLoading) &&
    data.length === 0;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>YOUR JOURNEYS</Text>
        <Text style={styles.heading}>Trips</Text>
      </View>

      {!online && (
        <View style={styles.bannerWrap}>
          <Banner
            tone="offline"
            title="Offline"
            message="Showing saved trips from this device. Sync resumes when you’re back online."
          />
        </View>
      )}

      <View style={styles.segmentWrap}>
        <SegmentedControl
          segments={SEGMENTS as unknown as string[]}
          selectedIndex={segmentIndex}
          onChange={setSegmentIndex}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : data.length === 0 ? (
        <TripsEmptyState variant={segment} />
      ) : segment === 'saved-searches' ? (
        <FlatList<SavedSearch>
          data={data as SavedSearch[]}
          keyExtractor={(s) => s.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={Separator}
          renderItem={({ item }) => <SavedSearchRow search={item} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.brand}
            />
          }
        />
      ) : (
        <FlatList<SavedBooking>
          data={data as SavedBooking[]}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={Separator}
          renderItem={({ item }) => <TripCard booking={item} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.brand}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

function Separator() {
  return <View style={{ height: spacing.sm }} />;
}

/**
 * Trips with a startDate strictly before today land in 'past'; everything
 * else (including bookings without a startDate) lands in 'upcoming' so
 * the user always sees them somewhere.
 */
function splitByDate(bookings: SavedBooking[]): {
  upcoming: SavedBooking[];
  past: SavedBooking[];
} {
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  const todayMs = todayMidnight.getTime();

  const upcoming: SavedBooking[] = [];
  const past: SavedBooking[] = [];

  for (const b of bookings) {
    const end = b.endDate ? new Date(b.endDate).getTime() : null;
    const start = b.startDate ? new Date(b.startDate).getTime() : null;
    const reference = end ?? start;

    if (reference !== null && Number.isFinite(reference) && reference < todayMs) {
      past.push(b);
    } else {
      upcoming.push(b);
    }
  }

  return { upcoming, past };
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceAlt },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  eyebrow: { ...typography.overline, color: colors.brand },
  heading: { ...typography.display, color: colors.textPrimary },
  bannerWrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  segmentWrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
