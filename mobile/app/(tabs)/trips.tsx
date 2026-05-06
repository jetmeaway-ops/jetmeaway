/**
 * Trips tab — Phase 1 placeholder rendering the existing offline cache so
 * Apple's reviewer can already see the offline-trip behaviour even before
 * Phase 2 builds the proper Trip Detail screen.
 *
 * Reads from MMKV synchronously via `getBookingsSync()`; if the user is
 * offline, the offline banner renders above the list.
 */

import { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Banner, Card, Pill } from '../../src/components/primitives';
import { colors, spacing, typography } from '../../src/theme';
import { useNetwork } from '../../src/hooks/useNetwork';
import { getBookingsSync, type SavedBooking } from '../../src/services/offline-bookings';

export default function TripsScreen() {
  const { online } = useNetwork();
  // Sync read on mount — paints on the first frame.
  const bookings = useMemo(() => getBookingsSync(), []);

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

      {bookings.length === 0 ? (
        <View style={styles.empty}>
          <Card variant="elevated">
            <Text style={styles.placeholderTitle}>No saved trips yet</Text>
            <Text style={styles.placeholderBody}>
              When you complete a booking it appears here automatically and
              stays available even without a signal — perfect for showing the
              receptionist on arrival.
            </Text>
          </Card>
        </View>
      ) : (
        <FlatList<SavedBooking>
          data={bookings}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Card style={styles.tripCard}>
              <View style={styles.tripRow}>
                <Pill tone="brand">{item.type.toUpperCase()}</Pill>
                <Text style={styles.tripRef}>{item.id}</Text>
              </View>
              <Text style={styles.tripTitle} numberOfLines={2}>
                {item.title}
              </Text>
              {item.subtitle ? (
                <Text style={styles.tripMeta}>{item.subtitle}</Text>
              ) : null}
              {item.startDate ? (
                <Text style={styles.tripDates}>
                  {item.startDate}
                  {item.endDate ? ` → ${item.endDate}` : ''}
                </Text>
              ) : null}
              {item.total ? (
                <Text style={styles.tripTotal}>{item.total}</Text>
              ) : null}
            </Card>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceAlt },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  eyebrow: { ...typography.overline, color: colors.brand },
  heading: { ...typography.display, color: colors.textPrimary },
  bannerWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  listContent: { padding: spacing.lg, gap: spacing.md },
  empty: { padding: spacing.lg },
  tripCard: { gap: spacing.xs },
  tripRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tripRef: { ...typography.caption, color: colors.textMuted },
  tripTitle: { ...typography.h3, color: colors.textPrimary },
  tripMeta: { ...typography.bodySm, color: colors.textSecondary },
  tripDates: { ...typography.caption, color: colors.textPrimary },
  tripTotal: { ...typography.h3, color: colors.brand, marginTop: spacing.xs },
  placeholderTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.xs },
  placeholderBody: { ...typography.bodySm, color: colors.textSecondary },
});
