import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { getHotels as liteapiGetHotels, type HotelOffer } from '@/lib/liteapi';
import { dedupeKey } from '@/lib/giata';
import { reportBug } from '@/lib/report-bug';
import { HotelSearchSchema, zodErrorToMessage } from '@/lib/hotel-schemas';
import { googlePlaceDetails } from '@/lib/google-places';

// Stays on edge for low-latency search. DOTW's node-only transport
// (MD5 + gzip) is proxied through `/api/hotels/dotw-search` (nodejs runtime).
export const runtime = 'edge';
// Hard ceiling on Edge function execution. Default Vercel kill is ~25s
// which we hit on Dubai 1A+1K-infant (LiteAPI rates fetch was slow on
// 2026-05-03 stress test). With maxDuration=60 the per-supplier 12s
// fetchTimeouts have headroom, AND the top-level try/catch can run its
// reportBug + soft 200 response before Vercel kills us.
export const maxDuration = 60;

const KV_TTL = 43200; // 12 hours

/** Airport / landmark name → nearest city LiteAPI actually has hotels for.
 *  LiteAPI's /data/hotels treats these as airport types and returns 0 rows
 *  when sent as cityName. Rewrite happens BEFORE resolveCountryCode so we
 *  also bypass the stale `geocode:cc:gatwick → GB` Nominatim KV cache. */
const AIRPORT_TO_CITY: Record<string, string> = {
  // UK airports
  'gatwick': 'horley',
  'heathrow': 'london',
  'stansted': 'london',
  'luton': 'luton',
  'london city': 'london',
  'london city airport': 'london',
  'manchester airport': 'manchester',
  'birmingham airport': 'birmingham',
  'edinburgh airport': 'edinburgh',
  'glasgow airport': 'glasgow',
  // London outer-suburbs that LiteAPI's /data/hotels has no city entry for.
  // We alias to "london" so /data/hotels returns Greater-London inventory
  // rather than 0 results. Croydon/Wembley/Greenwich/Docklands etc are
  // intentionally NOT aliased here — those already work via the haversine
  // post-filter at hotels-client.tsx (geo-proximity narrows London-wide
  // results to the borough). Only suburbs that LiteAPI returns 0 for AND
  // that are not in the geo-filter coord map get aliased. Added 2026-04-28
  // after user reported Coulsdon → 0 hotels.
  'coulsdon': 'london',
  'purley': 'london',
  'caterham': 'london',
  'kenley': 'london',
  'whyteleafe': 'london',
  'warlingham': 'london',
  // EU
  'cdg': 'paris', 'charles de gaulle': 'paris', 'orly': 'paris',
  'fco': 'rome', 'fiumicino': 'rome',
  'mxp': 'milan', 'malpensa': 'milan',
  'bcn': 'barcelona',
  'mad': 'madrid', 'barajas': 'madrid',
  'ams': 'amsterdam', 'schiphol': 'amsterdam',
  'fra': 'frankfurt',
  'muc': 'munich',
  'zrh': 'zurich',
  // US
  'jfk': 'new york', 'lga': 'new york', 'ewr': 'new york', 'newark': 'new york',
  'lax': 'los angeles',
  'mco': 'orlando',
  'mia': 'miami',
  'ord': 'chicago', "o'hare": 'chicago',
  'sfo': 'san francisco',
  'las': 'las vegas', 'mccarran': 'las vegas', 'harry reid': 'las vegas',
  // Asia / ME
  'dxb': 'dubai',
  'doh': 'doha',
  'sin': 'singapore', 'changi': 'singapore',
  'hnd': 'tokyo', 'haneda': 'tokyo', 'narita': 'tokyo',
  'bkk': 'bangkok', 'suvarnabhumi': 'bangkok',
  // Common alt-spellings — LiteAPI uses ONE canonical spelling per city,
  // so visitors typing the English variant get 0 results. Map English/local
  // alt → the spelling LiteAPI actually has indexed (verified by hitting
  // /data/hotels with each variant). Added 2026-04-28 after user reported
  // "Marrakesh" → 0 hotels (LiteAPI uses "Marrakech").
  'marrakesh': 'marrakech',
  'lisboa': 'lisbon',
  'köln': 'cologne', 'koeln': 'cologne',
  'münchen': 'munich', 'muenchen': 'munich',
  'wien': 'vienna',
  'firenze': 'florence',
  'napoli': 'naples',
  'venezia': 'venice',
  'praha': 'prague',
  'genève': 'geneva', 'geneve': 'geneva',
  'athína': 'athens', 'athina': 'athens',
  'moskva': 'moscow',
  'bombay': 'mumbai',
  'peking': 'beijing',
  'sharm': 'sharm el sheikh', 'sharm-el-sheikh': 'sharm el sheikh',
  'sharm el-sheikh': 'sharm el sheikh',
  'abudhabi': 'abu dhabi', 'abu-dhabi': 'abu dhabi',
  'kualalumpur': 'kuala lumpur', 'kuala-lumpur': 'kuala lumpur', 'kl': 'kuala lumpur',
  'hochiminh': 'ho chi minh city', 'saigon': 'ho chi minh city',
  'ho chi minh': 'ho chi minh city', 'hcmc': 'ho chi minh city',
  'newyork': 'new york', 'new-york': 'new york', 'nyc': 'new york',
  'losangeles': 'los angeles', 'los-angeles': 'los angeles', 'la': 'los angeles',
  'sanfrancisco': 'san francisco', 'san-francisco': 'san francisco', 'sf': 'san francisco',
  'lasvegas': 'las vegas', 'las-vegas': 'las vegas', 'vegas': 'las vegas',
  'goldcoast': 'gold coast', 'gold-coast': 'gold coast',
  'capetown': 'cape town', 'cape-town': 'cape town',
  'mexicocity': 'mexico city', 'mexico-city': 'mexico city',
  'puntacana': 'punta cana', 'punta-cana': 'punta cana',
  'rio': 'rio de janeiro', 'rio-de-janeiro': 'rio de janeiro',
  'buenosaires': 'buenos aires', 'buenos-aires': 'buenos aires',
  'saopaulo': 'sao paulo', 'sao-paulo': 'sao paulo', 'são paulo': 'sao paulo',
  'hk': 'hong kong', 'hongkong': 'hong kong', 'hong-kong': 'hong kong',
  'rahimyarkhan': 'rahim yar khan', 'rahim-yar-khan': 'rahim yar khan',
  'chiangmai': 'chiang mai', 'chiang-mai': 'chiang mai',
  'phuket island': 'phuket',
  'victoriafalls': 'victoria falls', 'victoria-falls': 'victoria falls',
  'playadelcarmen': 'playa del carmen', 'playa-del-carmen': 'playa del carmen',
  'monteguebay': 'montego bay', 'montego-bay': 'montego bay',
};

/** City → ISO-3166 alpha-2 country code for LiteAPI lookups */
const CITY_COUNTRY: Record<string, string> = {
  // Spain
  'barcelona': 'ES', 'madrid': 'ES', 'malaga': 'ES', 'alicante': 'ES', 'palma': 'ES',
  'tenerife': 'ES', 'lanzarote': 'ES', 'fuerteventura': 'ES', 'gran canaria': 'ES',
  'seville': 'ES', 'valencia': 'ES', 'ibiza': 'ES', 'marbella': 'ES',
  // UK & Ireland
  'london': 'GB', 'edinburgh': 'GB', 'manchester': 'GB', 'glasgow': 'GB',
  'liverpool': 'GB', 'birmingham': 'GB', 'bristol': 'GB', 'leeds': 'GB',
  'belfast': 'GB', 'cardiff': 'GB', 'dublin': 'IE',
  'horley': 'GB', 'crawley': 'GB', 'luton': 'GB',
  // France
  'paris': 'FR', 'nice': 'FR', 'lyon': 'FR', 'marseille': 'FR',
  // Italy
  'rome': 'IT', 'venice': 'IT', 'florence': 'IT', 'milan': 'IT', 'naples': 'IT', 'amalfi': 'IT',
  // Portugal
  'lisbon': 'PT', 'faro': 'PT', 'porto': 'PT', 'madeira': 'PT',
  // Central Europe
  'amsterdam': 'NL', 'berlin': 'DE', 'munich': 'DE', 'hamburg': 'DE', 'frankfurt': 'DE',
  'brussels': 'BE', 'antwerp': 'BE',
  'zurich': 'CH', 'geneva': 'CH', 'lucerne': 'CH',
  'vienna': 'AT', 'salzburg': 'AT',
  'prague': 'CZ', 'budapest': 'HU', 'warsaw': 'PL', 'krakow': 'PL',
  'copenhagen': 'DK', 'stockholm': 'SE', 'oslo': 'NO', 'helsinki': 'FI',
  // Greece
  'athens': 'GR', 'santorini': 'GR', 'crete': 'GR', 'rhodes': 'GR', 'corfu': 'GR', 'mykonos': 'GR',
  // Turkey
  'istanbul': 'TR', 'antalya': 'TR', 'bodrum': 'TR', 'dalaman': 'TR',
  // Balkans
  'dubrovnik': 'HR', 'split': 'HR',
  // Middle East
  'dubai': 'AE', 'abu dhabi': 'AE', 'doha': 'QA', 'muscat': 'OM',
  // Africa
  'cairo': 'EG', 'hurghada': 'EG', 'sharm el sheikh': 'EG',
  'marrakech': 'MA', 'casablanca': 'MA', 'agadir': 'MA',
  'cape town': 'ZA', 'johannesburg': 'ZA', 'durban': 'ZA',
  'nairobi': 'KE', 'zanzibar': 'TZ', 'victoria falls': 'ZW',
  'tunis': 'TN', 'hammamet': 'TN', 'sousse': 'TN',
  // Asia
  'tokyo': 'JP', 'osaka': 'JP', 'kyoto': 'JP',
  'bangkok': 'TH', 'phuket': 'TH', 'chiang mai': 'TH', 'pattaya': 'TH',
  'singapore': 'SG', 'kuala lumpur': 'MY',
  'bali': 'ID', 'jakarta': 'ID',
  'hong kong': 'HK', 'seoul': 'KR', 'taipei': 'TW',
  'hanoi': 'VN', 'ho chi minh city': 'VN',
  'mumbai': 'IN', 'delhi': 'IN', 'goa': 'IN',
  'colombo': 'LK',
  // Nepal
  'kathmandu': 'NP', 'pokhara': 'NP', 'chitwan': 'NP', 'lumbini': 'NP',
  // Pakistan
  'lahore': 'PK', 'islamabad': 'PK', 'karachi': 'PK', 'peshawar': 'PK',
  'faisalabad': 'PK', 'multan': 'PK', 'rahim yar khan': 'PK',
  // Americas
  'new york': 'US', 'los angeles': 'US', 'miami': 'US', 'las vegas': 'US',
  'orlando': 'US', 'san francisco': 'US', 'chicago': 'US', 'boston': 'US',
  'toronto': 'CA', 'vancouver': 'CA', 'montreal': 'CA',
  'cancun': 'MX', 'mexico city': 'MX', 'playa del carmen': 'MX',
  'havana': 'CU', 'punta cana': 'DO', 'montego bay': 'JM',
  'rio de janeiro': 'BR', 'sao paulo': 'BR', 'buenos aires': 'AR', 'lima': 'PE', 'bogota': 'CO',
  // Oceania
  'sydney': 'AU', 'melbourne': 'AU', 'gold coast': 'AU',
  'auckland': 'NZ', 'queenstown': 'NZ',
  // Caucasus & Central Asia
  'baku': 'AZ', 'yerevan': 'AM', 'tbilisi': 'GE',
  'ashgabat': 'TM', 'tashkent': 'UZ', 'almaty': 'KZ', 'astana': 'KZ',
  'bishkek': 'KG', 'dushanbe': 'TJ',
  // Islands
  'maldives': 'MV', 'mauritius': 'MU', 'seychelles': 'SC',
};

