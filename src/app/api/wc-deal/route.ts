import { NextRequest, NextResponse } from 'next/server';
import { getHotels, type Occupancy } from '@/lib/liteapi';
import { WC_CITIES, STADIUM_COORDS } from '@/data/world-cup-cities';

export const runtime = 'edge';

/**
 * GET /api/wc-deal?city=<slug>
 *
 * The World Cup "deal engine" that powers the social reels. For one host city it
 * returns a COMPLETE, ready-to-render package built from REAL, direct-bookable
 * LiteAPI inventory near the actual match stadium — never invented prices:
 *   - nearestStay  : cheapest direct-book room within the stadium district
 *   - atStadium    : the single closest hotel to the stadium (often premium)
 *   - valuePick    : cheapest room in the metro (+ how far it is from the ground)
 *   - hook/stakes/payoff/script/caption : a suspense-format script with the real
 *     numbers baked in (curiosity-gap open, answer held to the back half), with
 *     the angle chosen FROM the live numbers so the copy always fits the data
 *   - bookUrl      : a DIRECT-BOOK deep link (LiteAPI /hotels, geo-filtered to the
 *     stadium) — NO affiliate
 *   - img1..img10 / music / outro_color : merged from the city's slideshow JSON
 *
 * Rule: prices are pulled live and never fabricated. If a city has no live
 * inventory the route returns { success:false } so the pipeline can skip it.
 */

type Twist = 'trap' | 'trap-nj' | 'walkable' | 'bargain';

const SEARCH: Record<
  string,
  { cc: string; names: string[]; twist: Twist; trapArea?: string }
> = {
  dallas: { cc: 'US', names: ['Arlington', 'Dallas'], twist: 'trap', trapArea: 'Dallas' },
  boston: { cc: 'US', names: ['Foxborough', 'Boston', 'Providence'], twist: 'trap', trapArea: 'Boston' },
  'new-york': { cc: 'US', names: ['East Rutherford', 'Secaucus', 'New York'], twist: 'trap-nj', trapArea: 'Manhattan' },
  'los-angeles': { cc: 'US', names: ['Inglewood', 'Los Angeles'], twist: 'trap', trapArea: 'Hollywood' },
  miami: { cc: 'US', names: ['Miami Gardens', 'Sunny Isles Beach', 'Miami Beach'], twist: 'trap', trapArea: 'South Beach' },
  'san-francisco': { cc: 'US', names: ['Santa Clara', 'San Francisco'], twist: 'trap', trapArea: 'San Francisco' },
  atlanta: { cc: 'US', names: ['Atlanta'], twist: 'walkable' },
  seattle: { cc: 'US', names: ['Seattle'], twist: 'walkable' },
  toronto: { cc: 'CA', names: ['Toronto'], twist: 'walkable' },
  vancouver: { cc: 'CA', names: ['Vancouver'], twist: 'walkable' },
  'mexico-city': { cc: 'MX', names: ['Mexico City'], twist: 'bargain' },
};

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const r = (x: number) => (x * Math.PI) / 180;
  const dLat = r(bLat - aLat);
  const dLng = r(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)) * 10) / 10;
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

type Stay = { hotel: string; pricePerNight: number; distanceKm: number; city: string };

