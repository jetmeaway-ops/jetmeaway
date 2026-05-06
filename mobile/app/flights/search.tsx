/**
 * Native flight search form — Phase 5 v1.
 *
 * The form is fully native: LocationPicker for origin + destination,
 * DateRangePicker for outbound/return, PassengerSelector + cabin chips.
 *
 * On Search, we route to /webview/flights with prefilled query params so
 * the existing live web search flow takes over until the native results
 * + Apple Pay native checkout (Phase 5b) ships in a TestFlight update.
 *
 * Recent searches mirror to MMKV under `searches:flights:v1` (max 10,
 * FIFO) so users can re-tap a previous query.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';

import { Button, Card, SegmentedControl } from '../../src/components/primitives';
import LocationPicker, {
  type LocationOption,
} from '../../src/components/forms/LocationPicker';
import DateRangePicker, {
  type DateRange,
} from '../../src/components/forms/DateRangePicker';
import PassengerSelector, {
  type Passengers,
} from '../../src/components/forms/PassengerSelector';
import { colors, radii, spacing, typography } from '../../src/theme';
import { haptics } from '../../src/hooks/useHaptics';
import {
  UK_ORIGINS,
  FLIGHT_DESTINATIONS,
} from '../../src/lib/popular-locations';
import { readJson, writeJson } from '../../src/services/storage';
import { donateIntent } from '../../src/services/intents';

type TripMode = 'return' | 'one-way';
type Cabin = 'economy' | 'premium' | 'business' | 'first';

const CABIN_OPTIONS: { code: Cabin; label: string }[] = [
  { code: 'economy', label: 'Economy' },
  { code: 'premium', label: 'Premium' },
  { code: 'business', label: 'Business' },
  { code: 'first', label: 'First' },
];

const RECENT_KEY = 'searches:flights:v1';
const MAX_RECENTS = 8;

type RecentSearch = {
  origin: LocationOption;
  destination: LocationOption;
  range: { depart: string | null; return: string | null };
  passengers: Passengers;
  mode: TripMode;
  cabin: Cabin;
  ts: number;
};

function todayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export default function FlightSearchScreen() {
  const router = useRouter();
  const [origin, setOrigin] = useState<LocationOption | null>(UK_ORIGINS[0] ?? null);
  const [destination, setDestination] = useState<LocationOption | null>(null);
  const [range, setRange] = useState<DateRange>({ depart: null, return: null });
  const [passengers, setPassengers] = useState<Passengers>({ adults: 1, children: 0, infants: 0 });
  const [mode, setMode] = useState<TripMode>('return');
  const [cabin, setCabin] = useState<Cabin>('economy');
  const [recents, setRecents] = useState<RecentSearch[]>([]);

  useEffect(() => {
    setRecents(readJson<RecentSearch[]>(RECENT_KEY, []));
  }, []);

  const canSearch = !!(origin && destination && range.depart && (mode === 'one-way' || range.return));

  const handleSearch = useCallback(() => {
    if (!canSearch || !origin || !destination || !range.depart) return;
    haptics.success();

    const recent: RecentSearch = {
      origin,
      destination,
      range: {
        depart: range.depart.toISOString().slice(0, 10),
        return: range.return ? range.return.toISOString().slice(0, 10) : null,
      },
      passengers,
      mode,
      cabin,
      ts: Date.now(),
    };
    const next = [recent, ...recents.filter((r) => r.destination.code !== destination.code)].slice(0, MAX_RECENTS);
    setRecents(next);
    writeJson(RECENT_KEY, next);

    // Donate the search to Siri so iOS surfaces "Find flights to <city>"
    // in Shortcuts + Spotlight. Bridge is a no-op until the Swift target
    // ships in Phase 8.
    donateIntent({ kind: 'find-flights', destination: destination.label }).catch(() => {});

    const params = new URLSearchParams({
      from: origin.code,
      to: destination.code,
      departure: recent.range.depart!,
      adults: String(passengers.adults),
    });
    if (passengers.children > 0) params.set('children', String(passengers.children));
    if (passengers.infants > 0) params.set('infants', String(passengers.infants));
    if (recent.range.return) params.set('return', recent.range.return);
    if (cabin !== 'economy') params.set('cabin', cabin);

    router.push(`/webview/flights?${params.toString()}`);
  }, [canSearch, origin, destination, range, passengers, mode, cabin, recents, router]);

  const handleSwap = useCallback(() => {
    haptics.medium();
    setOrigin(destination);
    setDestination(origin);
  }, [origin, destination]);

  const handleRecent = useCallback(
    (r: RecentSearch) => {
      haptics.light();
      setOrigin(r.origin);
      setDestination(r.destination);
      setRange({
        depart: r.range.depart ? new Date(r.range.depart) : null,
        return: r.range.return ? new Date(r.range.return) : null,
      });
      setPassengers(r.passengers);
      setMode(r.mode);
      setCabin(r.cabin);
    },
    [],
  );

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Search flights' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <SegmentedControl
          segments={['Return', 'One-way']}
          selectedIndex={mode === 'return' ? 0 : 1}
          onChange={(i) => {
            haptics.light();
            setMode(i === 0 ? 'return' : 'one-way');
            if (i === 1) setRange((prev) => ({ ...prev, return: null }));
          }}
        />

        <Card style={[styles.card, styles.padNone]}>
          <View style={{ padding: spacing.md, gap: spacing.sm }}>
            <LocationPicker
              value={origin}
              onChange={setOrigin}
              options={UK_ORIGINS}
              placeholder="From"
              icon="airplane-outline"
              customHint="Type any UK airport"
            />
            <View style={styles.swapWrap}>
              <Pressable
                onPress={handleSwap}
                accessibilityRole="button"
                accessibilityLabel="Swap origin and destination"
                style={({ pressed }) => [styles.swapBtn, pressed && styles.swapBtnPressed]}
              >
                <Ionicons name="swap-vertical" size={20} color={colors.brand} />
              </Pressable>
            </View>
            <LocationPicker
              value={destination}
              onChange={setDestination}
              options={FLIGHT_DESTINATIONS}
              placeholder="To"
              icon="location-outline"
              customHint="Type any city or airport"
            />
          </View>
        </Card>

        <DateRangePicker value={range} onChange={setRange} mode={mode} />

        <PassengerSelector value={passengers} onChange={setPassengers} />

        <Text style={styles.fieldLabel}>CABIN</Text>
        <View style={styles.chipsWrap}>
          {CABIN_OPTIONS.map((opt) => {
            const selected = cabin === opt.code;
            return (
              <Pressable
                key={opt.code}
                onPress={() => {
                  haptics.light();
                  setCabin(opt.code);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[
                  styles.chip,
                  selected && styles.chipSelected,
                ]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Button
          title="Search flights"
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
                  accessibilityLabel={`Recent search to ${r.destination.label}`}
                  style={({ pressed }) => [
                    styles.recentRow,
                    i < recents.length - 1 && styles.recentRowBorder,
                    pressed && styles.recentRowPressed,
                  ]}
                >
                  <View style={styles.recentIcon}>
                    <Ionicons name="time-outline" size={18} color={colors.brand} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recentLabel}>
                      {r.origin.code} → {r.destination.label}
                    </Text>
                    <Text style={styles.recentSub}>
                      {r.range.depart ?? '—'}{r.range.return ? ` · ${r.range.return}` : ''} ·{' '}
                      {r.passengers.adults + r.passengers.children + r.passengers.infants} pax
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
  swapWrap: { alignItems: 'center', marginVertical: -spacing.xs },
  swapBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brandSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  swapBtnPressed: { backgroundColor: colors.brandMuted },
  fieldLabel: {
    ...typography.overline,
    color: colors.textMuted,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  chipText: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontFamily: 'Poppins_700Bold',
  },
  chipTextSelected: {
    color: colors.textOnBrand,
  },
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
