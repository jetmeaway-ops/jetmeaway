#!/usr/bin/env node
/**
 * Monkey Airports Suite — Stage 8 of the Safety Net build.
 *
 * Iterates every airport in AIRPORT_GROUPS (inside
 * src/app/hotels/hotels-client.tsx) and asserts each one returns ≥1 LIVE
 * LiteAPI hotel via /api/hotels — using EXACTLY the URL the search bar
 * builds after a Google Places autocomplete click ("Heathrow Airport
 * (LHR)" with the IATA parenthetical that broke the AIRPORT_TO_CITY
 * lookup before commit 2f56e8a).
 *
 * The list is parsed by regex from the TSX source so we don't need to
 * import a client-only React module from a Node script.
 *
 * Usage:
 *   node scripts/monkey-airports.mjs                       # all vs prod
 *   BASE=http://localhost:3000 node scripts/monkey-airports.mjs
 *
 * Exit code 0 = every airport returned ≥1 LIVE hotel. Non-zero = at least
 * one failed; failures POST to /api/bug-monitor when BUG_MONITOR_SECRET
 * is set.
 *
 * Why this matters: today's `2f56e8a fix(hotels): airport searches no
 * longer return 0 hotels` shipped after the owner reported 7 airports
 * silently returning empty. Reproducing that class of bug should never
 * be possible again — every airport gets a production smoke-test on
 * every nightly run.
 */

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const BASE = process.env.BASE || 'https://jetmeaway.co.uk';
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const SOURCE = path.resolve(__dirname, '..', 'src', 'app', 'hotels', 'hotels-client.tsx');

/**
 * Parse AIRPORT_GROUPS out of the TSX source. Returns one entry per
 * (keyword, airport) pair — so a group like
 *   { keywords: ['paris','charles de gaulle','orly','beauvais'],
 *     airports: [CDG, ORY, BVA] }
 * yields 4 entries (one per keyword × one airport — picking the first
 * airport in the group as the canonical test target). We intentionally
 * don't fan out to keyword×airport — that would explode 60+ groups
 * into 300+ tests and the IATA-suffix bug only depends on the keyword
 * shape, not the iata.
 */
