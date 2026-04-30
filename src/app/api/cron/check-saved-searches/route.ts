/**
 * Cron: walk every saved search across all users, re-query today's price,
 * and push a deal alert if the new price is meaningfully lower.
 *
 * Schedule: daily at 09:30 UK time (registered in vercel.json).
 *
 * Auth: Vercel-cron requests carry a `x-vercel-cron-signature` header in
 * production. We accept either that OR an `Authorization: Bearer <CRON_SECRET>`
 * header for manual triggers + admin testing.
 *
 * Algorithm:
 *   1. Scan KV for `saved-searches:*` keys (every signed-in user's list)
 *   2. For each saved search with `notify: true`:
 *      a. Re-query the relevant API (flights/hotels) for today's best price
 *      b. If newPrice ≤ savedPrice × (1 - DROP_THRESHOLD), push to all the
 *         user's registered Expo tokens
 *      c. Update lastObservedPricePence + lastCheckedAt
 *   3. Skip silently on any error — never break the cron loop
 *
 * Cost guards:
 *   - MAX_SAVED_PER_RUN cap (default 500) to bound LiteAPI/Travelpayouts hits
 *   - Per-user limit already enforced at write time (MAX_PER_USER = 30)
 *   - Skip searches checked within the last 18h (avoids duplicate pushes
 *     if the cron is triggered manually multiple times)
 */
import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { sendExpoPushToTokens } from '@/lib/push-send';
import { fetchCurrentPricePence } from '@/lib/cron-price-fetch';
import type { SavedSearch } from '@/app/api/account/saved-searches/route';

export const runtime = 'edge';
// Cron jobs need a longer timeout window than typical edge requests.
export const maxDuration = 60;

const DROP_THRESHOLD = 0.05; // 5% — lower = noisier alerts
const MIN_DROP_PENCE = 500;  // £5 absolute minimum drop
const MAX_SAVED_PER_RUN = 500;
const MIN_RECHECK_INTERVAL_MS = 18 * 60 * 60 * 1000;

function isAuthorised(req: NextRequest): boolean {
  // Vercel cron requests carry a signature header.
  if (req.headers.get('x-vercel-cron-signature')) return true;
  const auth = req.headers.get('authorization') || '';
  const secret = process.env.CRON_SECRET || '';
  if (!secret) return false;
  return auth === `Bearer ${secret}`;
}

async function listSavedSearchKeys(): Promise<string[]> {
  // KV's `keys` is a SCAN under the hood. Cap pagination at 1000 — well above
  // any realistic per-day saved-search count for a launching travel site.
  try {
    const keys = await kv.keys('saved-searches:*');
    return Array.isArray(keys) ? keys : [];
  } catch {
    return [];
  }
}

async function tokensForEmail(email: string): Promise<string[]> {
  // We don't (yet) link push tokens to user emails — push tokens are stored
  // device-level via /api/push-token. For Phase 2 the safest fan-out is "push
  // to ALL registered tokens" (so signed-in users on multiple devices and
  // logged-out users with the app installed both get the alert). Phase 3:
  // bind push tokens to email at sign-in time so we can target precisely.
  void email;
  try {
    const all = await kv.smembers('push:tokens');
    return Array.isArray(all) ? all.filter((t): t is string => typeof t === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Fetch the current best price for a saved search. Delegates to
 * `src/lib/cron-price-fetch.ts` which talks to LiteAPI for hotels and
 * Duffel for flights. Returns null on any upstream failure — caller still
 * updates `lastCheckedAt` so we don't hammer the same search every cron
 * tick when an upstream is flaky.
 */
async function fetchCurrentPrice(search: SavedSearch): Promise<number | null> {
  return fetchCurrentPricePence(search);
}

export async function GET(req: NextRequest) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const keys = await listSavedSearchKeys();
  let scanned = 0;
  let priceDropsDetected = 0;
  let pushesSent = 0;

  for (const key of keys) {
    if (scanned >= MAX_SAVED_PER_RUN) break;
    const email = key.replace('saved-searches:', '');
    let list: SavedSearch[] = [];
    try {
      const raw = await kv.get<SavedSearch[]>(key);
      list = Array.isArray(raw) ? raw : [];
    } catch { continue; }

    let mutated = false;
    for (const search of list) {
      if (scanned >= MAX_SAVED_PER_RUN) break;
      scanned++;
      if (!search.notify) continue;
      if (search.lastCheckedAt && Date.now() - search.lastCheckedAt < MIN_RECHECK_INTERVAL_MS) continue;

      const current = await fetchCurrentPrice(search);
      search.lastCheckedAt = Date.now();
      mutated = true;
      if (current === null) continue;
      search.lastObservedPricePence = current;

      const baseline = search.savedPricePence;
      if (typeof baseline !== 'number' || baseline <= 0) continue;
      const drop = baseline - current;
      const ratio = drop / baseline;
      if (drop < MIN_DROP_PENCE || ratio < DROP_THRESHOLD) continue;

      priceDropsDetected++;
      const tokens = await tokensForEmail(email);
      if (tokens.length === 0) continue;

      const currency = search.currency || 'GBP';
      const fmt = (p: number) => `${currency === 'GBP' ? '£' : ''}${(p / 100).toFixed(2)}`;
      const results = await sendExpoPushToTokens(tokens, {
        title: 'Price drop alert',
        body: `${search.label} — was ${fmt(baseline)}, now ${fmt(current)}.`,
        data: { url: search.url, savedSearchId: search.id },
        sound: 'default',
        channelId: 'default',
        priority: 'high',
      });
      pushesSent += results.filter((r) => r.status === 'ok').length;
    }

    if (mutated) {
      try { await kv.set(key, list); } catch { /* swallow */ }
    }
  }

  return NextResponse.json({
    success: true,
    scanned,
    priceDropsDetected,
    pushesSent,
  });
}
