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
 * WHY THE LIST LIVES IN IndexedDB, NOT sessionStorage
 * A big-city result set is enormous once every board option carries its
 * LiteAPI offer token — Rome serialises to ~21 MB, four times Chrome's
 * ~5 MB sessionStorage quota. The previous implementation wrote the whole
 * snapshot to sessionStorage at pagehide: setItem threw QuotaExceededError
 * on exactly the searches where restoring matters most, the catch swallowed
 * it, and Back re-searched from the top every time. Now the bulk hotel list
 * is persisted to IndexedDB (quota measured in GB) in the background while
 * the visitor browses, and pagehide writes only a sub-1 KB position record
 * (scroll offset, page, sort) to sessionStorage, which cannot quota-fail.
 *
 * WHY THE SIGNATURE IS CANONICALISED
 * The detail page's "Back to search" pill rebuilds the query string itself,
 * so its parameter order/set can differ from the URL the visitor searched
 * on. Comparing raw query strings would miss the restore on that path;
 * comparing a sorted whitelist of search-relevant params matches both the
 * browser-Back and the pill-Back journeys while still treating a genuinely
 * different search (other city, other dates) as a miss.
 *
 * WHY THE SHORT TTL — the important bit
 * `buildDetailHref` bakes a LiteAPI `offerId` and price into the detail URL,
 * and those offers expire. Restoring a stale snapshot would show prices that
 * fail at prebook, which is worse than losing scroll position. So anything
 * older than TTL_MS is discarded and the page performs a normal fresh search.
 */

const POS_KEY = 'jma_hotels_results:v2';
const IDB_NAME = 'jma-hotels-cache';
const IDB_STORE = 'results';
const IDB_KEY = 'latest';

/** LiteAPI offers go stale; past this we refuse to restore and re-search. */
export const SNAPSHOT_TTL_MS = 15 * 60 * 1000;

/** Query params that define a search. Anything else (utm_*, fbclid…) must
 *  not break the restore match. Sorted so parameter order never matters. */
const SIG_KEYS = [
  'destination', 'city', 'checkin', 'checkout', 'adults', 'children',
  'childrenAges', 'rooms', 'occ', 'stars', 'placeId', 'lat', 'lng', 'radius',
];

export function canonicalSig(search: string): string {
  try {
    const p = new URLSearchParams(search);
    return SIG_KEYS
      .map((k) => [k, p.get(k)] as const)
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
  } catch {
    return search;
  }
}

type Position = {
  v: 2;
  /** Epoch ms when the record was written. */
  t: number;
  /** Canonical signature of the search this position belongs to. */
  sig: string;
  searchedDest: string;
  currentPage: number;
  pageSize: number;
  sortBy: string;
  viewMode: string;
  scrollY: number;
};

export type HotelsSnapshot<T = unknown> = Position & { hotels: T[] };

function storage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage;
  } catch {
    // Safari private mode and some embedded webviews throw on access.
    return null;
  }
}

// ── IndexedDB plumbing ──────────────────────────────────────────────────────
// Bare-metal promises, no dependency. Every failure path resolves to null /
// no-op: losing the snapshot is always recoverable (we just re-search), and
// some browsers (Firefox private windows) reject indexedDB.open outright.

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') { resolve(null); return; }
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        try { req.result.createObjectStore(IDB_STORE); } catch { /* exists */ }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function idbPut(value: unknown): Promise<boolean> {
  return openDb().then((db) => new Promise<boolean>((resolve) => {
    if (!db) { resolve(false); return; }
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(value, IDB_KEY);
      tx.oncomplete = () => { db.close(); resolve(true); };
      tx.onerror = () => { db.close(); resolve(false); };
      tx.onabort = () => { db.close(); resolve(false); };
    } catch {
      try { db.close(); } catch { /* ignore */ }
      resolve(false);
    }
  }));
}

function idbGet(): Promise<unknown> {
  return openDb().then((db) => new Promise<unknown>((resolve) => {
    if (!db) { resolve(null); return; }
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => { db.close(); resolve(req.result ?? null); };
      req.onerror = () => { db.close(); resolve(null); };
    } catch {
      try { db.close(); } catch { /* ignore */ }
      resolve(null);
    }
  }));
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Persist the bulk hotel list in the background. Called (debounced) whenever
 * the result set changes, so by the time the visitor clicks a hotel the heavy
 * write has already happened — pagehide only stores the position record.
 * Fire-and-forget: IndexedDB uses the structured-clone serialiser, so a
 * 21 MB Rome list costs one background write, not a 21 MB JSON string on the
 * unload path.
 */
export function persistResults<T>(search: string, hotels: T[]): void {
  if (!Array.isArray(hotels) || hotels.length === 0) return;
  const record = { sig: canonicalSig(search), t: Date.now(), hotels };
  void idbPut(record);
}

/** Written at pagehide — tiny, synchronous, cannot quota-fail. */
export function savePosition(search: string, pos: Omit<Position, 'v' | 't' | 'sig'>): void {
  const s = storage();
  if (!s) return;
  try {
    const payload: Position = { ...pos, v: 2, t: Date.now(), sig: canonicalSig(search) };
    s.setItem(POS_KEY, JSON.stringify(payload));
  } catch {
    /* a <1 KB write failing means storage is unusable — fall through to re-search */
  }
}

function readPosition(search: string): Position | null {
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(POS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Position;
    if (parsed?.v !== 2) return null;
    if (parsed.sig !== canonicalSig(search)) return null;
    if (Date.now() - parsed.t > SNAPSHOT_TTL_MS) {
      s.removeItem(POS_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Synchronous gate: is there a fresh position record for this search?
 * Lets the caller decide to show the loading state (not a dead form) before
 * committing to the async IndexedDB read.
 */
export function hasFreshPosition(search: string): boolean {
  return readPosition(search) !== null;
}

/**
 * Read the full snapshot back. Resolves null when the position record or the
 * bulk list is absent, malformed, expired, or belongs to a different search —
 * every one of which must fall through to a fresh search.
 */
export async function readSnapshot<T>(search: string): Promise<HotelsSnapshot<T> | null> {
  const pos = readPosition(search);
  if (!pos) return null;
  const bulk = (await idbGet()) as { sig?: string; t?: number; hotels?: T[] } | null;
  if (!bulk || typeof bulk !== 'object') return null;
  if (bulk.sig !== pos.sig) return null;
  if (typeof bulk.t !== 'number' || Date.now() - bulk.t > SNAPSHOT_TTL_MS) return null;
  if (!Array.isArray(bulk.hotels) || bulk.hotels.length === 0) return null;
  return { ...pos, hotels: bulk.hotels };
}

/**
 * True when this page view is a return trip from a hotel detail page — either
 * a real browser back/forward, or the detail page's "Back to search" pill
 * (a normal navigation whose referrer is /hotels/<id>). We only restore on
 * these: re-running the same search from the form should give fresh prices,
 * not a replay.
 */
export function isReturnFromDetail(): boolean {
  try {
    if (typeof performance !== 'undefined') {
      const [nav] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      if (nav?.type === 'back_forward') return true;
    }
    if (typeof document !== 'undefined' && document.referrer) {
      const ref = new URL(document.referrer);
      if (ref.origin === window.location.origin && /^\/hotels\/./.test(ref.pathname)) return true;
    }
    return false;
  } catch {
    return false;
  }
}
