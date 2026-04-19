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
    `/data/places?textQuery=${encodeURIComponent(query)}&type=locality,airport,hotel`,
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
}

export interface HotelOffer {
  offerId: string;        // rate offerId — feed this into completeBooking()
  hotelId: string;
  hotelName: string;
  address?: string;
  city?: string;
  country?: string;
  stars?: number;
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
    stars?: number;
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
  const ratesRes = await liteFetch<{
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
        main_photo?: string;
        latitude?: number;
        longitude?: number;
      };
      roomTypes?: RoomType[];
    }>;
  }>('/hotels/rates', {
    method: 'POST',
    body: JSON.stringify(ratesBody),
  });

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
        const nextRow: OptionRow = {
          offerId: rateOfferId,
          boardType: board,
          totalPrice: Math.round(effectivePrice * 100) / 100,
          pricePerNight: Math.round((effectivePrice / nights) * 100) / 100,
          refundable: isRefundable,
          roomName,
          negotiatedPrice: hasDeal ? Math.round(negPrice! * 100) / 100 : null,
          marketPrice: Number.isFinite(marketPrice) ? Math.round(marketPrice * 100) / 100 : null,
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

    // Flatten the map, sort cheapest-first, cap at 12 so long supplier
    // inventory lists don't overwhelm the rates table.
    const allOptions = Array.from(optionsByKey.values())
      .sort((a, b) => a.totalPrice - b.totalPrice)
      .slice(0, 12);

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

    // Final price = negotiated if cheaper, else market
    const finalPrice = (negotiatedRaw != null && negotiatedRaw > 0 && negotiatedRaw < marketRaw)
      ? negotiatedRaw : marketRaw;

    const finalCurrency =
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
    const extraTaxes = perRoomExcluded * roomCount;
    const commissionArr = bestRate.commission || [];
    const commission = commissionArr.length > 0 ? commissionArr.reduce((s, c) => s + (c.amount || 0), 0) : null;

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
      hotelName: h?.name || meta?.name || entry.hotelId,
      address: h?.address || meta?.address,
      city: h?.city || meta?.city,
      country: h?.country || meta?.country,
      stars: h?.stars ?? meta?.stars,
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
      checkinCheckoutTimes?: { checkin?: string; checkout?: string };
    };
    const res = await liteFetch<{ data: RawHotel }>(
      `/data/hotel?hotelId=${encodeURIComponent(hotelId)}`,
      { method: 'GET' },
      12_000,
    );
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
      checkInTime: h.checkinCheckoutTimes?.checkin || null,
      checkOutTime: h.checkinCheckoutTimes?.checkout || null,
    };
  } catch (err) {
    console.warn('[liteapi] getHotelDetails failed:', err instanceof Error ? err.message : err);
    return null;
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
}): Promise<BookingResult> {
  const { prebookId, transactionId, guest, clientReference } = params;

  if (!prebookId) throw new Error('prebookId is required');
  if (!transactionId) throw new Error('transactionId is required');
  if (!guest?.firstName || !guest?.lastName || !guest?.email) {
    throw new Error('guest.firstName, lastName and email are required');
  }

  const bookBody = {
    prebookId,
    ...(clientReference ? { clientReference } : {}),
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
