import { NextRequest, NextResponse } from 'next/server';
import { searchHotels as dotwSearchHotels } from '@/lib/dotw';
import {
  dotwSearchToHotelOffers,
} from '@/lib/suppliers/dotw-adapter';

/**
 * POST /api/hotels/dotw-search
 *
 * Internal-only sub-route. The main search handler at /api/hotels runs on
 * Edge for low-latency responses, but DOTW's XML client needs `node:crypto`
 * (MD5) and `node:zlib` (gzip). We isolate those node-only bits here and
 * have the edge handler proxy through this route via an internal fetch.
 *
 * Body: {
 *   cityKey: string, checkin: string, checkout: string,
 *   adults: number, children?: number, childAges?: number[], rooms?: number,
 * }
 *
 * Returns: { offers: (HotelOffer & { giataId?: string; source: 'dotw' })[] }
 */
export const runtime = 'nodejs';
export const maxDuration = 20;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      cityKey,
      checkin,
      checkout,
      adults = 2,
      children = 0,
      childAges = [],
      rooms = 1,
    } = body || {};

    if (!cityKey || !checkin || !checkout) {
      return NextResponse.json(
        { offers: [], error: 'cityKey, checkin, checkout required' },
        { status: 400 },
      );
    }

    const safeAdults = Math.max(1, Math.min(10, Number(adults) || 2));
    const safeRooms = Math.max(1, Math.min(5, Number(rooms) || 1));
    const safeChildren = Math.max(0, Number(children) || 0);
    const ages: number[] = Array.isArray(childAges)
      ? childAges.slice(0, safeChildren).map((n) => Math.max(0, Math.min(17, Number(n) || 8)))
      : [];
    while (ages.length < safeChildren) ages.push(8);

    // Split adults across rooms (min 1 per room); children all in first room.
    const adultsPerRoom: number[] = [];
    let remaining = safeAdults;
    for (let i = 0; i < safeRooms; i++) {
      const a = i === safeRooms - 1 ? remaining : Math.max(1, Math.floor(safeAdults / safeRooms));
      adultsPerRoom.push(a);
      remaining -= a;
    }

    const searchParams = {
      fromDate: String(checkin),
      toDate: String(checkout),
      currency: 'GBP',
      rooms: adultsPerRoom.map((adultsCode, idx) => ({
        adultsCode,
        childAges: idx === 0 ? ages : [],
        passengerNationality: 'GB',
        passengerCountryOfResidence: 'GB',
      })),
      cityCode: String(cityKey),
    };

    const response = await dotwSearchHotels(searchParams);
    const offers = dotwSearchToHotelOffers(response, searchParams);
    return NextResponse.json({ offers });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('[dotw-search]', message);
    return NextResponse.json({ offers: [], error: message }, { status: 200 });
  }
}
