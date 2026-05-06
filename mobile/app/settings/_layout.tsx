/**
 * Settings stack — native iOS header with back-chevron, brand-blue accents.
 * Each child screen sets its own title via `Stack.Screen` `options.title`.
 *
 * Routes:
 *   /settings/account           Account info + sign out
 *   /settings/notifications     Channel toggles (price drops, etc.)
 *   /settings/security          Biometric lock, erase-data, sign-out-everywhere
 *   /settings/help              Contact support, FAQ, report bug
 *   /settings/about             Version, terms, privacy, refund, licences
 *   /settings/privacy-shield    Explainer for the Privacy Shield concept
 */

import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { colors } from '../../src/theme';

export default function SettingsLayout() {
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
        // iOS slide-from-right is the default; Android uses fade.
        animation: Platform.OS === 'ios' ? 'default' : 'fade_from_bottom',
      }}
    />
  );
}