function gen(opts: {
  twist: Twist;
  cityLabel: string;
  shortName: string;
  slug: string;
  stadium: string;
  trapArea?: string;
  matchLabel: string;
  nearest: Stay;
  closest: Stay;
  value: Stay;
  variant: number;
}) {
  const { twist, cityLabel, stadium, trapArea, matchLabel, nearest, closest, value, variant } = opts;
  const area = trapArea || cityLabel;
  let hook = '';
  let stakes = '';
  let payoff = '';

  // Choose the story from the REAL numbers so the copy always fits the data:
  //  - nj / bargain are city-specific narratives
  //  - a 'trap' city only gets the trap story when there's a genuine far-cheaper
  //    gap; otherwise the close room IS the deal (value story)
  //  - walkable cities lead with "you can walk to it"
  const realTrap = value.distanceKm >= 15 && value.pricePerNight < nearest.pricePerNight * 0.9;
  const twoTiers = closest.pricePerNight >= nearest.pricePerNight * 1.3;
  const branch =
    twist === 'trap-nj' ? 'nj'
    : twist === 'bargain' ? 'bargain'
    : twist === 'walkable' ? 'walkable'
    : realTrap ? 'trap'
    : 'value';

  if (branch === 'nj') {
    hook = `Everyone books Manhattan for ${matchLabel}. The room ${nearest.distanceKm}km from the stadium is £${nearest.pricePerNight} — here's the catch.`;
    stakes = `${stadium} isn't in New York at all — it's in the New Jersey Meadowlands. While Manhattan overpays and fights the tunnel on match day…`;
    payoff = `…the Meadowlands sits right by the ground from £${nearest.pricePerNight} a night. We rank by distance to the real stadium. Book direct, no fees.`;
  } else if (branch === 'bargain') {
    hook = `£${value.pricePerNight} a night at a World Cup — ${cityLabel} is 2026's bargain. But book near the stadium and you've already lost.`;
    stakes = `${stadium} is deep in the south of the city — far from the neighbourhoods you'll actually want to stay in.`;
    payoff = `Base in the city from £${value.pricePerNight} a night, then ride the Metro to the ground. We rank by distance and price. Book direct, no fees.`;
  } else if (branch === 'walkable') {
    hook =
      variant === 1 && twoTiers
        ? `Two ${cityLabel} hotels, the same walk to the stadium — one's £${closest.pricePerNight}, one's £${nearest.pricePerNight}. Most fans pick wrong.`
        : `Most World Cup stadiums are an hour from town. ${cityLabel}'s is a ${nearest.distanceKm}km hop — from £${nearest.pricePerNight} a night.`;
    stakes = `${stadium} sits right by the heart of ${cityLabel} — no transfer, no 40-minute Uber, no motorway.`;
    payoff = `Walk to kickoff from £${nearest.pricePerNight} a night (${nearest.distanceKm}km away)${twoTiers ? `, and skip the £${closest.pricePerNight} room next door` : ''}. We rank by distance to the real stadium. Book direct, no fees.`;
  } else if (branch === 'trap') {
    hook =
      variant === 0
        ? `£${nearest.pricePerNight} near the stadium or £${value.pricePerNight} a ${value.distanceKm}km drive out — most ${matchLabel} fans pick wrong.`
        : `${matchLabel} isn't in central ${area} — and the cheap rooms are ${value.distanceKm}km from the ground. Here's the smart play.`;
    stakes = `${stadium} is well outside central ${area}. Book the bargain and it's a ${value.distanceKm}km haul on match day…`;
    payoff = `Stay near the ground from £${nearest.pricePerNight} (${nearest.distanceKm}km out), or save with £${value.pricePerNight} if you'll travel. We rank by distance to the real stadium. Book direct, no fees.`;
  } else {
    // value — the close room IS the deal
    hook = `The hotel ${nearest.distanceKm}km from ${matchLabel} is just £${nearest.pricePerNight} a night — and most fans book the wrong side of town.`;
    stakes = `${stadium} is nowhere near the postcard neighbourhoods everyone splashes out on — so a room this close stays cheap.`;
    payoff = `Stay this close to kickoff from £${nearest.pricePerNight} a night. We rank by distance to the real stadium. Book direct, no fees.`;
  }

  hook = hook.charAt(0).toUpperCase() + hook.slice(1);
  const script = `${hook} ${stakes} ${payoff}`;
  const tag = opts.slug.replace(/-/g, '');
  const caption = `${matchLabel}: where to ACTUALLY stay for the World Cup — real prices, booked direct on JetMeAway with no booking fees. Link in bio. #worldcup2026 #${tag} #footballtravel`;
  return { hook, stakes, payoff, script, caption, textOverlayHook: hook };
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const slug = (searchParams.get('city') || 'dallas').toLowerCase();

  const city = WC_CITIES.find((c) => c.slug === slug);
  const coords = STADIUM_COORDS[slug];
  const cfg = SEARCH[slug];
  if (!city || !coords || !cfg) {
    return NextResponse.json(
      { success: false, error: `Unknown World Cup city slug "${slug}"`, valid: Object.keys(SEARCH) },
      { status: 400 },
    );
  }

  // Pick the next upcoming match date for this city (fall back to the last one).
  const today = new Date().toISOString().slice(0, 10);
  const dates = [...city.matchDates].sort();
  const checkIn = dates.find((d) => d >= today) || dates[dates.length - 1];
  const checkOut = addDays(checkIn, 2);

  const occupancy: Occupancy[] = [{ adults: 2, children: [] }];

  try {
    // Pull live LiteAPI inventory across the stadium suburb + main city, then
    // rank by true distance to the stadium.
    const batches = await Promise.all(
      cfg.names.map((name) =>
        getHotels({
          cityName: name,
          countryCode: cfg.cc,
          checkIn,
          checkOut,
          occupancy,
          currency: 'GBP',
          guestNationality: 'GB',
          limit: 25,
        }).catch(() => [] as any[]),
      ),
    );

    const seen = new Set<string>();
    const rows: Stay[] = [];
    for (const offer of batches.flat() as any[]) {
      const lat = Number(offer?.latitude);
      const lng = Number(offer?.longitude);
      const price = Math.round(Number(offer?.pricePerNight));
      const name = String(offer?.hotelName || '').trim();
      if (!name || !isFinite(lat) || !isFinite(lng) || !isFinite(price) || price <= 0) continue;
      if (seen.has(name)) continue;
      const distanceKm = haversineKm(coords.lat, coords.lng, lat, lng);
      if (distanceKm > 400) continue; // drop same-name-different-place noise (e.g. Arlington VA)
      seen.add(name);
      rows.push({ hotel: name, pricePerNight: price, distanceKm, city: String(offer?.city || '') });
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'no live inventory', slug, checkIn, checkOut },
        { status: 200 },
      );
    }

    const byDist = [...rows].sort((a, b) => a.distanceKm - b.distanceKm);
    const byPrice = [...rows].sort((a, b) => a.pricePerNight - b.pricePerNight);

    const NEAR_KM = 6;
    const withinNear = byPrice.filter((r) => r.distanceKm <= NEAR_KM);
    const nearest = withinNear[0] || byDist[0]; // cheapest in the stadium district
    const closest = byDist[0]; // closest of all (often premium / "at the ground")
    const value = byPrice[0]; // cheapest in the metro (may be far)

    const matchLabel = city.englandMatch ? city.englandMatch.label : `the ${city.shortName} World Cup match`;
    const variant = parseInt(today.slice(8, 10), 10) % 2;

    const copy = gen({
      twist: cfg.twist,
      cityLabel: city.shortName,
      shortName: city.shortName,
      slug,
      stadium: city.stadiumCommercial,
      trapArea: cfg.trapArea,
      matchLabel,
      nearest,
      closest,
      value,
      variant,
    });

    const bookUrl = `${origin}/hotels?destination=${encodeURIComponent(city.shortName)}&checkin=${checkIn}&checkout=${checkOut}&lat=${coords.lat}&lng=${coords.lng}&radius=${coords.radiusKm}`;

    // Best-effort: merge the city's slideshow imagery + music so this endpoint is
    // a drop-in superset of /data/slideshow/<slug>.json for the render pipeline.
    let media: Record<string, unknown> = {};
    try {
      const r = await fetch(`${origin}/data/slideshow/${slug}.json`, { cache: 'no-store' });
      if (r.ok) {
        const j: any = await r.json();
        media = j && typeof j === 'object' ? j : {};
      }
    } catch {
      /* imagery is optional */
    }

    return NextResponse.json(
      {
        success: true,
        city: slug,
        cityName: city.name,
        country: city.country,
        stadium: city.stadiumCommercial,
        twist: cfg.twist,
        match: city.englandMatch || null,
        matchDate: checkIn,
        checkIn,
        checkOut,
        nearestStay: nearest,
        atStadium: closest,
        valuePick: value,
        bookUrl,
        ...copy,
        ...media,
        city_slug: slug,
        generatedFor: today,
      },
      { headers: { 'cache-control': 's-maxage=900, stale-while-revalidate=3600' } },
    );
  } catch (err: any) {
    console.error('[wc-deal]', err?.message || err);
    return NextResponse.json({ success: false, error: err?.message || 'deal lookup failed', slug }, { status: 500 });
  }
}
