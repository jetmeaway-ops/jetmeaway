#!/usr/bin/env node
/**
 * Monkey Kyte — Stage 9 of the Safety Net build.
 *
 * Asserts that production `/api/flights/kyte/search` is returning real,
 * shape-correct offers for every Kyte-enabled carrier on a known-good
 * sandbox route. Designed to be run nightly + before every prod push.
 *
 * If this script fails:
 *   - check Vercel function logs for /api/flights/kyte/search (look for
 *     "External APIs: No outgoing requests" — classic ProxyAgent
 *     construction failure indicating KYTE_PROXY_URL is empty/corrupt)
 *   - check app.usefixie.com → kyte-proxy quota
 *   - check inbox for Raquel updates (airline-side sandbox outages)
 *
 * Wizz Air (W6) was previously excluded — Raquel had it raised internally
 * 2026-05-12/13 (airline-side outage). REINSTATED 2026-05-13: Kyte sandbox
 * now returns offers cleanly on BUD-LTN. If it drops again, the script
 * fails loudly so we know within 24h instead of hearing from Raquel.
 *
 * Usage:
 *   node scripts/monkey-kyte.mjs                       # all carriers vs prod
 *   BASE=http://localhost:3000 node scripts/monkey-kyte.mjs
 *
 * Exit code 0 = all green. Non-zero = at least one carrier failed; failures
 * POST to /api/bug-monitor when BUG_MONITOR_SECRET is set.
 */

const BASE = process.env.BASE || 'https://jetmeaway.co.uk';
const BUG_MONITOR_SECRET = process.env.BUG_MONITOR_SECRET || '';

/**
 * Carriers + sandbox-friendly routes. Picked from the 2026-05-12 marathon
 * smoke runs — every one of these returns ≥1 offer in Kyte sandbox today.
 * If a carrier ever drops to 0 offers, fix the route here (Kyte sandbox
 * inventory shifts) rather than disable the assertion.
 */
const CARRIERS = [
  { code: 'LS', name: 'Jet2',      from: 'MAN', to: 'PMI', expectMin: 1 },
  // easyJet sandbox has been intermittently returning 0 offers (observed
  // 2026-05-12 evening — had 5 offers earlier same day, then 0). Could
  // be Kyte-side or airline-side; soft-fail until it stabilises.
  { code: 'U2', name: 'easyJet',   from: 'LGW', to: 'AMS', expectMin: 0, softZero: true },
  { code: '6E', name: 'IndiGo',    from: 'DEL', to: 'BOM', expectMin: 1 },
  { code: 'HV', name: 'Transavia', from: 'AMS', to: 'AGP', expectMin: 1 },
  // V7 needs a Mon/Thu/Fri departure for LUX-NCE. The +45 day default
  // lands on whatever day-of-week 45 days out is — sometimes Volotea
  // doesn't operate. Treat 0 offers as soft-fail rather than hard.
  { code: 'V7', name: 'Volotea',   from: 'LUX', to: 'NCE', expectMin: 0, softZero: true },
  { code: 'FR', name: 'Ryanair',   from: 'BUD', to: 'DUB', expectMin: 1 },
  // W6 Wizz Air — back online 2026-05-13 after airline-side outage.
  // BUD-LTN observed returning 3 offers; LGW-BUD returned 1. Use BUD-LTN
  // as the more reliable canary. Hard-fail on 0 so we get a Sentry alert
  // if Wizz drops again rather than silently going dark.
  { code: 'W6', name: 'Wizz Air',  from: 'BUD', to: 'LTN', expectMin: 1 },
];

const departureDate = (() => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 45);
  return d.toISOString().slice(0, 10);
})();

