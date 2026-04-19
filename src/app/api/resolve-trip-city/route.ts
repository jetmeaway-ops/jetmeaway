import { NextRequest, NextResponse } from 'next/server';
import { resolveTripCityId } from '@/lib/trip-resolver';

export const runtime = 'edge';

/**
 * GET /api/resolve-trip-city?q=Dubai
 *
 * Thin wrapper around `@/lib/trip-resolver`. Used by hotels-client.tsx to
 * prefetch the Trip.com cityId once per search (not per result card) so
 * "Trip.com →" buttons deep-link with the real numeric cityId and auto-load
 * inventory instead of landing on "0 properties found".
 *
 * Returns `{ id: number }` where `id` is a positive cityId or `-1` for miss.
 * The URL builder in hotels-client.tsx treats -1 as "use keyword mode"
 * (lands on Trip.com UK with destination + dates + tracking, user clicks
 * Search once).
 */
export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get('q');
  if (!q) return NextResponse.json({ error: 'missing q' }, { status: 400 });
  const id = await resolveTripCityId(q);
  return NextResponse.json({ id });
}
