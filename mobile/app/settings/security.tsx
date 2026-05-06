/**
 * Security screen — biometric lock toggle, "Erase saved trips on this
 * device" destructive button, "Sign out everywhere" remote signout.
 *
 * Erase wipes the local MMKV trips cache + saved-search mirror. Remote
 * trips still re-sync on next /api/account/me. Sign-out-everywhere POSTs
 * to /api/account/signout-all (revokes every session for this account)
 * then clears local cache.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
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
import { colors, radii, spacing, typography } from '../../src/theme';
import { haptics } from '../../src/hooks/useHaptics';
import {
  authenticate as bioAuthenticate,
  getBiometricCapability,
  isBiometricEnabled,
  setBiometricEnabled,
  type BiometricCapability,
} from '../../src/services/biometric';
import { clearAllBookings } from '../../src/services/offline-bookings';
import { signOut, getCachedEmail } from '../../src/services/auth';
import { storage } from '../../src/services/storage';

const SIGNOUT_ALL_ENDPOINT = 'https://jetmeaway.co.uk/api/account/signout-all';

export default function SecurityScreen() {
  const router = useRouter();

  const [bioEnabled, setBioEnabledState] = useState(false);
  const [bioCap, setBioCap] = useState<BiometricCapability>({
    available: false,
    hasFaceId: false,
    hasTouchId: false,
    hasFingerprint: false,
  });
  const [bioBusy, setBioBusy] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    Promise.all([
      isBiometricEnabled(),
      getBiometricCapability(),
      getCachedEmail(),
    ]).then(([enabled, cap, email]) => {
      setBioEnabledState(enabled);
      setBioCap(cap);
      setSignedIn(!!email);
    });
  }, []);

  const handleToggleBiometric = useCallback(async () => {
    if (bioBusy) return;
    setBioBusy(true);
    try {
      const next = !bioEnabled;
      if (next) {
        const ok = await bioAuthenticate('Enable biometric lock');
        if (!ok) {
          haptics.error();
          return;
        }
      }
      await setBiometricEnabled(next);
      setBioEnabledState(next);
      haptics.success();
    } finally {
      setBioBusy(false);
    }
  }, [bioEnabled, bioBusy]);

  const handleEraseLocalTrips = useCallback(() => {
    Alert.alert(
      'Erase saved trips on this device?',
      'Your trips stay safe in your JetMeAway account. They re-sync next time you sign in. Locally cached trip data is removed immediately.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Erase',
          style: 'destructive',
          onPress: async () => {
            haptics.medium();
            await clearAllBookings();
            // Wipe the MMKV trips mirror + saved searches mirror too.
            storage.remove('trips:v1');
            storage.remove('searches:v1');
            Alert.alert('Done', 'Local trip cache cleared.');
          },
        },
      ],
    );
  }, []);

  const handleSignOutEverywhere = useCallback(() => {
    Alert.alert(
      'Sign out of every device?',
      'You stay signed in here, but every other phone, tablet, and browser session is signed out immediately.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out everywhere',
          style: 'destructive',
          onPress: async () => {
            haptics.medium();
            try {
              const ok = await bioAuthenticate('Confirm sign-out-everywhere');
              if (!ok) return;
              await fetch(SIGNOUT_ALL_ENDPOINT, {
                method: 'POST',
                credentials: 'include',
              });
              // Also sign out locally — safer than leaving a partially-revoked
              // state where this device still has a cookie that the backend
              // just blacklisted.
              await signOut();
              router.back();
              Alert.alert('Done', 'Every JetMeAway session was signed out.');
            } catch {
              Alert.alert(
                'Network error',
                "Couldn't reach JetMeAway. Try again on a stronger connection.",
              );
            }
          },
        },
      ],
    );
  }, [router]);

  const bioLabel = bioCap.hasFaceId
    ? 'Face ID Lock'
    : bioCap.hasTouchId
      ? 'Touch ID Lock'
      : bioCap.hasFingerprint
        ? 'Fingerprint Lock'
        : 'Biometric Lock';

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Security' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>BIOMETRIC LOCK</Text>
        <Card style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Ionicons name="finger-print" size={22} color={colors.brand} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{bioLabel}</Text>
              <Text style={styles.rowSublabel}>
                {bioCap.available
                  ? 'Re-prompts after 5 minutes of inactivity. Locks the Trips tab and Trip Detail screens.'
                  : 'Enrol Face ID or Touch ID on this device first, then return here to enable.'}
              </Text>
            </View>
            <Switch
              value={bioEnabled}
              disabled={!bioCap.available || bioBusy}
              onValueChange={handleToggleBiometric}
              trackColor={{ false: colors.border, true: colors.brand }}
              thumbColor={colors.surface}
              ios_backgroundColor={colors.border}
            />
          </View>
        </Card>

        <Text style={styles.sectionLabel}>DEVICE</Text>
        <Card style={styles.card}>
          <Text style={styles.subheading}>Erase saved trips on this device</Text>
          <Text style={styles.body}>
            Removes the local MMKV trips cache and the saved-searches mirror.
            Trips that live in your account come back next sign-in. Use this
            before handing the phone to someone else.
          </Text>
          <Button
            title="Erase local trip cache"
            variant="destructive"
            size="md"
            fullWidth
            onPress={handleEraseLocalTrips}
            haptic={false}
            iconLeft={<Ionicons name="trash-outline" size={18} color={colors.textOnBrand} />}
          />
        </Card>

        {signedIn ? (
          <Card style={styles.card}>
            <Text style={styles.subheading}>Sign out everywhere</Text>
            <Text style={styles.body}>
              Revokes every JetMeAway session attached to this account. Other
              phones, tablets, and browser sessions are signed out immediately.
              You stay signed in on this device.
            </Text>
            <Button
              title="Sign out of all other devices"
              variant="destructive"
              size="md"
              fullWidth
              onPress={handleSignOutEverywhere}
              haptic={false}
              iconLeft={<Ionicons name="log-out-outline" size={18} color={colors.textOnBrand} />}
            />
          </Card>
        ) : null}

        <Text style={styles.footnote}>
          Biometric authentication uses Apple's Local Authentication framework.
          Your face / fingerprint stays on the device — it's never sent to
          JetMeAway servers.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceAlt },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  sectionLabel: {
    ...typography.overline,
    color: colors.textMuted,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  card: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.lg,
    backgroundColor: colors.brandSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { ...typography.body, color: colors.textPrimary, fontFamily: 'Poppins_700Bold' },
  rowSublabel: { ...typography.caption, color: colors.textSecondary },
  subheading: { ...typography.h3, color: colors.textPrimary },
  body: { ...typography.bodySm, color: colors.textSecondary },
  footnote: {
    ...typography.caption,
    color: colors.textMuted,
    paddingHorizontal: spacing.xs,
    marginTop: spacing.sm,
  },
});
