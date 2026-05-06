/**
 * Profile tab — Phase 1 placeholder. Phase 3 builds the full account
 * surface (auth state, push prefs, biometric toggle, app info).
 */

import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../src/components/primitives';
import { colors, spacing, typography } from '../../src/theme';

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>YOUR ACCOUNT</Text>
        <Text style={styles.heading}>Profile</Text>

        <Card variant="elevated" style={styles.placeholder}>
          <Text style={styles.placeholderTitle}>Coming in Phase 3</Text>
          <Text style={styles.placeholderBody}>
            Account · Notifications · Security (Face ID / Touch ID lock) ·
            Help and support · App version + legal.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceAlt },
  content: { padding: spacing.lg, gap: spacing.md },
  eyebrow: { ...typography.overline, color: colors.brand },
  heading: { ...typography.display, color: colors.textPrimary },
  placeholder: { gap: spacing.xs },
  placeholderTitle: { ...typography.h3, color: colors.textPrimary },
  placeholderBody: { ...typography.bodySm, color: colors.textSecondary },
});
