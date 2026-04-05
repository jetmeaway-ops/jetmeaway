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

const LITE_API_BASE = 'https://api.liteapi.travel/v3.0';

function apiKey(): string {
  const k = process.env.LITE_API_KEY;
  if (!k) throw new Error('LITE_API_KEY is not set');
  return k;
}

async function liteFetch<T = any>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${LITE_API_BASE}${path}`, {
    ...init,
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
  return res.json() as Promise<T>;
}

/* ───────────────────────────────────────────────────────────────────────── */
/*  TYPES                                                                    */
/* ───────────────────────────────────────────────────────────────────────── */

export interface Occupancy {
  adults: number;
  children?: number[]; // array of ages, e.g. [8, 4]
}

export interface GetHotelsParams {
  /** City/place ID (LiteAPI placeId), IATA city code, or a hotel ID list */
  destinationId: string;
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
  price: number;              // total stay, after tax
  priceBeforeTax?: number | null;
  pricePerNight?: number | null;
  commission?: number | null; // our commission (merchant margin)
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
    checkIn,
    checkOut,
    occupancy,
    currency = 'GBP',
    guestNationality = 'GB',
    limit = 25,
  } = params;

  if (!destinationId) throw new Error('destinationId is required');
  if (!checkIn || !checkOut) throw new Error('checkIn and checkOut are required');
  if (!occupancy?.length) throw new Error('occupancy is required');

  // 1. Resolve hotelIds. If caller passed a CSV of hotel ids, skip the lookup.
  let hotelIds: string[];
  if (destinationId.includes(',')) {
    hotelIds = destinationId.split(',').map((s) => s.trim()).filter(Boolean);
  } else {
    const listQuery = new URLSearchParams({
      placeId: destinationId,
      limit: String(limit),
    });
    const list = await liteFetch<{ data: Array<{ id: string }> }>(
      `/data/hotels?${listQuery.toString()}`,
      { method: 'GET' },
    );
    hotelIds = (list.data || []).map((h) => h.id).slice(0, limit);
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

  const ratesRes = await liteFetch<{
    data: Array<{
      hotelId: string;
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
      roomTypes?: Array<{
        rates?: Array<{
          rateId?: string;
          offerId?: string;
          name?: string;
          boardType?: string;
          refundable?: boolean;
          cancellationPolicies?: { refundableTag?: string; cancelPolicyInfos?: Array<{ cancelTime?: string }> };
          retailRate?: {
            total?: Array<{ amount: number; currency: string }>;
            suggestedSellingPrice?: Array<{ amount: number; currency: string }>;
            taxesAndFees?: Array<{ amount: number; currency: string }>;
          };
          commission?: Array<{ amount: number; currency: string }>;
        }>;
      }>;
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

  // 3. Flatten: one cheapest offer per hotel
  const offers: HotelOffer[] = [];
  for (const entry of ratesRes.data || []) {
    const rates = (entry.roomTypes || []).flatMap((rt) => rt.rates || []);
    if (rates.length === 0) continue;

    // Pick cheapest rate
    const cheapest = rates.reduce((best, r) => {
      const bPrice = best?.retailRate?.total?.[0]?.amount ?? Infinity;
      const rPrice = r.retailRate?.total?.[0]?.amount ?? Infinity;
      return rPrice < bPrice ? r : best;
    });

    const offerId = cheapest.offerId || cheapest.rateId || '';
    if (!offerId) continue;

    const total = cheapest.retailRate?.total?.[0];
    const suggested = cheapest.retailRate?.suggestedSellingPrice?.[0];
    const taxes = cheapest.retailRate?.taxesAndFees?.[0]?.amount ?? 0;
    const commission = cheapest.commission?.[0]?.amount ?? null;

    const h = entry.hotel;
    offers.push({
      offerId,
      hotelId: entry.hotelId,
      hotelName: h?.name || entry.hotelId,
      address: h?.address,
      city: h?.city,
      country: h?.country,
      stars: h?.stars,
      thumbnail: h?.main_photo || null,
      latitude: h?.latitude ?? null,
      longitude: h?.longitude ?? null,
      boardType: cheapest.boardType || cheapest.name || null,
      refundable:
        cheapest.refundable ??
        (cheapest.cancellationPolicies?.refundableTag === 'RFN'),
      cancellationDeadline:
        cheapest.cancellationPolicies?.cancelPolicyInfos?.[0]?.cancelTime || null,
      currency: total?.currency || currency,
      price: suggested?.amount ?? total?.amount ?? 0,
      priceBeforeTax:
        total?.amount != null ? total.amount - taxes : null,
      pricePerNight:
        total?.amount != null ? total.amount / nights : null,
      commission,
    });
  }

  // Sort cheapest first
  offers.sort((a, b) => a.price - b.price);
  return offers;
}

/* ───────────────────────────────────────────────────────────────────────── */
/*  BOOKING — completeBooking                                                */
/* ───────────────────────────────────────────────────────────────────────── */

/**
 * Complete a hotel booking against LiteAPI using the merchant / pre-paid model.
 *
 * Payment flow:
 *   1. Customer pays us on jetmeaway.co.uk via Stripe (never leaves the site)
 *   2. We pass the Stripe PaymentIntent ID to LiteAPI as `transactionId`,
 *      LiteAPI settles against our merchant wallet, customer is confirmed.
 *
 * Two-step sequence required by LiteAPI v3:
 *   a) POST /rates/prebook  → returns prebookId and the final locked price
 *   b) POST /rates/book     → confirms the booking using prebookId
 */
export async function completeBooking(
  params: CompleteBookingParams,
): Promise<BookingResult> {
  const { offerId, guest, stripePaymentIntentId } = params;

  if (!offerId) throw new Error('offerId is required');
  if (!guest?.firstName || !guest?.lastName || !guest?.email) {
    throw new Error('guest.firstName, lastName and email are required');
  }

  // a) Prebook — locks price and gives us a prebookId
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

  // b) Book — merchant wallet settlement, customer paid us via Stripe.
  // LiteAPI's merchant model accepts the Stripe PaymentIntent ID as
  // transactionId; the amount is debited from our pre-funded merchant wallet.
  const bookBody = {
    prebookId: prebookData.prebookId,
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
    payment: {
      method: 'TRANSACTION_ID',
      ...(stripePaymentIntentId ? { transactionId: stripePaymentIntentId } : {}),
    },
  };

  const booking = await liteFetch<{
    data: {
      bookingId: string;
      status: string;
      supplierBookingId?: string;
      hotelConfirmationCode?: string;
      currency: string;
      price: number;
      checkin: string;
      checkout: string;
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
    currency: b.currency,
    totalPrice: b.price,
    checkIn: b.checkin,
    checkOut: b.checkout,
    raw: b,
  };
}
