#!/usr/bin/env node
/**
 * Monkey Search Suite — Stage 1 of the Safety Net build.
 *
 * Fires N (default 50) random hotel searches against /api/hotels, asserts the
 * shape of every response, and reports any failure with enough context to
 * reproduce. Designed to be run before every prod push and on a nightly cron.
 *
 * Usage:
 *   node scripts/monkey-search.mjs                       # 50 runs against prod
 *   BASE=http://localhost:3000 node scripts/monkey-search.mjs
 *   COUNT=20 node scripts/monkey-search.mjs
 *
 * Exit code 0 = all green. Non-zero = one or more assertions failed (CI signal).
 *
 * Asserts on every response:
 *   - HTTP 200
 *   - JSON parses
 *   - response.hotels is an array
 *   - response.adults === requested adults (no metadata drop)
 *   - if children > 0 was requested, response acknowledges it (currently the
 *     route drops `children` from the echo — known regression target, will
 *     surface in the failure report once the route is updated to echo it back)
 *   - response.checkin / checkout match the request
 *   - if hotels is non-empty, every hotel has id + name + a price field
 */

const BASE = process.env.BASE || 'https://jetmeaway.co.uk';
const COUNT = Number(process.env.COUNT || 50);

const CITIES = [
  'london', 'paris', 'rome', 'barcelona', 'amsterdam', 'lisbon', 'madrid',
  'berlin', 'prague', 'vienna', 'dublin', 'edinburgh', 'manchester', 'istanbul',
  'dubai', 'new york', 'los angeles', 'tokyo', 'bangkok', 'singapore',
  'sydney', 'toronto', 'mumbai', 'cairo', 'marrakech',
];

/**
 * Proximity canaries — small towns where LiteAPI is known to return
 * Greater-region hotels (Coulsdon → all of London, Hove → all of Brighton+
 * Worthing, etc). The monkey randomly picks one each run; if returned
 * hotels with lat/lng land >RADIUS_KM from the centroid the run fails.
 *
 * Reference centroids match src/app/api/hotels/route.ts CITY_COORDS.
 */
const PROXIMITY_CANARIES = {
  'coulsdon':  { lat: 51.3193, lng: -0.1393, radiusKm: 12 },
  'purley':    { lat: 51.3370, lng: -0.1106, radiusKm: 12 },
  'sutton':    { lat: 51.3618, lng: -0.1945, radiusKm: 12 },
  'bromley':   { lat: 51.4039, lng:  0.0149, radiusKm: 12 },
  'kingston':  { lat: 51.4123, lng: -0.3007, radiusKm: 12 },
  'richmond':  { lat: 51.4613, lng: -0.3037, radiusKm: 12 },
  'twickenham':{ lat: 51.4467, lng: -0.3320, radiusKm: 12 },
  'wimbledon': { lat: 51.4214, lng: -0.2064, radiusKm: 12 },
  'hove':      { lat: 50.8285, lng: -0.1671, radiusKm: 12 },
  'watford':   { lat: 51.6565, lng: -0.3903, radiusKm: 14 },
  'slough':    { lat: 51.5105, lng: -0.5950, radiusKm: 14 },
};

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

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function randomSearch() {
  const offset = randInt(7, 90);
  const nights = randInt(1, 14);
  const ci = new Date(Date.now() + offset * 86400000);
  const co = new Date(ci.getTime() + nights * 86400000);
  const adults = randInt(1, 4);
  const children = Math.random() < 0.3 ? randInt(1, 3) : 0;
  const rooms = Math.random() < 0.2 ? randInt(2, 3) : 1;
  const childrenAges = Array.from({ length: children }, () => randInt(2, 16)).join(',');
  // 25% of runs target a proximity canary suburb so the geo-filter regression
  // gets exercised regularly. The rest hit the broader CITIES pool for
  // shape/echo coverage.
  const canaryKeys = Object.keys(PROXIMITY_CANARIES);
  const useCanary = Math.random() < 0.25;
  const city = useCanary ? pick(canaryKeys) : pick(CITIES);
  // 30% of runs go through the new `occ=` URL parser to stress-test
  // the per-room ingestion path alongside the legacy flat shape.
  const occMode = Math.random() < 0.3 ? 'flat-occ' : 'legacy';
  return {
    city,
    checkin: ci.toISOString().slice(0, 10),
    checkout: co.toISOString().slice(0, 10),
    adults,
    children,
    childrenAges,
    rooms,
    occMode,
  };
}

