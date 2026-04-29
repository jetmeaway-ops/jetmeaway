/**
 * LiteAPI (Nuitee) v3 wrapper — Edge-compatible.
 *
 * Merchant / pre-paid model: we charge the customer on jetmeaway.co.uk via Stripe,
 * then fulfil the booking against LiteAPI. The end user never leaves our site for
 * payment, which is the Privacy Shield requirement.
 *
 * All calls use `fetch` only — no Node built-ins — so this module runs unchanged
 * in Vercel Edge Functions.
 *
 * Env:
 *   LITE_API_KEY   — private API key (X-API-Key header)
 */

/**
 * Base URL — defaults to production.
 * Set LITE_API_BASE=https://api.sandbox.liteapi.travel/v3.0 in env to use the
 * sandbox (fake bookings, test cards) — useful for end-to-end testing.
 */
function baseUrl(): string {
  return (process.env.LITE_API_BASE || 'https://api.liteapi.travel/v3.0').replace(/\/$/, '');
}

function apiKey(): string {
  const k = process.env.LITE_API_KEY;
  if (!k) throw new Error('LITE_API_KEY is not set');
  return k;
}

/**
 * Per-request hard timeout. LiteAPI sandbox has been observed to hang for
 * 30s+ occasionally; we'd rather fail fast and let the caller decide how to
 * recover than eat the whole serverless function timeout.
 */
const DEFAULT_TIMEOUT_MS = 20_000;

