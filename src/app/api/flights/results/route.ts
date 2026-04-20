import { NextRequest, NextResponse } from 'next/server';
import { fetchResults, type NormalisedFlight } from '@/lib/travelpayouts-search';

export const runtime = 'edge';

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/flights/results?searchId=...
   Returns one poll's worth of flights for a previously-initiated search.

   We humanise airline codes here (shared dict) and dedupe WITHIN this
   chunk (same flight_number → keep lowest price). The client further
   merges across polls using the same rule.

   Response:
     { complete: boolean, flights: UIFlight[] }
   ═══════════════════════════════════════════════════════════════════════════ */

const AIRLINES: Record<string, string> = {
  AA: 'American Airlines', AC: 'Air Canada', AF: 'Air France', AI: 'Air India',
  AY: 'Finnair', AZ: 'ITA Airways', B6: 'JetBlue', BA: 'British Airways',
  BR: 'EVA Air', BY: 'TUI Airways', CA: 'Air China', CI: 'China Airlines',
  CX: 'Cathay Pacific', CZ: 'China Southern', D8: 'Norwegian', DL: 'Delta',
  DY: 'Norwegian', EI: 'Aer Lingus', EK: 'Emirates', EW: 'Eurowings',
  EY: 'Etihad', FR: 'Ryanair', FZ: 'flydubai', G9: 'Air Arabia',
  HV: 'Transavia', IB: 'Iberia', J2: 'Azerbaijan Airlines', JL: 'Japan Airlines',
  KE: 'Korean Air', KL: 'KLM', LH: 'Lufthansa', LO: 'LOT Polish',
  LS: 'Jet2', LX: 'Swiss', MH: 'Malaysia Airlines', MS: 'EgyptAir',
  MU: 'China Eastern', NH: 'ANA', NZ: 'Air New Zealand', OK: 'Czech Airlines',
  OS: 'Austrian Airlines', OZ: 'Asiana Airlines', PC: 'Pegasus Airlines',
  PK: 'Pakistan International', // the key reason we built this route
  QF: 'Qantas', QR: 'Qatar Airways', RJ: 'Royal Jordanian', S7: 'S7 Airlines',
  SK: 'SAS', SN: 'Brussels Airlines', SQ: 'Singapore Airlines', SU: 'Aeroflot',
  TG: 'Thai Airways', TK: 'Turkish Airlines', TP: 'TAP Air Portugal',
  U2: 'easyJet', UA: 'United Airlines', UL: 'SriLankan Airlines',
  UX: 'Air Europa', VN: 'Vietnam Airlines', VS: 'Virgin Atlantic',
  VY: 'Vueling', W6: 'Wizz Air', W9: 'Wizz Air UK', WN: 'Southwest',
  WS: 'WestJet', WY: 'Oman Air', XY: 'flynas',
};

function airlineName(code: string): string {
  return AIRLINES[code] || code;
}

type UIFlight = Omit<NormalisedFlight, 'airline'> & {
  airline: string;
  basePrice: number;
  offer_id: null;
};

export async function GET(req: NextRequest) {
  const searchId = req.nextUrl.searchParams.get('searchId') || '';
  if (!searchId) {
    return NextResponse.json({ error: 'searchId required' }, { status: 400 });
  }

  try {
    const { complete, flights } = await fetchResults(searchId);

    // Dedupe within this chunk: same flight_number on same dep date →
    // keep lowest price. Agents often return the same proposal multiple
    // times at slightly different prices.
    const bestByKey = new Map<string, NormalisedFlight>();
    for (const f of flights) {
      const depDay = (f.departure_at || '').slice(0, 10);
      const key = f.flight_number
        ? `${f.flight_number}-${depDay}`
        : `${f.airlineCode}-${depDay}-${f.duration_to}`;
      const existing = bestByKey.get(key);
      if (!existing || f.price < existing.price) bestByKey.set(key, f);
    }

    const humanised: UIFlight[] = Array.from(bestByKey.values()).map((f) => ({
      ...f,
      airline: airlineName(f.airlineCode),
      basePrice: f.price,
      offer_id: null,
    }));

    return NextResponse.json({ complete, flights: humanised });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'results fetch failed';
    return NextResponse.json({ error: msg, complete: false, flights: [] }, { status: 502 });
  }
}
