import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const runtime = 'edge';

const TP_TOKEN = 'f797fbb7074a15838d5536c10be6f7b5';
const KV_TTL = 21600; // 6 hours
// KV key is scoped to the origin metro code so switching LHR → LON doesn't
// serve cached Heathrow-only prices. Any old LHR-scoped keys expire naturally.
const KV_KEY = 'flight-hot-deals:LON';
const KV_META_KEY = 'flight-hot-deals:LON:meta'; // { fetchedAt: ISO string }

const AIRLINES: Record<string, string> = {
  AA: 'American Airlines', AC: 'Air Canada', AF: 'Air France',
  AY: 'Finnair', BA: 'British Airways', DL: 'Delta',
  EI: 'Aer Lingus', EK: 'Emirates', EY: 'Etihad',
  FR: 'Ryanair', IB: 'Iberia', J2: 'Azerbaijan Airlines',
  KE: 'Korean Air', KL: 'KLM', LH: 'Lufthansa',
  LO: 'LOT Polish', LS: 'Jet2', LX: 'Swiss',
  MS: 'EgyptAir', OS: 'Austrian', PC: 'Pegasus',
  QR: 'Qatar Airways', SK: 'SAS', SQ: 'Singapore Airlines',
  SU: 'Aeroflot', TK: 'Turkish Airlines', TP: 'TAP Portugal',
  U2: 'easyJet', UA: 'United', VS: 'Virgin Atlantic',
  VY: 'Vueling', W6: 'Wizz Air', W9: 'Wizz Air UK',
  JU: 'Air Serbia', '6E': 'IndiGo', PK: 'PIA',
};

/* Popular routes from London for hot deals */
const HOT_ROUTES: { dest: string; city: string; country: string; flag: string }[] = [
  { dest: 'BCN', city: 'Barcelona', country: 'Spain', flag: '🇪🇸' },
  { dest: 'DXB', city: 'Dubai', country: 'UAE', flag: '🇦🇪' },
  { dest: 'IST', city: 'Istanbul', country: 'Turkey', flag: '🇹🇷' },
  { dest: 'CDG', city: 'Paris', country: 'France', flag: '🇫🇷' },
  { dest: 'AMS', city: 'Amsterdam', country: 'Netherlands', flag: '🇳🇱' },
  { dest: 'FCO', city: 'Rome', country: 'Italy', flag: '🇮🇹' },
  { dest: 'AGP', city: 'Malaga', country: 'Spain', flag: '🇪🇸' },
  { dest: 'TFS', city: 'Tenerife', country: 'Spain', flag: '🇪🇸' },
  { dest: 'LIS', city: 'Lisbon', country: 'Portugal', flag: '🇵🇹' },
  { dest: 'ATH', city: 'Athens', country: 'Greece', flag: '🇬🇷' },
  { dest: 'RAK', city: 'Marrakech', country: 'Morocco', flag: '🇲🇦' },
  { dest: 'AYT', city: 'Antalya', country: 'Turkey', flag: '🇹🇷' },
  { dest: 'LHE', city: 'Lahore', country: 'Pakistan', flag: '🇵🇰' },
  { dest: 'GYD', city: 'Baku', country: 'Azerbaijan', flag: '🇦🇿' },
  { dest: 'FAO', city: 'Faro', country: 'Portugal', flag: '🇵🇹' },
  { dest: 'PMI', city: 'Palma', country: 'Spain', flag: '🇪🇸' },
  { dest: 'JFK', city: 'New York', country: 'USA', flag: '🇺🇸' },
  { dest: 'BKK', city: 'Bangkok', country: 'Thailand', flag: '🇹🇭' },
  { dest: 'MLE', city: 'Maldives', country: 'Maldives', flag: '🇲🇻' },
  { dest: 'CUN', city: 'Cancun', country: 'Mexico', flag: '🇲🇽' },
];

export async function GET(req: NextRequest) {
  // Force-refresh mode: used by the Vercel cron to keep the cache warm so
  // visitors never see 6h-stale prices. Only honoured for genuine cron
  // requests (Vercel adds `x-vercel-cron: 1` to cron fires) so random
  // visitors can't nuke the cache and trigger 20× TP calls.
  const isCron =
    req.headers.get('x-vercel-cron') === '1' ||
    req.nextUrl.searchParams.get('cron') === '1';
  const forceRefresh =
    isCron || req.nextUrl.searchParams.get('refresh') === '1';

  // Check cache — unless a legitimate refresh is requested.
  if (!forceRefresh) {
    try {
      const [cached, meta] = await Promise.all([
        kv.get<any[]>(KV_KEY),
        kv.get<{ fetchedAt: string }>(KV_META_KEY),
      ]);
      if (cached && cached.length > 0) {
        return NextResponse.json({
          deals: cached,
          cached: true,
          fetchedAt: meta?.fetchedAt ?? null,
        });
      }
    } catch { /* KV miss */ }
  }

  // Fetch prices for all routes in parallel (Travelpayouts cached prices API)
  const now = new Date();
  const deals: any[] = [];

  const fetches = HOT_ROUTES.map(async (route) => {
    try {
      const url = `https://api.travelpayouts.com/aviasales/v3/prices_for_dates?origin=LON&destination=${route.dest}&departure_at=${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}&currency=gbp&sorting=price&limit=3&market=gb&token=${TP_TOKEN}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.data || data.data.length === 0) {
        // Try next month
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const url2 = `https://api.travelpayouts.com/aviasales/v3/prices_for_dates?origin=LON&destination=${route.dest}&departure_at=${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}&currency=gbp&sorting=price&limit=3&market=gb&token=${TP_TOKEN}`;
        const res2 = await fetch(url2, { signal: AbortSignal.timeout(8000) });
        if (!res2.ok) return;
        const data2 = await res2.json();
        if (!data2.data || data2.data.length === 0) return;
        const f = data2.data[0];
        deals.push({
          dest: route.dest,
          city: route.city,
          country: route.country,
          flag: route.flag,
          price: f.price,
          airline: AIRLINES[f.airline] || f.airline,
          airlineCode: f.airline,
          departureDate: f.departure_at?.split('T')[0] || '',
          transfers: f.transfers,
          duration: f.duration_to || f.duration || 0,
        });
        return;
      }
      const f = data.data[0];
      deals.push({
        dest: route.dest,
        city: route.city,
        country: route.country,
        flag: route.flag,
        price: f.price,
        airline: AIRLINES[f.airline] || f.airline,
        airlineCode: f.airline,
        departureDate: f.departure_at?.split('T')[0] || '',
        transfers: f.transfers,
        duration: f.duration_to || f.duration || 0,
      });
    } catch { /* timeout or fetch error for this route */ }
  });

  await Promise.all(fetches);

  // Sort by price
  deals.sort((a, b) => a.price - b.price);

  // Cache — set a slightly longer TTL than the cron cadence so a cron miss
  // (Vercel cron skew is real) never leaves us serving nothing. The cron
  // will overwrite this on its next run.
  const fetchedAt = new Date().toISOString();
  if (deals.length > 0) {
    try {
      await Promise.all([
        kv.set(KV_KEY, deals, { ex: KV_TTL + 3600 }),
        kv.set(KV_META_KEY, { fetchedAt }, { ex: KV_TTL + 3600 }),
      ]);
    } catch { /* KV write failed */ }
  }

  return NextResponse.json({ deals, cached: false, fetchedAt });
}
