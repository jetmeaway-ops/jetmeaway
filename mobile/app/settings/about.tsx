/**
 * About screen — version footer + chevron rows that push into the WebView
 * shell for /terms, /privacy, /refund-policy, and /financial-protection.
 *
 * Licences open via expo-modules-core's open-source disclosures (Linking
 * fallback to a static page for now).
 */

import { useCallback } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import Constants from 'expo-constants';

import { Card } from '../../src/components/primitives';
import { colors, radii, spacing, typography } from '../../src/theme';
import { haptics } from '../../src/hooks/useHaptics';

type LegalRow = {
  slug: string;
  label: string;
  sublabel: string;
};

const LEGAL_ROWS: LegalRow[] = [
  { slug: 'terms', label: 'Terms of Service', sublabel: 'How JetMeAway works' },
  { slug: 'privacy', label: 'Privacy Policy', sublabel: 'What we collect, why' },
  { slug: 'refund-policy', label: 'Refund Policy', sublabel: 'When and how refunds apply' },
  { slug: 'financial-protection', label: 'Financial Protection', sublabel: 'ATOL coverage and Stripe MoR' },
];

export default function AboutScreen() {
  const router = useRouter();

  const appVersion = Constants.expoConfig?.version ?? '1.0.6';
  const buildNumber =
    (Constants.expoConfig?.ios as { buildNumber?: string } | undefined)
      ?.buildNumber ?? '—';

  const handleOpenLegal = useCallback(
    (slug: string) => {
      haptics.light();
      router.push(`/webview/${slug}`);
    },
    [router],
  );

  const handleOpenLicences = useCallback(() => {
    haptics.light();
    router.push('/webview/oss-licences');
  }, [router]);

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <Stack.Screen options={{ title: 'About' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brandWrap}>
          <Text style={styles.brandMark}>JetMeAway</Text>
          <Text style={styles.brandTag}>Travel comparison, no markup</Text>
        </View>

        <Text style={styles.sectionLabel}>LEGAL</Text>
        <Card style={[styles.card, styles.padNone]}>
          {LEGAL_ROWS.map((row, i) => (
            <Pressable
              key={row.slug}
              onPress={() => handleOpenLegal(row.slug)}
              accessibilityRole="link"
              accessibilityLabel={row.label}
              style={({ pressed }) => [
                styles.row,
                i < LEGAL_ROWS.length - 1 && styles.rowBorder,
                pressed && styles.rowPressed,
              ]}
            >
              <View style={styles.rowIcon}>
                <Ionicons name="document-text-outline" size={20} color={colors.brand} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <Text style={styles.rowSublabel}>{row.sublabel}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ))}
        </Card>

        <Text style={styles.sectionLabel}>BUILD</Text>
        <Card style={[styles.card, styles.padNone]}>
          <View style={[styles.row, styles.rowBorder]}>
            <View style={styles.rowIcon}>
              <Ionicons name="information-circle-outline" size={20} color={colors.brand} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Version</Text>
              <Text style={styles.rowSublabel}>{appVersion} ({buildNumber})</Text>
            </View>
          </View>
          <Pressable
            onPress={handleOpenLicences}
            accessibilityRole="link"
            accessibilityLabel="Open-source licences"
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <View style={styles.rowIcon}>
              <Ionicons name="code-slash-outline" size={20} color={colors.brand} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Open-source licences</Text>
              <Text style={styles.rowSublabel}>Third-party packages we use</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        </Card>

        <Text style={styles.companyBlock}>
          Jetmeaway Ltd · Companies House 17140522 · DUNS 234726109 · ICO ZC125217
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceAlt },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  brandWrap: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  brandMark: {
    ...typography.display,
    color: colors.brand,
  },
  brandTag: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
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
  companyBlock: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
});
