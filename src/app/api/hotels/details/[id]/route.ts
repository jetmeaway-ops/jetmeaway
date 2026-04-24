import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { getHotelDetails } from '@/lib/liteapi';

export const runtime = 'edge';

const KV_TTL = 60 * 60 * 24; // 24h

/**
 * GET /api/hotels/details/[id]
 *
 * Returns full hotel metadata (photos, description, amenities) from LiteAPI.
 * Accepts the frontend id — either the bare LiteAPI hotelId or the `la_`-prefixed
 * id used by the search results feed.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await params;
  if (!rawId) {
    return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
  }

  // Strip the `la_` prefix added by /api/hotels search results
  const hotelId = rawId.startsWith('la_') ? rawId.slice(3) : rawId;
  // v5 — bumped 2026-04-24 so cached entries re-fetch with the aligned
  // room-name cleaning rule (strips parenthesised/bare trailing board
  // labels like "(Room Only)"). v4 entries used the weaker cleaner that
  // broke the rates → details roomMetaByName key match, which is why
  // per-room thumbnails stopped showing on some hotels.
  const kvKey = `hotel-details:v5:${hotelId}`;

  try {
    const cached = await kv.get(kvKey);
    if (cached) {
      return NextResponse.json({ success: true, hotel: cached, cached: true });
    }
  } catch { /* KV read fail — continue */ }

  const hotel = await getHotelDetails(hotelId);
  if (!hotel) {
    return NextResponse.json({ success: false, error: 'Hotel not found' }, { status: 404 });
  }

  try { await kv.set(kvKey, hotel, { ex: KV_TTL }); } catch {}

  return NextResponse.json({ success: true, hotel });
}
