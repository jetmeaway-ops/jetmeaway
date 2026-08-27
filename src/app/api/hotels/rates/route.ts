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
     occ       — per-room occupancy ("2-6/1-8"), wins over the flat params
     adults    — default 2
     children  — default 0
     childrenAges — comma-separated ages (optional)
     rooms     — default 1
     Occupancy in EITHER form is clamped to the site-wide caps in
     src/lib/occupancy.ts (5 rooms, 9 guests, 4 adults + 4 children per room)
     before anything is priced, so a hand-made URL cannot obtain a quote the
     search page and the booking flow would refuse. `party` in the response
     reports the clamped result — read it, don't re-derive it from the URL.
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
import { decodeFromParams, encodeOccupancy, type Room } from '@/lib/occupancy';

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
  /** Sleeping capacity this row was priced for — per-rate figure from
   *  /hotels/rates, whole-booking on multi-room quotes. Null when the
   *  supplier omitted it. Authoritative (unlike the catalogue's ceiling). */
  maxOccupancy?: number | null;
  /** Multi-room bundles: the name of EACH room in the quote, in occupancy
   *  order. The bundle's own title names only one of its rooms — this list
   *  is what the customer is actually booking. Null on single-room quotes
   *  or when any room's name is missing. */
  roomBreakdown?: string[] | null;
  /** Sleeping arrangement ("2 Twin Bunk Beds and 1 Double Bed"), split off
   *  the supplier's room name. The card renders it as the bed line. */
  bedInfo?: string | null;
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

  // One `occupancy` entry per room, decoded through the SAME helper the search
  // route uses (`decodeFromParams`, src/app/api/hotels/route.ts): exact per-room
  // `occ=` wins when present — it preserves the room split the visitor actually
  // saw (e.g. an auto-split family of five as [1 adult+2 kids][1 adult+1 kid]) —
  // and the flat adults/children/rooms/childrenAges params are the legacy
  // fallback (adults spread evenly with the remainder in the last room, children
  // all in room 0, missing child ages padded to 8).
  //
  // Both halves now end in `clampRooms`, which is the point of routing through
  // the shared helper: MAX_ROOMS 5, MAX_GUESTS_TOTAL 9, MAX_ADULTS_PER_ROOM 4,
  // MAX_CHILDREN_PER_ROOM 4, child ages 0-17. Until 2026-08-27 only the `occ=`
  // half was clamped (decodeOccupancy does it internally) while the flat half
  // took the raw query numbers, so a hand-made `?adults=40&rooms=8` was priced
  // and quoted verbatim — a party the picker, the search route and the booking
  // flow all refuse to sell. The old flat split also INFLATED small parties,
  // because it gave every room a floor of 1 adult: `?adults=1&rooms=3` became
  // three 1-adult rooms (the 2A/3R → 3A guesswork occupancy.ts exists to kill).
  // `decodeLegacy` caps roomCount at the adult count instead.
  const roomsArr: Room[] = decodeFromParams({
    occ: sp.get('occ'),
    adults: sp.get('adults'),
    children: sp.get('children'),
    rooms: sp.get('rooms'),
    childrenAges: sp.get('childrenAges'),
  });
  const occupancy: Array<{ adults: number; children?: number[] }> = roomsArr.map((r) =>
    r.childAges.length > 0 ? { adults: r.adults, children: r.childAges } : { adults: r.adults },
  );

  // Echo of the occupancy this request was PRICED for — the client renders
  // "Price for X adults + Y children" from this, never from its own URL
  // params: `occ=` overrides them, missing child ages get padded, and rooms
  // get clamped, so the URL can disagree with what was actually priced (that
  // exact drift was the 2026-08-23 £194.86-for-a-couple bug). Derived from
  // `occupancy` — the post-clamp array — so a request trimmed by the caps
  // above is echoed as the party we trimmed it TO, never as the one asked for.
  // Deliberately NOT stored in KV.
  const party = {
    adults: occupancy.reduce((s, r) => s + r.adults, 0),
    children: occupancy.reduce((s, r) => s + (r.children?.length || 0), 0),
    rooms: occupancy.length,
  };

  // v4: bumped 2026-08-16 — `occ=` per-room occupancy now honoured, so the
  // cache key must vary on it or a flat-split entry would be served for an
  // occ-split request. (v3 2026-07-08 changed rooms>1 to split-across-rooms;
  // v2 2026-04-21 added cancelDeadline + paymentTypes.)
  // v5: `excludedTaxes` now covers ALL rooms in the quote rather than one room,
  // so it lines up with the row's multi-room `totalPrice`. That is a stored-value
  // meaning change — v4 entries hold the old per-room figure and would keep
  // under-stating the tax for multi-room stays until they expired.
  // v6: offers now carry per-rate `maxOccupancy` (2026-08-24). v5 entries
  // lack the field, which would render bare "Sleeps" chips for their full TTL.
  // v7: offers carry `roomBreakdown` on multi-room bundles (2026-08-27) —
  // v6 entries lack it and would hide the per-room list for their full TTL.
  // v8: cosmetic room-name variants now collapse to one row, kept by grand
  // total (2026-08-27) — v7 entries still hold the duplicate rows.
  // v9: bed text is split off the room name into `bedInfo`, which both
  // collapses the "…(2 Twin Bunk Beds…)" twin and feeds the card's bed line;
  // single-rate hotels also keep their room name and capacity now. v8 entries
  // hold the duplicate rows and no bed line for their full TTL.
  // v10 (2026-08-27) — two changes to what a stored row MEANS, both money:
  //   1. `excludedTaxes` on a multi-room row is now the SUM of each room's
  //      property-payable tax, not one room's tax multiplied by the room
  //      count. v9 entries under-state the desk bill on mixed-occupancy
  //      bundles (measured: Meliá Milano 1A+3A, £66.20 stored vs £86.45 owed),
  //      and re-serving them would keep quoting the old promise.
  //   2. Refundability is now part of the row identity, so a hotel returns
  //      BOTH the locked and the free-cancellation price for the same room and
  //      board. v9 entries hold only the cheap locked half — they would render
  //      a hotel as having no flexible rates at all for their full TTL.
  // v11 — bed configuration is part of row identity again (v10 collapsed
  // "Superior Room(1 Queen Bed)" and "(2 Twin Beds)" into one row and put a
  // bookable bed layout out of reach), and a row's bedInfo is only inherited
  // from its family when that family has ONE layout. v10 rows hold the
  // over-collapsed set and a possibly-borrowed bed line.
  // v12 (2026-08-27) — the occupancy slice of the key is now the CLAMPED
  // per-room encoding rather than the raw query params. Two reasons it has to
  // be a version bump and not a quiet edit:
  //   1. A v11 entry keyed on `adults=40&rooms=8` holds offers priced for 40
  //      guests. Under the caps the same URL now prices 9, so re-serving that
  //      entry would hand back a quote for a party we no longer sell — the
  //      stored rows would mean something different from the request that
  //      reaches them.
  //   2. Requests that clamp to the same party now SHARE one entry
  //      (`adults=12` and `adults=9` both encode to the same 9-guest split),
  //      which the old raw-param key could never collapse.
  // Keying on `encodeOccupancy` also makes the key incapable of promising an
  // occupancy the response wasn't priced for: it is built from the very array
  // handed to LiteAPI.
  const cacheKey = `hotel-rates:v12:${hotelId}:${checkin}:${checkout}:${encodeOccupancy(roomsArr)}:${currency}`;

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
        { success: true, offers: cached.offers, currency, party, cached: true, stale: ageSec >= REFRESH_THRESHOLD },
        { headers: SWR_HEADERS },
      );
    }
  } catch { /* KV miss */ }

  try {
    const offers = await fetchAndCacheRates({ hotelId, checkin, checkout, occupancy, currency, cacheKey });
    // `currency` is reported so callers never have to infer it from a URL param
    // — that guesswork is what produced "INR 412.50" over a sterling amount.
    return NextResponse.json({ success: true, offers, currency, party }, { headers: SWR_HEADERS });
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
        maxOccupancy: o.maxOccupancy ?? null,
        roomBreakdown: o.roomBreakdown ?? null,
        bedInfo: o.bedInfo ?? null,
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
        // Synthesised single-rate fallback has no per-rate data to read from.
        // Since 2026-08-27 getHotels emits boardOptions from one option upward,
        // so this branch is now only reached when the supplier returned no
        // options at all — genuinely nothing to describe.
        maxOccupancy: null,
        roomBreakdown: null,
        bedInfo: null,
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
