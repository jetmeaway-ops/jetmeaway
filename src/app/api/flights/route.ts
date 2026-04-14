import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { applyMarkup, logFlightSearch } from '@/lib/travel-logic';

export const runtime = 'edge';

const DUFFEL_KEY = process.env.DUFFEL_TEST_TOKEN || process.env.DUFFEL_ACCESS_TOKEN || process.env.DUFFEL_API_KEY || '';
const TP_TOKEN = 'f797fbb7074a15838d5536c10be6f7b5';
const KV_TTL = 1800; // 30 min — keeps Duffel prices fresh vs aggregator staleness

/* ═══════════════════════════════════════════════════════════════════════════
   AIRLINES LOOKUP
   ═══════════════════════════════════════════════════════════════════════════ */

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

/* ═══════════════════════════════════════════════════════════════════════════
   DUFFEL FLIGHT SEARCH
   ═══════════════════════════════════════════════════════════════════════════ */

type CabinClass = 'economy' | 'premium_economy' | 'business' | 'first';

async function searchDuffel(
  origin: string,
  destination: string,
  depDate: string,
  retDate: string | null,
  adults: number,
  children: number,
  infants: number,
  cabinClass: CabinClass,
): Promise<any[]> {
  // Build slices
  const slices: any[] = [
    {
      origin,
      destination,
      departure_date: depDate,
    },
  ];

  if (retDate) {
    slices.push({
      origin: destination,
      destination: origin,
      departure_date: retDate,
    });
  }

  // Build passengers — Duffel expects adults as {type:'adult'} and under-18s by age.
  // We use default ages (child=8, infant=1) since the search form doesn't collect exact ages.
  const passengers: any[] = [];
  for (let i = 0; i < adults; i++) passengers.push({ type: 'adult' });
  for (let i = 0; i < children; i++) passengers.push({ age: 8 });
  for (let i = 0; i < infants; i++) passengers.push({ age: 1 });

  // Create offer request
  const offerRes = await fetch('https://api.duffel.com/air/offer_requests', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DUFFEL_KEY}`,
      'Duffel-Version': 'v2',
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      data: {
        slices,
        passengers,
        cabin_class: cabinClass,
        return_offers: true,
        max_connections: 1,
      },
    }),
  });

  if (!offerRes.ok) {
    const errText = await offerRes.text();
    console.error('Duffel error:', offerRes.status, errText);
    return [];
  }

  const offerJson = await offerRes.json();
  const offers = offerJson.data?.offers || [];

  return offers;
}

/** Transform Duffel offers into our standardised flight format (with markup) */
function transformDuffelOffers(offers: any[], paxCount: number): any[] {
  return offers.slice(0, 15).map((offer: any) => {
    const outSlice = offer.slices?.[0];
    const retSlice = offer.slices?.[1] || null;

    // Airline from first segment
    const firstSeg = outSlice?.segments?.[0];
    const airlineCode = firstSeg?.marketing_carrier?.iata_code || firstSeg?.operating_carrier?.iata_code || '';
    const airlineFullName = firstSeg?.marketing_carrier?.name || airlineName(airlineCode);

    // Duration in minutes
    const parseDuration = (iso: string | null): number => {
      if (!iso) return 0;
      const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
      if (!match) return 0;
      return (parseInt(match[1] || '0') * 60) + parseInt(match[2] || '0');
    };

    // Stops
    const outStops = (outSlice?.segments?.length || 1) - 1;
    const stopsLabel = outStops === 0 ? 'Direct' : outStops === 1 ? '1 stop' : `${outStops} stops`;

    // Price: Duffel returns total_amount for all passengers in the offer currency.
    // Divide by total pax count (adults + children + infants) so "per person" is a
    // fair average across everyone on the booking.
    const basePrice = parseFloat(offer.total_amount || '0');
    const perPerson = basePrice / Math.max(paxCount, 1);
    const totalWithMarkup = applyMarkup(perPerson);

    // Departure/arrival times
    const depTime = firstSeg?.departing_at || null;
    const lastOutSeg = outSlice?.segments?.[outSlice.segments.length - 1];
    const arrTime = lastOutSeg?.arriving_at || null;

    return {
      airline: airlineFullName,
      airlineCode,
      price: totalWithMarkup,         // per person, with markup
      basePrice: perPerson,            // per person, airline price only
      currency: '£',
      stops: stopsLabel,
      transfers: outStops,
      duration_to: parseDuration(outSlice?.duration),
      duration_back: retSlice ? parseDuration(retSlice.duration) : 0,
      departure_at: depTime,
      arrival_at: arrTime,
      return_at: retSlice?.segments?.[0]?.departing_at || null,
      flight_number: firstSeg?.marketing_carrier_flight_number
        ? `${airlineCode}${firstSeg.marketing_carrier_flight_number}`
        : null,
      offer_id: offer.id,              // Duffel offer ID for booking
      source: 'duffel',
      link: null,
    };
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   TRAVELPAYOUTS FALLBACK (cached prices)
   ═══════════════════════════════════════════════════════════════════════════ */

async function searchTravelpayouts(
  origin: string,
  destination: string,
  depDate: string,
  retDate: string | null,
  adults: number,
): Promise<any[]> {
  const headers = { Accept: 'application/json' };
  const queries: Promise<any>[] = [];

  if (retDate) {
    queries.push(
      fetch(`https://api.travelpayouts.com/aviasales/v3/prices_for_dates?origin=${origin}&destination=${destination}&departure_at=${depDate}&return_at=${retDate}&currency=gbp&sorting=price&limit=10&market=gb&token=${TP_TOKEN}`, { headers })
        .then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] }))
    );
  }

  queries.push(
    fetch(`https://api.travelpayouts.com/aviasales/v3/prices_for_dates?origin=${origin}&destination=${destination}&departure_at=${depDate}&currency=gbp&sorting=price&limit=10&market=gb&one_way=true&token=${TP_TOKEN}`, { headers })
      .then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] }))
  );

  const results = await Promise.all(queries);

  // Deduplicate
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

  return allData.slice(0, 10).map((f: any) => ({
    airline: airlineName(f.airline),
    airlineCode: f.airline,
    price: f.price,                    // Travelpayouts prices shown as-is (no markup — affiliate model)
    basePrice: f.price,
    currency: '£',
    stops: f.transfers === 0 ? 'Direct' : f.transfers === 1 ? '1 stop' : `${f.transfers} stops`,
    transfers: f.transfers,
    duration_to: f.duration_to || 0,
    duration_back: f.duration_back || 0,
    departure_at: f.departure_at || null,
    return_at: f.return_at || null,
    flight_number: f.flight_number || null,
    offer_id: null,
    source: 'travelpayouts',
    link: f.link || null,
  }));
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN HANDLER
   ═══════════════════════════════════════════════════════════════════════════ */

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const origin = searchParams.get('origin')?.toUpperCase();
  const destination = searchParams.get('destination')?.toUpperCase();
  const depDate = searchParams.get('departure');
  const retDate = searchParams.get('return') || null;
  const adults = parseInt(searchParams.get('adults') || '1', 10);
  const children = parseInt(searchParams.get('children') || '0', 10);
  const infants = parseInt(searchParams.get('infants') || '0', 10);
  const paxCount = adults + children + infants;
  const cabinParam = (searchParams.get('cabin') || 'economy').toLowerCase();
  const cabinClass: CabinClass =
    cabinParam === 'premium_economy' || cabinParam === 'business' || cabinParam === 'first'
      ? (cabinParam as CabinClass)
      : 'economy';
  const mode = searchParams.get('mode');
  const sessionId = searchParams.get('sid') || 'anon';

  if (!origin || !destination) {
    return NextResponse.json({ error: 'Missing origin or destination' }, { status: 400 });
  }

  const headers = { Accept: 'application/json' };

  // ── Calendar / month-matrix mode (Travelpayouts only — Duffel doesn't have this) ──
  if (mode === 'calendar') {
    const month = searchParams.get('month');
    if (!month) {
      return NextResponse.json({ error: 'Missing month param' }, { status: 400 });
    }

    const kvKey = `cal:${origin}:${destination}:${month}`;
    try {
      const cached = await kv.get<any>(kvKey);
      if (cached) return NextResponse.json({ ...cached, cached: true });
    } catch { /* KV miss */ }

    try {
      const url = `https://api.travelpayouts.com/v2/prices/month-matrix?origin=${origin}&destination=${destination}&month=${month}&currency=gbp&show_to_affiliates=true&token=${TP_TOKEN}`;
      const res = await fetch(url, { headers });
      if (!res.ok) return NextResponse.json({ success: false, data: [] });
      const json = await res.json();
      const result = { success: true, data: json.data || [] };
      try { await kv.set(kvKey, result, { ex: 21600 }); } catch {}
      return NextResponse.json(result);
    } catch {
      return NextResponse.json({ success: false, data: [] });
    }
  }

  // ── Price search mode ──
  if (!depDate) {
    return NextResponse.json({ error: 'Missing departure date' }, { status: 400 });
  }

  // Check cache (include children/infants so mixed-party searches don't collide)
  const kvKey = `flights:v4:${origin}:${destination}:${depDate}:${retDate || 'ow'}:${adults}c${children}i${infants}:${cabinClass}`;
  try {
    const cached = await kv.get<any>(kvKey);
    if (cached) return NextResponse.json({ ...cached, cached: true });
  } catch {}

  try {
    // Run Duffel and Travelpayouts in PARALLEL for faster results
    const duffelPromise: Promise<any[]> = DUFFEL_KEY
      ? searchDuffel(origin, destination, depDate, retDate, adults, children, infants, cabinClass)
          .then(offers => offers.length > 0 ? transformDuffelOffers(offers, paxCount) : [])
          .catch(err => { console.error('Duffel search failed:', err); return []; })
      : Promise.resolve([]);

    const tpPromise: Promise<any[]> = searchTravelpayouts(origin, destination, depDate, retDate, adults)
      .catch(err => { console.error('Travelpayouts search failed:', err); return []; });

    const [duffelFlights, tpFlights] = await Promise.all([duffelPromise, tpPromise]);

    // Merge & deduplicate: prefer Duffel (live prices) over Travelpayouts for same flight
    const seen = new Map<string, any>();
    for (const f of duffelFlights) {
      const key = f.flight_number
        ? `${f.flight_number}-${(f.departure_at || '').slice(0, 10)}`
        : `${f.airlineCode}-${(f.departure_at || '').slice(0, 10)}-${f.duration_to}`;
      const existing = seen.get(key);
      if (!existing || f.price < existing.price) {
        seen.set(key, f);
      }
    }
    for (const f of tpFlights) {
      const key = f.flight_number
        ? `${f.flight_number}-${(f.departure_at || '').slice(0, 10)}`
        : `${f.airlineCode}-${(f.departure_at || '').slice(0, 10)}-${f.duration_to}`;
      if (!seen.has(key)) {
        seen.set(key, f);
      }
    }

    const flights = Array.from(seen.values());
    flights.sort((a, b) => a.price - b.price);

    // Determine primary source label
    const source = duffelFlights.length > 0 && tpFlights.length > 0
      ? 'duffel+travelpayouts'
      : duffelFlights.length > 0 ? 'duffel' : 'travelpayouts';

    const result = {
      success: true,
      flights,
      source,
      origin,
      destination,
      depDate,
      retDate,
      adults,
      children,
      infants,
      cabinClass,
    };

    // Cache results
    try { await kv.set(kvKey, result, { ex: KV_TTL }); } catch {}

    // Log search to user's history (fire-and-forget — don't await)
    logFlightSearch(sessionId, {
      origin,
      destination,
      departure: depDate,
      returnDate: retDate,
      passengers: adults,
      cheapest: flights.length > 0 ? flights[0].price : null,
      ts: Date.now(),
    }).catch(() => {});

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch flight prices', detail: err.message }, { status: 500 });
  }
}
