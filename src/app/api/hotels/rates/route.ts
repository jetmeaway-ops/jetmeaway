/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/hotels/rates
   ───────────────────────────────────────────────────────────────────────────
   Returns ALL available rate options for a single hotel so the detail page
   can render a standard rooms/rates table.

   Input (query):
     hotelId   — LiteAPI hotel id (with or without the `la_` prefix we use
                 in our own URLs; we strip it defensively)
     checkin   — YYYY-MM-DD
     checkout  — YYYY-MM-DD
     adults    — default 2
     children  — default 0
     childrenAges — comma-separated ages (optional)
     rooms     — default 1
     currency  — clamped to what we can actually price in (GBP today);
                 anything else falls back rather than being echoed back, since
                 getHotels() converts every supplier response to GBP anyway.

   Output:
     { success: true, offers: BoardOption[], currency: string }
       where BoardOption = {
         offerId, boardType, totalPrice, pricePerNight, refundable
       }
     `currency` is the currency the amounts are ACTUALLY in — read it rather
     than assuming the request's currency came back honoured.

   Cached in Vercel KV for 15 minutes — LiteAPI rates are already stale by a
   couple of minutes in their own pipeline, and we don't want the user
   re-fetching live rates on every hotel card click.
   ═══════════════════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse, after } from 'next/server';
import { kv } from '@vercel/kv';
import { getHotels as liteapiGetHotels } from '@/lib/liteapi';
import { normaliseDisplayCurrency } from '@/lib/pricing-currency';
import { decodeOccupancy } from '@/lib/occupancy';

export const runtime = 'edge';

const KV_TTL = 900; // 15 minutes
const REFRESH_THRESHOLD = 450; // 7.5 min — after this we serve stale + refresh in background

// Served to every 2xx response. Lets Vercel's edge CDN return cached HTML
// instantly for repeat lookups (s-maxage) while revalidating behind the
// scenes (stale-while-revalidate). 60s / 900s mirrors our KV strategy.
const SWR_HEADERS = {
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=900',
} as const;

type BoardOptionOut = {
  offerId: string;
  boardType: string;
  totalPrice: number;
  pricePerNight: number;
  refundable: boolean;
  /** Phase-2: human room category name — null when supplier omits it */
  roomName?: string | null;
  /** Phase-3: per-row Scout Deal signal (negotiated only when strictly < market) */
  negotiatedPrice?: number | null;
  marketPrice?: number | null;
  /** Phase-4: per-row property-payable taxes (city tax / VAT) — shown as an
   *  honest grand-total line in the RoomsTable UI */
  excludedTaxes?: number | null;
  /** v2-plan step-2: ISO timestamp for when free cancellation expires. Null
   *  for non-refundable rates or when supplier didn't emit a deadline. */
  cancelDeadline?: string | null;
  /** v2-plan step-3: supported payment methods (e.g. ["PAY_AT_HOTEL"]).
   *  Used to render the Pay-at-hotel chip — null/empty hides it. */
  paymentTypes?: string[] | null;
  /** LiteAPI commission — our merchant margin on the booking, in the offer's
   *  currency. LiteAPI only reports a single commission figure per hotel,
   *  not per-boardOption, so every row in this array carries the same value
   *  (the "best rate" commission). Good enough for admin margin approximation
   *  until LiteAPI exposes per-rate commissions. Null when omitted / not
   *  applicable (non-commissionable rate). */
  commission?: number | null;
};

