import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const MARKER = '714449';

const AIRLINES: Record<string, string> = {
  AA: 'American Airlines', AB: 'Air Berlin', AC: 'Air Canada',
  AF: 'Air France', AI: 'Air India', AY: 'Finnair',
  AZ: 'ITA Airways', B6: 'JetBlue', BA: 'British Airways',
  BR: 'EVA Air', CA: 'Air China', CI: 'China Airlines',
  CX: 'Cathay Pacific', CZ: 'China Southern', DL: 'Delta',
  EK: 'Emirates', EW: 'Eurowings', EY: 'Etihad',
  FR: 'Ryanair', FZ: 'flydubai', G9: 'Air Arabia',
  IB: 'Iberia', J2: 'Azerbaijan Airlines', JL: 'Japan Airlines',
  KE: 'Korean Air', KL: 'KLM', LH: 'Lufthansa',
  LO: 'LOT Polish', LX: 'Swiss', MH: 'Malaysia Airlines',
  MS: 'EgyptAir', MU: 'China Eastern', NH: 'ANA',
  NZ: 'Air New Zealand', OA: 'Olympic Air', OK: 'Czech Airlines',
  OS: 'Austrian Airlines', OZ: 'Asiana Airlines',
  PC: 'Pegasus Airlines', QF: 'Qantas', QR: 'Qatar Airways',
  RJ: 'Royal Jordanian', RO: 'TAROM', S7: 'S7 Airlines',
  SK: 'SAS', SN: 'Brussels Airlines', SQ: 'Singapore Airlines',
  SU: 'Aeroflot', TG: 'Thai Airways', TK: 'Turkish Airlines',
  TN: 'Air Tahiti Nui', TP: 'TAP Air Portugal',
  U2: 'easyJet', UA: 'United Airlines', UX: 'Air Europa',
  V7: 'Volotea', VN: 'Vietnam Airlines', VS: 'Virgin Atlantic',
  VY: 'Vueling', W6: 'Wizz Air', W9: 'Wizz Air UK',
  WN: 'Southwest', WS: 'WestJet',
  XC: 'Corendon Airlines', XQ: 'SunExpress', XY: 'flynas',
  ZI: 'Aigle Azur', ZT: 'Titan Airways',
  '5O': 'ASL Airlines', '6B': 'TUI fly Nordic',
  '7R': 'RusLine', '9W': 'Jet Airways',
  HV: 'Transavia', TO: 'Transavia France',
  DY: 'Norwegian', D8: 'Norwegian',
  TB: 'TUI fly Belgium', BY: 'TUI Airways',
  MT: 'Thomas Cook Airlines', TCX: 'Thomas Cook',
};

function airlineName(code: string): string {
  return AIRLINES[code] || code;
}

function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function bookingLink(
  origin: string, dest: string, depDate: string,
  retDate: string | null, adults: number, children: number
): string {
  // Aviasales search URL: {origin}{DDMM}{dest}{retDDMM?}{adults}
  const parts = depDate.split('-'); // YYYY-MM-DD
  const ddmm = parts[2] + parts[1];
  let path = `${origin}${ddmm}${dest}`;
  if (retDate) {
    const rp = retDate.split('-');
    path += rp[2] + rp[1];
  }
  path += String(adults);
  // Encode children as suffix (Aviasales uses child count digits after adults)
  if (children > 0) path += String(children);
  const encoded = encodeURIComponent(`https://www.aviasales.com/search/${path}`);
  return `https://tp.media/r?campaign_id=121&marker=${MARKER}&trs=512633&p=4114&u=${encoded}`;
}

export async function GET(req: NextRequest) {
  const token = process.env.TRAVELPAYOUTS_TOKEN;
  const { searchParams } = new URL(req.url);
  const origin = searchParams.get('origin')?.toUpperCase();
  const destination = searchParams.get('destination')?.toUpperCase();
  const depDate = searchParams.get('departure');
  const retDate = searchParams.get('return') || null;
  const adults = parseInt(searchParams.get('adults') || '1', 10);
  const children = parseInt(searchParams.get('children') || '0', 10);

  if (!origin || !destination || !depDate) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  if (!token) {
    return NextResponse.json({ error: 'TRAVELPAYOUTS_TOKEN not set' }, { status: 503 });
  }

  try {
    const depMonth = depDate.slice(0, 7); // YYYY-MM
    const headers = { Accept: 'application/json' };

    // Fire multiple queries in parallel for maximum coverage
    const queries: Promise<any>[] = [];

    // 1. Exact date (with return if provided)
    if (retDate) {
      queries.push(
        fetch(`https://api.travelpayouts.com/aviasales/v3/prices_for_dates?origin=${origin}&destination=${destination}&departure_at=${depDate}&return_at=${retDate}&currency=gbp&sorting=price&limit=10&market=gb&token=${token}`, { headers })
          .then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] }))
      );
    }

    // 2. Exact date one-way
    queries.push(
      fetch(`https://api.travelpayouts.com/aviasales/v3/prices_for_dates?origin=${origin}&destination=${destination}&departure_at=${depDate}&currency=gbp&sorting=price&limit=10&market=gb&one_way=true&token=${token}`, { headers })
        .then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] }))
    );

    // 3. Month-level query (returns cheapest per day across the month)
    queries.push(
      fetch(`https://api.travelpayouts.com/aviasales/v3/prices_for_dates?origin=${origin}&destination=${destination}&departure_at=${depMonth}&currency=gbp&sorting=price&limit=30&market=gb&one_way=true&token=${token}`, { headers })
        .then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] }))
    );

    const results = await Promise.all(queries);

    // Merge and deduplicate by airline+date
    const seen = new Set<string>();
    const allData: any[] = [];
    for (const res of results) {
      for (const f of (res.data || [])) {
        const key = `${f.airline}-${f.departure_at}-${f.price}`;
        if (!seen.has(key)) {
          seen.add(key);
          allData.push(f);
        }
      }
    }

    // Sort by price
    allData.sort((a: any, b: any) => a.price - b.price);

    if (!allData.length) {
      return NextResponse.json({ flights: [], message: 'No flights found for this route and date' });
    }

    const link = bookingLink(origin, destination, depDate, retDate, adults, children);

    const flights = allData.slice(0, 15).map((f: any) => {
      const durationMins = f.duration_to || f.duration || 0;
      return {
        airline: airlineName(f.airline),
        airlineCode: f.airline,
        gate: f.gate || null,
        price: f.price,
        currency: '£',
        stops: f.transfers === 0 ? 'Direct' : f.transfers === 1 ? '1 stop' : `${f.transfers} stops`,
        duration: formatDuration(durationMins),
        departure: f.departure_at || null,
        link,
      };
    });

    return NextResponse.json({ flights, origin, destination, depDate, retDate });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch flight prices', detail: err.message }, { status: 500 });
  }
}
