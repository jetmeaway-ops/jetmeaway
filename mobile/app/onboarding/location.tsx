/**
 * Onboarding · location — pre-permission rationale + the actual
 * `Location.requestForegroundPermissionsAsync()` call.
 *
 * We always show the rationale card first so the system permission dialog
 * lands on a user who's read why we want it. The single "Continue" CTA
 * always proceeds to the system permission request — there is no skip /
 * dismiss path on this screen, per App Review guideline 5.1.1(iv). Whether
 * the user grants or denies the system dialog, the flow advances.
 */

import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Button, Card } from '../../src/components/primitives';
import { colors, radii, spacing, typography } from '../../src/theme';
import { haptics } from '../../src/hooks/useHaptics';

export default function LocationOnboardingScreen() {
  const router = useRouter();
  const [requesting, setRequesting] = useState(false);

  const handleContinue = async () => {
    setRequesting(true);
    try {
      const result = await Location.requestForegroundPermissionsAsync();
      if (result.status === 'granted') haptics.success();
    } catch {
      /* permission API failure is non-fatal — user can grant later */
    } finally {
      setRequesting(false);
      router.push('/onboarding/notifications');
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.body}>
        <View style={styles.iconBubble}>
          <Ionicons name="navigate" size={48} color={colors.brand} />
        </View>

        <Text style={styles.eyebrow}>STEP 2 OF 4</Text>
        <Text style={styles.heading}>Find your nearest airport, instantly.</Text>
        <Text style={styles.lede}>
          With your location we suggest the cheapest departures from where
          you actually are — and map the neighbourhood around any hotel you
          search.
        </Text>

        <Card variant="elevated" style={styles.bullets}>
          <Bullet icon="checkmark-circle" text="Pre-fills your nearest UK airport on every search" />
          <Bullet icon="checkmark-circle" text="Shows what’s walkable around each hotel result" />
          <Bullet icon="checkmark-circle" text="Used only when the app is open. Never sold or shared." />
        </Card>
      </View>

      <View style={styles.footer}>
        <Button
          title="Continue"
          onPress={handleContinue}
          fullWidth
          size="lg"
          loading={requesting}
          haptic="medium"
        />
      </View>
    </SafeAreaView>
  );
}

function Bullet({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  return (
    <View style={styles.bulletRow}>
      <Ionicons name={icon} size={18} color={colors.success} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface, justifyContent: 'space-between' },
  body: {
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  iconBubble: {
    width: 96,
    height: 96,
    borderRadius: radii.xxl,
    backgroundColor: colors.brandSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  eyebrow: {
    ...typography.overline,
    color: colors.brand,
    marginBottom: spacing.xs,
  },
  heading: {
    ...typography.h1,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  lede: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  bullets: {
    width: '100%',
    gap: spacing.sm,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  bulletText: { ...typography.bodySm, color: colors.textPrimary, flex: 1 },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
});
