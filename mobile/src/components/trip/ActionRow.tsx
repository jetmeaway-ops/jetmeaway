/**
 * Trip Detail action row — Open in Maps · Call Property · Add to Calendar
 * · Share Itinerary. Each tile is a Pressable that fires the relevant
 * native API and gives haptic + visual feedback. Failures are silent
 * (haptics.error + console.warn) — these are polish actions, never
 * blockers.
 */

import { useCallback, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Calendar from 'expo-calendar';
import { colors, radii, spacing, typography } from '../../theme';
import { haptics } from '../../hooks/useHaptics';
import type { SavedBooking } from '../../services/offline-bookings';

type Props = { booking: SavedBooking };

type ActionKey = 'maps' | 'call' | 'calendar' | 'share';

export default function ActionRow({ booking }: Props) {
  const [busy, setBusy] = useState<ActionKey | null>(null);

  const handleMaps = useCallback(async () => {
    setBusy('maps');
    try {
      const url = appleMapsUrl(booking);
      if (!url) {
        haptics.error();
        return;
      }
      haptics.light();
      await Linking.openURL(url);
    } catch (err) {
      console.warn('[trip:maps]', err);
      haptics.error();
    } finally {
      setBusy(null);
    }
  }, [booking]);

  const handleCall = useCallback(async () => {
    setBusy('call');
    try {
      if (!booking.phone) {
        haptics.error();
        return;
      }
      const tel = `tel:${booking.phone.replace(/[^0-9+]/g, '')}`;
      haptics.medium();
      await Linking.openURL(tel);
    } catch (err) {
      console.warn('[trip:call]', err);
      haptics.error();
    } finally {
      setBusy(null);
    }
  }, [booking]);

  const handleCalendar = useCallback(async () => {
    setBusy('calendar');
    try {
      const perm = await Calendar.requestCalendarPermissionsAsync();
      if (perm.status !== 'granted') {
        haptics.error();
        Alert.alert(
          'Calendar access needed',
          'Enable Calendar access for JetMeAway in Settings to add trip dates.',
        );
        return;
      }
      const calendarId = await resolveDefaultCalendar();
      if (!calendarId) {
        haptics.error();
        return;
      }
      const start = booking.startDate ? new Date(booking.startDate) : null;
      const end = booking.endDate ? new Date(booking.endDate) : start;
      if (!start) {
        haptics.error();
        return;
      }

      await Calendar.createEventAsync(calendarId, {
        title: booking.title,
        startDate: start,
        endDate: end ?? start,
        allDay: true,
        notes: [
          `Booking ref: ${booking.id}`,
          booking.address ? `Address: ${booking.address}` : null,
          booking.phone ? `Phone: ${booking.phone}` : null,
          booking.total ? `Total: ${booking.total}` : null,
        ]
          .filter(Boolean)
          .join('\n'),
        location: booking.address,
        alarms: [{ relativeOffset: -60 * 24 }], // 24 hours before
      });

      haptics.success();
      Alert.alert('Added to Calendar', `${booking.title} added with a 24-hour reminder.`);
    } catch (err) {
      console.warn('[trip:calendar]', err);
      haptics.error();
    } finally {
      setBusy(null);
    }
  }, [booking]);

  const handleShare = useCallback(async () => {
    setBusy('share');
    try {
      haptics.light();
      await Share.share({
        title: booking.title,
        message: shareMessage(booking),
        url: Platform.OS === 'ios' ? booking.url : undefined,
      });
    } catch (err) {
      console.warn('[trip:share]', err);
      haptics.error();
    } finally {
      setBusy(null);
    }
  }, [booking]);

  return (
    <View style={styles.row}>
      <ActionTile
        icon="map"
        label="Maps"
        disabled={!booking.address && !booking.lat}
        active={busy === 'maps'}
        onPress={handleMaps}
      />
      <ActionTile
        icon="call"
        label="Call"
        disabled={!booking.phone}
        active={busy === 'call'}
        onPress={handleCall}
      />
      <ActionTile
        icon="calendar"
        label="Calendar"
        disabled={!booking.startDate}
        active={busy === 'calendar'}
        onPress={handleCalendar}
      />
      <ActionTile
        icon="share-social"
        label="Share"
        active={busy === 'share'}
        onPress={handleShare}
      />
    </View>
  );
}

function ActionTile({
  icon,
  label,
  disabled,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  disabled?: boolean;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy: active }}
      style={({ pressed }) => [
        styles.tile,
        disabled && styles.tileDisabled,
        pressed && !disabled && styles.tilePressed,
      ]}
    >
      <View style={[styles.tileIcon, disabled && styles.tileIconDisabled]}>
        <Ionicons
          name={icon}
          size={20}
          color={disabled ? colors.textMuted : colors.brand}
        />
      </View>
      <Text style={[styles.tileLabel, disabled && styles.tileLabelDisabled]}>
        {label}
      </Text>
    </Pressable>
  );
}

function appleMapsUrl(b: SavedBooking): string | null {
  // Coords if available — Maps gets a precise pin.
  if (typeof b.lat === 'number' && typeof b.lng === 'number') {
    const q = encodeURIComponent(b.title);
    return `http://maps.apple.com/?ll=${b.lat},${b.lng}&q=${q}`;
  }
  // Fallback: address string. Apple Maps geocodes it server-side.
  const target = b.address || b.title;
  if (!target) return null;
  return `http://maps.apple.com/?q=${encodeURIComponent(target)}`;
}

async function resolveDefaultCalendar(): Promise<string | null> {
  try {
    if (Platform.OS === 'ios') {
      const def = await Calendar.getDefaultCalendarAsync();
      return def?.id ?? null;
    }
    const list = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const writable = list.find((c) => c.allowsModifications) ?? list[0];
    return writable?.id ?? null;
  } catch {
    return null;
  }
}

function shareMessage(b: SavedBooking): string {
  const parts: string[] = [b.title];
  if (b.startDate) {
    parts.push(b.endDate ? `${b.startDate} → ${b.endDate}` : b.startDate);
  }
  if (b.subtitle) parts.push(b.subtitle);
  if (b.id) parts.push(`Confirmation: ${b.id}`);
  if (b.url) parts.push(b.url);
  return parts.join('\n');
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  tilePressed: {
    backgroundColor: colors.surfaceMuted,
    transform: [{ scale: 0.98 }],
  },
  tileDisabled: {
    opacity: 0.5,
  },
  tileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brandSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileIconDisabled: {
    backgroundColor: colors.surfaceMuted,
  },
  tileLabel: {
    ...typography.caption,
    color: colors.textPrimary,
    fontFamily: 'Poppins_700Bold',
  },
  tileLabelDisabled: {
    color: colors.textMuted,
  },
});
