import { NextRequest, NextResponse } from 'next/server';
import { getHotels, type Occupancy } from '@/lib/liteapi';

export const runtime = 'edge';

/**
 * GET /api/liteapi/search
 *   ?destinationId=...
 *   &checkIn=YYYY-MM-DD
 *   &checkOut=YYYY-MM-DD
 *   &adults=2
 *   &children=8,4          (ages, optional)
 *   &currency=GBP          (optional, default GBP)
 *   &nationality=GB        (optional, default GB)
 *   &limit=25              (optional)
 *
 * Returns { success, offers: HotelOffer[] } — each offer has an offerId to
 * feed into /api/liteapi/book.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const destinationId = searchParams.get('destinationId') || '';
  const cityName = searchParams.get('cityName') || '';
  const countryCode = searchParams.get('countryCode') || '';
  const checkIn = searchParams.get('checkIn') || '';
  const checkOut = searchParams.get('checkOut') || '';
  const adults = parseInt(searchParams.get('adults') || '2', 10);
  const childrenRaw = searchParams.get('children') || '';
  const currency = searchParams.get('currency') || 'GBP';
  const nationality = searchParams.get('nationality') || 'GB';
  const limit = parseInt(searchParams.get('limit') || '25', 10);

  if ((!destinationId && !(cityName && countryCode)) || !checkIn || !checkOut) {
    return NextResponse.json(
      { success: false, error: 'destinationId OR cityName+countryCode, plus checkIn and checkOut, are required' },
      { status: 400 },
    );
  }

  const children = childrenRaw
    ? childrenRaw.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n))
    : [];

  const occupancy: Occupancy[] = [{ adults, children }];

  try {
    const offers = await getHotels({
      ...(destinationId ? { destinationId } : {}),
      ...(cityName ? { cityName } : {}),
      ...(countryCode ? { countryCode } : {}),
      checkIn,
      checkOut,
      occupancy,
      currency,
      guestNationality: nationality,
      limit,
    });
    return NextResponse.json({ success: true, offers });
  } catch (err: any) {
    console.error('[liteapi/search]', err?.message || err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Search failed' },
      { status: 500 },
    );
  }
}
