import { NextRequest, NextResponse } from 'next/server';
import { getPlaces } from '@/lib/liteapi';
import { findNeighbourhoods, formatNeighbourhoodQuery } from '@/lib/neighbourhoods';

export const runtime = 'edge';

/**
 * GET /api/hotels/places?q=paris
 *
 * Autocomplete endpoint backed by LiteAPI /data/places.
 * Returns cities, neighbourhoods, airports, and hotels matching the query.
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

  // LiteAPI first — their data wins on dedupe so we don't shadow a real result.
  let places: Array<{ id: string; name: string; description: string; type: string; lat?: number; lng?: number }> = [];
  try {
    places = await getPlaces(q);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Places lookup failed';
    console.error('[hotels/places]', message);
    // Fall through — curated list is a useful fallback even when LiteAPI fails.
  }

  // Curated neighbourhoods — dedupe against LiteAPI results by display name.
  const existingNames = new Set(
    places.map((p) => `${p.name.toLowerCase()}|${(p.description || '').toLowerCase()}`),
  );
  const curated = findNeighbourhoods(q, 8)
    .map((n) => ({
      id: `neighbourhood:${n.parent}:${n.name}`,
      name: n.name,
      description: `${n.parent}, ${n.country}${n.blurb ? ' — ' + n.blurb : ''}`,
      type: 'neighborhood',
      lat: n.lat,
      lng: n.lng,
      query: formatNeighbourhoodQuery(n), // what to feed back to hotel search
    }))
    .filter((c) => !existingNames.has(`${c.name.toLowerCase()}|${c.description.toLowerCase().split(' — ')[0]}`));

  // Merge: LiteAPI first (usually has the most specific hit), then curated.
  // Cap at 15 so the dropdown stays scannable.
  const merged = [...places, ...curated].slice(0, 15);
  return NextResponse.json({ places: merged });
}
