/**
 * Account screen — surfaces signed-in identity, preferred currency, and
 * default origin airport. Sign-out lives here too (Phase 3 Profile already
 * has a sign-out button on the home; we duplicate intentionally so the
 * Settings stack feels complete).
 *
 * Currency + default origin are local prefs only — backend doesn't yet
 * persist them. When the backend exposes a /api/account/preferences PATCH
 * route we mirror the writes; until then MMKV is canonical.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
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
  fetchLiveSession,
  getCachedEmail,
  signOut,
} from '../../src/services/auth';
import {
  getPreferences,
  setPreference,
  type Preferences,
} from '../../src/services/preferences';

const CURRENCY_OPTIONS: { code: Preferences['preferredCurrency']; label: string; symbol: string }[] = [
  { code: 'GBP', label: 'British Pound', symbol: '£' },
  { code: 'USD', label: 'US Dollar', symbol: '$' },
  { code: 'EUR', label: 'Euro', symbol: '€' },
];

export default function AccountScreen() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Preferences>(() => getPreferences());

  useEffect(() => {
    getCachedEmail().then(setEmail);
    fetchLiveSession()
      .then((live) => {
        if (live) setEmail(live);
      })
      .catch(() => {});
  }, []);

  const handleCurrencyChange = useCallback(
    (code: Preferences['preferredCurrency']) => {
      haptics.light();
      setPrefs(setPreference('preferredCurrency', code));
    },
    [],
  );

  const handleSignOut = useCallback(() => {
    Alert.alert(
      'Sign out?',
      "You'll keep saved trips on this device, but new bookings won't sync until you sign in again.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            haptics.medium();
            await signOut();
            setEmail(null);
            router.back();
          },
        },
      ],
    );
  }, [router]);

  // App Store guideline 5.1.1(v) — fully native account-deletion flow.
  // POSTs to /api/account/delete with Accept: application/json. On success
  // we clear the local cache via signOut() and route back to the home tab.
  const deletingRef = useRef(false);
  const handleDeleteAccount = useCallback(() => {
    if (!email) {
      Alert.alert(
        'Sign in to delete',
        'You need to be signed in to delete your account.',
      );
      return;
    }
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (deletingRef.current) return;
            deletingRef.current = true;
            haptics.medium();
            try {
              const res = await fetch(
                'https://jetmeaway.co.uk/api/account/delete',
                {
                  method: 'POST',
                  credentials: 'include',
                  headers: { Accept: 'application/json' },
                },
              );
              const body = (await res.json().catch(() => null)) as
                | { ok?: boolean; error?: string }
                | null;

              if (res.ok && body?.ok) {
                await signOut();
                setEmail(null);
                haptics.success();
                Alert.alert(
                  'Account Deleted',
                  'Your account, saved searches and deal alerts have been removed. Booking records are retained where required by UK consumer law.',
                  [
                    {
                      text: 'OK',
                      onPress: () => router.replace('/(tabs)'),
                    },
                  ],
                );
                return;
              }

              if (res.status === 401 || body?.error === 'not_signed_in') {
                Alert.alert(
                  'Session expired',
                  'Please sign in again to delete your account.',
                );
                await signOut();
                setEmail(null);
                return;
              }

              Alert.alert(
                'Could not delete account',
                'Something went wrong on our side. Please try again in a moment.',
              );
            } catch {
              Alert.alert(
                'No internet connection',
                'Connect to the internet and try again to delete your account.',
              );
            } finally {
              deletingRef.current = false;
            }
          },
        },
      ],
    );
  }, [email, router]);

  const isSignedIn = !!email;

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Account' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>SIGNED IN AS</Text>
        <Card style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Ionicons name="mail-outline" size={20} color={colors.brand} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>
                {isSignedIn ? email : 'Not signed in'}
              </Text>
              {!isSignedIn ? (
                <Text style={styles.rowSublabel}>
                  Sign in to sync trips across devices and unlock saved searches.
                </Text>
              ) : null}
            </View>
          </View>
        </Card>

        <Text style={styles.sectionLabel}>PREFERENCES</Text>
        <Card style={[styles.card, styles.padNone]}>
          <Text style={styles.subheading}>Currency</Text>
          {CURRENCY_OPTIONS.map((opt, i) => (
            <Pressable
              key={opt.code}
              onPress={() => handleCurrencyChange(opt.code)}
              accessibilityRole="radio"
              accessibilityState={{ selected: prefs.preferredCurrency === opt.code }}
              style={({ pressed }) => [
                styles.optionRow,
                i < CURRENCY_OPTIONS.length - 1 && styles.optionRowBorder,
                pressed && styles.rowPressed,
              ]}
            >
              <View style={styles.optionRowLeft}>
                <Text style={styles.optionSymbol}>{opt.symbol}</Text>
                <View>
                  <Text style={styles.optionLabel}>{opt.label}</Text>
                  <Text style={styles.optionCode}>{opt.code}</Text>
                </View>
              </View>
              {prefs.preferredCurrency === opt.code ? (
                <Ionicons name="checkmark-circle" size={22} color={colors.brand} />
              ) : (
                <View style={styles.radioOff} />
              )}
            </Pressable>
          ))}
        </Card>

        <Text style={styles.sectionLabel}>DEFAULT ORIGIN AIRPORT</Text>
        <Card style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Ionicons name="airplane-outline" size={20} color={colors.brand} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>
                {prefs.defaultOrigin ?? 'Auto-detect from device location'}
              </Text>
              <Text style={styles.rowSublabel}>
                Used to prefill flight searches. Auto-detection runs once when you
                grant location permission.
              </Text>
            </View>
          </View>
        </Card>

        {isSignedIn ? (
          <View style={styles.signOutWrap}>
            <Button
              title="Sign out"
              variant="destructive"
              size="md"
              fullWidth
              onPress={handleSignOut}
              haptic={false}
            />
          </View>
        ) : null}

        {/* Account deletion — Apple Guideline 5.1.1(v). Always visible so a
            signed-out reviewer can still find the entry point. */}
        <Text style={styles.sectionLabel}>DANGER ZONE</Text>
        <Card style={styles.card}>
          <Pressable
            onPress={handleDeleteAccount}
            accessibilityRole="button"
            accessibilityLabel="Delete account"
            style={({ pressed }) => [styles.deleteRow, pressed && styles.rowPressed]}
          >
            <View style={[styles.rowIcon, styles.deleteIcon]}>
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, styles.deleteLabel]}>Delete Account</Text>
              <Text style={styles.rowSublabel}>
                Permanently remove your saved searches, deal alerts and sign-in.
                Booking records are retained as required by law.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.danger} />
          </Pressable>
        </Card>
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
  card: { gap: spacing.sm },
  padNone: { padding: 0 },
  subheading: {
    ...typography.caption,
    color: colors.textMuted,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
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
  rowPressed: { backgroundColor: colors.surfaceMuted },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  optionRowBorder: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionRowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  optionSymbol: {
    ...typography.h2,
    color: colors.brand,
    width: 28,
    textAlign: 'center',
  },
  optionLabel: { ...typography.body, color: colors.textPrimary, fontFamily: 'Poppins_700Bold' },
  optionCode: { ...typography.caption, color: colors.textMuted },
  radioOff: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
  },
  signOutWrap: { marginTop: spacing.md },
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.sm,
  },
  deleteIcon: {
    backgroundColor: colors.dangerSubtle,
  },
  deleteLabel: {
    color: colors.danger,
  },
});
