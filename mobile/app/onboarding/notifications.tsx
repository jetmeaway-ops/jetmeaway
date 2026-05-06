/**
 * Onboarding · notifications — pre-permission rationale + the
 * `registerForPushNotifications()` call (which itself calls
 * `Notifications.requestPermissionsAsync()` and persists the Expo push
 * token to AsyncStorage). On grant we also kick off
 * `syncPushTokenToBackend()` so the server can target this device for
 * deal alerts immediately.
 *
 * Either grant or skip advances to the sign-in step.
 */

import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Button, Card } from '../../src/components/primitives';
import { colors, radii, spacing, typography } from '../../src/theme';
import { haptics } from '../../src/hooks/useHaptics';
import {
  registerForPushNotifications,
  syncPushTokenToBackend,
} from '../../src/services/push';

export default function NotificationsOnboardingScreen() {
  const router = useRouter();
  const [requesting, setRequesting] = useState(false);

  const handleAllow = async () => {
    setRequesting(true);
    try {
      const token = await registerForPushNotifications();
      if (token) {
        haptics.success();
        // Fire-and-forget — we've captured the token locally, the backend
        // sync is best-effort and retries on next foreground.
        syncPushTokenToBackend(token).catch(() => {});
      }
    } catch {
      /* permission API failure is non-fatal */
    } finally {
      setRequesting(false);
      router.push('/onboarding/signin');
    }
  };

  const handleSkip = () => {
    router.push('/onboarding/signin');
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.body}>
        <View style={styles.iconBubble}>
          <Ionicons name="notifications" size={48} color={colors.brand} />
        </View>

        <Text style={styles.eyebrow}>STEP 3 OF 4</Text>
        <Text style={styles.heading}>Catch price drops the moment they happen.</Text>
        <Text style={styles.lede}>
          We watch routes you save and ping you when the price drops 5% or
          more. No marketing blasts, no daily digest — just price alerts on
          trips you actually want.
        </Text>

        <Card variant="elevated" style={styles.bullets}>
          <Bullet icon="trending-down" text="Price-drop alerts on saved searches" />
          <Bullet icon="airplane" text="Booking confirmations + departure reminders" />
          <Bullet icon="settings" text="Toggle individual channels in Profile any time" />
        </Card>
      </View>

      <View style={styles.footer}>
        <Button
          title="Allow Notifications"
          onPress={handleAllow}
          fullWidth
          size="lg"
          loading={requesting}
          haptic="medium"
        />
        <Button
          title="Skip for now"
          variant="ghost"
          fullWidth
          onPress={handleSkip}
          haptic={false}
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
      <Ionicons name={icon} size={18} color={colors.brand} />
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
  bullets: { width: '100%', gap: spacing.sm },
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
