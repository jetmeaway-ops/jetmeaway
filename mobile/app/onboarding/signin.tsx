/**
 * Onboarding · sign-in — final onboarding step. Surfaces native
 * Apple Sign In + Google + an email-magic-link entry point.
 *
 * On any successful auth OR explicit skip, we set the
 * `jma:onboarded:v1` flag in MMKV to true and redirect into the main tab
 * stack. The flag is the only thing the app/index.tsx gate looks at, so
 * onboarding never replays.
 *
 * Native sign-in flow:
 *   1. `signInWithApple()` / `signInWithGoogle()` → returns `{ ok, idToken }`
 *      using the platform-native UI (system Apple Sign In, OAuth in
 *      browser sheet for Google).
 *   2. We POST the idToken to /api/account/social-signin via apiClient so
 *      the session cookie lands in NSHTTPCookieStorage. Once a WebView
 *      mounts later (any tab that loads jetmeaway.co.uk), the cookie
 *      auto-syncs to WKHTTPCookieStore via `sharedCookiesEnabled`.
 *   3. On 200 from the backend, we mark onboarded and route to /(tabs).
 */

import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Button } from '../../src/components/primitives';
import { colors, radii, spacing, typography } from '../../src/theme';
import { storage } from '../../src/services/storage';
import { apiClient } from '../../src/api/client';
import { signInWithApple, signInWithGoogle } from '../../src/services/auth';
import { haptics } from '../../src/hooks/useHaptics';

const ONBOARDED_KEY = 'jma:onboarded:v1';
const SIGNIN_ENDPOINT = '/api/account/social-signin';

export default function SignInOnboardingScreen() {
  const router = useRouter();
  const [busy, setBusy] = useState<null | 'apple' | 'google' | 'skip'>(null);
  const [error, setError] = useState<string | null>(null);

  const finishOnboarding = () => {
    storage.set(ONBOARDED_KEY, true);
    router.replace('/(tabs)/discover');
  };

  const handleApple = async () => {
    setError(null);
    setBusy('apple');
    try {
      const result = await signInWithApple();
      if (!result.ok) {
        // 'cancelled' is silent — user backed out, no error UI.
        if (result.error !== 'cancelled') setError(result.error);
        return;
      }
      await apiClient(SIGNIN_ENDPOINT, {
        method: 'POST',
        body: { idToken: result.idToken, provider: 'apple' },
      });
      haptics.success();
      finishOnboarding();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Apple sign-in failed.');
      haptics.error();
    } finally {
      setBusy(null);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setBusy('google');
    try {
      const result = await signInWithGoogle();
      if (!result.ok) {
        if (result.error !== 'cancelled') setError(result.error);
        return;
      }
      await apiClient(SIGNIN_ENDPOINT, {
        method: 'POST',
        body: { idToken: result.idToken, provider: 'google' },
      });
      haptics.success();
      finishOnboarding();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.');
      haptics.error();
    } finally {
      setBusy(null);
    }
  };

  const handleSkip = () => {
    setBusy('skip');
    haptics.light();
    finishOnboarding();
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.body}>
        <View style={styles.iconBubble}>
          <Ionicons name="lock-closed" size={42} color={colors.brand} />
        </View>

        <Text style={styles.eyebrow}>STEP 4 OF 4</Text>
        <Text style={styles.heading}>Sign in to save trips across devices.</Text>
        <Text style={styles.lede}>
          Your bookings sync to any device you sign in to, with biometric
          unlock for the trip wallet. We never sell your data — and the only
          thing you'll receive is the alerts you ask for.
        </Text>
      </View>

      <View style={styles.footer}>
        {Platform.OS === 'ios' ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={radii.md}
            style={styles.appleButton}
            onPress={handleApple}
          />
        ) : null}

        <Button
          title="Continue with Google"
          variant="secondary"
          onPress={handleGoogle}
          fullWidth
          size="lg"
          loading={busy === 'google'}
          haptic="light"
          iconLeft={<Ionicons name="logo-google" size={18} color={colors.brand} />}
        />

        <Button
          title="Skip for now"
          variant="ghost"
          fullWidth
          onPress={handleSkip}
          haptic={false}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Text style={styles.legal}>
          By continuing you agree to JetMeAway's Terms and Privacy Policy.
        </Text>
      </View>
    </SafeAreaView>
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
    width: 80,
    height: 80,
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
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  appleButton: {
    width: '100%',
    height: 56,
  },
  errorText: {
    ...typography.bodySm,
    color: colors.danger,
    textAlign: 'center',
  },
  legal: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
