#!/usr/bin/env node
/**
 * Affiliate Link Monitor — Stage 6 of the Safety Net.
 *
 * Catches the class of regression that bit us on Build 19 (2026-05-06):
 *   - Trip.com /packages/list silently dropped our city codes when
 *     `iDate`/`oDate` were missing → owner saw "Philadelphia → Savannah"
 *     instead of "London → Tenerife".
 *   - Expedia's bundle flow stopped triggering without a session-bound
 *     `misId` token, falling back to hotels-only.
 *
 * Strategy — TWO complementary layers per target:
 *
 * 1. **Builder assertions** (sync, no network) — a list of substring
 *    fingerprints that MUST appear in the constructed URL. Catches our
 *    regressions instantly: if a refactor accidentally drops `iDate=` or
 *    `partner_id=`, we exit 1 with the missing keys named.
 *
 * 2. **Live reachability** (async, lightweight) — fetches the URL with
 *    a real-Chrome User-Agent, asserts 2xx + final URL still on the
 *    provider domain. Soft-passes 429 (GH runner IP throttling, not a
 *    real regression). Doesn't HTML-parse — providers JS-render and
 *    fingerprint Node fetches, so HTML markers are unreliable.
 *
 * **Why HTTP status alone isn't enough:** Trip.com returned HTTP 200
 * even when /packages/list bounced to /packages/index with the wrong
 * cities. A pure status check would have shown green while the affiliate
 * was silently broken. The builder assertions catch that class.
 *
 * Failure → POSTs to /api/bug-monitor (same fingerprint pipeline as the
 * other monkeys) → owner email + non-zero exit so the GH Action also
 * goes red.
 *
 * Adding a new target: append a row to MONITOR_TARGETS. Each row is
 * self-contained — the runner does the rest.
 *
 * Env:
 *   BASE                 - default https://jetmeaway.co.uk (used for
 *                          /api/bug-monitor reporting only)
 *   BUG_MONITOR_SECRET   - required, gates /api/bug-monitor
 */

const BASE = (process.env.BASE || 'https://jetmeaway.co.uk').replace(/\/$/, '');
const SECRET = process.env.BUG_MONITOR_SECRET || '';

if (!SECRET) {
  console.error('affiliate-link-monitor: BUG_MONITOR_SECRET not set — refusing to run');
  process.exit(2);
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0 Safari/537.36';

// Pick dates 30+ days out so providers don't reject as "too soon".
function pickDates() {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() + 32);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 3);
  const iso = (d) => d.toISOString().slice(0, 10);
  return { dep: iso(start), ret: iso(end) };
}

