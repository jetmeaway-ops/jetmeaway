/**
 * Flights stack — native top bar with brand-blue accents. Search form,
 * results entry, and (Phase 5+) detail / checkout / confirmation all
 * live under this stack.
 */

import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { colors } from '../../src/theme';

export default function FlightsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: colors.brand,
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: {
          fontFamily: 'Poppins_700Bold',
          fontSize: 17,
          color: colors.textPrimary,
        },
        headerBackTitle: 'Back',
        headerShadowVisible: false,
        animation: Platform.OS === 'ios' ? 'default' : 'fade_from_bottom',
      }}
    />
  );
}