type CacheShape = { offers: BoardOptionOut[]; storedAt: number };

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const rawHotelId = sp.get('hotelId') || '';
  // Our own URLs prefix hotel ids with `la_` (LiteAPI). The LiteAPI API
  // itself wants the raw id, so we strip the prefix defensively.
  const hotelId = rawHotelId.replace(/^la_/, '').trim();
  const checkin = sp.get('checkin') || '';
  const checkout = sp.get('checkout') || '';
  const adults = Math.max(1, parseInt(sp.get('adults') || '2', 10) || 2);
  const children = Math.max(0, parseInt(sp.get('children') || '0', 10) || 0);
  const childrenAgesRaw = sp.get('childrenAges') || '';
  const rooms = Math.max(1, parseInt(sp.get('rooms') || '1', 10) || 1);
  // Clamped, not echoed. `getHotels()` force-converts every supplier response
  // into GBP (see FX_TO_GBP in src/lib/liteapi.ts), so the offers below are
  // always sterling no matter what was asked for. Echoing the raw param would
  // cache identical GBP prices under a second key per currency AND hand the
  // caller a currency the numbers aren't in. See src/lib/pricing-currency.ts.
  const currency = normaliseDisplayCurrency(sp.get('currency'));

  if (!hotelId || !checkin || !checkout) {
    return NextResponse.json(
      { success: false, error: 'hotelId, checkin, checkout are required' },
      { status: 400 },
    );
  }

  const childrenAges = childrenAgesRaw
    ? childrenAgesRaw.split(',').map((n) => parseInt(n, 10) || 0).filter((n) => n > 0 || n === 0)
    : [];
  // `children=N` with missing/short ages: pad with 8 exactly like the search
  // route — otherwise the children were silently dropped from occupancy and
  // the quote came back priced for adults only (too cheap, wrong room).
  while (childrenAges.length < children) childrenAges.push(8);

  // One `occupancy` entry per room. `adults`/`children` are the TOTAL party,
  // split across rooms exactly like the search route (src/app/api/hotels/
  // route.ts) — adults spread evenly with the remainder in the last room,
  // children all in room 0 — so detail-page prices match the results page.
  // (Was: full party repeated per room, which turned "4 adults, 2 rooms"
  // into an 8-person search and returned zero offers. 2026-07-08)
  // Exact per-room occupancy carried from the results page as `occ=` wins when
  // present — it preserves the SAME room split the visitor saw (e.g. an
  // auto-split family of five as [1 adult+2 kids][1 adult+1 kid]). Without it
  // we fall back to the flat split below (adults spread evenly, children all in
  // room 0), which can differ from the results split and dead-end a hotel that
  // only had availability under the even split. See src/lib/occupancy.ts and
  // the auto-split retry in hotels-client.tsx.
  const occParam = sp.get('occ') || '';
  const decodedRooms = decodeOccupancy(occParam);
  let occupancy: Array<{ adults: number; children?: number[] }>;
  if (decodedRooms && decodedRooms.length > 0) {
    occupancy = decodedRooms.map((r) =>
      r.childAges.length > 0 ? { adults: r.adults, children: r.childAges } : { adults: r.adults },
    );
  } else {
    const adultsPerRoom: number[] = [];
    let remainingAdults = adults;
    for (let i = 0; i < rooms; i++) {
      const a = i === rooms - 1 ? remainingAdults : Math.max(1, Math.floor(adults / rooms));
      adultsPerRoom.push(Math.max(1, a));
      remainingAdults -= a;
    }
    occupancy = adultsPerRoom.map((a, idx) =>
      idx === 0 && childrenAges.length > 0 ? { adults: a, children: childrenAges } : { adults: a },
    );
  }

  // v4: bumped 2026-08-16 — `occ=` per-room occupancy now honoured, so the
  // cache key must vary on it or a flat-split entry would be served for an
  // occ-split request. (v3 2026-07-08 changed rooms>1 to split-across-rooms;
  // v2 2026-04-21 added cancelDeadline + paymentTypes.)
  const cacheKey = `hotel-rates:v4:${hotelId}:${checkin}:${checkout}:${adults}:${children}:${childrenAgesRaw}:${rooms}:${occParam}:${currency}`;

  try {
    const cached = await kv.get<CacheShape | { offers: BoardOptionOut[] }>(cacheKey);
    if (cached?.offers?.length) {
      // Backwards-compat: older entries stored `{ offers }` with no timestamp.
      // Treat those as fresh so we don't stampede on the rollover.
      const storedAt = (cached as CacheShape).storedAt ?? Date.now();
      const ageSec = (Date.now() - storedAt) / 1000;

      // If we're past the refresh threshold but still inside KV_TTL, serve
      // stale to this caller and kick off a background revalidation so the
      // NEXT caller gets fresh data.
      if (ageSec >= REFRESH_THRESHOLD) {
        after(refreshRates({ hotelId, checkin, checkout, occupancy, currency, cacheKey }));
      }

      return NextResponse.json(
        { success: true, offers: cached.offers, currency, cached: true, stale: ageSec >= REFRESH_THRESHOLD },
        { headers: SWR_HEADERS },
      );
    }
  } catch { /* KV miss */ }

  try {
    const offers = await fetchAndCacheRates({ hotelId, checkin, checkout, occupancy, currency, cacheKey });
    // `currency` is reported so callers never have to infer it from a URL param
    // — that guesswork is what produced "INR 412.50" over a sterling amount.
    return NextResponse.json({ success: true, offers, currency }, { headers: SWR_HEADERS });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'LiteAPI rates lookup failed';
    return NextResponse.json({ success: false, error: msg }, { status: 502 });
  }
}

