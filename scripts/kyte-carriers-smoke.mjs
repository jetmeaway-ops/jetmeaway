#!/usr/bin/env node
/**
 * Kyte multi-carrier search smoke.
 *
 * Runs `POST /api/flights/kyte/search` once per LCC (except Ryanair —
 * that's the OTA/iframe path tracked separately in Phase 5) and prints
 * a summary table of offer counts + latency.
 *
 * Search-only by design — no Book/Payment, so no bookings land in KV.
 * If a carrier returns ≥1 offer here, the full lifecycle should also
 * work (we've already proven Shop→Book→Payment→Retrieve on Jet2).
 *
 * Prerequisite: dev server running at BASE (default localhost:3000).
 *
 * Usage:
 *   npm run dev   # in another terminal
 *   node scripts/kyte-carriers-smoke.mjs
 */

const BASE = process.env.BASE || 'http://localhost:3000';

// 2026 calendar note: 45 days from 2026-05-12 = 2026-06-26 (Friday).
// Volotea V7 LUX-NCE operates Mon/Thu/Fri — Friday works.
const departureDate = (() => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 45);
  return d.toISOString().slice(0, 10);
})();

const CARRIERS = [
  { code: 'LS', name: 'Jet2',      from: 'MAN', to: 'PMI' },
  { code: 'U2', name: 'easyJet',   from: 'LGW', to: 'AMS' },
  { code: '6E', name: 'IndiGo',    from: 'DEL', to: 'BOM' },
  { code: 'W6', name: 'Wizz Air',  from: 'LTN', to: 'BUD' },
  { code: 'HV', name: 'Transavia', from: 'AMS', to: 'AGP' },
  { code: 'V7', name: 'Volotea',   from: 'LUX', to: 'NCE' },
];

const results = [];

for (const c of CARRIERS) {
  const t0 = Date.now();
  let status = 0;
  let offerCount = 0;
  let note = '';
  try {
    const res = await fetch(`${BASE}/api/flights/kyte/search`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        origin: c.from,
        destination: c.to,
        departure: departureDate,
        adults: 1,
        airlines: c.code,
      }),
    });
    status = res.status;
    const text = await res.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      note = 'non-JSON response';
    }
    if (payload && typeof payload === 'object') {
      offerCount = payload.offerCount ?? 0;
      if (status !== 200) {
        note = String(payload.error || '').slice(0, 60);
      } else if (offerCount === 0) {
        note = 'no offers (try different route/date)';
      }
    }
  } catch (err) {
    note = `network: ${err.message}`;
  }
  const latency = Date.now() - t0;
  results.push({ ...c, status, offerCount, latency, note });
  const tick = status === 200 && offerCount > 0 ? '✓' : '✗';
  console.log(
    `${tick} ${c.code.padEnd(2)} ${c.name.padEnd(10)} ${c.from}-${c.to}  status=${status}  offers=${offerCount}  ${latency}ms  ${note}`,
  );
}

console.log('');
const okCount = results.filter((r) => r.status === 200 && r.offerCount > 0).length;
console.log(`Result: ${okCount}/${CARRIERS.length} carriers returning offers`);
console.log(`Departure date used: ${departureDate}`);
if (okCount < CARRIERS.length) {
  console.log('');
  console.log('For carriers with 0 offers, try a different route or date:');
  console.log('  CARRIER=<code> FROM=<iata> TO=<iata> node scripts/kyte-book-smoke.mjs');
  process.exit(1);
}
