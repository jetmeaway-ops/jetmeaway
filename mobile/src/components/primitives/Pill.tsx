/**
 * Pill — compact status indicator. Used for booking-status chips, "Scout
 * Approved" / "Scout Warning" badges, refundability hints, deal labels.
 *
 * Tones map to semantic theme tokens — pass intent, not colour.
 *
 * Tones:
 *   - neutral  surface + textSecondary
 *   - brand    brandSubtle + brand
 *   - success  successSubtle + success
 *   - warning  warningSubtle + warning
 *   - danger   dangerSubtle + danger
 *
 * Optional `iconLeft` slot lives left of the label (e.g. dot indicator,
 * status icon, airline logo).
 */

import React, { ReactNode } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';

export type PillTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger';

type Props = {
  children: ReactNode;
  tone?: PillTone;
  iconLeft?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export default function Pill({
  children,
  tone = 'neutral',
  iconLeft,
  style,
  testID,
}: Props) {
  const palette = TONE_PALETTES[tone];
  return (
    <View
      style={[
        styles.base,
        { backgroundColor: palette.bg, borderColor: palette.border },
        style,
      ]}
      testID={testID}
    >
      {iconLeft ? <View style={styles.iconLeft}>{iconLeft}</View> : null}
      <Text style={[typography.overline, { color: palette.fg }]} numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
}

const TONE_PALETTES: Record<
  PillTone,
  { bg: string; fg: string; border: string }
> = {
  neutral: {
    bg: colors.surfaceAlt,
    fg: colors.textSecondary,
    border: colors.border,
  },
  brand: {
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
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  iconLeft: { marginRight: spacing.xxs },
});
