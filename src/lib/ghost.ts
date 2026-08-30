/**
 * Ghost-inventory memory — hotels whose offers the supplier issues but will
 * not honour.
 *
 * The case that forced this: B&B HOTEL Paris 17 Batignolles failed prebook
 * with LiteAPI code 2001 on a SIX-MINUTE-OLD offer — inside the supplier's
 * own honour window — and did so on every attempt across three days, while
 * holding both Paris deal slots. That is not "just sold out"; it is
 * inventory that exists only until someone tries to buy it. Every guest who
 * taps Book on such a hotel gets "this rate just sold out", which is the
 * exact broken-site feeling the deal-cache rework removed.
 *
 * Mechanism: when a prebook fails as rate_unavailable, the hotel is flagged
 * in KV for 24 hours (`ghost-hotel:<hotelId>`). The DEALS strip skips
 * flagged hotels when picking and when serving. One failure can also be a
 * genuine last-room race — but the strip has fourteen other hotels to show,
 * so the cost of believing the failure is a day off the strip, while the
 * cost of not believing it is a customer at a dead Book button. Search
 * results are NOT filtered: a genuine sell-out there self-corrects on the
 * next rates refresh, and hiding hotels from search on one signal would be
 * over-reach.
 *
 * NEW KV namespace (2026-08-30). Nothing else reads or writes these keys.
 */
import { kv } from '@vercel/kv';

export const ghostHotelKey = (hotelId: string) => `ghost-hotel:${hotelId}`;
export const GHOST_TTL_SECONDS = 24 * 60 * 60;

/** Flag a hotel whose offer failed to prebook. Never throws — this runs in
 *  a checkout error path, and bookkeeping must not disturb the customer's
 *  error handling. */
export async function markGhostHotel(hotelId: string | null | undefined): Promise<void> {
  const id = (hotelId || '').trim();
  if (!id) return;
  try {
    await kv.set(ghostHotelKey(id), Date.now(), { ex: GHOST_TTL_SECONDS });
  } catch {
    /* KV unavailable — the flag is an optimisation, not a contract */
  }
}

/** The subset of `ids` currently flagged. One MGET; empty input costs nothing.
 *  On KV failure returns the empty set — deals would rather risk a ghost than
 *  blank the strip over a read error. */
export async function ghostedAmong(ids: string[]): Promise<Set<string>> {
  const clean = [...new Set(ids.map((i) => (i || '').trim()).filter(Boolean))];
  if (!clean.length) return new Set();
  try {
    const vals = await kv.mget<(number | null)[]>(...clean.map(ghostHotelKey));
    const out = new Set<string>();
    vals.forEach((v, i) => {
      if (v !== null && v !== undefined) out.add(clean[i]);
    });
    return out;
  } catch {
    return new Set();
  }
}
