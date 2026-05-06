/**
 * Offline bookings — local copy of the user's most recent booking confirmations
 * so they can pull up the details at the airport with no signal.
 *
 * Apple Guideline 4.2 case: this is a native capability the web cannot deliver.
 * Web has no persistent device storage that survives an airplane-mode flight
 * connection drop; MMKV gives us encrypted, sub-millisecond local storage on
 * every device.
 *
 * Source of bookings: the WebView on /success/[id] posts a message to the
 * native shell with the booking JSON. The shell calls saveBooking() — the
 * resulting list is then renderable by the native Trips screen even when
 * offline.
 *
 * Storage backend: encrypted MMKV v4 instance from `./storage`. Migration
 * from the legacy AsyncStorage key (jma:bookings:v1 in production) is run
 * once at app launch by `migrateFromAsyncStorage()` — see storage.ts.
 *
 * API stays async-typed (Promise<...>) for backward compatibility with the
 * existing callers in App.tsx and MyTripsModal.tsx. MMKV is actually
 * synchronous; sync helpers are exposed alongside for first-frame paint.
 */

import { storage, readJson, writeJson, deleteKey } from './storage';

export type SavedBooking = {
  id: string;            // booking reference (JMA-... or supplier ref)
  type: 'flight' | 'hotel' | 'package';
  title: string;         // e.g. "Bulgari Hotel Milano" / "British Airways BA123"
  subtitle?: string;     // e.g. "3 nights · 2 guests"
  startDate?: string;    // ISO yyyy-mm-dd
  endDate?: string;      // ISO yyyy-mm-dd
  address?: string;      // hotel address or airport
  phone?: string;        // hotel reception or airline contact
  total?: string;        // pre-formatted total (e.g. "£312.40")
  url: string;           // deep link back to the booking page on jetmeaway.co.uk
  savedAt: number;       // epoch ms — used for sort
};

const KEY = 'trips:v1';
const MAX_BOOKINGS = 50;

/* ── Sync helpers (preferred — paints on the first frame) ───────────── */

/**
 * Read all saved bookings synchronously, sorted newest first.
 * Returns an empty array on any error / empty store.
 */
export function getBookingsSync(): SavedBooking[] {
  const list = readJson<SavedBooking[]>(KEY, []);
  if (!Array.isArray(list)) return [];
  return list
    .filter((b): b is SavedBooking => !!b && typeof b === 'object' && typeof b.id === 'string')
    .sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0));
}

export function saveBookingSync(booking: Omit<SavedBooking, 'savedAt'>): void {
  if (!booking?.id) return;
  const existing = getBookingsSync();
  // Dedupe by id — newest write wins.
  const filtered = existing.filter((b) => b.id !== booking.id);
  const next: SavedBooking[] = [{ ...booking, savedAt: Date.now() }, ...filtered].slice(0, MAX_BOOKINGS);
  writeJson(KEY, next);
}

export function clearAllBookingsSync(): void {
  deleteKey(KEY);
}

/* ── Async wrappers (backward compat for existing callers) ──────────── */

export async function listBookings(): Promise<SavedBooking[]> {
  return getBookingsSync();
}

export async function saveBooking(booking: Omit<SavedBooking, 'savedAt'>): Promise<void> {
  saveBookingSync(booking);
}

export async function clearAllBookings(): Promise<void> {
  clearAllBookingsSync();
}

/* ── Inbound message validator (called from WebView bridge) ─────────── */

/**
 * Parse an inbound message from the WebView. Returns the SavedBooking shape
 * if valid, otherwise null. Defensive — never throws on malformed input.
 */
export function parseBookingMessage(payload: unknown): Omit<SavedBooking, 'savedAt'> | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Record<string, unknown>;
  if (typeof p.id !== 'string' || !p.id) return null;
  if (p.type !== 'flight' && p.type !== 'hotel' && p.type !== 'package') return null;
  if (typeof p.title !== 'string' || !p.title) return null;
  if (typeof p.url !== 'string' || !p.url) return null;
  return {
    id: p.id,
    type: p.type,
    title: p.title,
    subtitle: typeof p.subtitle === 'string' ? p.subtitle : undefined,
    startDate: typeof p.startDate === 'string' ? p.startDate : undefined,
    endDate: typeof p.endDate === 'string' ? p.endDate : undefined,
    address: typeof p.address === 'string' ? p.address : undefined,
    phone: typeof p.phone === 'string' ? p.phone : undefined,
    total: typeof p.total === 'string' ? p.total : undefined,
    url: p.url,
  };
}

/* ── Storage debug accessor ─────────────────────────────────────────── */

/**
 * Internal — exposes the underlying MMKV instance for hooks that need
 * `useMMKVListener` to react in real time (e.g. trips badge counter).
 */
export const _storage = storage;
