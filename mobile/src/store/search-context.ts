/**
 * Search-context store — a tiny zustand singleton holding the prefill
 * criteria handed off when a user taps a saved search or a deal card.
 *
 * Phase 5 wires this into the native flight + hotel search forms; Phase
 * 2 just sets the value when the user taps a saved-search row, so the
 * scaffolding is ready ahead of the form build.
 *
 * State is in-memory only — the next cold launch starts empty.
 */

import { create } from 'zustand';
import type { SavedSearchCriteria, SavedSearchType } from '../api/types';

type SearchContextState = {
  prefill:
    | {
        type: SavedSearchType;
        criteria: SavedSearchCriteria;
        sourceId?: string; // saved-search id when applicable
      }
    | null;
  setPrefill: (
    payload:
      | { type: SavedSearchType; criteria: SavedSearchCriteria; sourceId?: string }
      | null,
  ) => void;
  clearPrefill: () => void;
};

export const useSearchContext = create<SearchContextState>((set) => ({
  prefill: null,
  setPrefill: (payload) => set({ prefill: payload }),
  clearPrefill: () => set({ prefill: null }),
}));