type FetchArgs = {
  hotelId: string;
  checkin: string;
  checkout: string;
  occupancy: Array<{ adults: number; children?: number[] }>;
  currency: string;
  cacheKey: string;
};

async function fetchAndCacheRates(args: FetchArgs): Promise<BoardOptionOut[]> {
  const { hotelId, checkin, checkout, occupancy, currency, cacheKey } = args;
  // Trailing comma forces `getHotels` into the "caller supplied hotel id
  // list" branch — skips the /data/hotels directory lookup and goes
  // straight to /hotels/rates for just this one property.
  const hotelOffers = await liteapiGetHotels({
    destinationId: `${hotelId},`,
    checkIn: checkin,
    checkOut: checkout,
    occupancy,
    currency,
    limit: 1,
  });

  const match = hotelOffers.find((h) => h.hotelId === hotelId) || hotelOffers[0];
  if (!match) return [];

  // LiteAPI only populates `boardOptions` when >1 board is available.
  // When there's only a single rate we synthesise a one-element array so
  // the detail page renders a single-row table consistently.
  // Single commission figure reported for the hotel — stamped onto every row
  // because LiteAPI doesn't expose per-rate commissions. Scaled pro-rata to
  // each row's totalPrice vs match.price so a BB upsell-row gets proportionally
  // more margin than the cheapest RO row rather than the same absolute £.
  const baseCommission = typeof match.commission === 'number' && match.commission > 0
    ? match.commission
    : null;
  const basePrice = match.price > 0 ? match.price : 1;
  const scaledCommission = (rowPrice: number): number | null =>
    baseCommission == null ? null : Math.round((baseCommission * rowPrice / basePrice) * 100) / 100;

  const offers: BoardOptionOut[] = (match.boardOptions && match.boardOptions.length > 0)
    ? match.boardOptions.map((o) => ({
        offerId: o.offerId,
        boardType: o.boardType || 'Room Only',
        totalPrice: o.totalPrice,
        pricePerNight: o.pricePerNight,
        refundable: o.refundable,
        roomName: o.roomName ?? null,
        negotiatedPrice: o.negotiatedPrice ?? null,
        marketPrice: o.marketPrice ?? null,
        excludedTaxes: o.excludedTaxes ?? null,
        cancelDeadline: o.cancelDeadline ?? null,
        paymentTypes: o.paymentTypes ?? null,
        commission: scaledCommission(o.totalPrice),
      }))
    : [{
        offerId: match.offerId,
        boardType: match.boardType || 'Room Only',
        totalPrice: match.price,
        pricePerNight: match.pricePerNight || (match.price / Math.max(1, nights(checkin, checkout))),
        refundable: match.refundable,
        roomName: null,
        negotiatedPrice: (match.negotiatedPrice != null && match.marketPrice != null && match.negotiatedPrice < match.marketPrice)
          ? match.negotiatedPrice : null,
        marketPrice: match.marketPrice ?? null,
        excludedTaxes: match.excludedTaxes ?? null,
        cancelDeadline: match.cancellationDeadline ?? null,
        paymentTypes: null,
        commission: baseCommission,
      }];

  try {
    await kv.set(cacheKey, { offers, storedAt: Date.now() } satisfies CacheShape, { ex: KV_TTL });
  } catch { /* KV write failed — ignore */ }

  return offers;
}

// Background SWR refresh. Swallows errors so a hiccup in LiteAPI can't
// affect the response that already went to the user.
async function refreshRates(args: FetchArgs): Promise<void> {
  try { await fetchAndCacheRates(args); } catch { /* ignore */ }
}

function nights(checkin: string, checkout: string): number {
  const ci = new Date(checkin).getTime();
  const co = new Date(checkout).getTime();
  if (!Number.isFinite(ci) || !Number.isFinite(co) || co <= ci) return 1;
  return Math.max(1, Math.round((co - ci) / 86400000));
}