async function liteFetch<T = any>(
  path: string,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl()}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: {
        'X-API-Key': apiKey(),
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
      // Edge-friendly: no keepalive agent, no cache by default
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`LiteAPI ${res.status} ${path}: ${body.slice(0, 400)}`);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`LiteAPI timeout after ${timeoutMs}ms: ${path}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/* ───────────────────────────────────────────────────────────────────────── */
/*  PLACES — Global Search autocomplete                                      */
/* ───────────────────────────────────────────────────────────────────────── */

export interface Place {
  id: string;          // placeId — use as destinationId for hotel search
  name: string;        // displayName e.g. "Paris"
  description: string; // formattedAddress e.g. "Paris, Île-de-France, France"
  type: string;        // primary type e.g. "locality", "airport", "hotel"
}

/**
 * Search LiteAPI /data/places for cities, airports, or hotels matching a query.
 * Returns structured results with placeId for precise hotel searches.
 */
export async function getPlaces(query: string): Promise<Place[]> {
  if (!query || query.length < 2) return [];

  const data = await liteFetch<{
    data: Array<{
      placeId: string;
      displayName: string;
      formattedAddress?: string;
      types?: string[];
    }>;
  }>(
    // Include neighborhood + sublocality so typed queries like "Paddington" or
    // "Shoreditch" surface the correct London-adjacent area, not just cities.
    // `hotel` re-enabled (2026-04-29) — picking a hotel-type result is now
    // routed through resolvePlaceIdToHotelId() and lands on /hotels/[hotelId]
    // directly, bypassing the city-pool 50-hotel slice.
    `/data/places?textQuery=${encodeURIComponent(query)}&type=locality,neighborhood,sublocality,airport,hotel`,
    { method: 'GET' },
    8_000, // fast timeout — autocomplete should be snappy
  );

  return (data.data || []).map((place) => ({
    id: place.placeId,
    name: place.displayName,
    description: place.formattedAddress || '',
    type: (place.types && place.types[0]) || 'locality',
  }));
}

export interface HotelByName {
  id: string;
  name: string;
  address?: string;
  city?: string;
  country?: string;
  countryCode?: string;
  starRating?: number;
  stars?: number;
  latitude?: number;
  longitude?: number;
}

/** Tiny lookup of common cities → ISO country codes used to scope a
 *  hotel-name search. Not exhaustive — just the cities most likely to
 *  appear inside a "<chain> <city>" query (e.g. "Motel One Paris").
 *  When no city token matches we fall through to a name-only call. */
const NAME_SEARCH_CITY_TO_CC: Record<string, string> = {
  london: 'GB', edinburgh: 'GB', manchester: 'GB', glasgow: 'GB', liverpool: 'GB', birmingham: 'GB', bristol: 'GB',
  leeds: 'GB', belfast: 'GB', cardiff: 'GB', horley: 'GB', crawley: 'GB', luton: 'GB',
  paris: 'FR', nice: 'FR', lyon: 'FR', marseille: 'FR',
  rome: 'IT', venice: 'IT', florence: 'IT', milan: 'IT', naples: 'IT',
  madrid: 'ES', barcelona: 'ES', seville: 'ES', valencia: 'ES', malaga: 'ES', ibiza: 'ES',
  lisbon: 'PT', porto: 'PT',
  berlin: 'DE', munich: 'DE', hamburg: 'DE', frankfurt: 'DE', cologne: 'DE',
  amsterdam: 'NL', brussels: 'BE', vienna: 'AT', prague: 'CZ', budapest: 'HU',
  zurich: 'CH', geneva: 'CH',
  athens: 'GR', istanbul: 'TR', dubai: 'AE', doha: 'QA', muscat: 'OM',
  marrakech: 'MA', cairo: 'EG',
  'new york': 'US', 'los angeles': 'US', miami: 'US', 'las vegas': 'US', orlando: 'US', chicago: 'US',
  toronto: 'CA', sydney: 'AU', melbourne: 'AU',
  bangkok: 'TH', singapore: 'SG', tokyo: 'JP', mumbai: 'IN', delhi: 'IN',
  baku: 'AZ', islamabad: 'PK', lahore: 'PK', karachi: 'PK',
};

/** Inspect the query for a known city token. Used to scope a hotel-name
 *  search to the right country (LiteAPI's /data/hotels?name= alone is
 *  unscoped and frequently returns 0 — adding `countryCode` makes it
 *  return real matches). */
function detectCountryCodeFromQuery(query: string): string | null {
  const lower = query.toLowerCase();
  for (const [city, cc] of Object.entries(NAME_SEARCH_CITY_TO_CC)) {
    if (lower.includes(city)) return cc;
  }
  return null;
}

/**
 * Search LiteAPI's hotel index by free-text name (e.g. "Motel One Paris").
 * Used to power hotel-name autocomplete alongside /data/places.
 *
 * Two-phase strategy:
 *   1. If we can detect a country from a city token in the query,
 *      call with both `&name=` and `&countryCode=` — far more likely to
 *      return matches because LiteAPI's name search is heavily scoped
 *      by country.
 *   2. Always fall back (or fall through) to name-only.
 *
 * Empirical: name-only frequently returns [] even when LiteAPI clearly
 * has the property indexed (proven by /data/places + Place ID resolver
 * still finding it). The country-scoped variant is the workaround.
 *
 * Returns up to `limit` hotels with their LiteAPI hotelIds ready to navigate
 * to (no placeId resolver hop needed).
 */
export async function searchHotelsByName(query: string, limit = 5): Promise<HotelByName[]> {
  if (!query || query.length < 3) return [];

  const cc = detectCountryCodeFromQuery(query);

  // Phase 1: country-scoped, if we detected a known city in the query.
  if (cc) {
    try {
      const scoped = await liteFetch<{ data: HotelByName[] }>(
        `/data/hotels?name=${encodeURIComponent(query)}&countryCode=${cc}&limit=${limit}`,
        { method: 'GET' },
        8_000,
      );
      const rows = scoped.data || [];
      console.log(`[liteapi:searchHotelsByName] q="${query}" cc=${cc} hits=${rows.length}`);
      if (rows.length > 0) return rows;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'hotel name search failed';
      console.warn('[liteapi:searchHotelsByName] cc-scoped failed:', message);
      // fall through to name-only
    }
  }

  // Phase 2: name-only (legacy behaviour).
  try {
    const data = await liteFetch<{ data: HotelByName[] }>(
      `/data/hotels?name=${encodeURIComponent(query)}&limit=${limit}`,
      { method: 'GET' },
      8_000,
    );
    const rows = data.data || [];
    console.log(`[liteapi:searchHotelsByName] q="${query}" cc=none hits=${rows.length}`);
    return rows;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'hotel name search failed';
    console.warn('[liteapi:searchHotelsByName] name-only failed:', message);
    return [];
  }
}

/** Reduce a hotel/chain name to its identifying tokens — strip generic
 *  words like "hotel"/"the"/"and"/"by", drop short tokens (<= 2 chars),
 *  lowercase + alphanumeric. Used to fuzzy-match an expected name
 *  against the name LiteAPI returned.
 *
 *  "Hotel Motel One Paris-Porte Dorée" → ["motel","one","paris","porte","dorée"]
 *  "Novotel Paris Porte De Versailles" → ["novotel","paris","porte","versailles"]
 *  These have token overlap on "paris", "porte" — but the brand identifier
 *  ("motel one" vs "novotel") differs. nameTokensMatch() requires the
 *  FIRST distinctive (non-generic, length>=4) token of each to match. */
const GENERIC_HOTEL_WORDS = new Set([
  'hotel', 'hotels', 'the', 'and', 'by', 'a', 'an', 'of', 'at', 'on', 'in',
  '&', 'spa', 'resort', 'inn', 'house', 'apartment', 'apartments', 'suites',
]);
function nameTokens(s: string): string[] {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !GENERIC_HOTEL_WORDS.has(t));
}

/** True if the resolved-name's tokens contain the expected name's *brand*
 *  tokens. Brand = the first 1-2 distinctive tokens (e.g. "motel one"). */
function nameTokensMatch(expected: string, resolved: string): boolean {
  const expTokens = nameTokens(expected);
  const resTokens = new Set(nameTokens(resolved));
  if (expTokens.length === 0 || resTokens.size === 0) return true; // can't judge → allow
  // Take the first 2 distinctive tokens of the expected name as the brand
  // signature. For "Motel One Paris Porte de Versailles" → ["motel","one"].
  // For just "The Savoy" → ["savoy"]. Both must appear in resolved.
  const brand = expTokens.slice(0, Math.min(2, expTokens.length));
  return brand.every((t) => resTokens.has(t));
}

/**
 * Resolve a Google Place ID returned by /data/places (type=hotel) into the
 * LiteAPI hotelId we can pass to /data/hotel for details and /hotels/rates
 * for live pricing.
 *
 * 2026-04-29: now also accepts an optional `expectedName` and validates
 * the resolved hotel's name against it. LiteAPI's `/data/hotels?placeId=`
 * does proximity matching, not exact name matching — for example, the
 * Place ID for "Motel One Paris Porte de Versailles" was returning the
 * Novotel next door (lp27336c) because Novotel is closer to the centroid
 * of the Place. The validation rejects that.
 *
 * Returns:
 *   - { hotelId: '...' } on a successful brand-validated match
 *   - { hotelId: null } when LiteAPI has no candidates at all
 *   - { hotelId: null, tierHint: N } when candidates existed but none
 *     passed brand validation. tierHint = star rating of the proximity-
 *     best candidate, used by the client to filter the fallback city
 *     search to "same tier" alternatives. (Even though the proximity
 *     match was the WRONG brand, it's a close-by hotel of similar tier
 *     to what the user clicked, so it's a decent proxy for what the
 *     intended hotel's tier was.)
 */
export interface PlaceResolveResult {
  hotelId: string | null;
  tierHint?: number;
}
export async function resolvePlaceIdToHotelId(
  placeId: string,
  expectedName?: string,
): Promise<PlaceResolveResult> {
  if (!placeId) return { hotelId: null };
  try {
    // Pull up to 5 candidates so we have alternatives if LiteAPI's first
    // (proximity-best) result doesn't match the expected name. Ask for
    // the starRating field too so we can hand the rejected proximity-best's
    // tier back to the client as a fallback hint.
    const data = await liteFetch<{
      data: Array<{ id: string; name?: string; starRating?: number; stars?: number }>
    }>(
      `/data/hotels?placeId=${encodeURIComponent(placeId)}&limit=5`,
      { method: 'GET' },
      8_000,
    );
    const candidates = data.data || [];
    if (candidates.length === 0) return { hotelId: null };

    if (expectedName) {
      const match = candidates.find((c) => c.name && nameTokensMatch(expectedName, c.name));
      if (match) {
        console.log(`[liteapi:resolvePlaceId] expected="${expectedName}" → ${match.id} (${match.name})`);
        return { hotelId: match.id };
      }
      // No candidate matched the brand — return tierHint from the
      // proximity-best candidate so the caller can filter the fallback
      // city search to "same tier" hotels.
      const tierHint = candidates[0]?.starRating ?? candidates[0]?.stars;
      console.warn(`[liteapi:resolvePlaceId] REJECT: expected="${expectedName}" but candidates were ${candidates.map((c) => c.name).filter(Boolean).join(' | ')} (tierHint=${tierHint})`);
      return { hotelId: null, tierHint: typeof tierHint === 'number' ? tierHint : undefined };
    }

    // No expected name supplied — accept the first candidate (legacy behaviour).
    return { hotelId: candidates[0]?.id || null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'placeId resolution failed';
    console.warn('[liteapi:resolvePlaceId]', message);
    return { hotelId: null };
  }
}

/* ───────────────────────────────────────────────────────────────────────── */
/*  eSIM — eSimply addon packages                                            */
/* ───────────────────────────────────────────────────────────────────────── */

export interface EsimPackage {
  packageId: number;
  name: string;
  dataSizeMb: number;
  validityDays: number;
  price: number;
  currency: string;
}

/**
 * Fetch available eSimply eSIM packages for a country (ISO-2 code).
 * Uses the dev endpoint as per LiteAPI's current eSimply addon docs.
 */
export async function getEsimPackages(countryCode: string): Promise<EsimPackage[]> {
  if (!countryCode || countryCode.length !== 2) return [];

  const data = await liteFetch<{
    code?: string;
    data: Array<{
      package_id: number;
      name: string;
      data_size_mb: number;
      validity_days: number;
      calculated_price: number;
      currency: string;
    }>;
  }>(
    `/addons/esimply/packages/${countryCode.toUpperCase()}`,
    { method: 'GET' },
    10_000,
  );

  return (data.data || []).map((p) => ({
    packageId: p.package_id,
    name: p.name,
    dataSizeMb: p.data_size_mb,
    validityDays: p.validity_days,
    price: p.calculated_price,
    currency: p.currency,
  }));
}

/* ───────────────────────────────────────────────────────────────────────── */
/*  TYPES                                                                    */
/* ───────────────────────────────────────────────────────────────────────── */

export interface Occupancy {
  adults: number;
  children?: number[]; // array of ages, e.g. [8, 4]
}

export interface GetHotelsParams {
  /**
   * One of these resolutions is required:
   *  - `destinationId`: LiteAPI placeId, OR comma-separated hotel ID list
   *  - `cityName` + `countryCode`: free-text city with ISO-3166 alpha-2
   */
  destinationId?: string;
  cityName?: string;
  countryCode?: string;
  checkIn: string;   // YYYY-MM-DD
  checkOut: string;  // YYYY-MM-DD
  occupancy: Occupancy[];
  currency?: string;        // default GBP
  guestNationality?: string; // default GB (ISO-3166 alpha-2)
  limit?: number;           // max hotels to fetch rates for (default 25)
  /**
   * Optional star-rating filter applied at the /data/hotels list call
   * (e.g. [1, 2, 3] for budget tier). LiteAPI's default response order
   * for big cities (Paris/London/NYC) skews heavily toward 4-star
   * properties, leaving budget travellers with no cheap options. The
   * route handler does a parallel "budget tier" fetch with this param
   * to guarantee 1-3★ coverage. If LiteAPI ignores the param the
   * budget-tier results just duplicate the primary fetch (deduped by
   * hotelId) — no harm.
   */
  starRatings?: number[];
}

export interface HotelOffer {
  offerId: string;        // rate offerId — feed this into completeBooking()
  hotelId: string;
  hotelName: string;
  address?: string;
  city?: string;
  country?: string;
  stars?: number;
  /** Aggregate review count from LiteAPI directory listing. Optional —
   *  populated only when the supplier surfaces it in the search response.
   *  Used to render a "★★★★ · 4,834 reviews" chip on search cards. */
  reviewCount?: number;
  /** 0-10 aggregate review score. Pairs with reviewCount on the chip. */
  reviewScore?: number;
  thumbnail?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  boardType?: string | null;   // e.g. "Room Only", "Bed & Breakfast"
  refundable: boolean;
  cancellationDeadline?: string | null;
  currency: string;
  price: number;              // total stay, after tax (best available — negotiated if present)
  priceBeforeTax?: number | null;
  pricePerNight?: number | null;
  commission?: number | null; // our commission (merchant margin)

  /* ── v3.0: Negotiated Rates & Signals ── */
  /** Negotiated/Scout Deal price (lower, from LiteAPI partnerships) */
  negotiatedPrice?: number | null;
  negotiatedPerNight?: number | null;
  /** Market/retail price (standard public rate) */
  marketPrice?: number | null;
  marketPerNight?: number | null;
  /** Rate type: 'negotiated_rate' | 'cheapest_rate' | undefined */
  rateType?: string | null;
  /** Perks bundled with this rate (e.g. free breakfast, late checkout) */
  perks?: string[];
  /** Signal from LiteAPI AI Recommendations (e.g. 'high_demand', 'price_drop') */
  signalType?: string | null;

  /** Taxes/fees NOT included in price — payable at property (e.g. city tax) */
  excludedTaxes?: number | null;

  /** All available room/rate options for this hotel (including the selected one).
   *  Phase-2 shape — one entry per unique (roomName, boardType). `roomName` is
   *  optional because not every supplier includes it; when absent the UI falls
   *  back to the board label. */
  boardOptions?: Array<{
    offerId: string;
    boardType: string;
    totalPrice: number;
    pricePerNight: number;
    refundable: boolean;
    /** v3.0 Phase-2: the human room name ("Deluxe King, City View") */
    roomName?: string | null;
    /** v3.0 Phase-3: per-row Scout Deal signal.
     *  negotiatedPrice is present only when LiteAPI returned a negotiatedRate
     *  strictly less than the retail/market price. marketPrice is ALWAYS the
     *  public retail total for that row. When negotiatedPrice is null/absent
     *  the UI renders a plain row — no deal ribbon. */
    negotiatedPrice?: number | null;
    marketPrice?: number | null;
    /** Phase-4: per-row property-payable taxes (city tax / VAT marked
     *  `included: false`). Kept separate from totalPrice so the customer sees
     *  the honest grand total without surprises at check-in. */
    excludedTaxes?: number | null;
    /** v2-plan step-2: ISO timestamp for when free cancellation expires
     *  (if refundable) — so the row can say "Free cancellation until
     *  28 May 2026" instead of a generic badge. Null for non-refundable or
     *  when the supplier didn't emit a deadline. */
    cancelDeadline?: string | null;
    /** v2-plan step-3: array of supported payment methods for this rate
     *  (e.g. ["PAY_AT_HOTEL", "ACH"]). Used to render the Pay-at-hotel chip
     *  when the supplier allows it. Null/empty → hidden. */
    paymentTypes?: string[] | null;
  }>;
}

export interface Guest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  nationality?: string; // ISO-3166 alpha-2, default GB
}

export interface CompleteBookingParams {
  offerId: string;
  guest: Guest;
  /** Stripe PaymentIntent ID used to settle the booking in our merchant wallet */
  stripePaymentIntentId?: string;
}

export interface BookingResult {
  bookingId: string;
  status: string;           // CONFIRMED / PENDING / FAILED
  supplierReference?: string | null;
  hotelConfirmationCode?: string | null;
  currency: string;
  totalPrice: number;
  checkIn: string;
  checkOut: string;
  raw: unknown;
}

/* ───────────────────────────────────────────────────────────────────────── */
/*  SEARCH — getHotels                                                       */
/* ───────────────────────────────────────────────────────────────────────── */

/**
 * Search hotels and return bookable offers (each with an offerId that locks
 * price for a short window).
 *
 * Flow:
 *   1. Resolve destinationId → list of hotelIds via /data/hotels (if not already ids)
 *   2. POST /hotels/rates with hotelIds + stay dates + occupancy → rates
 *   3. Normalise the cheapest offer per hotel into HotelOffer[]
 */
export async function getHotels(params: GetHotelsParams): Promise<HotelOffer[]> {
  const {
    destinationId,
    cityName,
    countryCode,
    checkIn,
    checkOut,
    occupancy,
    currency = 'GBP',
    guestNationality = 'GB',
    limit = 25,
    starRatings,
  } = params;

  if (!destinationId && !(cityName && countryCode)) {
    throw new Error('destinationId or cityName+countryCode is required');
  }
  if (!checkIn || !checkOut) throw new Error('checkIn and checkOut are required');
  if (!occupancy?.length) throw new Error('occupancy is required');

  // 1. Resolve hotelIds — and keep a directory of hotel metadata so we can
  // fall back to it when /hotels/rates doesn't echo an expanded `hotel` object
  // (which is inconsistent in sandbox — sometimes present, sometimes not).
  type HotelMeta = {
    id: string;
    name?: string;
    address?: string;
    city?: string;
    country?: string;
    // LiteAPI v3 actually returns `starRating` (camelCase). The legacy
    // `stars` and `rating` aliases are also accepted because the sandbox
    // response shape is not 100% consistent. Without this, every hotel
    // card rendered with empty stars (2026-04-28).
    stars?: number;
    starRating?: number;
    rating?: number;
    // LiteAPI v3 carries aggregate review data in the hotel directory
    // response — the field naming varies by sandbox/prod, so we accept
    // any of `reviewCount`/`numReviews`/`reviewsCount` for the count and
    // `reviewScore`/`averageRating`/`guestRating` for the 0-10 score.
    // If LiteAPI doesn't surface these here we silently fall back to no
    // chip on the card; we'd need a separate /data/reviews batch call
    // to populate them. (2026-04-28)
    reviewCount?: number;
    numReviews?: number;
    reviewsCount?: number;
    reviewScore?: number;
    averageRating?: number;
    guestRating?: number;
    main_photo?: string;
    hotelImages?: Array<{ url?: string } | string>;
    latitude?: number;
    longitude?: number;
  };
  let hotelIds: string[];
  const hotelDirectory = new Map<string, HotelMeta>();
  if (destinationId && destinationId.includes(',')) {
    // Caller passed a CSV of hotel ids directly
    hotelIds = destinationId.split(',').map((s) => s.trim()).filter(Boolean);
  } else {
    // Look up hotels by placeId OR cityName+countryCode
    const listQuery = new URLSearchParams({ limit: String(limit) });
    if (destinationId) {
      listQuery.set('placeId', destinationId);
    } else {
      listQuery.set('cityName', cityName!);
      listQuery.set('countryCode', countryCode!);
    }
    if (starRatings && starRatings.length > 0) {
      // Comma-separated star tiers, e.g. "0,1,2,3" for budget-and-unrated.
      // 0 covers hostels and properties LiteAPI hasn't classified — students
      // and budget travellers don't filter by stars, they book whatever's
      // cheap. Best-guess at LiteAPI's param name is `starRating` (singular)
      // accepting a CSV; if the API ignores the param it just returns the
      // unfiltered set, which the caller dedupes against the primary fetch.
      listQuery.set('starRating', starRatings.join(','));
    }
    const list = await liteFetch<{ data: HotelMeta[] }>(
      `/data/hotels?${listQuery.toString()}`,
      { method: 'GET' },
    );
    const rows = (list.data || []).slice(0, limit);
    for (const row of rows) {
      if (row?.id) hotelDirectory.set(row.id, row);
    }
    hotelIds = rows.map((h) => h.id);
  }

  if (hotelIds.length === 0) return [];

  // 2. Fetch live rates for those hotels
  const ratesBody = {
    hotelIds,
    checkin: checkIn,
    checkout: checkOut,
    currency,
    guestNationality,
    occupancies: occupancy.map((o) => ({
      adults: o.adults,
      children: o.children || [],
    })),
  };

  type RateObj = {
    rateId?: string;
    name?: string;
    boardType?: string;
    boardName?: string;
    cancellationPolicies?: { refundableTag?: string; cancelPolicyInfos?: Array<{ cancelTime?: string }> };
    /** v3.0: can be flat number OR nested object (backward compat) */
    retailRate?: number | {
      total?: Array<{ amount: number; currency: string }>;
      suggestedSellingPrice?: Array<{ amount: number; currency: string }>;
      taxesAndFees?: Array<{ amount: number; currency: string; included?: boolean }>;
    };
    /** v3.0: flat negotiated/Scout price (only present when a deal is active) */
    negotiatedRate?: number;
    /** v3.0: rate-level price (best available — equals negotiatedRate when deal active) */
    price?: number;
    /** v3.0: 'negotiated' | 'standard' — distinction flag */
    priceType?: string;
    commission?: Array<{ amount: number; currency: string }>;
    /** v3.0: perks bundled with this rate (e.g. "free_breakfast", "late_checkout") */
    perks?: string[];
    /** v3.0: offerId can also live at rate level */
    offerId?: string;
    /** v3.0: cancellation policy (new flat format) */
    cancellationPolicy?: { refundable?: boolean; deadline?: string };
  };
  type AmountObj = { amount: number; currency: string };
  type RoomType = {
    roomTypeId?: string;
    offerId?: string; // ← THIS is what /rates/prebook expects
    rates?: RateObj[];
    // LiteAPI returns these as a SINGLE object {amount, currency}, NOT an array
    offerRetailRate?: AmountObj | AmountObj[];
    suggestedSellingPrice?: AmountObj | AmountObj[];
    priceType?: string;
    paymentTypes?: string[];
    /** v3.0: human room-category name ("Deluxe King Room, City View") — not
     *  always present. When absent we use rate.name, then board label. */
    name?: string;
    roomName?: string;
  };

  /** Clean up a LiteAPI room/rate name — strip redundant board suffixes
   *  ("… - Room Only", "… with Breakfast"), collapse whitespace, sane length. */
  function cleanRoomName(raw: string | undefined | null): string | null {
    if (!raw) return null;
    let s = String(raw).trim();
    // Strip common trailing board fragments so we don't duplicate the label
    s = s.replace(/\s*[-–—]\s*(room only|bed(?: and| &)? breakfast|breakfast included|half board|full board|all[- ]?inclusive)\s*$/i, '');
    s = s.replace(/\s*\(?\b(room only|breakfast included|half board|full board|all[- ]?inclusive)\b\)?\s*$/i, '');
    s = s.replace(/\s+/g, ' ').trim();
    if (!s || s.length > 120) return null;
    return s;
  }

  /** Safely extract a numeric amount whether the field is a single object or an array */
  function extractAmount(v: AmountObj | AmountObj[] | undefined | null): number | undefined {
    if (!v) return undefined;
    if (Array.isArray(v)) {
      return v.length > 0 ? v.reduce((s, t) => s + (t.amount || 0), 0) : undefined;
    }
    if (typeof v === 'object' && typeof v.amount === 'number') return v.amount;
    return undefined;
  }

  function extractCurrency(v: AmountObj | AmountObj[] | undefined | null): string | undefined {
    if (!v) return undefined;
    if (Array.isArray(v)) return v.length > 0 ? v[0].currency : undefined;
    if (typeof v === 'object' && v.currency) return v.currency;
    return undefined;
  }
  type RatesResponse = {
    data: Array<{
      hotelId: string;
      /** v3.0: AI signal at hotel/search level (e.g. "high_demand") */
      signalType?: string;
      hotel?: {
        id: string;
        name: string;
        address?: string;
        city?: string;
        country?: string;
        stars?: number;
        starRating?: number;
        rating?: number;
        reviewCount?: number;
        numReviews?: number;
        reviewsCount?: number;
        reviewScore?: number;
        averageRating?: number;
        guestRating?: number;
        main_photo?: string;
        latitude?: number;
        longitude?: number;
      };
      roomTypes?: RoomType[];
    }>;
  };

  // CHUNKING: /hotels/rates with 200 hotelIds in one shot blew the 12s
  // edge timeout in prod (commit b16a820 had to revert a 50→200 bump
  // 2026-04-29). Solution: split into batches of 50 and fetch in parallel.
  // Each individual call stays well under the timeout; total wall-clock
  // time is roughly the same as a single 50-hotel call. We can now serve
  // up to ~200 hotels per search without breaking Paris (or any city
  // with deep inventory).
  const RATES_CHUNK_SIZE = 50;
  const chunks: string[][] = [];
  for (let i = 0; i < hotelIds.length; i += RATES_CHUNK_SIZE) {
    chunks.push(hotelIds.slice(i, i + RATES_CHUNK_SIZE));
  }

  const chunkResults = await Promise.all(
    chunks.map((chunkIds) =>
      liteFetch<RatesResponse>('/hotels/rates', {
        method: 'POST',
        body: JSON.stringify({ ...ratesBody, hotelIds: chunkIds }),
      }).catch((err: unknown) => {
        // One failed chunk shouldn't kill the whole search — log it and
        // return an empty data array so the other chunks still surface.
        const message = err instanceof Error ? err.message : 'rates chunk failed';
        console.warn(`[liteapi:rates] chunk of ${chunkIds.length} failed:`, message);
        return { data: [] } as RatesResponse;
      }),
    ),
  );

  const ratesRes: RatesResponse = {
    data: chunkResults.flatMap((r) => r.data || []),
  };

  const nights = Math.max(
    1,
    Math.round(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
        (1000 * 60 * 60 * 24),
    ),
  );

  // 3. Flatten: one cheapest offer per hotel, plus all board options.
  //    NOTE: offerId lives on the roomType (not the rate). Each roomType groups
  //    one or more rate variants; prebook/book operate on the offerId.
  const offers: HotelOffer[] = [];
  for (const entry of ratesRes.data || []) {
    let bestRoomType: RoomType | null = null;
    let bestRate: RateObj | null = null;
    let bestPrice = Infinity;

    // Collect ALL (roomName × boardType) options for this hotel. We key the
    // map by `${roomKey}|${boardKey}` so identical room+board combos collapse
    // to the cheapest, but different room categories (Standard / Deluxe /
    // Suite) each get their own row — booking.com's grid, Scout's voice.
    type OptionRow = {
      offerId: string;
      boardType: string;
      totalPrice: number;
      pricePerNight: number;
      refundable: boolean;
      roomName?: string | null;
      /** Phase-3 per-row Scout Deal signal */
      negotiatedPrice?: number | null;
      marketPrice?: number | null;
      /** Phase-4: per-row property-payable taxes (city tax / VAT that LiteAPI
       *  marks `included: false`). Not added to totalPrice — shown alongside
       *  so the customer sees the honest grand total rather than discovering
       *  a surprise at check-in. Null when the rate has no excluded taxes. */
      excludedTaxes?: number | null;
      /** v2-plan step-2: free-cancel deadline ISO string, null otherwise. */
      cancelDeadline?: string | null;
      /** v2-plan step-3: payment methods (e.g. ["PAY_AT_HOTEL"]). */
      paymentTypes?: string[] | null;
    };
    const optionsByKey = new Map<string, OptionRow>();

    for (const rt of entry.roomTypes || []) {
      // Prefer the roomType-level name, fall back to the first rate's name.
      // We clean both so the row title never duplicates the board label.
      const roomTypeName = cleanRoomName(rt.name || rt.roomName);
      // offerId can be on roomType (old) or rate (v3.0) — we check both below
      for (const r of rt.rates || []) {
        // Resolve offerId: rate-level (v3.0) takes priority, then roomType-level
        const rateOfferId = r.offerId || rt.offerId;
        if (!rateOfferId) continue;

        // ── Price extraction: handle both v3.0 flat numbers AND old nested objects ──
        // v3.0: retailRate is a flat number; old: retailRate is {total: [{amount}]}
        let retailFlat: number | undefined;
        let rateTotal: number | undefined;
        let rateSuggested: number | undefined;
        if (typeof r.retailRate === 'number') {
          // v3.0 flat format
          retailFlat = r.retailRate;
        } else if (r.retailRate && typeof r.retailRate === 'object') {
          // Old nested format
          const totalArr = (r.retailRate as { total?: Array<{ amount: number; currency: string }> }).total || [];
          const suggestedArr = (r.retailRate as { suggestedSellingPrice?: Array<{ amount: number; currency: string }> }).suggestedSellingPrice || [];
          rateTotal = totalArr.length > 0 ? totalArr.reduce((s, t) => s + (t.amount || 0), 0) : undefined;
          rateSuggested = suggestedArr.length > 0 ? suggestedArr.reduce((s, t) => s + (t.amount || 0), 0) : undefined;
        }

        // Offer-level prices (old format)
        const offerSSP = extractAmount(rt.suggestedSellingPrice);
        const offerRetail = extractAmount(rt.offerRetailRate);

        // v3.0 flat rate-level price
        const ratePrice = r.price;

        // Market price = what the customer actually pays via LiteAPI Payment SDK.
        // Priority: offerRetailRate (offer-level total) > rate-level total > rate.price.
        // suggestedSellingPrice is a markup hint for merchant model — NOT what the
        // customer pays in the commission/Payment-SDK model, so we skip it.
        const marketPrice = retailFlat ?? offerRetail ?? rateTotal ?? ratePrice ?? Infinity;
        // Negotiated price = v3.0 flat negotiatedRate (only when deal active)
        const negPrice = typeof r.negotiatedRate === 'number' ? r.negotiatedRate : undefined;
        // Best price = negotiated if cheaper, else market
        const effectivePrice = (negPrice != null && negPrice < marketPrice) ? negPrice : marketPrice;

        console.log(`[liteapi:rates] hotel=${entry.hotelId} offerId=${rateOfferId?.slice(0,20)} market=${marketPrice} negotiated=${negPrice} effective=${effectivePrice} priceType=${r.priceType}`);

        const board = r.boardName || r.boardType || r.name || 'Room Only';
        // Refundable: v3.0 flat format or old nested format
        const isRefundable = r.cancellationPolicy?.refundable === true
          || r.cancellationPolicies?.refundableTag === 'RFN';

        // Room name: prefer the roomType-level name we grabbed earlier, else
        // fall back to the rate's own `name` (also cleaned). When both are
        // missing we store `null` and let the UI fall back to the board label.
        const roomName = roomTypeName || cleanRoomName(r.name) || null;

        // Key by (roomName, boardType) — different rooms get different rows,
        // identical combos collapse to the cheapest rate.
        const roomKey = (roomName || '__none__').toLowerCase();
        const boardKey = board.toLowerCase();
        const mapKey = `${roomKey}|${boardKey}`;
        const existing = optionsByKey.get(mapKey);
        // Phase-3: per-row Scout Deal. negotiated only counts when strictly
        // cheaper than market — otherwise it's noise, not a deal.
        const hasDeal = negPrice != null && Number.isFinite(marketPrice) && negPrice < marketPrice;
        // Phase-4: per-rate excluded taxes (city tax / VAT payable at
        // property). Same shape as the offer-level sum, computed per rate so
        // the table can show each row's true grand total honestly.
        const rateExcludedTaxes = (typeof r.retailRate === 'object' && r.retailRate)
          ? ((r.retailRate as { taxesAndFees?: Array<{ amount: number; included?: boolean }> }).taxesAndFees || [])
              .filter((t) => t.included === false)
              .reduce((sum, t) => sum + (t.amount || 0), 0)
          : 0;
        // v2-plan step-2: free-cancellation deadline. Prefer the v3.0 flat
        // `cancellationPolicy.deadline`; fall back to the old nested
        // `cancelPolicyInfos[0].cancelTime` so older supplier payloads still
        // surface a deadline. Only meaningful when the rate is refundable.
        const cancelDeadline = isRefundable
          ? (r.cancellationPolicy?.deadline
             || r.cancellationPolicies?.cancelPolicyInfos?.[0]?.cancelTime
             || null)
          : null;
        // v2-plan step-3: payment types live at the roomType level in v3.0
        // (e.g. ["PAY_AT_HOTEL", "ACH"]). Copy the array so downstream code
        // can't mutate the source.
        const paymentTypes = Array.isArray(rt.paymentTypes) && rt.paymentTypes.length > 0
          ? [...rt.paymentTypes]
          : null;
        const nextRow: OptionRow = {
          offerId: rateOfferId,
          boardType: board,
          totalPrice: Math.round(effectivePrice * 100) / 100,
          pricePerNight: Math.round((effectivePrice / nights) * 100) / 100,
          refundable: isRefundable,
          roomName,
          negotiatedPrice: hasDeal ? Math.round(negPrice! * 100) / 100 : null,
          marketPrice: Number.isFinite(marketPrice) ? Math.round(marketPrice * 100) / 100 : null,
          excludedTaxes: rateExcludedTaxes > 0 ? Math.round(rateExcludedTaxes * 100) / 100 : null,
          cancelDeadline,
          paymentTypes,
        };
        if (!existing || effectivePrice < existing.totalPrice) {
          optionsByKey.set(mapKey, nextRow);
        }

        if (effectivePrice < bestPrice) {
          bestPrice = effectivePrice;
          bestRoomType = rt;
          bestRate = r;
        }
      }
    }

    // offerId: rate-level (v3.0) or roomType-level (old)
    const bestOfferId = bestRate?.offerId || bestRoomType?.offerId;
    if (!bestRoomType || !bestRate || !bestOfferId) continue;

    // Flatten the map, sort cheapest-first. Cap raised from 12 → 50 so
    // the search-card "N room types available" chip can count distinct
    // room names accurately. The old cap was producing "12 room types
    // available" on every well-stocked hotel because 4 rooms × 3 boards
    // = 12 (room×board) combos hit the slice (2026-04-28). The detail-
    // page rates table still scrolls fine at 50 rows.
    const allOptions = Array.from(optionsByKey.values())
      .sort((a, b) => a.totalPrice - b.totalPrice)
      .slice(0, 50);

    // ── PRICE: handle v3.0 flat numbers AND old nested objects ──
    let marketRaw: number;
    let negotiatedRaw: number | undefined;

    if (typeof bestRate.retailRate === 'number') {
      // v3.0 flat format
      marketRaw = bestRate.retailRate;
      negotiatedRaw = typeof bestRate.negotiatedRate === 'number' ? bestRate.negotiatedRate : undefined;
    } else {
      // Old nested format — extract from offer-level or rate-level objects
      const offerSSP = extractAmount(bestRoomType.suggestedSellingPrice);
      const offerRetail = extractAmount(bestRoomType.offerRetailRate);
      const totalAll = bestRate.retailRate?.total || [];
      const suggestedAll = bestRate.retailRate?.suggestedSellingPrice || [];
      const rateTotal = totalAll.length > 0 ? totalAll.reduce((s, t) => s + (t.amount || 0), 0) : undefined;
      const rateSuggested = suggestedAll.length > 0 ? suggestedAll.reduce((s, t) => s + (t.amount || 0), 0) : undefined;
      // Use offerRetailRate (what the customer pays) — NOT suggestedSellingPrice
      // (a markup hint for merchant model that doesn't match the Payment SDK price).
      marketRaw = offerRetail ?? rateTotal ?? bestRate.price ?? 0;
      negotiatedRaw = undefined; // old format has no negotiated rate
    }

    // Final price = negotiated if cheaper, else market.
    // `let` not `const` because the FX block below may convert in place.
    let finalPrice = (negotiatedRaw != null && negotiatedRaw > 0 && negotiatedRaw < marketRaw)
      ? negotiatedRaw : marketRaw;

    let finalCurrency =
      extractCurrency(bestRoomType.suggestedSellingPrice) ??
      extractCurrency(bestRoomType.offerRetailRate) ??
      currency;

    // Sum only taxes that aren't already included in `total` (old format only).
    // This is PER-ROOM excluded tax — multiply across all rooms in the roomType.
    const perRoomExcluded = (typeof bestRate.retailRate === 'object' && bestRate.retailRate)
      ? ((bestRate.retailRate as { taxesAndFees?: Array<{ amount: number; included?: boolean }> }).taxesAndFees || [])
          .filter((t) => t.included === false)
          .reduce((sum, t) => sum + (t.amount || 0), 0)
      : 0;
    const roomCount = (bestRoomType.rates || []).length || 1;
    // Clamp negative supplier-side adjustments — taxes-and-fees field has been
    // observed to carry refund deltas as negative entries which would make
    // priceBeforeTax less than priceTotal, confusing the UI.
    const extraTaxes = Math.max(0, perRoomExcluded * roomCount);
    const commissionArr = Array.isArray(bestRate.commission) ? bestRate.commission : [];
    const commission = commissionArr.length > 0 ? commissionArr.reduce((s, c) => s + (c.amount || 0), 0) : null;

    // ── FX + sanity guards ─────────────────────────────────────────────────
    // LiteAPI sometimes ignores the requested `currency=GBP` and returns the
    // supplier's native currency (MAD for Marrakech, EUR for parts of EU,
    // USD for Vegas). The client renders all prices with a £ symbol, so we
    // FX-convert here before sending. Rates are baked into the table below
    // (refreshed quarterly). For travel-comparison this is fine — the user
    // is comparing approximate prices, not transacting; the booking flow
    // pulls a fresh quote in GBP from LiteAPI.
    //
    // History (2026-04-28): we initially dropped non-GBP offers entirely
    // ("better empty than wrong"), which silently killed Marrakech results
    // where every offer comes back in MAD. Switched to convert-and-show.
    const FX_TO_GBP: Record<string, number> = {
      GBP: 1,
      USD: 0.79,
      EUR: 0.85,
      MAD: 0.079,   // Moroccan Dirham
      AED: 0.215,   // UAE Dirham
      QAR: 0.217,   // Qatari Riyal
      OMR: 2.06,    // Omani Rial
      SAR: 0.211,   // Saudi Riyal
      EGP: 0.016,   // Egyptian Pound
      TRY: 0.024,   // Turkish Lira
      JPY: 0.0051,  // Japanese Yen
      CNY: 0.108,   // Chinese Yuan
      HKD: 0.101,   // Hong Kong Dollar
      KRW: 0.00057, // Korean Won
      SGD: 0.588,   // Singapore Dollar
      MYR: 0.171,   // Malaysian Ringgit
      THB: 0.023,   // Thai Baht
      IDR: 0.00005, // Indonesian Rupiah
      VND: 0.000031,// Vietnamese Dong
      INR: 0.0095,  // Indian Rupee
      LKR: 0.0026,  // Sri Lankan Rupee
      NPR: 0.0059,  // Nepalese Rupee
      PKR: 0.0028,  // Pakistani Rupee
      AZN: 0.46,    // Azerbaijani Manat
      AMD: 0.002,   // Armenian Dram
      GEL: 0.30,    // Georgian Lari
      KZT: 0.0016,  // Kazakh Tenge
      UZS: 0.000064,// Uzbek Som
      AUD: 0.51,    // Australian Dollar
      NZD: 0.47,    // NZ Dollar
      CAD: 0.57,    // Canadian Dollar
      MXN: 0.039,   // Mexican Peso
      BRL: 0.13,    // Brazilian Real
      ARS: 0.00075, // Argentine Peso
      CHF: 0.88,    // Swiss Franc
      DKK: 0.114,   // Danish Krone
      SEK: 0.074,   // Swedish Krona
      NOK: 0.072,   // Norwegian Krone
      PLN: 0.198,   // Polish Zloty
      CZK: 0.034,   // Czech Koruna
      HUF: 0.0022,  // Hungarian Forint
      ZAR: 0.042,   // South African Rand
      MVR: 0.051,   // Maldivian Rufiyaa
      MUR: 0.017,   // Mauritian Rupee
      KES: 0.0061,  // Kenyan Shilling
      TND: 0.25,    // Tunisian Dinar
      HRK: 0.113,   // Croatian Kuna (legacy — replaced by EUR but some rows still use)
    };

    // Track whether we had to FX-convert this offer. Used below to relax
    // the star-tier sanity floor — markets that return native currency
    // (Marrakech in MAD, Cairo in EGP, Bangkok in THB, etc) tend to have
    // legitimately cheaper hotels than the GBP-denominated wholesale
    // markets (US/UK/EU). The standard floor (4★ ≥ £35) is calibrated
    // for the latter and was hiding real 3-4★ inventory in cheap markets.
    let fxConverted = false;
    if (finalCurrency && finalCurrency !== 'GBP') {
      const fx = FX_TO_GBP[finalCurrency.toUpperCase()];
      if (fx && fx > 0) {
        const before = finalPrice;
        // Convert all price fields in place so the rest of the function
        // works as if LiteAPI had returned GBP from the start.
        marketRaw = marketRaw * fx;
        if (negotiatedRaw != null) negotiatedRaw = negotiatedRaw * fx;
        finalPrice = finalPrice * fx;
        finalCurrency = 'GBP';
        fxConverted = true;
        console.log(`[liteapi:fx] hotel=${entry.hotelId} ${before.toFixed(2)} → £${finalPrice.toFixed(2)} (rate=${fx})`);
      } else {
        console.warn(`[liteapi:drop] hotel=${entry.hotelId} unknown currency=${finalCurrency} — no FX rate available, dropping`);
        continue;
      }
    }

    // ── Sanity floors by star tier (in GBP, post-FX) ──────────────────────
    // We've seen LiteAPI's sandbox return synthetic test data with absurd
    // prices (Vegas 4★ hotels at £15/night). Showing those on the site
    // looks like a scam — visitors don't trust prices that good. Drop
    // any offer whose per-night GBP price is below the realistic floor
    // for its star tier:
    //   GBP markets:    5★ ≥ £45  4★ ≥ £35  3★ ≥ £20  2★ ≥ £12  1★ ≥ £8
    //   FX-converted:   5★ ≥ £25  4★ ≥ £18  3★ ≥ £10  2★ ≥ £6   1★ ≥ £4
    // The halved floor for FX-converted markets stops legitimate 3-4★
    // hotels in Marrakech / Cairo / Bangkok / Hanoi from being dropped
    // (they routinely come in at £25-35/night for a 4★ — well below the
    // standard floor but a real, bookable price).
    const stars = entry.hotel?.starRating
      ?? entry.hotel?.stars
      ?? (entry.hotel as { rating?: number } | undefined)?.rating
      ?? hotelDirectory.get(entry.hotelId)?.starRating
      ?? hotelDirectory.get(entry.hotelId)?.stars
      ?? hotelDirectory.get(entry.hotelId)?.rating
      ?? 0;
    const perNightForGuard = nights > 0 ? finalPrice / nights : finalPrice;
    const floorMul = fxConverted ? 0.5 : 1.0;
    let floorGBP: number;
    if (stars >= 5) floorGBP = 45 * floorMul;
    else if (stars >= 4) floorGBP = 35 * floorMul;
    else if (stars >= 3) floorGBP = 20 * floorMul;
    else if (stars >= 2) floorGBP = 12 * floorMul;
    else floorGBP = 8 * floorMul;
    if (finalPrice > 0 && perNightForGuard < floorGBP) {
      console.warn(`[liteapi:drop] hotel=${entry.hotelId} stars=${stars} perNight=£${perNightForGuard.toFixed(2)} (floor=£${floorGBP}, fx=${fxConverted}) — dropped as data anomaly`);
      continue;
    }

    const priceBeforeTax = finalPrice > 0 ? finalPrice + extraTaxes : null;
    const pricePerNight = finalPrice > 0 ? finalPrice / nights : null;

    // v3.0: perks (rate-level), signal (hotel-level), rateType
    const perks = bestRate.perks?.length ? bestRate.perks : undefined;
    const signalType = entry.signalType || null; // hotel/search level
    const rateType = bestRate.priceType || bestRoomType.priceType || null;

    console.log(`[liteapi:offer] hotel=${entry.hotelId} offerId=${bestOfferId} market=${marketRaw} negotiated=${negotiatedRaw} → final=${finalPrice} rateType=${rateType} perks=${perks?.join(',') || 'none'} signal=${signalType}`);

    // Prefer the expanded `hotel` object from /hotels/rates when present,
    // otherwise fall back to the directory we built from /data/hotels. This
    // avoids showing `lp6558ae6f` as a hotel name when rates skips the object.
    const h = entry.hotel;
    const meta = hotelDirectory.get(entry.hotelId);
    const firstImage = Array.isArray(meta?.hotelImages) && meta!.hotelImages.length
      ? (typeof meta!.hotelImages[0] === 'string' ? meta!.hotelImages[0] as string : (meta!.hotelImages[0] as { url?: string }).url)
      : undefined;
    offers.push({
      offerId: bestOfferId,
      hotelId: entry.hotelId,
      hotelName: (h?.name?.trim?.() || meta?.name?.trim?.() || entry.hotelId),
      address: h?.address || meta?.address,
      city: h?.city || meta?.city,
      country: h?.country || meta?.country,
      stars: h?.starRating ?? h?.stars ?? (h as { rating?: number })?.rating ?? meta?.starRating ?? meta?.stars ?? meta?.rating,
      reviewCount: h?.reviewCount ?? h?.numReviews ?? h?.reviewsCount
        ?? meta?.reviewCount ?? meta?.numReviews ?? meta?.reviewsCount,
      reviewScore: h?.reviewScore ?? h?.averageRating ?? h?.guestRating
        ?? meta?.reviewScore ?? meta?.averageRating ?? meta?.guestRating,
      thumbnail: h?.main_photo || meta?.main_photo || firstImage || null,
      latitude: h?.latitude ?? meta?.latitude ?? null,
      longitude: h?.longitude ?? meta?.longitude ?? null,
      boardType: bestRate.boardName || bestRate.boardType || bestRate.name || null,
      // Refundable: v3.0 flat format or old nested format
      refundable: bestRate.cancellationPolicy?.refundable === true
        || bestRate.cancellationPolicies?.refundableTag === 'RFN',
      cancellationDeadline:
        bestRate.cancellationPolicy?.deadline
        || bestRate.cancellationPolicies?.cancelPolicyInfos?.[0]?.cancelTime || null,
      currency: finalCurrency,
      price: Math.round(finalPrice * 100) / 100,
      priceBeforeTax: priceBeforeTax != null ? Math.round(priceBeforeTax * 100) / 100 : null,
      pricePerNight: pricePerNight != null ? Math.round(pricePerNight * 100) / 100 : null,
      commission,

      // v3.0: negotiated vs market
      negotiatedPrice: (negotiatedRaw != null && negotiatedRaw < marketRaw)
        ? Math.round(negotiatedRaw * 100) / 100 : null,
      negotiatedPerNight: (negotiatedRaw != null && negotiatedRaw < marketRaw)
        ? Math.round((negotiatedRaw / nights) * 100) / 100 : null,
      marketPrice: Math.round(marketRaw * 100) / 100,
      marketPerNight: marketRaw != null ? Math.round((marketRaw / nights) * 100) / 100 : null,
      rateType,
      perks: perks || undefined,
      signalType,

      excludedTaxes: extraTaxes > 0 ? Math.round(extraTaxes * 100) / 100 : null,
      boardOptions: allOptions.length > 1 ? allOptions : undefined,
      // (Each option now carries its own roomName when LiteAPI provides one;
      //  the UI falls back to the board label when absent — Phase-1 parity.)
    });
  }

  // Sort cheapest first
  offers.sort((a, b) => a.price - b.price);
  return offers;
}

/* ───────────────────────────────────────────────────────────────────────── */
/*  HOTEL DETAILS — getHotelDetails                                          */
/* ───────────────────────────────────────────────────────────────────────── */

/** Phase-4: per-room-category metadata parsed from LiteAPI `/data/hotel`
 *  rooms[]. Keyed by a normalised room name so the RoomsTable can resolve
 *  rich detail (photos, size, bed config, in-room amenities) without a
 *  second network call. Every field is optional — LiteAPI suppliers are
 *  inconsistent about what they return, so we degrade gracefully. */
export interface RoomMeta {
  id: string;
  name: string;
  description: string | null;
  photos: string[];
  amenities: string[];
  maxOccupancy: number | null;
  sizeSqm: number | null;
  /** Pre-formatted bed string ("1 Queen Bed", "2 Single Beds"). Null when
   *  the supplier omits bed types. */
  beds: string | null;
}

export interface HotelDetails {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  stars: number | null;
  latitude: number | null;
  longitude: number | null;
  mainPhoto: string | null;
  photos: string[];
  amenities: string[];
  checkInTime: string | null;
  checkOutTime: string | null;
  /** v2-plan step-1: structured hotel policies (internet, parking, pets,
   *  children, groups, etc.) from LiteAPI `/data/hotel` `policies[]`. Each
   *  entry is already HTML-stripped + whitespace-tidied. Empty array when
   *  the supplier didn't emit any. */
  policies: HotelPolicy[];
  /** Phase-4: per-room-category metadata. Empty array when the supplier
   *  returned no rooms[] section. The RoomsTable looks up rows by
   *  lowercased roomName — see page.tsx for the memoised lookup map. */
  rooms: RoomMeta[];
  /** BACKLOG B2 (2026-04-21): aggregate + recent reviews pulled from LiteAPI
   *  `/data/reviews`. Always present — when the supplier returns nothing we
   *  surface an empty object so the UI can render a "No reviews yet" state
   *  instead of hiding the tab. */
  reviews: HotelReviews;
}

/** BACKLOG B2: one review row from LiteAPI `/data/reviews`. Every field is
 *  optional because LiteAPI supplier coverage is inconsistent — sometimes
 *  you get just a score + country, sometimes full pros/cons text. */
export interface HotelReview {
  name: string;
  country: string | null;
  /** Trip type e.g. "Business", "Solo", "Family". LiteAPI doesn't always emit it. */
  type: string | null;
  /** ISO date of stay / review. */
  date: string | null;
  /** ISO-639 lang code (lowercased) e.g. "en", "fr". */
  language: string | null;
  headline: string | null;
  pros: string | null;
  cons: string | null;
  /** 0–10 score for this specific review. */
  score: number | null;
}

export interface HotelReviews {
  /** Aggregate score 0–10. Null when we have zero reviews. */
  averageScore: number | null;
  /** Total review count (from `total` when LiteAPI returns it, else list length). */
  count: number;
  /** Most-recent list, capped by the fetch limit. */
  list: HotelReview[];
}

/** v2-plan step-1: one row from LiteAPI's `policies[]`. `policy_type` looks
 *  like `POLICY_HOTEL_INTERNET`, `POLICY_HOTEL_PARKING`, etc. We normalise
 *  the kind to a short enum string so the UI can pick icons without doing
 *  its own regex work. */
export interface HotelPolicy {
  kind: 'internet' | 'parking' | 'pets' | 'children' | 'groups' | 'other';
  name: string;
  description: string;
}

/**
 * Fetch full hotel metadata (photos, description, amenities) from LiteAPI
 * `/data/hotel`. Used to render /hotels/[id] detail pages.
 */
export async function getHotelDetails(hotelId: string): Promise<HotelDetails | null> {
  if (!hotelId) return null;
  try {
    type RawHotel = {
      id?: string;
      name?: string;
      hotelDescription?: string;
      description?: string;
      address?: string;
      city?: string;
      country?: string;
      starRating?: number;
      stars?: number;
      rating?: number;
      latitude?: number;
      longitude?: number;
      main_photo?: string;
      thumbnail?: string;
      hotelImages?: Array<{ url?: string; urlHd?: string } | string>;
      hotelFacilities?: Array<string | { name?: string }>;
      facilities?: Array<string | { name?: string }>;
      amenities?: Array<string | { name?: string }>;
      /** v2-plan step-1: real LiteAPI shape has `checkin_start`/`checkin_end`
       *  not `checkin`. Kept the legacy `checkin` key as a fallback so the
       *  parser stays tolerant to supplier drift. */
      checkinCheckoutTimes?: {
        checkin_start?: string;
        checkin_end?: string;
        checkin?: string;
        checkout?: string;
        instructions?: unknown;
        special_instructions?: string;
      };
      /** v2-plan step-1: structured policies array — 5 or so entries covering
       *  internet, parking, pets, children, groups. We forward a cleaned
       *  version on HotelDetails.policies so the UI can render icon cards. */
      policies?: Array<{
        id?: number;
        policy_type?: string;
        name?: string;
        description?: string;
      }>;
      /** Phase-4: per-room-category breakdown. LiteAPI field names vary by
       *  API version; we try each plausible shape. */
      rooms?: Array<RawRoom>;
      roomTypes?: Array<RawRoom>;
      hotelRooms?: Array<RawRoom>;
    };
    type RawRoom = {
      id?: string | number;
      roomTypeId?: string | number;
      roomName?: string;
      name?: string;
      description?: string;
      roomDescription?: string;
      photos?: Array<{ url?: string; urlHd?: string; caption?: string } | string>;
      images?: Array<{ url?: string; urlHd?: string } | string>;
      roomAmenities?: Array<string | { name?: string; amenitiesName?: string }>;
      amenities?: Array<string | { name?: string }>;
      maxAdults?: number;
      maxChildren?: number;
      maxOccupancy?: number;
      roomSizeSquare?: number;
      roomSize?: number;
      sizeSquareMeters?: number;
      roomSizeUnit?: string;       // "sqm" | "sqft"
      bedTypes?: Array<{ name?: string; quantity?: number } | string>;
      beds?: Array<{ name?: string; quantity?: number } | string>;
    };
    // BACKLOG B2 (2026-04-21): fetch hotel metadata + reviews in parallel.
    // Same KV entry will hold both (v4 bump), so the UI never has to do a
    // second round-trip for the review score chip.
    const [res, reviews] = await Promise.all([
      liteFetch<{ data: RawHotel }>(
        `/data/hotel?hotelId=${encodeURIComponent(hotelId)}`,
        { method: 'GET' },
        12_000,
      ),
      getHotelReviews(hotelId, 8),
    ]);
    const h = res.data;
    if (!h) return null;

    const photos: string[] = [];
    if (Array.isArray(h.hotelImages)) {
      for (const img of h.hotelImages) {
        if (!img) continue;
        const url = typeof img === 'string' ? img : (img.urlHd || img.url);
        if (url) photos.push(url);
      }
    }
    if (h.main_photo && !photos.includes(h.main_photo)) {
      photos.unshift(h.main_photo);
    }

    const rawAmenities = h.hotelFacilities || h.facilities || h.amenities || [];
    const amenities: string[] = [];
    for (const a of rawAmenities) {
      const name = typeof a === 'string' ? a : a?.name;
      if (name && typeof name === 'string') amenities.push(name);
    }

    // Strip HTML tags from description
    const rawDesc = h.hotelDescription || h.description || '';
    const description = typeof rawDesc === 'string'
      ? rawDesc.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || null
      : null;

    // Phase-4: parse per-room-category metadata. LiteAPI suppliers are wildly
    // inconsistent about which field name they use (rooms / roomTypes /
    // hotelRooms), so we try all three and walk whichever is populated.
    const rawRooms: RawRoom[] = h.rooms || h.roomTypes || h.hotelRooms || [];
    const rooms: RoomMeta[] = [];
    const seenNames = new Set<string>();
    for (const r of rawRooms) {
      if (!r || typeof r !== 'object') continue;
      // Clean the room name using the EXACT same rules as the rates-side
      // cleanRoomName() so details and rates produce identical keys and the
      // per-room thumbnail lookup (roomMetaByName) actually hits. The second
      // replace — stripping parenthesised or bare trailing board labels like
      // "(Room Only)" — was missing, which silently broke thumbnails for any
      // supplier that uses bracketed board suffixes on room names.
      const rawName = r.roomName || r.name || '';
      const cleaned = String(rawName)
        .replace(/\s*[-–—]\s*(room only|bed(?: and| &)? breakfast|breakfast included|half board|full board|all[- ]?inclusive)\s*$/i, '')
        .replace(/\s*\(?\b(room only|breakfast included|half board|full board|all[- ]?inclusive)\b\)?\s*$/i, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (!cleaned) continue;
      const dedupeKey = cleaned.toLowerCase();
      if (seenNames.has(dedupeKey)) continue;
      seenNames.add(dedupeKey);

      // Photos: accept string URLs or {url, urlHd} objects.
      const roomPhotos: string[] = [];
      for (const p of r.photos || r.images || []) {
        if (!p) continue;
        const url = typeof p === 'string' ? p : (p.urlHd || p.url);
        if (url) roomPhotos.push(url);
      }

      // Amenities: accept string or { name } / { amenitiesName }.
      const roomAmenities: string[] = [];
      const rawAms = r.roomAmenities || r.amenities || [];
      for (const a of rawAms) {
        if (!a) continue;
        const name = typeof a === 'string'
          ? a
          : (a.name || (a as { amenitiesName?: string }).amenitiesName);
        if (name && typeof name === 'string') roomAmenities.push(name);
      }

      // Size: prefer explicit sqm fields. Convert sqft → sqm when the unit
      // is declared. Otherwise trust the raw number as-is.
      let sizeSqm: number | null = null;
      const rawSize = r.roomSizeSquare ?? r.sizeSquareMeters ?? r.roomSize;
      if (typeof rawSize === 'number' && rawSize > 0) {
        const unit = (r.roomSizeUnit || 'sqm').toLowerCase();
        sizeSqm = unit.startsWith('sqft') || unit.includes('square feet')
          ? Math.round(rawSize * 0.092903)
          : Math.round(rawSize);
      }

      // Beds: "1 Queen Bed, 1 Sofa Bed" — comma-joined so the row chip can
      // truncate politely with CSS.
      const bedEntries: string[] = [];
      for (const b of r.bedTypes || r.beds || []) {
        if (!b) continue;
        if (typeof b === 'string') { bedEntries.push(b); continue; }
        const qty = typeof b.quantity === 'number' && b.quantity > 0 ? b.quantity : 1;
        const name = b.name || '';
        if (!name) continue;
        bedEntries.push(qty > 1 ? `${qty} ${name}s` : `${qty} ${name}`);
      }
      const beds = bedEntries.length > 0 ? bedEntries.join(', ') : null;

      const maxOcc = r.maxOccupancy
        ?? (typeof r.maxAdults === 'number'
          ? r.maxAdults + (typeof r.maxChildren === 'number' ? r.maxChildren : 0)
          : null);

      const roomDesc = typeof r.description === 'string'
        ? r.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || null
        : (typeof r.roomDescription === 'string' ? r.roomDescription.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || null : null);

      rooms.push({
        id: String(r.id ?? r.roomTypeId ?? dedupeKey),
        name: cleaned,
        description: roomDesc,
        photos: roomPhotos,
        amenities: roomAmenities,
        maxOccupancy: typeof maxOcc === 'number' && maxOcc > 0 ? maxOcc : null,
        sizeSqm,
        beds,
      });
    }

    // v2-plan step-1: LiteAPI returns `checkin_start` (e.g. "03:00 PM") —
    // the `checkin` key we used to read never existed. Fall back to the
    // legacy name in case a future supplier ever emits it.
    const ciTimes = h.checkinCheckoutTimes || {};
    const checkInTime = ciTimes.checkin_start || ciTimes.checkin || null;
    const checkOutTime = ciTimes.checkout || null;

    // v2-plan step-1: normalise LiteAPI policies[] to our HotelPolicy shape.
    // `policy_type` looks like `POLICY_HOTEL_INTERNET` / `POLICY_HOTEL_PARKING`
    // / `POLICY_HOTEL_PETS` / `POLICY_CHILDREN` / `POLICY_HOTEL_GROUPS`. We
    // keep the raw `name` the supplier sent (already humane) and strip HTML
    // from the description for safe rendering.
    const policies: HotelPolicy[] = [];
    for (const p of h.policies || []) {
      if (!p) continue;
      const raw = (p.policy_type || '').toUpperCase();
      let kind: HotelPolicy['kind'] = 'other';
      if (raw.includes('INTERNET') || raw.includes('WIFI')) kind = 'internet';
      else if (raw.includes('PARKING')) kind = 'parking';
      else if (raw.includes('PET')) kind = 'pets';
      else if (raw.includes('CHILD') || raw.includes('KID')) kind = 'children';
      else if (raw.includes('GROUP')) kind = 'groups';
      const name = (p.name || '').toString().trim();
      const description = (p.description || '')
        .toString()
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (!name && !description) continue;
      policies.push({ kind, name: name || 'Policy', description });
    }

    return {
      id: h.id || hotelId,
      name: h.name || hotelId,
      description,
      address: h.address || null,
      city: h.city || null,
      country: h.country || null,
      stars: h.starRating ?? h.stars ?? h.rating ?? null,
      latitude: h.latitude ?? null,
      longitude: h.longitude ?? null,
      mainPhoto: h.main_photo || h.thumbnail || photos[0] || null,
      photos,
      amenities,
      checkInTime,
      checkOutTime,
      policies,
      rooms,
      reviews,
    };
  } catch (err) {
    console.warn('[liteapi] getHotelDetails failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * BACKLOG B2 (2026-04-21): fetch aggregate score + most-recent reviews for a
 * hotel from LiteAPI `/data/reviews`. Non-fatal: on any failure / empty
 * response we return a zeroed object so the detail page can render a
 * "No reviews yet" state instead of hiding the section.
 *
 * We defend against two plausible shapes LiteAPI have shipped in past
 * versions — `{ data: [...] }` and `{ reviews: [...] }` — and against
 * missing `averageScore` by falling back to a mean of per-review scores.
 */
export async function getHotelReviews(
  hotelId: string,
  limit: number = 8,
): Promise<HotelReviews> {
  if (!hotelId) return { averageScore: null, count: 0, list: [] };
  try {
    type RawRev = {
      averageScore?: number;
      country?: string;
      type?: string;
      name?: string;
      date?: string;
      headline?: string;
      language?: string;
      pros?: string;
      cons?: string;
    };
    const data = await liteFetch<{
      data?: RawRev[];
      reviews?: RawRev[];
      total?: number;
      averageScore?: number;
    }>(
      `/data/reviews?hotelId=${encodeURIComponent(hotelId)}&limit=${Math.max(1, Math.min(30, limit))}&timeout=5`,
      { method: 'GET' },
      8_000,
    );
    const raw = Array.isArray(data.data)
      ? data.data
      : Array.isArray(data.reviews)
        ? data.reviews
        : [];
    const clean = (v: unknown): string | null => {
      if (typeof v !== 'string') return null;
      const t = v.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      return t || null;
    };
    const list: HotelReview[] = raw
      .filter((r): r is RawRev => !!r && typeof r === 'object')
      .map((r) => ({
        name: clean(r.name) || 'Anonymous',
        country: clean(r.country),
        type: clean(r.type),
        date: clean(r.date),
        language: r.language ? String(r.language).trim().toLowerCase() || null : null,
        headline: clean(r.headline),
        pros: clean(r.pros),
        cons: clean(r.cons),
        score: typeof r.averageScore === 'number' && Number.isFinite(r.averageScore)
          ? r.averageScore
          : null,
      }));

    const perRev = list
      .map((r) => r.score)
      .filter((s): s is number => typeof s === 'number');
    const avg =
      typeof data.averageScore === 'number' && Number.isFinite(data.averageScore)
        ? data.averageScore
        : perRev.length > 0
          ? perRev.reduce((a, b) => a + b, 0) / perRev.length
          : null;

    return {
      averageScore: avg !== null ? Math.round(avg * 10) / 10 : null,
      count:
        typeof data.total === 'number' && Number.isFinite(data.total) && data.total > 0
          ? data.total
          : list.length,
      list,
    };
  } catch (err) {
    // Silent fail — reviews are nice-to-have, the main hotel fetch owns
    // the error UX.
    console.warn('[liteapi] getHotelReviews failed:', err instanceof Error ? err.message : err);
    return { averageScore: null, count: 0, list: [] };
  }
}

/* ───────────────────────────────────────────────────────────────────────── */
/*  PREBOOK — Payment SDK flow                                               */
/* ───────────────────────────────────────────────────────────────────────── */

export interface PrebookResult {
  prebookId: string;
  secretKey: string;
  transactionId: string;
  price: number;
  currency: string;
  checkin: string;
  checkout: string;
  /** 0 = same price; >0 = rate went up by this % since search */
  priceDifferencePercent: number;
  /** true if cancellation policy changed since search */
  cancellationChanged: boolean;
  /** true if board/meal plan changed since search */
  boardChanged: boolean;
}

/**
 * Prebook with LiteAPI Payment SDK enabled. Returns the secretKey and
 * transactionId needed to render LiteAPI's embedded payment form on the
 * client. The customer pays LiteAPI directly — we never touch their card.
 */
export async function prebookWithPaymentSdk(offerId: string): Promise<PrebookResult> {
  if (!offerId) throw new Error('offerId is required');

  // LiteAPI prebook with Payment SDK can take 25-40s — use a generous timeout
  const prebook = await liteFetch<{
    data: {
      prebookId: string;
      offerId: string;
      price: number;
      currency: string;
      secretKey?: string;
      transactionId?: string;
      checkin: string;
      checkout: string;
      priceDifferencePercent?: number;
      cancellationChanged?: boolean;
      boardChanged?: boolean;
    };
  }>('/rates/prebook', {
    method: 'POST',
    body: JSON.stringify({ offerId, usePaymentSdk: true }),
  }, 50_000); // 50s timeout — Payment SDK prebook is slow

  const d = prebook.data;
  if (!d?.prebookId) throw new Error('LiteAPI prebook did not return a prebookId');
  if (!d.secretKey || !d.transactionId) {
    throw new Error('LiteAPI prebook did not return Payment SDK credentials (secretKey/transactionId)');
  }

  return {
    prebookId: d.prebookId,
    secretKey: d.secretKey,
    transactionId: d.transactionId,
    price: d.price,
    currency: d.currency,
    checkin: d.checkin,
    checkout: d.checkout,
    priceDifferencePercent: d.priceDifferencePercent ?? 0,
    cancellationChanged: d.cancellationChanged ?? false,
    boardChanged: d.boardChanged ?? false,
  };
}

/* ───────────────────────────────────────────────────────────────────────── */
/*  BOOKING — bookWithTransactionId (Payment SDK)                            */
/* ───────────────────────────────────────────────────────────────────────── */

/**
 * Confirm a booking after the customer has paid via the LiteAPI Payment SDK.
 * Uses the TRANSACTION_ID payment method with the transactionId from prebook.
 */
export async function bookWithTransactionId(params: {
  prebookId: string;
  transactionId: string;
  guest: Guest;
  clientReference?: string;
  /** Scout Special Requests — forwarded to LiteAPI as `remarks`. The hotel
   *  sees this as a free-text note ("early arrival", "extra pillows").
   *  LiteAPI accepts up to 500 chars; we pre-trim upstream. */
  specialRequests?: string | null;
}): Promise<BookingResult> {
  const { prebookId, transactionId, guest, clientReference, specialRequests } = params;

  if (!prebookId) throw new Error('prebookId is required');
  if (!transactionId) throw new Error('transactionId is required');
  if (!guest?.firstName || !guest?.lastName || !guest?.email) {
    throw new Error('guest.firstName, lastName and email are required');
  }

  const bookBody = {
    prebookId,
    ...(clientReference ? { clientReference } : {}),
    ...(specialRequests ? { remarks: String(specialRequests).slice(0, 500) } : {}),
    holder: {
      firstName: guest.firstName,
      lastName: guest.lastName,
      email: guest.email,
    },
    guests: [
      {
        occupancyNumber: 1,
        firstName: guest.firstName,
        lastName: guest.lastName,
        email: guest.email,
        nationality: guest.nationality || 'GB',
        ...(guest.phone ? { phone: guest.phone } : {}),
      },
    ],
    payment: { method: 'TRANSACTION_ID', transactionId },
  };

  const booking = await liteFetch<{
    data: {
      bookingId: string;
      status: string;
      supplierBookingId?: string;
      hotelConfirmationCode?: string;
      currency?: string;
      price?: number;
      checkin: string;
      checkout: string;
      hotel?: { name?: string };
    };
  }>('/rates/book', {
    method: 'POST',
    body: JSON.stringify(bookBody),
  }, 50_000); // 50s timeout — book can be slow

  const b = booking.data;
  return {
    bookingId: b.bookingId,
    status: b.status,
    supplierReference: b.supplierBookingId ?? null,
    hotelConfirmationCode: b.hotelConfirmationCode ?? null,
    currency: b.currency || 'GBP',
    totalPrice: b.price ?? 0,
    checkIn: b.checkin,
    checkOut: b.checkout,
    raw: b,
  };
}

/* ───────────────────────────────────────────────────────────────────────── */
/*  BOOKING — retrieve (supplier side of truth)                              */
/* ───────────────────────────────────────────────────────────────────────── */

export interface SupplierBookingSnapshot {
  ok: boolean;
  httpStatus: number;
  status: string | null;
  hotelConfirmationCode: string | null;
  checkin: string | null;
  checkout: string | null;
  price: number | null;
  currency: string | null;
  guestName: string | null;
  raw: unknown;
  error?: string;
}

/**
 * Retrieve a single booking from LiteAPI by its booking id. Used for
 * reconciliation — we call this for every supplierRef we have on record
 * so we can confirm what LiteAPI actually holds against our account.
 */
export async function getBookingFromSupplier(
  bookingId: string,
): Promise<SupplierBookingSnapshot> {
  const empty: SupplierBookingSnapshot = {
    ok: false,
    httpStatus: 0,
    status: null,
    hotelConfirmationCode: null,
    checkin: null,
    checkout: null,
    price: null,
    currency: null,
    guestName: null,
    raw: null,
  };
  if (!bookingId) return { ...empty, error: 'bookingId required' };
  try {
    const res = await fetch(
      `${baseUrl()}/bookings/${encodeURIComponent(bookingId)}`,
      {
        method: 'GET',
        headers: { 'X-API-Key': apiKey(), Accept: 'application/json' },
        cache: 'no-store',
      },
    );
    const text = await res.text().catch(() => '');
    let body: any = null;
    try { body = text ? JSON.parse(text) : null; } catch { /* noop */ }

    if (!res.ok) {
      return {
        ...empty,
        httpStatus: res.status,
        raw: body || text,
        error: `LiteAPI ${res.status}: ${text.slice(0, 300)}`,
      };
    }
    const data = body?.data ?? body ?? {};
    const guest = data.holder || data.guest || data.holderName || {};
    const guestName =
      [guest.firstName, guest.lastName].filter(Boolean).join(' ') ||
      guest.name ||
      null;
    return {
      ok: true,
      httpStatus: res.status,
      status: data.status ?? null,
      hotelConfirmationCode: data.hotelConfirmationCode ?? data.confirmationCode ?? null,
      checkin: data.checkin ?? null,
      checkout: data.checkout ?? null,
      price: typeof data.price === 'number' ? data.price : null,
      currency: data.currency ?? null,
      guestName,
      raw: body,
    };
  } catch (err) {
    return {
      ...empty,
      error: err instanceof Error ? err.message : 'retrieve failed',
    };
  }
}

/* ───────────────────────────────────────────────────────────────────────── */
/*  BOOKING — cancel                                                         */
/* ───────────────────────────────────────────────────────────────────────── */

export interface CancelResult {
  ok: boolean;
  status: string | null;
  refundAmount: number | null;
  raw: unknown;
  error?: string;
}

/**
 * Cancel an existing LiteAPI booking. Calls PUT /bookings/{id} with a
 * cancellation payload — that's the v3.0 documented pattern.
 *
 * Returns a structured result rather than throwing, so admin callers can
 * still mark the booking as cancelled in our store even if LiteAPI refuses
 * (past deadline, already cancelled, etc.) — the error is captured for
 * display in the admin notes.
 */
export async function cancelBooking(bookingId: string): Promise<CancelResult> {
  if (!bookingId) return { ok: false, status: null, refundAmount: null, raw: null, error: 'bookingId required' };
  try {
    const res = await fetch(`${baseUrl()}/bookings/${encodeURIComponent(bookingId)}`, {
      method: 'PUT',
      headers: {
        'X-API-Key': apiKey(),
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });
    const bodyText = await res.text().catch(() => '');
    let body: any = null;
    try { body = bodyText ? JSON.parse(bodyText) : null; } catch { /* noop */ }

    if (!res.ok) {
      return {
        ok: false,
        status: null,
        refundAmount: null,
        raw: body || bodyText,
        error: `LiteAPI ${res.status}: ${bodyText.slice(0, 300)}`,
      };
    }

    const data = body?.data ?? body ?? {};
    return {
      ok: true,
      status: data.status ?? 'cancelled',
      refundAmount: typeof data.refundAmount === 'number' ? data.refundAmount : null,
      raw: body,
    };
  } catch (err) {
    return {
      ok: false,
      status: null,
      refundAmount: null,
      raw: null,
      error: err instanceof Error ? err.message : 'cancel failed',
    };
  }
}

/* ───────────────────────────────────────────────────────────────────────── */
/*  BOOKING — completeBooking (legacy Stripe/ACC_CREDIT_CARD flow)           */
/* ───────────────────────────────────────────────────────────────────────── */

/**
 * Legacy booking flow using ACC_CREDIT_CARD. Kept for backward compatibility
 * with any in-flight Stripe bookings. New bookings use the Payment SDK flow
 * (prebookWithPaymentSdk → bookWithTransactionId).
 */
export async function completeBooking(
  params: CompleteBookingParams,
): Promise<BookingResult> {
  const { offerId, guest, stripePaymentIntentId } = params;

  if (!offerId) throw new Error('offerId is required');
  if (!guest?.firstName || !guest?.lastName || !guest?.email) {
    throw new Error('guest.firstName, lastName and email are required');
  }

  const prebook = await liteFetch<{
    data: {
      prebookId: string;
      offerId: string;
      price: number;
      currency: string;
      cancellationPolicies?: unknown;
      checkin: string;
      checkout: string;
    };
  }>('/rates/prebook', {
    method: 'POST',
    body: JSON.stringify({ offerId, usePaymentSdk: false }),
  });

  const prebookData = prebook.data;
  if (!prebookData?.prebookId) {
    throw new Error('LiteAPI prebook did not return a prebookId');
  }

  const bookBody = {
    prebookId: prebookData.prebookId,
    ...(stripePaymentIntentId ? { clientReference: stripePaymentIntentId } : {}),
    holder: {
      firstName: guest.firstName,
      lastName: guest.lastName,
      email: guest.email,
    },
    guests: [
      {
        occupancyNumber: 1,
        firstName: guest.firstName,
        lastName: guest.lastName,
        email: guest.email,
        nationality: guest.nationality || 'GB',
        ...(guest.phone ? { phone: guest.phone } : {}),
      },
    ],
    payment: { method: 'ACC_CREDIT_CARD' },
  };

  const booking = await liteFetch<{
    data: {
      bookingId: string;
      status: string;
      supplierBookingId?: string;
      hotelConfirmationCode?: string;
      currency?: string;
      price?: number;
      checkin: string;
      checkout: string;
      hotel?: { name?: string };
    };
  }>('/rates/book', {
    method: 'POST',
    body: JSON.stringify(bookBody),
  });

  const b = booking.data;
  return {
    bookingId: b.bookingId,
    status: b.status,
    supplierReference: b.supplierBookingId ?? null,
    hotelConfirmationCode: b.hotelConfirmationCode ?? null,
    currency: b.currency || prebookData.currency,
    totalPrice: b.price ?? prebookData.price,
    checkIn: b.checkin,
    checkOut: b.checkout,
    raw: b,
  };
}
