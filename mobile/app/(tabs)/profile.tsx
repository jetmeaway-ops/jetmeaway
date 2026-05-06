/**
 * Profile tab — Phase 10 placeholder polished to ship-ready quality so
 * Apple's reviewer sees a complete native account surface.
 *
 * What's wired today:
 *   - Account header reads cached email via getCachedEmail()
 *   - Scout Account / Free Account pill reflects sign-in state
 *   - Biometric toggle uses the existing biometric.ts service (real
 *     setting, persisted in expo-secure-store)
 *   - Sign In CTA pushes /onboarding/signin (existing screen) when
 *     signed-out; Sign Out hits /api/account/signout via the auth.ts
 *     helper when signed-in
 *
 * What stays placeholder for Phase 3:
 *   - Notifications and Privacy Shield rows render Alert dialogs on tap
 *   - Help, Terms, Privacy rows render Alerts on tap
 *
 * The screen is functional + visually complete enough for the App Store
 * reviewer to accept as a real native settings surface.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import Constants from 'expo-constants';

import { Button, Card, Pill } from '../../src/components/primitives';
import { colors, radii, spacing, typography } from '../../src/theme';
import { haptics } from '../../src/hooks/useHaptics';
import {
  fetchLiveSession,
  getCachedEmail,
  signOut,
} from '../../src/services/auth';
import {
  authenticate as bioAuthenticate,
  getBiometricCapability,
  isBiometricEnabled,
  setBiometricEnabled,
  type BiometricCapability,
} from '../../src/services/biometric';

export default function ProfileScreen() {
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioCap, setBioCap] = useState<BiometricCapability>({
    available: false,
    hasFaceId: false,
    hasTouchId: false,
    hasFingerprint: false,
  });
  const [bioBusy, setBioBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [cached, enabled, cap] = await Promise.all([
      getCachedEmail(),
      isBiometricEnabled(),
      getBiometricCapability(),
    ]);
    setEmail(cached);
    setBioEnabled(enabled);
    setBioCap(cap);
    // Live session check runs in parallel; updates email if the cookie
    // shows a different user (e.g. recently signed in via WebView).
    fetchLiveSession()
      .then((live) => {
        if (live && live !== cached) setEmail(live);
      })
      .catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleToggleBiometric = useCallback(async () => {
    if (bioBusy) return;
    setBioBusy(true);
    try {
      const next = !bioEnabled;
      if (next) {
        // Confirm via auth before enabling so we don't lock the user out
        // of their own data.
        const ok = await bioAuthenticate('Enable Face ID / Touch ID lock');
        if (!ok) {
          haptics.error();
          return;
        }
      }
      await setBiometricEnabled(next);
      setBioEnabled(next);
      haptics.success();
    } finally {
      setBioBusy(false);
    }
  }, [bioEnabled, bioBusy]);

  const handleSignIn = useCallback(() => {
    haptics.light();
    router.push('/onboarding/signin');
  }, [router]);

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign out?', "You'll keep saved trips on this device, but new bookings won't sync until you sign in again.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          haptics.medium();
          await signOut();
          setEmail(null);
        },
      },
    ]);
  }, []);

  const handleNavigate = useCallback(
    (path: string) => {
      haptics.light();
      router.push(path);
    },
    [router],
  );

  // App Store guideline 5.1.1(v) — discoverable in-app account-deletion
  // entry point. Mirrors the row in settings/account.tsx so reviewers
  // (and customers) can find it without digging through Settings first.
  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            haptics.medium();
            Linking.openURL('https://jetmeaway.co.uk/delete-account').catch(() => {
              Alert.alert(
                'Cannot open browser',
                'Please visit https://jetmeaway.co.uk/delete-account to complete account deletion.',
              );
            });
          },
        },
      ],
    );
  }, []);

  const isSignedIn = !!email;
  const initials = (email || '?')
    .replace(/@.*/, '')
    .split(/[._-]/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '✦';

  const appVersion = Constants.expoConfig?.version ?? '1.0.6';
  const buildNumber =
    (Constants.expoConfig?.ios as { buildNumber?: string } | undefined)?.buildNumber ?? '—';

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>YOUR ACCOUNT</Text>
        <Text style={styles.heading}>Profile</Text>

        {/* ── Account header ─────────────────────────────── */}
        <Card variant="elevated" style={styles.headerCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.avatarText2}>
              <Text style={styles.headerEmail} numberOfLines={1}>
                {isSignedIn ? email : 'Not signed in'}
              </Text>
              <View style={styles.headerPills}>
                <Pill tone={isSignedIn ? 'brand' : 'neutral'}>
                  {isSignedIn ? 'Scout Account' : 'Free Account'}
                </Pill>
                {isSignedIn ? <Pill tone="success">Synced</Pill> : null}
              </View>
            </View>
          </View>

          {!isSignedIn ? (
            <Button
              title="Sign in to sync your trips"
              size="md"
              fullWidth
              onPress={handleSignIn}
              haptic="light"
              iconLeft={<Ionicons name="log-in-outline" size={18} color={colors.textOnBrand} />}
            />
          ) : (
            <Button
              title="Sign out"
              variant="ghost"
              size="md"
              fullWidth
              onPress={handleSignOut}
              haptic={false}
            />
          )}
        </Card>

        {/* ── Settings ───────────────────────────────────── */}
        <Text style={styles.sectionLabel}>SETTINGS</Text>
        <Card style={styles.settingsCard}>
          <SettingsRow
            icon="person-circle-outline"
            label="Account"
            sublabel="Email, currency, default origin"
            onPress={() => handleNavigate('/settings/account')}
          />
          <Divider />
          <SettingsRow
            icon="notifications-outline"
            label="Notifications"
            sublabel="Price drops · departure reminders"
            onPress={() => handleNavigate('/settings/notifications')}
          />
          <Divider />
          <SettingsRow
            icon="shield-checkmark-outline"
            label="Privacy Shield"
            sublabel="Your details never touch supplier marketing"
            onPress={() => handleNavigate('/settings/privacy-shield')}
          />
          <Divider />
          <SettingsRow
            icon="lock-closed-outline"
            label="Security"
            sublabel="Biometric lock, device cleanup"
            onPress={() => handleNavigate('/settings/security')}
          />
          <Divider />
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Ionicons name="finger-print" size={20} color={colors.brand} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>
                {biometricLabel(bioCap)}
              </Text>
              <Text style={styles.rowSublabel}>
                {bioCap.available
                  ? 'Lock the Trips tab and Trip Detail screens'
                  : 'Enrol Face ID / Touch ID on this device first'}
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

        {/* ── Help / Legal ───────────────────────────────── */}
        <Text style={styles.sectionLabel}>HELP &amp; LEGAL</Text>
        <Card style={styles.settingsCard}>
          <SettingsRow
            icon="help-circle-outline"
            label="Help &amp; Support"
            onPress={() => handleNavigate('/settings/help')}
          />
          <Divider />
          <SettingsRow
            icon="information-circle-outline"
            label="About"
            sublabel="Version, terms, privacy, refund policy"
            onPress={() => handleNavigate('/settings/about')}
          />
        </Card>

        {/* ── Account deletion (Apple Guideline 5.1.1(v)) ─ */}
        <Text style={styles.sectionLabel}>ACCOUNT MANAGEMENT</Text>
        <Card style={styles.settingsCard}>
          <Pressable
            onPress={handleDeleteAccount}
            accessibilityRole="button"
            accessibilityLabel="Delete account"
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <View style={[styles.rowIcon, styles.deleteIcon]}>
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, styles.deleteLabel]}>Delete Account</Text>
              <Text style={styles.rowSublabel}>
                Permanently remove your saved searches, deal alerts and sign-in.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.danger} />
          </Pressable>
        </Card>

        {/* ── Version footer ─────────────────────────────── */}
        <Text style={styles.versionFooter}>
          JetMeAway {appVersion} ({buildNumber})
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsRow({
  icon,
  label,
  sublabel,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={20} color={colors.brand} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sublabel ? <Text style={styles.rowSublabel}>{sublabel}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function biometricLabel(cap: BiometricCapability): string {
  if (cap.hasFaceId) return 'Face ID Lock';
  if (cap.hasTouchId) return 'Touch ID Lock';
  if (cap.hasFingerprint) return 'Fingerprint Lock';
  return 'Biometric Lock';
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceAlt },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  eyebrow: { ...typography.overline, color: colors.brand },
  heading: { ...typography.display, color: colors.textPrimary, marginBottom: spacing.sm },
  headerCard: { gap: spacing.md },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radii.xxl,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.h2,
    color: colors.textOnBrand,
    fontFamily: 'Poppins_900Black',
  },
  avatarText2: { flex: 1, gap: 4 },
  headerEmail: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  headerPills: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  sectionLabel: {
    ...typography.overline,
    color: colors.textMuted,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  settingsCard: {
    padding: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  rowPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brandSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowLabel: { ...typography.body, color: colors.textPrimary, fontFamily: 'Poppins_700Bold' },
  rowSublabel: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.md + 36 + spacing.md,
  },
  versionFooter: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  deleteIcon: {
    backgroundColor: colors.dangerSubtle,
  },
  deleteLabel: {
    color: colors.danger,
  },
});
