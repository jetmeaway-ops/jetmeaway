#!/usr/bin/env node
/**
 * FULL COVERAGE AUDIT — every place the site claims to cover, tested live.
 *
 * Ordered by the owner on 2026-08-27, after standing at Milano Malpensa while
 * his own site showed 0 hotels: "run a full audit — don't leave a single
 * town, city, country, landmark, place of attraction or airport."
 *
 * SOURCES (enumerated from the repo's own promise-surface):
 *   dropdown   — the static DESTINATIONS list in hotels-client.tsx
 *   curated    — entry names in src/data/destinations.ts
 *   landmark   — every LANDMARK_ALIASES entry, searched EXACTLY as the
 *                client builds it (label + coords + radius + searchType)
 *   airport    — EVERY key variant in AIRPORT_COORDS_RAW (incl. IATA codes
 *                and native spellings), plus a "<key> airport" form
 *   blog       — ctaCity of every content/posts/best-hotels-*.mdx
 *
 * Each unique place gets a live /api/hotels search (couple, 3 weeks out,
 * 2 nights). PASS = at least one bookable offer. Failures retry once
 * (transient upstream ≠ missing coverage). A sample of passes plus every
 * failure then gets the end-to-end check: details (coords) + rates (offers +
 * party echo) on the first hotel.
 *
 * Output: audit-results.json (full rows) + a class-grouped summary. When
 * BUG_MONITOR_SECRET is set, one inbox bug PER FAILURE CLASS (not per row).
 *
 * Usage:
 *   node scripts/audit-coverage.mjs                 # full sweep vs prod
 *   ONLY=airport node scripts/audit-coverage.mjs    # one source only
 *   LIMIT=40 node scripts/audit-coverage.mjs        # cap (smoke)
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.BASE || 'https://jetmeaway.co.uk';
const ONLY = process.env.ONLY || '';
const LIMIT = Number(process.env.LIMIT) || 0;
const CONCURRENCY = 3;

function dates() {
  const plus = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  return { checkin: plus(21), checkout: plus(23) };
}
const { checkin, checkout } = dates();

/* ── source enumeration (regex over repo files — same pattern as monkey-landmark) ── */

function dropdownEntries() {
  const src = readFileSync('src/app/hotels/hotels-client.tsx', 'utf8');
  const m = src.match(/const DESTINATIONS = \[([\s\S]*?)\];/);
  if (!m) return [];
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => ({ source: 'dropdown', query: x[1] }));
}

function curatedEntries() {
  const src = readFileSync('src/data/destinations.ts', 'utf8');
  // Entry-level names sit at 4-space indent; neighbourhood names are nested
  // deeper inside `neighbourhoods: [...]` and must not be searched as cities.
  return [...src.matchAll(/^ {4}name: '([^']+)',/gm)].map((x) => ({ source: 'curated', query: x[1] }));
}

function landmarkEntries() {
  const src = readFileSync('src/app/hotels/hotels-client.tsx', 'utf8');
  const rows = [...src.matchAll(
    /label: '([^']+)'[\s\S]{0,240}?searchAs: '([^']+)'[\s\S]{0,240}?lat: ([-\d.]+), lng: ([-\d.]+), radiusKm: (\d+)/g,
  )];
  return rows.map((m) => ({
    source: 'landmark',
    query: m[2], // the client rewrites label → searchAs for the city param
    label: m[1],
    extra: `&lat=${m[3]}&lng=${m[4]}&radius=${m[5]}&searchType=landmark`,
  }));
}

function airportEntries() {
  const src = readFileSync('src/app/api/hotels/route.ts', 'utf8');
  const block = src.match(/AIRPORT_COORDS_RAW[\s\S]*?=\s*\[([\s\S]*?)\n\];/);
  if (!block) return [];
  const out = [];
  for (const row of block[1].matchAll(/keys: \[([^\]]+)\]/g)) {
    for (const k of row[1].matchAll(/'([^']+)'/g)) {
      const key = k[1];
      out.push({ source: 'airport', query: key });
      if (!/airport/.test(key) && key.length > 3) {
        out.push({ source: 'airport', query: `${key} airport` });
      }
    }
  }
  return out;
}

function blogEntries() {
  const dir = 'content/posts';
  const out = [];
  for (const f of readdirSync(dir)) {
    if (!f.startsWith('best-hotels-') || !f.endsWith('.mdx')) continue;
    const head = readFileSync(join(dir, f), 'utf8').slice(0, 2000);
    const m = head.match(/ctaCity: "([^"]+)"/);
    if (m) out.push({ source: 'blog', query: m[1], file: f });
  }
  return out;
}

/* ── live checks ── */

