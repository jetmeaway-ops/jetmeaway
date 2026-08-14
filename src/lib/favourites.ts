'use client';

/**
 * Favourite hotels, client side.
 *
 * Two stores, one API:
 *   - Signed OUT → localStorage on this device. No account needed, so a visitor
 *     can start collecting hotels the moment they land. This is deliberate:
 *     making people sign up before they can save is the fastest way to lose
 *     them mid-decision.
 *   - Signed IN  → `favourites:${email}` in KV via /api/account/favourites, so
 *     the list follows them to another device and into the app.
 *
 * On sign-in the local list is POSTed as `merge` and then cleared, so hotels
 * picked while signed out are never silently lost. Account entries win on
 * conflict — see the route.
 *
 * localStorage is used rather than sessionStorage so the list survives closing
 * the tab, and rather than a cookie so it never rides along on every request.
 *
 * Every reader subscribes via `subscribeFavourites`, so a heart on a card, the
 * same hotel's heart on the detail page and the header count all move together.
 */

export type Favourite = {
  hotelId: string;
  name: string;
  city?: string;
  thumbnail?: string;
  stars?: number;
  savedPricePence?: number;
  currency?: string;
  url: string;
  createdAt: number;
};

const LOCAL_KEY = 'jma-favourites-v1';
const MAX = 100;

/* ── local store ───────────────────────────────────────────────────────── */

function readLocal(): Favourite[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Favourite[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(list: Favourite[]): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* private mode or quota — the in-memory cache still serves this session */
  }
}

/* ── shared cache + subscriptions ──────────────────────────────────────── */

let cache: Favourite[] | null = null;
let signedIn: boolean | null = null;
const listeners = new Set<(list: Favourite[]) => void>();

function emit(): void {
  const snapshot = cache ?? [];
  listeners.forEach((fn) => fn(snapshot));
}

export function subscribeFavourites(fn: (list: Favourite[]) => void): () => void {
  listeners.add(fn);
  if (cache) fn(cache);
  return () => { listeners.delete(fn); };
}

/** Synchronous best-effort read — used for first paint before load() resolves. */
export function peekFavourites(): Favourite[] {
  return cache ?? readLocal();
}

export function isFavourited(hotelId: string): boolean {
  return peekFavourites().some((f) => f.hotelId === hotelId);
}

/* ── remote helpers ────────────────────────────────────────────────────── */

async function checkSignedIn(): Promise<boolean> {
  if (signedIn !== null) return signedIn;
  try {
    const res = await fetch('/api/account/me', { credentials: 'include' });
    signedIn = res.ok;
  } catch {
    signedIn = false;
  }
  return signedIn;
}

/**
 * Load the list, and hand off any local favourites if the visitor is signed in.
 * Safe to call from several components — they share the cache.
 */
export async function loadFavourites(): Promise<Favourite[]> {
  const local = readLocal();
  if (!cache) {
    // Paint from local immediately; the account list replaces it below.
    cache = local;
    emit();
  }

  if (!(await checkSignedIn())) {
    cache = local;
    emit();
    return cache;
  }

  try {
    if (local.length > 0) {
      const res = await fetch('/api/account/favourites', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merge: local }),
      });
      // Only drop the local copy once the server has definitely taken it.
      if (res.ok) writeLocal([]);
    }
    const res = await fetch('/api/account/favourites', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.items)) {
        cache = data.items as Favourite[];
        emit();
      }
    }
  } catch {
    /* offline — keep serving whatever we already have */
  }
  return cache ?? [];
}

/* ── mutations ─────────────────────────────────────────────────────────── */

/** Add or remove, returning the new state. Optimistic: the UI never waits. */
export async function toggleFavourite(fav: Favourite): Promise<boolean> {
  const current = cache ?? readLocal();
  const exists = current.some((f) => f.hotelId === fav.hotelId);
  const next = exists
    ? current.filter((f) => f.hotelId !== fav.hotelId)
    : [{ ...fav, createdAt: fav.createdAt || Date.now() }, ...current].slice(0, MAX);

  cache = next;
  emit();

  const remote = await checkSignedIn();
  if (!remote) {
    writeLocal(next);
    return !exists;
  }

  try {
    if (exists) {
      await fetch(`/api/account/favourites?hotelId=${encodeURIComponent(fav.hotelId)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
    } else {
      await fetch('/api/account/favourites', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fav),
      });
    }
  } catch {
    // Network failed — keep it on the device so the save isn't lost, and the
    // next loadFavourites() merge will push it up.
    writeLocal(next);
  }
  return !exists;
}
