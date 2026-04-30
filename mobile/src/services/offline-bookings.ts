import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Offline bookings — local copy of the user's most recent booking confirmations
 * so they can pull up the details at the airport with no signal.
 *
 * Apple Guideline 4.2 case: this is a native capability the web cannot deliver.
 * Web has no persistent device storage that survives an airplane-mode flight
 * connection drop; AsyncStorage gives us 6MB of guaranteed-available local
 * storage on every device.
 *
 * Source of bookings: the WebView on /success/[id] posts a message to the
 * native shell with the booking JSON. The shell calls saveBooking() — the
 * resulting list is then renderable by the native My Trips modal even when
 * offline.
 */

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

const KEY = 'jma:bookings:v1';
const MAX_BOOKINGS = 25;

export async function listBookings(): Promise<SavedBooking[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((b): b is SavedBooking => !!b && typeof b === 'object' && typeof b.id === 'string')
      .sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0));
  } catch {
    return [];
  }
}

export async function saveBooking(booking: Omit<SavedBooking, 'savedAt'>): Promise<void> {
  if (!booking?.id) return;
  const existing = await listBookings();
  // Dedupe by id — newest write wins.
  const filtered = existing.filter((b) => b.id !== booking.id);
  const next: SavedBooking[] = [{ ...booking, savedAt: Date.now() }, ...filtered].slice(0, MAX_BOOKINGS);
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch (err) {
    console.error('[offline-bookings] save failed', err);
  }
}

export async function clearAllBookings(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

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
