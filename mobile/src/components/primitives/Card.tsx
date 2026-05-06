/**
 * Card — surface primitive for grouping content. Default variant is a flat
 * surface with a border; `elevated` adds a brand-tinted shadow; `interactive`
 * is a Pressable that fires a haptic on tap.
 *
 * Padding is `lg` (16) by default and overridable via `padding` prop.
 *
 * Variants:
 *   - default      surface + 1px border
 *   - elevated     surface + brand-blue shadow (no border)
 *   - interactive  surface + border + Pressable + light haptic
 */

import React, { ReactNode, useCallback } from 'react';
import {
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  View,
  ViewProps,
  ViewStyle,
} from 'react-native';
import { colors, radii, shadows, spacing } from '../../theme';
import { haptics } from '../../hooks/useHaptics';

export type CardVariant = 'default' | 'elevated' | 'interactive';

type CommonProps = {
  variant?: CardVariant;
  padding?: keyof typeof spacing | 0;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

type StaticCardProps = CommonProps & Omit<ViewProps, 'style' | 'children'>;

type InteractiveCardProps = CommonProps & {
  variant: 'interactive';
  onPress: () => void;
  testID?: string;
  accessibilityLabel?: string;
} & Omit<PressableProps, 'onPress' | 'children' | 'style'>;

export type CardProps = StaticCardProps | InteractiveCardProps;

function isInteractive(p: CardProps): p is InteractiveCardProps {
  return p.variant === 'interactive';
}

export default function Card(props: CardProps) {
  const { variant = 'default', padding = 'lg', style, children } = props;
  const padPx = padding === 0 ? 0 : spacing[padding];

  // Hooks must run unconditionally — pull onPress out for both branches and
  // pass through useCallback every render. The no-op fallback covers
  // static-variant cards where onPress is undefined.
  const onPress = isInteractive(props) ? props.onPress : undefined;
  const handlePress = useCallback(() => {
    if (!onPress) return;
    haptics.light();
    onPress();
  }, [onPress]);

  const baseStyle: StyleProp<ViewStyle> = [
    styles.base,
    { padding: padPx },
    variant === 'elevated' && styles.elevated,
    (variant === 'default' || variant === 'interactive') && styles.bordered,
    style,
  ];

  if (isInteractive(props)) {
    const { accessibilityLabel, testID } = props;
    return (
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        style={({ pressed }) => [baseStyle, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={baseStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
  },
  bordered: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  elevated: {
    ...shadows.md,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.997 }],
  },
});
