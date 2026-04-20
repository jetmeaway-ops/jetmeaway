import { NextRequest, NextResponse } from 'next/server';
import { initSearch } from '@/lib/travelpayouts-search';

export const runtime = 'edge';

/* ═══════════════════════════════════════════════════════════════════════════
   POST /api/flights/search
   Kicks off a Travelpayouts v1 async flight search and returns the
   search_id. The client then polls /api/flights/results for the life of
   the search (~20s max).

   Body:
     { origin, destination, departure, return?, adults, children?, infants?, cabin? }

   Response:
     { searchId: string }  OR  { error: string }
   ═══════════════════════════════════════════════════════════════════════════ */

type Body = {
  origin?: string;
  destination?: string;
  departure?: string;
  return?: string | null;
  adults?: number;
  children?: number;
  infants?: number;
  cabin?: 'economy' | 'business' | 'first';
};

const CABIN_CLASS: Record<string, 'Y' | 'C' | 'F'> = {
  economy: 'Y',
  business: 'C',
  first: 'F',
};

export async function POST(req: NextRequest) {
  let body: Body;
  try { body = (await req.json()) as Body; } catch {
    return NextResponse.json({ error: 'invalid json body' }, { status: 400 });
  }

  const origin = (body.origin || '').toUpperCase();
  const destination = (body.destination || '').toUpperCase();
  const departure = body.departure || '';
  const returnDate = body.return || null;
  const adults = Math.max(1, Number(body.adults) || 1);
  const children = Math.max(0, Number(body.children) || 0);
  const infants = Math.max(0, Number(body.infants) || 0);
  const tripClass = CABIN_CLASS[body.cabin || 'economy'] || 'Y';

  if (!origin || !destination || !departure) {
    return NextResponse.json({ error: 'origin, destination, departure are required' }, { status: 400 });
  }

  // Pass the caller's IP through to TP — required for their regional
  // pricing + compliance audit trail. Falls back to a neutral default.
  const userIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

  try {
    const { searchId } = await initSearch({
      origin,
      destination,
      departureDate: departure,
      returnDate,
      passengers: { adults, children, infants },
      tripClass,
      userIp,
    });
    return NextResponse.json({ searchId });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'search kickoff failed';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
