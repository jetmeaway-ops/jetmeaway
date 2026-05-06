/**
 * Discover tab — Phase 1 placeholder. Phase 4 fills this with hot deals
 * carousels, curated trips, and trending searches. Today it just renders
 * a clean welcome card so the tab is nav-addressable.
 */

import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../src/components/primitives';
import { colors, spacing, typography } from '../../src/theme';

export default function DiscoverScreen() {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>WHERE NEXT?</Text>
        <Text style={styles.heading}>Discover</Text>
        <Text style={styles.lede}>
          Hot flight + hotel deals, curated trips, and trending destinations
          will live here.
        </Text>

        <Card variant="elevated" style={styles.placeholder}>
          <Text style={styles.placeholderTitle}>Coming in Phase 4</Text>
          <Text style={styles.placeholderBody}>
            Hot deals carousel · Curated trips · Trending searches · Brand
            partner strip.
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
