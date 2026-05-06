/**
 * SegmentedControl — iOS-style segmented control built on Pressable so it
 * respects our design tokens. The selected segment swaps to a brand-blue
 * pill; switching fires a selection haptic.
 *
 * Example:
 *   <SegmentedControl
 *     segments={['Upcoming', 'Past', 'Saved']}
 *     selectedIndex={tab}
 *     onChange={setTab}
 *   />
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { haptics } from '../../hooks/useHaptics';

type Props = {
  segments: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  testID?: string;
};

export default function SegmentedControl({
  segments,
  selectedIndex,
  onChange,
  testID,
}: Props) {
  return (
    <View style={styles.container} accessibilityRole="tablist" testID={testID}>
      {segments.map((label, i) => {
        const isSelected = i === selectedIndex;
        return (
          <Pressable
            key={label}
            onPress={() => {
              if (i === selectedIndex) return;
              haptics.selection();
              onChange(i);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            style={({ pressed }) => [
              styles.segment,
              isSelected && styles.segmentSelected,
              pressed && !isSelected && styles.segmentPressed,
            ]}
          >
            <Text
              style={[
                styles.label,
                isSelected ? styles.labelSelected : styles.labelInactive,
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentSelected: {
    backgroundColor: colors.surface,
    shadowColor: '#0066FF',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  segmentPressed: { opacity: 0.7 },
  label: {
    ...typography.caption,
    fontFamily: 'Poppins_700Bold',
  },
  labelSelected: { color: colors.brand },
  labelInactive: { color: colors.textSecondary },
});
