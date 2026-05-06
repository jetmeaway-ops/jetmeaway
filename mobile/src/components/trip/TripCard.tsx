/**
 * TripCard — one row in the Trips list. Renders provider tag, title,
 * subtitle (guests / passengers), date range, and total. Tapping pushes
 * into the Trip Detail screen via /trip/[id].
 */

import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Card, Pill } from '../primitives';
import { colors, spacing, typography } from '../../theme';
import {
  inferProvider,
  providerLabel,
  type SavedBooking,
} from '../../services/offline-bookings';

type Props = { booking: SavedBooking };

const TYPE_ICONS: Record<SavedBooking['type'], keyof typeof Ionicons.glyphMap> = {
  flight: 'airplane',
  hotel: 'bed',
  package: 'briefcase',
};

export default function TripCard({ booking }: Props) {
  const router = useRouter();
  const provider = inferProvider(booking);

  const handlePress = useCallback(() => {
    router.push({ pathname: '/trip/[id]', params: { id: booking.id } });
  }, [router, booking.id]);

  return (
    <Card variant="interactive" onPress={handlePress} accessibilityLabel={`Open ${booking.title}`}>
      <View style={styles.headerRow}>
        <View style={styles.typeBadge}>
          <Ionicons name={TYPE_ICONS[booking.type]} size={14} color={colors.brand} />
        </View>
        <Pill tone="neutral">{providerLabel(provider)}</Pill>
        <Text style={styles.ref} numberOfLines={1}>
          {booking.id}
        </Text>
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {booking.title}
      </Text>

      {booking.subtitle ? (
        <Text style={styles.subtitle} numberOfLines={1}>
          {booking.subtitle}
        </Text>
      ) : null}

      {(booking.startDate || booking.endDate) && (
        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.dates}>
            {booking.startDate}
            {booking.endDate ? `  →  ${booking.endDate}` : ''}
          </Text>
        </View>
      )}

      {booking.address ? (
        <View style={styles.dateRow}>
          <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.dates} numberOfLines={1}>
            {booking.address}
          </Text>
        </View>
      ) : null}

      {booking.total ? (
        <Text style={styles.total}>{booking.total}</Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  typeBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brandSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ref: {
    ...typography.caption,
    color: colors.textMuted,
    flex: 1,
    textAlign: 'right',
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  dates: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  total: {
    ...typography.h3,
    color: colors.brand,
    marginTop: spacing.sm,
  },
});
