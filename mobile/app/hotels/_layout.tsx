/**
 * Hotels stack — same shape as flights/_layout. Search form + (Phase 6+)
 * native results / detail / checkout / confirmation.
 */

import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { colors } from '../../src/theme';

export default function HotelsLayout() {
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
