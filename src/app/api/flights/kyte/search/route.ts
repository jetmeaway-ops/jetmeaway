import { NextRequest, NextResponse } from 'next/server';
import {
  shopFlights,
  newKyteContext,
  KyteAuthError,
  KyteConfigError,
  KyteProxyError,
  KyteServerError,
  KyteValidationError,
  type Cabin,
  type KyteShopRequest,
} from '@/lib/kyte';

/* ═══════════════════════════════════════════════════════════════════════════
   POST /api/flights/kyte/search

   Kicks off a Kyte LCC ShopFlights call via the Fixie static-IP proxy.
   Synchronous (Kyte's Shop endpoint is not async) — returns offers in the
   same response.

   ⚠ Node runtime, NOT Edge. Kyte requires undici.ProxyAgent which is not
   available on Vercel Edge. The rest of the app stays on Edge.

   Body:
     { origin, destination, departure, return?, adults, children?, infants?,
       cabin?, airlines? }

   Response (200):
     { transactionId, offerCount, offers, raw }
     - transactionId: pass back to subsequent Book/Payment/Retrieve calls
     - offerCount: number of offers in the response
     - offers: Kyte's offers map keyed by offerId (raw shape, not yet
       normalised to JetMeAway flight rows — Phase 3 work)
     - raw: any other top-level keys Kyte returned, useful for debugging

   Response (4xx/5xx):
     { error: string, status?: number }
   ═══════════════════════════════════════════════════════════════════════════ */

export const runtime = 'nodejs';
export const maxDuration = 30;

type Body = {
  origin?: string;
  destination?: string;
  departure?: string;
  return?: string | null;
  adults?: number;
  children?: number;
  infants?: number;
  cabin?: Cabin;
  airlines?: string;
  nonStopFlight?: boolean;
};

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid json body' }, { status: 400 });
  }

  const origin = (body.origin || '').toUpperCase();
  const destination = (body.destination || '').toUpperCase();
  const departure = body.departure || '';
  const returnDate = body.return || null;
  const adults = Math.max(1, Number(body.adults) || 1);
  const children = Math.max(0, Number(body.children) || 0);
  const infants = Math.max(0, Number(body.infants) || 0);
  const cabin: Cabin = body.cabin || 'economy';

  if (!origin || !destination || !departure) {
    return NextResponse.json(
      { error: 'origin, destination, departure are required' },
      { status: 400 },
    );
  }
  if (!/^[A-Z]{3}$/.test(origin) || !/^[A-Z]{3}$/.test(destination)) {
    return NextResponse.json(
      { error: 'origin and destination must be IATA-3 codes' },
      { status: 400 },
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(departure)) {
    return NextResponse.json(
      { error: 'departure must be YYYY-MM-DD' },
      { status: 400 },
    );
  }

  // Kyte's passengers shape is age-based. Map our adults/children/infants
  // to representative ages. Kyte LCC sample uses adult age=30; children
  // and infants we approximate (LCC fare classes typically only care
  // about age bucket: adult/child/infant).
  const passengers: Array<{ age: number }> = [
    ...Array.from({ length: adults }, () => ({ age: 30 })),
    ...Array.from({ length: children }, () => ({ age: 8 })),
    ...Array.from({ length: infants }, () => ({ age: 1 })),
  ];

  const journeys = [
    { departureAirport: origin, arrivalAirport: destination, date: { main: departure } },
  ];
  if (returnDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(returnDate)) {
      return NextResponse.json(
        { error: 'return must be YYYY-MM-DD' },
        { status: 400 },
      );
    }
    journeys.push({
      departureAirport: destination,
      arrivalAirport: origin,
      date: { main: returnDate },
    });
  }

  const shopReq: KyteShopRequest = {
    journeys,
    cabinType: cabin,
    nonStopFlight: body.nonStopFlight ?? false,
    exactMatch: true,
    flexibility: 'lowest',
    passengers,
  };

  const ctx = newKyteContext();

  try {
    const res = await shopFlights(shopReq, ctx, { airlines: body.airlines });
    const offers = res.offers || {};
    const offerCount = Object.keys(offers).length;
    // Expose `flightSolutions` and `legs` at top level — the frontend
    // converter (kyteOffersToFlightResults in flights-client) needs to
    // resolve solution IDs into segments/airline/duration. `raw` carries
    // anything else Kyte returned, useful for debug only.
    const flightSolutions = (res as { flightSolutions?: unknown }).flightSolutions;
    const legs = (res as { legs?: unknown }).legs;
    const {
      offers: _o,
      flightSolutions: _fs,
      legs: _legs,
      ...raw
    } = res as Record<string, unknown> & { offers?: unknown; flightSolutions?: unknown; legs?: unknown };
    return NextResponse.json({
      transactionId: ctx.transactionId,
      offerCount,
      offers,
      flightSolutions,
      legs,
      raw,
    });
  } catch (err) {
    if (err instanceof KyteConfigError) {
      return NextResponse.json(
        { error: 'kyte not configured', detail: err.message },
        { status: 503 },
      );
    }
    if (err instanceof KyteProxyError) {
      return NextResponse.json(
        { error: 'kyte proxy error', detail: err.message },
        { status: 502 },
      );
    }
    if (err instanceof KyteAuthError) {
      return NextResponse.json(
        { error: 'kyte auth/IP rejected', status: err.statusCode },
        { status: 502 },
      );
    }
    if (err instanceof KyteValidationError) {
      return NextResponse.json(
        { error: err.message, status: err.statusCode },
        { status: 400 },
      );
    }
    if (err instanceof KyteServerError) {
      return NextResponse.json(
        { error: 'kyte upstream error', status: err.statusCode },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { error: 'unexpected error', detail: (err as Error).message },
      { status: 500 },
    );
  }
}
