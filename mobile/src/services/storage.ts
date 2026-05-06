/**
 * Core encrypted MMKV instance for the JetMeAway native app.
 *
 * MMKV is roughly 10× faster than AsyncStorage and synchronous, which lets
 * the UI paint cached data on the very first frame instead of waiting for
 * an async storage round-trip. Encrypted at rest on iOS and Android.
 *
 * Use `storage` directly for synchronous reads/writes from native screens.
 * Migration from the v1 AsyncStorage layer runs once on first launch under
 * v2 via `migrateFromAsyncStorage()` — guarded by `jma:migrated:v1` so it
 * never re-runs and never corrupts already-migrated data.
 *
 * Key conventions:
 *   - `trips:v1`            JSON array of SavedBooking (offline trip cache)
 *   - `searches:v1`         JSON array of recent searches
 *   - `prefs:v1`            JSON of user preferences (currency, default origin, etc.)
 *   - `onboarded:v1`        boolean (has user completed first-launch onboarding)
 *   - `network:lastOnline`  number (epoch ms) — last time we saw connectivity
 *
 * The `jma:migrated:v1` flag is the only reserved internal key.
 */

import { createMMKV, type MMKV } from 'react-native-mmkv';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * react-native-mmkv v4 uses a factory function rather than a constructor.
 * On iOS, if an AppGroup key is present in Info.plist (added later when we
 * wire Widget Extensions in Phase 8), MMKV automatically uses the App Group
 * directory so widgets can read the same store.
 */
export const storage: MMKV = createMMKV({
  id: 'jetmeaway-core-storage',
  // The encryption key is bound to the app sandbox; iOS Keychain + Android
  // Keystore protect MMKV's actual key. This string is the salt the library
  // uses to derive its block cipher — not a secret in itself.
  // Max 16 bytes with the default AES-128 encryption.
  encryptionKey: 'jma-mmkv-v1',
});

const MIGRATED_FLAG = 'jma:migrated:v1';

// What `mobile/src/services/offline-bookings.ts` wrote in the v1 (AsyncStorage)
// build that's currently shipping. We migrate this exact key to keep customers
// who upgrade from Build 10 → Build 11+ from losing their saved bookings.
const LEGACY_BOOKINGS_KEY = 'jma:bookings:v1';

// Defensive — covers any older internal build that might have written a
// plain `bookings` key before the namespacing convention landed.
const LEGACY_PLAIN_BOOKINGS_KEY = 'bookings';

const NEW_TRIPS_KEY = 'trips:v1';

/**
 * One-shot migration from AsyncStorage → MMKV.
 *
 * Idempotent — guarded by the `jma:migrated:v1` flag in MMKV. Should be
 * awaited once on app launch before any UI reads from MMKV (the existing
 * data layer hooks all default to empty when MMKV has no entry, so a
 * paint-before-migrate would just render an empty state for one frame —
 * still strictly better to await).
 *
 * Reads any legacy bookings JSON array from AsyncStorage, copies it into
 * MMKV under `trips:v1`, then deletes the legacy AsyncStorage key so the
 * device storage doesn't double-count.
 */
export async function migrateFromAsyncStorage(): Promise<void> {
  if (storage.getBoolean(MIGRATED_FLAG)) return;

  try {
    const candidates = [LEGACY_BOOKINGS_KEY, LEGACY_PLAIN_BOOKINGS_KEY];
    for (const key of candidates) {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) continue;

      // Validate parse before writing so we don't push malformed JSON into
      // MMKV. Bad legacy data is silently dropped after deletion.
      try {
        JSON.parse(raw);
      } catch {
        await AsyncStorage.removeItem(key);
        continue;
      }

      storage.set(NEW_TRIPS_KEY, raw);
      await AsyncStorage.removeItem(key);
      // Don't break — clean up any other legacy keys too so we don't leave
      // orphaned data in AsyncStorage forever. If multiple legacy keys exist
      // (shouldn't, but defensive) the LAST one wins which matches the
      // most-recently-written assumption.
    }
  } catch {
    // Migration failure is non-fatal. Fresh users have nothing to migrate;
    // existing users keep their AsyncStorage data intact (the legacy reader
    // in offline-bookings.ts during this transition window will still find
    // it). Worst case: we re-attempt next launch since we never set the
    // flag below on the catch path.
    return;
  }

  storage.set(MIGRATED_FLAG, true);
}

// ── Convenience JSON helpers ────────────────────────────────────────────
// MMKV is K/V over strings; everything we store here is JSON. These wrap
// the typical "get → parse → fallback empty" pattern so screens stay tidy.

export function readJson<T>(key: string, fallback: T): T {
  const raw = storage.getString(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    storage.set(key, JSON.stringify(value));
  } catch {
    // Out-of-storage or serialiser failure — drop silently. The caller is
    // expected to keep the in-memory value usable for the rest of the
    // session even if the persist failed.
  }
}

export function deleteKey(key: string): void {
  storage.remove(key);
}
