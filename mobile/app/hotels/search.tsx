/**
 * Native hotel search form — Phase 6 v1.
 *
 * Mirrors flights/search.tsx structure:
 *   - LocationPicker for destination (city)
 *   - DateRangePicker for check-in / check-out
 *   - GuestSelector (adults + children)
 *   - "Refundable only" toggle as a chip
 *   - Search routes to /webview/hotels?destination=...&checkin=...&...
 *
 * Recent searches mirror to MMKV under `searches:hotels:v1` (max 8 FIFO).
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';

import { Button, Card } from '../../src/components/primitives';
import HeaderBack from '../../src/components/nav/HeaderBack';
import LocationPicker, {
  type LocationOption,
} from '../../src/components/forms/LocationPicker';
import DateRangePicker, {
  type DateRange,
} from '../../src/components/forms/DateRangePicker';
import GuestSelector, {
  type Guests,
} from '../../src/components/forms/GuestSelector';
import { colors, radii, spacing, typography } from '../../src/theme';
import { haptics } from '../../src/hooks/useHaptics';
import { HOTEL_DESTINATIONS } from '../../src/lib/popular-locations';
import { readJson, writeJson } from '../../src/services/storage';
import { donateIntent } from '../../src/services/intents';

const RECENT_KEY = 'searches:hotels:v1';
const MAX_RECENTS = 8;

type RecentSearch = {
  destination: LocationOption;
  range: { checkin: string | null; checkout: string | null };
  guests: Guests;
  refundableOnly: boolean;
  ts: number;
};

export default function HotelSearchScreen() {
  const router = useRouter();
  const [destination, setDestination] = useState<LocationOption | null>(null);
  const [range, setRange] = useState<DateRange>({ depart: null, return: null });
  const [guests, setGuests] = useState<Guests>({ adults: 2, children: 0 });
  const [refundableOnly, setRefundableOnly] = useState(false);
  const [recents, setRecents] = useState<RecentSearch[]>([]);

  useEffect(() => {
    setRecents(readJson<RecentSearch[]>(RECENT_KEY, []));
  }, []);

  const canSearch = !!(destination && range.depart && range.return);

  const handleSearch = useCallback(() => {
    if (!canSearch || !destination || !range.depart || !range.return) return;
    haptics.success();

    const recent: RecentSearch = {
      destination,
      range: {
        checkin: range.depart.toISOString().slice(0, 10),
        checkout: range.return.toISOString().slice(0, 10),
      },
      guests,
      refundableOnly,
      ts: Date.now(),
    };
    const next = [
      recent,
      ...recents.filter((r) => r.destination.code !== destination.code),
    ].slice(0, MAX_RECENTS);
    setRecents(next);
    writeJson(RECENT_KEY, next);

    donateIntent({ kind: 'find-hotels', city: destination.label }).catch(() => {});

    const params = new URLSearchParams({
      destination: destination.code,
      checkin: recent.range.checkin!,
      checkout: recent.range.checkout!,
      adults: String(guests.adults),
    });
    if (guests.children > 0) params.set('children', String(guests.children));
    if (refundableOnly) params.set('refundable', '1');

    router.push(`/webview/hotels?${params.toString()}`);
  }, [canSearch, destination, range, guests, refundableOnly, recents, router]);

  const handleRecent = useCallback(
    (r: RecentSearch) => {
      haptics.light();
      setDestination(r.destination);
      setRange({
        depart: r.range.checkin ? new Date(r.range.checkin) : null,
        return: r.range.checkout ? new Date(r.range.checkout) : null,
      });
      setGuests(r.guests);
      setRefundableOnly(r.refundableOnly);
    },
    [],
  );

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Search hotels',
          headerLeft: () => <HeaderBack />,
          headerBackVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={[styles.card, styles.padNone]}>
          <View style={{ padding: spacing.md }}>
            <LocationPicker
              value={destination}
              onChange={setDestination}
              options={HOTEL_DESTINATIONS}
              placeholder="Destination"
              icon="bed-outline"
              customHint="Type any city worldwide"
            />
          </View>
        </Card>

        <DateRangePicker value={range} onChange={setRange} mode="return" />

        <GuestSelector value={guests} onChange={setGuests} />

        <Card style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleIcon}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.brand} />
            </View>
            <View style={styles.toggleText}>
              <Text style={styles.toggleLabel}>Refundable only</Text>
              <Text style={styles.toggleSub}>Filter to bookings you can cancel free</Text>
            </View>
            <Switch
              value={refundableOnly}
              onValueChange={(v) => {
                haptics.light();
                setRefundableOnly(v);
              }}
              trackColor={{ false: colors.border, true: colors.brand }}
              thumbColor={colors.surface}
              ios_backgroundColor={colors.border}
            />
          </View>
        </Card>

        <Button
          title="Search hotels"
          size="lg"
          fullWidth
          onPress={handleSearch}
          disabled={!canSearch}
          haptic={false}
          iconLeft={<Ionicons name="search" size={20} color={colors.textOnBrand} />}
        />

        {recents.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>RECENT SEARCHES</Text>
            <Card style={[styles.card, styles.padNone]}>
              {recents.map((r, i) => (
                <Pressable
                  key={`${r.destination.code}-${r.ts}`}
                  onPress={() => handleRecent(r)}
                  accessibilityRole="button"
                  accessibilityLabel={`Recent search for ${r.destination.label}`}
                  style={({ pressed }) => [
                    styles.recentRow,
                    i < recents.length - 1 && styles.recentRowBorder,
                    pressed && styles.recentRowPressed,
                  ]}
                >
                  <View style={styles.recentIcon}>
                    <Ionicons name="bed-outline" size={18} color={colors.brand} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recentLabel}>
                      {r.destination.flag ? `${r.destination.flag} ` : ''}{r.destination.label}
                    </Text>
                    <Text style={styles.recentSub}>
                      {r.range.checkin} → {r.range.checkout} · {r.guests.adults} adult{r.guests.adults === 1 ? '' : 's'}
                      {r.guests.children > 0 ? `, ${r.guests.children} child${r.guests.children === 1 ? '' : 'ren'}` : ''}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </Pressable>
              ))}
            </Card>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceAlt },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  card: {},
  padNone: { padding: 0 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  toggleIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.lg,
    backgroundColor: colors.brandSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleText: { flex: 1, gap: 2 },
  toggleLabel: { ...typography.body, color: colors.textPrimary, fontFamily: 'Poppins_700Bold' },
  toggleSub: { ...typography.caption, color: colors.textSecondary },
  sectionLabel: {
    ...typography.overline,
    color: colors.textMuted,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  recentRowBorder: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  recentRowPressed: { backgroundColor: colors.surfaceMuted },
  recentIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.lg,
    backgroundColor: colors.brandSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentLabel: { ...typography.body, color: colors.textPrimary, fontFamily: 'Poppins_700Bold' },
  recentSub: { ...typography.caption, color: colors.textSecondary },
});
