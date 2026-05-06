/**
 * Skeleton — pulsing loading placeholder. Drives the "no blank flashes"
 * UX in lists and detail screens while data is loading from the API.
 *
 * Uses Reanimated v4 — the pulse runs on the UI thread so it stays smooth
 * even when JS is busy hydrating.
 *
 * Variants:
 *   - rect (default)  rectangular block, configurable width/height/radius
 *   - circle          circular avatar / icon placeholder
 *   - text            single-line text-row placeholder (height ≈ body line height)
 *
 * Pass `width` / `height` as numbers (px) or strings ('100%' etc).
 */

import React, { useEffect } from 'react';
import { DimensionValue, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors, radii } from '../../theme';

export type SkeletonVariant = 'rect' | 'circle' | 'text';

type Props = {
  variant?: SkeletonVariant;
  width?: DimensionValue;
  height?: DimensionValue;
  /** Border radius for rect variant. Ignored for circle/text. */
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

export default function Skeleton({
  variant = 'rect',
  width,
  height,
  radius,
  style,
}: Props) {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 800 }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const variantStyle = VARIANT_STYLES[variant];
  const sizeStyle = {
    width: width ?? variantStyle.width,
    height: height ?? variantStyle.height,
    borderRadius: variant === 'circle' ? 9999 : radius ?? variantStyle.radius,
  };

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.base, sizeStyle, animatedStyle, style]}
    />
  );
}

const VARIANT_STYLES: Record<
  SkeletonVariant,
  { width: DimensionValue; height: DimensionValue; radius: number }
> = {
  rect: { width: '100%', height: 16, radius: 8 },
  circle: { width: 40, height: 40, radius: 9999 },
  text: { width: '70%', height: 14, radius: 4 },
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.sm,
  },
});
