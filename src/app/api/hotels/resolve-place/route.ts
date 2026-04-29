import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { resolvePlaceIdToHotelId } from '@/lib/liteapi';

export const runtime = 'edge';

// 30-day cache: a Google Place ID's mapping to a LiteAPI hotelId is stable.
const KV_TTL = 60 * 60 * 24 * 30;

/**
 * GET /api/hotels/resolve-place?placeId=<googlePlaceId>
 *
 * Maps a Google Place ID (returned by LiteAPI /data/places when type=hotel)
 * to the LiteAPI hotelId we can pass into /api/hotels/details/[id] and
 * /api/hotels/rates. Used by the destination autocomplete: when a visitor
 * picks a hotel-type result, the client calls this to grab the hotelId and
 * then navigates straight to /hotels/[hotelId].
 *
 * Returns 404 with `{ ok: false }` when LiteAPI can't map the place — the
 * client treats that as a fallback signal and falls back to a city-name
 * search using the place's description.
 */
export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get('placeId')?.trim() || '';
  if (!placeId) {
    return NextResponse.json({ ok: false, error: 'placeId is required' }, { status: 400 });
  }

  const cacheKey = `place-to-hotel:v1:${placeId}`;
  try {
    const cached = await kv.get<string>(cacheKey);
    if (cached) {
      return NextResponse.json({ ok: true, hotelId: cached, cached: true });
    }
  } catch { /* KV read fail — continue */ }

  const hotelId = await resolvePlaceIdToHotelId(placeId);
  if (!hotelId) {
    return NextResponse.json({ ok: false, error: 'No hotel mapped to placeId' }, { status: 404 });
  }

  try { await kv.set(cacheKey, hotelId, { ex: KV_TTL }); } catch {}
  return NextResponse.json({ ok: true, hotelId });
}
