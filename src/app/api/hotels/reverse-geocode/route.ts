import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * GET /api/hotels/reverse-geocode?lat=51.5&lng=-0.12
 *
 * Lightweight reverse-geocode used by the hotels page to turn a browser
 * geolocation into a city name for the search box. Backed by OSM Nominatim
 * (free, no key required) — we send a descriptive User-Agent per their
 * usage policy and cache results hard to stay under the 1 rps limit.
 */

type NominatimResponse = {
  address?: {
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    neighbourhood?: string;
    county?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
  display_name?: string;
};

export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get('lat'));
  const lng = Number(req.nextUrl.searchParams.get('lng'));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'lat/lng required' }, { status: 400 });
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: 'lat/lng out of range' }, { status: 400 });
  }

  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=12&addressdetails=1`;

  try {
    const res = await fetch(url, {
      headers: {
        // Nominatim usage policy requires identifying UA with contact email.
        'User-Agent': 'JetMeAway/1.0 (contact: waqar@jetmeaway.co.uk)',
        Accept: 'application/json',
      },
      // Cache at the edge — same coordinate round to 3dp is a ~110 m cell.
      next: { revalidate: 86_400 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: `reverse geocode failed (${res.status})` }, { status: 502 });
    }
    const data: NominatimResponse = await res.json();
    const a = data.address || {};
    // Prefer city-level; fall back to town / village / suburb for rural cases.
    const city = a.city || a.town || a.village || a.suburb || a.neighbourhood || a.county || a.state || '';
    const country = a.country || '';
    const displayName = [city, country].filter(Boolean).join(', ');
    return NextResponse.json({
      city,
      country,
      countryCode: a.country_code,
      displayName,
      lat,
      lng,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'reverse geocode error';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
