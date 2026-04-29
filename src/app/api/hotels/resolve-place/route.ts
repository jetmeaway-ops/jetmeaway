import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { resolvePlaceIdToHotelId } from '@/lib/liteapi';

export const runtime = 'edge';

// 30-day cache: a Google Place ID's mapping to a LiteAPI hotelId is stable.
const KV_TTL = 60 * 60 * 24 * 30;

/**
 * GET /api/hotels/resolve-place?placeId=<googlePlaceId>&expectedName=<hotel name>
 *
 * Maps a Google Place ID (returned by LiteAPI /data/places when type=hotel)
 * to the LiteAPI hotelId we can pass into /api/hotels/details/[id] and
 * /api/hotels/rates. Used by the destination autocomplete: when a visitor
 * picks a hotel-type result, the client calls this to grab the hotelId and
 * then navigates straight to /hotels/[hotelId].
 *
 * `expectedName` (optional but strongly recommended): the hotel name the
 * user clicked on in the autocomplete. We pass it through to LiteAPI's
 * resolver, which validates the brand-token signature against the
 * resolved hotel's name. LiteAPI does proximity matching on placeId — for
 * "Motel One Paris Porte de Versailles" it would return the Novotel
 * (lp27336c) next door because that's geographically closest. With
 * `expectedName` supplied, it rejects that and we fall back to a city
 * search instead of mis-routing the user.
 *
 * Returns 404 with `{ ok: false }` when LiteAPI can't map the place OR
 * when no candidate matches the expected brand — the client treats that
 * as a fallback signal and falls back to a city-name search using the
 * place's description.
 */
export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get('placeId')?.trim() || '';
  const expectedName = req.nextUrl.searchParams.get('expectedName')?.trim() || '';
  if (!placeId) {
    return NextResponse.json({ ok: false, error: 'placeId is required' }, { status: 400 });
  }

  // Cache key includes expectedName so a Place ID's "with brand check" and
  // "without brand check" results are distinguishable. Most callers will
  // pass expectedName, so the no-name path stays rarely hit.
  const cacheKey = `place-to-hotel:v2:${placeId}:${expectedName.toLowerCase().slice(0, 60)}`;
  try {
    const cached = await kv.get<string>(cacheKey);
    if (cached) {
      return NextResponse.json({ ok: true, hotelId: cached, cached: true });
    }
  } catch { /* KV read fail — continue */ }

  const result = await resolvePlaceIdToHotelId(placeId, expectedName || undefined);
  if (!result.hotelId) {
    // Reject with a tierHint when we have one — lets the client filter the
    // fallback city search to "same tier" alternatives instead of dumping
    // the user into a generic Paris-wide search where 5-star searchers see
    // hostels and budget travellers see luxury.
    return NextResponse.json(
      { ok: false, error: 'No hotel mapped to placeId', tierHint: result.tierHint ?? null },
      { status: 404 },
    );
  }

  try { await kv.set(cacheKey, result.hotelId, { ex: KV_TTL }); } catch {}
  return NextResponse.json({ ok: true, hotelId: result.hotelId });
}
