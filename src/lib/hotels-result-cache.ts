/**
 * Session-scoped snapshot of a hotel search, so pressing Back from a hotel
 * detail page returns the visitor to the row they were reading.
 *
 * WHY THIS IS NEEDED
 * The results page is client-only (`hotels-lazy.tsx` loads it with
 * `ssr: false`), so the server HTML is a skeleton and any native scroll
 * restoration fires against a ~0-height document and clamps to the top.
 * Detail links are also plain `<a href>` — a full document load — so React
 * state does not survive the trip. Result: a visitor who opened hotel #259
 * came back to hotel #1, with the extra pages they had loaded thrown away.
 *
 * WHY sessionStorage AND NOT next/link
 * Migrating the results grid to client navigation would change how the whole
 * hotels → detail flow works. This keeps the blast radius to one module.
 *
 * WHY THE SHORT TTL — the important bit
 * `buildDetailHref` bakes a LiteAPI `offerId` and price into the detail URL,
 * and those offers expire. Restoring a stale snapshot would show prices that
 * fail at prebook, which is worse than losing scroll position. So a snapshot
 * older than TTL_MS is discarded and the page performs a normal fresh search.
 */

const KEY = 'jma_hotels_results:v1';

/** LiteAPI offers go stale; past this we refuse to restore and re-search. */
export const SNAPSHOT_TTL_MS = 15 * 60 * 1000;

export type HotelsSnapshot<T = unknown> = {
  v: 1;
  /** Epoch ms when the snapshot was written. */
  t: number;
  /** Canonical signature of the search (the exact query string we sent). */
  sig: string;
  searchedDest: string;
  hotels: T[];
  currentPage: number;
  pageSize: number;
  sortBy: string;
  viewMode: string;
  scrollY: number;
};

function storage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage;
  } catch {
    // Safari private mode and some embedded webviews throw on access.
    return null;
  }
}

export function saveSnapshot<T>(snap: Omit<HotelsSnapshot<T>, 'v' | 't'>): void {
  const s = storage();
  if (!s) return;
  try {
    const payload: HotelsSnapshot<T> = { ...snap, v: 1, t: Date.now() };
    s.setItem(KEY, JSON.stringify(payload));
  } catch {
    // Quota exceeded on a very large result set — losing the snapshot is
    // recoverable (we just re-search), so never surface this.
  }
}

/**
 * Read a snapshot back. Returns null when absent, malformed, expired, or for a
 * different search — every one of which must fall through to a fresh search.
 */
export function readSnapshot<T>(sig: string): HotelsSnapshot<T> | null {
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HotelsSnapshot<T>;
    if (parsed?.v !== 1) return null;
    if (parsed.sig !== sig) return null;
    if (!Array.isArray(parsed.hotels) || parsed.hotels.length === 0) return null;
    if (Date.now() - parsed.t > SNAPSHOT_TTL_MS) {
      s.removeItem(KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearSnapshot(): void {
  const s = storage();
  if (!s) return;
  try {
    s.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/**
 * True when this page view is a back/forward navigation rather than a fresh
 * visit. We only restore on back/forward: re-running the same search from the
 * form should give fresh prices, not a replay.
 */
export function isBackForwardNavigation(): boolean {
  try {
    if (typeof performance === 'undefined') return false;
    const [nav] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    return nav?.type === 'back_forward';
  } catch {
    return false;
  }
}
