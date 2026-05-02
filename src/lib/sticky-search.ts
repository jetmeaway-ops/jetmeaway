/* ════════════════════════════════════════════════════════════════════════════
   Sticky search — last-search persistence in localStorage.

   The contract:
   - Each search vertical (flights / hotels / cars / packages) has its own
     namespaced key. The shape is free-form so each page can stash whatever
     it wants, but readers must defend against missing fields and bad shapes.
   - We store ONE record per vertical. New search overwrites old. We do NOT
     keep history — that's a separate concern (see Vercel KV recent searches).
   - Time-to-live is 30 days. After that we treat the record as missing so
     the user doesn't get stale dates pre-filled into a fresh visit.
   - URL params ALWAYS win. Sticky restore only fills gaps when the URL is
     bare. This keeps shareable links honest.
   - Server-render safe: every read/write checks for `window` existence and
     swallows storage exceptions (private mode, quota exceeded, etc).
   ════════════════════════════════════════════════════════════════════════════ */

const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

type Stamped<T> = { v: 1; t: number; d: T };

function ns(vertical: string): string {
  return `jma_sticky_search:${vertical}`;
}

export function saveSticky<T>(vertical: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: Stamped<T> = { v: 1, t: Date.now(), d: data };
    window.localStorage.setItem(ns(vertical), JSON.stringify(payload));
  } catch {
    // Quota / private mode — silently no-op.
  }
}

export function loadSticky<T>(vertical: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ns(vertical));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Stamped<T>>;
    if (!parsed || parsed.v !== 1 || typeof parsed.t !== 'number' || !parsed.d) {
      return null;
    }
    if (Date.now() - parsed.t > TTL_MS) {
      // Expired — clear it so we don't keep paying the parse cost.
      try { window.localStorage.removeItem(ns(vertical)); } catch {}
      return null;
    }
    return parsed.d as T;
  } catch {
    return null;
  }
}

export function clearSticky(vertical: string): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(ns(vertical)); } catch {}
}

/* ── Per-vertical shapes — kept loose on purpose. Pages cast their own. ── */

export type StickyFlights = {
  origin?: string;
  originCity?: string;
  dest?: string;
  destCity?: string;
  departure?: string;
  return?: string;
  adults?: number;
  children?: number;
  infants?: number;
  cabin?: string;
  tripType?: 'one-way' | 'return';
};

export type StickyHotels = {
  destination?: string;
  placeId?: string;
  checkin?: string;
  checkout?: string;
  adults?: number;
  children?: number;
  /** Per-child ages. Length must match `children`. Storing the count
   *  without the ages caused a class of "Child ages array (0) does not
   *  match children count (2)" failures at prebook — when sticky was
   *  restored on a later visit, children=2 was rehydrated but the ages
   *  array was lost, leaking through to start-booking. */
  childrenAges?: number[];
  rooms?: number;
};

export type StickyCars = {
  location?: string;
  returnLocation?: string;
  pickupDate?: string;
  dropoffDate?: string;
  pickupTime?: string;
  dropoffTime?: string;
  age?: string;
};

export type StickyPackages = {
  from?: string;
  dest?: string;
  departure?: string;
  return?: string;
  adults?: number;
  children?: number;
};
