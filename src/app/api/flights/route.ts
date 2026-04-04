import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const runtime = 'edge';

const TOKEN = 'f797fbb7074a15838d5536c10be6f7b5';
const MARKER = '714449';
const KV_TTL = 21600; // 6 hours in seconds

const AIRLINES: Record<string, string> = {
  AA: 'American Airlines', AB: 'Air Berlin', AC: 'Air Canada',
  AF: 'Air France', AI: 'Air India', AY: 'Finnair',
  AZ: 'ITA Airways', B6: 'JetBlue', BA: 'British Airways',
  BR: 'EVA Air', BY: 'TUI Airways', CA: 'Air China',
  CI: 'China Airlines', CX: 'Cathay Pacific', CZ: 'China Southern',
  D8: 'Norwegian', DL: 'Delta', DY: 'Norwegian',
  EI: 'Aer Lingus', EK: 'Emirates', EW: 'Eurowings',
  EY: 'Etihad', FR: 'Ryanair', FZ: 'flydubai',
  G9: 'Air Arabia', HV: 'Transavia', IB: 'Iberia',
  J2: 'Azerbaijan Airlines', JL: 'Japan Airlines',
  KE: 'Korean Air', KL: 'KLM', LH: 'Lufthansa',
  LO: 'LOT Polish', LS: 'Jet2', LX: 'Swiss',
  MH: 'Malaysia Airlines', MS: 'EgyptAir', MT: 'Thomas Cook Airlines',
  MU: 'China Eastern', NH: 'ANA', NZ: 'Air New Zealand',
  OA: 'Olympic Air', OK: 'Czech Airlines', OS: 'Austrian Airlines',
  OZ: 'Asiana Airlines', PC: 'Pegasus Airlines',
  QF: 'Qantas', QR: 'Qatar Airways',
  RJ: 'Royal Jordanian', RO: 'TAROM', S7: 'S7 Airlines',
  SK: 'SAS', SN: 'Brussels Airlines', SQ: 'Singapore Airlines',
  SU: 'Aeroflot', TB: 'TUI fly Belgium', TG: 'Thai Airways',
  TK: 'Turkish Airlines', TN: 'Air Tahiti Nui',
  TO: 'Transavia France', TP: 'TAP Air Portugal',
  U2: 'easyJet', UA: 'United Airlines', UX: 'Air Europa',
  V7: 'Volotea', VN: 'Vietnam Airlines', VS: 'Virgin Atlantic',
  VY: 'Vueling', W6: 'Wizz Air', W9: 'Wizz Air UK',
  WN: 'Southwest', WS: 'WestJet',
  XC: 'Corendon Airlines', XQ: 'SunExpress', XY: 'flynas',
  '5O': 'ASL Airlines', '6B': 'TUI fly Nordic',
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const origin = searchParams.get('origin')?.toUpperCase();
  const destination = searchParams.get('destination')?.toUpperCase();
  const depDate = searchParams.get('departure');
  const retDate = searchParams.get('return') || null;
  const adults = parseInt(searchParams.get('adults') || '1', 10);
  const mode = searchParams.get('mode'); // 'calendar' for month-matrix

  if (!origin || !destination) {
    return NextResponse.json({ error: 'Missing origin or destination' }, { status: 400 });
  }

  const headers = { Accept: 'application/json' };

  // ── Calendar / month-matrix mode ──
  if (mode === 'calendar') {
    const month = searchParams.get('month'); // YYYY-MM
    if (!month) {
      return NextResponse.json({ error: 'Missing month param' }, { status: 400 });
    }

    const kvKey = `cal:${origin}:${destination}:${month}`;
    try {
      const cached = await kv.get<any>(kvKey);
      if (cached) {
        return NextResponse.json({ ...cached, cached: true });
      }
    } catch { /* KV miss — continue */ }

    try {
      const url = `https://api.travelpayouts.com/v2/prices/month-matrix?origin=${origin}&destination=${destination}&month=${month}&currency=gbp&show_to_affiliates=true&token=${TOKEN}`;
      const res = await fetch(url, { headers });
      if (!res.ok) {
        return NextResponse.json({ success: false, data: [] });
      }
      const json = await res.json();
      const result = { success: true, data: json.data || [] };

      try { await kv.set(kvKey, result, { ex: KV_TTL }); } catch { /* KV write fail */ }

      return NextResponse.json(result);
    } catch {
      return NextResponse.json({ success: false, data: [] });
    }
  }

  // ── Price search mode (default) ──
  if (!depDate) {
    return NextResponse.json({ error: 'Missing departure date' }, { status: 400 });
  }

  const kvKey = `flights:${origin}:${destination}:${depDate}:${retDate || 'ow'}`;
  try {
    const cached = await kv.get<any>(kvKey);
    if (cached) {
      return NextResponse.json({ ...cached, cached: true });
    }
  } catch { /* KV miss */ }

  try {
    const queries: Promise<any>[] = [];

    // Query 1: exact dates (return trip)
    if (retDate) {
      queries.push(
        fetch(`https://api.travelpayouts.com/aviasales/v3/prices_for_dates?origin=${origin}&destination=${destination}&departure_at=${depDate}&return_at=${retDate}&currency=gbp&sorting=price&limit=10&market=gb&token=${TOKEN}`, { headers })
          .then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] }))
      );
    }

    // Query 2: exact departure date one-way
    queries.push(
      fetch(`https://api.travelpayouts.com/aviasales/v3/prices_for_dates?origin=${origin}&destination=${destination}&departure_at=${depDate}&currency=gbp&sorting=price&limit=10&market=gb&one_way=true&token=${TOKEN}`, { headers })
        .then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] }))
    );

    // Query 3: broader month search
    const depMonth = depDate.slice(0, 7);
    queries.push(
      fetch(`https://api.travelpayouts.com/aviasales/v3/prices_for_dates?origin=${origin}&destination=${destination}&departure_at=${depMonth}&currency=gbp&sorting=price&limit=30&market=gb&token=${TOKEN}`, { headers })
        .then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] }))
    );

    const results = await Promise.all(queries);

    // Deduplicate: by flight_number + departure date (keep cheapest), fallback to airline + departure_at
    const bestByKey = new Map<string, any>();
    for (const res of results) {
      for (const f of (res.data || [])) {
        const depDay = (f.departure_at || '').slice(0, 10);
        const key = f.flight_number
          ? `${f.flight_number}-${depDay}`
          : `${f.airline}-${depDay}-${f.duration_to}`;
        const existing = bestByKey.get(key);
        if (!existing || f.price < existing.price) {
          bestByKey.set(key, f);
        }
      }
    }
    const allData = Array.from(bestByKey.values());
    allData.sort((a: any, b: any) => a.price - b.price);

    const flights = allData.slice(0, 10).map((f: any) => ({
      airline: airlineName(f.airline),
      airlineCode: f.airline,
      price: f.price,
      currency: '£',
      stops: f.transfers === 0 ? 'Direct' : f.transfers === 1 ? '1 stop' : `${f.transfers} stops`,
      transfers: f.transfers,
      duration_to: f.duration_to || 0,
      duration_back: f.duration_back || 0,
      departure_at: f.departure_at || null,
      return_at: f.return_at || null,
      flight_number: f.flight_number || null,
      link: f.link || null,
    }));

    const result = {
      success: true,
      flights,
      origin,
      destination,
      depDate,
      retDate,
      adults,
    };

    try { await kv.set(kvKey, result, { ex: KV_TTL }); } catch { /* KV write fail */ }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch flight prices', detail: err.message }, { status: 500 });
  }
}
