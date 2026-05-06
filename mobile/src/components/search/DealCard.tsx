/**
 * Deal cards — flight + hotel variants for the Discover home screen.
 *
 * `FlightDealCard`: small horizontal card (180w × 220h) with airline strip,
 * destination + flag, departure date, transfer count, and price. Tap
 * routes to a prefilled flight search.
 *
 * `HotelDealCard`: medium horizontal card (260w × 240h) with destination
 * photo, optional tag pill, hotel count + cheapest price, top-hotel name.
 * Tap routes to a prefilled hotel search.
 *
 * Both rely on Image with explicit dimensions — important for FlatList
 * horizontal performance (no re-layout on image-load thrash).
 */

import { useCallback } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radii, shadows, spacing, typography } from '../../theme';
import { haptics } from '../../hooks/useHaptics';
import { Pill } from '../primitives';
import type { FlightDeal, HotelDealDestination } from '../../api/deals';

const FLIGHT_CARD_W = 180;
const FLIGHT_CARD_H = 220;
const HOTEL_CARD_W = 260;
const HOTEL_CARD_H = 240;

function fmtGBP(pence: number | null | undefined): string {
  if (pence == null) return '—';
  // Backend returns whole pounds for flights and whole pounds for hotels —
  // both treat the input as integer pounds.
  return `£${Math.round(pence)}`;
}

function fmtDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function FlightDealCard({
  deal,
  onPress,
}: {
  deal: FlightDeal;
  onPress: (deal: FlightDeal) => void;
}) {
  const handlePress = useCallback(() => {
    haptics.light();
    onPress(deal);
  }, [deal, onPress]);

  const transferLabel =
    deal.transfers === 0 ? 'Direct' : `${deal.transfers} stop${deal.transfers === 1 ? '' : 's'}`;

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Flight deal to ${deal.city}, ${fmtGBP(deal.price)}`}
      style={({ pressed }) => [styles.flightCard, pressed && styles.cardPressed]}
    >
      <View style={styles.flightHeader}>
        <Text style={styles.flag}>{deal.flag}</Text>
        <Pill tone="brand">{transferLabel}</Pill>
      </View>
      <View style={styles.flightBody}>
        <Text style={styles.flightDest} numberOfLines={1}>{deal.city}</Text>
        <Text style={styles.flightAirline} numberOfLines={1}>{deal.airline}</Text>
      </View>
      <View style={styles.flightFooter}>
        <View>
          <Text style={styles.flightLabel}>From</Text>
          <Text style={styles.flightPrice}>{fmtGBP(deal.price)}</Text>
        </View>
        <Text style={styles.flightDate}>{fmtDate(deal.departureDate)}</Text>
      </View>
    </Pressable>
  );
}

export function HotelDealCard({
  destination,
  onPress,
}: {
  destination: HotelDealDestination;
  onPress: (destination: HotelDealDestination) => void;
}) {
  const handlePress = useCallback(() => {
    haptics.light();
    onPress(destination);
  }, [destination, onPress]);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Hotel deal in ${destination.city}, from ${fmtGBP(destination.cheapestPrice)} per night`}
      style={({ pressed }) => [styles.hotelCard, pressed && styles.cardPressed]}
    >
      <Image source={{ uri: destination.photo }} style={styles.hotelPhoto} />
      <View style={styles.hotelOverlay} pointerEvents="none">
        {destination.tag ? (
          <View style={styles.hotelTagWrap}>
            <Pill tone="brand">{destination.tag}</Pill>
          </View>
        ) : null}
        <Text style={styles.hotelFlag}>{destination.flag}</Text>
      </View>
      <View style={styles.hotelBody}>
        <Text style={styles.hotelCity} numberOfLines={1}>{destination.city}</Text>
        {destination.topHotel ? (
          <View style={styles.hotelMeta}>
            <Ionicons name="star" size={12} color={colors.warning} />
            <Text style={styles.hotelHotelName} numberOfLines={1}>
              {destination.topHotel.name}
            </Text>
          </View>
        ) : null}
        <View style={styles.hotelFooter}>
          <View>
            <Text style={styles.hotelLabel}>Per night from</Text>
            <Text style={styles.hotelPrice}>{fmtGBP(destination.cheapestPrice)}</Text>
          </View>
          <Text style={styles.hotelCount}>
            {destination.hotelCount} hotel{destination.hotelCount === 1 ? '' : 's'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flightCard: {
    width: FLIGHT_CARD_W,
    height: FLIGHT_CARD_H,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPressed: { opacity: 0.85 },
  flightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  flag: { fontSize: 28 },
  flightBody: { flex: 1, gap: 2, justifyContent: 'center' },
  flightDest: {
    ...typography.h3,
    color: colors.textPrimary,
    fontFamily: 'Poppins_800ExtraBold',
  },
  flightAirline: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  flightFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  flightLabel: { ...typography.caption, color: colors.textMuted },
  flightPrice: {
    ...typography.h2,
    color: colors.brand,
    fontFamily: 'Poppins_900Black',
  },
  flightDate: {
    ...typography.caption,
    color: colors.textSecondary,
  },

  hotelCard: {
    width: HOTEL_CARD_W,
    height: HOTEL_CARD_H,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hotelPhoto: {
    width: '100%',
    height: 130,
    backgroundColor: colors.surfaceMuted,
  },
  hotelOverlay: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    right: spacing.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  hotelTagWrap: {},
  hotelFlag: { fontSize: 22 },
  hotelBody: {
    flex: 1,
    padding: spacing.sm,
    gap: 4,
  },
  hotelCity: {
    ...typography.h3,
    color: colors.textPrimary,
    fontFamily: 'Poppins_800ExtraBold',
  },
  hotelMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hotelHotelName: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  hotelFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  hotelLabel: { ...typography.caption, color: colors.textMuted },
  hotelPrice: {
    ...typography.h3,
    color: colors.brand,
    fontFamily: 'Poppins_900Black',
  },
  hotelCount: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
