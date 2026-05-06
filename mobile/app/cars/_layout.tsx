/**
 * Cars stack — native Stack with brand-blue header. Forms a thin native
 * shell over the affiliate-redirect /cars page.
 */

import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { colors } from '../../src/theme';

export default function CarsLayout() {
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
