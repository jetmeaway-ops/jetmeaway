/**
 * Root layout — sits above the tab bar and the onboarding stack. Owns
 * cross-cutting providers (React Query, Gesture Handler, Safe Area) and
 * the one-shot AsyncStorage → MMKV migration that v1 → v2 upgraders need.
 *
 * Routing:
 *   /                  → app/index.tsx (gate; redirects based on the
 *                       jma:onboarded:v1 MMKV flag)
 *   /(tabs)/...        → app/(tabs)/_layout.tsx (4 native bottom tabs)
 *   /onboarding/...    → app/onboarding/_layout.tsx (welcome → location
 *                       → notifications → signin)
 *
 * Fonts: Poppins variants are loaded here via expo-font and held until
 * ready; the splash screen stays visible until both fonts and the storage
 * migration finish, so the first navigated frame is correctly typeset.
 */

import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { migrateFromAsyncStorage } from '../src/services/storage';

SplashScreen.preventAutoHideAsync().catch(() => {
  /* no-op — splash screen behaviour is best-effort */
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Live data feels live for a minute, then revalidates on focus.
      staleTime: 60_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      // Booking + sign-in flows must never silently retry on the user's
      // behalf — every retry is an explicit tap.
      retry: 0,
    },
  },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular: require('../assets/fonts/Poppins_400Regular.ttf'),
    Poppins_600SemiBold: require('../assets/fonts/Poppins_600SemiBold.ttf'),
    Poppins_700Bold: require('../assets/fonts/Poppins_700Bold.ttf'),
    Poppins_800ExtraBold: require('../assets/fonts/Poppins_800ExtraBold.ttf'),
    Poppins_900Black: require('../assets/fonts/Poppins_900Black.ttf'),
  });
  const [migrated, setMigrated] = useState(false);

  useEffect(() => {
    migrateFromAsyncStorage()
      .catch(() => {
        /* migration is non-fatal — a fresh install has nothing to migrate */
      })
      .finally(() => setMigrated(true));
  }, []);

  useEffect(() => {
    if (fontsLoaded && migrated) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, migrated]);

  if (!fontsLoaded || !migrated) {
    // Splash stays visible — returning null prevents an empty white frame
    // between native splash teardown and the first route mount.
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" options={{ animation: 'fade' }} />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="onboarding"
              options={{
                animation: 'fade',
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="settings"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="webview"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="flights"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="hotels"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="cars"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="packages"
              options={{ headerShown: false }}
            />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
