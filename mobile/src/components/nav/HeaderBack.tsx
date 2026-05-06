/**
 * HeaderBack — reusable left-side header button that returns to the
 * Search tab. Used at the root of each category Stack (flights / hotels
 * / cars / packages / settings) so users always have a clear way out
 * even when the iOS native back chevron isn't available because the
 * stack only has one screen.
 *
 * Tap behaviour:
 *   - If there's something to pop in router history, pop it.
 *   - Otherwise replace to /(tabs)/search so the user lands on the
 *     category grid rather than getting stuck.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { colors, spacing, typography } from '../../theme';
import { haptics } from '../../hooks/useHaptics';

type Props = {
  fallback?: string;
  label?: string;
};

export default function HeaderBack({
  fallback = '/(tabs)/search',
  label = 'Back',
}: Props) {
  const router = useRouter();
  const onPress = () => {
    haptics.light();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallback as never);
    }
  };
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={12}
      style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
    >
      <View style={styles.row}>
        <Ionicons name="chevron-back" size={22} color={colors.brand} />
        <Text style={styles.label}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    marginLeft: -spacing.xxs,
  },
  btnPressed: { opacity: 0.6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  label: {
    ...typography.body,
    color: colors.brand,
    fontFamily: 'Poppins_700Bold',
  },
});
