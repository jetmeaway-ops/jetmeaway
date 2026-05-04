import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { googleHotelPlaceId, googleHotelEnrichment, type GoogleHotelEnrichment } from '@/lib/google-places';

export const runtime = 'edge';

// 24h. Photo CDN URLs from Google's skipHttpRedirect=true response are not
// short-lived in practice — Google serves them via lh*.googleusercontent.com
// with multi-day cacheability. Re-fetch daily anyway so we pick up new
// reviews / photos as the hotel adds them.
const KV_TTL = 60 * 60 * 24;

/**
 * GET /api/hotels/google-info?hotelId=...&name=...&lat=...&lng=...
 *
 * Returns Google Places enrichment (extra photos, reviews, editorial blurb,
 * phone, website, opening hours, Google Maps link) for a hotel. Two-step
 * Google call (Text Search → Place Details + Photo Media) cached in KV by
 * hotelId for 24h.
 *
 * Caller must supply `name` (LiteAPI hotel name) and ideally `lat,lng` so
 * the Text Search location-bias prevents matching a same-named hotel on
 * the wrong continent. `hotelId` is only used as the KV cache key.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const hotelId = url.searchParams.get('hotelId') || '';
  const name = url.searchParams.get('name') || '';
  const latRaw = url.searchParams.get('lat');
  const lngRaw = url.searchParams.get('lng');
  const lat = latRaw ? Number(latRaw) : undefined;
  const lng = lngRaw ? Number(lngRaw) : undefined;

  if (!hotelId || !name) {
    return NextResponse.json(
      { success: false, error: 'hotelId and name are required' },
      { status: 400 },
    );
  }

  const kvKey = `google-info:v1:${hotelId}`;

  try {
    const cached = await kv.get<GoogleHotelEnrichment>(kvKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached, cached: true });
    }
  } catch { /* KV read fail — continue */ }

  const placeId = await googleHotelPlaceId(name, lat, lng);
  if (!placeId) {
    const empty: GoogleHotelEnrichment = {
      placeId: null,
      rating: null,
      ratingCount: null,
      photos: [],
      reviews: [],
      editorialSummary: null,
      websiteUri: null,
      phone: null,
      priceLevel: null,
      formattedAddress: null,
      googleMapsUri: null,
      openingHours: null,
    };
    // Cache the negative result for a shorter window so we don't repeatedly
    // burn Text Search quota on hotels Google doesn't index.
    try { await kv.set(kvKey, empty, { ex: 60 * 60 * 6 }); } catch {}
    return NextResponse.json({ success: true, data: empty });
  }

  const enrichment = await googleHotelEnrichment(placeId);
  if (!enrichment) {
    return NextResponse.json({ success: false, error: 'Enrichment failed' }, { status: 502 });
  }

  const out: GoogleHotelEnrichment = { placeId, ...enrichment };
  try { await kv.set(kvKey, out, { ex: KV_TTL }); } catch {}

  return NextResponse.json({ success: true, data: out });
}
