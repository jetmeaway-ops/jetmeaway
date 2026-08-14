/**
 * Hand-off of the chosen Kyte flight offer from the results page to the
 * booking page (`/flights/kyte/[offerId]`), so the booking page has price +
 * times + carrier without re-fetching from Kyte — which would burn Fixie proxy
 * quota and risk an expired-offer error.
 *
 * Why two stores. This used to be sessionStorage only. The booking link now
 * opens in a NEW TAB so the flight results stay live behind it, and a tab
 * opened with `rel="noopener"` starts with an EMPTY sessionStorage — the
 * booking page would find no offer and dead-end on its "we could not find the
 * offer details" error. localStorage is shared across tabs, so it is what
 * actually carries the hand-off. sessionStorage is still written (and read
 * first) for the same-tab path inside the native app shell, where links stay
 * same-tab.
 *
 * localStorage persists, so writes are pruned on every stash — see MAX_AGE_MS.
 */

const PREFIX = 'kyte-offer-';

/**
 * Kyte offers themselves expire after ~15 minutes. We keep the stash a bit
 * longer than that so a customer who is mid-form doesn't lose their details;
 * anything older is dead weight and gets pruned.
 */
const MAX_AGE_MS = 2 * 60 * 60 * 1000;

function keyFor(offerId: string): string {
  return `${PREFIX}${offerId}`;
}

/** Drop stashed offers that are past MAX_AGE_MS, plus any unparseable leftovers. */
export function pruneStaleKyteOffers(): void {
  try {
    const now = Date.now();
    const doomed: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(PREFIX)) continue;
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || 'null') as { _searchedAt?: number } | null;
        const at = parsed?._searchedAt;
        if (typeof at !== 'number' || now - at > MAX_AGE_MS) doomed.push(key);
      } catch {
        doomed.push(key);
      }
    }
    doomed.forEach((key) => localStorage.removeItem(key));
  } catch {
    /* storage blocked — nothing to prune */
  }
}

/** Stash the chosen offer for the booking page. Never throws. */
export function stashKyteOffer(offerId: string, payload: unknown): void {
  const json = JSON.stringify(payload);
  try {
    sessionStorage.setItem(keyFor(offerId), json);
  } catch {
    /* sessionStorage unavailable — localStorage below still carries it */
  }
  try {
    pruneStaleKyteOffers();
    localStorage.setItem(keyFor(offerId), json);
  } catch {
    /* storage full or blocked — the booking page shows its expired-offer error */
  }
}

/**
 * Read the stashed offer. sessionStorage first (same-tab path), then
 * localStorage (the new-tab path). Returns null when nothing usable is stored.
 */
export function readKyteOffer(offerId: string): string | null {
  const key = keyFor(offerId);
  try {
    const fromSession = sessionStorage.getItem(key);
    if (fromSession) return fromSession;
  } catch {
    /* fall through to localStorage */
  }
  try {
    const fromLocal = localStorage.getItem(key);
    if (!fromLocal) return null;
    const parsed = JSON.parse(fromLocal) as { _searchedAt?: number } | null;
    const at = parsed?._searchedAt;
    if (typeof at !== 'number' || Date.now() - at > MAX_AGE_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return fromLocal;
  } catch {
    return null;
  }
}
