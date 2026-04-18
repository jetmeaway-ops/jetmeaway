import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { searchRegion, type RHGuests } from '@/lib/ratehawk';

export const runtime = 'edge';

/**
 * RateHawk region-level hotel search (Phase II).
 *
 * Caches responses in Vercel KV for 15 minutes — safe for SERP where
 * prices are "from" figures. NEVER reuse this cache at prebook time;
 * prices must be re-fetched live before payment.
 *
 * Query params:
 *   region_id     (numeric, required — use /api/ratehawk/regions to resolve)
 *   checkin       (YYYY-MM-DD, required)
 *   checkout      (YYYY-MM-DD, required)
 *   adults        (int, default 2)
 *   children      (comma-separated ages, optional)
 *   rooms         (int, default 1 — all rooms share the same guest shape)
 *   residency     (ISO-2 lowercase, default 'gb')
 *   language      (default 'en')
 *   currency      ('GBP' | 'EUR' | 'USD', default 'GBP')
 *   limit         (1–1000, default 50)
 *   nocache       ('1' bypasses KV)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const regionId = parseInt(searchParams.get('region_id') || '', 10);
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
  const limit = Math.min(1000, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
  const nocache = searchParams.get('nocache') === '1';

  if (!regionId || isNaN(regionId)) {
    return NextResponse.json({ error: 'region_id (numeric) is required' }, { status: 400 });
  }
  if (!checkin || !checkout) {
    return NextResponse.json({ error: 'checkin and checkout are required (YYYY-MM-DD)' }, { status: 400 });
  }

  const guests: RHGuests[] = Array.from({ length: roomCount }, () => ({ adults, children }));

  const cacheKey = `rh:serp:${regionId}:${checkin}:${checkout}:${adults}:${children.join(',')}:${roomCount}:${residency}:${currency}:${limit}`;

  if (!nocache) {
    try {
      const cached = await kv.get(cacheKey);
      if (cached) {
        return NextResponse.json({ cached: true, ...(cached as object) });
      }
    } catch { /* KV miss or error — fall through to live call */ }
  }

  const result = await searchRegion({
    region_id: regionId,
    checkin,
    checkout,
    residency,
    language,
    guests,
    currency,
    hotels_limit: limit,
  });

  if (result.ok && result.data) {
    try {
      await kv.set(cacheKey, { data: result.data, fetchedAt: Date.now() }, { ex: 900 });
    } catch { /* non-fatal — still return live data */ }
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
