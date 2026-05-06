/**
 * Widget client — writes the latest WidgetState to MMKV (which lives in
 * the App Group container once the Phase 8 owner setup lands), so the
 * Swift Widget Extension and Live Activity target can render it.
 *
 * For v1 (no Swift target yet) writes still go to MMKV — they're
 * harmless if nothing reads them. As soon as the App Group is registered
 * + the Widget Extension ships, every prior write becomes visible.
 *
 * Public API:
 *   refreshWidgetState() — recompute from latest cached trips + price-
 *                          watch, write to MMKV
 *   writeWidgetState(state) — escape hatch for tests / manual invalidation
 */

import { storage } from '../services/storage';
import {
  getBookingsSync,
  inferProvider,
  type SavedBooking,
} from '../services/offline-bookings';
import { WIDGET_STATE_KEY, type WidgetState, type WidgetTripSnapshot } from './types';

function snapshotFromBooking(b: SavedBooking): WidgetTripSnapshot | null {
  // We need a start date to render the countdown.
  const startsAt = b.startDate ?? null;
  if (!startsAt) return null;

  const startMs = new Date(startsAt).getTime();
  if (Number.isNaN(startMs)) return null;
  const daysUntil = Math.ceil((startMs - Date.now()) / (24 * 60 * 60 * 1000));

  return {
    id: b.id,
    title: b.title || (b.type === 'flight' ? 'Flight' : 'Hotel stay'),
    subtitle: b.subtitle ?? '',
    provider: inferProvider(b),
    startsAt,
    daysUntil,
  };
}

export function refreshWidgetState(): WidgetState {
  let upcoming: WidgetTripSnapshot[] = [];
  try {
    const all = getBookingsSync();
    upcoming = all
      .map(snapshotFromBooking)
      .filter((s): s is WidgetTripSnapshot => !!s)
      .filter((s) => s.daysUntil >= -1) // include just-started trips for one day
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 3);
  } catch {
    // No trips cached yet — fine.
  }

  const state: WidgetState = {
    upcoming,
    updatedAt: Date.now(),
  };
  writeWidgetState(state);
  return state;
}

export function writeWidgetState(state: WidgetState): void {
  try {
    storage.set(WIDGET_STATE_KEY, JSON.stringify(state));
  } catch {
    // MMKV failure shouldn't crash the host app. Widget will show last
    // good state until the next refresh.
  }
}

export function readWidgetState(): WidgetState | null {
  const raw = storage.getString(WIDGET_STATE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WidgetState;
  } catch {
    return null;
  }
}
