/**
 * Search-context store — zustand singleton holding both the volatile
 * "prefill" handoff (saved-search row taps, deal-card taps) and the
 * persistent search-form state (last hotel destination, dates, guests,
 * filters) the user expects to survive tab switches and app restarts.
 *
 * Persistence: only `hotelFilters` and `hotelFormState` are persisted via
 * zustand's `persist` middleware backed by MMKV. The `prefill` slot is a
 * one-shot handoff and intentionally lives in memory only — persisting
 * it would re-fire a stale handoff on the next launch.
 *
 * Persistence key: `jma:search:v1`. Bump the suffix when the persisted
 * shape changes incompatibly so old payloads are silently dropped on
 * re-hydration rather than crashing the form.
 *
 * 2026-05-06 — extended with `hotelFilters` + `hotelFormState` slots and
 * MMKV persistence per the 1.1.0 finalisation pass. The existing
 * `prefill` API is preserved for the saved-search handoff path.
 */

import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { storage } from '../services/storage';
import type { LocationOption } from '../components/forms/LocationPicker';
import type { SavedSearchCriteria, SavedSearchType } from '../api/types';

/* ── Persisted shapes ──────────────────────────────────────────────── */

/**
 * Hotel result-page filters. Empty arrays / undefined ranges mean "no
 * filter" — the post-search UI on the website honours these via URL
 * query params (`stars`, `priceMin`, `priceMax`, `propertyType`).
 *
 * v1 carries optional slots so we can ship the persistence wiring
 * before the native filter UI lands; once filter chips are added to
 * the search screen they read/write here directly without a schema
 * change.
 */
export type HotelFilters = {
  stars: number[];
  priceMin?: number;
  priceMax?: number;
  propertyType: string[];
};

/**
 * Persisted hotel-search form state. Dates are ISO yyyy-mm-dd strings —
 * not Date objects — so the JSON round-trip through MMKV is lossless and
 * the rehydrate doesn't have to reconstruct timezones.
 */
export type HotelFormState = {
  destination: LocationOption | null;
  range: { departISO: string | null; returnISO: string | null };
  guests: { adults: number; children: number; rooms: number };
  refundableOnly: boolean;
};

const DEFAULT_HOTEL_FILTERS: HotelFilters = {
  stars: [],
  propertyType: [],
};

const DEFAULT_HOTEL_FORM_STATE: HotelFormState = {
  destination: null,
  range: { departISO: null, returnISO: null },
  guests: { adults: 2, children: 0, rooms: 1 },
  refundableOnly: false,
};

/* ── Store shape ───────────────────────────────────────────────────── */

type SearchContextState = {
  /** One-shot handoff for saved-search / deal-card taps. NOT persisted. */
  prefill:
    | {
        type: SavedSearchType;
        criteria: SavedSearchCriteria;
        sourceId?: string;
      }
    | null;
  setPrefill: (
    payload:
      | { type: SavedSearchType; criteria: SavedSearchCriteria; sourceId?: string }
      | null,
  ) => void;
  clearPrefill: () => void;

  /** Persisted hotel-search filters (stars / price range / property type). */
  hotelFilters: HotelFilters;
  setHotelFilters: (next: Partial<HotelFilters>) => void;
  resetHotelFilters: () => void;

  /** Persisted hotel-search form state — the form auto-populates from this on mount. */
  hotelFormState: HotelFormState;
  setHotelFormState: (next: Partial<HotelFormState>) => void;
  resetHotelFormState: () => void;
};

/* ── MMKV-backed storage adapter for zustand `persist` ─────────────── */
/* react-native-mmkv is synchronous; zustand's `createJSONStorage`
 * happily accepts a sync StateStorage. Wrapping the helpers in this
 * shape lets us reuse the encrypted MMKV instance from `services/
 * storage.ts` without spinning up a parallel store. */
const mmkvStorage: StateStorage = {
  getItem: (name) => storage.getString(name) ?? null,
  setItem: (name, value) => {
    storage.set(name, value);
  },
  removeItem: (name) => {
    storage.remove(name);
  },
};

export const useSearchContext = create<SearchContextState>()(
  persist(
    (set) => ({
      // ── volatile prefill handoff ─────────────────────────────────
      prefill: null,
      setPrefill: (payload) => set({ prefill: payload }),
      clearPrefill: () => set({ prefill: null }),

      // ── persisted hotel filters ──────────────────────────────────
      hotelFilters: DEFAULT_HOTEL_FILTERS,
      setHotelFilters: (next) =>
        set((s) => ({ hotelFilters: { ...s.hotelFilters, ...next } })),
      resetHotelFilters: () => set({ hotelFilters: DEFAULT_HOTEL_FILTERS }),

      // ── persisted hotel form state ───────────────────────────────
      hotelFormState: DEFAULT_HOTEL_FORM_STATE,
      setHotelFormState: (next) =>
        set((s) => ({ hotelFormState: { ...s.hotelFormState, ...next } })),
      resetHotelFormState: () => set({ hotelFormState: DEFAULT_HOTEL_FORM_STATE }),
    }),
    {
      name: 'jma:search:v1',
      storage: createJSONStorage(() => mmkvStorage),
      // Persist ONLY the long-lived slots. `prefill` is a one-shot
      // handoff — persisting it would re-fire a stale prefill on the
      // next cold launch and the user would land on a half-restored
      // form they didn't ask for.
      partialize: (state) => ({
        hotelFilters: state.hotelFilters,
        hotelFormState: state.hotelFormState,
      }),
      // If the persisted shape can't be parsed (corrupt write, schema
      // drift on an old build), fall back to defaults rather than
      // crash the form. Bumping the `name` suffix is the proper fix
      // for incompatible schema changes; this catches accidental drift.
      version: 2,
      // v1 → v2 (2026-05-16): added `rooms` to hotelFormState.guests.
      // Old payloads have `{ adults, children }` only; fill rooms=1 so
      // the new required field doesn't crash the form on first launch
      // after upgrade.
      migrate: (persistedState, version) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return {
            hotelFilters: DEFAULT_HOTEL_FILTERS,
            hotelFormState: DEFAULT_HOTEL_FORM_STATE,
          };
        }
        const s = persistedState as Partial<SearchContextState>;
        if (version < 2 && s.hotelFormState?.guests) {
          const g = s.hotelFormState.guests as { adults: number; children: number; rooms?: number };
          s.hotelFormState = {
            ...s.hotelFormState,
            guests: { adults: g.adults, children: g.children, rooms: g.rooms ?? 1 },
          };
        }
        return s;
      },
    },
  ),
);
