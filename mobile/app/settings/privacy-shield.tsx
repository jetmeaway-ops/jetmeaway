/**
 * Privacy Shield screen — explainer for the merchant-of-record handoff
 * model. Marketing word for what's actually a Stripe / Nuitee MoR pattern
 * with a no-third-party-trackers checkout. Pure read-only screen, no
 * settings, no toggles.
 */

import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';

import { Card, Pill } from '../../src/components/primitives';
import { colors, radii, spacing, typography } from '../../src/theme';

const PILLARS: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  {
    icon: 'shield-checkmark',
    title: 'No data sold or shared',
    body: 'Your name, email, phone, and travel dates only ever go to the property fulfilling your stay — never to ad networks, data brokers, or partner mailing lists.',
  },
  {
    icon: 'card-outline',
    title: 'Card data never touches us',
    body: 'Apple Pay tokens stay in your secure enclave. Non-Apple-Pay cards go straight to Stripe — we never see a raw PAN, CVV, or expiry.',
  },
  {
    icon: 'mail-unread-outline',
    title: 'No retargeting after a booking',
    body: 'Most hotel chains add you to a marketing list the moment you book direct. We hand bookings off through Nuitee as merchant of record, so your inbox stays clean until you choose to subscribe.',
  },
  {
    icon: 'lock-closed-outline',
    title: 'Encrypted at rest on your device',
    body: 'Trips, saved searches, and preferences sit in MMKV, encrypted with the iOS Keychain. Even if someone has your phone, your booking history needs Face ID to unlock.',
  },
];

export default function PrivacyShieldScreen() {
  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Privacy Shield' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroBadge}>
          <Ionicons name="shield-checkmark" size={48} color={colors.brand} />
        </View>
        <Text style={styles.heading}>Your data, your trip</Text>
        <Text style={styles.lede}>
          Privacy Shield is how JetMeAway handles your booking information end
          to end. No dark patterns, no third-party trackers in checkout, no
          retargeting once you've booked.
        </Text>

        <View style={styles.pillsRow}>
          <Pill tone="brand">GDPR-aligned</Pill>
          <Pill tone="success">Stripe MoR</Pill>
          <Pill tone="neutral">ICO ZC125217</Pill>
        </View>

        {PILLARS.map((pillar) => (
          <Card key={pillar.title} variant="elevated" style={styles.pillarCard}>
            <View style={styles.pillarIcon}>
              <Ionicons name={pillar.icon} size={22} color={colors.brand} />
            </View>
            <View style={styles.pillarText}>
              <Text style={styles.pillarTitle}>{pillar.title}</Text>
              <Text style={styles.pillarBody}>{pillar.body}</Text>
            </View>
          </Card>
        ))}

        <Text style={styles.footnote}>
          Want the long version? Open Privacy Policy under About to read every
          clause in plain English.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceAlt },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  heroBadge: {
    alignSelf: 'center',
    width: 88,
    height: 88,
    borderRadius: radii.pill,
    backgroundColor: colors.brandSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  heading: {
    ...typography.h1,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  lede: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginVertical: spacing.md,
  },
  pillarCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  pillarIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.lg,
    backgroundColor: colors.brandSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillarText: { flex: 1, gap: 4 },
  pillarTitle: { ...typography.h3, color: colors.textPrimary },
  pillarBody: { ...typography.bodySm, color: colors.textSecondary },
  footnote: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
  },
});
