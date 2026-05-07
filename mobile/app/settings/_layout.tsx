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

import { Stack, useRouter } from 'expo-router';
import { Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../src/theme';

export default function SettingsLayout() {
  const router = useRouter();
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
        // /settings is mounted as a sibling of (tabs), so the FIRST screen
        // pushed here is the Settings stack root — expo-router's default
        // headerLeft hides the chevron in that case, leaving the user
        // stranded (Apple flagged this exact pattern in the Build 19
        // rejection thread). Always render a chevron and let router.back()
        // pop up to the parent navigator (the originating tab).
        headerLeft: () => (
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={{ paddingHorizontal: spacing.xs, paddingVertical: 4 }}
          >
            <Ionicons name="chevron-back" size={28} color={colors.brand} />
          </Pressable>
        ),
        // iOS slide-from-right is the default; Android uses fade.
        animation: Platform.OS === 'ios' ? 'default' : 'fade_from_bottom',
      }}
    />
  );
}
