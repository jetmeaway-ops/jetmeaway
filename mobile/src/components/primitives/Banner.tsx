/**
 * Banner — full-width informational strip used for offline indicators,
 * price-drift warnings, info messages, etc.
 *
 * Tones map to semantic theme tokens. The `offline` tone is a thin
 * convenience: same look as `warning` but pre-canned for the network
 * banner pattern (`useNetwork().online === false`).
 *
 * Optional `onDismiss` renders a close affordance and fires a light
 * haptic on tap.
 */

import React, { ReactNode, useCallback } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { haptics } from '../../hooks/useHaptics';

export type BannerTone = 'info' | 'success' | 'warning' | 'danger' | 'offline';

type Props = {
  message: string;
  title?: string;
  tone?: BannerTone;
  iconLeft?: ReactNode;
  onDismiss?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export default function Banner({
  message,
  title,
  tone = 'info',
  iconLeft,
  onDismiss,
  style,
  testID,
}: Props) {
  const palette = TONE_PALETTES[tone];

  const handleDismiss = useCallback(() => {
    haptics.light();
    onDismiss?.();
  }, [onDismiss]);

  return (
    <View
      accessibilityRole={tone === 'danger' ? 'alert' : undefined}
      style={[
        styles.base,
        { backgroundColor: palette.bg, borderColor: palette.border },
        style,
      ]}
      testID={testID}
    >
      {iconLeft ? <View style={styles.iconLeft}>{iconLeft}</View> : null}
      <View style={styles.body}>
        {title ? (
          <Text
            style={[typography.caption, { color: palette.fg, marginBottom: 2 }]}
            numberOfLines={1}
          >
            {title}
          </Text>
        ) : null}
        <Text style={[typography.bodySm, { color: palette.fg }]}>
          {message}
        </Text>
      </View>
      {onDismiss ? (
        <Pressable
          onPress={handleDismiss}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        >
          <Text style={[typography.caption, { color: palette.fg }]}>
            Dismiss
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const TONE_PALETTES: Record<
  BannerTone,
  { bg: string; fg: string; border: string }
> = {
  info: {
    bg: colors.brandSubtle,
    fg: colors.brandHover,
    border: colors.brandMuted,
  },
  success: {
    bg: colors.successSubtle,
    fg: colors.successStrong,
    border: colors.successSubtle,
  },
  warning: {
    bg: colors.warningSubtle,
    fg: colors.warning,
    border: colors.warningSubtle,
  },
  danger: {
    bg: colors.dangerSubtle,
    fg: colors.dangerStrong,
    border: colors.dangerSubtle,
  },
  // Same visual as warning but semantically distinct so screens can grep
  // for "offline" usage when auditing.
  offline: {
    bg: colors.warningSubtle,
    fg: colors.warning,
    border: colors.warningSubtle,
  },
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  iconLeft: { marginRight: spacing.xs },
  body: { flex: 1 },
});
