/**
 * Onboarding stack — 4 sequential screens with native push transitions.
 *
 * Order: welcome → location → notifications → signin → /(tabs)/discover
 *
 * Gestures are disabled — onboarding is a forward-only flow. Users can
 * always come back later via the in-app Profile / Settings screens to
 * change permissions.
 */

import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        animation: 'slide_from_right',
      }}
    />
  );
}
