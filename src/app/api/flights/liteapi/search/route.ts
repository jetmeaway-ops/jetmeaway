import { NextRequest, NextResponse } from 'next/server';
import { searchFlights, type FlightLeg, type CabinClass } from '@/lib/liteapi-flights';

export const runtime = 'edge';

/**
 * LiteAPI Flights — search (SANDBOX-first).
 *
 * GET /api/flights/liteapi/search?from=LHR&to=JFK&date=2026-09-15&return=2026-09-22&adults=1&cabin=ECONOMY
 *   - `return` optional (one-way if omitted)
 *   - cabin: ECONOMY | PREMIUM_ECONOMY | BUSINESS | FIRST (default ECONOMY)
 *
 * Uses LITEAPI_FLIGHTS_KEY (fall back LITE_API_KEY). Point it at the `sand_…`
 * sandbox key to test without touching the hotel (production) key.
 *
 * Returns { offers: [...] } — a trimmed, easy-to-read list of the cheapest offer
 * per journey — plus `raw` (the full LiteAPI payload) for building the UI later.
 */
export async function GET(req: NextRequest) {
  // Parking gate (Kyte pattern): LiteAPI Flights stays dark until this env flag
  // is set. Production leaves it unset → empty search → zero flight rows →
  // checkout unreachable → nothing changes for live users. Preview sets it true.
  const LITEAPI_FLIGHTS_ENABLED = process.env.LITEAPI_FLIGHTS_ENABLED === 'true';
  if (!LITEAPI_FLIGHTS_ENABLED) return NextResponse.json({ query: null, count: 0, offers: [] });

  const p = req.nextUrl.searchParams;
  const from = (p.get('from') || '').trim().toUpperCase();
  const to = (p.get('to') || '').trim().toUpperCase();
  const date = (p.get('date') || '').trim();
  const ret = (p.get('return') || '').trim();
  const adults = Math.max(1, parseInt(p.get('adults') || '1', 10) || 1);
  const children = parseInt(p.get('children') || '0', 10) || 0;
  const infants = parseInt(p.get('infants') || '0', 10) || 0;
  const cabin = (p.get('cabin') || 'ECONOMY').toUpperCase() as CabinClass;
  const currency = (p.get('currency') || 'GBP').toUpperCase();

  if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: 'Required: from (IATA), to (IATA), date (YYYY-MM-DD). Optional: return, adults, children, infants, cabin, currency.' },
      { status: 400 },
    );
  }

  const legs: FlightLeg[] = [{ origin: from, destination: to, date, direction: 'OUTBOUND' }];
  if (/^\d{4}-\d{2}-\d{2}$/.test(ret)) {
    legs.push({ origin: to, destination: from, date: ret, direction: 'INBOUND' });
  }

  try {
    const results = await searchFlights({ legs, adults, children, infants, cabinClass: cabin, currency });

    // Flatten to the cheapest offer per journey for an easy-to-read response.
    const offers = results.flatMap((r) =>
      (r.journeys || []).map((j) => {
        const o = j.cheapestOffer;
        if (!o) return null;
        return {
          offerId: o.offerId,
          expiration: o.expiration,
          total: o.pricing?.display?.total ?? null,
          currency: o.pricing?.display?.currency ?? currency,
          base: o.pricing?.display?.base ?? null,
          taxes: o.pricing?.display?.taxes ?? null,
          fareFamily: o.fare?.family ?? null,
          seatsRemaining: o.fare?.seatsRemaining ?? null,
          baggage: o.baggage ?? null,
        };
      }).filter(Boolean),
    );

    return NextResponse.json({
      query: { from, to, date, return: ret || null, adults, children, infants, cabin, currency },
      count: offers.length,
      offers,
      raw: results, // full payload for the UI build; drop this once the UI is done
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Surface the LiteAPI status/text so sandbox-vs-prod key issues are obvious.
    return NextResponse.json({ error: 'Flight search failed', detail: message }, { status: 502 });
  }
}
