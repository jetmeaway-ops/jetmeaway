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
  '3U': 'Sichuan Airlines', '4Y': 'Eurowings Discover', '4Z': 'Airlink',
  A3: 'Aegean Airlines', AA: 'American Airlines', AC: 'Air Canada',
  AD: 'Azul', AF: 'Air France', AH: 'Air Algérie', AI: 'Air India',
  AM: 'Aeromexico', AR: 'Aerolíneas Argentinas', AS: 'Alaska Airlines',
  AT: 'Royal Air Maroc', AV: 'Avianca', AY: 'Finnair', AZ: 'ITA Airways',
  B6: 'JetBlue', BA: 'British Airways', BG: 'Biman Bangladesh',
  BP: 'Air Botswana', BR: 'EVA Air', BT: 'airBaltic', BW: 'Caribbean Airlines',
  BY: 'TUI Airways', CA: 'Air China', CI: 'China Airlines', CM: 'Copa Airlines',
  CX: 'Cathay Pacific', CZ: 'China Southern', D8: 'Norwegian', DE: 'Condor',
  DL: 'Delta', DT: 'TAAG Angola', DY: 'Norwegian', EI: 'Aer Lingus',
  EK: 'Emirates', ET: 'Ethiopian Airlines', EW: 'Eurowings', EY: 'Etihad',
  FB: 'Bulgaria Air', FI: 'Icelandair', FJ: 'Fiji Airways', FR: 'Ryanair',
  FZ: 'flydubai', G3: 'GOL', G9: 'Air Arabia', GA: 'Garuda Indonesia',
  GP: 'APG Airlines', GQ: 'SKY express', HA: 'Hawaiian Airlines',
  HM: 'Air Seychelles', HU: 'Hainan Airlines', HV: 'Transavia',
  HX: 'Hong Kong Airlines', I2: 'Iberia Express', IB: 'Iberia',
  IE: 'Solomon Airlines', J2: 'Azerbaijan Airlines', JL: 'Japan Airlines',
  JU: 'Air Serbia', KE: 'Korean Air', KL: 'KLM', KM: 'Air Malta',
  KQ: 'Kenya Airways', KU: 'Kuwait Airways', KX: 'Cayman Airways',
  LF: 'Contour Airlines', LG: 'Luxair', LH: 'Lufthansa', LO: 'LOT Polish',
  LS: 'Jet2', LX: 'Swiss', LY: 'EL AL', MD: 'Air Madagascar',
  ME: 'Middle East Airlines', MF: 'XiamenAir', MH: 'Malaysia Airlines',
  MK: 'Air Mauritius', MS: 'EgyptAir', MU: 'China Eastern', NF: 'Air Vanuatu',
  NH: 'ANA', NK: 'Spirit Airlines', NP: 'Nile Air', NX: 'Air Macau',
  NZ: 'Air New Zealand', OA: 'Olympic Air', OB: 'BoA Regional',
  OD: 'Malindo Air', OK: 'Czech Airlines', OM: 'MIAT Mongolian',
  OS: 'Austrian Airlines', OU: 'Croatia Airlines', OZ: 'Asiana Airlines',
  PC: 'Pegasus Airlines', PD: 'Porter Airlines',
  PK: 'Pakistan International', // the key reason we built this route
  PG: 'Bangkok Airways', PR: 'Philippine Airlines', PS: 'Ukraine International',
  PW: 'Precision Air', PX: 'Air Niugini', PY: 'Surinam Airways',
  QF: 'Qantas', QR: 'Qatar Airways', RA: 'Nepal Airlines',
  RC: 'Atlantic Airways', RJ: 'Royal Jordanian', RO: 'Tarom',
  S4: 'Azores Airlines', S7: 'S7 Airlines', SA: 'South African Airways',
  SK: 'SAS', SN: 'Brussels Airlines', SQ: 'Singapore Airlines',
  SS: 'Corsair', SU: 'Aeroflot', SV: 'Saudia', TC: 'Air Tanzania',
  TG: 'Thai Airways', TK: 'Turkish Airlines', TM: 'LAM Mozambique',
  TN: 'Air Tahiti Nui', TP: 'TAP Air Portugal', TS: 'Air Transat',
  TU: 'Tunisair', U2: 'easyJet', UA: 'United Airlines', UL: 'SriLankan Airlines',
  UP: 'Bahamasair', UR: 'Uganda Airlines', UU: 'Air Austral',
  UX: 'Air Europa', V7: 'Volotea', VA: 'Virgin Australia',
  VN: 'Vietnam Airlines', VS: 'Virgin Atlantic', VW: 'Aeromar',
  VY: 'Vueling', W6: 'Wizz Air', W9: 'Wizz Air UK', WB: 'RwandAir',
  WM: 'Winair', WN: 'Southwest', WS: 'WestJet', WY: 'Oman Air',
  XQ: 'SunExpress', XY: 'flynas', Y4: 'Volaris', ZH: 'Shenzhen Airlines',
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
