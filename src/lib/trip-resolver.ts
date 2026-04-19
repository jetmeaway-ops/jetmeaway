import { kv } from '@vercel/kv';

/**
 * Resolves a destination name to a Trip.com UK numeric cityId so that
 * `uk.trip.com/hotels/list?city=<id>` auto-loads hotel inventory instead of
 * showing "0 properties found" (which is what keyword-mode `city=-1` does).
 *
 * Caching:
 *   - Vercel KV key `tripid:<slug>` where slug is lowercased + whitespace
 *     stripped (so "New York" and "newyork" share a cache entry).
 *   - Hits cached 48h (city IDs don't churn).
 *   - Misses cached 1h (short, in case Trip.com adds the city later).
 *
 * Failure mode:
 *   Returns `-1` on any failure — the URL builder interprets that as "use
 *   keyword mode", which still lands the user on Trip.com UK with
 *   destination + dates + GBP + affiliate tracking intact. Just requires
 *   one manual Search click. Never crashes the page.
 *
 * Privacy shield:
 *   This runs on Vercel Edge from our infra — the user's search keyword
 *   hits Trip.com only when we decide to resolve, not on every keystroke.
 *   Prefetched ONCE per search (not per result card) so 50-result pages
 *   don't fan out to 50 Trip.com API calls.
 */

const CACHE_TTL_HIT = 60 * 60 * 48; // 48h for resolved IDs
const CACHE_TTL_MISS = 60 * 60;      // 1h for misses

function normaliseKey(name: string): string {
  return name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '');
}

/** Walk known Trip.com response shapes and pluck the first City-type id. */
function extractCityId(data: unknown): number | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;

  const candidates: Array<Array<Record<string, unknown>>> = [];
  const push = (v: unknown) => {
    if (Array.isArray(v)) candidates.push(v as Array<Record<string, unknown>>);
  };
  push(obj.resultList);              // getSuggest (primary, per Trip.com docs)
  push(obj.keyWordSearchResults);    // getKeyWordSearch (search-bar autocomplete)
  push(obj.suggestList);             // alternate getSuggest shape
  push((obj.data as Record<string, unknown> | undefined)?.list);

  for (const list of candidates) {
    for (const item of list) {
      const type = (item.type ?? item.wordType ?? item.resultType) as string | number | undefined;
      if (type === 'City' || type === 'city' || type === 1) {
        const raw = item.id ?? item.cityId ?? item.destId;
        const n = typeof raw === 'string' ? parseInt(raw, 10) : Number(raw);
        if (n && isFinite(n) && n > 0) return n;
      }
    }
  }
  return null;
}

/**
 * Verified Trip.com UK cityIds — confirmed live by navigating uk.trip.com
 * and reading the resulting page title. Last-resort fallback if the live
 * endpoints fail. Only add entries here AFTER personally verifying: several
 * commonly-quoted third-party maps (London=1, NY=43, Paris=192) point at
 * Chinese cities on Trip.com UK (Beijing, etc.).
 */
const VERIFIED_UK_IDS: Record<string, number> = {
  dubai: 220,
};

async function callGetSuggest(keyword: string): Promise<number | null> {
  try {
    const r = await fetch('https://uk.trip.com/restapi/soa2/10290/getSuggest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Locale': 'en-GB',
        'User-Agent': 'Mozilla/5.0 (compatible; JetMeAway/1.0)',
      },
      body: JSON.stringify({ keyword, tab: 'Hotel', locale: 'en-GB' }),
    });
    if (!r.ok) return null;
    const data = await r.json().catch(() => null);
    return extractCityId(data);
  } catch {
    return null;
  }
}

async function callKeyWordSearch(keyword: string): Promise<number | null> {
  try {
    const r = await fetch('https://uk.trip.com/htls/getKeyWordSearch?x-traceID=jma-resolver', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Locale': 'en-GB',
        'Currency': 'GBP',
        'User-Agent': 'Mozilla/5.0 (compatible; JetMeAway/1.0)',
      },
      body: JSON.stringify({
        keyWord: keyword,
        searchType: 'D',
        head: { locale: 'en-GB', currency: 'GBP', platform: 'PC' },
      }),
    });
    if (!r.ok) return null;
    const data = await r.json().catch(() => null);
    return extractCityId(data);
  } catch {
    return null;
  }
}

/**
 * Main resolver. Returns the Trip.com UK cityId, or `-1` if not resolvable
 * (builder interprets -1 as "use keyword mode").
 */
export async function resolveTripCityId(cityName: string): Promise<number> {
  if (!cityName) return -1;
  const slug = normaliseKey(cityName);
  const cacheKey = `tripid:${slug}`;

  // 1. KV cache (objects persist across redeploys, bare numbers too)
  try {
    const cached = await kv.get<{ id: number | null } | number>(cacheKey);
    if (cached !== null && cached !== undefined) {
      const id = typeof cached === 'number' ? cached : cached.id;
      return id ?? -1;
    }
  } catch (e) {
    console.error('[TripResolver] KV read failed', e);
  }

  // 2. Live resolve — suggest endpoint first (per Trip.com), keyword as fallback
  let id: number | null = await callGetSuggest(cityName);
  if (id == null) id = await callKeyWordSearch(cityName);

  // 3. Last-resort verified hardcode
  if (id == null && VERIFIED_UK_IDS[slug] != null) {
    id = VERIFIED_UK_IDS[slug];
  }

  if (id == null) {
    console.error(`[TripResolver] Failed to resolve ${cityName}`);
  }

  // 4. Cache the answer (positive or negative)
  try {
    await kv.set(cacheKey, { id }, { ex: id != null ? CACHE_TTL_HIT : CACHE_TTL_MISS });
  } catch (e) {
    console.error('[TripResolver] KV write failed', e);
  }

  return id ?? -1;
}
