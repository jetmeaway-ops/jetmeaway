import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const MARKER = '714449';

export async function GET(req: NextRequest) {
  const token = process.env.TRAVELPAYOUTS_TOKEN;
  const { searchParams } = new URL(req.url);
  const city = searchParams.get('city');
  const checkin = searchParams.get('checkin');
  const checkout = searchParams.get('checkout');
  const adults = searchParams.get('adults') || '2';
  const children = searchParams.get('children') || '0';

  if (!city || !checkin || !checkout) {
    return NextResponse.json({ error: 'Missing required parameters (city, checkin, checkout)' }, { status: 400 });
  }

  if (!token) {
    return NextResponse.json({ error: 'TRAVELPAYOUTS_TOKEN not set' }, { status: 503 });
  }

  try {
    // Step 1: Look up the city to get locationId
    const lookupUrl = `https://engine.hotellook.com/api/v2/lookup.json?query=${encodeURIComponent(city)}&lang=en&lookFor=city&limit=1&token=${token}`;
    const lookupRes = await fetch(lookupUrl, { headers: { Accept: 'application/json' } });

    if (!lookupRes.ok) {
      return NextResponse.json({ error: 'Hotel lookup API error', status: lookupRes.status }, { status: 502 });
    }

    const lookupData = await lookupRes.json();
    const location = lookupData?.results?.locations?.[0];

    if (!location) {
      return NextResponse.json({ hotels: [], message: 'City not found' });
    }

    const locationId = location.id;
    const cityName = location.cityName || location.name || city;

    // Step 2: Get cached hotel prices for this location
    const cacheUrl = `https://engine.hotellook.com/api/v2/cache.json?location=${encodeURIComponent(cityName)}&checkIn=${checkin}&checkOut=${checkout}&currency=gbp&limit=15&adults=${adults}&token=${token}`;
    const cacheRes = await fetch(cacheUrl, { headers: { Accept: 'application/json' } });

    if (!cacheRes.ok) {
      return NextResponse.json({ error: 'Hotel cache API error', status: cacheRes.status }, { status: 502 });
    }

    const cacheData = await cacheRes.json();

    if (!Array.isArray(cacheData) || cacheData.length === 0) {
      return NextResponse.json({ hotels: [], message: 'No hotels found for these dates' });
    }

    // Step 3: Build hotel results with photos and booking links
    const hotels = cacheData.map((h: any) => {
      const hotelId = h.hotelId || h.hotel_id;
      const photoUrl = hotelId
        ? `https://photo.hotellook.com/image_v2/crop/h${hotelId}/640/480.auto`
        : null;

      // Build Hotellook booking link with affiliate tracking
      const bookingUrl = `https://search.hotellook.com/hotels?destination=${encodeURIComponent(cityName)}&checkIn=${checkin}&checkOut=${checkout}&adults=${adults}&children=${children}&marker=${MARKER}`;

      return {
        id: hotelId,
        name: h.hotelName || h.hotel_name || 'Hotel',
        stars: h.stars || 0,
        price: h.priceFrom || h.price_from || h.price || 0,
        currency: '£',
        photo: photoUrl,
        location: h.location?.name || cityName,
        bookingUrl,
      };
    });

    // Sort by price ascending
    hotels.sort((a: any, b: any) => a.price - b.price);

    return NextResponse.json({
      hotels,
      city: cityName,
      checkin,
      checkout,
      adults: parseInt(adults),
      children: parseInt(children),
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch hotel prices', detail: err.message }, { status: 500 });
  }
}
