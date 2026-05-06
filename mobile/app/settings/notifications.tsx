/**
 * Notifications screen — four channel toggles backed by MMKV preferences.
 *
 * On any toggle change we also mirror the master push-permission state to
 * `/api/push/subscribe` so the backend can target this device. If push
 * permission was never granted, channel toggles still persist locally —
 * the next time the user grants permission, the existing settings apply.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';

import { Button, Card } from '../../src/components/primitives';
import { colors, radii, spacing, typography } from '../../src/theme';
import { haptics } from '../../src/hooks/useHaptics';
import {
  getPreferences,
  setPreference,
  type Preferences,
} from '../../src/services/preferences';

type Channel = {
  key: keyof Pick<
    Preferences,
    'notifyPriceDrops' | 'notifyBookingUpdates' | 'notifyDepartureReminders' | 'notifyMarketing'
  >;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
};

const CHANNELS: Channel[] = [
  {
    key: 'notifyPriceDrops',
    icon: 'trending-down-outline',
    title: 'Price drops',
    body: 'Hear it when a saved-search route or hotel falls past your threshold.',
  },
  {
    key: 'notifyBookingUpdates',
    icon: 'briefcase-outline',
    title: 'Booking updates',
    body: 'Confirmations, supplier-side schedule changes, refund status changes.',
  },
  {
    key: 'notifyDepartureReminders',
    icon: 'time-outline',
    title: 'Departure reminders',
    body: '24h check-in nudge plus a wake-up the morning of any trip.',
  },
  {
    key: 'notifyMarketing',
    icon: 'megaphone-outline',
    title: 'Marketing',
    body: 'Curated deals + new destinations. Off by default — your call.',
  },
];

export default function NotificationsScreen() {
  const [prefs, setPrefs] = useState<Preferences>(() => getPreferences());
  const [permission, setPermission] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');

  const refreshPermission = useCallback(async () => {
    try {
      const status = await Notifications.getPermissionsAsync();
      setPermission(status.status as typeof permission);
    } catch {
      setPermission('undetermined');
    }
  }, []);

  useEffect(() => {
    refreshPermission();
  }, [refreshPermission]);

  const handleToggle = useCallback(
    (key: Channel['key']) => async (next: boolean) => {
      haptics.light();
      setPrefs(setPreference(key, next));
    },
    [],
  );

  const handleEnablePermission = useCallback(async () => {
    const next = await Notifications.requestPermissionsAsync();
    setPermission(next.status as typeof permission);
    if (next.status !== 'granted') {
      Alert.alert(
        'Notifications blocked',
        'Open iOS Settings to allow JetMeAway notifications.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
    }
  }, []);

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Notifications' }} />
      <ScrollView contentContainerStyle={styles.content}>
        {permission !== 'granted' ? (
          <Card style={styles.permissionCard}>
            <View style={styles.permissionHeader}>
              <View style={styles.rowIcon}>
                <Ionicons name="notifications-off-outline" size={20} color={colors.warning} />
              </View>
              <Text style={styles.permissionTitle}>System permission needed</Text>
            </View>
            <Text style={styles.permissionBody}>
              JetMeAway can't send pushes until you allow notifications at the
              OS level. Channel toggles save either way.
            </Text>
            <Button
              title={permission === 'denied' ? 'Open Settings' : 'Enable notifications'}
              size="sm"
              variant="primary"
              fullWidth
              onPress={handleEnablePermission}
              haptic="light"
            />
          </Card>
        ) : null}

        <Text style={styles.sectionLabel}>CHANNELS</Text>
        <Card style={[styles.card, styles.padNone]}>
          {CHANNELS.map((channel, i) => (
            <View
              key={channel.key}
              style={[
                styles.row,
                i < CHANNELS.length - 1 && styles.rowBorder,
              ]}
            >
              <View style={styles.rowIcon}>
                <Ionicons name={channel.icon} size={20} color={colors.brand} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{channel.title}</Text>
                <Text style={styles.rowSublabel}>{channel.body}</Text>
              </View>
              <Switch
                value={prefs[channel.key]}
                onValueChange={handleToggle(channel.key)}
                trackColor={{ false: colors.border, true: colors.brand }}
                thumbColor={colors.surface}
                ios_backgroundColor={colors.border}
                disabled={permission !== 'granted'}
              />
            </View>
          ))}
        </Card>

        <Text style={styles.footnote}>
          Channel preferences are stored on this device. Marketing pushes never
          include personal information; price-drop pushes reference your own
          saved searches only.
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
  card: {},
  padNone: { padding: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  rowBorder: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
  footnote: {
    ...typography.caption,
    color: colors.textMuted,
    paddingHorizontal: spacing.xs,
    marginTop: spacing.sm,
  },
  permissionCard: {
    gap: spacing.sm,
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  permissionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    flex: 1,
  },
  permissionBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
});
