/**
 * Onboarding · welcome — first screen of the cold-launch flow.
 * Introduces the "Personal Travel Scout" value prop and three concrete
 * differentiators (Direct Advantage, no markups, real prices), then
 * pushes the user to the location-permission step.
 */

import { Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Button } from '../../src/components/primitives';
import { colors, radii, spacing, typography } from '../../src/theme';

const VALUE_PROPS: Array<{ icon: keyof typeof Ionicons.glyphMap; title: string; body: string }> = [
  {
    icon: 'navigate-circle',
    title: 'Your Personal Travel Scout',
    body: 'We compare 15+ providers in seconds and surface the genuinely cheapest option — never the one paying us most.',
  },
  {
    icon: 'pricetag',
    title: 'Real prices, no markups',
    body: 'The price you see is the price the supplier charges. Zero booking fees, zero hidden margins.',
  },
  {
    icon: 'shield-checkmark',
    title: 'Earn the journey',
    body: 'Direct booking, biometric-locked offline access, and Apple Pay at checkout — your details never leave your device until the booking lands.',
  },
];

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.hero}>
        <View style={styles.iconBubble}>
          <Ionicons name="paper-plane" size={56} color={colors.textOnBrand} />
        </View>
        <Text style={styles.eyebrow}>WELCOME TO JETMEAWAY</Text>
        <Text style={styles.heading}>Travel, decoded.</Text>
        <Text style={styles.lede}>
          The travel comparison engine that puts you, not the affiliate
          payout, first.
        </Text>
      </View>

      <View style={styles.valueProps}>
        {VALUE_PROPS.map((vp) => (
          <View key={vp.title} style={styles.valueRow}>
            <View style={styles.valueIcon}>
              <Ionicons name={vp.icon} size={22} color={colors.brand} />
            </View>
            <View style={styles.valueText}>
              <Text style={styles.valueTitle}>{vp.title}</Text>
              <Text style={styles.valueBody}>{vp.body}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Button
          title="Get Started"
          onPress={() => router.push('/onboarding/location')}
          fullWidth
          size="lg"
          haptic="medium"
        />
        <Text style={styles.footerNote}>
          Takes about 30 seconds. You can change permissions any time.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  hero: {
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  iconBubble: {
    width: 96,
    height: 96,
    borderRadius: radii.xxl,
    backgroundColor: colors.brand,
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
    ...typography.display,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  lede: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  valueProps: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    gap: spacing.lg,
    justifyContent: 'center',
  },
  valueRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  valueIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.brandSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  valueText: { flex: 1 },
  valueTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: 2 },
  valueBody: { ...typography.bodySm, color: colors.textSecondary },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  footerNote: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
