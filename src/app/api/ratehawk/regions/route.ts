import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { regionSearch } from '@/lib/ratehawk';

export const runtime = 'edge';

/**
 * RateHawk region / place autocomplete.
 *
 * Converts a free-text query ("London", "Dubai Marina") into the
 * numeric region_id required by /api/ratehawk/search.
 *
 * Cached aggressively (7 days) — region data is effectively static.
 *
 * GET /api/ratehawk/regions?q=london&language=en
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const language = searchParams.get('language') || 'en';

  if (q.length < 2) {
    return NextResponse.json({ error: 'q must be at least 2 characters' }, { status: 400 });
  }

  const cacheKey = `rh:region:${language}:${q.toLowerCase()}`;

  try {
    const cached = await kv.get(cacheKey);
    if (cached) {
      return NextResponse.json({ cached: true, ...(cached as object) });
    }
  } catch { /* fall through */ }

  const result = await regionSearch(q, language);

  if (result.ok && result.data) {
    try {
      await kv.set(cacheKey, { data: result.data }, { ex: 604800 }); // 7 days
    } catch { /* non-fatal */ }
  }

  return NextResponse.json({
    cached: false,
    ok: result.ok,
    status: result.status,
    error: result.error,
    requestId: result.requestId,
    data: result.data,
  });
}
