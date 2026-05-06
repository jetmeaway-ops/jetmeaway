/**
 * useHaptics — thin wrapper around expo-haptics so screens can call
 * `haptics.light()` without remembering which Haptics enum value to pass.
 *
 * - `light()`     — selection / row-tap feedback
 * - `medium()`    — pull-to-refresh trigger, long-press, swipe-action commit
 * - `success()`   — booking confirmed, search saved, payment passed
 * - `error()`     — search failed, booking declined, network error
 * - `selection()` — tab change / segmented control / picker scroll
 *
 * All calls are fire-and-forget and swallow exceptions — haptics are a
 * polish layer, never a blocker. iOS gets the full Taptic Engine API;
 * Android gets the closest equivalent or a no-op.
 *
 * Hook is stable across renders (returns a memoised object) so it's safe
 * to drop into `useEffect` deps without retriggering.
 */

import { useMemo } from 'react';
import * as Haptics from 'expo-haptics';

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning' | 'selection';

export type HapticsAPI = {
  light: () => void;
  medium: () => void;
  heavy: () => void;
  success: () => void;
  error: () => void;
  warning: () => void;
  selection: () => void;
  fire: (style: HapticStyle) => void;
};

function safeCall(fn: () => Promise<unknown>): void {
  try {
    fn().catch(() => {});
  } catch {
    /* never throw from a haptic */
  }
}

export const haptics: HapticsAPI = {
  light: () => safeCall(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: () => safeCall(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  heavy: () => safeCall(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  success: () => safeCall(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  error: () => safeCall(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  warning: () => safeCall(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  selection: () => safeCall(() => Haptics.selectionAsync()),
  fire(style: HapticStyle) {
    switch (style) {
      case 'light': return this.light();
      case 'medium': return this.medium();
      case 'heavy': return this.heavy();
      case 'success': return this.success();
      case 'error': return this.error();
      case 'warning': return this.warning();
      case 'selection': return this.selection();
    }
  },
};

export function useHaptics(): HapticsAPI {
  // Stable identity — the singleton is referentially equal across renders.
  return useMemo(() => haptics, []);
}
