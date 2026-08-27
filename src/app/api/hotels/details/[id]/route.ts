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
  // v7 — bumped 2026-08-24: rooms[].beds was null for every supplier that
  // keys bed entries as `bedType` instead of `name` (the common live shape),
  // and `hotelTypeId` (drives the "Entire apartment" chip) is now included.
  // v6 entries would hide both for up to the full 24h TTL.
  // v6 — bumped 2026-08-13 so cached entries re-fetch with the corrected
  // room-photo mapping: LiteAPI returns the high-res room image as snake_case
  // `hd_url` (we only read camelCase `urlHd`, which exists on hotelImages[]
  // but never on room photos), and its grey `room-placeholder.jpg` is now
  // filtered out so the hotel-photo fallback can take over.
  // v5 — bumped 2026-04-24 so cached entries re-fetch with the aligned
  // room-name cleaning rule (strips parenthesised/bare trailing board
  // labels like "(Room Only)"). v4 entries used the weaker cleaner that
  // broke the rates → details room-name key match, which is why per-room
  // thumbnails stopped showing on some hotels.
  // v8 — bumped 2026-08-25: latitude/longitude were null for EVERY hotel
  // (LiteAPI nests them under `location`, the parser read top level), so
  // "Show on map" died on all deep links. v7 entries carry null coords for
  // up to 24h and must not be served.
  // v9 — bumped 2026-08-27: two stored fields changed meaning. `stars` no
  // longer falls back to the 0-10 guest score (v8 entries hold 8.5 and 9.8 as
  // "star ratings", which the page rendered as five gold stars and sent to
  // Google), and `reviews.averageScore`/`count` now carry LiteAPI's real
  // aggregate instead of the mean of the eight reviews we happen to fetch.
  // v8 entries hold both wrong values for up to 24h.
  const kvKey = `hotel-details:v9:${hotelId}`;

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
