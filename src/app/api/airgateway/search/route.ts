import { NextRequest, NextResponse } from 'next/server';
import { searchFlights, type AGPassenger } from '@/lib/airgateway';

export const runtime = 'edge';

/**
 * AirGateway NDC flight search endpoint. Placeholder until credentials
 * are provisioned post-discovery-call (15 Apr 2026).
 *
 * Query params mirror /api/flights:
 *   origin, destination, departure, return, adults, children, infants, cabin
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const origin = searchParams.get('origin') || '';
  const destination = searchParams.get('destination') || '';
  const departureDate = searchParams.get('departure') || '';
  const returnDate = searchParams.get('return') || undefined;
  const adults = parseInt(searchParams.get('adults') || '1', 10);
  const children = parseInt(searchParams.get('children') || '0', 10);
  const infants = parseInt(searchParams.get('infants') || '0', 10);
  const cabin = (searchParams.get('cabin') || 'economy') as
    | 'economy' | 'premium_economy' | 'business' | 'first';

  if (!origin || !destination || !departureDate) {
    return NextResponse.json(
      { error: 'origin, destination, and departure are required' },
      { status: 400 }
    );
  }

  const passengers: AGPassenger[] = [
    ...Array(adults).fill({ type: 'adult' as const }),
    ...Array(children).fill({ type: 'child' as const }),
    ...Array(infants).fill({ type: 'infant' as const }),
  ];

  const result = await searchFlights({
    origin,
    destination,
    departureDate,
    returnDate,
    passengers,
    cabin,
  });

  return NextResponse.json(result);
}