async function testCarrier(c) {
  const t0 = Date.now();
  let res, data;
  try {
    res = await fetch(`${BASE}/api/flights/kyte/search`, {
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
    const text = await res.text();
    try {
      data = JSON.parse(text);
    } catch {
      return { c, ok: false, reason: `non-JSON response: ${text.slice(0, 100)}`, latency: Date.now() - t0 };
    }
  } catch (err) {
    return { c, ok: false, reason: `network error: ${err.message}`, latency: Date.now() - t0 };
  }

  const latency = Date.now() - t0;
  if (res.status !== 200) {
    return { c, ok: false, reason: `HTTP ${res.status}: ${data?.error || 'unknown'} (${data?.detail || ''})`, latency };
  }

  const offerCount = data.offerCount ?? 0;
  if (offerCount < c.expectMin) {
    if (c.softZero && offerCount === 0) {
      return { c, ok: true, reason: 'no offers (soft-fail allowed)', latency, offerCount, softZero: true };
    }
    return { c, ok: false, reason: `expected ≥${c.expectMin} offers, got ${offerCount}`, latency, offerCount };
  }

  // Shape assertions on the first offer — catches converter regressions.
  const offerIds = Object.keys(data.offers || {});
  const firstOffer = offerIds.length ? data.offers[offerIds[0]] : null;
  if (offerCount > 0 && !firstOffer) {
    return { c, ok: false, reason: 'offerCount > 0 but offers map is empty', latency, offerCount };
  }
  if (firstOffer) {
    if (typeof firstOffer.totalPrice !== 'number') {
      return { c, ok: false, reason: `offer.totalPrice missing or not a number`, latency, offerCount };
    }
    if (!firstOffer.currency?.code) {
      return { c, ok: false, reason: `offer.currency.code missing`, latency, offerCount };
    }
    const solIds = Array.isArray(firstOffer.flightSolutions) ? firstOffer.flightSolutions : [];
    if (solIds.length === 0) {
      return { c, ok: false, reason: `offer.flightSolutions empty`, latency, offerCount };
    }
    const sol = data.flightSolutions?.[solIds[0]];
    if (!sol?.segments?.length) {
      return { c, ok: false, reason: `flightSolutions[${solIds[0]}].segments missing or empty`, latency, offerCount };
    }
    const seg = sol.segments[0];
    if (!seg.marketingCarrier?.code || !seg.flightNumber || !seg.departure?.date) {
      return { c, ok: false, reason: `segment shape incomplete`, latency, offerCount };
    }
  }

  return {
    c,
    ok: true,
    latency,
    offerCount,
    sampleFlight: firstOffer
      ? `${data.flightSolutions[firstOffer.flightSolutions[0]].segments[0].marketingCarrier.code}${data.flightSolutions[firstOffer.flightSolutions[0]].segments[0].flightNumber}`
      : null,
    samplePriceMinor: firstOffer?.totalPrice,
  };
}

async function reportBug(summary, detail) {
  if (!BUG_MONITOR_SECRET) return;
  try {
    await fetch(`${BASE}/api/bug-monitor`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-bug-monitor-secret': BUG_MONITOR_SECRET,
      },
      body: JSON.stringify({
        source: 'monkey-kyte',
        summary,
        detail,
      }),
    });
  } catch {
    // best-effort; don't mask the original failure
  }
}

console.log(`[monkey-kyte] BASE=${BASE} date=${departureDate}`);
console.log('');

const results = [];
for (const c of CARRIERS) {
  const r = await testCarrier(c);
  results.push(r);
  const tick = r.ok ? '✓' : '✗';
  const note = r.ok
    ? `${r.offerCount} offers · ${r.sampleFlight ?? '—'} · ${r.samplePriceMinor != null ? '£' + (r.samplePriceMinor / 100).toFixed(2) : ''}${r.softZero ? ' (soft)' : ''}`
    : r.reason;
  console.log(`${tick} ${c.code} ${c.name.padEnd(10)} ${c.from}-${c.to}  ${r.latency}ms  ${note}`);
}

const failures = results.filter((r) => !r.ok);
const okCount = results.length - failures.length;
console.log('');
console.log(`${okCount}/${results.length} carriers green`);

if (failures.length > 0) {
  await reportBug(
    `monkey-kyte: ${failures.length} carrier(s) failing on ${BASE}`,
    failures
      .map((f) => `${f.c.code} ${f.c.name} ${f.c.from}-${f.c.to}: ${f.reason}`)
      .join('\n'),
  );
  process.exit(1);
}
process.exit(0);
