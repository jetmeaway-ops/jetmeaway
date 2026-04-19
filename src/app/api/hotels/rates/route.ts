/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/hotels/rates
   ───────────────────────────────────────────────────────────────────────────
   Returns ALL available rate options for a single hotel so the detail page
   can render a booking.com-style rooms/rates table.

   Input (query):
     hotelId   — LiteAPI hotel id (with or without the `la_` prefix we use
                 in our own URLs; we strip it defensively)
     checkin   — YYYY-MM-DD
     checkout  — YYYY-MM-DD
     adults    — default 2
     children  — default 0
     childrenAges — comma-separated ages (optional)
     rooms     — default 1
     currency  — default GBP

   Output:
     { success: true, offers: BoardOption[] }
       where BoardOption = {
         offerId, boardType, totalPrice, pricePerNight, refundable
       }

   Cached in Vercel KV for 15 minutes — LiteAPI rates are already stale by a
   couple of minutes in their own pipeline, and we don't want the user
   re-fetching live rates on every hotel card click.
   ═══════════════════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { getHotels as liteapiGetHotels } from '@/lib/liteapi';

export const runtime = 'edge';

const KV_TTL = 900; // 15 minutes

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
};

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
  const currency = sp.get('currency') || 'GBP';

  if (!hotelId || !checkin || !checkout) {
    return NextResponse.json(
      { success: false, error: 'hotelId, checkin, checkout are required' },
      { status: 400 },
    );
  }

  const childrenAges = childrenAgesRaw
    ? childrenAgesRaw.split(',').map((n) => parseInt(n, 10) || 0).filter((n) => n > 0 || n === 0)
    : [];

  // One `occupancy` entry per room — mirror the rest of the codebase so
  // prices match what the user saw on the search results page.
  const occupancy = Array.from({ length: rooms }, () =>
    childrenAges.length > 0 ? { adults, children: childrenAges } : { adults },
  );

  const cacheKey = `hotel-rates:${hotelId}:${checkin}:${checkout}:${adults}:${children}:${childrenAgesRaw}:${rooms}:${currency}`;

  try {
    const cached = await kv.get<{ offers: BoardOptionOut[] }>(cacheKey);
    if (cached?.offers?.length) {
      return NextResponse.json({ success: true, offers: cached.offers, cached: true });
    }
  } catch { /* KV miss */ }

  try {
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
    if (!match) {
      return NextResponse.json({ success: true, offers: [] });
    }

    // LiteAPI only populates `boardOptions` when >1 board is available.
    // When there's only a single rate we synthesise a one-element array so
    // the detail page renders a single-row table consistently.
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
        }))
      : [{
          offerId: match.offerId,
          boardType: match.boardType || 'Room Only',
          totalPrice: match.price,
          pricePerNight: match.pricePerNight || (match.price / Math.max(1, nights(checkin, checkout))),
          refundable: match.refundable,
          roomName: null,
          // When we synthesise a single-row option, derive deal signals from
          // the hotel-level negotiated/market prices so we stay consistent.
          negotiatedPrice: (match.negotiatedPrice != null && match.marketPrice != null && match.negotiatedPrice < match.marketPrice)
            ? match.negotiatedPrice : null,
          marketPrice: match.marketPrice ?? null,
        }];

    try { await kv.set(cacheKey, { offers }, { ex: KV_TTL }); } catch { /* KV write failed */ }

    return NextResponse.json({ success: true, offers });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'LiteAPI rates lookup failed';
    return NextResponse.json({ success: false, error: msg }, { status: 502 });
  }
}

function nights(checkin: string, checkout: string): number {
  const ci = new Date(checkin).getTime();
  const co = new Date(checkout).getTime();
  if (!Number.isFinite(ci) || !Number.isFinite(co) || co <= ci) return 1;
  return Math.max(1, Math.round((co - ci) / 86400000));
}
