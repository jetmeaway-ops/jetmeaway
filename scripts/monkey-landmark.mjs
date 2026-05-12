#!/usr/bin/env node
/**
 * Monkey Landmark Suite — Stage 7 of the Safety Net build.
 *
 * Iterates every entry in LANDMARK_ALIASES (curated famous-landmarks +
 * hidden-gems list inside src/app/hotels/hotels-client.tsx) and asserts
 * each landmark's `searchAs` city returns ≥1 hotel via /api/hotels.
 *
 * The list is parsed by regex from the TSX source so we don't need to
 * import a client-only React module from a Node script. When the list
 * is eventually refactored into a shared module this script should
 * import that module directly.
 *
 * Usage:
 *   node scripts/monkey-landmark.mjs                       # all landmarks vs prod
 *   BASE=http://localhost:3000 node scripts/monkey-landmark.mjs
 *
 * Exit code 0 = every landmark returned ≥1 hotel. Non-zero = at least one
 * failed; failures POST to /api/bug-monitor when BUG_MONITOR_SECRET is set.
 *
 * Why this matters: yesterday's 94-landmark rollout shipped silently broken
 * because none of the new entries were tested against the API. Reproducing
 * that class of bug should never be possible again — every alias gets a
 * production smoke-test on every nightly run.
 */

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const BASE = process.env.BASE || 'https://jetmeaway.co.uk';
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const SOURCE = path.resolve(__dirname, '..', 'src', 'app', 'hotels', 'hotels-client.tsx');

/**
 * Parse LANDMARK_ALIASES out of the TSX source. We pair each `label:` with
 * the closest preceding `searchAs:` block. Both single- and double-quoted
 * strings are accepted in case the file gets reformatted.
 */