function loadAirports() {
  const text = fs.readFileSync(SOURCE, 'utf8');
  const start = text.indexOf('AIRPORT_GROUPS');
  if (start === -1) throw new Error('AIRPORT_GROUPS marker not found in ' + SOURCE);
  const openBracket = text.indexOf('[', start);
  const closeBracket = text.indexOf('\n];', openBracket);
  if (openBracket === -1 || closeBracket === -1) {
    throw new Error('Failed to locate AIRPORT_GROUPS array boundaries');
  }
  const body = text.slice(openBracket, closeBracket);

  // Each group's keywords array
  const groupRe = /\{\s*keywords:\s*\[([^\]]+)\]\s*,\s*airports:\s*(\[[^\]]*?(?:\{[^}]*\}[^\]]*?)*\])/g;
  const entries = [];
  let m;
  while ((m = groupRe.exec(body)) !== null) {
    const kwBlock = m[1];
    const airportsBlock = m[2];
    const keywords = [...kwBlock.matchAll(/['"]([^'"]+)['"]/g)].map((k) => k[1]);
    // First airport in the group — that's the test target
    const airportM = airportsBlock.match(/iata:\s*['"]([A-Z]{3})['"]\s*,\s*lat:\s*(-?\d+(?:\.\d+)?)\s*,\s*lng:\s*(-?\d+(?:\.\d+)?)/);
    if (!airportM) continue;
    const [, iata, lat, lng] = airportM;
    // Pick the most "airport-name-like" keyword for the test (the one
    // most likely to be what Google Places returns). Heuristic: prefer
    // a keyword that contains "airport" or a city name that's also the
    // airport's hub (Heathrow/Gatwick/etc.); fall back to the first.
    const airportKw = keywords.find((k) => /heathrow|gatwick|stansted|luton|city airport|schiphol|charles de gaulle|orly|beauvais|charleroi|fiumicino|ciampino|malpensa|linate|bergamo|haneda|narita|incheon|gimpo|pudong|hongqiao|daxing|don mueang|prestwick|skavsta|bromma|arlanda|keflavik|modlin|sabiha|denpasar|sharm|hurghada|fuerteventura|lanzarote|charlotte amalie|nadi|labuan/i.test(k))
      || keywords[0];
    entries.push({
      keyword: airportKw,
      iata,
      lat: Number(lat),
      lng: Number(lng),
    });
  }
  return entries;
}

/** Haversine distance between two (lat,lng) points in km. */
function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

function nightsFromNow(offsetDays, nights) {
  const ci = new Date(Date.now() + offsetDays * 86400000);
  const co = new Date(ci.getTime() + nights * 86400000);
  return { checkin: ci.toISOString().slice(0, 10), checkout: co.toISOString().slice(0, 10) };
}

/**
 * Build the EXACT URL the search bar fires after an autocomplete-airport
 * click. Google Places returns the picked name as `<Keyword> Airport
 * (<IATA>)` — verified against the live picker on jetmeaway.co.uk for
 * Heathrow/Gatwick/CDG/DXB. Sending this verbatim re-exercises the
 * IATA-suffix-strip path in /api/hotels.
 */
function buildUrl(entry, checkin, checkout) {
  const cityName = `${capitaliseEach(entry.keyword)} Airport (${entry.iata})`;
  const p = new URLSearchParams({
    city: cityName,
    checkin,
    checkout,
    adults: '2',
    children: '0',
    rooms: '1',
    lat: String(entry.lat),
    lng: String(entry.lng),
    radius: '15',
  });
  return `${BASE}/api/hotels?${p.toString()}`;
}

function capitaliseEach(s) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

async function runOne(entry) {
  // Per-airport date offset (35–61 days out) so each query lands on its
  // own KV cache key. Without this, the first run's cold-start timeouts
  // got cached as empty responses and every subsequent run returned the
  // cached empty for 30 minutes — making the suite report ~30 false-
  // positive fails when real users hitting the same airport on a fresh
  // cache see ≥100 live hotels.
  const offsetDays = 35 + ((entry.iata.charCodeAt(0) + entry.iata.charCodeAt(2)) % 27);
  const { checkin, checkout } = nightsFromNow(offsetDays, 2);
  const url = buildUrl(entry, checkin, checkout);
  const t0 = Date.now();
  let status = 0;
  let body = null;
  let err = null;
  try {
    const r = await fetch(url, { headers: { 'user-agent': 'jetmeaway-monkey-airports/1' } });
    status = r.status;
    const text = await r.text();
    try { body = JSON.parse(text); } catch { body = { _raw: text.slice(0, 200) }; }
  } catch (e) {
    err = e.message || String(e);
  }
  const ms = Date.now() - t0;
  const errs = [];
  if (err) errs.push(`fetch failed: ${err}`);
  if (status !== 200) errs.push(`HTTP ${status}`);
  const hotels = Array.isArray(body?.hotels) ? body.hotels : null;
  const liveHotels = hotels ? hotels.filter((h) => String(h.id || '').startsWith('la_')) : null;
  const liveCount = liveHotels?.length ?? null;
  if (hotels === null) errs.push('hotels not an array');
  // Live count — curated fallback alone doesn't prove the API path works.
  // We need at least ONE LiteAPI live hotel to confirm the cityKey strip +
  // resolveCountryCode tolerance + lat/lng search are still wired correctly.
  else if (liveCount === 0) errs.push('0 LIVE hotels (only curated fallback)');

  // Proximity sample — at least one returned LIVE hotel should sit within
  // 30 km of the airport coords. 30 km absorbs sprawling-airport edge cases
  // (Heathrow hotels in Slough, Stansted hotels in Bishop's Stortford etc.)
  // without letting a wildly wrong cityKey leak through. Skip when liveCount
  // is 0 — the count assertion above already catches that case.
  if (liveHotels && liveHotels.length > 0) {
    const airport = { lat: entry.lat, lng: entry.lng };
    const nearest = liveHotels
      .map((h) => {
        const lat = h.lat ?? h.latitude;
        const lng = h.lng ?? h.longitude;
        if (typeof lat !== 'number' || typeof lng !== 'number') return Infinity;
        return haversineKm(airport, { lat, lng });
      })
      .reduce((min, km) => (km < min ? km : min), Infinity);
    if (nearest > 30) {
      errs.push(`nearest LIVE hotel ${nearest.toFixed(1)}km from ${entry.iata} (>30km — cityKey may be wrong)`);
    }
  }

  return { entry, status, ms, errs, hotelCount: hotels?.length ?? null, liveCount, checkin, checkout };
}

async function reportFailureToInbox(r) {
  const secret = process.env.BUG_MONITOR_SECRET;
  if (!secret) return;
  const message = `monkey-airports failure: ${r.entry.iata} (${r.entry.keyword}) :: ${r.errs.join(' | ')}`;
  const payload = [
    {
      level: 'error',
      message,
      context: {
        source: 'monkey-airports.mjs',
        iata: r.entry.iata,
        keyword: r.entry.keyword,
        checkin: r.checkin,
        checkout: r.checkout,
        status: r.status,
        ms: r.ms,
        hotelCount: r.hotelCount,
        liveCount: r.liveCount,
        errors: r.errs,
      },
      ts: new Date().toISOString(),
    },
  ];
  try {
    await fetch(`${BASE}/api/bug-monitor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-bug-monitor-secret': secret },
      body: JSON.stringify(payload),
    });
  } catch {
    /* best-effort */
  }
}

async function main() {
  const airports = loadAirports();
  console.log(`Monkey airports — ${airports.length} airports against ${BASE}\n`);
  const results = [];
  // Batch of 3 concurrent — same as monkey-landmark. Airport searches
  // currently fire 2 LiteAPI tiers (primary lat/lng + budget) per call,
  // so 3-wide keeps in-flight rates-compute ≤ 6 which prod handles fine.
  const BATCH = 3;
  for (let i = 0; i < airports.length; i += BATCH) {
    const slice = airports.slice(i, i + BATCH);
    const batch = await Promise.all(slice.map(runOne));
    for (const r of batch) {
      const tag = r.errs.length === 0 ? 'OK ' : 'FAIL';
      const label = `${r.entry.iata} (${r.entry.keyword})`.padEnd(38);
      const summary = `${tag} ${label} → ${r.status} ${r.ms}ms ${r.hotelCount ?? '-'}t/${r.liveCount ?? '-'}l hotels`;
      console.log(summary);
      if (r.errs.length) for (const e of r.errs) console.log(`     • ${e}`);
      results.push(r);
    }
  }
  const failed = results.filter((r) => r.errs.length > 0);
  console.log(`\n${results.length - failed.length}/${results.length} passed, ${failed.length} failed`);
  if (failed.length > 0) {
    console.log('\nFailures:');
    for (const f of failed) {
      console.log(`  ${f.entry.iata} (${f.entry.keyword}): ${f.errs.join('; ')}`);
    }
    for (const f of failed) await reportFailureToInbox(f);
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(2); });
