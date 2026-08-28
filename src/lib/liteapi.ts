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
import { kv } from '@vercel/kv';

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

/**
 * Search LiteAPI by a BARE hotel name scoped to an explicit ISO-2 country code.
 *
 * Unlike searchHotelsByName (which stuffs the whole free-text query into
 * `name=` and auto-detects the country from a city token), this takes the
 * name and country separately. Use it when you already KNOW the country
 * (e.g. a curated hotel list) — LiteAPI's `/data/hotels` rejects a name-only
 * call with HTTP 400 ("must search by country code, lat/lng, placeId…"), and
 * its name search returns 0 hits when the city is appended to the name
 * (e.g. "Faena Hotel Miami Beach Miami"). Pass just the hotel name + country.
 */
export async function searchHotelByNameInCountry(
  name: string,
  countryCode: string,
  limit = 5,
): Promise<HotelByName[]> {
  if (!name || name.length < 3 || !countryCode) return [];
  try {
    const data = await liteFetch<{ data: HotelByName[] }>(
      `/data/hotels?name=${encodeURIComponent(name)}&countryCode=${encodeURIComponent(countryCode)}&limit=${limit}`,
      { method: 'GET' },
      6_000,
    );
    return data.data || [];
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'name+country search failed';
    console.warn('[liteapi:searchHotelByNameInCountry]', message);
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
  /**
   * Optional WGS84 coordinates + radius for lat/lng-based search. When set
   * (and no destinationId is provided) we hit /data/hotels with
   * latitude/longitude/distance instead of cityName+countryCode — gives
   * us actual local inventory for small towns where the city-name path
   * aliases up to a metro and returns the wrong neighbourhoods (Coulsdon
   * → London → all of Zone 1-3 instead of South-London proper).
   * 2026-05-03 added after Coulsdon search returned Maida Vale + Wembley.
   */
  latitude?: number;
  longitude?: number;
  /** Search radius in km for lat/lng search. Default 15. */
  distanceKm?: number;
  checkIn: string;   // YYYY-MM-DD
  checkOut: string;  // YYYY-MM-DD
  occupancy: Occupancy[];
  currency?: string;        // default GBP
  guestNationality?: string; // default GB (ISO-3166 alpha-2)
  limit?: number;           // max hotels to fetch rates for (default 25)
  /**
   * Pagination offset into the /data/hotels list (default 0). Lets the
   * caller page BEYOND the first `limit` hotels — the cheapest family-room
   * properties for big cities (e.g. Rome's White Vatican quintuple at £85)
   * sit well past position 500 in LiteAPI's default order, so a single
   * capped fetch can never reach them. The route pages through with
   * offset = page × limit and prices each page (2026-07-27).
   */
  offset?: number;
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
  /**
   * Telemetry hook fired once, right after the /hotels/rates step, reporting how
   * many rate chunks were fetched and how many FAILED (upstream timeout / non-2xx).
   *
   * A failed chunk means the priced result is INCOMPLETE — some hotels never got
   * a rate not because they're sold out but because LiteAPI didn't answer in time.
   * Under an upstream slowdown the head chunks (LiteAPI returns hotels best-first,
   * which for many cities means the pricey flagship properties) can be the only
   * ones that come back — so the customer sees "3 hotels, all expensive". Without
   * this signal the route caches that degraded set for the full 30-min TTL and it
   * keeps showing long after LiteAPI recovers. The route uses this to cache a
   * degraded search only briefly so it self-heals on the next request.
   */
  onRatesQuality?: (q: { chunksTotal: number; chunksFailed: number }) => void;
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

  /* ── Phase-2 sidebar facets (from the /data/hotels directory) ── */
  /** Property-type code (map via LITEAPI_HOTEL_TYPES). */
  hotelTypeId?: number | null;
  /** Brand / chain name ("Not Available" when unbranded). */
  chain?: string | null;
  /** Property facility ids (map via LITEAPI_FACILITIES). */
  facilityIds?: number[];

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
    /** Sleeping capacity this row was priced for — per-rate figure straight
     *  from /hotels/rates (authoritative), summed across rooms on multi-room
     *  quotes so it always describes the WHOLE booking the price covers.
     *  Null when the supplier omitted it (chip falls back to the catalogue). */
    maxOccupancy?: number | null;
    /** Multi-room bundles: the name of EACH room in the quote, in occupancy
     *  order — the bundle title names only one of them, which read as "a room
     *  for 3" priced for 2 rooms. Null on single-room quotes or when any
     *  room's name is missing (no list beats a wrong list). */
    roomBreakdown?: string[] | null;
    /** Sleeping arrangement for this room, as the supplier worded it
     *  ("2 Twin Bunk Beds and 1 Double Bed"). Null when unavailable. */
    bedInfo?: string | null;
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
/** One row of the `/data/hotels` directory — WHICH hotels exist near a
 *  destination, independent of dates. Kept so we can fall back to it when
 *  `/hotels/rates` doesn't echo an expanded `hotel` object (inconsistent in
 *  sandbox — sometimes present, sometimes not). */
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
  // Phase-2 sidebar facets (carried straight from the /data/hotels list row):
  // property-type code, brand/chain name, and the property facility ids.
  hotelTypeId?: number;
  chain?: string;
  facilityIds?: number[];
};

/**
 * Per-rate / per-offer tracing. OFF unless LITEAPI_DEBUG is set.
 *
 * These fired once per RATE — thousands of lines for a single big-city search —
 * and the `[liteapi:offer]` line printed the full ~1.5 KB base64 offerId for
 * every hotel. On Edge, console output is synchronous, so this was burning real
 * request time producing detail nobody reads in production.
 *
 * Measured A/B against prod on identical city+date queries (2026-08-17), with
 * the quiet build running FIRST each time so the comparison is biased against
 * it: median 7.64s -> 6.52s, and an identical hotel count on every single run.
 *
 * The one-line-per-search summary at the end of the fetch stays unconditional —
 * that is the line actually worth having in prod logs. Set LITEAPI_DEBUG=1 to
 * get the per-rate detail back when debugging a pricing question.
 */
const LITEAPI_DEBUG = !!process.env.LITEAPI_DEBUG;

/* ── Directory cache (see the call site in getHotels) ─────────────────────── */

/** Bump on ANY change to the tuple order/meaning below — old entries are
 *  positional and would otherwise be read as the wrong fields. */
// v2 (2026-08-27) — two slots changed meaning: the star slot no longer accepts
// the guest score as a fallback, and the review-score slot now reads LiteAPI's
// actual `rating` field. v1 entries hold an invented star rating and no guest
// score at all, and they live for 24h, so they must not be read back.
// v3 (2026-08-27) — a city-name lookup is now widened by a second pass around
// the city's own centre, so a cached entry holds MORE hotels than before. v2
// entries carry the short list for their full 24h TTL.
// v4 (2026-08-27) — the widen now also applies to cities whose name search
// already filled the fetch limit (Nice, Verona), which v3 skipped. This cache
// is keyed on the QUERY, not the dates, so a v3 entry would keep serving the
// un-widened list for a full 24h no matter which dates were searched — the
// third time today a stale cache has hidden a shipped fix.
// v5 (2026-08-27) — mislabelled supplier records (a Finnish property sold as
// Warsaw, a Brazilian one as Bruges) are now dropped before the directory is
// stored, so a v4 entry would keep serving a bookable wrong-continent hotel
// for its full 24h.
const DIR_CACHE_VERSION = 'v5';

/** How far around a city's own centre the name search is widened. 15 km keeps
 *  the extra properties genuinely "in" the city — the suburb and lakeside
 *  villages a visitor would accept — without drifting into the next city's
 *  results, and it sits well inside the ~80 km band where LiteAPI's radius
 *  search still behaves. */
const CITY_WIDEN_KM = 15;

/** How many extra properties the widen may add beyond the caller's own limit.
 *  Every one is a hotel we then have to price, so this is real upstream load:
 *  150 is roughly a 30% overshoot on a 500-hotel city, which bought Nice its
 *  missing ~34 without a latency change worth measuring. */
const CITY_WIDEN_EXTRA_MAX = 150;

/** How far from a city's own centre a property may sit before we treat the
 *  supplier record as mislabelled rather than merely rural. 250 km is far
 *  beyond any honest "near this city" — a Salzburg chalet 61 km out in the
 *  state of the same name, an island centroid, a mega-region all pass — while
 *  still catching Finland-sold-as-Warsaw (1,040 km) and Brazil-sold-as-Bruges
 *  (9,730 km). Deliberately loose: dropping a real hotel is worse than showing
 *  a distant one, and a tighter number is a separate, careful decision. */
const MAX_CITY_OUTLIER_KM = 250;
/** 3h. Which hotels exist near a place barely changes; this is long enough to
 *  cover a customer trying several date ranges (and coming back later) while
 *  still expiring on its own so the footprint can't creep. */
const DIR_CACHE_TTL = 3 * 60 * 60;
/** Refuse to cache a pathologically large destination. A 500-hotel city
 *  encodes to ~150 KB, so this only ever trips on something abnormal. */
const DIR_CACHE_MAX_BYTES = 1_000_000;

/** Stored positionally rather than as objects: JSON key names were ~70 KB of a
 *  218 KB Valencia entry (500 hotels x 14 keys), so dropping them cuts a third
 *  off every entry for free. Order is load-bearing — see DIR_CACHE_VERSION. */
type DirRow = [
  id: string,
  name: string | undefined,
  address: string | undefined,
  city: string | undefined,
  country: string | undefined,
  starRating: number | undefined,
  reviewCount: number | undefined,
  reviewScore: number | undefined,
  mainPhoto: string | undefined,
  latitude: number | undefined,
  longitude: number | undefined,
  hotelTypeId: number | undefined,
  chain: string | undefined,
  facilityIds: number[] | undefined,
];

/** Collapse LiteAPI's alias fields to one canonical each on the way in, so the
 *  cached row is smaller AND the read path stays identical (the `??` chains at
 *  the offer-building site simply hit their first branch). `hotelImages` is
 *  folded into main_photo — only its first entry was ever used. */
function encodeDirRow(h: HotelMeta): DirRow {
  const firstImage = Array.isArray(h.hotelImages) && h.hotelImages.length
    ? (typeof h.hotelImages[0] === 'string'
        ? (h.hotelImages[0] as string)
        : (h.hotelImages[0] as { url?: string }).url)
    : undefined;
  return [
    h.id,
    h.name,
    h.address,
    h.city,
    h.country,
    // 🔴 `rating` is the 0-10 GUEST SCORE, never a star rating. Verified live
    // 2026-08-27 on /data/hotels: rows carry `stars: 4` and `rating: 9.2` side
    // by side, and `starRating`/`reviewScore` are absent entirely. Falling
    // through to `rating` here handed a 9.2 to anything with no star
    // classification — five gold stars on a campsite, on the page with the Pay
    // button, and the same number sent to Google as "9.2 out of a best of 5".
    h.starRating ?? h.stars,
    h.reviewCount ?? h.numReviews ?? h.reviewsCount,
    // …and the same confusion in reverse cost us the guest score altogether:
    // none of these three aliases exist on /data/hotels, so every cached row
    // stored `undefined` and the score simply vanished the moment the 24h
    // directory cache went warm. Measured: Ostrava cold 45/45 hotels scored,
    // five seconds later warm 0/51; Rome 0/412; Barcelona 0/441. That killed
    // the score chip, the "Wonderful 9+ / Very good 8+" filter and part of the
    // recommended ranking on every busy city — silently, because a missing
    // score renders as nothing rather than as an error.
    h.reviewScore ?? h.averageRating ?? h.guestRating ?? h.rating,
    h.main_photo || firstImage,
    h.latitude,
    h.longitude,
    h.hotelTypeId,
    h.chain,
    h.facilityIds,
  ];
}

function decodeDirRow(r: DirRow): HotelMeta {
  return {
    id: r[0],
    name: r[1],
    address: r[2],
    city: r[3],
    country: r[4],
    starRating: r[5],
    reviewCount: r[6],
    reviewScore: r[7],
    main_photo: r[8],
    latitude: r[9],
    longitude: r[10],
    hotelTypeId: r[11],
    chain: r[12],
    facilityIds: r[13],
  };
}

export async function getHotels(params: GetHotelsParams): Promise<HotelOffer[]> {
  const {
    destinationId,
    cityName,
    countryCode,
    latitude,
    longitude,
    distanceKm,
    checkIn,
    checkOut,
    occupancy,
    currency = 'GBP',
    guestNationality = 'GB',
    limit = 25,
    offset = 0,
    starRatings,
    onRatesQuality,
  } = params;

  const hasLatLng =
    typeof latitude === 'number' && Number.isFinite(latitude) &&
    typeof longitude === 'number' && Number.isFinite(longitude);

  if (!destinationId && !hasLatLng && !(cityName && countryCode)) {
    throw new Error('destinationId, latitude+longitude, or cityName+countryCode is required');
  }
  if (!checkIn || !checkOut) throw new Error('checkIn and checkOut are required');
  if (!occupancy?.length) throw new Error('occupancy is required');

  // 1. Resolve hotelIds — and keep a directory of hotel metadata so we can
  // fall back to it when /hotels/rates doesn't echo an expanded `hotel` object
  // (which is inconsistent in sandbox — sometimes present, sometimes not).
  let hotelIds: string[];
  const hotelDirectory = new Map<string, HotelMeta>();
  if (destinationId && destinationId.includes(',')) {
    // Caller passed a CSV of hotel ids directly
    hotelIds = destinationId.split(',').map((s) => s.trim()).filter(Boolean);
  } else {
    // Look up hotels by placeId, lat/lng, OR cityName+countryCode (in that
    // priority order — lat/lng takes precedence when both are set because
    // it's strictly more accurate for small-town searches).
    const listQuery = new URLSearchParams({ limit: String(limit) });
    if (offset > 0) listQuery.set('offset', String(offset));
    if (destinationId) {
      listQuery.set('placeId', destinationId);
    } else if (hasLatLng) {
      listQuery.set('latitude', String(latitude));
      listQuery.set('longitude', String(longitude));
      listQuery.set('distance', String(distanceKm ?? 15));
      // countryCode helps LiteAPI scope correctly even on lat/lng search
      // — without it some property records can leak from neighbouring
      // tenants (rare but cheap to add).
      if (countryCode) listQuery.set('countryCode', countryCode);
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
    // ── Directory cache ────────────────────────────────────────────────────
    // `/data/hotels` is WHICH hotels exist near a destination — it does not
    // depend on the stay dates or the occupancy, so the same 900 KB response
    // is re-fetched for every date the customer tries. Measured on prod:
    // 0.65s of a ~6.9s cold search, on the critical path, every time.
    //
    // Cached for offset 0 ONLY. Pages 1-6 are fetched by the client in the
    // background where nobody is waiting on 0.65s, and caching all seven
    // pages would put ~1.5 MB per city into KV instead of ~150 KB. KV is
    // load-bearing here (it also holds bookings and the bug inbox) and this
    // cache is worth exactly one entry per destination.
    const dirKey =
      offset === 0 ? `hotels:dir:${DIR_CACHE_VERSION}:${listQuery.toString()}` : null;
    let rows: HotelMeta[] | null = null;
    if (dirKey) {
      try {
        const cached = await kv.get<DirRow[]>(dirKey);
        if (Array.isArray(cached) && cached.length > 0) rows = cached.map(decodeDirRow);
      } catch { /* miss or KV hiccup — fall through to the live call */ }
    }
    if (!rows) {
      const list = await liteFetch<{ data: HotelMeta[] }>(
        `/data/hotels?${listQuery.toString()}`,
        { method: 'GET' },
      );
      rows = (list.data || []).slice(0, limit);

      /* ── The city-NAME blind spot ────────────────────────────────────────
         Asking LiteAPI for "hotels in Chambéry" returns only properties whose
         own `city` field says Chambéry. A hotel three miles away in Challes-
         les-Eaux, La Féclaz or Voglans — somewhere any visitor would happily
         stay, and which every rival shows — carries a different town name and
         is invisible to us.

         Measured 2026-08-27, 28-29 Sep, 2 adults, bookable hotels, name path
         vs the same city searched by coordinates:
           Chambéry 21 -> 43   Annecy 53 -> 76    Dijon    74 -> 100
           Grenoble 39 -> 69   Nice  170 -> 204   Verona  139 -> 185
           Salzburg 108 -> 138 Como   68 -> 82    Bath     68 -> 82
           York     84 -> 92   Bruges 122 -> 127  Seville 232 -> 242
         Twelve cities tested, twelve short — every city search on the site was
         under-reporting its own inventory.

         So a name search is widened by a second pass around the city's own
         centre. The centre is the MEDIAN of the coordinates the name search
         just returned — no hand-maintained table to drift, and it re-derives
         itself for every city. Median rather than mean so one mis-geocoded
         property in another country cannot drag the centre off the city
         (the same-name-town trap that once sent Newcastle to Northern
         Ireland).

         Failure here is never fatal: the widen is best-effort and the name
         results stand on their own if it throws. */
      const usedNamePath = !destinationId && !hasLatLng && !!cityName;
      if (usedNamePath && rows.length >= 3) {
        try {
          const lats = rows.map((h) => h.latitude).filter((n): n is number => typeof n === 'number').sort((a, b) => a - b);
          const lngs = rows.map((h) => h.longitude).filter((n): n is number => typeof n === 'number').sort((a, b) => a - b);
          if (lats.length >= 3 && lngs.length >= 3) {
            const mid = (arr: number[]) => arr[Math.floor(arr.length / 2)];
            const wideQuery = new URLSearchParams({
              limit: String(limit),
              latitude: String(mid(lats)),
              longitude: String(mid(lngs)),
              distance: String(CITY_WIDEN_KM),
            });
            if (countryCode) wideQuery.set('countryCode', countryCode);
            if (starRatings && starRatings.length > 0) wideQuery.set('starRating', starRatings.join(','));
            const wide = await liteFetch<{ data: HotelMeta[] }>(
              `/data/hotels?${wideQuery.toString()}`,
              { method: 'GET' },
            );
            // A big city's name search FILLS `limit` on its own, and an
            // earlier cut skipped the widen in exactly that case — so Nice
            // gained nothing (170 -> 170) while Chambéry doubled. The
            // surrounding towns a large city hides are the ones no amount of
            // paging reaches, because every page repeats the same cityName
            // query. So the merged list is allowed a bounded overshoot rather
            // than being capped at the name result's own ceiling.
            const ceiling = Math.max(limit, rows.length) + CITY_WIDEN_EXTRA_MAX;
            const seenId = new Set(rows.map((h) => h.id));
            for (const h of wide.data || []) {
              if (rows.length >= ceiling) break;
              if (h?.id && !seenId.has(h.id)) {
                seenId.add(h.id);
                rows.push(h);
              }
            }
          }
        } catch {
          /* widen is a bonus, never a dependency — keep the name results */
        }

        /* 🔴 THE WRONG-CONTINENT GUARD.
           Some supplier records are simply mislabelled: a property in
           Sastamala, FINLAND carries city "Warsaw", and one in São Paulo
           state, BRAZIL carries city "Bruges" with country "be". A cityName
           search hands those straight to the customer, and they are fully
           bookable — measured 2026-08-27, "Villa Breikki, Sastamala" sold in a
           Warsaw search at GBP 85.63/night, 1,040 km from Warsaw, reproduced
           on 2 of 18 city+date combinations. That is the one defect class
           where the customer pays and the trip does not exist.
           There was a distance guard already, but it only covered cities
           listed in a 95-entry table — Warsaw, Bruges, Prague, Vienna and
           Seville were not in it, so those searches had no guard at all.
           The median centre computed just above gives every city one for
           free, with no table to maintain.
           The threshold is deliberately loose: this is a wrong-CONTINENT
           filter, not a tidy-up. Legitimate spread — a Salzburg chalet 61 km
           out in the state of the same name, an island centroid, a mega-region
           — must survive untouched, so only the absurd is dropped. */
        try {
          const lats2 = rows.map((h) => h.latitude).filter((n): n is number => typeof n === 'number').sort((a, b) => a - b);
          const lngs2 = rows.map((h) => h.longitude).filter((n): n is number => typeof n === 'number').sort((a, b) => a - b);
          if (lats2.length >= 5 && lngs2.length >= 5) {
            const cLat = lats2[Math.floor(lats2.length / 2)];
            const cLng = lngs2[Math.floor(lngs2.length / 2)];
            const before = rows.length;
            rows = rows.filter((h) => {
              // A row with no coordinates cannot be judged — keep it.
              if (typeof h.latitude !== 'number' || typeof h.longitude !== 'number') return true;
              const dLat = (h.latitude - cLat) * 111;
              const dLng = (h.longitude - cLng) * 111 * Math.cos((cLat * Math.PI) / 180);
              const km = Math.sqrt(dLat * dLat + dLng * dLng);
              if (km > MAX_CITY_OUTLIER_KM) {
                console.warn(
                  `[liteapi:outlier] dropped ${h.id} "${h.name}" — ${Math.round(km)}km from the centre of ${cityName}, supplier record is mislabelled`,
                );
                return false;
              }
              return true;
            });
            if (rows.length !== before) {
              hotelDirectory.clear();
              for (const row of rows) if (row?.id) hotelDirectory.set(row.id, row);
            }
          }
        } catch {
          /* the guard must never be the reason a search fails */
        }
      }

      if (dirKey && rows.length > 0) {
        const encoded = rows.map(encodeDirRow);
        // Guard against a pathological destination bloating KV. Upstash also
        // rejects oversized requests outright, which would just throw.
        if (JSON.stringify(encoded).length <= DIR_CACHE_MAX_BYTES) {
          // Deliberately not awaited: the rates fetch below runs for seconds,
          // so this lands long before the response, and a slow cache write
          // must never be something the customer waits on. Errors swallowed —
          // the cache is an optimisation, never a correctness dependency.
          kv.set(dirKey, encoded, { ex: DIR_CACHE_TTL }).catch(() => {});
        }
      }
    }
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
      /** `description` names the tax ("City tax", "VAT", "Tax and Other Fee").
       *  It is load-bearing, not cosmetic: it is half of the identity
       *  rateExcludedTax() uses to tell a mirrored duplicate apart from a
       *  second, genuinely different tax that costs the same. */
      taxesAndFees?: Array<{ amount: number; currency: string; included?: boolean; description?: string }>;
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
    /** Per-rate occupancy — what THIS rate was priced for (verified live
     *  2026-08-24 on lp6870b + lp42761: every rate carries these). This is
     *  the AUTHORITATIVE "sleeps N" for the row — unlike the /data/hotel
     *  catalogue figure, which is a category ceiling joined by name-matching.
     *  On multi-room quotes `occupancyNumber` says WHICH requested room this
     *  rate belongs to (1-based), and `maxOccupancy` describes that one room. */
    occupancyNumber?: number;
    maxOccupancy?: number;
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
    if (!s) return null;
    // Long names used to be DROPPED entirely (return null) — the row title then
    // fell back to the board label, so the customer saw "Room Only" where the
    // room name belonged. Apartment listings routinely exceed old the 120-char
    // cap ("NYE apart S SIRO stadium Milan FIERA city Life …"), which is
    // exactly the property class where the name carries the bedroom info a
    // family needs. Truncate instead of discarding.
    if (s.length > 90) s = s.slice(0, 87).trimEnd() + '…';
    return s;
  }

  /** A trailing parenthetical that names BEDS, not a room feature. Deliberately
   *  narrow: only the nouns "bed(s)" and "bunk(s)" qualify. Matching "king" or
   *  "queen" alone would swallow real room names ("Room (Queen Anne Wing)"),
   *  and a wrong strip is worse than a missed one. */
  const BED_NOUNS = /\b(beds?|bunks?)\b/i;

  /**
   * Suppliers routinely sell the SAME room twice: once plainly, and once with
   * the sleeping arrangement appended as a trailing parenthetical. Measured on
   * La Maison Rouge Chambéry (2026-08-27, owner screenshot):
   *
   *   £105.43 Room Only  "Family Cabin (Pets not allowed)"
   *   £105.43 Room Only  "Family Cabin (Pets not allowed)(2 Twin Bunk Beds and 1 Double Bed)"
   *
   * Same price, same board, same tax, same capacity — one room, listed twice,
   * and the pair repeated again on the breakfast rate. Splitting the bed text
   * off lets the row key ignore it (so the twins collapse) AND gives the card
   * the bed line, which is the single fact a family checks before paying.
   * "(Pets not allowed)" must survive as part of the name — hence BED_NOUNS.
   */
  function splitBedSuffix(name: string | null): { name: string | null; beds: string | null } {
    if (!name) return { name, beds: null };
    const m = name.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
    if (!m) return { name, beds: null };
    const inner = m[2].trim();
    if (!BED_NOUNS.test(inner)) return { name, beds: null };
    const head = m[1].trim();
    // The whole name IS the bed description ("(2 Double Beds)") — keep it as
    // the name rather than leaving the row with no title at all.
    if (!head) return { name, beds: null };
    return { name: head, beds: inner };
  }

  /**
   * Property-payable tax on ONE rate — the `taxesAndFees` entries LiteAPI marks
   * `included: false` (city tax, tourist tax, some VAT regimes), which the guest
   * settles at the desk rather than through us.
   *
   * Returns `null`, NOT 0, when the rate carries no breakdown at all (v3.0 flat
   * `retailRate` is a bare number and has nowhere to put taxes). "We don't know"
   * and "there is none" are different answers, and the multi-room sum below has
   * to be able to tell them apart before it decides whether it can trust itself.
   * A rate WITH the object but no excluded entries is a genuine zero.
   *
   * Clamped at 0: `taxesAndFees` has been observed carrying supplier refund
   * deltas as negative entries, which would make the all-in total come out
   * BELOW the sticker price.
   *
   * 🔴 THE SAME TAX CAN APPEAR TWICE IN ONE RATE — ONCE IN EACH BUCKET.
   * Some suppliers emit a tax into BOTH halves of `taxesAndFees`: an
   * `included: true` copy and, alongside it, a byte-identical `included: false`
   * copy. The `included: true` copy is the supplier saying the money is already
   * inside `total`, so charging the mirrored copy on top bills it twice.
   * Measured 2026-08-27, Central Hotel London (lp4f865), 20→22 Sep, 2 adults,
   * Standard Double Room, total £91.79:
   *
   *   {"included": true,  "description": "VAT",      "amount": 8.42}
   *   {"included": true,  "description": "City tax", "amount": 31.30}
   *   {"included": false, "description": "City tax", "amount": 31.30}
   *   {"included": false, "description": "VAT",      "amount": 8.42}
   *
   * — a phantom £39.72 on a £91.79 room (+43%), which since the all-in sort
   * shipped also demotes a competitive room below dearer ones. So cancel each
   * excluded entry against an identical included one, one for one.
   *
   * The identity of ONE tax is description + amount + currency. Anything looser
   * mis-fires on live data (474 London hotels, same day):
   *  · amount alone would merge Comfort Inn Victoria's "TAX" £57.55 and "VAT"
   *    £57.55 — two genuinely different taxes that happen to cost the same
   *    (109 rates), and the guest would meet £57.55 at the desk unwarned.
   *  · description alone would merge Novotel London West's "Tax and Other Fee"
   *    £17.48 and £18.38 — that supplier emits ONE ENTRY PER NIGHT, so a
   *    2-night stay would quote one night's tax (187 rates). Confirmed
   *    per-night, not duplicated: entry count tracks the stay length exactly
   *    (1 night → 1 entry, 3 nights → 3), and across all 474 hotels a
   *    single-night search produced ZERO repeated tuples.
   *
   * One-for-one rather than "drop every excluded copy that has an included
   * twin", so a supplier mixing a real per-night charge with a mirrored one
   * still bills the remainder. Every one of the 157 mirrored rates measured
   * had equal counts on both sides, so today this always cancels cleanly.
   */
  function rateExcludedTax(r: RateObj): number | null {
    if (typeof r.retailRate !== 'object' || !r.retailRate) return null;
    const tf = (r.retailRate as {
      taxesAndFees?: Array<{ amount: number; currency: string; included?: boolean; description?: string }>;
    }).taxesAndFees;
    if (!Array.isArray(tf)) return null;
    // Amount is keyed in integer pence so 31.3 and 31.30 are one tax and float
    // noise can never split a mirrored pair back apart.
    const taxIdentity = (t: { amount?: number; description?: string; currency?: string }) =>
      `${t.description ?? ''}|${Math.round((t.amount || 0) * 100)}|${t.currency ?? ''}`;
    const alreadyInTotal = new Map<string, number>();
    for (const t of tf) {
      if (t.included !== true) continue;
      const k = taxIdentity(t);
      alreadyInTotal.set(k, (alreadyInTotal.get(k) ?? 0) + 1);
    }
    let sum = 0;
    for (const t of tf) {
      if (t.included !== false) continue;
      const k = taxIdentity(t);
      const mirrors = alreadyInTotal.get(k) ?? 0;
      if (mirrors > 0) {
        alreadyInTotal.set(k, mirrors - 1);
        continue;
      }
      sum += t.amount || 0;
    }
    return Math.max(0, sum);
  }

  /**
   * Property-payable tax for the WHOLE quote, keyed off one roomType.
   *
   * A multi-room quote is priced as a bundle: the roomType's `offerRetailRate`
   * covers every room, and its rates carry ONE entry per requested room tagged
   * with `occupancyNumber`. `taxesAndFees`, though, is per-RATE — i.e. per room.
   *
   * We used to read ONE rate's figure and multiply it by the room count. That is
   * only right when the rooms are identical. Measured live 2026-08-27 on Meliá
   * Milano (lp2f87f, 20→22 Sep, 1 adult + 3 adults): room 1 owed £33.10, room 2
   * owed £53.35 — the old rule advertised £66.20 against a real £86.45, so the
   * guest met a £20.25 surprise at the desk. 92 of 200 bundles on that one
   * hotel/date had mismatched rooms; symmetric bundles were exact, which is why
   * this only ever bit MIXED-occupancy parties — the family case.
   *
   * Returns `null` when ANY requested room is missing a figure. Same discipline
   * as rtMaxOcc / rtRoomNames below: a partial sum silently UNDER-states what
   * the guest owes, and under-stating money is the one direction we refuse to
   * be wrong in — the caller falls back to the old multiply instead.
   */
  function bundleExcludedTax(rt: RoomType, roomsRequested: number): number | null {
    if (roomsRequested <= 1) return null;
    const byRoom = new Map<number, number>();
    for (const r of rt.rates || []) {
      const t = rateExcludedTax(r);
      if (t == null) continue;
      const n = r.occupancyNumber ?? 1;
      // Verified live on 2 hotels × 2-room quotes (lp2f87f Milan 200/200
      // roomTypes, lp8d674 Chambéry 160/160): a multi-room roomType carries
      // EXACTLY one rate per requested room. `Math.max` is belt-and-braces for
      // a supplier that ever sends more — never quote the desk short.
      byRoom.set(n, Math.max(byRoom.get(n) ?? 0, t));
    }
    if (byRoom.size !== roomsRequested) return null;
    return [...byRoom.values()].reduce((s, v) => s + v, 0);
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
  // 2026-04-29). Solution: split into batches and fetch them in parallel, so
  // no single call can approach the timeout.
  //
  // GRADUATED SIZES (2026-08-17). Uniform batches of 50 were badly unbalanced.
  // `/data/hotels` returns hotels roughly best-first, and those early hotels
  // carry far more rooms and rate rows than the long tail — so the first batch
  // does several times the pricing work of the last. Measured against live
  // LiteAPI (Valencia, 500 hotels, 3 runs on different dates):
  //
  //   batch #1 5.4s, #2 4.1s, #3 4.2s … #9 2.3s, #10 0.9s
  //
  // and it was the SAME early batch that was slowest on every run — this is
  // workload, not a random straggler, so retrying or hedging it would not have
  // helped. Because Promise.all waits for the slowest, that one fat batch set
  // the wall-clock time of the entire search.
  //
  // Splitting only the heavy head rebalances it. Wall-clock, same runs, and
  // every scheme returned the same ~137 priced hotels — this costs us nothing:
  //
  //   uniform 50 (old)   10 calls   5.25s   ← was setting our floor
  //   uniform 25         20 calls   4.22s
  //   head-200/10        26 calls   3.35s   ← chosen
  //   uniform 10         50 calls   3.21s   (only 0.14s better, 2x the calls)
  //
  // head-200/10 keeps essentially all of the win at half the request count of
  // uniform-10 — 50 concurrent calls per search is a lot of load to put on
  // LiteAPI for 4% more speed.
  const RATES_HEAD_COUNT = 200; // hotels treated as "heavy" (they price slowest)
  const RATES_HEAD_CHUNK = 10;
  const RATES_TAIL_CHUNK = 50;
  const chunks: string[][] = [];
  for (let i = 0; i < hotelIds.length; ) {
    const size = i < RATES_HEAD_COUNT ? RATES_HEAD_CHUNK : RATES_TAIL_CHUNK;
    chunks.push(hotelIds.slice(i, i + size));
    i += size;
  }

  // Count chunks that fail (timeout / non-2xx) so the caller can tell an
  // INCOMPLETE priced set apart from a genuinely-sparse one. A hotel with no
  // rate because it's sold out is normal; a chunk that never answered is not.
  let ratesChunksFailed = 0;
  const chunkResults = await Promise.all(
    chunks.map((chunkIds) =>
      liteFetch<RatesResponse>('/hotels/rates', {
        method: 'POST',
        body: JSON.stringify({ ...ratesBody, hotelIds: chunkIds }),
      }).catch((err: unknown) => {
        // One failed chunk shouldn't kill the whole search — log it and
        // return an empty data array so the other chunks still surface.
        ratesChunksFailed++;
        const message = err instanceof Error ? err.message : 'rates chunk failed';
        console.warn(`[liteapi:rates] chunk of ${chunkIds.length} failed:`, message);
        return { data: [] } as RatesResponse;
      }),
    ),
  );
  if (onRatesQuality) {
    // Best-effort telemetry — must never break the search.
    try { onRatesQuality({ chunksTotal: chunks.length, chunksFailed: ratesChunksFailed }); } catch { /* ignore */ }
  }

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
    // Suite) each get their own row — wholesale-grid layout, Scout's voice.
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
      /** Whole-booking sleeping capacity (per-rate, authoritative). */
      maxOccupancy?: number | null;
      /** Multi-room bundles: what each room actually is, in occupancy order
       *  (["TRIPLE…", "DOUBLE…"]). Null on single-room quotes or when any
       *  room's name is missing. */
      roomBreakdown?: string[] | null;
      /** The sleeping arrangement, split off the room name by splitBedSuffix
       *  ("2 Twin Bunk Beds and 1 Double Bed"). Null when the supplier didn't
       *  put it there — the card then falls back to the room catalogue. */
      bedInfo?: string | null;
    };
    const optionsByKey = new Map<string, OptionRow>();
    // familyKey → the row keys that belong to it (at most two: the locked rate
    // and its free-cancellation twin). The 50-row budget is spent a whole
    // family at a time so a flexible row can never be starved by cheap
    // non-refundable noise — see the admission loop below.
    const familyMembers = new Map<string, Set<string>>();

    for (const rt of entry.roomTypes || []) {
      // Prefer the roomType-level name, fall back to the first rate's name.
      // We clean both so the row title never duplicates the board label.
      const roomTypeName = cleanRoomName(rt.name || rt.roomName);
      // Whole-booking capacity for MULTI-room quotes. A rate's maxOccupancy
      // describes ONE room (verified live: a 2-room split returns rates with
      // occupancyNumber 1 and 2 inside the same roomType, maxOcc 3 and 2).
      // Sum the best per requested room so the chip matches the price beside
      // it, which covers every room. Null when any room's group is missing —
      // no chip beats a wrong chip.
      let rtMaxOcc: number | null = null;
      // Per-room composition of a MULTI-room bundle. LiteAPI titles the whole
      // bundle by ONE room's name while the price covers every room, so a
      // "TRIPLE — room for 3 people" bundle priced for 2 rooms can actually be
      // one Triple + one Double (owner report 2026-08-27, hotelF1 Chambéry:
      // "Side-Car for 2 travelers maximum" badged Sleeps 5). The per-rate
      // `name` keyed by occupancyNumber recovers what each room really is.
      // Same discipline as the capacity sum: emit only when every requested
      // room has a name — a partial list would mislabel the missing room.
      let rtRoomNames: string[] | null = null;
      if (occupancy.length > 1) {
        const byRoom = new Map<number, number>();
        const nameByRoom = new Map<number, string>();
        for (const r of rt.rates || []) {
          const n = r.occupancyNumber ?? 1;
          if (typeof r.maxOccupancy === 'number' && r.maxOccupancy > 0) {
            byRoom.set(n, Math.max(byRoom.get(n) ?? 0, r.maxOccupancy));
          }
          if (!nameByRoom.has(n)) {
            const nm = cleanRoomName(r.name);
            if (nm) nameByRoom.set(n, nm);
          }
        }
        if (byRoom.size === occupancy.length) {
          rtMaxOcc = [...byRoom.values()].reduce((s, v) => s + v, 0);
        }
        if (nameByRoom.size === occupancy.length) {
          rtRoomNames = [...nameByRoom.entries()]
            .sort((a, b) => a[0] - b[0])
            .map(([, v]) => v);
        }
      }
      // Whole-booking property-payable tax for a MULTI-room bundle: one figure
      // per requested room, added up (see bundleExcludedTax). Null on single-room
      // quotes and whenever a room is missing its figure — the rate loop then
      // falls back to the old one-room × room-count multiply.
      const rtExcludedTax = bundleExcludedTax(rt, occupancy.length);
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

        if (LITEAPI_DEBUG) console.log(`[liteapi:rates] hotel=${entry.hotelId} offerId=${rateOfferId?.slice(0,20)} market=${marketPrice} negotiated=${negPrice} effective=${effectivePrice} priceType=${r.priceType}`);

        const board = r.boardName || r.boardType || r.name || 'Room Only';
        // Refundable: v3.0 flat format or old nested format
        const isRefundable = r.cancellationPolicy?.refundable === true
          || r.cancellationPolicies?.refundableTag === 'RFN';

        // Room name: prefer the roomType-level name we grabbed earlier, else
        // fall back to the rate's own `name` (also cleaned). When both are
        // missing we store `null` and let the UI fall back to the board label.
        const roomName = roomTypeName || cleanRoomName(r.name) || null;

        // Split the sleeping arrangement off the room name (see splitBedSuffix)
        // so the key ignores it and the UI can render it as a bed line.
        const nameSplit = splitBedSuffix(roomName);
        const keyName = nameSplit.name;
        const rowBedInfo = nameSplit.beds;

        // Key by (roomName, boardType) — different rooms get different rows,
        // identical combos collapse to the cheapest rate.
        //
        // Suppliers list the SAME physical room with cosmetic name variants —
        // "Break Room for 3 travelers maximum - #ontheroad basics" vs
        // "Break Room For 3 Travelers Maximum-#Ontheroad Basics" (case + dash
        // spacing). A raw-lowercase key kept both, so one room rendered 2-4
        // times at slightly different prices (owner report 2026-08-27,
        // hotelF1 Chambéry). Strip everything but letters/digits (any script)
        // so cosmetic variants share a key and collapse.
        const roomKey = (keyName || '__none__')
          .toLowerCase()
          .replace(/[^\p{L}\p{N}]+/gu, ' ')
          .trim() || '__none__';
        const boardKey = board.toLowerCase();
        // The FAMILY is the thing the guest is choosing between: one physical
        // room on one board, sold twice — cheap and locked, or dearer and
        // cancellable.
        const familyKey = `${roomKey}|${boardKey}`;
        // Refundability belongs IN the key, not in the price race. The flexible
        // twin is dearer in every pair we have ever measured (28 of 28 on
        // 2026-08-27; hotelF1 Chambéry lp8d674 "Tandem Room" £70.41 locked vs
        // £82.84 with free cancellation, same room, same board), so under a
        // cheapest-wins collapse it can NEVER survive: hotelF1 rendered 30 rows
        // with 0 refundable while LiteAPI had 58 refundable rates in the same
        // response, and Generator Barcelona 15 rows with 0 of 48. Free
        // cancellation is not a tie-break on price — for anyone booking around
        // an uncertain plan it is the whole product, and hiding it made the
        // site look like it simply had none.
        // 🔴 BED CONFIGURATION IS PART OF THE ROOM, NOT A COSMETIC VARIANT.
        // The first version of this key stripped the bed suffix outright, which
        // was right for the duplicate it was built for (La Maison Rouge sells
        // "Family Cabin (Pets not allowed)" and "…(2 Twin Bunk Beds and 1
        // Double Bed)" at the SAME price — one room, listed twice) and badly
        // wrong everywhere else. Measured on lp41e71, 20-22 Sep, all at
        // £225.60: "Superior Room", "Superior Room(1 Queen Bed)" and "Superior
        // Room(2 Twin Beds)". Stripping collapsed three offers into one, so a
        // couple who need TWIN beds could no longer see or book them, and the
        // surviving row advertised whichever bed text won the race.
        // So: the bed text stays in the key. The genuine duplicate — the SAME
        // room with and without its bed suffix — is merged afterwards, and only
        // when the prices match to the penny (see the bed-less merge below).
        const bedKey = (rowBedInfo || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
        const mapKey = `${familyKey}|${isRefundable ? 'R' : 'N'}|${bedKey}`;
        const existing = optionsByKey.get(mapKey);
        // Phase-3: per-row Scout Deal. negotiated only counts when strictly
        // cheaper than market — otherwise it's noise, not a deal.
        const hasDeal = negPrice != null && Number.isFinite(marketPrice) && negPrice < marketPrice;
        // Phase-4: per-rate excluded taxes (city tax / VAT / resort fee payable
        // at the property). Same shape as the offer-level sum, computed per rate
        // so the table can show each row's true grand total honestly.
        //
        // `taxesAndFees` carries ONE ENTRY PER TAX TYPE for a SINGLE room, while
        // this row's `totalPrice` covers every room in the quote. Left unscaled,
        // a 2-room stay advertised one room's tax beside a two-room price and a
        // 3-room stay a third of it — so the figure went DOWN as the guest added
        // rooms, which is visibly wrong and under-states what they owe at the
        // desk. Measured on prod (la_lp42761, Milan 23->25 Aug, 2 adults):
        // 1 room £41.62, 2 rooms £12.11, 3 rooms £8.08.
        //
        // Scaling by the room count fixed the single-figure case but assumed
        // every room is taxed the same, which is false the moment the rooms
        // differ — exactly the family split. `rtExcludedTax` sums the real
        // per-room figures; the multiply survives only as the fallback for
        // bundles where a room has no figure to add (see bundleExcludedTax).
        const perRoomRateTaxes = rateExcludedTax(r) ?? 0;
        const rateExcludedTaxes = rtExcludedTax
          ?? (perRoomRateTaxes * Math.max(1, occupancy.length));
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
          maxOccupancy: occupancy.length === 1
            ? (typeof r.maxOccupancy === 'number' && r.maxOccupancy > 0 ? r.maxOccupancy : null)
            : rtMaxOcc,
          roomBreakdown: rtRoomNames,
          bedInfo: rowBedInfo,
        };
        // Collapse by GRAND total (rate + property-payable taxes), not the
        // sticker price: one supplier sells the room at £104.78 all-in while
        // another lists £106.36 + £4.36 at the desk — keeping the lower
        // sticker regardless of tax treatment could keep the row that costs
        // MORE to actually stay.
        const nextGrand = effectivePrice + rateExcludedTaxes;
        const existingGrand = existing
          ? existing.totalPrice + (existing.excludedTaxes ?? 0)
          : Infinity;
        // Whichever twin wins on price, keep the bed text: it is the whole
        // reason the duplicate existed, and losing it would trade a visible
        // duplicate for a silently less informative card.
        const mergedBedInfo = rowBedInfo ?? existing?.bedInfo ?? null;
        if (!existing || nextGrand < existingGrand) {
          optionsByKey.set(mapKey, { ...nextRow, bedInfo: mergedBedInfo });
        } else if (mergedBedInfo && !existing.bedInfo) {
          existing.bedInfo = mergedBedInfo;
        }
        let members = familyMembers.get(familyKey);
        if (!members) { members = new Set<string>(); familyMembers.set(familyKey, members); }
        members.add(mapKey);

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

    // Spend the 50-row budget a WHOLE FAMILY at a time, cheapest family first.
    //
    // Cap raised from 12 → 50 so the search-card "N room types available" chip
    // can count distinct room names accurately. The old cap was producing
    // "12 room types available" on every well-stocked hotel because 4 rooms ×
    // 3 boards = 12 (room×board) combos hit the slice (2026-04-28). The
    // detail-page rates table still scrolls fine at 50 rows.
    //
    // Splitting refundability into its own row roughly doubles the row count,
    // which puts real pressure on that cap for the first time: 37 of 60 Rome
    // properties measured on 2026-08-27 now produce more than 50 rows. A plain
    // cheapest-50 would then have re-created the very defect it was meant to
    // cure — the flexible twin is always the dearer half of its pair, so it
    // sits at the bottom of a price sort and gets sliced off wholesale
    // (lp2f5c7, 20→22 Sep: 104 rows available, 36 of them refundable; a naive
    // cheapest-50 keeps 11 of those 36).
    //
    // Admitting whole families instead makes the guarantee structural rather
    // than statistical: if a room+board is shown at all, BOTH of its prices are
    // shown, so the guest always sees what flexibility costs on the rooms they
    // can actually see. Same hotel, family-whole: 18 refundable rows. Measured
    // across four Rome properties, family-whole beat naive cheapest-50 on
    // refundable coverage every time (18/11, 16/9, 19/14, 24/21).
    //
    // Families are ranked on GRAND total (rate + property-payable tax), the
    // same all-in measure the collapse above uses — the cheapest STAY, not the
    // cheapest sticker. We stop at the first family that will not fit rather
    // than skipping ahead to a smaller one: letting a dearer family jump a
    // cheaper one to fill the last slot would break cheapest-first for the sake
    // of a single row. Families hold at most two rows, so at worst one slot of
    // the fifty goes unused.
    const grandOf = (o: OptionRow) => o.totalPrice + (o.excludedTaxes ?? 0);
    const rankedFamilies = [...familyMembers.entries()]
      .map(([, keys]) => {
        let rows = [...keys]
          .map((k) => optionsByKey.get(k))
          .filter((o): o is OptionRow => !!o);
        // THE GENUINE DUPLICATE, and only it: the same room, board and
        // refundability offered both WITHOUT a bed description and WITH one, at
        // the same price to the penny. That is one room listed twice (La Maison
        // Rouge: "Family Cabin (Pets not allowed)" and "…(2 Twin Bunk Beds and 1
        // Double Bed)", both £107.31, repeated across every rate plan). Drop the
        // description-less copy and keep the informative one.
        //
        // Crucially this does NOT touch two DIFFERENT bed descriptions at the
        // same price — "Superior Room(1 Queen Bed)" and "Superior Room(2 Twin
        // Beds)" are different rooms to anyone who has to sleep in them, and
        // both stay on sale.
        const described = rows.filter((o) => o.bedInfo);
        if (described.length > 0) {
          rows = rows.filter(
            (o) => o.bedInfo || !described.some((d) => Math.abs(d.totalPrice - o.totalPrice) < 0.01
              && d.refundable === o.refundable),
          );
        }
        // 🔴 BED TEXT IS NEVER BORROWED FROM A SIBLING RATE.
        // A row used to inherit its family's bed description whenever the
        // family spoke with ONE voice. That reads as generous and is in fact
        // the single defect that made two DIFFERENTLY PRICED rows render as
        // the same row: the card prints `bedInfo` on its own line and cuts any
        // repeat of it out of the title (RoomsTable.splitBedFromTitle), so
        // "Double room (full double bed)" £331.50 and "Double Room" £349.56 —
        // Hotel Cilicia lp470bb, 14→17 Oct, 2 adults — both came out as
        // "Double room" + "full double bed" + Breakfast Included +
        // non-refundable, and nothing on either card said why one cost £18 more.
        // Measured on prod 2026-08-28 over 200 Rome hotels, 8,468 rate rows:
        // 2,415 rows carried a bed line and 389 of them (16%) carried text the
        // supplier never put on that rate's own name. 55 of those borrowings
        // produced a pair of rows identical in EVERY rendered field (title
        // after the card's bed-cut, bed line, board, refundability, cancel
        // deadline, capacity, property tax, payment type, room breakdown, deal
        // badge) and different only in price — 110 rows across 38 of the 200
        // hotels. Dropping the inheritance takes that to 0.
        //
        // It also cost nothing real, because the case it was written for — the
        // same room and board sold at the SAME price, described on one rate
        // plan and not the other — never reaches here: the equal-price merge
        // directly above already DROPS the description-less copy. 0 of the 389
        // borrowings had a same-price described twin in their family.
        //
        // And the borrowing was not merely uninformative, it was capable of
        // being wrong: Cilicia sells "Double or Twin Room" as well, so stamping
        // "full double bed" on a rate the supplier declined to describe can put
        // a couple in twin beds. When neither the rate name nor the room
        // catalogue (the card's own next fallback, which is at least matched to
        // this row's name) describes the beds, the honest row has no bed line.
        // 290 of the 389 keep one from the catalogue; 99 lose it.
        return { rows, cheapest: rows.length ? Math.min(...rows.map(grandOf)) : Infinity };
      })
      .filter((f) => f.rows.length > 0)
      .sort((a, b) => a.cheapest - b.cheapest);

    const admittedRows: OptionRow[] = [];
    for (const family of rankedFamilies) {
      if (admittedRows.length + family.rows.length > 50) break;
      admittedRows.push(...family.rows);
    }

    // 🔴 ONE offerId IS ONE BOOKABLE THING — NEVER TWO ROWS.
    // A multi-room bundle gives each of its rooms a different name, so the two
    // rooms key to two different rows above; but prebook/book take an offerId
    // and nothing else, so the guest cannot buy them separately. Rendering both
    // told them "20 options" where 14 existed, and clicking one highlighted the
    // other too — the detail page keys selection on offerId, and the duplicate
    // simply IS the same selection.
    //
    // Measured 2026-08-27 across 94 Rome hotels, 20→22 Sep, 2 rooms (2 adults
    // + one child, 2 adults): 216 of 1,764 rows (12.2%) were surplus, in 216
    // groups of EXACTLY two. Every group agreed on price, board AND
    // refundability to the penny and differed only in title — the signature of
    // one offer listed twice, not of two offers colliding. Best Western Plus
    // Hotel Universo (lp445b7) rendered "Junior Suite" £1374.77 and "Small
    // Double French Bed" £1374.77 under one offerId: 50 rows → 42.
    //
    // Safe for the two things this must not undo:
    //  · the free-cancellation twin — a refundable rate is a DIFFERENT offerId
    //    (0 of the 216 groups mixed refundability), so family-whole still ships
    //    both halves of every pair;
    //  · the lone traveller — 19,736 single-room rows across 474 London hotels
    //    produced ZERO offerId collisions, so this can never cost them a row.
    //
    // Deliberately AFTER the family-whole admission: the 50-row budget stays
    // spent on whole room+board families (the guarantee that a shown room shows
    // BOTH its prices), and this only ever drops rows nobody could book.
    const byOfferId = new Map<string, OptionRow>();
    for (const row of admittedRows) {
      const held = byOfferId.get(row.offerId);
      // Copy on first insert: the row objects are shared with optionsByKey and
      // the merge below writes to the survivor.
      if (!held) { byOfferId.set(row.offerId, { ...row }); continue; }
      // Survivor = whichever row describes the whole bundle best. All 216
      // measured groups carried `roomBreakdown` on BOTH rows, and the tie broke
      // cleanly every time: exactly one of the two is titled with
      // roomBreakdown[0], the bundle's first room. Preferring it makes the
      // surviving title stable instead of a race between two room names.
      const rowWins = (!!row.roomBreakdown && !held.roomBreakdown)
        || (!!row.roomBreakdown && row.roomName === row.roomBreakdown[0]
            && !(held.roomBreakdown && held.roomName === held.roomBreakdown[0]));
      const winner = rowWins ? { ...row } : held;
      const loser = rowWins ? held : row;
      // The collapse must not cost the guest a fact the loser was carrying:
      // bedInfo sat on only one of the two rows in 3 of the 216 groups.
      winner.roomBreakdown = winner.roomBreakdown ?? loser.roomBreakdown ?? null;
      winner.bedInfo = winner.bedInfo ?? loser.bedInfo ?? null;
      byOfferId.set(row.offerId, winner);
    }
    const allOptions: OptionRow[] = [...byOfferId.values()];
    // Output order is unchanged: cheapest sticker first, exactly as the detail
    // page has always rendered it. Only WHICH rows survive the cap changed.
    allOptions.sort((a, b) => a.totalPrice - b.totalPrice);

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
    // This is the PER-ROOM excluded tax on the cheapest rate.
    // (Negative supplier-side adjustments are clamped inside rateExcludedTax —
    //  the taxes-and-fees field has been observed carrying refund deltas, which
    //  would otherwise make priceBeforeTax come out below priceTotal.)
    const perRoomExcluded = rateExcludedTax(bestRate) ?? 0;
    // Number of ROOMS this quote covers — one `occupancy` entry per room, which
    // is also what the price above covers. Previously this read
    // `bestRoomType.rates.length`, i.e. the count of RATE PLANS on the room type
    // (Room Only / B&B / refundable / non-refundable …). That is not a room
    // count: it varies with how many rate variants the supplier happens to
    // publish, so the property-payable tax was scaled by an arbitrary number
    // — sometimes 1, sometimes 20 — with no relation to what the guest owes.
    const roomCount = Math.max(1, occupancy.length);
    // Same asymmetric-bundle bug as the rows above, and it matters more here:
    // this figure is the card's "taxes & fees at property" line AND half of the
    // all-in total the results list now ranks on, so a mixed-occupancy family
    // was being sorted by an under-stated cost as well as quoted one. Sum the
    // real per-room figures when the bundle gives us all of them; fall back to
    // the multiply when it doesn't.
    // `let` not `const`: the FX block below converts it in place, exactly as
    // it does the price fields.
    let extraTaxes = bundleExcludedTax(bestRoomType, occupancy.length)
      ?? (perRoomExcluded * roomCount);
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
        // Taxes were being left in the SUPPLIER's currency and then added to
        // an already-converted GBP price, so a Marrakech hotel quoting MAD
        // showed its raw dirham tax behind a £ sign — roughly a 12x
        // over-statement — and the same figure fed the all-in number the
        // results list now ranks on. Convert every money field here, not just
        // the headline, or the offer is internally inconsistent.
        extraTaxes = extraTaxes * fx;
        for (const opt of allOptions) {
          opt.totalPrice = Math.round(opt.totalPrice * fx * 100) / 100;
          opt.pricePerNight = Math.round(opt.pricePerNight * fx * 100) / 100;
          if (opt.marketPrice != null) opt.marketPrice = Math.round(opt.marketPrice * fx * 100) / 100;
          if (opt.negotiatedPrice != null) opt.negotiatedPrice = Math.round(opt.negotiatedPrice * fx * 100) / 100;
          if (opt.excludedTaxes != null) opt.excludedTaxes = Math.round(opt.excludedTaxes * fx * 100) / 100;
        }
        finalCurrency = 'GBP';
        fxConverted = true;
        if (LITEAPI_DEBUG) console.log(`[liteapi:fx] hotel=${entry.hotelId} ${before.toFixed(2)} → £${finalPrice.toFixed(2)} (rate=${fx})`);
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

    if (LITEAPI_DEBUG) console.log(`[liteapi:offer] hotel=${entry.hotelId} offerId=${bestOfferId} market=${marketRaw} negotiated=${negotiatedRaw} → final=${finalPrice} rateType=${rateType} perks=${perks?.join(',') || 'none'} signal=${signalType}`);

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
      // 0-10 guest score. LiteAPI's /data/hotels carries it as `rating`
      // (e.g. 9.6) — NOT reviewScore/averageRating/guestRating — so include
      // `rating` as a source or the Guest-rating filter reads all zeros.
      // Guard to the 0-10 range so a stray star-class value never leaks in.
      reviewScore: (() => {
        const rs = h?.reviewScore ?? h?.averageRating ?? h?.guestRating
          ?? meta?.reviewScore ?? meta?.averageRating ?? meta?.guestRating
          ?? (h as { rating?: number } | undefined)?.rating ?? meta?.rating;
        return typeof rs === 'number' && rs > 0 && rs <= 10 ? rs : undefined;
      })(),
      thumbnail: h?.main_photo || meta?.main_photo || firstImage || null,
      latitude: h?.latitude ?? meta?.latitude ?? null,
      longitude: h?.longitude ?? meta?.longitude ?? null,
      // Phase-2 facets — prefer the /data/hotels directory (meta), which always
      // carries these; the /hotels/rates `hotel` object often omits them.
      hotelTypeId: meta?.hotelTypeId ?? (h as { hotelTypeId?: number } | undefined)?.hotelTypeId ?? null,
      chain: (meta?.chain ?? (h as { chain?: string } | undefined)?.chain) || null,
      facilityIds: meta?.facilityIds ?? (h as { facilityIds?: number[] } | undefined)?.facilityIds ?? undefined,
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
      // Emitted from ONE option upward, not two. The old `> 1` threshold meant
      // a hotel selling a single rate lost the whole array, and the detail
      // page's single-row fallback has no room name and no capacity to fall
      // back ON — so 8-9 of 26 Málaga properties (and every Rome apartment
      // measured) rendered a bare board label and a price, while LiteAPI had
      // supplied both facts all along.
      boardOptions: allOptions.length > 0 ? allOptions : undefined,
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
  /** LiteAPI property-type code (map via LITEAPI_HOTEL_TYPES; 201 =
   *  Apartments). Drives the "Entire apartment" chip on rate rows. */
  hotelTypeId: number | null;
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
      /** The 0-10 GUEST SCORE — never a star rating. Paired with reviewCount
       *  below, this is the genuine aggregate for the whole property. */
      rating?: number;
      /** How many reviews `rating` is the average of. */
      reviewCount?: number;
      latitude?: number;
      longitude?: number;
      /** Where /data/hotel ACTUALLY puts the coordinates (verified live
       *  2026-08-25): nested, not top-level. The top-level latitude/longitude
       *  fields above never exist on this endpoint, so the details response
       *  shipped null coords for every hotel since the page was built —
       *  "Show on map" only survived via the hlat/hlng URL params search
       *  results append, and vanished on every deep link. */
      location?: { latitude?: number; longitude?: number };
      main_photo?: string;
      thumbnail?: string;
      /** Property-type code + label ("Apartments" = 201). Returned at top
       *  level by /data/hotel (verified live 2026-08-24) but previously
       *  dropped — the detail page couldn't say "Entire apartment". */
      hotelTypeId?: number;
      hotelType?: string;
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
      // LiteAPI is inconsistent about the high-res field: `/data/hotel` room
      // photos expose it as snake_case `hd_url`, while `hotelImages[]` uses
      // camelCase `urlHd`. Accept both, or every room photo silently falls
      // back to the low-res `url`.
      photos?: Array<{ url?: string; hd_url?: string; urlHd?: string; caption?: string } | string>;
      images?: Array<{ url?: string; hd_url?: string; urlHd?: string } | string>;
      roomAmenities?: Array<string | { name?: string; amenitiesName?: string }>;
      amenities?: Array<string | { name?: string }>;
      maxAdults?: number;
      maxChildren?: number;
      maxOccupancy?: number;
      roomSizeSquare?: number;
      roomSize?: number;
      sizeSquareMeters?: number;
      roomSizeUnit?: string;       // "sqm" | "sqft"
      // Live `/data/hotel` uses the key `bedType`, not `name` (verified
      // 2026-08-24, lp6870b: {quantity: 2, bedType: "Twin bed", …}). The
      // parser used to read only `name`, so beds stayed null for this —
      // common — supplier shape and the beds chip never rendered.
      bedTypes?: Array<{ name?: string; bedType?: string; quantity?: number } | string>;
      beds?: Array<{ name?: string; bedType?: string; quantity?: number } | string>;
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

      // Photos: accept string URLs or {url, hd_url, urlHd} objects.
      // `hd_url` first — that is the field LiteAPI actually returns on room
      // photos; `urlHd` only appears on hotelImages[].
      // Placeholders are dropped: LiteAPI ships a grey `room-placeholder.jpg`
      // for ~5% of rooms, and keeping it would satisfy the `photos.length > 0`
      // check downstream and suppress the real hotel-photo fallback.
      const roomPhotos: string[] = [];
      for (const p of r.photos || r.images || []) {
        if (!p) continue;
        const url = typeof p === 'string' ? p : (p.hd_url || p.urlHd || p.url);
        if (url && !/room-placeholder/i.test(url)) roomPhotos.push(url);
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
        const name = b.name || b.bedType || '';
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
      // 🔴 No `?? h.rating`: that field is the 0-10 guest score, and reading it
      // as stars is what put five gold stars on an unclassified campsite
      // (hu Roma Camping In Town, rating 8.5) and told Google "8.5 out of a
      // best of 5". An unrated hotel now returns null and the page shows no
      // stars at all — the honest rendering of "we don't know".
      stars: h.starRating ?? h.stars ?? null,
      latitude: h.latitude ?? h.location?.latitude ?? null,
      longitude: h.longitude ?? h.location?.longitude ?? null,
      mainPhoto: h.main_photo || h.thumbnail || photos[0] || null,
      photos,
      amenities,
      checkInTime,
      checkOutTime,
      hotelTypeId: typeof h.hotelTypeId === 'number' ? h.hotelTypeId : null,
      policies,
      rooms,
      // The score beside "2,719 verified guest reviews" used to be the mean of
      // the EIGHT reviews we fetch for the list — InterContinental Barcelona
      // printed 8.3 from [7,9,10,10,10,10,1,9] while the supplier's real
      // aggregate was 9.0, and Acta Laumon printed 8.9 against a true 8.4. It
      // was wrong in both directions, and the same pair went to Google as an
      // AggregateRating claiming thousands of reviewers had said it.
      //
      // /data/hotel carries the genuine aggregate all along, in the same
      // `rating` + `reviewCount` pair the directory row uses. Prefer it; the
      // eight-review mean survives only as the fallback, where the count is
      // then the number of reviews it actually describes.
      reviews: (() => {
        const agg = typeof h.rating === 'number' && Number.isFinite(h.rating) && h.rating > 0
          ? h.rating
          : null;
        const aggCount = typeof h.reviewCount === 'number' && h.reviewCount > 0
          ? h.reviewCount
          : null;
        if (agg == null) return reviews;
        return {
          ...reviews,
          averageScore: agg,
          count: aggCount ?? reviews.count,
        };
      })(),
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
