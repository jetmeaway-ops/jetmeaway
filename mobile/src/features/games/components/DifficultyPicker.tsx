/**
 * DifficultyPicker — 4-segment selector (Easy / Medium / Hard / Extra).
 * Thin wrapper over the app's SegmentedControl so every game uses the
 * same visual + haptic feedback.
 */

import { View, Text, StyleSheet } from 'react-native';
import { SegmentedControl } from '../../../components/primitives';
import { colors, spacing, typography } from '../../../theme';
import { DIFFICULTY_LABELS, type Difficulty } from '../state/gamesStore';

type Props = {
  value: Difficulty;
  onChange: (next: Difficulty) => void;
  caption?: string;
};

export default function DifficultyPicker({ value, onChange, caption }: Props) {
  return (
    <View style={styles.wrap}>
      <SegmentedControl
        segments={DIFFICULTY_LABELS as unknown as string[]}
        selectedIndex={value}
        onChange={(i) => onChange(i as Difficulty)}
      />
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  caption: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
