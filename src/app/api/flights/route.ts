import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// Travelpayouts Flight Data API — free for affiliates
// Token: get yours at travelpayouts.com → Dashboard → API → Your token
const TP_TOKEN = process.env.TRAVELPAYOUTS_TOKEN;
const MARKER = '714449';

// Airline names lookup
const AIRLINES: Record<string, string> = {
  AA: 'American Airlines', AB: 'Air Berlin', AC: 'Air Canada',
  AF: 'Air France', AI: 'Air India', AY: 'Finnair',
  AZ: 'ITA Airways', B6: 'JetBlue', BA: 'British Airways',
  BR: 'EVA Air', CA: 'Air China', CI: 'China Airlines',
  CX: 'Cathay Pacific', CZ: 'China Southern', DL: 'Delta',
  EK: 'Emirates', EW: 'Eurowings', EY: 'Etihad',
  FZ: 'flydubai', G9: 'Air Arabia', IB: 'Iberia',
  J2: 'Azerbaijan Airlines', JL: 'Japan Airlines',
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
  VY: 'Vueling', W6: 'Wizz Air', WN: 'Southwest',
  WS: 'WestJet', XY: 'flynas', ZI: 'Aigle Azur',
};

function airlineName(code: string): string {
  return AIRLINES[code] || code;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function bookingLink(origin: string, dest: string, depDate: string): string {
  // Aviasales date format: DDMM
  const parts = depDate.split('-');
  const ddmm = parts[2] + parts[1];
  return `https://tp.media/r?campaign_id=121&marker=${MARKER}&trs=512633&p=4114&u=https%3A%2F%2Fwww.aviasales.com%2Fsearch%2F${origin}${ddmm}${dest}1`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const origin = searchParams.get('origin')?.toUpperCase();
  const destination = searchParams.get('destination')?.toUpperCase();
  const depDate = searchParams.get('departure');
  const retDate = searchParams.get('return');
  const adults = searchParams.get('adults') || '1';
  const children = searchParams.get('children') || '0';
  const infants = searchParams.get('infants') || '0';

  if (!origin || !destination || !depDate) {
    return NextResponse.json({ error: 'Missing required parameters: origin, destination, departure' }, { status: 400 });
  }

  if (!TP_TOKEN) {
    return NextResponse.json(
      { error: 'TRAVELPAYOUTS_TOKEN not set. Add it to your .env.local file.' },
      { status: 503 }
    );
  }

  try {
    const params = new URLSearchParams({
      origin,
      destination,
      departure_at: depDate,
      currency: 'gbp',
      sorting: 'price',
      limit: '10',
      market: 'gb',
      token: TP_TOKEN,
    });

    if (retDate) params.set('return_at', retDate);
    if (!retDate) params.set('one_way', 'true');

    const url = `https://api.travelpayouts.com/aviasales/v3/prices_for_dates?${params}`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Travelpayouts API error:', res.status, text);
      return NextResponse.json({ error: 'Flight data API error', status: res.status }, { status: 502 });
    }

    const json = await res.json();

    // API returns { data: [...] } — no success field
    if (!json.data?.length) {
      return NextResponse.json({ flights: [], message: 'No flights found for this route and date' });
    }

    // Shape the results
    const flights = json.data.map((f: any) => ({
      airline: airlineName(f.airline),
      airlineCode: f.airline,
      price: f.price,
      currency: '£',
      stops: f.transfers === 0 ? 'Direct' : f.transfers === 1 ? '1 stop' : `${f.transfers} stops`,
      duration: f.duration ? formatDuration(f.duration) : null,
      departure: f.departure_at || null,
      link: bookingLink(origin, destination, depDate),
    }));

    return NextResponse.json({ flights, origin, destination, depDate, retDate });
  } catch (err: any) {
    console.error('Flights route error:', err);
    return NextResponse.json({ error: 'Failed to fetch flight prices', detail: err.message }, { status: 500 });
  }
}
