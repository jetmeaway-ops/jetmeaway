/**
 * Native package search form — Phase 7. Origin + destination + dates +
 * travellers. Routes to /webview/packages prefilled so the user lands
 * on the partner results with all params set.
 */

import { useCallback, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
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
import {
  UK_ORIGINS,
  HOTEL_DESTINATIONS,
} from '../../src/lib/popular-locations';
import { colors, radii, spacing, typography } from '../../src/theme';
import { haptics } from '../../src/hooks/useHaptics';

export default function PackagesSearchScreen() {
  const router = useRouter();
  const [origin, setOrigin] = useState<LocationOption | null>(UK_ORIGINS[0] ?? null);
  const [destination, setDestination] = useState<LocationOption | null>(null);
  const [range, setRange] = useState<DateRange>({ depart: null, return: null });
  const [guests, setGuests] = useState<Guests>({ adults: 2, children: 0 });

  const canSearch = !!(origin && destination && range.depart && range.return);

  const handleSearch = useCallback(() => {
    if (!canSearch || !origin || !destination || !range.depart || !range.return) return;
    haptics.success();

    // URL contract for /webview/packages (matches src/app/packages/
    // packages-client.tsx readURL useEffect):
    //   from   — origin airport (any of: IATA / "London (LON)" / etc.)
    //   to     — DESTINATION CITY NAME, not an IATA code. The web
    //            page calls /api/hotels?city=<to> which uses LiteAPI's
    //            city-name resolver. Build #15 sent the IATA code (e.g.
    //            "CDG") which LiteAPI returns nothing for, so the user
    //            saw the page's curated "7 nights from London Heathrow"
    //            FAMILY_PACKAGES section instead of their actual search
    //            results — hence the "duration says 7 days" report.
    //   depart / return — YYYY-MM-DD.
    //   adults / children — pax counts.
    // Fixed in 1.0.8 (2026-05-06): send `destination.label` (city
    // name, e.g. "Paris") rather than `destination.code` (IATA).
    const params = new URLSearchParams({
      from: origin.code,
      to: destination.label,
      depart: range.depart.toISOString().slice(0, 10),
      return: range.return.toISOString().slice(0, 10),
      adults: String(guests.adults),
    });
    if (guests.children > 0) params.set('children', String(guests.children));

    router.push(`/webview/packages?${params.toString()}`);
  }, [canSearch, origin, destination, range, guests, router]);

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Search packages',
          headerLeft: () => <HeaderBack />,
          headerBackVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
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
            <LocationPicker
              value={destination}
              onChange={setDestination}
              options={HOTEL_DESTINATIONS}
              placeholder="To"
              icon="location-outline"
              customHint="Type any city worldwide"
            />
          </View>
        </Card>

        <DateRangePicker value={range} onChange={setRange} mode="return" />

        <GuestSelector value={guests} onChange={setGuests} />

        <Button
          title="Search packages"
          size="lg"
          fullWidth
          onPress={handleSearch}
          disabled={!canSearch}
          haptic={false}
          iconLeft={<Ionicons name="search" size={20} color={colors.textOnBrand} />}
        />

        <Card style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color={colors.brand} />
          <Text style={styles.infoText}>
            Packages combine flight + hotel for a single price. We compare
            Expedia, Trip.com, Klook and our direct hotel partners side by
            side.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceAlt },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  card: {},
  padNone: { padding: 0 },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  infoText: { ...typography.bodySm, color: colors.textSecondary, flex: 1 },
});