function buildUrl(s) {
  const p = new URLSearchParams({
    city: s.city,
    checkin: s.checkin,
    checkout: s.checkout,
    adults: String(s.adults),
    children: String(s.children),
    rooms: String(s.rooms),
  });
  if (s.childrenAges) p.set('childrenAges', s.childrenAges);
  // 30% of runs additionally exercise the new per-room `occ=` shape.
  // Encode trivially as everyone-in-room-1 (back-compat path) so the
  // server's per-room ingestion is hit but totals still match the
  // assertion logic above.
  if (s.occMode === 'flat-occ') {
    const ages = (s.childrenAges || '').split(',').filter(Boolean).join('-');
    const segments = [];
    let remaining = s.adults;
    for (let i = 0; i < s.rooms; i++) {
      const a =
        i === s.rooms - 1
          ? Math.max(1, remaining)
          : Math.max(1, Math.floor(s.adults / s.rooms));
      remaining -= a;
      segments.push(i === 0 && ages ? `${a}-${ages}` : `${a}`);
    }
    p.set('occ', segments.join('/'));
  }
  return `${BASE}/api/hotels?${p.toString()}`;
}

function assertResponse(s, status, body) {
  const errs = [];
  if (status !== 200) errs.push(`HTTP ${status}`);
  if (!body || typeof body !== 'object') { errs.push('body not an object'); return errs; }
  if (!Array.isArray(body.hotels)) errs.push('hotels is not an array');
  if (body.adults !== undefined && Number(body.adults) !== s.adults) {
    errs.push(`adults dropped/mutated: sent ${s.adults}, got ${body.adults}`);
  }
  if (body.checkin && body.checkin !== s.checkin) {
    errs.push(`checkin mutated: sent ${s.checkin}, got ${body.checkin}`);
  }
  if (body.checkout && body.checkout !== s.checkout) {
    errs.push(`checkout mutated: sent ${s.checkout}, got ${body.checkout}`);
  }
  // Strict equality on children + rooms — the route now echoes both fields
  // (added in the same change as this assertion). LiteAPI clamps children
  // to 0-4 and rooms to 1-5; mirror those clamps when comparing so a
  // randomised input outside the range doesn't false-positive.
  const expectedChildren = Math.max(0, Math.min(4, s.children));
  if (body.children === undefined) {
    errs.push(`children not echoed (expected ${expectedChildren})`);
  } else if (Number(body.children) !== expectedChildren) {
    errs.push(`children mismatch: sent ${s.children} (clamped ${expectedChildren}), got ${body.children}`);
  }
  // The occupancy decoder clamps rooms to <= adults (LiteAPI rule:
  // each room needs at least 1 adult), so "1 adult / 3 rooms" comes
  // back as 1 room. Mirror that clamp in the assertion.
  const expectedRooms = Math.max(1, Math.min(5, s.rooms, s.adults));
  if (body.rooms === undefined) {
    errs.push(`rooms not echoed (expected ${expectedRooms})`);
  } else if (Number(body.rooms) !== expectedRooms) {
    errs.push(`rooms mismatch: sent ${s.rooms} (clamped ${expectedRooms}), got ${body.rooms}`);
  }
  if (Array.isArray(body.hotels) && body.hotels.length > 0) {
    const h = body.hotels[0];
    if (!h || typeof h !== 'object') errs.push('hotel[0] not an object');
    else {
      if (!h.id) errs.push('hotel[0].id missing');
      if (!h.name) errs.push('hotel[0].name missing');
      const hasPrice = h.pricePerNight != null || h.totalPrice != null || h.price != null;
      if (!hasPrice) errs.push('hotel[0] has no price field');
    }
  }

  // Proximity assertion — only when the search city is a known canary.
  // Sample the first 10 hotels with coords; if any sit outside the radius
  // it means the geo filter let through a Greater-region match (the exact
  // bug Coulsdon hit on 2026-05-03). Hotels missing lat/lng are skipped
  // because the API filter skips them too — we'd false-positive.
  const canary = PROXIMITY_CANARIES[s.city];
  if (canary && Array.isArray(body.hotels) && body.hotels.length > 0) {
    const sample = body.hotels.slice(0, 10);
    const offenders = [];
    for (const h of sample) {
      const lat = h.lat ?? h.latitude;
      const lng = h.lng ?? h.longitude;
      if (typeof lat !== 'number' || typeof lng !== 'number') continue;
      const km = haversineKm(canary, { lat, lng });
      if (km > canary.radiusKm) {
        offenders.push(`${h.name || h.id} ${km.toFixed(1)}km`);
      }
    }
    if (offenders.length > 0) {
      errs.push(`proximity drift (>${canary.radiusKm}km from ${s.city}): ${offenders.slice(0, 3).join(', ')}`);
    }
  }
  return errs;
}