function loadLandmarks() {
  const text = fs.readFileSync(SOURCE, 'utf8');
  const start = text.indexOf('LANDMARK_ALIASES');
  if (start === -1) throw new Error('LANDMARK_ALIASES marker not found in ' + SOURCE);
  const openBracket = text.indexOf('[', start);
  const closeBracket = text.indexOf('\n];', openBracket);
  if (openBracket === -1 || closeBracket === -1) {
    throw new Error('Failed to locate LANDMARK_ALIASES array boundaries');
  }
  const body = text.slice(openBracket, closeBracket);
  // Anchor each entry by `placeId:` (every entry has one) and walk
  // both directions from that anchor to find the matching label/lat/
  // lng/radiusKm. This is robust to single-line vs multi-line entry
  // formatting and doesn't depend on brace counting.
  const entries = [];
  // After placeId comes `, lat: X, lng: Y, radiusKm: N` on the same line.
  // Allow commas + whitespace between; stop at `}` or newline.
  const placeIdRe = /placeId:\s*['"]([^'"]+)['"](?:[^}\n]*?\blat:\s*(-?\d+(?:\.\d+)?)[^}\n]*?\blng:\s*(-?\d+(?:\.\d+)?)[^}\n]*?\bradiusKm:\s*(\d+))?/g;
  let m;
  while ((m = placeIdRe.exec(body)) !== null) {
    // For each placeId match, scan BACKWARDS to the nearest preceding
    // `{` and extract label + searchAs from that entry's text.
    const placeIdEnd = m.index + m[0].length;
    // Find the opening `{` of this entry — search backwards from placeId.
    let entryStart = body.lastIndexOf('{', m.index);
    if (entryStart < 0) continue;
    const entryEnd = body.indexOf('}', placeIdEnd);
    if (entryEnd < 0) continue;
    const entryText = body.slice(entryStart, entryEnd + 1);
    const labelM = entryText.match(/label:\s*['"]([^'"]+)['"]/);
    const searchAsM = entryText.match(/searchAs:\s*['"]([^'"]+)['"]/);
    if (!labelM || !searchAsM) continue;
    entries.push({
      label: labelM[1],
      searchAs: searchAsM[1],
      placeId: m[1],
      lat: m[2] ? Number(m[2]) : null,
      lng: m[3] ? Number(m[3]) : null,
      radiusKm: m[4] ? Number(m[4]) : null,
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

function buildUrl(entry, checkin, checkout) {
  const p = new URLSearchParams({
    city: entry.searchAs,
    checkin,
    checkout,
    adults: '2',
    children: '0',
    rooms: '1',
  });
  // Pass lat/lng/radius when the alias has them so the backend does a
  // proper LiteAPI radius search at the landmark coords. This mirrors
  // exactly what the frontend sends after a landmark autocomplete click.
  if (typeof entry.lat === 'number' && typeof entry.lng === 'number') {
    p.set('lat', String(entry.lat));
    p.set('lng', String(entry.lng));
  }
  if (typeof entry.radiusKm === 'number') {
    p.set('radius', String(entry.radiusKm));
  }
  return `${BASE}/api/hotels?${p.toString()}`;
}

async function runOne(entry) {
  const { checkin, checkout } = nightsFromNow(30, 2);
  const url = buildUrl(entry, checkin, checkout);
  const t0 = Date.now();
  let status = 0;
  let body = null;
  let err = null;
  try {
    const r = await fetch(url, { headers: { 'user-agent': 'jetmeaway-monkey-landmark/1' } });
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
  const hotelCount = hotels?.length ?? null;
  if (hotelCount === null) errs.push('hotels not an array');
  else if (hotelCount === 0) errs.push('hotels.length === 0');

  // Proximity assertion — every returned hotel with coords must sit
  // within `entry.radiusKm` of the landmark. We sample ALL returned
  // hotels (landmark searches are curated; we want full coverage, not
  // the first-10 sample monkey-search does for random city tests).
  // Skip when the alias has no coords (falls back to city search path)
  // or when no hotels came back (the count-based assertion above catches
  // that). Hotels missing lat/lng are skipped so we don't false-positive.
  if (
    typeof entry.lat === 'number' &&
    typeof entry.lng === 'number' &&
    typeof entry.radiusKm === 'number' &&
    hotels &&
    hotels.length > 0
  ) {
    const landmark = { lat: entry.lat, lng: entry.lng };
    const offenders = [];
    for (const h of hotels) {
      const lat = h.lat ?? h.latitude;
      const lng = h.lng ?? h.longitude;
      if (typeof lat !== 'number' || typeof lng !== 'number') continue;
      const km = haversineKm(landmark, { lat, lng });
      if (km > entry.radiusKm) {
        offenders.push(`${(h.name || h.id || '?').slice(0, 36)} ${km.toFixed(1)}km`);
      }
    }
    if (offenders.length > 0) {
      errs.push(
        `proximity drift (>${entry.radiusKm}km from ${entry.label}): ${offenders.slice(0, 3).join(', ')}${offenders.length > 3 ? ` (+${offenders.length - 3} more)` : ''}`,
      );
    }
  }
  return { entry, status, ms, errs, hotelCount, checkin, checkout };
}

async function reportFailureToInbox(r) {
  const secret = process.env.BUG_MONITOR_SECRET;
  if (!secret) return;
  const message = `monkey-landmark failure: ${r.entry.label} → ${r.entry.searchAs} :: ${r.errs.join(' | ')}`;
  const payload = [
    {
      level: 'error',
      message,
      context: {
        source: 'monkey-landmark.mjs',
        label: r.entry.label,
        searchAs: r.entry.searchAs,
        checkin: r.checkin,
        checkout: r.checkout,
        status: r.status,
        ms: r.ms,
        hotelCount: r.hotelCount,
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
  const landmarks = loadLandmarks();
  console.log(`Monkey landmark — ${landmarks.length} aliases against ${BASE}\n`);
  const results = [];
  // Batch of 5 concurrent — mirrors monkey-search to avoid LiteAPI throttling.
  const BATCH = 5;
  for (let i = 0; i < landmarks.length; i += BATCH) {
    const slice = landmarks.slice(i, i + BATCH);
    const batch = await Promise.all(slice.map(runOne));
    for (const r of batch) {
      const tag = r.errs.length === 0 ? 'OK ' : 'FAIL';
      const summary = `${tag} ${r.entry.label.padEnd(34)} → ${r.entry.searchAs.padEnd(22)} ${r.status} ${r.ms}ms ${r.hotelCount ?? '-'} hotels`;
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
      console.log(`  ${f.entry.label} → ${f.entry.searchAs}: ${f.errs.join('; ')}`);
    }
    // Push every failure to the bug inbox so the cron run is self-reporting.
    for (const f of failed) await reportFailureToInbox(f);
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(2); });
