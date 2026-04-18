import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { searchHotelPage, type RHGuests } from '@/lib/ratehawk';

export const runtime = 'edge';

/**
 * RateHawk single-hotel rate list (Phase III — hotelpage).
 *
 * Short cache (2 minutes) — prices are authoritative for the book_hash
 * that gets passed to /api/ratehawk/prebook, so we don't want stale data.
 *
 * Query params:
 *   id          (hotel id from search results, required)
 *   checkin     (YYYY-MM-DD, required)
 *   checkout    (YYYY-MM-DD, required)
 *   adults, children, rooms, residency, language, currency — same as /search
 *   nocache     ('1' to bypass KV)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const id = searchParams.get('id') || '';
  const checkin = searchParams.get('checkin') || '';
  const checkout = searchParams.get('checkout') || '';
  const adults = parseInt(searchParams.get('adults') || '2', 10);
  const childrenStr = searchParams.get('children') || '';
  const children = childrenStr
    ? childrenStr.split(',').map(a => parseInt(a, 10)).filter(n => !isNaN(n))
    : [];
  const roomCount = Math.max(1, parseInt(searchParams.get('rooms') || '1', 10));
  const residency = (searchParams.get('residency') || 'gb').toLowerCase();
  const language = searchParams.get('language') || 'en';
  const currency = (searchParams.get('currency') || 'GBP') as 'GBP' | 'EUR' | 'USD';
  const nocache = searchParams.get('nocache') === '1';

  if (!id || !checkin || !checkout) {
    return NextResponse.json(
      { error: 'id, checkin and checkout are required' },
      { status: 400 }
    );
  }

  const guests: RHGuests[] = Array.from({ length: roomCount }, () => ({ adults, children }));

  const cacheKey = `rh:hp:${id}:${checkin}:${checkout}:${adults}:${children.join(',')}:${roomCount}:${residency}:${currency}`;

  if (!nocache) {
    try {
      const cached = await kv.get(cacheKey);
      if (cached) {
        return NextResponse.json({ cached: true, ...(cached as object) });
      }
    } catch { /* fall through */ }
  }

  const result = await searchHotelPage({
    id,
    checkin,
    checkout,
    residency,
    language,
    guests,
    currency,
  });

  if (result.ok && result.data) {
    try {
      await kv.set(cacheKey, { data: result.data, fetchedAt: Date.now() }, { ex: 120 });
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