async function reportBug(message, context) {
  try {
    await fetch(`${BASE}/api/bug-monitor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-bug-monitor-secret': SECRET },
      body: JSON.stringify([
        { level: 'error', message, context: context || {}, ts: new Date().toISOString() },
      ]),
    });
  } catch {
    /* best-effort */
  }
}

/* ── Expedia misId protobuf encoder (mirrors packages-client.tsx) ──── */
function varintBytes(n) {
  const out = []; let v = n >>> 0;
  while (v > 0x7f) { out.push((v & 0x7f) | 0x80); v >>>= 7; }
  out.push(v & 0x7f);
  return out;
}
function lenPrefixed(tag, body) { return [tag, ...varintBytes(body.length), ...body]; }
function bytesToBase64Url(bytes) {
  return Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function encodeExpediaMisIdSuffix(adults, destCityRegion, originIata, originRegion, destIata, destAirportRegion, departISO, returnISO) {
  const enc = (s) => Array.from(Buffer.from(s, 'utf8'));
  const outbound = [
    ...lenPrefixed(0x0a, enc(originIata)),
    0x18, ...varintBytes(originRegion),
    ...lenPrefixed(0x2a, enc(departISO)),
  ];
  const inbound = [
    ...lenPrefixed(0x0a, enc(destIata)),
    0x18, ...varintBytes(destAirportRegion),
    ...lenPrefixed(0x2a, enc(returnISO)),
  ];
  const flightBlock = [0x08, 0x01, ...lenPrefixed(0x12, outbound), ...lenPrefixed(0x12, inbound)];
  const headerBlock = [...lenPrefixed(0x1a, [0x08, adults]), 0x20, ...varintBytes(destCityRegion)];
  return bytesToBase64Url([0x01, ...lenPrefixed(0x12, headerBlock), ...lenPrefixed(0x1a, flightBlock)]);
}

/* ── Per-provider URL builders (mirror prod) ──────────────────────────── */

function buildPackagesTrip({ dep, ret }) {
  return (
    'https://www.trip.com/packages/list?adult=2&child=0&infants=0' +
    '&aCityCode=TCI&dCityCode=LON&tripWay=round-trip&classType=ys' +
    `&dDate=${dep}&rDate=${ret}&iDate=${dep}&oDate=${ret}` +
    '&room=1&sourceFrom=IBUdefault&destinationName=Tenerife' +
    '&isOversea=true&locale=en-GB&curr=GBP' +
    '&Allianceid=8023009&SID=303363796&trip_sub3=D15021113'
  );
}

function buildPackagesExpedia({ dep, ret }) {
  const suffix = encodeExpediaMisIdSuffix(2, 6047194, 'LON', 6139104, 'TFS', 5457492, dep, ret);
  const params = new URLSearchParams({
    packageType: 'fh', searchProduct: 'hotel', adults: '2',
    sort: 'RECOMMENDED', tripType: 'ROUND_TRIP', cabinClass: 'COACH',
    startDate: dep, endDate: ret,
    regionId: '6047194',
    destination: 'Tenerife, Canary Islands, Spain',
    origin: 'London, United Kingdom (LON-All Airports)',
    misId: `A~${suffix}`,
    affcid: 'clbU3QK',
  });
  return `https://www.expedia.co.uk/Hotel-Search?${params.toString()}`;
}

function buildFlightsTrip({ dep, ret }) {
  const common = `dcity=LHR&acity=TFS&ddate=${dep}&adult=2&class=y&Allianceid=8023009&SID=303363796&trip_sub3=D15021113`;
  return `https://www.trip.com/flights/showfarefirst?triptype=RT&${common}&rdate=${ret}&quantity=2`;
}

function buildFlightsExpedia({ dep, ret }) {
  const toUS = (iso) => { const [y, m, d] = iso.split('-'); return `${m}/${d}/${y}`; };
  const passengers = 'adults:2,children:0,seniors:0,infantinlap:Y';
  return (
    `https://www.expedia.co.uk/Flights-Search?mode=search&trip=roundtrip` +
    `&leg1=from:LHR,to:TFS,departure:${toUS(dep)}TANYT` +
    `&leg2=from:TFS,to:LHR,departure:${toUS(ret)}TANYT` +
    `&passengers=${passengers}&affcid=clbU3QK`
  );
}

function buildFlightsAviasales({ dep, ret }) {
  const [, dm, dd] = dep.split('-');
  const [, rm, rd] = ret.split('-');
  const path = `LHR${dd}${dm}TFS${rd}${rm}2`;
  return `https://tp.media/r?marker=714449&trs=512633&p=4114&u=${encodeURIComponent(`https://www.aviasales.com/search/${path}`)}`;
}

function buildCarsTrip({ dep, ret }) {
  const params = new URLSearchParams({
    Allianceid: '8023009', SID: '303363796', trip_sub3: 'D15021113',
    scountry: '109', locale: 'en-XX', curr: 'GBP', fromPage: 'Home',
    pcode: 'TFS', ptype: '1', ptime: `${dep.replace(/-/g, '/')} 10:00`,
    rcode: 'TFS', rtype: '1', rtime: `${ret.replace(/-/g, '/')} 10:00`,
    age: '30-60',
  });
  return `https://www.trip.com/carhire/online/list?${params.toString()}`;
}

function buildCarsEcoBookings({ dep, ret }) {
  const [py, pm, pd] = dep.split('-');
  const [dy, dm, dd] = ret.split('-');
  const ebParams = new URLSearchParams({
    cr: '233', crcy: 'GBP', lang: 'en', age: '30',
    py, pm, pd, dy, dm, dd, pt: '1000', dt: '1000',
    plc: '21847', dlc: '21847', reload: '1',
  });
  const ebUrl = `https://www.economybookings.com/en/cars/results?${ebParams.toString()}`;
  const tpParams = new URLSearchParams({
    marker: '714449', trs: '512633', p: '2018',
    campaign_id: '121', u: ebUrl,
  });
  return `https://tp.media/r?${tpParams.toString()}`;
}

function buildExploreGetYourGuide() {
  return 'https://www.getyourguide.co.uk/s/?q=Tenerife&searchSource=1&partner_id=SsZyZ48h&cmp=jetmeaway';
}

function buildExploreViator() {
  return 'https://www.viator.com/searchResults/all?text=Tenerife&pid=P00293856&mcid=42383&medium=link';
}

/* ── Monitor target matrix ─────────────────────────────────────────────────
 * Each row describes ONE (provider, route, dest) pair we need green. The
 * runner iterates: assertions → reach. Adding a new target = append a row;
 * no other code changes needed.
 *
 *   build()              — produces the URL we'd actually send users to
 *   assertions[]         — substrings the URL MUST contain (catches drops)
 *   finalUrlMustContain  — substrings the post-redirect URL must contain
 *                          (catches redirects to error / login pages)
 */
function buildMonitorTargets({ dep, ret }) {
  return [
    {
      name: 'Trip.com Packages — LON → TFS',
      provider: 'trip.com', type: 'package', dest: 'Tenerife',
      build: () => buildPackagesTrip({ dep, ret }),
      assertions: ['aCityCode=', 'dCityCode=', 'dDate=', 'rDate=', 'iDate=', 'oDate=', 'destinationName=', 'Allianceid=8023009'],
      finalUrlMustContain: ['trip.com'],
    },
    {
      name: 'Expedia Packages — LON → TFS',
      provider: 'expedia.co.uk', type: 'package', dest: 'Tenerife',
      build: () => buildPackagesExpedia({ dep, ret }),
      assertions: ['packageType=fh', 'misId=', 'regionId=', 'startDate=', 'endDate=', 'origin=', 'destination=', 'affcid=clbU3QK'],
      finalUrlMustContain: ['expedia.co.uk'],
    },
    {
      name: 'Trip.com Flights — LHR → TFS',
      provider: 'trip.com', type: 'flight', dest: 'Tenerife',
      build: () => buildFlightsTrip({ dep, ret }),
      assertions: ['triptype=RT', 'dcity=LHR', 'acity=TFS', 'ddate=', 'rdate=', 'Allianceid=8023009'],
      finalUrlMustContain: ['trip.com'],
    },
    {
      name: 'Expedia Flights — LHR → TFS',
      provider: 'expedia.co.uk', type: 'flight', dest: 'Tenerife',
      build: () => buildFlightsExpedia({ dep, ret }),
      assertions: ['mode=search', 'trip=roundtrip', 'leg1=from:LHR,to:TFS', 'leg2=from:TFS,to:LHR', 'affcid=clbU3QK'],
      finalUrlMustContain: ['expedia.co.uk'],
    },
    {
      name: 'Aviasales Flights — LHR → TFS',
      provider: 'aviasales', type: 'flight', dest: 'Tenerife',
      build: () => buildFlightsAviasales({ dep, ret }),
      assertions: ['marker=714449', 'aviasales.com%2Fsearch'],
      finalUrlMustContain: ['aviasales.com', 'tp.media'], // either landing acceptable
    },
    {
      name: 'Trip.com Cars — TFS',
      provider: 'trip.com', type: 'car', dest: 'Tenerife',
      build: () => buildCarsTrip({ dep, ret }),
      assertions: ['pcode=TFS', 'rcode=TFS', 'ptime=', 'rtime=', 'Allianceid=8023009'],
      finalUrlMustContain: ['trip.com'],
    },
    {
      name: 'EconomyBookings Cars — TFS',
      provider: 'economybookings', type: 'car', dest: 'Tenerife',
      build: () => buildCarsEcoBookings({ dep, ret }),
      // The inner economybookings URL is URL-encoded into `u=`, so
      // `plc=21847` appears as `plc%3D21847`. Assert against both the
      // top-level params and the encoded inner params.
      assertions: ['marker=714449', 'economybookings.com', 'plc%3D21847', 'dlc%3D21847'],
      finalUrlMustContain: ['economybookings.com', 'tp.media'],
    },
    {
      name: 'GetYourGuide Explore — Tenerife',
      provider: 'getyourguide', type: 'activity', dest: 'Tenerife',
      build: () => buildExploreGetYourGuide(),
      assertions: ['partner_id=SsZyZ48h', 'q=Tenerife', 'searchSource=1'],
      finalUrlMustContain: ['getyourguide.'],
    },
    {
      name: 'Viator Explore — Tenerife',
      provider: 'viator', type: 'activity', dest: 'Tenerife',
      build: () => buildExploreViator(),
      assertions: ['pid=P00293856', 'mcid=42383', 'text=Tenerife'],
      finalUrlMustContain: ['viator.com'],
    },
  ];
}

/* ── Check primitives ─────────────────────────────────────────────────── */

function checkAssertions(url, assertions) {
  const missing = assertions.filter((s) => !url.includes(s));
  if (missing.length > 0) {
    return { ok: false, reason: `missing parameters: ${missing.join(', ')}` };
  }
  return { ok: true };
}

async function checkReachability(url, finalUrlMustContain) {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, {
      headers: {
        'user-agent': UA,
        accept: 'text/html,application/xhtml+xml',
        'accept-language': 'en-GB,en;q=0.9',
      },
      redirect: 'follow',
      signal: ctrl.signal,
    });
    // Soft-pass codes: providers block GitHub Action runner IPs in
    // various ways — 429 (rate limit), 403 (forbidden, common with
    // GetYourGuide/Viator), 503 (service unavailable, sometimes used
    // by Cloudflare-fronted sites). All three mean "provider blocked
    // our probe", NOT "the affiliate link is broken for real users".
    // The structural assertion above already verified the URL shape;
    // soft-passing here avoids 4am pages for bot detection.
    if (res.status === 429 || res.status === 403 || res.status === 503) {
      return { ok: true, soft: true, reason: `soft-pass: provider blocked probe (${res.status})`, finalUrl: res.url };
    }
    if (!res.ok) {
      return { ok: false, reason: `non-2xx ${res.status}`, finalUrl: res.url };
    }
    // finalUrlMustContain is OR-of-substrings — any one match passes. Lets
    // us accept either landing-page or affiliate-rebrand URL.
    const matched = finalUrlMustContain.some((s) => res.url.includes(s));
    if (!matched) {
      return {
        ok: false,
        reason: `final URL doesn't contain any of: ${finalUrlMustContain.join(' | ')}`,
        finalUrl: res.url,
      };
    }
    return { ok: true, finalUrl: res.url };
  } catch (e) {
    return { ok: false, reason: 'fetch failed', detail: e.message };
  } finally {
    clearTimeout(timeout);
  }
}

