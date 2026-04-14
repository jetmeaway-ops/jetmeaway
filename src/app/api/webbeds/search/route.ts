import { NextRequest, NextResponse } from 'next/server';
import { searchAvailability, type WBGuest } from '@/lib/webbeds';

export const runtime = 'edge';

/**
 * WebBeds hotel availability search endpoint. Placeholder until
 * credentials are provisioned post-onboarding (Anthony/WebBeds, 16 Apr 2026).
 *
 * Query params:
 *   destination, checkIn, checkOut, adults, children (comma-separated ages),
 *   rooms (count), nationality, currency
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const destination = searchParams.get('destination') || '';
  const checkIn = searchParams.get('checkIn') || '';
  const checkOut = searchParams.get('checkOut') || '';
  const adults = parseInt(searchParams.get('adults') || '2', 10);
  const childrenStr = searchParams.get('children') || '';
  const children = childrenStr
    ? childrenStr.split(',').map(a => parseInt(a, 10)).filter(n => !isNaN(n))
    : [];
  const roomCount = parseInt(searchParams.get('rooms') || '1', 10);
  const nationality = searchParams.get('nationality') || 'GB';
  const currency = searchParams.get('currency') || 'GBP';

  if (!destination || !checkIn || !checkOut) {
    return NextResponse.json(
      { error: 'destination, checkIn, and checkOut are required' },
      { status: 400 }
    );
  }

  const rooms: WBGuest[] = Array.from({ length: roomCount }, () => ({
    adults,
    children,
  }));

  const result = await searchAvailability({
    destinationCode: destination,
    checkIn,
    checkOut,
    rooms,
    nationality,
    currency,
  });

  return NextResponse.json(result);
}
