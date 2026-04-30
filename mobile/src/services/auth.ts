import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncPushTokenToBackend } from './push';

const PUSH_TOKEN_KEY = 'jma:push:token';
const PUSH_TOKEN_SYNCED_KEY = 'jma:push:tokenSynced';

/**
 * Native sign-in service — Apple + Google + session.
 *
 * Flow:
 *   1. Native triggers the social sign-in (system-level UI for Apple, OAuth
 *      consent for Google).
 *   2. Provider returns a signed JWT ID token containing email + sub.
 *   3. We POST the ID token to /api/account/social-signin on the backend.
 *   4. Backend verifies the JWT against Apple/Google JWKS, mints a session
 *      cookie, returns { success, email }.
 *   5. The cookie is automatically shared with the WebView via
 *      sharedCookiesEnabled, so the user is signed in across both surfaces.
 *
 * We also cache the email in expo-secure-store so the native UI can show
 * a "signed in as foo@bar" state without a network round-trip on launch.
 * The cookie remains the source of truth for auth — the cached email is
 * only a UX hint and is cleared on signOut.
 */

const SIGNIN_ENDPOINT = 'https://jetmeaway.co.uk/api/account/social-signin';
const SIGNOUT_ENDPOINT = 'https://jetmeaway.co.uk/api/account/signout';
const ME_ENDPOINT = 'https://jetmeaway.co.uk/api/account/me';

const SECURE_EMAIL_KEY = 'jma:auth:email';

// Google client IDs come from app.json `extra.googleAuth.*`. iOS uses the iOS
// client ID, Android uses the Android client ID — they MUST be the same OAuth
// project but separate per-platform client IDs.
function getGoogleConfig() {
  const extra = (Constants.expoConfig?.extra ?? {}) as {
    googleAuth?: {
      iosClientId?: string;
      androidClientId?: string;
      webClientId?: string;
    };
  };
  return extra.googleAuth ?? {};
}

export type SignInResult = { ok: true; email: string } | { ok: false; error: string };

async function postIdToken(provider: 'apple' | 'google', idToken: string): Promise<SignInResult> {
  try {
    const res = await fetch(SIGNIN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, idToken }),
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success || typeof data.email !== 'string') {
      return { ok: false, error: typeof data?.error === 'string' ? data.error : 'Sign-in failed' };
    }
    await SecureStore.setItemAsync(SECURE_EMAIL_KEY, data.email);
    // Re-sync the push token so the backend can bind it to the new email.
    // /api/push-token reads the session cookie and SADDs into push:by-email
    // on every call. Resetting the synced flag forces a re-POST even if the
    // token itself hasn't changed.
    await rebindPushToEmail();
    return { ok: true, email: data.email };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

async function rebindPushToEmail(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (!token) return;
    // Forget the previously-synced flag so syncPushTokenToBackend re-POSTs.
    await AsyncStorage.removeItem(PUSH_TOKEN_SYNCED_KEY);
    await syncPushTokenToBackend(token);
  } catch {
    // Non-fatal — the alert fan-out just won't include this device until
    // the next launch's syncPushTokenToBackend call picks up the session.
  }
}

/* ── Apple ──────────────────────────────────────────────────────────── */

export async function signInWithApple(): Promise<SignInResult> {
  if (Platform.OS !== 'ios') {
    // Apple Sign In on Android is possible via web flow, but not supported
    // in this native shell. Fall back to magic link / Google on Android.
    return { ok: false, error: 'Sign in with Apple is only available on iOS in this app.' };
  }
  const available = await AppleAuthentication.isAvailableAsync();
  if (!available) {
    return { ok: false, error: 'Sign in with Apple is not available on this device.' };
  }
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      ],
    });
    const idToken = credential.identityToken;
    if (!idToken) {
      return { ok: false, error: 'Apple did not return an identity token.' };
    }
    return postIdToken('apple', idToken);
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === 'ERR_REQUEST_CANCELED' || code === 'ERR_CANCELED') {
      return { ok: false, error: 'cancelled' };
    }
    return { ok: false, error: err instanceof Error ? err.message : 'Apple sign-in failed' };
  }
}

