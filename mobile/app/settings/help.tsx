/**
 * Help screen — three native CTAs (email support, call support, report bug)
 * plus a short FAQ list.
 *
 * Email opens iOS Mail via mailto:; Call opens Phone via tel:; Report a bug
 * opens a prefilled mailto with device + app version baked in so the user
 * doesn't have to type "iOS 17.4 / Build 14" themselves.
 */

import { useCallback } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import Constants from 'expo-constants';

import { Card } from '../../src/components/primitives';
import { colors, radii, spacing, typography } from '../../src/theme';
import { haptics } from '../../src/hooks/useHaptics';

const SUPPORT_EMAIL = 'support@jetmeaway.co.uk';
const SUPPORT_PHONE = '+448000584462'; // 0800 058 4462 (E.164 for tel:)

const FAQS: { q: string; a: string }[] = [
  {
    q: 'Why are some prices different at checkout?',
    a: 'Suppliers re-quote when you start a booking — final price reflects live availability. We refund the difference automatically if drift is more than £2.',
  },
  {
    q: 'How do I cancel a booking?',
    a: 'Open the trip in Trips → Cancel. Refundable bookings cancel immediately; non-refundable hotels show the supplier policy on the trip detail.',
  },
  {
    q: 'Why does the app open Safari for some links?',
    a: 'Cars, packages, eSIM, insurance, and explore are partner sites — we redirect with all your search params filled in. Flights and hotels are bookable inside the app.',
  },
  {
    q: 'Is my card data stored on this device?',
    a: 'No. Apple Pay tokens never leave your secure enclave; non-Apple-Pay cards go straight to Stripe. JetMeAway never sees a raw card number.',
  },
  {
    q: 'How does Privacy Shield work?',
    a: 'Bookings hand off through our partner Nuitee acting as merchant of record. The hotel receives the reservation, but your personal data only lands at the property at check-in.',
  },
];

export default function HelpScreen() {
  const handleEmail = useCallback(() => {
    haptics.light();
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=JetMeAway%20support`).catch(
      () => {
        Alert.alert(
          'Email not configured',
          `Add a Mail account to your device, or write to ${SUPPORT_EMAIL} from a browser.`,
        );
      },
    );
  }, []);

  const handleCall = useCallback(() => {
    haptics.light();
    Linking.openURL(`tel:${SUPPORT_PHONE}`).catch(() => {
      Alert.alert(
        'Phone not available',
        `Dial 0800 058 4462 from another device, or email ${SUPPORT_EMAIL}.`,
      );
    });
  }, []);

  const handleReportBug = useCallback(() => {
    haptics.light();
    const version = Constants.expoConfig?.version ?? '1.0.6';
    const buildNumber =
      (Constants.expoConfig?.ios as { buildNumber?: string } | undefined)
        ?.buildNumber ?? '—';
    const body = encodeURIComponent(
      `Hi JetMeAway,\n\nI hit a bug:\n\n[Describe what happened]\n\n[Steps to reproduce]\n\n— App version: ${version} (${buildNumber})\n— Platform: ${Platform.OS} ${Platform.Version}\n`,
    );
    Linking.openURL(
      `mailto:${SUPPORT_EMAIL}?subject=JetMeAway%20bug%20report&body=${body}`,
    ).catch(() => {
      Alert.alert(
        'Email not configured',
        `Add a Mail account to your device, or write to ${SUPPORT_EMAIL}.`,
      );
    });
  }, []);

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Help & Support' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>GET IN TOUCH</Text>
        <Card style={[styles.card, styles.padNone]}>
          <ActionRow
            icon="mail-outline"
            label="Email support"
            sublabel={SUPPORT_EMAIL}
            onPress={handleEmail}
          />
          <Divider />
          <ActionRow
            icon="call-outline"
            label="Call support"
            sublabel="0800 058 4462 — UK freephone"
            onPress={handleCall}
          />
          <Divider />
          <ActionRow
            icon="bug-outline"
            label="Report a bug"
            sublabel="Opens an email with version + device pre-filled"
            onPress={handleReportBug}
          />
        </Card>

        <Text style={styles.sectionLabel}>FREQUENT QUESTIONS</Text>
        <Card style={[styles.card, styles.padNone]}>
          {FAQS.map((faq, i) => (
            <View
              key={faq.q}
              style={[styles.faqRow, i < FAQS.length - 1 && styles.faqRowBorder]}
            >
              <Text style={styles.faqQ}>{faq.q}</Text>
              <Text style={styles.faqA}>{faq.a}</Text>
            </View>
          ))}
        </Card>

        <Text style={styles.footnote}>
          Support hours: 9am – 9pm UK time, every day. Outside hours, email
          replies usually within 12 hours.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionRow({
  icon,
  label,
  sublabel,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.actionRow, pressed && styles.rowPressed]}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={20} color={colors.brand} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSublabel}>{sublabel}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

function Divider() {
  return <View style={styles.divider} />;
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
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  rowPressed: { backgroundColor: colors.surfaceMuted },
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
  divider: { height: 1, backgroundColor: colors.border, marginLeft: spacing.md + 36 + spacing.md },
  faqRow: { padding: spacing.md, gap: spacing.xs },
  faqRowBorder: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  faqQ: { ...typography.body, color: colors.textPrimary, fontFamily: 'Poppins_700Bold' },
  faqA: { ...typography.bodySm, color: colors.textSecondary },
  footnote: {
    ...typography.caption,
    color: colors.textMuted,
    paddingHorizontal: spacing.xs,
    marginTop: spacing.sm,
  },
});
