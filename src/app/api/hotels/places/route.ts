import { NextRequest, NextResponse } from 'next/server';
import { getPlaces } from '@/lib/liteapi';

export const runtime = 'edge';

/**
 * GET /api/hotels/places?q=paris
 *
 * Autocomplete endpoint backed by LiteAPI /data/places.
 * Returns cities, airports, and hotels matching the query.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() || '';
  if (q.length < 2) {
    return NextResponse.json({ places: [] });
  }

  try {
    const places = await getPlaces(q);
    return NextResponse.json({ places });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Places lookup failed';
    console.error('[hotels/places]', message);
    return NextResponse.json({ places: [], error: message }, { status: 500 });
  }
}
