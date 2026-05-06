/**
 * Native car-hire search form — Phase 7. Pickup location + dates +
 * driver-age stepper. On Search we route to /webview/cars with the
 * params prefilled so the affiliate redirect lands on a results page
 * that already knows the trip details.
 */

import { useCallback, useState } from 'react';
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
import LocationPicker, {
  type LocationOption,
} from '../../src/components/forms/LocationPicker';
import DateRangePicker, {
  type DateRange,
} from '../../src/components/forms/DateRangePicker';
import { colors, radii, spacing, typography } from '../../src/theme';
import { haptics } from '../../src/hooks/useHaptics';
import { HOTEL_DESTINATIONS } from '../../src/lib/popular-locations';

export default function CarsSearchScreen() {
  const router = useRouter();
  const [pickup, setPickup] = useState<LocationOption | null>(null);
  const [range, setRange] = useState<DateRange>({ depart: null, return: null });
  const [returnDifferent, setReturnDifferent] = useState(false);
  const [dropoff, setDropoff] = useState<LocationOption | null>(null);
  const [driverAge, setDriverAge] = useState(30);

  const canSearch = !!(pickup && range.depart && range.return);

  const handleSearch = useCallback(() => {
    if (!canSearch || !pickup || !range.depart || !range.return) return;
    haptics.success();

    const params = new URLSearchParams({
      pickup: pickup.code,
      from: range.depart.toISOString().slice(0, 10),
      to: range.return.toISOString().slice(0, 10),
      age: String(driverAge),
    });
    if (returnDifferent && dropoff) {
      params.set('dropoff', dropoff.code);
    }

    router.push(`/webview/cars?${params.toString()}`);
  }, [canSearch, pickup, range, dropoff, returnDifferent, driverAge, router]);

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Search cars' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={[styles.card, styles.padNone]}>
          <View style={{ padding: spacing.md, gap: spacing.sm }}>
            <LocationPicker
              value={pickup}
              onChange={setPickup}
              options={HOTEL_DESTINATIONS}
              placeholder="Pickup"
              icon="car-outline"
              customHint="Type any city or airport"
            />
            {returnDifferent ? (
              <LocationPicker
                value={dropoff}
                onChange={setDropoff}
                options={HOTEL_DESTINATIONS}
                placeholder="Drop-off"
                icon="flag-outline"
                customHint="Type any city or airport"
              />
            ) : null}
          </View>
        </Card>

        <Card style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleIcon}>
              <Ionicons name="repeat-outline" size={20} color={colors.brand} />
            </View>
            <View style={styles.toggleText}>
              <Text style={styles.toggleLabel}>Return at different location</Text>
              <Text style={styles.toggleSub}>One-way hire across cities or airports</Text>
            </View>
            <Switch
              value={returnDifferent}
              onValueChange={(v) => {
                haptics.light();
                setReturnDifferent(v);
                if (!v) setDropoff(null);
              }}
              trackColor={{ false: colors.border, true: colors.brand }}
              thumbColor={colors.surface}
              ios_backgroundColor={colors.border}
            />
          </View>
        </Card>

        <DateRangePicker value={range} onChange={setRange} mode="return" />

        <Card style={styles.card}>
          <Text style={styles.fieldLabel}>DRIVER AGE</Text>
          <View style={styles.stepperRow}>
            <Pressable
              onPress={() => {
                haptics.light();
                setDriverAge((a) => Math.max(18, a - 1));
              }}
              accessibilityRole="button"
              accessibilityLabel="Decrease driver age"
              style={({ pressed }) => [styles.stepperBtn, pressed && styles.stepperBtnPressed]}
            >
              <Ionicons name="remove" size={20} color={colors.brand} />
            </Pressable>
            <Text style={styles.stepperValue}>{driverAge}</Text>
            <Pressable
              onPress={() => {
                haptics.light();
                setDriverAge((a) => Math.min(80, a + 1));
              }}
              accessibilityRole="button"
              accessibilityLabel="Increase driver age"
              style={({ pressed }) => [styles.stepperBtn, pressed && styles.stepperBtnPressed]}
            >
              <Ionicons name="add" size={20} color={colors.brand} />
            </Pressable>
            <Text style={styles.stepperHint}>
              {driverAge < 25
                ? 'Young-driver surcharge usually applies'
                : driverAge > 70
                  ? 'Some suppliers add a senior-driver fee'
                  : 'Standard rate'}
            </Text>
          </View>
        </Card>

        <Button
          title="Search car hire"
          size="lg"
          fullWidth
          onPress={handleSearch}
          disabled={!canSearch}
          haptic={false}
          iconLeft={<Ionicons name="search" size={20} color={colors.textOnBrand} />}
        />

        <Text style={styles.footnote}>
          Cars are bookable on partner sites — we redirect with your search
          filled in. No markup; commission paid by the partner.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceAlt },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  card: {},
  padNone: { padding: 0 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
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
  fieldLabel: {
    ...typography.overline,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brandSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnPressed: { backgroundColor: colors.brandMuted },
  stepperValue: {
    ...typography.h2,
    color: colors.textPrimary,
    minWidth: 32,
    textAlign: 'center',
  },
  stepperHint: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  footnote: {
    ...typography.caption,
    color: colors.textMuted,
    paddingHorizontal: spacing.xs,
    marginTop: spacing.sm,
  },
});
