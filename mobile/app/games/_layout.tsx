/**
 * Games stack — sibling of (tabs), so the first screen doesn't get an
 * automatic back chevron. We render one explicitly via `headerLeft` so
 * the user always has a clear way back to the Trips tab on both iOS and
 * Android (Android also honours the system back button via the stack).
 *
 * Routes:
 *   /games              GameHub  (3-card launcher)
 *   /games/puzzle       Image puzzle
 *   /games/wordsearch   Word search
 */

import { Stack, useRouter } from 'expo-router';
import { Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../src/theme';

export default function GamesLayout() {
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
        animation: Platform.OS === 'ios' ? 'default' : 'fade_from_bottom',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Scout Lounge' }} />
      <Stack.Screen name="puzzle" options={{ title: 'Image puzzle' }} />
      <Stack.Screen name="wordsearch" options={{ title: 'Word search' }} />
      <Stack.Screen name="trivia" options={{ title: 'Travel trivia' }} />
    </Stack>
  );
}