async function getJson(path, timeoutMs = 150_000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}${path}`, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    return { status: res.status, body: await res.json().catch(() => null) };
  } catch (err) {
    return { status: 0, body: null, err: err?.name || 'fetch failed' };
  } finally {
    clearTimeout(timer);
  }
}

const bookable = (d) => (d?.hotels || []).filter((h) => h.bookable && h.offerId && h.totalPrice > 0);

async function searchOnce(e) {
  const qs = `city=${encodeURIComponent(e.query)}&checkin=${checkin}&checkout=${checkout}&adults=2&children=0&rooms=1${e.extra || ''}`;
  const r = await getJson(`/api/hotels?${qs}`);
  const rows = bookable(r.body);
  return { status: r.status, count: rows.length, cheapest: rows.length ? Math.min(...rows.map((h) => h.pricePerNight || 9e9)) : null, first: rows[0]?.id || null, err: r.err };
}

function classify(e, r1, r2) {
  const r = r2 || r1;
  if (r.status === 0) return 'network-timeout';
  if (r.status !== 200) return `http-${r.status}`;
  if (r.count > 0) return 'PASS';
  return 'zero-hotels';
}

async function e2e(hotelId) {
  const det = await getJson(`/api/hotels/details/${hotelId}`);
  const h = det.body?.hotel;
  const coordsOk = h && typeof h.latitude === 'number' && typeof h.longitude === 'number';
  const rates = await getJson(`/api/hotels/rates?hotelId=${hotelId}&checkin=${checkin}&checkout=${checkout}&adults=2&children=0&rooms=1`);
  const offers = (rates.body?.offers || []).filter((o) => o.offerId && o.totalPrice > 0);
  const partyOk = rates.body?.party?.adults === 2;
  return { coordsOk, offerCount: offers.length, partyOk };
}

/* ── main ── */

async function main() {
  let entries = [...dropdownEntries(), ...curatedEntries(), ...landmarkEntries(), ...airportEntries(), ...blogEntries()];
  if (ONLY) entries = entries.filter((e) => e.source === ONLY);
  // Dedupe by (query lowercased + extra) — blog/dropdown/curated overlap heavily.
  const seen = new Set();
  entries = entries.filter((e) => {
    const k = `${e.query.toLowerCase()}|${e.extra || ''}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  if (LIMIT) entries = entries.slice(0, LIMIT);
  console.log(`COVERAGE AUDIT — ${entries.length} unique places against ${BASE} (${checkin}→${checkout})\n`);

  const results = [];
  let done = 0;
  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    const batch = await Promise.all(entries.slice(i, i + CONCURRENCY).map(async (e) => {
      const r1 = await searchOnce(e);
      let r2 = null;
      if (r1.count === 0 || r1.status !== 200) r2 = await searchOnce(e); // one retry — transient ≠ broken
      const verdict = classify(e, r1, r2);
      return { ...e, verdict, count: (r2 || r1).count, cheapest: (r2 || r1).cheapest, first: (r2 || r1).first };
    }));
    results.push(...batch);
    done += batch.length;
    for (const b of batch) {
      if (b.verdict !== 'PASS') console.log(`  FAIL [${b.source}] "${b.query}" → ${b.verdict}`);
    }
    if (done % 60 < CONCURRENCY) console.log(`  … ${done}/${entries.length}`);
  }

  // Stage B — E2E: every failure's source city can't be E2E'd (no hotel), so
  // run it on every 10th PASS to prove the booking path end to end.
  let e2eFail = 0, e2eRun = 0;
  for (let i = 0; i < results.length; i += 10) {
    const r = results[i];
    if (r.verdict !== 'PASS' || !r.first) continue;
    e2eRun++;
    const x = await e2e(r.first);
    if (!x.coordsOk || x.offerCount === 0 || !x.partyOk) {
      e2eFail++;
      r.verdict = 'E2E-FAIL';
      r.e2e = x;
      console.log(`  E2E-FAIL [${r.source}] "${r.query}" ${r.first} → ${JSON.stringify(x)}`);
    }
  }

  writeFileSync('audit-results.json', JSON.stringify(results, null, 1));

  const bySource = {};
  const byClass = {};
  for (const r of results) {
    bySource[r.source] = bySource[r.source] || { total: 0, pass: 0 };
    bySource[r.source].total++;
    if (r.verdict === 'PASS') bySource[r.source].pass++;
    else (byClass[r.verdict] = byClass[r.verdict] || []).push(`[${r.source}] ${r.query}`);
  }
  console.log('\n════════ SUMMARY ════════');
  for (const [s, v] of Object.entries(bySource)) console.log(`  ${s.padEnd(9)} ${v.pass}/${v.total} pass`);
  for (const [c, list] of Object.entries(byClass)) {
    console.log(`\n  ✖ ${c} (${list.length}):`);
    for (const l of list.slice(0, 30)) console.log(`      ${l}`);
    if (list.length > 30) console.log(`      … +${list.length - 30} more (see audit-results.json)`);
  }
  console.log(`\n  E2E sample: ${e2eRun} run, ${e2eFail} failed`);

  // One inbox bug per failure CLASS — the triage robot fixes diseases, not rows.
  const secret = process.env.BUG_MONITOR_SECRET;
  if (secret) {
    for (const [c, list] of Object.entries(byClass)) {
      if (c === 'network-timeout') continue; // not the site's fault
      try {
        await fetch(`${BASE}/api/bug-monitor`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-bug-monitor-secret': secret },
          body: JSON.stringify([{
            level: 'error',
            message: `coverage-audit: ${list.length} places fail with ${c} — e.g. ${list.slice(0, 5).join(' ; ')}`,
            context: { source: 'audit-coverage.mjs', class: c, count: list.length, sample: list.slice(0, 15) },
            ts: new Date().toISOString(),
          }]),
        });
      } catch { /* best-effort */ }
    }
  }

  const failTotal = results.filter((r) => r.verdict !== 'PASS' && r.verdict !== 'network-timeout').length;
  console.log(`\n${results.length - failTotal}/${results.length} places healthy`);
  if (failTotal > 0) process.exit(1);
}

main().catch((err) => { console.error('audit crashed:', err); process.exit(2); });