/** Look up country code for a city. Checks the hardcoded map first, then KV cache,
 *  and finally falls back to OpenStreetMap Nominatim geocoding. */
async function resolveCountryCode(cityKey: string): Promise<string | null> {
  // 1. Fast path: hardcoded map
  const cached = CITY_COUNTRY[cityKey];
  if (cached) return cached;

  // 2. Check KV cache (previous geocode results, TTL 30 days)
  const kvGeoKey = `geocode:cc:${cityKey}`;
  try {
    const kvCached = await kv.get<string>(kvGeoKey);
    if (kvCached) return kvCached;
  } catch { /* KV miss */ }

  // 3. Nominatim geocoding fallback
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityKey)}&format=json&limit=1&accept-language=en&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'JetMeAway/1.0 (jetmeaway.co.uk)',
        'Accept': 'application/json',
      },
    });
    if (!res.ok) {
      console.warn('[geocode] Nominatim returned', res.status, 'for', cityKey);
      return null;
    }
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      console.warn('[geocode] No results from Nominatim for:', cityKey);
      return null;
    }
    const cc = data[0]?.address?.country_code;
    if (!cc) {
      console.warn('[geocode] No country_code in Nominatim response for:', cityKey);
      return null;
    }
    const countryCode = cc.toUpperCase();
    console.log(`[geocode] Resolved ${cityKey} → ${countryCode} via Nominatim`);

    // Cache in KV for 30 days so we don't hit Nominatim again
    try { await kv.set(kvGeoKey, countryCode, { ex: 2592000 }); } catch { /* KV write fail */ }

    return countryCode;
  } catch (err) {
    console.warn('[geocode] Nominatim fetch failed for', cityKey, err);
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   RATEHAWK API (dual-race with LiteAPI)
   When RATEHAWK_API_KEY is set, both APIs are queried simultaneously via
   Promise.allSettled. Results are merged, deduplicated by hotel name, and
   the cheapest price wins.
   ═══════════════════════════════════════════════════════════════════════════ */
async function fetchRateHawkHotels(
  cityKey: string,
  checkin: string,
  checkout: string,
  adults: number,
  rooms: number,
  timeoutMs: number = 12000,
): Promise<HotelOffer[]> {
  const apiKey = process.env.RATEHAWK_API_KEY;
  if (!apiKey) return [];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const cityName = cityKey.charAt(0).toUpperCase() + cityKey.slice(1);

    const res = await fetch('https://api.worldota.net/api/b2b/v3/search/serp/hotels/', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(apiKey)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        checkin,
        checkout,
        destination: cityName,
        guests: [{ adults }],
        residency: 'gb',
        language: 'en',
        currency: 'GBP',
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[ratehawk] ${cityName} returned ${res.status}`);
      return [];
    }
    const data = await res.json();
    const hotels = data?.data?.hotels || [];

    return hotels.slice(0, 20).map((h: any) => ({
      hotelId: h.id,  // raw — normaliseRateHawk() stamps the `rh_` prefix
      hotelName: h.name || 'Hotel',
      price: h.min_price || 0,
      pricePerNight: h.min_price_per_night || 0,
      currency: 'GBP',
      stars: h.star_rating || 0,
      city: cityName,
      latitude: h.latitude,
      longitude: h.longitude,
      thumbnail: h.images?.[0]?.url || null,
      refundable: null,
      boardType: null,
      boardOptions: [],
      offerId: null,
      source: 'ratehawk' as any,
    }));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[ratehawk] fetch failed:`, message);
    return [];
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   DOTW / WEBBEDS API (third racer alongside LiteAPI + RateHawk)
   Proxied through `/api/hotels/dotw-search` (Node runtime) because DOTW
   needs MD5 + gzip. Keeps this handler on Edge. Mock fixtures still feed
   the pipeline end-to-end before live creds arrive — the sub-route does
   the same auto-fallback on `DOTW_USERNAME`.
   ═══════════════════════════════════════════════════════════════════════════ */
async function fetchDotwHotels(
  origin: string,
  cityKey: string,
  checkin: string,
  checkout: string,
  adults: number,
  childrenCount: number,
  childAgesParam: number[],
  rooms: number,
  timeoutMs: number = 12000,
): Promise<(HotelOffer & { giataId?: string | null; source: string })[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(`${origin}/api/hotels/dotw-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cityKey, checkin, checkout,
        adults, children: childrenCount, childAges: childAgesParam, rooms,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      console.warn(`[dotw] sub-route returned ${res.status}`);
      return [];
    }
    const data = await res.json();
    const offers = Array.isArray(data?.offers) ? data.offers : [];
    console.log(`[dotw] ${cityKey} ${checkin}→${checkout}: ${offers.length} offers`);
    return offers;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[dotw] fetch failed:`, message);
    return [];
  }
}

/** Fetch LiteAPI bookable offers with a hard timeout so we never block the response.
 *  When `placeId` is provided it's used as the `destinationId` — no country-code
 *  resolution needed. Otherwise falls back to cityName + countryCode. */
async function fetchLiteApiHotels(
  cityKey: string,
  checkin: string,
  checkout: string,
  adults: number,
  childrenCount: number,
  rooms: number,
  childAgesParam: number[] = [],
  timeoutMs: number = 12000,
  placeId?: string,
  // Optional WGS84 coords + radius for lat/lng-based LiteAPI search.
  // When supplied (and no destinationId-style placeId is set), we use
  // these instead of cityName so a search for Coulsdon doesn't get
  // aliased upstream into "London" and return Maida Vale / Wembley.
  // Caller is responsible for passing the centroid the visitor really
  // meant — we pass it straight to LiteAPI.
  centroid?: { lat: number; lng: number; radiusKm?: number },
): Promise<HotelOffer[]> {
  if (!process.env.LITE_API_KEY) {
    console.warn('[liteapi] LITE_API_KEY not set — skipping hotel search');
    return [];
  }

  // We DELIBERATELY ignore the Google Place ID for the LiteAPI call —
  // owner's instruction 2026-04-27. LiteAPI treats borough-level Google
  // Place IDs (Croydon, Wembley etc) as Greater-London regional pointers
  // and returns hotels from Docklands, Hammersmith, Greenwich etc when
  // the visitor only asked for Croydon. cityName + countryCode lookup
  // works correctly. The placeId is still used as a cache-key suffix
  // (kvKey) so two visitors picking the same Place ID share a cache hit,
  // but it's never sent to LiteAPI itself. The placeId argument is
  // kept in the signature to preserve callsite compatibility.
  void placeId; // intentionally unused for LiteAPI lookup
  const countryCode = await resolveCountryCode(cityKey);
  if (!countryCode) {
    console.warn('[liteapi] could not resolve country code for city:', cityKey);
    return [];
  }
  const resolvedCity = cityKey.charAt(0).toUpperCase() + cityKey.slice(1);
  const resolvedCountry = countryCode;
  const cityName = resolvedCity;

  // Build occupancy: one entry per room. Split adults across rooms (min 1 per
  // room). Put all children in the first room — LiteAPI allows uneven splits.
  const safeAdults = Math.max(1, adults);
  const safeRooms = Math.max(1, Math.min(5, rooms));
  const safeChildren = Math.max(0, childrenCount);
  const adultsPerRoom: number[] = [];
  let remaining = safeAdults;
  for (let i = 0; i < safeRooms; i++) {
    const a = i === safeRooms - 1 ? remaining : Math.max(1, Math.floor(safeAdults / safeRooms));
    adultsPerRoom.push(a);
    remaining -= a;
  }
  // Children are represented as an array of ages — LiteAPI expects integers.
  const childAges = childAgesParam.length > 0
    ? childAgesParam.slice(0, safeChildren)
    : Array.from({ length: safeChildren }, () => 8);
  while (childAges.length < safeChildren) childAges.push(8);
  const occupancy = adultsPerRoom.map((a, idx) => ({
    adults: a,
    children: idx === 0 ? childAges : [],
  }));

  const t0 = Date.now();
  try {
    // Two-track parallel fetch:
    //
    //   PRIMARY (500) — broad coverage, no star filter. LiteAPI's default
    //   ordering for big cities (Paris/London/NYC) skews heavily toward
    //   4-star properties so the cheapest segments only surface deeper
    //   into the list. Owner verified from their LiteAPI dashboard: Paris
    //   has 1,967 properties starting at £38 (hotelF1 / Adonis / Executive
    //   Hotel etc) — but the first 150 returned by the default-order list
    //   bottomed out at £80. Pulling 500 surfaces those budget tiers.
    //   Brand-spec: "scout is not only for rich people, its for everyone —
    //   students just book anything cheap, mostly hostels".
    //
    //   BUDGET (50) — explicit 0/1/2/3-star filter as a belt-and-braces
    //   guarantee. If LiteAPI ignores the starRating param the budget
    //   fetch returns the same set as primary; dedup-by-hotelId below is
    //   a no-op cost. If LiteAPI honours it, we pick up budget properties
    //   the primary fetch missed.
    //
    // Bandwidth: each LiteAPI rates fetch chunks into 50-hotel batches in
    // parallel. With limit=500 the rates call has to compute availability
    // for 500 hotels × N rooms × M occupants — when N >= 3 (multi-room
    // bookings) on big-city inventory (Paris, Istanbul, Dubai, Bangkok)
    // this routinely blew Vercel's 30s function timeout, returning a
    // platform-level FUNCTION_INVOCATION_TIMEOUT (HTML 504/500). Stress
    // test 2026-05-03 caught this on 6A/0K/3R for those four cities.
    //
    // Mitigation: scale limit by safeRooms so multi-room queries stay
    // tractable. 1 room → 500. 2 rooms → 250. 3+ rooms → 150. The budget
    // tier is also scaled (it duplicates the primary at high limits, so
    // we'd be paying twice). When a centroid is set (lat/lng search) we
    // already filter to 15km — limit=500 there is overkill anyway.
    const primaryLimit =
      safeRooms <= 1 ? 500 :
      safeRooms === 2 ? 250 :
      150;
    const budgetLimit = Math.min(50, Math.floor(primaryLimit / 4));

    const fetchTimeout = new Promise<HotelOffer[]>((_, reject) =>
      setTimeout(() => reject(new Error('LiteAPI timeout')), timeoutMs),
    );
    const [primaryResult, budgetResult] = await Promise.all([
      Promise.race([
        liteapiGetHotels({
          // lat/lng wins over cityName when the caller supplied a centroid
          // (small-town searches like Coulsdon). Falls back to cityName for
          // direct city searches that don't have explicit coords.
          ...(centroid
            ? {
                latitude: centroid.lat,
                longitude: centroid.lng,
                distanceKm: centroid.radiusKm ?? 15,
                countryCode: resolvedCountry,
              }
            : { cityName: resolvedCity, countryCode: resolvedCountry }),
          checkIn: checkin,
          checkOut: checkout,
          occupancy,
          currency: 'GBP',
          guestNationality: 'GB',
          limit: primaryLimit,
        }),
        fetchTimeout,
      ]).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`[liteapi:primary] ${cityName} failed:`, message);
        return [] as HotelOffer[];
      }),
      Promise.race([
        liteapiGetHotels({
          ...(centroid
            ? {
                latitude: centroid.lat,
                longitude: centroid.lng,
                distanceKm: centroid.radiusKm ?? 15,
                countryCode: resolvedCountry,
              }
            : { cityName: resolvedCity, countryCode: resolvedCountry }),
          checkIn: checkin,
          checkOut: checkout,
          occupancy,
          currency: 'GBP',
          guestNationality: 'GB',
          limit: budgetLimit,
          starRatings: [0, 1, 2, 3],
        }),
        fetchTimeout,
      ]).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`[liteapi:budget] ${cityName} failed:`, message);
        return [] as HotelOffer[];
      }),
    ]);
    // Merge + dedupe by hotelId. Primary wins on duplicates so its
    // (potentially negotiated) rate is preserved.
    const seenIds = new Set<string>();
    const merged: HotelOffer[] = [];
    for (const h of [...primaryResult, ...budgetResult]) {
      if (!h.hotelId || seenIds.has(h.hotelId)) continue;
      seenIds.add(h.hotelId);
      merged.push(h);
    }
    console.log(`[liteapi] ${cityName} (${resolvedCountry}) ${checkin}→${checkout}: primary=${primaryResult.length} + budget=${budgetResult.length} → merged=${merged.length} in ${Date.now() - t0}ms`);
    return merged;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[liteapi] ${cityName} (${resolvedCountry}) fetch failed after ${Date.now() - t0}ms:`, message);
    // Soft signal — search returns 0 hotels (handled gracefully by the
    // curated fallback) but owner should still know LiteAPI is misbehaving.
    reportBug('LiteAPI hotel search failed', {
      city: cityName,
      country: resolvedCountry,
      checkin,
      checkout,
      error: message,
    });
    return [];
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   CURATED HOTEL DATA

   The Hotellook engine API is no longer available (404).
   We maintain curated data for popular destinations. Each hotel has a
   realistic base price per night in GBP that the front-end uses as an
   indicative "from" price. Real prices are shown on provider sites via
   affiliate deep links.
   ═══════════════════════════════════════════════════════════════════════════ */

interface CuratedHotel {
  id: number;
  name: string;
  stars: number;
  basePrice: number; // GBP per night indicative
  district: string;
}

/* City-centre coordinates for Scout neighbourhood lookups */
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'barcelona': { lat: 41.3874, lng: 2.1686 },
  'london': { lat: 51.5074, lng: -0.1278 },
  'paris': { lat: 48.8566, lng: 2.3522 },
  'dubai': { lat: 25.2048, lng: 55.2708 },
  'amsterdam': { lat: 52.3676, lng: 4.9041 },
  'rome': { lat: 41.9028, lng: 12.4964 },
  'madrid': { lat: 40.4168, lng: -3.7038 },
  'lisbon': { lat: 38.7223, lng: -9.1393 },
  'istanbul': { lat: 41.0082, lng: 28.9784 },
  'new york': { lat: 40.7128, lng: -74.006 },
  'tokyo': { lat: 35.6762, lng: 139.6503 },
  'bangkok': { lat: 13.7563, lng: 100.5018 },
  'singapore': { lat: 1.3521, lng: 103.8198 },
  'bali': { lat: -8.3405, lng: 115.092 },
  'malaga': { lat: 36.7213, lng: -4.4214 },
  'tenerife': { lat: 28.2916, lng: -16.6291 },
  'nice': { lat: 43.7102, lng: 7.262 },
  'venice': { lat: 45.4408, lng: 12.3155 },
  'florence': { lat: 43.7696, lng: 11.2558 },
  'milan': { lat: 45.4642, lng: 9.19 },
  'athens': { lat: 37.9838, lng: 23.7275 },
  'santorini': { lat: 36.3932, lng: 25.4615 },
  'crete': { lat: 35.2401, lng: 24.4709 },
  'antalya': { lat: 36.8969, lng: 30.7133 },
  'dubrovnik': { lat: 42.6507, lng: 18.0944 },
  'edinburgh': { lat: 55.9533, lng: -3.1883 },
  'manchester': { lat: 53.4808, lng: -2.2426 },
  'faro': { lat: 37.0194, lng: -7.9322 },
  'lanzarote': { lat: 28.9638, lng: -13.5477 },
  'fuerteventura': { lat: 28.3587, lng: -14.0538 },
  'alicante': { lat: 38.3452, lng: -0.481 },
  'palma': { lat: 39.5696, lng: 2.6502 },
  'rhodes': { lat: 36.4341, lng: 28.2176 },
  'corfu': { lat: 39.6243, lng: 19.9217 },
  'split': { lat: 43.5081, lng: 16.4402 },
  'bodrum': { lat: 37.0344, lng: 27.4305 },
  'dalaman': { lat: 36.7666, lng: 28.7929 },
  'marrakech': { lat: 31.6295, lng: -7.9811 },
  'cairo': { lat: 30.0444, lng: 31.2357 },
  'cancun': { lat: 21.1619, lng: -86.8515 },
  'phuket': { lat: 7.8804, lng: 98.3923 },
  'maldives': { lat: 4.1755, lng: 73.5093 },
  'sydney': { lat: -33.8688, lng: 151.2093 },
  'cape town': { lat: -33.9249, lng: 18.4241 },
  'los angeles': { lat: 34.0522, lng: -118.2437 },
  'miami': { lat: 25.7617, lng: -80.1918 },
  'gran canaria': { lat: 27.9202, lng: -15.5474 },
  'glasgow': { lat: 55.8642, lng: -4.2518 },
  'liverpool': { lat: 53.4084, lng: -2.9916 },
  'birmingham': { lat: 52.4862, lng: -1.8904 },
  // London boroughs / sub-areas — needed because LiteAPI treats their
  // Google Place IDs as "Greater London" regional pointers and returns
  // hotels from anywhere in the metro area. Distance post-filter
  // (RADIUS_KM) trims results back to actual borough proximity.
  'croydon': { lat: 51.3724, lng: -0.1018 },
  'wembley': { lat: 51.5560, lng: -0.2796 },
  'stratford': { lat: 51.5416, lng: -0.0042 },
  'greenwich': { lat: 51.4826, lng: 0.0077 },
  'hammersmith': { lat: 51.4923, lng: -0.2229 },
  'kensington': { lat: 51.4988, lng: -0.1749 },
  'shoreditch': { lat: 51.5236, lng: -0.0796 },
  'canary wharf': { lat: 51.5054, lng: -0.0235 },
  'docklands': { lat: 51.5004, lng: -0.0235 },
  // South-London suburbs (Croydon-borough towns + neighbours) — flagged
  // 2026-05-03 when a Coulsdon search returned hotels from Maida Vale,
  // Greenwich, Wembley, Highbury, Ealing, Kensington, ExCel. LiteAPI treats
  // these town-level Google Place IDs as Greater-London pointers, so without
  // a coords entry the geo filter returns true for everything.
  'coulsdon': { lat: 51.3193, lng: -0.1393 },
  'purley': { lat: 51.3370, lng: -0.1106 },
  'sutton': { lat: 51.3618, lng: -0.1945 },
  'bromley': { lat: 51.4039, lng: 0.0149 },
  'kingston upon thames': { lat: 51.4123, lng: -0.3007 },
  'kingston': { lat: 51.4123, lng: -0.3007 },
  'richmond': { lat: 51.4613, lng: -0.3037 },
  'twickenham': { lat: 51.4467, lng: -0.3320 },
  'harrow': { lat: 51.5793, lng: -0.3346 },
  'ealing': { lat: 51.5130, lng: -0.3027 },
  'wimbledon': { lat: 51.4214, lng: -0.2064 },
  'clapham': { lat: 51.4625, lng: -0.1380 },
  'brixton': { lat: 51.4626, lng: -0.1147 },
  'hackney': { lat: 51.5450, lng: -0.0553 },
  'islington': { lat: 51.5362, lng: -0.1033 },
  'camden': { lat: 51.5390, lng: -0.1426 },
  'paddington': { lat: 51.5154, lng: -0.1755 },
  'westminster': { lat: 51.4975, lng: -0.1357 },
  'chelsea': { lat: 51.4875, lng: -0.1687 },
  // UK home-counties towns LiteAPI also tends to mishandle similarly.
  'watford': { lat: 51.6565, lng: -0.3903 },
  'slough': { lat: 51.5105, lng: -0.5950 },
  'reading': { lat: 51.4543, lng: -0.9781 },
  'guildford': { lat: 51.2362, lng: -0.5704 },
  'brighton': { lat: 50.8225, lng: -0.1372 },
  'hove': { lat: 50.8285, lng: -0.1671 },
  // Larger UK regional cities
  'oxford': { lat: 51.7520, lng: -1.2577 },
  'cambridge': { lat: 52.2053, lng: 0.1218 },
  'bristol': { lat: 51.4545, lng: -2.5879 },
  'leeds': { lat: 53.8008, lng: -1.5491 },
  'sheffield': { lat: 53.3811, lng: -1.4701 },
  'nottingham': { lat: 52.9548, lng: -1.1581 },
  'newcastle': { lat: 54.9783, lng: -1.6178 },
  'cardiff': { lat: 51.4816, lng: -3.1791 },
  'belfast': { lat: 54.5973, lng: -5.9301 },
  'york': { lat: 53.9590, lng: -1.0815 },
  'bath': { lat: 51.3811, lng: -2.3590 },
};

// Radius (km) within which a hotel must lie of the searched city centre
// to be returned. For London-borough scale searches we want ~10km so
// neighbouring boroughs (Greenwich/Hammersmith) don't get pulled in
// when the visitor explicitly asked for Croydon. For full-metro
// searches (London, NYC, Tokyo) we want a generous radius so visitors
// who type "London" still see hotels in Westminster, Shoreditch, etc.
// Default for any city not listed: 25km (errs toward inclusive).
const CITY_RADIUS_KM: Record<string, number> = {
  // London boroughs — strict so a "Croydon" search doesn't return Hammersmith
  'croydon': 10,
  'wembley': 10,
  'stratford': 10,
  'greenwich': 10,
  'hammersmith': 10,
  'kensington': 8,
  'shoreditch': 8,
  'canary wharf': 8,
  'docklands': 8,
  // South-London suburbs / Croydon-borough towns — wide enough to catch
  // genuine local stays since LiteAPI inventory in pure-residential pockets
  // (Coulsdon, Purley) is sparse; a 5-mile radius would return 0.
  // 2026-05-03: was 8km, bumped to 15km after a Coulsdon search showed
  // London-Zone-1 hotels (Maida Vale, Greenwich, ExCel) — wrong direction
  // entirely. 15km still excludes North London + Canary Wharf but pulls in
  // Sutton/Croydon-town/Banstead/Caterham which is what a Coulsdon visitor
  // would actually drive to.
  'coulsdon': 15,
  'purley': 15,
  'sutton': 15,
  'bromley': 15,
  'kingston upon thames': 15,
  'kingston': 15,
  'richmond': 15,
  'twickenham': 15,
  'harrow': 15,
  'ealing': 15,
  'wimbledon': 12,
  'clapham': 6,
  'brixton': 6,
  'hackney': 6,
  'islington': 6,
  'camden': 6,
  'paddington': 6,
  'westminster': 6,
  'chelsea': 6,
  // Home-counties towns — give a bit more room since hotel inventory is
  // sparser and a 5-mile radius would reject genuine matches.
  'watford': 10,
  'slough': 10,
  'reading': 10,
  'guildford': 10,
  'brighton': 10,
  'hove': 10,
  // UK regional cities — full metro, keep wide.
  'oxford': 12,
  'cambridge': 12,
  'bristol': 15,
  'leeds': 15,
  'sheffield': 15,
  'nottingham': 15,
  'newcastle': 15,
  'cardiff': 15,
  'belfast': 15,
  'york': 10,
  'bath': 8,
  // Full-metro searches — keep wide
  'london': 25,
  'new york': 25,
  'paris': 20,
  'tokyo': 30,
};
const DEFAULT_RADIUS_KM = 25;

/** Haversine distance in km between two lat/lng points. */
function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

const CURATED: Record<string, CuratedHotel[]> = {
  'barcelona': [
    { id: 1, name: 'Hotel Arts Barcelona', stars: 5, basePrice: 280, district: 'Port Olímpic' },
    { id: 2, name: 'W Barcelona', stars: 5, basePrice: 250, district: 'Barceloneta' },
    { id: 3, name: 'Mandarin Oriental', stars: 5, basePrice: 320, district: 'Passeig de Gràcia' },
    { id: 4, name: 'Hotel Casa Fuster', stars: 5, basePrice: 190, district: 'Gràcia' },
    { id: 5, name: 'Catalonia Passeig de Gràcia', stars: 4, basePrice: 110, district: 'Eixample' },
    { id: 6, name: 'H10 Casanova', stars: 4, basePrice: 95, district: 'Eixample' },
    { id: 7, name: 'Hotel Barcelona 1882', stars: 4, basePrice: 120, district: 'Eixample' },
    { id: 8, name: 'Acta Atrium Palace', stars: 4, basePrice: 85, district: 'Eixample' },
    { id: 9, name: 'Hostal Grau', stars: 2, basePrice: 55, district: 'El Raval' },
    { id: 10, name: 'Generator Barcelona', stars: 2, basePrice: 35, district: 'Gràcia' },
  ],
  'london': [
    { id: 11, name: 'The Savoy', stars: 5, basePrice: 450, district: 'Strand' },
    { id: 12, name: 'Shangri-La The Shard', stars: 5, basePrice: 380, district: 'London Bridge' },
    { id: 13, name: 'The Langham', stars: 5, basePrice: 340, district: 'Marylebone' },
    { id: 14, name: 'Park Plaza Westminster', stars: 4, basePrice: 160, district: 'Westminster' },
    { id: 15, name: 'Premier Inn Hub London', stars: 3, basePrice: 90, district: 'Soho' },
    { id: 16, name: 'Travelodge London City', stars: 3, basePrice: 75, district: 'City of London' },
    { id: 17, name: 'The Z Hotel Covent Garden', stars: 3, basePrice: 95, district: 'Covent Garden' },
    { id: 18, name: 'Holiday Inn Express Southwark', stars: 3, basePrice: 85, district: 'Southwark' },
    { id: 19, name: 'Generator London', stars: 2, basePrice: 30, district: "King's Cross" },
    { id: 20, name: 'Wombat City Hostel', stars: 2, basePrice: 28, district: 'Whitechapel' },
  ],
  'paris': [
    { id: 21, name: 'Le Meurice', stars: 5, basePrice: 520, district: '1st Arrondissement' },
    { id: 22, name: 'Hôtel Plaza Athénée', stars: 5, basePrice: 480, district: '8th Arrondissement' },
    { id: 23, name: 'Hôtel de Crillon', stars: 5, basePrice: 550, district: 'Place de la Concorde' },
    { id: 24, name: 'Pullman Paris Tour Eiffel', stars: 4, basePrice: 180, district: '15th Arrondissement' },
    { id: 25, name: 'Hôtel Eiffel Blomet', stars: 4, basePrice: 130, district: '15th Arrondissement' },
    { id: 26, name: 'Ibis Styles Paris Eiffel', stars: 3, basePrice: 90, district: '15th Arrondissement' },
    { id: 27, name: 'Generator Paris', stars: 2, basePrice: 35, district: '10th Arrondissement' },
    { id: 28, name: 'Hôtel du Nord', stars: 3, basePrice: 85, district: 'Canal Saint-Martin' },
  ],
  'dubai': [
    { id: 31, name: 'Burj Al Arab Jumeirah', stars: 5, basePrice: 1200, district: 'Jumeirah' },
    { id: 32, name: 'Atlantis The Royal', stars: 5, basePrice: 450, district: 'Palm Jumeirah' },
    { id: 33, name: 'Address Downtown', stars: 5, basePrice: 280, district: 'Downtown Dubai' },
    { id: 34, name: 'JW Marriott Marquis', stars: 5, basePrice: 180, district: 'Business Bay' },
    { id: 35, name: 'Rove Downtown', stars: 3, basePrice: 65, district: 'Downtown Dubai' },
    { id: 36, name: 'Premier Inn Dubai Silicon Oasis', stars: 3, basePrice: 40, district: 'Silicon Oasis' },
    { id: 37, name: 'Citymax Hotel Al Barsha', stars: 3, basePrice: 35, district: 'Al Barsha' },
  ],
  'amsterdam': [
    { id: 41, name: 'Hotel De L\'Europe', stars: 5, basePrice: 350, district: 'City Centre' },
    { id: 42, name: 'Waldorf Astoria Amsterdam', stars: 5, basePrice: 400, district: 'Herengracht' },
    { id: 43, name: 'NH Collection Flower Market', stars: 4, basePrice: 160, district: 'City Centre' },
    { id: 44, name: 'Motel One Amsterdam', stars: 3, basePrice: 95, district: 'Waterlooplein' },
    { id: 45, name: 'The Flying Pig Downtown', stars: 2, basePrice: 30, district: 'City Centre' },
    { id: 46, name: 'Hampshire Hotel Eden', stars: 4, basePrice: 120, district: 'Amstel' },
  ],
  'rome': [
    { id: 51, name: 'Hotel de Russie', stars: 5, basePrice: 420, district: 'Piazza del Popolo' },
    { id: 52, name: 'Hotel Hassler Roma', stars: 5, basePrice: 380, district: 'Spanish Steps' },
    { id: 53, name: 'Hotel Artemide', stars: 4, basePrice: 150, district: 'Via Nazionale' },
    { id: 54, name: 'Hotel Colosseum', stars: 3, basePrice: 90, district: 'Monti' },
    { id: 55, name: 'The Yellow Hostel', stars: 2, basePrice: 28, district: 'Termini' },
    { id: 56, name: 'Hotel Quirinale', stars: 4, basePrice: 130, district: 'Repubblica' },
  ],
  'madrid': [
    { id: 61, name: 'The Westin Palace', stars: 5, basePrice: 250, district: 'Paseo del Prado' },
    { id: 62, name: 'Hotel Ritz Madrid', stars: 5, basePrice: 350, district: 'Retiro' },
    { id: 63, name: 'NH Madrid Nacional', stars: 4, basePrice: 110, district: 'Atocha' },
    { id: 64, name: 'Room Mate Oscar', stars: 3, basePrice: 85, district: 'Chueca' },
    { id: 65, name: 'Far Home Atocha', stars: 2, basePrice: 25, district: 'Lavapiés' },
  ],
  'lisbon': [
    { id: 71, name: 'Four Seasons Ritz Lisbon', stars: 5, basePrice: 350, district: 'Marquês de Pombal' },
    { id: 72, name: 'Bairro Alto Hotel', stars: 5, basePrice: 280, district: 'Bairro Alto' },
    { id: 73, name: 'Hotel Avenida Palace', stars: 4, basePrice: 130, district: 'Baixa' },
    { id: 74, name: 'Lisboa Pessoa Hotel', stars: 4, basePrice: 100, district: 'Chiado' },
    { id: 75, name: 'Home Lisbon Hostel', stars: 2, basePrice: 22, district: 'Baixa' },
  ],
  'istanbul': [
    { id: 81, name: 'Four Seasons Sultanahmet', stars: 5, basePrice: 320, district: 'Sultanahmet' },
    { id: 82, name: 'Ciragan Palace Kempinski', stars: 5, basePrice: 380, district: 'Beşiktaş' },
    { id: 83, name: 'Dosso Dossi Hotels', stars: 4, basePrice: 55, district: 'Fatih' },
    { id: 84, name: 'Hotel Momento Golden Horn', stars: 4, basePrice: 45, district: 'Beyoğlu' },
    { id: 85, name: 'Cheers Hostel', stars: 2, basePrice: 12, district: 'Sultanahmet' },
  ],
  'new york': [
    { id: 91, name: 'The Plaza', stars: 5, basePrice: 550, district: 'Midtown' },
    { id: 92, name: 'The Standard High Line', stars: 4, basePrice: 280, district: 'Meatpacking' },
    { id: 93, name: 'Pod 51 Hotel', stars: 3, basePrice: 120, district: 'Midtown East' },
    { id: 94, name: 'YOTEL New York', stars: 3, basePrice: 140, district: 'Hell\'s Kitchen' },
    { id: 95, name: 'HI New York City Hostel', stars: 2, basePrice: 45, district: 'Upper West Side' },
  ],
  'tokyo': [
    { id: 101, name: 'Aman Tokyo', stars: 5, basePrice: 600, district: 'Otemachi' },
    { id: 102, name: 'Park Hyatt Tokyo', stars: 5, basePrice: 400, district: 'Shinjuku' },
    { id: 103, name: 'Shinjuku Granbell Hotel', stars: 3, basePrice: 80, district: 'Shinjuku' },
    { id: 104, name: 'APA Hotel Shinjuku', stars: 3, basePrice: 55, district: 'Shinjuku' },
    { id: 105, name: 'Khaosan World Asakusa', stars: 2, basePrice: 20, district: 'Asakusa' },
  ],
  'bangkok': [
    { id: 111, name: 'Mandarin Oriental Bangkok', stars: 5, basePrice: 280, district: 'Riverside' },
    { id: 112, name: 'Lebua at State Tower', stars: 5, basePrice: 150, district: 'Silom' },
    { id: 113, name: 'Amara Bangkok', stars: 4, basePrice: 55, district: 'Siam' },
    { id: 114, name: 'Ibis Styles Bangkok', stars: 3, basePrice: 30, district: 'Sukhumvit' },
    { id: 115, name: 'NapPark Hostel', stars: 2, basePrice: 10, district: 'Khao San' },
  ],
  'singapore': [
    { id: 121, name: 'Marina Bay Sands', stars: 5, basePrice: 380, district: 'Marina Bay' },
    { id: 122, name: 'Raffles Hotel', stars: 5, basePrice: 550, district: 'City Hall' },
    { id: 123, name: 'Naumi Hotel', stars: 4, basePrice: 130, district: 'City Hall' },
    { id: 124, name: 'Hotel G Singapore', stars: 3, basePrice: 80, district: 'Bugis' },
    { id: 125, name: 'The Pod Boutique Capsule', stars: 2, basePrice: 25, district: 'Bugis' },
  ],
  'bali': [
    { id: 131, name: 'Four Seasons Jimbaran', stars: 5, basePrice: 350, district: 'Jimbaran' },
    { id: 132, name: 'The Mulia Nusa Dua', stars: 5, basePrice: 250, district: 'Nusa Dua' },
    { id: 133, name: 'Alila Seminyak', stars: 4, basePrice: 120, district: 'Seminyak' },
    { id: 134, name: 'Kuta Paradiso Hotel', stars: 4, basePrice: 40, district: 'Kuta' },
    { id: 135, name: 'Puri Garden Hotel', stars: 3, basePrice: 18, district: 'Ubud' },
  ],
  'malaga': [
    { id: 141, name: 'Gran Hotel Miramar', stars: 5, basePrice: 220, district: 'Malagueta' },
    { id: 142, name: 'Vincci Selección Posada del Patio', stars: 5, basePrice: 170, district: 'Centro' },
    { id: 143, name: 'Molina Lario Hotel', stars: 4, basePrice: 110, district: 'Centro' },
    { id: 144, name: 'Hotel Sur Málaga', stars: 3, basePrice: 55, district: 'Centro' },
    { id: 145, name: 'Feel Hostel City Center', stars: 2, basePrice: 25, district: 'Centro' },
  ],
  'tenerife': [
    { id: 151, name: 'The Ritz-Carlton Abama', stars: 5, basePrice: 280, district: 'Guía de Isora' },
    { id: 152, name: 'Hard Rock Hotel Tenerife', stars: 5, basePrice: 180, district: 'Adeje' },
    { id: 153, name: 'H10 Costa Adeje Palace', stars: 4, basePrice: 100, district: 'Costa Adeje' },
    { id: 154, name: 'Hotel Colón Rambla', stars: 3, basePrice: 55, district: 'Santa Cruz' },
  ],
  'nice': [
    { id: 161, name: 'Hôtel Negresco', stars: 5, basePrice: 300, district: 'Promenade des Anglais' },
    { id: 162, name: 'Hyatt Regency Nice', stars: 5, basePrice: 220, district: 'Promenade des Anglais' },
    { id: 163, name: 'Hotel Aston La Scala', stars: 4, basePrice: 120, district: 'Centre Ville' },
    { id: 164, name: 'Hotel Ozz Nice', stars: 2, basePrice: 30, district: 'Centre Ville' },
  ],
  'venice': [
    { id: 171, name: 'The Gritti Palace', stars: 5, basePrice: 550, district: 'San Marco' },
    { id: 172, name: 'Hotel Danieli', stars: 5, basePrice: 420, district: 'San Marco' },
    { id: 173, name: 'Hotel Ai Cavalieri', stars: 4, basePrice: 130, district: 'Dorsoduro' },
    { id: 174, name: 'Generator Venice', stars: 2, basePrice: 30, district: 'Giudecca' },
  ],
  'florence': [
    { id: 181, name: 'The St. Regis Florence', stars: 5, basePrice: 400, district: 'Lungarno' },
    { id: 182, name: 'Hotel Brunelleschi', stars: 4, basePrice: 180, district: 'Duomo' },
    { id: 183, name: 'Hotel Davanzati', stars: 3, basePrice: 95, district: 'Centro' },
    { id: 184, name: 'Plus Florence', stars: 2, basePrice: 25, district: 'Santa Maria Novella' },
  ],
  'milan': [
    { id: 191, name: 'Armani Hotel Milano', stars: 5, basePrice: 450, district: 'Quadrilatero' },
    { id: 192, name: 'Château Monfort', stars: 5, basePrice: 220, district: 'Porta Venezia' },
    { id: 193, name: 'NYX Hotel Milan', stars: 4, basePrice: 100, district: 'Centrale' },
    { id: 194, name: 'Ostello Bello Grande', stars: 2, basePrice: 28, district: 'Centrale' },
  ],
  'athens': [
    { id: 201, name: 'Hotel Grande Bretagne', stars: 5, basePrice: 280, district: 'Syntagma' },
    { id: 202, name: 'Electra Palace Athens', stars: 5, basePrice: 180, district: 'Plaka' },
    { id: 203, name: 'Athens Was Hotel', stars: 4, basePrice: 110, district: 'Koukaki' },
    { id: 204, name: 'Athens Backpackers', stars: 2, basePrice: 18, district: 'Makrigianni' },
  ],
  'santorini': [
    { id: 211, name: 'Canaves Oia Suites', stars: 5, basePrice: 450, district: 'Oia' },
    { id: 212, name: 'Andronis Luxury Suites', stars: 5, basePrice: 380, district: 'Oia' },
    { id: 213, name: 'El Greco Resort', stars: 4, basePrice: 100, district: 'Fira' },
    { id: 214, name: 'Caveland Hostel', stars: 2, basePrice: 25, district: 'Karterados' },
  ],
  'crete': [
    { id: 221, name: 'Blue Palace Resort', stars: 5, basePrice: 250, district: 'Elounda' },
    { id: 222, name: 'Domes Noruz Chania', stars: 5, basePrice: 200, district: 'Chania' },
    { id: 223, name: 'Galaxy Hotel Heraklion', stars: 5, basePrice: 110, district: 'Heraklion' },
    { id: 224, name: 'Lato Boutique Hotel', stars: 3, basePrice: 60, district: 'Heraklion' },
  ],
  'antalya': [
    { id: 231, name: 'Mardan Palace', stars: 5, basePrice: 180, district: 'Kundu' },
    { id: 232, name: 'Rixos Downtown Antalya', stars: 5, basePrice: 150, district: 'Konyaaltı' },
    { id: 233, name: 'Akra Hotel', stars: 5, basePrice: 120, district: 'Lara' },
    { id: 234, name: 'Hotel SU', stars: 4, basePrice: 60, district: 'Konyaaltı' },
    { id: 235, name: 'White Garden Hotel', stars: 3, basePrice: 25, district: 'Kaleiçi' },
  ],
  'dubrovnik': [
    { id: 241, name: 'Hotel Excelsior Dubrovnik', stars: 5, basePrice: 280, district: 'Ploče' },
    { id: 242, name: 'Hotel Stari Grad', stars: 4, basePrice: 150, district: 'Old Town' },
    { id: 243, name: 'Hotel Lero', stars: 4, basePrice: 80, district: 'Lapad' },
    { id: 244, name: 'Hostel Angelina Old Town', stars: 2, basePrice: 25, district: 'Old Town' },
  ],
  'edinburgh': [
    { id: 251, name: 'The Balmoral', stars: 5, basePrice: 300, district: 'Princes Street' },
    { id: 252, name: 'The Scotsman Hotel', stars: 5, basePrice: 200, district: 'Old Town' },
    { id: 253, name: 'Apex Grassmarket Hotel', stars: 4, basePrice: 110, district: 'Grassmarket' },
    { id: 254, name: 'Motel One Edinburgh-Royal', stars: 3, basePrice: 75, district: 'Royal Mile' },
    { id: 255, name: 'Castle Rock Hostel', stars: 2, basePrice: 20, district: 'Old Town' },
  ],
  'manchester': [
    { id: 261, name: 'The Edwardian Manchester', stars: 5, basePrice: 180, district: 'City Centre' },
    { id: 262, name: 'Hotel Gotham', stars: 5, basePrice: 160, district: 'City Centre' },
    { id: 263, name: 'Motel One Manchester-Royal Exchange', stars: 3, basePrice: 65, district: 'City Centre' },
    { id: 264, name: 'YHA Manchester', stars: 2, basePrice: 22, district: 'Castlefield' },
  ],
  'faro': [
    { id: 271, name: 'AP Eva Senses Hotel', stars: 4, basePrice: 90, district: 'City Centre' },
    { id: 272, name: 'Hotel Faro & Beach Club', stars: 4, basePrice: 100, district: 'City Centre' },
    { id: 273, name: 'Stay Hotel Faro Centro', stars: 3, basePrice: 55, district: 'City Centre' },
    { id: 274, name: 'Casa d\'Alagoa', stars: 2, basePrice: 30, district: 'City Centre' },
  ],
  'lanzarote': [
    { id: 281, name: 'Princesa Yaiza Suite Hotel', stars: 5, basePrice: 220, district: 'Playa Blanca' },
    { id: 282, name: 'H10 Rubicón Palace', stars: 4, basePrice: 110, district: 'Playa Blanca' },
    { id: 283, name: 'Hotel Lancelot', stars: 3, basePrice: 60, district: 'Arrecife' },
  ],
  'fuerteventura': [
    { id: 291, name: 'Barceló Fuerteventura Royal Level', stars: 5, basePrice: 180, district: 'Caleta de Fuste' },
    { id: 292, name: 'R2 Bahía Playa Design Hotel', stars: 4, basePrice: 80, district: 'Tarajalejo' },
    { id: 293, name: 'Hotel Playa Sur Tenerife', stars: 3, basePrice: 50, district: 'El Médano' },
  ],
  'alicante': [
    { id: 301, name: 'Hospes Amérigo', stars: 5, basePrice: 180, district: 'Old Town' },
    { id: 302, name: 'Hotel Meliá Alicante', stars: 4, basePrice: 100, district: 'Playa del Postiguet' },
    { id: 303, name: 'Hotel Eurostars Lucentum', stars: 4, basePrice: 65, district: 'City Centre' },
  ],
  'palma': [
    { id: 311, name: 'Hotel Can Alomar', stars: 5, basePrice: 250, district: 'Old Town' },
    { id: 312, name: 'HM Jaime III', stars: 4, basePrice: 100, district: 'Jaime III' },
    { id: 313, name: 'Hotel Saratoga', stars: 4, basePrice: 90, district: 'Paseo Mallorca' },
    { id: 314, name: 'Hostal Apuntadores', stars: 2, basePrice: 40, district: 'La Lonja' },
  ],
  'rhodes': [
    { id: 321, name: 'Atrium Prestige Resort', stars: 5, basePrice: 180, district: 'Lachania' },
    { id: 322, name: 'Spirit of the Knights', stars: 4, basePrice: 120, district: 'Old Town' },
    { id: 323, name: 'Stay Hotel Rhodes', stars: 3, basePrice: 50, district: 'Rhodes Town' },
  ],
  'corfu': [
    { id: 331, name: 'Grecotel Corfu Imperial', stars: 5, basePrice: 200, district: 'Kommeno' },
    { id: 332, name: 'Bella Venezia', stars: 3, basePrice: 70, district: 'Corfu Town' },
    { id: 333, name: 'Pink Palace Beach Resort', stars: 2, basePrice: 30, district: 'Agios Gordios' },
  ],
  'split': [
    { id: 341, name: 'Hotel Park Split', stars: 5, basePrice: 180, district: 'Bačvice' },
    { id: 342, name: 'Radisson Blu Resort', stars: 4, basePrice: 120, district: 'City Centre' },
    { id: 343, name: 'Hotel Peristil', stars: 4, basePrice: 85, district: 'Diocletian\'s Palace' },
  ],
  'bodrum': [
    { id: 351, name: 'Mandarin Oriental Bodrum', stars: 5, basePrice: 350, district: 'Paradise Bay' },
    { id: 352, name: 'Voyage Bodrum', stars: 5, basePrice: 150, district: 'Torba' },
    { id: 353, name: 'Costa Bodrum City', stars: 3, basePrice: 40, district: 'City Centre' },
  ],
  'dalaman': [
    { id: 361, name: 'Hilton Dalaman Sarıgerme', stars: 5, basePrice: 140, district: 'Sarıgerme' },
    { id: 362, name: 'TUI BLUE Sarıgerme', stars: 5, basePrice: 110, district: 'Sarıgerme' },
    { id: 363, name: 'Hotel Caria Royal', stars: 4, basePrice: 50, district: 'Dalaman' },
  ],
  'marrakech': [
    { id: 371, name: 'Royal Mansour Marrakech', stars: 5, basePrice: 600, district: 'Medina' },
    { id: 372, name: 'La Mamounia', stars: 5, basePrice: 400, district: 'Medina' },
    { id: 373, name: 'Riad Kniza', stars: 4, basePrice: 80, district: 'Medina' },
    { id: 374, name: 'Riad Dar Anika', stars: 3, basePrice: 35, district: 'Medina' },
  ],
  'cairo': [
    { id: 381, name: 'Marriott Mena House', stars: 5, basePrice: 180, district: 'Giza' },
    { id: 382, name: 'Kempinski Nile Hotel', stars: 5, basePrice: 150, district: 'Garden City' },
    { id: 383, name: 'Steigenberger Hotel El Tahrir', stars: 4, basePrice: 55, district: 'Downtown' },
    { id: 384, name: 'Meramees Hostel', stars: 2, basePrice: 10, district: 'Downtown' },
  ],
  'cancun': [
    { id: 391, name: 'Ritz-Carlton Cancún', stars: 5, basePrice: 350, district: 'Hotel Zone' },
    { id: 392, name: 'Hyatt Ziva Cancún', stars: 5, basePrice: 250, district: 'Hotel Zone' },
    { id: 393, name: 'Hotel NYX Cancún', stars: 4, basePrice: 80, district: 'Hotel Zone' },
    { id: 394, name: 'Hostel Mundo Joven', stars: 2, basePrice: 15, district: 'Centro' },
  ],
  'phuket': [
    { id: 401, name: 'Trisara Phuket', stars: 5, basePrice: 400, district: 'Layan Beach' },
    { id: 402, name: 'Kata Rocks', stars: 5, basePrice: 250, district: 'Kata' },
    { id: 403, name: 'Novotel Phuket Resort', stars: 4, basePrice: 60, district: 'Patong' },
    { id: 404, name: 'Lub d Phuket Patong', stars: 2, basePrice: 15, district: 'Patong' },
  ],
  'maldives': [
    { id: 411, name: 'Soneva Fushi', stars: 5, basePrice: 1500, district: 'Baa Atoll' },
    { id: 412, name: 'Conrad Maldives Rangali', stars: 5, basePrice: 600, district: 'Rangali Island' },
    { id: 413, name: 'Adaaran Club Rannalhi', stars: 4, basePrice: 120, district: 'South Malé Atoll' },
  ],
  'sydney': [
    { id: 421, name: 'Park Hyatt Sydney', stars: 5, basePrice: 450, district: 'The Rocks' },
    { id: 422, name: 'QT Sydney', stars: 4, basePrice: 180, district: 'CBD' },
    { id: 423, name: 'Travelodge Wynyard', stars: 3, basePrice: 90, district: 'CBD' },
    { id: 424, name: 'Wake Up! Sydney', stars: 2, basePrice: 25, district: 'Central' },
  ],
  'cape town': [
    { id: 431, name: 'One&Only Cape Town', stars: 5, basePrice: 350, district: 'Waterfront' },
    { id: 432, name: 'The Silo Hotel', stars: 5, basePrice: 400, district: 'Waterfront' },
    { id: 433, name: 'Protea Hotel Cape Town', stars: 4, basePrice: 80, district: 'Sea Point' },
    { id: 434, name: 'Once in Cape Town', stars: 2, basePrice: 15, district: 'Gardens' },
  ],
  'los angeles': [
    { id: 441, name: 'Beverly Wilshire', stars: 5, basePrice: 480, district: 'Beverly Hills' },
    { id: 442, name: 'The Hollywood Roosevelt', stars: 4, basePrice: 200, district: 'Hollywood' },
    { id: 443, name: 'Freehand Los Angeles', stars: 3, basePrice: 100, district: 'Downtown' },
    { id: 444, name: 'HI Los Angeles Santa Monica', stars: 2, basePrice: 40, district: 'Santa Monica' },
  ],
  'miami': [
    { id: 451, name: 'Faena Hotel Miami Beach', stars: 5, basePrice: 400, district: 'Mid-Beach' },
    { id: 452, name: 'The Setai Miami Beach', stars: 5, basePrice: 350, district: 'South Beach' },
    { id: 453, name: 'Gale South Beach', stars: 4, basePrice: 150, district: 'South Beach' },
    { id: 454, name: 'Generator Miami', stars: 2, basePrice: 30, district: 'South Beach' },
  ],
  'gran canaria': [
    { id: 461, name: 'Lopesan Costa Meloneras', stars: 5, basePrice: 180, district: 'Meloneras' },
    { id: 462, name: 'Seaside Palm Beach', stars: 5, basePrice: 200, district: 'Maspalomas' },
    { id: 463, name: 'Bull Hotel Escorial', stars: 3, basePrice: 55, district: 'Playa del Inglés' },
  ],
  'glasgow': [
    { id: 471, name: 'Blythswood Square', stars: 5, basePrice: 180, district: 'City Centre' },
    { id: 472, name: 'citizenM Glasgow', stars: 4, basePrice: 85, district: 'City Centre' },
    { id: 473, name: 'Motel One Glasgow', stars: 3, basePrice: 60, district: 'City Centre' },
  ],
  'liverpool': [
    { id: 481, name: 'Hotel Titanic Liverpool', stars: 4, basePrice: 100, district: 'Stanley Dock' },
    { id: 482, name: 'Malmaison Liverpool', stars: 4, basePrice: 90, district: 'City Centre' },
    { id: 483, name: 'YHA Liverpool Albert Dock', stars: 2, basePrice: 22, district: 'Albert Dock' },
  ],
  'birmingham': [
    { id: 491, name: 'Hyatt Regency Birmingham', stars: 5, basePrice: 150, district: 'City Centre' },
    { id: 492, name: 'Hotel du Vin Birmingham', stars: 4, basePrice: 110, district: 'City Centre' },
    { id: 493, name: 'Ibis Styles Birmingham', stars: 3, basePrice: 55, district: 'City Centre' },
  ],
};

export async function GET(req: NextRequest) {
  // Top-level try/catch — any unhandled throw inside the search pipeline
  // (LiteAPI client, RateHawk, DOTW, normalisation, KV…) used to produce
  // a default Next.js 500 HTML page. That broke any client that expected
  // JSON (the front-end search UI included). The Dubai 6A/0K/3R search
  // hit this path 2026-05-03 — a downstream supplier threw, the customer
  // saw a generic error overlay instead of "no hotels found".
  // Catch here, log to bug inbox, return a soft empty-results response.
  try {
  const { searchParams } = new URL(req.url);

  // Zod-validate at the edge. Rejects malformed dates, garbage stars values,
  // checkout-before-checkin, etc., before we burn an upstream LiteAPI quota.
  const raw: Record<string, string> = {};
  for (const [k, v] of searchParams.entries()) raw[k] = v;
  const parsed = HotelSearchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: zodErrorToMessage(parsed.error) },
      { status: 400 },
    );
  }

  const city = parsed.data.city;
  const checkin = parsed.data.checkin;
  const checkout = parsed.data.checkout;
  const adults = parsed.data.adults || '2';
  const childrenParam = parsed.data.children || '0';
  const childrenAgesParam = parsed.data.childrenAges || '';
  const roomsParam = parsed.data.rooms || '1';
  const starsParam = parsed.data.stars || '0';
  const placeId = parsed.data.placeId || '';
  // Optional WGS84 centroid forwarded from the autocomplete pick — used as
  // the geo-filter centre when CITY_COORDS doesn't have an entry for this
  // searched city. Lets us cover obscure UK suburbs without growing the
  // manual coords table forever (Coulsdon, Hove, Reigate, Banstead, …).
  const latParam = parsed.data.lat ? Number(parsed.data.lat) : null;
  const lngParam = parsed.data.lng ? Number(parsed.data.lng) : null;
  const autocompleteCentre =
    typeof latParam === 'number' && Number.isFinite(latParam) &&
    typeof lngParam === 'number' && Number.isFinite(lngParam)
      ? { lat: latParam, lng: lngParam }
      : null;
  const mode = parsed.data.mode || '';

  /* ── Date-strip mode (D−3 … D+3 cheapest per check-in, Hotellook cache only) ──
     Used by <DateMatrixStrip /> on the hotel results page. Keeps the stay-
     length locked (each cell = same N-night stay starting N days earlier or
     later), so every price is directly comparable. Uses the free Hotellook
     `cache.json` endpoint rather than LiteAPI — 7 LiteAPI availability
     calls per page-view would be prohibitive on cost; Hotellook gives us
     cached min-prices in a single shot per date with zero metered usage.
     Cached server-side in Vercel KV 24h — hotel prices drift slower than
     flight seats, so a longer TTL is safe. */
  if (mode === 'datestrip') {
    const adultsNum = parseInt(adults) || 2;
    const cityForCache = (placeId || city.toLowerCase().trim());

    const checkinDate = new Date(checkin + 'T00:00:00Z');
    const checkoutDate = new Date(checkout + 'T00:00:00Z');
    const nights = Math.max(1, Math.round((checkoutDate.getTime() - checkinDate.getTime()) / 86400000));

    // v2 — bumped when strip limit went 1→20 and basePrice fallback
    // was added, so cached v1 entries don't serve the old sparse data.
    const stripKey = `hotels:strip:v2:${cityForCache}:${checkin}:${nights}n:${adultsNum}`;
    try {
      const cached = await kv.get<any>(stripKey);
      if (cached) return NextResponse.json({ ...cached, cached: true });
    } catch {}

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const offsets = [-3, -2, -1, 0, 1, 2, 3];
    const cells = offsets.map(off => {
      const ci = new Date(checkinDate);
      ci.setUTCDate(ci.getUTCDate() + off);
      const co = new Date(ci);
      co.setUTCDate(co.getUTCDate() + nights);
      return {
        offset: off,
        checkin: ci.toISOString().slice(0, 10),
        checkout: co.toISOString().slice(0, 10),
        past: ci < today,
      };
    });

    // Per-fetch 4s timeout — upstream cache.json usually answers in <300 ms,
    // but we don't want one slow cell holding the Edge function past budget.
    const STRIP_TIMEOUT_MS = 4000;
    // Travelpayouts shared partner token (same one baked into flights route).
    const HOTELLOOK_TOKEN = 'f797fbb7074a15838d5536c10be6f7b5';

    // Hotellook's cache endpoint needs a `location=<City Name>` string, not
    // a slug/placeId. Capitalise the first letter of each word so
    // "hong kong" → "Hong Kong".
    const locationName = city
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    // Optional base price from the client — the total-stay price the
    // LiteAPI search already found for the selected check-in. Guarantees
    // the selected cell never shows "—" even when Hotellook's cache has
    // no entry for that specific (city, date, nights) triple.
    const basePriceHint = searchParams.get('basePrice');
    const baseTotalNum = basePriceHint ? parseFloat(basePriceHint) : null;

    const results = await Promise.all(cells.map(async (c) => {
      if (c.past) {
        return { ...c, total_price_gbp: null };
      }
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), STRIP_TIMEOUT_MS);
      try {
        // limit=20 gives Hotellook room to return multiple hotels so we
        // can take a proper min. limit=1 was silently missing coverage
        // on popular cities; now we take the min of whatever comes back.
        const url = `https://engine.hotellook.com/api/v2/cache.json?location=${encodeURIComponent(locationName)}&currency=gbp&checkIn=${c.checkin}&checkOut=${c.checkout}&adults=${adultsNum}&limit=20&token=${HOTELLOOK_TOKEN}`;
        const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: ac.signal });
        if (!r.ok) {
          if (c.offset === 0 && baseTotalNum && baseTotalNum > 0) {
            return { ...c, total_price_gbp: baseTotalNum };
          }
          return { ...c, total_price_gbp: null };
        }
        const j = await r.json();
        const offers = Array.isArray(j) ? j : [];
        let minPrice: number | null = null;
        for (const o of offers) {
          const p = Number(o.priceFrom ?? o.priceAvg ?? 0);
          if (p > 0 && (minPrice === null || p < minPrice)) minPrice = p;
        }
        // Selected cell is authoritatively the live LiteAPI total-stay
        // price. Hotellook's cache lags and occasionally undercuts real
        // LiteAPI inventory — never let the strip contradict the main
        // search for the date the user is actually looking at.
        if (c.offset === 0 && baseTotalNum && baseTotalNum > 0) {
          minPrice = baseTotalNum;
        }
        return { ...c, total_price_gbp: minPrice };
      } catch {
        if (c.offset === 0 && baseTotalNum && baseTotalNum > 0) {
          return { ...c, total_price_gbp: baseTotalNum };
        }
        return { ...c, total_price_gbp: null };
      } finally {
        clearTimeout(timer);
      }
    }));

    const response = {
      success: true,
      dates: results,
      nights,
      city,
      placeId: placeId || null,
      checkin,
      checkout,
    };
    try { await kv.set(stripKey, response, { ex: 86400 }); } catch {}
    return NextResponse.json(response);
  }

  const rawCityKey = city.toLowerCase().trim();
  // Rewrite airport/landmark names → nearest city LiteAPI knows. Without this,
  // searches for "Gatwick", "Heathrow", "JFK" etc return 0 hotels because
  // LiteAPI's /data/hotels?cityName=Gatwick has no city by that name.
  // Runs before resolveCountryCode so it also bypasses any stale Nominatim
  // KV cache that mapped the airport name to a country code.
  const cityKey = AIRPORT_TO_CITY[rawCityKey] || rawCityKey;
  if (cityKey !== rawCityKey) {
    console.log(`[hotels] rewriting "${rawCityKey}" → "${cityKey}" (airport→city alias)`);
  }
  const adultsNum = parseInt(adults);
  const childrenNum = Math.max(0, Math.min(4, parseInt(childrenParam) || 0));
  const childAges = childrenAgesParam
    ? childrenAgesParam.split(',').map(a => Math.max(0, Math.min(17, parseInt(a) || 0)))
    : [];
  const roomsNum = Math.max(1, Math.min(5, parseInt(roomsParam) || 1));
  const minStars = Math.max(0, Math.min(5, parseInt(starsParam) || 0));
  // Cache key v11 — added placeId support for precise location searches
  // Cache key includes rawCityKey too so an aliased "coulsdon → london"
  // search has its own cache slot — otherwise Coulsdon and a true London
  // search would share results and the geo-filter pass at read time would
  // see the wrong baseline (only the items already filtered for whichever
  // ran first). 2026-05-03 fix: previously cacheCity = cityKey alone meant
  // Coulsdon shared London's KV entry and never benefitted from its narrower
  // 8km radius until the cache expired.
  const cacheCity = placeId || (rawCityKey !== cityKey ? `${cityKey}@${rawCityKey}` : cityKey);
  // v12 — quarantined DOTW/RateHawk rows (details endpoint can't resolve them yet)
  // and fixed doubled `dotw_`/`rh_` id prefix from supplier adapters.
  // v13 — added geo-proximity post-filter (passesGeo). London-borough searches
  // (Croydon, Wembley, etc) used to leak Greater-London results because LiteAPI
  // treats the borough's Google Place ID as a metro pointer. Bumping the cache
  // version invalidates any cached "Croydon → Docklands+Hammersmith" responses.
  // v15 — added alt-spelling aliases (Marrakesh→Marrakech, Lisboa→Lisbon, etc.)
  // v18 — bumped 2026-04-29 to invalidate v17 "0 results" entries
  // captured during the 200-hotel timeout incident. v18 reverts to
  // a 50-hotel slice so live rates come back inside the 12s budget.
  // v19 — back to 200 hotels but with chunked rates fetch (4×50 in parallel)
  // so we don't blow the timeout. Invalidates v18's 50-hotel cached pages.
  // v20 — added budget-tier supplemental fetch (0-3★, limit 50) to fix the
  // big-city 4★-skew where students/hostel travellers were seeing "from £80"
  // for Paris when £35 hostels existed. Invalidates v19 4★-skewed pages.
  // v21 — added children + rooms to the response echo so the Monkey Test
  // Suite (and any future client) can do strict-equality assertions on
  // occupancy round-trip. Old v20 cache entries lack those fields.
  // v24 — LiteAPI now searches by lat/lng for aliased small-town searches
  // (Coulsdon's coords, not the aliased "London" cityName) so we get
  // genuinely-local inventory — Sutton, Croydon, Banstead — instead of
  // central London hotels that happen to be the geographically-nearest of
  // a wrong fetch. Invalidates v23 entries built from the wrong upstream.
  const kvKey = `hotels:v24:${cacheCity}:${checkin}:${checkout}:${adultsNum}:${childrenNum}:${roomsNum}:${minStars}`;

  // Group occupancy bypass: large groups (>4 guests) always get fresh prices
  // because cached availability/room blocks may not hold for that many people.
  const totalGuests = adultsNum + childrenNum;
  const skipCache = totalGuests > 4;

  // Check KV cache (bypassed for large groups)
  if (!skipCache) {
    try {
      const cached = await kv.get<any>(kvKey);
      if (cached) return NextResponse.json({ ...cached, cached: true });
    } catch { /* KV miss */ }
  }

  /**
   * Normalise LiteAPI offers into the shape the /hotels page expects.
   * We tag them source='liteapi' + bookable=true so the frontend can show a
   * "Book Direct" badge (and we keep the offerId so checkout can call
   * /api/liteapi/book).
   */
  const nights = Math.max(
    1,
    Math.round(
      (new Date(checkout).getTime() - new Date(checkin).getTime()) / 86400000,
    ),
  );
  const normaliseLiteApi = (offers: HotelOffer[]) =>
    offers.map((o, i) => ({
      id: `la_${o.hotelId}`,
      name: o.hotelName,
      stars: o.stars ?? 0,
      reviewCount: o.reviewCount ?? null,
      reviewScore: o.reviewScore ?? null,
      pricePerNight: Math.round((o.pricePerNight ?? o.price / nights) * 100) / 100,
      totalPrice: Math.round(o.price * 100) / 100,
      currency: o.currency || 'GBP',
      location: o.city || city,
      district: null,
      lat: o.latitude ?? undefined,
      lng: o.longitude ?? undefined,
      thumbnail: o.thumbnail || null,
      refundable: o.refundable,
      boardType: o.boardType,
      boardOptions: o.boardOptions || undefined,
      source: 'liteapi' as const,
      bookable: true,
      offerId: o.offerId,
      rank: i,
      // v3.0: negotiated vs market rates
      negotiatedPrice: o.negotiatedPrice ?? null,
      negotiatedPerNight: o.negotiatedPerNight ?? null,
      marketPrice: o.marketPrice ?? null,
      marketPerNight: o.marketPerNight ?? null,
      rateType: o.rateType ?? null,
      perks: o.perks || [],
      signalType: o.signalType ?? null,
      excludedTaxes: o.excludedTaxes ?? null,
    }));

  // ── Centroid resolution ── (must happen BEFORE the LiteAPI fetch so we
  // can search by lat/lng for aliased small-town searches that would
  // otherwise alias up to a metro and return wrong-neighbourhood hotels).
  // Order of precedence: autocomplete-supplied → manual CITY_COORDS table
  // (rawCityKey first, then alias) → Google Place Details (cached 30d).
  let preResolvedCentre =
    autocompleteCentre ??
    CITY_COORDS[rawCityKey] ??
    CITY_COORDS[cityKey] ??
    null;
  if (!preResolvedCentre && placeId.startsWith('google:')) {
    const rawId = placeId.slice('google:'.length);
    const detailsKey = `place-coords:${rawId}`;
    try {
      const cached = await kv.get<{ lat: number; lng: number }>(detailsKey);
      if (cached && typeof cached.lat === 'number' && typeof cached.lng === 'number') {
        preResolvedCentre = cached;
      } else {
        const fresh = await googlePlaceDetails(rawId);
        if (fresh) {
          preResolvedCentre = fresh;
          await kv.set(detailsKey, fresh, { ex: 60 * 60 * 24 * 30 });
        }
      }
    } catch (err) {
      console.error('[hotels:place-details]', err instanceof Error ? err.message : err);
    }
  }
  const isAliasedSearchEarly = rawCityKey !== cityKey;
  const liteApiCentroid =
    isAliasedSearchEarly && preResolvedCentre
      ? {
          lat: preResolvedCentre.lat,
          lng: preResolvedCentre.lng,
          radiusKm: CITY_RADIUS_KM[rawCityKey] ?? 15,
        }
      : undefined;

  // Kick off LiteAPI + RateHawk + DOTW in parallel (triple API racing).
  // DOTW uses mocked fixtures when DOTW_USERNAME is unset — still gives us a
  // Giata-tagged result set to exercise the de-dupe path in dev.
  const liteApiPromise = fetchLiteApiHotels(cityKey, checkin, checkout, adultsNum, childrenNum, roomsNum, childAges, 12000, placeId || undefined, liteApiCentroid);
  const rateHawkPromise = fetchRateHawkHotels(cityKey, checkin, checkout, adultsNum, roomsNum);
  // Absolute-origin proxy to the nodejs DOTW sub-route — Vercel requires
  // absolute URLs for edge → node internal fetches.
  const origin = new URL(req.url).origin;
  const dotwPromise = fetchDotwHotels(origin, cityKey, checkin, checkout, adultsNum, childrenNum, childAges, roomsNum);

  // Apply server-side minStars filter. minStars === 5 means exactly 5; else >=.
  const passesStars = <T extends { stars: number }>(h: T) => {
    if (minStars === 0) return true;
    if (minStars === 5) return h.stars >= 5;
    return h.stars >= minStars;
  };

  // Geo-proximity filter — guards against LiteAPI returning Greater-London-
  // wide results when a Google Place ID for a London borough (e.g. Croydon)
  // gets passed as a regional pointer. Only applies when we have known
  // coordinates for the searched city. Hotels missing lat/lng are kept
  // (we don't have enough to judge) and so are hotels within RADIUS_KM.
  // 2026-04-27: real bug — searching Croydon was returning Docklands,
  // Hammersmith, Greenwich, Canary Wharf hotels mixed with the actual
  // Croydon ones because LiteAPI treats borough place IDs as metro pointers.
  // Prefer autocomplete-supplied coords (Google Places picked the exact spot
  // the visitor meant), fall back to the manual CITY_COORDS table keyed on
  // the ORIGINAL search term (rawCityKey) so an alias like Coulsdon→London
  // still gets filtered to Coulsdon proximity, then on the alias fallback,
  // and finally a Google Place Details lookup when the search came from a
  // Google placeId. The Place Details lookup covers small towns the manual
  // table doesn't list (Hove, Reigate, Banstead, …) without requiring a
  // code change every time a customer searches a new suburb. Cached in KV
  // per placeId for 30 days — coords are stable.
  // Centroid was already resolved earlier (so the LiteAPI fetch could use
  // it as lat/lng input). Reuse the same value for the post-filter — they
  // must be identical or upstream and downstream disagree.
  const cityCentre = preResolvedCentre;
  // Same precedence as the centroid lookup — rawCityKey first so an aliased
  // "coulsdon → london" search still uses the strict 8km Coulsdon radius
  // rather than London's wide 25km.
  const radiusKm =
    CITY_RADIUS_KM[rawCityKey] ??
    CITY_RADIUS_KM[cityKey] ??
    (autocompleteCentre || preResolvedCentre ? 10 : DEFAULT_RADIUS_KM);
  /**
   * Geo proximity filter with graceful expansion.
   * `geoFilter(hotels)` runs the strict radius first; if fewer than 5 hotels
   * pass, it retries at 2× the radius and at 3× the radius before giving up
   * and returning the strict subset. Avoids the "0 hotels in Coulsdon" UX
   * for genuinely sparse suburbs without giving up the proximity guard for
   * cities with plenty of inventory.
   */
  const MIN_RESULTS_FOR_STRICT = 5;
  const isAliasedSearch = isAliasedSearchEarly;
  const distanceFor = <T extends { lat?: number; lng?: number; latitude?: number; longitude?: number }>(
    h: T,
  ): number | null => {
    if (!cityCentre) return null;
    const lat = h.lat ?? h.latitude;
    const lng = h.lng ?? h.longitude;
    if (typeof lat !== 'number' || typeof lng !== 'number') return null;
    return distanceKm(cityCentre, { lat, lng });
  };
  const geoFilter = <T extends { lat?: number; lng?: number; latitude?: number; longitude?: number }>(
    items: T[],
  ): T[] => {
    if (!cityCentre || items.length === 0) return items;
    // ALIASED searches (e.g. coulsdon→london) need the nearest-first
    // behaviour, NOT a hard reject. The original Coulsdon bug was that
    // Maida Vale + Wembley + Highbury appeared FIRST while genuine
    // South-London hotels were buried. We fix that by sorting by
    // distance ASC and taking the closest ~50, so Sutton/Croydon hotels
    // float to the top, central London still appears further down for
    // the visitor who's willing to commute, and pure North-London
    // outliers fall off the end. Hard reject was making prod show 0
    // hotels for Coulsdon (worse UX than the original bug).
    if (isAliasedSearch) {
      const NEAREST_N = 50;
      // Items without coords always pass — we can't judge them and the
      // upstream surfaced them for a reason (e.g. curated deep-link
      // hotels with no lat/lng).
      const withCoords: Array<{ item: T; km: number }> = [];
      const withoutCoords: T[] = [];
      for (const h of items) {
        const km = distanceFor(h);
        if (km === null) withoutCoords.push(h);
        else withCoords.push({ item: h, km });
      }
      withCoords.sort((a, b) => a.km - b.km);
      return [...withCoords.slice(0, NEAREST_N).map((x) => x.item), ...withoutCoords];
    }
    for (const r of [radiusKm, radiusKm * 2, radiusKm * 3]) {
      const subset = items.filter((h) => {
        const km = distanceFor(h);
        return km === null || km <= r;
      });
      if (subset.length >= MIN_RESULTS_FOR_STRICT) {
        if (r !== radiusKm) {
          console.log(`[hotels:geo] expanded radius for ${rawCityKey}: ${radiusKm}km→${r}km (${subset.length} hotels)`);
        }
        return subset;
      }
    }
    return items.filter((h) => {
      const km = distanceFor(h);
      return km === null || km <= radiusKm;
    });
  };
  const insideRadius = <T extends { lat?: number; lng?: number; latitude?: number; longitude?: number }>(
    h: T,
    r: number,
  ) => {
    const km = distanceFor(h);
    return km === null || km <= r;
  };
  // Backwards-compat: callers using `.filter(passesGeo)` get the strict pass.
  const passesGeo = <T extends { lat?: number; lng?: number; latitude?: number; longitude?: number }>(h: T) =>
    insideRadius(h, radiusKm);

  // Normalise RateHawk results the same way as LiteAPI
  const normaliseRateHawk = (offers: HotelOffer[]) =>
    offers.map((o, i) => ({
      id: `rh_${o.hotelId}`,
      name: o.hotelName,
      stars: o.stars ?? 0,
      pricePerNight: Math.round((o.pricePerNight ?? o.price / nights) * 100) / 100,
      totalPrice: Math.round(o.price * 100) / 100,
      currency: o.currency || 'GBP',
      location: o.city || city,
      district: null,
      lat: o.latitude ?? undefined,
      lng: o.longitude ?? undefined,
      thumbnail: o.thumbnail || null,
      refundable: o.refundable,
      boardType: o.boardType,
      boardOptions: o.boardOptions || undefined,
      source: 'ratehawk' as const,
      bookable: false, // RateHawk affiliate — links to their site
      offerId: o.offerId,
      rank: i,
    }));

  // Normalise DOTW offers into the same row shape — stamps the Giata ID so
  // the merge step can use it for de-dup when both sides expose it.
  const normaliseDotw = (
    offers: (HotelOffer & { giataId?: string | null; source: string })[],
  ) =>
    offers.map((o, i) => ({
      id: `dotw_${o.hotelId}`,
      name: o.hotelName,
      stars: o.stars ?? 0,
      pricePerNight: Math.round((o.pricePerNight ?? o.price / nights) * 100) / 100,
      totalPrice: Math.round(o.price * 100) / 100,
      currency: o.currency || 'GBP',
      location: o.city || city,
      district: null,
      lat: o.latitude ?? undefined,
      lng: o.longitude ?? undefined,
      thumbnail: o.thumbnail || null,
      refundable: o.refundable,
      boardType: o.boardType,
      boardOptions: o.boardOptions || undefined,
      source: 'dotw' as const,
      bookable: true,          // DOTW is merchant-of-record via our Stripe checkout
      offerId: o.offerId,      // `dotw:{hotelId}` — resolved at book time
      giataId: o.giataId ?? null,
      rank: i,
    }));

  // Await all three APIs, merge and deduplicate.
  //
  // De-dupe priority:
  //   1. Giata ID (cross-supplier canonical key — DOTW embeds natively)
  //   2. Normalised hotel name (LiteAPI fallback until Phase 2 mapping lands)
  //
  // Within a dedupe group: cheapest per-night wins. The other offers go on
  // `boardOptions` so the detail page can still show alternative suppliers.
  const mergeApis = async () => {
    const [liteResults, rhResults, dotwResults] = await Promise.all([
      liteApiPromise,
      rateHawkPromise,
      dotwPromise,
    ]);
    const liteNorm = normaliseLiteApi(liteResults);
    const rhNorm = normaliseRateHawk(rhResults);
    const dotwNorm = normaliseDotw(dotwResults);
    // Tag each LiteAPI row with its own normalised-name dedupe key (no Giata
    // until Phase 2). DOTW rows use Giata when present.
    type Row = (typeof liteNorm)[0] | (typeof rhNorm)[0] | (typeof dotwNorm)[0];
    // MITIGATION — quarantine DOTW/RateHawk rows from the client feed until
    // /api/hotels/details/[id] knows how to route them to their supplier.
    // Clicking a non-LiteAPI card currently returns "Hotel not found" because
    // the details endpoint only strips `la_` and calls LiteAPI. Keeping the
    // upstream fetches intact (for dedupe/pricing telemetry) but dropping
    // anything that isn't `la_` before it reaches the response.
    const all: Row[] = [...liteNorm, ...rhNorm, ...dotwNorm].filter(h => h.id.startsWith('la_'));
    const seen = new Map<string, Row>();
    for (const h of all) {
      const giata = (h as { giataId?: string | null }).giataId ?? null;
      const key = dedupeKey(giata, h.name);
      const existing = seen.get(key);
      if (!existing || h.pricePerNight < existing.pricePerNight) {
        seen.set(key, h);
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.pricePerNight - b.pricePerNight);
  };

  // Look up curated hotels
  const curated = CURATED[cityKey];

  if (!curated || curated.length === 0) {
    // Try partial match
    const match = Object.keys(CURATED).find(k => k.includes(cityKey) || cityKey.includes(k));
    if (match) {
      const coords = CITY_COORDS[match];
      const curatedHotels = CURATED[match].map(h => ({
        id: h.id,
        name: h.name,
        stars: h.stars,
        pricePerNight: h.basePrice,
        location: match.charAt(0).toUpperCase() + match.slice(1),
        district: h.district,
        source: 'curated' as const,
        bookable: false,
        ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
      }));
      const apiHotels = geoFilter((await mergeApis()).filter(passesStars));
      // Apply geoFilter to curated too — otherwise an aliased "coulsdon→london"
      // search would bypass proximity for the curated set (every curated hotel
      // is stamped with the city centroid, so they all sit at the same point;
      // without this filter, all-of-London curated leaks into Coulsdon results).
      const hotels = [...apiHotels, ...geoFilter(curatedHotels.filter(passesStars))];

      const result = { hotels, city: match.charAt(0).toUpperCase() + match.slice(1), checkin, checkout, adults: adultsNum, children: childrenNum, rooms: roomsNum, liteapiCount: apiHotels.length };
      try { await kv.set(kvKey, result, { ex: KV_TTL }); } catch { /* KV write fail */ }
      return NextResponse.json(result);
    }

    // No curated match — still try APIs as a last resort
    const apiHotels = geoFilter((await mergeApis()).filter(passesStars));
    if (apiHotels.length > 0) {
      const result = { hotels: apiHotels, city, checkin, checkout, adults: adultsNum, children: childrenNum, rooms: roomsNum, liteapiCount: apiHotels.length };
      try { await kv.set(kvKey, result, { ex: KV_TTL }); } catch {}
      return NextResponse.json(result);
    }

    return NextResponse.json({ hotels: [], city, checkin, checkout, adults: adultsNum, children: childrenNum, rooms: roomsNum, message: 'No hotels found for this destination' });
  }

  const coords = CITY_COORDS[cityKey];
  const curatedHotels = curated.map(h => ({
    id: h.id,
    name: h.name,
    stars: h.stars,
    pricePerNight: h.basePrice,
    location: city.charAt(0).toUpperCase() + city.slice(1),
    district: h.district,
    source: 'curated' as const,
    bookable: false,
    ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
  }));
  const apiHotels = geoFilter((await mergeApis()).filter(passesStars));
  // Bookable API hotels first, curated deep-link hotels after. Curated also
  // runs through geoFilter — otherwise an aliased "coulsdon→london" search
  // would leak the entire curated London set (each stamped at the London
  // centroid) into a 15km-Coulsdon-radius response.
  const hotels = [...apiHotels, ...geoFilter(curatedHotels.filter(passesStars))];

  const result = {
    hotels,
    city: city.charAt(0).toUpperCase() + city.slice(1),
    checkin,
    checkout,
    adults: adultsNum,
    children: childrenNum,
    rooms: roomsNum,
    liteapiCount: apiHotels.length,
  };

  // Cache in KV
  try { await kv.set(kvKey, result, { ex: KV_TTL }); } catch { /* KV write fail */ }

  return NextResponse.json(result);
  } catch (err: unknown) {
    // Top-level safety net. Anything that wasn't caught by the per-supplier
    // try/catches lands here. Sanitise the URL we report (no PII in our
    // logs even though hotel search is non-personal — defence in depth).
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack?.slice(0, 1500) : undefined;
    let cityForReport: string | null = null;
    try {
      cityForReport = new URL(req.url).searchParams.get('city');
    } catch { /* never throw from the catch path */ }
    console.error('[hotels:GET] unhandled', message, stack);
    reportBug('hotels search threw unhandled', {
      message,
      stack,
      city: cityForReport,
    });
    return NextResponse.json(
      {
        hotels: [],
        message: 'Search temporarily unavailable. Please try again in a moment.',
        error: 'internal',
      },
      { status: 200 }, // 200 + empty so the UI shows "no hotels" gracefully
    );
  }
}
