/**
 * Search tab — Phase 1 placeholder. Phases 5–7 replace this with native
 * flight/hotel search forms + cars/packages/insurance/eSIM/explore tiles.
 */

import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../src/components/primitives';
import { colors, spacing, typography } from '../../src/theme';

export default function SearchScreen() {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>FIND YOUR TRIP</Text>
        <Text style={styles.heading}>Search</Text>
        <Text style={styles.lede}>
          Compare 15+ providers across flights, hotels, cars, packages, eSIM,
          insurance, and experiences.
        </Text>

        <Card variant="elevated" style={styles.placeholder}>
          <Text style={styles.placeholderTitle}>Coming in Phase 5–7</Text>
          <Text style={styles.placeholderBody}>
            Native flight + hotel search with Apple Pay checkout · Cars and
            packages prefilled into the partner search · eSIM and insurance
            comparison tiles.
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
  lede: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.md },
  placeholder: { gap: spacing.xs },
  placeholderTitle: { ...typography.h3, color: colors.textPrimary },
  placeholderBody: { ...typography.bodySm, color: colors.textSecondary },
});