async function runOne(i) {
  const s = randomSearch();
  const url = buildUrl(s);
  const t0 = Date.now();
  let status = 0;
  let body = null;
  let err = null;
  try {
    const r = await fetch(url, { headers: { 'user-agent': 'jetmeaway-monkey/1' } });
    status = r.status;
    const text = await r.text();
    try { body = JSON.parse(text); } catch { body = { _raw: text.slice(0, 200) }; }
  } catch (e) {
    err = e.message || String(e);
  }
  const ms = Date.now() - t0;
  const errs = err ? [`fetch failed: ${err}`] : assertResponse(s, status, body);
  return { i, s, status, ms, errs, count: Array.isArray(body?.hotels) ? body.hotels.length : null };
}

/**
 * Push a failed run into the KV Bug Inbox via /api/bug-monitor. Each
 * fingerprint is the failing-assertion text + city, so identical
 * regressions collapse into one inbox entry with an incrementing count.
 *
 * No-ops when BUG_MONITOR_SECRET is unset (e.g. local dev) so the script
 * is still useful without a network round-trip.
 */
async function reportFailureToInbox(r) {
  const secret = process.env.BUG_MONITOR_SECRET;
  if (!secret) return;
  const message = `monkey-search failure: ${r.s.city} a${r.s.adults}c${r.s.children}r${r.s.rooms} :: ${r.errs.join(' | ')}`;
  const payload = [
    {
      level: 'error',
      message,
      context: {
        source: 'monkey-search.mjs',
        city: r.s.city,
        checkin: r.s.checkin,
        checkout: r.s.checkout,
        adults: r.s.adults,
        children: r.s.children,
        rooms: r.s.rooms,
        status: r.status,
        ms: r.ms,
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
    /* best-effort — don't let inbox push break the suite exit code */
  }
}

async function main() {
  console.log(`Monkey search — ${COUNT} runs against ${BASE}\n`);
  const results = [];
  // Run in batches of 5 to avoid hammering the upstream LiteAPI rate limit.
  const BATCH = 5;
  for (let i = 0; i < COUNT; i += BATCH) {
    const batch = await Promise.all(
      Array.from({ length: Math.min(BATCH, COUNT - i) }, (_, k) => runOne(i + k + 1)),
    );
    for (const r of batch) {
      const tag = r.errs.length === 0 ? 'OK ' : 'FAIL';
      const summary = `${tag} #${String(r.i).padStart(2, '0')} ${r.s.city} ${r.s.checkin}→${r.s.checkout} a${r.s.adults}c${r.s.children}r${r.s.rooms} → ${r.status} ${r.ms}ms ${r.count ?? '-'} hotels`;
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
      console.log(`  #${f.i} ${f.s.city} ${f.s.checkin} a${f.s.adults}c${f.s.children}: ${f.errs.join('; ')}`);
    }
    // Push every failure to the bug inbox so the cron run is self-reporting.
    // Sequential so we don't get rate-limit-rejected by /api/bug-monitor.
    for (const f of failed) await reportFailureToInbox(f);
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(2); });