/* ── Google ─────────────────────────────────────────────────────────── */

/**
 * Google sign-in via expo-auth-session. Uses the platform-specific client ID
 * from app.json.extra.googleAuth — iosClientId on iOS, androidClientId on
 * Android. Requests `openid email profile` to get an ID token with the email
 * claim.
 *
 * Note: this returns the ID token, NOT the access token. We don't need the
 * access token because the backend only verifies the ID token signature —
 * we never make Google API calls on the user's behalf.
 */
export async function signInWithGoogle(): Promise<SignInResult> {
  const cfg = getGoogleConfig();
  const clientId = Platform.OS === 'ios'
    ? cfg.iosClientId
    : Platform.OS === 'android'
      ? cfg.androidClientId
      : cfg.webClientId;

  if (!clientId) {
    return {
      ok: false,
      error: `Google sign-in not configured for ${Platform.OS}. Set extra.googleAuth.${Platform.OS === 'ios' ? 'iosClientId' : 'androidClientId'} in app.json.`,
    };
  }

  try {
    // expo-auth-session's Google provider handles the discovery + redirect
    // boilerplate. `useProxy: false` because we use platform native redirect
    // schemes (iOS reverse-DNS, Android package).
    const redirectUri = AuthSession.makeRedirectUri({
      scheme: 'uk.co.jetmeaway.app',
      path: 'oauth2redirect',
    });

    const discovery = {
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
      revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
    };

    const request = new AuthSession.AuthRequest({
      clientId,
      scopes: ['openid', 'email', 'profile'],
      redirectUri,
      responseType: AuthSession.ResponseType.IdToken,
      // Nonce required for ID-token response. expo-auth-session generates one
      // automatically when responseType=IdToken, but pass explicitly for clarity.
      extraParams: { nonce: await generateNonce() },
    });

    const result = await request.promptAsync(discovery);
    if (result.type === 'cancel' || result.type === 'dismiss') {
      return { ok: false, error: 'cancelled' };
    }
    if (result.type !== 'success') {
      return { ok: false, error: 'Google sign-in failed' };
    }

    const idToken = result.params?.id_token;
    if (!idToken) {
      return { ok: false, error: 'Google did not return an ID token.' };
    }
    return postIdToken('google', idToken);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Google sign-in failed' };
  }
}

async function generateNonce(): Promise<string> {
  // 16 random bytes hex-encoded — matches OIDC nonce format expectations.
  const Crypto = await import('expo-crypto');
  const bytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/* ── Session ────────────────────────────────────────────────────────── */

export async function signOut(): Promise<{ ok: boolean }> {
  try {
    await fetch(SIGNOUT_ENDPOINT, { method: 'POST', credentials: 'include' });
  } catch {
    // Network failure on sign-out is recoverable — the cookie expires on
    // its own, and we always clear the local cache below.
  }
  await SecureStore.deleteItemAsync(SECURE_EMAIL_KEY);
  // Re-register the push token with no session cookie attached so the
  // backend drops the (token → email) binding for this device. Without
  // this, the previous user's saved-search alerts would keep arriving on
  // a shared device after sign-out.
  await rebindPushToEmail();
  return { ok: true };
}

export async function getCachedEmail(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(SECURE_EMAIL_KEY);
  } catch {
    return null;
  }
}

/**
 * Check the live session via /api/account/me. Returns the verified email
 * if signed in, or null otherwise. Network failures return null without
 * clearing the cache (we'd rather show a stale signed-in state than log
 * the user out incorrectly).
 */
export async function fetchLiveSession(): Promise<string | null> {
  try {
    const res = await fetch(ME_ENDPOINT, { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.success && typeof data.email === 'string') {
      await SecureStore.setItemAsync(SECURE_EMAIL_KEY, data.email);
      return data.email;
    }
    return null;
  } catch {
    return null;
  }
}
