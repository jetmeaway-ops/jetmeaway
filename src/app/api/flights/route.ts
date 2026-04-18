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

  // Main queries — return + one-way with bumped limit (30) so the tail
  // isn't chopped. Aviasales v3 groups by cheapest-per-flight-number, so
  // on premium OD pairs (e.g. LHR→DXB) a limit of 10 was silently hiding
  // BA/VS/Emirates direct rotations behind cheaper 1-stop fares.
  if (retDate) {
    queries.push(
      fetch(`https://api.travelpayouts.com/aviasales/v3/prices_for_dates?origin=${origin}&destination=${destination}&departure_at=${depDate}&return_at=${retDate}&currency=gbp&sorting=price&limit=30&market=gb&token=${TP_TOKEN}`, { headers })
        .then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] }))
    );
    // Dedicated direct-only pull — guarantees direct flights are present
    // in the result set instead of being hidden behind cheaper 1-stop
    // fares by the cheapest-per-flight grouping.
    queries.push(
      fetch(`https://api.travelpayouts.com/aviasales/v3/prices_for_dates?origin=${origin}&destination=${destination}&departure_at=${depDate}&return_at=${retDate}&currency=gbp&sorting=price&limit=10&market=gb&direct=true&token=${TP_TOKEN}`, { headers })
        .then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] }))
    );
  }

  queries.push(
    fetch(`https://api.travelpayouts.com/aviasales/v3/prices_for_dates?origin=${origin}&destination=${destination}&departure_at=${depDate}&currency=gbp&sorting=price&limit=30&market=gb&one_way=true&token=${TP_TOKEN}`, { headers })
      .then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] }))
  );
  queries.push(
    fetch(`https://api.travelpayouts.com/aviasales/v3/prices_for_dates?origin=${origin}&destination=${destination}&departure_at=${depDate}&currency=gbp&sorting=price&limit=10&market=gb&one_way=true&direct=true&token=${TP_TOKEN}`, { headers })
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

  // 20 rows is enough to surface ~3 direct + ~10 one-stop + tail; the UI
  // filter sidebar makes further trimming the user's choice, not ours.
  return allData.slice(0, 20).map((f: any) => ({
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

  // ── Date-strip mode (D−3 … D+3 cheapest per date) ──
  // Used by the <DateMatrixStrip /> on the flight results page so users
  // can see how much they'd save by shifting +/- 3 days without
  // re-running the full Duffel flow (which would 7× API usage).
  //
  // Previously did 7 parallel `prices_for_dates` calls. That endpoint
  // is a round-trip cache and was sparse for almost every OD — popular
  // routes like LHR→DXB returned data for the exact selected pair only,
  // 6/7 cells showed "—".
  //
  // Now we hit `/v1/prices/calendar` — a whole-month cheapest-per-date
  // matrix built for this exact use case. One call (or two when the
  // ±3 window crosses a month boundary) covers the whole strip with
  // ~15-25× more hit-rate. Selected cell still forced to the live
  // main-search price so the strip never contradicts results below.
  if (mode === 'datestrip') {
    if (!depDate) {
      return NextResponse.json({ error: 'Missing departure date' }, { status: 400 });
    }
    // v5 — cache key now keys on intended trip length. A user looking
    // at a 14n trip from LHR→DXB must not be served a cached strip
    // populated for someone's 3n trip — the scoutTip + subLabels are
    // duration-relative and would mislead. Compute nights up-front.
    const intendedNightsForKey = retDate
      ? Math.round(
          (new Date(retDate + 'T00:00:00Z').getTime() -
            new Date(depDate + 'T00:00:00Z').getTime()) /
            86400000,
        )
      : 0;
    const stripKey = `flights:strip:v5:${origin}:${destination}:${depDate}:${retDate || 'ow'}:${intendedNightsForKey}n`;
    try {
      const cached = await kv.get<any>(stripKey);
      if (cached) return NextResponse.json({ ...cached, cached: true });
    } catch {}

    // Build D-3..D+3 around depDate
    const base = new Date(depDate + 'T00:00:00Z');
    const baseRet = retDate ? new Date(retDate + 'T00:00:00Z') : null;
    const offsets = [-3, -2, -1, 0, 1, 2, 3];
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const cells = offsets.map(off => {
      const d = new Date(base);
      d.setUTCDate(d.getUTCDate() + off);
      const r = baseRet ? new Date(baseRet) : null;
      if (r) r.setUTCDate(r.getUTCDate() + off);
      return {
        offset: off,
        dep: d.toISOString().slice(0, 10),
        ret: r ? r.toISOString().slice(0, 10) : null,
        past: d < today,
      };
    });

    // Collect the months we need (usually 1, sometimes 2 if ±3 spans
    // a month boundary, very rarely 3 if selected date is e.g. 30 Apr
    // with long return — but ret doesn't affect depart_date lookup).
    const depMonths = new Set<string>();
    const retMonths = new Set<string>();
    for (const c of cells) {
      if (c.past) continue;
      depMonths.add(c.dep.slice(0, 7));
      if (c.ret) retMonths.add(c.ret.slice(0, 7));
    }

    const STRIP_TIMEOUT_MS = 4000;

    // Optional hint from the client — the cheapest price the live main
    // search just found. Forced onto the selected cell so the strip
    // never contradicts the results below even if TP's cache lags.
    const basePriceHint = searchParams.get('basePrice');
    const basePriceNum = basePriceHint ? parseFloat(basePriceHint) : null;

    // Fetch the calendar for each (depMonth, retMonth) pair in parallel.
    // Round-trip: we iterate depMonth × retMonth so TP filters to pairs
    // where both sides fall in the right months. One-way: just depMonth.
    type CalEntry = { price: number; return_at?: string };
    const calendarMap = new Map<string, CalEntry>(); // key = dep date YYYY-MM-DD

    // Intended stay length so the UI can flag cells that are cheap
    // only because they're a different-length trip.
    const intendedNights = baseRet
      ? Math.round((baseRet.getTime() - base.getTime()) / 86400000)
      : null;

    const fetchCalendar = async (depMonth: string, retMonth: string | null) => {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), STRIP_TIMEOUT_MS);
      try {
        const params = new URLSearchParams({
          origin,
          destination,
          depart_date: depMonth,
          calendar_type: 'departure_date',
          currency: 'gbp',
          // market=en is a no-op today (same coverage as gb) but matches
          // how TP documents global queries and future-proofs us if
          // regional caches diverge.
          market: 'en',
          token: TP_TOKEN,
        });
        if (retMonth) params.set('return_date', retMonth);
        // trip_duration is silently ignored by TP right now but we
        // pass it anyway so we automatically get apples-to-apples
        // pricing the moment TP honours the param.
        if (intendedNights && intendedNights > 0) {
          params.set('trip_duration', String(intendedNights));
        }
        const url = `https://api.travelpayouts.com/v1/prices/calendar?${params}`;
        const r = await fetch(url, { headers, signal: ac.signal });
        if (!r.ok) return;
        const j = await r.json();
        const data = (j?.data && typeof j.data === 'object') ? j.data : {};
        for (const [dateKey, val] of Object.entries(data as Record<string, any>)) {
          const priceNum = typeof val?.price === 'number' ? val.price : Number(val?.price);
          if (!(priceNum > 0)) continue;
          const existing = calendarMap.get(dateKey);
          // If multiple retMonths produce entries for the same depDate,
          // keep the cheaper one — still round-trip, still honest.
          if (!existing || priceNum < existing.price) {
            calendarMap.set(dateKey, { price: priceNum, return_at: val?.return_at });
          }
        }
      } catch {
        // Timeout or network — just let the relevant cells stay empty.
      } finally {
        clearTimeout(timer);
      }
    };

    const tasks: Array<Promise<void>> = [];
    if (retMonths.size > 0) {
      for (const dm of depMonths) {
        for (const rm of retMonths) {
          tasks.push(fetchCalendar(dm, rm));
        }
      }
    } else {
      for (const dm of depMonths) {
        tasks.push(fetchCalendar(dm, null));
      }
    }
    await Promise.all(tasks);

    const results = cells.map(c => {
      if (c.past) {
        return { ...c, cheapest_price_gbp: null, actual_nights: null, actual_return: null };
      }
      const hit = calendarMap.get(c.dep);
      let price: number | null = hit ? hit.price : null;
      let actualNights: number | null = null;
      let actualReturn: string | null = null;
      if (hit?.return_at) {
        actualReturn = hit.return_at.slice(0, 10);
        const depMs = new Date(c.dep + 'T00:00:00Z').getTime();
        const retMs = new Date(hit.return_at).getTime();
        if (retMs > depMs) {
          actualNights = Math.round((retMs - depMs) / 86400000);
        }
      }
      if (c.offset === 0 && basePriceNum && basePriceNum > 0) {
        price = basePriceNum;
        // Selected cell reflects the user's exact intended shape.
        actualNights = intendedNights;
        actualReturn = c.ret;
      }
      return {
        ...c,
        cheapest_price_gbp: price,
        actual_nights: actualNights,
        actual_return: actualReturn,
      };
    });

    // "Scout Tip" — the absolute cheapest date TP knows about within a
    // wider window (±14 days). If it's meaningfully cheaper than the
    // selected cell AND falls outside the ±3 strip, surface it so the
    // user can one-click shift to that date.
    let scoutTip: { dep: string; price: number; savings: number } | null = null;
    if (basePriceNum && basePriceNum > 0 && calendarMap.size > 0) {
      const windowStart = new Date(base);
      windowStart.setUTCDate(windowStart.getUTCDate() - 14);
      const windowEnd = new Date(base);
      windowEnd.setUTCDate(windowEnd.getUTCDate() + 14);
      const stripDates = new Set(cells.map(c => c.dep));
      let bestOutside: { dep: string; price: number } | null = null;
      for (const [dateKey, entry] of calendarMap.entries()) {
        if (stripDates.has(dateKey)) continue;
        const d = new Date(dateKey + 'T00:00:00Z');
        if (d < today) continue;
        if (d < windowStart || d > windowEnd) continue;
        if (!bestOutside || entry.price < bestOutside.price) {
          bestOutside = { dep: dateKey, price: entry.price };
        }
      }
      if (bestOutside && bestOutside.price < basePriceNum * 0.85) {
        scoutTip = {
          dep: bestOutside.dep,
          price: bestOutside.price,
          savings: Math.round(basePriceNum - bestOutside.price),
        };
      }
    }

    const response = {
      success: true,
      dates: results,
      origin,
      destination,
      depDate,
      retDate,
      intendedNights,
      scoutTip,
    };
    try { await kv.set(stripKey, response, { ex: 3600 }); } catch {}
    return NextResponse.json(response);
  }

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
  // v5 — bumped 2026-04-18 when Travelpayouts limits were raised (10→30)
  // and a dedicated direct-only pull was added. Old v4 entries would
  // otherwise serve stale 6-flight results for up to 30 min post-deploy.
  const kvKey = `flights:v5:${origin}:${destination}:${depDate}:${retDate || 'ow'}:${adults}c${children}i${infants}:${cabinClass}`;
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