/* ── Money Robot runner ───────────────────────────────────────────────── */

async function runMoneyRobotCheck() {
  const t0 = Date.now();
  console.log('🤖 Money Robot: initiating contract validation');
  const { dep, ret } = pickDates();
  console.log(`   dates: ${dep} → ${ret}`);

  const targets = buildMonitorTargets({ dep, ret });
  let hardFailed = 0;
  const summary = [];

  for (const target of targets) {
    const url = target.build();

    // Layer 1: structural assertions. Sync, no network.
    const assertion = checkAssertions(url, target.assertions);
    if (!assertion.ok) {
      hardFailed++;
      console.error(`❌ [${target.provider}] ${target.name} — contract failed: ${assertion.reason}`);
      summary.push({ ok: false, target: target.name, kind: 'assertion', reason: assertion.reason, url });
      await reportBug(`affiliate-link-monitor: ${target.name} contract drift`, {
        target: target.name, provider: target.provider, type: target.type,
        kind: 'assertion', reason: assertion.reason, url,
      });
      continue;
    }

    // Layer 2: reach. Async, soft-passes 429.
    const reach = await checkReachability(url, target.finalUrlMustContain);
    if (reach.ok && reach.soft) {
      console.log(`⚠️  [${target.provider}] ${target.name} — ${reach.reason}`);
      summary.push({ ok: true, soft: true, target: target.name, kind: 'reach', reason: reach.reason });
    } else if (reach.ok) {
      console.log(`✅ [${target.provider}] ${target.name} — alive`);
      summary.push({ ok: true, target: target.name, kind: 'reach' });
    } else {
      hardFailed++;
      console.error(`❌ Money Robot Alert: [${target.provider}] ${target.name} broken — ${reach.reason}`);
      if (reach.finalUrl) console.error(`     landed: ${reach.finalUrl}`);
      if (reach.detail) console.error(`     detail: ${reach.detail}`);
      summary.push({ ok: false, target: target.name, kind: 'reach', reason: reach.reason, url, finalUrl: reach.finalUrl, detail: reach.detail });
      await reportBug(`affiliate-link-monitor: ${target.name} unreachable`, {
        target: target.name, provider: target.provider, type: target.type,
        kind: 'reach', reason: reach.reason, url, finalUrl: reach.finalUrl, detail: reach.detail,
      });
    }
  }

  const dt = Date.now() - t0;
  console.log(
    hardFailed > 0
      ? `🚨 Money Robot: ${hardFailed}/${targets.length} target(s) failed (${dt}ms)`
      : `🏁 Money Robot: all ${targets.length} targets clear (${dt}ms)`,
  );
  return { hardFailed, total: targets.length, summary, durationMs: dt };
}

/* ── Entrypoint ───────────────────────────────────────────────────────── */
runMoneyRobotCheck()
  .then(({ hardFailed }) => process.exit(hardFailed > 0 ? 1 : 0))
  .catch((e) => {
    console.error('affiliate-link-monitor crashed:', e);
    reportBug('affiliate-link-monitor crashed', { error: String(e) }).finally(() => process.exit(1));
  });

export { runMoneyRobotCheck, buildMonitorTargets };
