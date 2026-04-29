import { NextRequest, NextResponse } from 'next/server';
import { getPlaces, searchHotelsByName } from '@/lib/liteapi';
import { findNeighbourhoods, formatNeighbourhoodQuery } from '@/lib/neighbourhoods';

export const runtime = 'edge';

type PlaceRow = {
  id: string;
  name: string;
  description: string;
  type: string;
  lat?: number;
  lng?: number;
  query?: string;
  isLiteApiHotel?: boolean;
};

/**
 * GET /api/hotels/places?q=paris
 *
 * Autocomplete endpoint. Fires two LiteAPI calls in parallel:
 *   1. /data/places — cities, neighbourhoods, airports
 *   2. /data/hotels?name=… — specific hotel matches by name
 *
 * Hotels from #2 carry `isLiteApiHotel: true` and their `id` is already
 * a LiteAPI hotelId, so the client can navigate straight to /hotels/[id]
 * without the placeId resolver hop.
 *
 * Curated neighbourhoods (src/lib/neighbourhoods.ts) are merged in so typing
 * a parent city ("London") still surfaces sub-areas (Victoria, Paddington,
 * Westminster...) even when LiteAPI's geocoder doesn't volunteer them.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() || '';
  if (q.length < 2) {
    return NextResponse.json({ places: [] });
  }

  const [placesResult, hotelsResult] = await Promise.all([
    getPlaces(q).catch((err: unknown) => {
      console.error('[hotels/places]', err instanceof Error ? err.message : err);
      return [] as Awaited<ReturnType<typeof getPlaces>>;
    }),
    searchHotelsByName(q, 4).catch((err: unknown) => {
      console.error('[hotels/places:byName]', err instanceof Error ? err.message : err);
      return [] as Awaited<ReturnType<typeof searchHotelsByName>>;
    }),
  ]);

  const places: PlaceRow[] = placesResult;

  const hotelRows: PlaceRow[] = hotelsResult.map((h) => ({
    id: h.id,
    name: h.name,
    description: [h.city, h.country].filter(Boolean).join(', '),
    type: 'hotel',
    isLiteApiHotel: true,
  }));

  // Curated neighbourhoods — dedupe against LiteAPI results by display name.
  const existingNames = new Set(
    places.map((p) => `${p.name.toLowerCase()}|${(p.description || '').toLowerCase()}`),
  );
  const curated: PlaceRow[] = findNeighbourhoods(q, 8)
    .map((n) => ({
      id: `neighbourhood:${n.parent}:${n.name}`,
      name: n.name,
      description: `${n.parent}, ${n.country}${n.blurb ? ' — ' + n.blurb : ''}`,
      type: 'neighborhood' as const,
      lat: n.lat,
      lng: n.lng,
      query: formatNeighbourhoodQuery(n),
    }))
    .filter((c) => !existingNames.has(`${c.name.toLowerCase()}|${c.description.toLowerCase().split(' — ')[0]}`));

  // Order: hotel-name matches first (most specific), then places, then curated.
  // Cap at 15 so the dropdown stays scannable.
  const merged = [...hotelRows, ...places, ...curated].slice(0, 15);
  return NextResponse.json({ places: merged });
}
