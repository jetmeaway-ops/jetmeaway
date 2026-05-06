/**
 * Button — primary CTA primitive. iOS-style press feedback, automatic
 * haptic on tap (configurable), loading state with embedded spinner,
 * left + right icon slots.
 *
 * Variants:
 *   - primary     brand-blue background, white text (default)
 *   - secondary   outlined, brand-blue text
 *   - ghost       transparent, brand-blue text
 *   - destructive red background, white text
 *
 * Sizes: sm | md | lg.  Set `fullWidth` to stretch the button across the
 * available row.
 *
 * Accessibility: `accessibilityRole="button"`, label sourced from `title`
 * unless `accessibilityLabel` is supplied. Disabled + loading both set
 * `accessibilityState.disabled = true`.
 */

import React, { ReactNode, useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { haptics, type HapticStyle } from '../../hooks/useHaptics';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

type Props = {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  /** Set false to suppress haptic on press, or pass a specific style. */
  haptic?: HapticStyle | false;
  accessibilityLabel?: string;
  testID?: string;
} & Omit<PressableProps, 'onPress' | 'children' | 'style' | 'disabled'>;

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  iconLeft,
  iconRight,
  haptic = 'light',
  accessibilityLabel,
  testID,
  ...rest
}: Props) {
  const isInactive = disabled || loading;

  const handlePress = useCallback(() => {
    if (isInactive) return;
    if (haptic !== false) haptics.fire(haptic);
    onPress?.();
  }, [isInactive, haptic, onPress]);

  const palette = VARIANT_PALETTES[variant];
  const dims = SIZE_DIMS[size];

  return (
    <Pressable
      {...rest}
      onPress={handlePress}
      disabled={isInactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: isInactive, busy: loading }}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          height: dims.height,
          paddingHorizontal: dims.paddingHorizontal,
          opacity: pressed && !isInactive ? 0.85 : 1,
        },
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={palette.fg} />
        ) : (
          <>
            {iconLeft ? <View style={styles.iconLeft}>{iconLeft}</View> : null}
            <Text
              style={[
                typography[dims.typography],
                { color: palette.fg, fontFamily: 'Poppins_700Bold' },
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
            {iconRight ? <View style={styles.iconRight}>{iconRight}</View> : null}
          </>
        )}
      </View>
    </Pressable>
  );
}

const VARIANT_PALETTES: Record<
  ButtonVariant,
  { bg: string; fg: string; border: string }
> = {
  primary: {
    bg: colors.brand,
    fg: colors.textOnBrand,
    border: colors.brand,
  },
  secondary: {
    bg: colors.surface,
    fg: colors.brand,
    border: colors.brand,
  },
  ghost: {
    bg: 'transparent',
    fg: colors.brand,
    border: 'transparent',
  },
  destructive: {
    bg: colors.danger,
    fg: colors.textOnBrand,
    border: colors.danger,
  },
};

const SIZE_DIMS: Record<
  ButtonSize,
  { height: number; paddingHorizontal: number; typography: 'caption' | 'bodySm' | 'body' }
> = {
  sm: { height: 36, paddingHorizontal: spacing.md, typography: 'caption' },
  md: { height: 48, paddingHorizontal: spacing.lg, typography: 'bodySm' },
  lg: { height: 56, paddingHorizontal: spacing.xl, typography: 'body' },
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: { marginRight: spacing.xs },
  iconRight: { marginLeft: spacing.xs },
  fullWidth: { alignSelf: 'stretch' },
  disabled: { opacity: 0.5 },
});
