import { NextRequest, NextResponse } from 'next/server';
import { searchFlights, type FlightLeg, type CabinClass } from '@/lib/liteapi-flights';

export const runtime = 'edge';

/** Minimal shape of a per-journey fare offer as we read it for fareOptions. */
type RawBag = { bagType?: string; weightKg?: number; pieces?: number };
type RawFareOffer = {
  offerId?: string;
  fare?: { family?: string | null };
  pricing?: { display?: { total?: number } };
  baggage?: { hasCheckedBag?: boolean; included?: RawBag[] } | null;
};

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
        // Phase 1: expose the fare families for this journey so the card can
        // offer a "Light (no bag) / Inclusive (23kg)" selector. Each is a
        // distinct bookable offerId. Cheapest first. total = WHOLE-PARTY price.
        //
        // DEDUPE by fare family: LiteAPI returns near-duplicate offers per
        // family — one with the checked-bag weightKg populated (converted:true)
        // and a cheaper twin that OMITS it (converted:false, only pieces). That
        // showed two "Ecofly" chips, one "20kg checked" and one just "Checked
        // bag". Collapse to one option per family (cheapest), and BORROW the
        // checked weight from whichever twin has it so every chip shows the kg.
        const famGroups = new Map<string, RawFareOffer[]>();
        for (const fo of (Array.isArray(j.offers) ? j.offers : [])) {
          if (!fo?.offerId || typeof fo?.pricing?.display?.total !== 'number') continue;
          const famKey = fo?.fare?.family ?? fo.offerId;
          if (!famGroups.has(famKey)) famGroups.set(famKey, []);
          famGroups.get(famKey)!.push(fo as RawFareOffer);
        }
        const fareOptions = [...famGroups.values()]
          .map((group) => {
            const cheapest = group.slice().sort(
              (a, b) => (a.pricing?.display?.total ?? Infinity) - (b.pricing?.display?.total ?? Infinity),
            )[0];
            // Best known checked weight across the whole family.
            let bestKg: number | null = null;
            for (const fo of group) {
              const chk = (fo.baggage?.included || []).find((b) => b?.bagType === 'checked');
              if (chk && typeof chk.weightKg === 'number') bestKg = Math.max(bestKg ?? 0, chk.weightKg);
            }
            // Clone the cheapest offer's baggage and inject the family weight
            // where LiteAPI left it blank, so the chip always shows the kg.
            let baggage: RawFareOffer['baggage'] = cheapest.baggage ?? null;
            if (cheapest.baggage && bestKg != null) {
              const cloned = JSON.parse(JSON.stringify(cheapest.baggage)) as NonNullable<RawFareOffer['baggage']>;
              const included: RawBag[] = Array.isArray(cloned.included) ? cloned.included : (cloned.included = []);
              const chk = included.find((b) => b?.bagType === 'checked');
              if (chk) {
                if (typeof chk.weightKg !== 'number') chk.weightKg = bestKg;
              } else if (cloned.hasCheckedBag) {
                included.push({ bagType: 'checked', pieces: 1, weightKg: bestKg });
              }
              baggage = cloned;
            }
            return {
              offerId: cheapest.offerId as string,
              fareFamily: cheapest.fare?.family ?? null,
              total: cheapest.pricing?.display?.total as number,
              baggage,
            };
          })
          .sort((a, b) => a.total - b.total);
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
          fareOptions,
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
