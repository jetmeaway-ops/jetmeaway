/**
 * Account-area data hooks — wrap the apiClient transport in TanStack
 * Query so screens get caching, retries, background revalidation, and
 * pull-to-refresh for free.
 *
 * Offline strategy:
 *   - `useTrips` paints the local MMKV cache on first frame via
 *     `initialData`, then merges remote bookings on success. If the
 *     network layer throws 'Offline' we keep local data unchanged.
 *   - `useSavedSearches` mirrors successful fetches into MMKV under
 *     `saved-searches:v1`, so subsequent offline reads return the last
 *     known list rather than an empty one.
 *
 * No PII flows through these hooks beyond what the backend already
 * holds. Booking IDs and confirmation refs are not PII.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import {
  type AccountMeResponse,
  type SavedSearch,
  type SavedSearchesResponse,
  remoteToSaved,
} from './types';
import {
  getBookingsSync,
  saveBookingSync,
  type SavedBooking,
} from '../services/offline-bookings';
import { readJson, writeJson } from '../services/storage';

const SAVED_SEARCHES_KEY = 'saved-searches:v1';

export const tripsQueryKey = ['trips'] as const;
export const savedSearchesQueryKey = ['saved-searches'] as const;

function mergeBookings(local: SavedBooking[], remote: SavedBooking[]): SavedBooking[] {
  const byId = new Map<string, SavedBooking>();
  for (const r of remote) byId.set(r.id, r);
  for (const l of local) {
    const existing = byId.get(l.id);
    // Local wins for fields it carries (phone, address, notes); remote
    // wins for fields the local copy never recorded.
    byId.set(l.id, { ...existing, ...l });
  }
  return [...byId.values()].sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0));
}

/* ── Trips ──────────────────────────────────────────────────────────── */

export function useTrips() {
  return useQuery<SavedBooking[]>({
    queryKey: tripsQueryKey,
    initialData: () => getBookingsSync(),
    staleTime: 30_000,
    queryFn: async () => {
      const local = getBookingsSync();
      try {
        const data = await apiClient<AccountMeResponse>('/api/account/me');
        const remote = (data.bookings ?? []).map(remoteToSaved);
        // Persist any remote-only entries to MMKV so the next cold launch
        // paints them too — without this, a freshly-signed-in device with
        // no native bookings would show blank when offline.
        for (const r of remote) {
          if (!local.some((l) => l.id === r.id)) saveBookingSync(r);
        }
        return mergeBookings(local, remote);
      } catch (err) {
        if (err instanceof Error && err.message === 'Offline') {
          return local;
        }
        // 401 from /api/account/me means signed-out — surface only the
        // local list so the screen doesn't throw away cached trips.
        return local;
      }
    },
  });
}

/* ── Saved searches ─────────────────────────────────────────────────── */

export function useSavedSearches() {
  return useQuery<SavedSearch[]>({
    queryKey: savedSearchesQueryKey,
    initialData: () => readJson<SavedSearch[]>(SAVED_SEARCHES_KEY, []),
    staleTime: 30_000,
    queryFn: async () => {
      try {
        const data = await apiClient<SavedSearchesResponse>('/api/account/saved-searches');
        const list = data.searches ?? [];
        writeJson(SAVED_SEARCHES_KEY, list);
        return list;
      } catch (err) {
        if (err instanceof Error && err.message === 'Offline') {
          return readJson<SavedSearch[]>(SAVED_SEARCHES_KEY, []);
        }
        // 401 / network failure → fall back to last cached list.
        return readJson<SavedSearch[]>(SAVED_SEARCHES_KEY, []);
      }
    },
  });
}

export function useDeleteSavedSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient(`/api/account/saved-searches?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
    onSuccess: (_data, id) => {
      const prev = readJson<SavedSearch[]>(SAVED_SEARCHES_KEY, []);
      const next = prev.filter((s) => s.id !== id);
      writeJson(SAVED_SEARCHES_KEY, next);
      queryClient.setQueryData(savedSearchesQueryKey, next);
    },
  });
}

/* ── Cancellation ───────────────────────────────────────────────────── */

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) =>
      apiClient('/api/account/bookings/cancel', {
        method: 'POST',
        body: { bookingId },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tripsQueryKey }),
  });
}
