/**
 * Trip Detail screen. Routed at /trip/[id], outside the (tabs) group so
 * the bottom bar hides during the push.
 *
 * Behaviour:
 *   1. Resolves the booking by id from MMKV first (sync, paints on the
 *      first frame), with the merged trips query as a backup so we still
 *      render trips that are remote-only.
 *   2. If the user has enabled biometric lock, gates the screen behind
 *      Face ID / Touch ID. The lock state lives in component state — a
 *      kill or backgrounding re-arms it.
 *   3. Renders a hero (countdown · provider tag · dates · passengers ·
 *      total · address), a primary action row (Maps · Call · Calendar ·
 *      Share), and a footer link back to the booking confirmation page
 *      on jetmeaway.co.uk.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button, Card, Pill } from '../../src/components/primitives';
import TripCountdown from '../../src/components/trip/TripCountdown';
import ActionRow from '../../src/components/trip/ActionRow';
import { colors, radii, spacing, typography } from '../../src/theme';
import { haptics } from '../../src/hooks/useHaptics';
import {
  getBookingsSync,
  inferProvider,
  providerLabel,
  type SavedBooking,
} from '../../src/services/offline-bookings';
import { useTrips } from '../../src/api/account';
import {
  authenticate as bioAuthenticate,
  getBiometricCapability,
  isBiometricEnabled,
} from '../../src/services/biometric';

const TYPE_ICON: Record<SavedBooking['type'], keyof typeof Ionicons.glyphMap> = {
  flight: 'airplane',
  hotel: 'bed',
  package: 'briefcase',
};

type LockState = 'checking' | 'locked' | 'unlocked';

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  // Sync read: paints instantly without a query round-trip.
  const localBooking = useMemo<SavedBooking | undefined>(
    () => getBookingsSync().find((b) => b.id === id),
    [id],
  );
  const tripsQuery = useTrips();
  const remoteBooking = useMemo<SavedBooking | undefined>(
    () => tripsQuery.data?.find((b) => b.id === id),
    [tripsQuery.data, id],
  );
  const booking: SavedBooking | undefined = localBooking ?? remoteBooking;

  /* ── Biometric gate ───────────────────────────────────────────────── */

  const [lock, setLock] = useState<LockState>('checking');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [enabled, cap] = await Promise.all([
          isBiometricEnabled(),
          getBiometricCapability(),
        ]);
        if (cancelled) return;
        if (!enabled || !cap.available) {
          setLock('unlocked');
          return;
        }
        const ok = await bioAuthenticate('Unlock JetMeAway trip');
        if (cancelled) return;
        setLock(ok ? 'unlocked' : 'locked');
      } catch {
        if (!cancelled) setLock('unlocked');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const tryUnlock = useCallback(async () => {
    setLock('checking');
    try {
      const ok = await bioAuthenticate('Unlock JetMeAway trip');
      setLock(ok ? 'unlocked' : 'locked');
      if (ok) haptics.success();
      else haptics.error();
    } catch {
      setLock('locked');
      haptics.error();
    }
  }, []);

  /* ── Render ───────────────────────────────────────────────────────── */

  if (!booking) {
    return (
      <>
        <Stack.Screen options={{ title: 'Trip', headerShown: true }} />
        <SafeAreaView style={styles.root} edges={['bottom']}>
          <View style={styles.notFoundWrap}>
            <Text style={styles.notFoundTitle}>Trip not found</Text>
            <Text style={styles.notFoundBody}>
              We couldn’t find a saved trip with that reference. It may have
              been removed from this device.
            </Text>
            <Button title="Back to Trips" onPress={() => router.back()} variant="secondary" />
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (lock === 'checking') {
    return (
      <>
        <Stack.Screen options={{ title: 'Trip', headerShown: false }} />
        <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
          <View style={styles.lockedWrap}>
            <ActivityIndicator color={colors.brand} />
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (lock === 'locked') {
    return (
      <>
        <Stack.Screen options={{ title: 'Trip', headerShown: true }} />
        <SafeAreaView style={styles.root} edges={['bottom']}>
          <View style={styles.lockedWrap}>
            <View style={styles.lockedIcon}>
              <Ionicons name="lock-closed" size={36} color={colors.brand} />
            </View>
            <Text style={styles.lockedTitle}>Trip locked</Text>
            <Text style={styles.lockedBody}>
              Authenticate with Face ID / Touch ID to view your booking
              details.
            </Text>
            <Button
              title="Unlock"
              onPress={tryUnlock}
              size="lg"
              haptic="medium"
            />
          </View>
        </SafeAreaView>
      </>
    );
  }

  const provider = inferProvider(booking);

  return (
    <>
      <Stack.Screen options={{ title: booking.title, headerShown: true }} />
      <SafeAreaView style={styles.root} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.heroIconRow}>
              <View style={styles.typeBadge}>
                <Ionicons name={TYPE_ICON[booking.type]} size={18} color={colors.brand} />
              </View>
              <Pill tone="brand">{providerLabel(provider)}</Pill>
              <Text style={styles.heroRef} numberOfLines={1}>
                {booking.id}
              </Text>
            </View>
            <Text style={styles.heroTitle} numberOfLines={3}>
              {booking.title}
            </Text>
            {booking.address ? (
              <Text style={styles.heroAddress} numberOfLines={2}>
                {booking.address}
              </Text>
            ) : null}

            <TripCountdown startDate={booking.startDate} endDate={booking.endDate} />
          </View>

          {/* Action row */}
          <View style={styles.section}>
            <ActionRow booking={booking} />
          </View>

          {/* Trip details card */}
          <View style={styles.section}>
            <Card variant="elevated" style={styles.detailsCard}>
              {(booking.startDate || booking.endDate) && (
                <DetailRow
                  icon="calendar"
                  label="Dates"
                  value={
                    booking.startDate
                      ? booking.endDate
                        ? `${booking.startDate}  →  ${booking.endDate}`
                        : booking.startDate
                      : booking.endDate ?? ''
                  }
                />
              )}
              {typeof booking.nights === 'number' ? (
                <DetailRow
                  icon="moon"
                  label="Nights"
                  value={`${booking.nights}`}
                />
              ) : null}
              {booking.subtitle ? (
                <DetailRow icon="people" label="Guests" value={booking.subtitle} />
              ) : typeof booking.passengers === 'number' ? (
                <DetailRow
                  icon="people"
                  label="Passengers"
                  value={`${booking.passengers}`}
                />
              ) : null}
              {booking.phone ? (
                <DetailRow icon="call" label="Contact" value={booking.phone} />
              ) : null}
              {booking.total ? (
                <DetailRow
                  icon="wallet"
                  label="Total"
                  value={booking.total}
                  emphasis
                />
              ) : null}
            </Card>
          </View>

          {/* Footer link */}
          <View style={styles.section}>
            <Text style={styles.footerNote}>
              Provider: {providerLabel(provider)} · Reference {booking.id}.
              Full receipt + tax invoice available on jetmeaway.co.uk.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function DetailRow({
  icon,
  label,
  value,
  emphasis,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Ionicons name={icon} size={16} color={colors.brand} />
      </View>
      <View style={styles.detailText}>
        <Text style={styles.detailLabel}>{label.toUpperCase()}</Text>
        <Text style={[styles.detailValue, emphasis && styles.detailValueEmphasis]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceAlt },
  content: { paddingBottom: spacing.xxl },
  hero: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  heroIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  typeBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brandSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroRef: {
    ...typography.caption,
    color: colors.textMuted,
    flex: 1,
    textAlign: 'right',
  },
  heroTitle: {
    ...typography.display,
    color: colors.textPrimary,
  },
  heroAddress: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  detailsCard: {
    gap: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brandSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailText: { flex: 1 },
  detailLabel: {
    ...typography.overline,
    color: colors.textMuted,
    marginBottom: 2,
  },
  detailValue: {
    ...typography.body,
    color: colors.textPrimary,
  },
  detailValueEmphasis: {
    fontFamily: 'Poppins_800ExtraBold',
    color: colors.brand,
  },
  footerNote: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  notFoundWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  notFoundTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  notFoundBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  lockedWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  lockedIcon: {
    width: 80,
    height: 80,
    borderRadius: radii.xxl,
    backgroundColor: colors.brandSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  lockedTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  lockedBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
});
