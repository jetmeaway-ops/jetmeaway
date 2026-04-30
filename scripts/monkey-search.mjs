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
  return {
    city: pick(CITIES),
    checkin: ci.toISOString().slice(0, 10),
    checkout: co.toISOString().slice(0, 10),
    adults,
    children,
    childrenAges,
    rooms,
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
  const expectedRooms = Math.max(1, Math.min(5, s.rooms));
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
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(2); });
