/**
 * User preferences — small, screen-shared MMKV bag.
 *
 * Single key `prefs:v1` holding a JSON object. Each preference has a default
 * so callers never deal with null. Writes are synchronous (MMKV) so toggle
 * UIs can paint the new value on the same frame.
 *
 * Schema is forward-compatible: unknown fields are preserved on read, missing
 * fields fall back to defaults — adding a new preference never invalidates
 * stored prefs.
 */

import { readJson, writeJson } from './storage';

const PREFS_KEY = 'prefs:v1';

export type NotificationChannel =
  | 'priceDrops'
  | 'bookingUpdates'
  | 'departureReminders'
  | 'marketing';

export type Preferences = {
  // Notification channels
  notifyPriceDrops: boolean;
  notifyBookingUpdates: boolean;
  notifyDepartureReminders: boolean;
  notifyMarketing: boolean;
  // App settings
  preferredCurrency: 'GBP' | 'USD' | 'EUR';
  defaultOrigin: string | null; // IATA code, e.g. "LON"
};

const DEFAULTS: Preferences = {
  notifyPriceDrops: true,
  notifyBookingUpdates: true,
  notifyDepartureReminders: true,
  notifyMarketing: false,
  preferredCurrency: 'GBP',
  defaultOrigin: null,
};

export function getPreferences(): Preferences {
  const stored = readJson<Partial<Preferences>>(PREFS_KEY, {});
  return { ...DEFAULTS, ...stored };
}

export function setPreference<K extends keyof Preferences>(
  key: K,
  value: Preferences[K],
): Preferences {
  const next = { ...getPreferences(), [key]: value };
  writeJson(PREFS_KEY, next);
  return next;
}

export function setPreferences(patch: Partial<Preferences>): Preferences {
  const next = { ...getPreferences(), ...patch };
  writeJson(PREFS_KEY, next);
  return next;
}

/**
 * Map a notification channel to its preference flag. Lets settings UI loop
 * over channels generically without four hand-written switches.
 */
export const NOTIFICATION_PREF_KEY: Record<NotificationChannel, keyof Preferences> = {
  priceDrops: 'notifyPriceDrops',
  bookingUpdates: 'notifyBookingUpdates',
  departureReminders: 'notifyDepartureReminders',
  marketing: 'notifyMarketing',
};
