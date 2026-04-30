import { getHotels } from './liteapi';
import { duffelUrl, DUFFEL_VERSION } from './duffel';
import type { SavedSearch } from '@/app/api/account/saved-searches/route';

/**
 * Cron-time price-fetch helpers — given a saved search, returns today's
 * cheapest GBP price in pence. Used by /api/cron/check-saved-searches to
 * decide whether to fire a price-drop push.
 *
 * Goals:
 *   - Single round-trip per saved search (no Travelpayouts polling loops in
 *     the cron — too slow when walking 500 searches in a row)
 *   - Soft-fail: any upstream error returns null and the cron skips that
 *     search this run, retries tomorrow
 *   - No duplicate code: re-uses the same `getHotels` and Duffel offer-
 *     request shapes the live search routes use
 *
 * Hotels: LiteAPI `getHotels()` with the saved placeId (preferred) or
 *   destination text fallback. Returns the lowest stay-total in pence.
 *
 * Flights: Duffel offer-requests. We post the slices, ask for the cheapest
 *   offer, multiply by 100 for pence. Travelpayouts fallback is intentionally
 *   NOT wired into the cron — TP is async/polled and would multiply the
 *   cron's wall-clock by 5-10x for the marginal coverage it adds.
 */

const DUFFEL_KEY =
  process.env.DUFFEL_TEST_TOKEN ||
  process.env.DUFFEL_ACCESS_TOKEN ||
  process.env.DUFFEL_API_KEY ||
  '';

/* ── Hotels via LiteAPI ─────────────────────────────────────────────── */

export async function fetchHotelPricePence(search: SavedSearch): Promise<number | null> {
  const c = search.criteria;
  const checkIn = typeof c.checkin === 'string' ? c.checkin : '';
  const checkOut = typeof c.checkout === 'string' ? c.checkout : '';
  if (!checkIn || !checkOut) return null;

  const adults = typeof c.adults === 'number' ? c.adults : 2;
  const childrenCount = typeof c.children === 'number' ? c.children : 0;
  const occupancy = [{
    adults,
    children: childrenCount > 0 ? new Array(childrenCount).fill(8) : undefined, // dummy ages
  }];

  const placeId = typeof c.placeId === 'string' ? c.placeId : '';
  const destination = typeof c.destination === 'string' ? c.destination : '';

  try {
    const offers = placeId
      ? await getHotels({
          destinationId: placeId,
          checkIn,
          checkOut,
          occupancy,
          currency: 'GBP',
          guestNationality: 'GB',
          limit: 50,
        })
      : destination
        ? await getHotels({
            cityName: destination,
            countryCode: undefined as unknown as string, // best-effort lookup
            checkIn,
            checkOut,
            occupancy,
            currency: 'GBP',
            guestNationality: 'GB',
            limit: 50,
          })
        : [];

    if (!offers || offers.length === 0) return null;
    const prices = offers
      .map((o) => (typeof o.price === 'number' ? o.price : null))
      .filter((n): n is number => n !== null && n > 0);
    if (prices.length === 0) return null;
    return Math.round(Math.min(...prices) * 100);
  } catch (err) {
    console.error('[cron-price-fetch:hotel]', err instanceof Error ? err.message : err);
    return null;
  }
}

/* ── Flights via Duffel ─────────────────────────────────────────────── */

type DuffelOfferRequestResponse = {
  data?: {
    offers?: Array<{
      total_amount?: string;
      total_currency?: string;
    }>;
  };
};

export async function fetchFlightPricePence(search: SavedSearch): Promise<number | null> {
  if (!DUFFEL_KEY) return null;
  const c = search.criteria;
  const origin = typeof c.origin === 'string' ? c.origin : '';
  const destination = typeof c.destination === 'string' ? c.destination : '';
  const depDate = typeof c.depDate === 'string' ? c.depDate : '';
  const retDate = typeof c.retDate === 'string' ? c.retDate : '';
  const adults = typeof c.adults === 'number' ? c.adults : 1;
  const children = typeof c.children === 'number' ? c.children : 0;
  const infants = typeof c.infants === 'number' ? c.infants : 0;
  const cabinClass = typeof c.cabinClass === 'string' ? c.cabinClass : 'economy';

  if (!origin || !destination || !depDate) return null;

  const slices: Array<{ origin: string; destination: string; departure_date: string }> = [
    { origin, destination, departure_date: depDate },
  ];
  if (retDate) {
    slices.push({ origin: destination, destination: origin, departure_date: retDate });
  }

  const passengers: Array<{ type: 'adult' | 'child' | 'infant_without_seat' }> = [
    ...Array(adults).fill({ type: 'adult' as const }),
    ...Array(children).fill({ type: 'child' as const }),
    ...Array(infants).fill({ type: 'infant_without_seat' as const }),
  ];

  try {
    // Duffel offer-requests POST returns the request + first batch of offers
    // when `return_offers: true`. Cheapest offer is sorted to the top.
    const res = await fetch(duffelUrl('/air/offer_requests?return_offers=true&sort=total_amount&limit=1'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${DUFFEL_KEY}`,
        'Duffel-Version': DUFFEL_VERSION,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        data: {
          slices,
          passengers,
          cabin_class: cabinClass,
        },
      }),
    });

    if (!res.ok) {
      console.error('[cron-price-fetch:flight] Duffel HTTP', res.status);
      return null;
    }

    const data = (await res.json()) as DuffelOfferRequestResponse;
    const offers = data?.data?.offers ?? [];
    if (offers.length === 0) return null;

    // Pick the cheapest GBP offer. If no GBP, take the cheapest of any
    // currency — the cron's drop-threshold is in pence so cross-currency
    // comparison would be wrong; Phase 4: convert via FX or filter to GBP only.
    const gbpOffers = offers.filter((o) => o.total_currency === 'GBP');
    const candidates = gbpOffers.length > 0 ? gbpOffers : offers;
    const prices = candidates
      .map((o) => parseFloat(o.total_amount || ''))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (prices.length === 0) return null;
    return Math.round(Math.min(...prices) * 100);
  } catch (err) {
    console.error('[cron-price-fetch:flight]', err instanceof Error ? err.message : err);
    return null;
  }
}

/* ── Public dispatch ─────────────────────────────────────────────────── */

export async function fetchCurrentPricePence(search: SavedSearch): Promise<number | null> {
  // Smoke-test hook — `criteria.testPricePence` lets the cron route be
  // exercised end-to-end without burning a Duffel/LiteAPI request.
  if (typeof search.criteria.testPricePence === 'number') {
    return search.criteria.testPricePence;
  }
  if (search.type === 'hotel') return fetchHotelPricePence(search);
  if (search.type === 'flight') return fetchFlightPricePence(search);
  return null;
}
