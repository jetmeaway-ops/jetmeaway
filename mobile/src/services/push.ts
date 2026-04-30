import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Push-notification service — first-launch opt-in, token capture, backend sync.
 *
 * iOS: requires Apple Developer push entitlement (auto-provisioned by EAS).
 * Android: uses FCM via the default sender; no manual config needed for Expo.
 *
 * The token is registered against the device once per install. We POST it to
 * `/api/push-token` on jetmeaway.co.uk so the backend can target the device for
 * deal alerts, booking confirmations, and price drops. If the network is down
 * at first launch, the token is cached locally and re-posted on next foreground.
 *
 * Apple App Store Guideline 4.2 ("Minimum Functionality") asks for at least one
 * native capability the web cannot deliver. Push is the headline. The web
 * cannot fire OS-level notifications when the app is closed; this can.
 */

const PUSH_TOKEN_KEY = 'jma:push:token';
const PUSH_TOKEN_SYNCED_KEY = 'jma:push:tokenSynced';
const TOKEN_ENDPOINT = 'https://jetmeaway.co.uk/api/push-token';

// Default presentation: show banner + play sound when a push lands while the
// app is foreground. iOS 14+ separates `shouldShowAlert` into `shouldShowBanner`
// + `shouldShowList`; setting both keeps behaviour consistent across SDK versions.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Request push permission and capture the device's Expo push token.
 * Idempotent — safe to call on every launch. Returns the token, or null
 * if permission was denied or the runtime is a simulator (which can't receive pushes).
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    // iOS simulator + Android emulator can't receive pushes. Skip silently.
    return null;
  }

  // Android: explicit channel registration. Without this, pushes arrive but
  // don't surface as banners on Android 8+.
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Deal Alerts',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0066FF',
      });
    } catch {
      // Channel exists already — fine.
    }
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const next = await Notifications.requestPermissionsAsync();
    status = next.status;
  }
  if (status !== 'granted') return null;

  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync();
    const token = tokenResponse.data;
    if (!token) return null;
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    return token;
  } catch (err) {
    console.error('[push] token fetch failed', err);
    return null;
  }
}

/**
 * POST the captured token to the backend. Idempotent — backend dedupes on
 * (token, platform). Local "synced" flag prevents repeated POSTs once
 * confirmed; we re-POST on next launch if the previous attempt failed.
 */
export async function syncPushTokenToBackend(token: string): Promise<boolean> {
  try {
    const synced = await AsyncStorage.getItem(PUSH_TOKEN_SYNCED_KEY);
    if (synced === token) return true;

    const res = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        platform: Platform.OS,
        appVersion: '1.0.5',
      }),
    });
    if (!res.ok) return false;

    await AsyncStorage.setItem(PUSH_TOKEN_SYNCED_KEY, token);
    return true;
  } catch (err) {
    console.error('[push] backend sync failed', err);
    return false;
  }
}
