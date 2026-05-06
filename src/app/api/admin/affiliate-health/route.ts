/**
 * GET /api/admin/affiliate-health
 *
 * Stage-6 Safety Net — Money Robot probe, deployed as a Vercel Edge route
 * for belt-and-braces coverage on top of the GitHub Actions nightly. Runs
 * the same target matrix as scripts/affiliate-link-monitor.mjs:
 *
 *   1. Builder assertions — substring fingerprints that MUST be present in
 *      each constructed affiliate URL. Catches our own regressions
 *      (the iDate/oDate-dropped-from-Trip.com class).
 *   2. Reach probe — fetches each URL with a real-Chrome UA and asserts
 *      2xx + final URL still on the provider domain. Soft-passes 403/429/
 *      503 because providers fingerprint and block GH/Vercel runner IPs.
 *
 * Why duplicate the matrix here when scripts/affiliate-link-monitor.mjs
 * exists? GitHub Actions can break (token expired, runner outage, repo
 * disabled). A Vercel-side probe means we still get a heartbeat. The
 * matrix is small and self-contained; drift between the two files is
 * caught by the `assertions` field — both sides need to match the
 * provider's contract, so an update on one cleanly highlights the other.
 *
 * Auth: x-bug-monitor-secret header (same as supplier-health).
 *
 * Response:
 *   { ok: true, summary: { passed, soft, failed, total, durationMs },
 *     targets: [ { name, provider, type, kind, ok, soft?, reason?, url, finalUrl? }, ... ] }
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function pickDates() {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() + 32);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 3);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { dep: iso(start), ret: iso(end) };
}

/* ── Expedia misId protobuf encoder (mirrors packages-client.tsx) ──── */
function varintBytes(n: number): number[] {
  const out: number[] = []; let v = n >>> 0;
  while (v > 0x7f) { out.push((v & 0x7f) | 0x80); v >>>= 7; }
  out.push(v & 0x7f);
  return out;
}
function lenPrefixed(tag: number, body: number[]): number[] { return [tag, ...varintBytes(body.length), ...body]; }
function bytesToBase64Url(bytes: number[]): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  // Edge runtime has btoa
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function encodeExpediaMisIdSuffix(adults: number, destCityRegion: number, originIata: string, originRegion: number, destIata: string, destAirportRegion: number, departISO: string, returnISO: string): string {
  const enc = (s: string) => Array.from(new TextEncoder().encode(s));
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

/* ── Per-provider builders (mirror prod) ──────────────────────────────── */

function buildPackagesTrip({ dep, ret }: { dep: string; ret: string }) {
  return (
    'https://www.trip.com/packages/list?adult=2&child=0&infants=0' +
    '&aCityCode=TCI&dCityCode=LON&tripWay=round-trip&classType=ys' +
    `&dDate=${dep}&rDate=${ret}&iDate=${dep}&oDate=${ret}` +
    '&room=1&sourceFrom=IBUdefault&destinationName=Tenerife' +
    '&isOversea=true&locale=en-GB&curr=GBP' +
    '&Allianceid=8023009&SID=303363796&trip_sub3=D15021113'
  );
}

function buildPackagesExpedia({ dep, ret }: { dep: string; ret: string }) {
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

function buildFlightsTrip({ dep, ret }: { dep: string; ret: string }) {
  const common = `dcity=LHR&acity=TFS&ddate=${dep}&adult=2&class=y&Allianceid=8023009&SID=303363796&trip_sub3=D15021113`;
  return `https://www.trip.com/flights/showfarefirst?triptype=RT&${common}&rdate=${ret}&quantity=2`;
}

function buildFlightsExpedia({ dep, ret }: { dep: string; ret: string }) {
  const toUS = (iso: string) => { const [y, m, d] = iso.split('-'); return `${m}/${d}/${y}`; };
  const passengers = 'adults:2,children:0,seniors:0,infantinlap:Y';
  return (
    `https://www.expedia.co.uk/Flights-Search?mode=search&trip=roundtrip` +
    `&leg1=from:LHR,to:TFS,departure:${toUS(dep)}TANYT` +
    `&leg2=from:TFS,to:LHR,departure:${toUS(ret)}TANYT` +
    `&passengers=${passengers}&affcid=clbU3QK`
  );
}

function buildFlightsAviasales({ dep, ret }: { dep: string; ret: string }) {
  const [, dm, dd] = dep.split('-');
  const [, rm, rd] = ret.split('-');
  const path = `LHR${dd}${dm}TFS${rd}${rm}2`;
  return `https://tp.media/r?marker=714449&trs=512633&p=4114&u=${encodeURIComponent(`https://www.aviasales.com/search/${path}`)}`;
}

function buildCarsTrip({ dep, ret }: { dep: string; ret: string }) {
  const params = new URLSearchParams({
    Allianceid: '8023009', SID: '303363796', trip_sub3: 'D15021113',
    scountry: '109', locale: 'en-XX', curr: 'GBP', fromPage: 'Home',
    pcode: 'TFS', ptype: '1', ptime: `${dep.replace(/-/g, '/')} 10:00`,
    rcode: 'TFS', rtype: '1', rtime: `${ret.replace(/-/g, '/')} 10:00`,
    age: '30-60',
  });
  return `https://www.trip.com/carhire/online/list?${params.toString()}`;
}

function buildCarsEcoBookings({ dep, ret }: { dep: string; ret: string }) {
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

type Target = {
  name: string;
  provider: string;
  type: string;
  dest: string;
  build: () => string;
  assertions: string[];
  finalUrlMustContain: string[];
};

function buildMonitorTargets({ dep, ret }: { dep: string; ret: string }): Target[] {
  return [
    {
      name: 'Trip.com Packages — LON → TFS', provider: 'trip.com', type: 'package', dest: 'Tenerife',
      build: () => buildPackagesTrip({ dep, ret }),
      assertions: ['aCityCode=', 'dCityCode=', 'dDate=', 'rDate=', 'iDate=', 'oDate=', 'destinationName=', 'Allianceid=8023009'],
      finalUrlMustContain: ['trip.com'],
    },
    {
      name: 'Expedia Packages — LON → TFS', provider: 'expedia.co.uk', type: 'package', dest: 'Tenerife',
      build: () => buildPackagesExpedia({ dep, ret }),
      assertions: ['packageType=fh', 'misId=', 'regionId=', 'startDate=', 'endDate=', 'origin=', 'destination=', 'affcid=clbU3QK'],
      finalUrlMustContain: ['expedia.co.uk'],
    },
    {
      name: 'Trip.com Flights — LHR → TFS', provider: 'trip.com', type: 'flight', dest: 'Tenerife',
      build: () => buildFlightsTrip({ dep, ret }),
      assertions: ['triptype=RT', 'dcity=LHR', 'acity=TFS', 'ddate=', 'rdate=', 'Allianceid=8023009'],
      finalUrlMustContain: ['trip.com'],
    },
    {
      name: 'Expedia Flights — LHR → TFS', provider: 'expedia.co.uk', type: 'flight', dest: 'Tenerife',
      build: () => buildFlightsExpedia({ dep, ret }),
      assertions: ['mode=search', 'trip=roundtrip', 'leg1=from:LHR,to:TFS', 'leg2=from:TFS,to:LHR', 'affcid=clbU3QK'],
      finalUrlMustContain: ['expedia.co.uk'],
    },
    {
      name: 'Aviasales Flights — LHR → TFS', provider: 'aviasales', type: 'flight', dest: 'Tenerife',
      build: () => buildFlightsAviasales({ dep, ret }),
      assertions: ['marker=714449', 'aviasales.com%2Fsearch'],
      finalUrlMustContain: ['aviasales.com', 'tp.media'],
    },
    {
      name: 'Trip.com Cars — TFS', provider: 'trip.com', type: 'car', dest: 'Tenerife',
      build: () => buildCarsTrip({ dep, ret }),
      assertions: ['pcode=TFS', 'rcode=TFS', 'ptime=', 'rtime=', 'Allianceid=8023009'],
      finalUrlMustContain: ['trip.com'],
    },
    {
      name: 'EconomyBookings Cars — TFS', provider: 'economybookings', type: 'car', dest: 'Tenerife',
      build: () => buildCarsEcoBookings({ dep, ret }),
      assertions: ['marker=714449', 'economybookings.com', 'plc%3D21847', 'dlc%3D21847'],
      finalUrlMustContain: ['economybookings.com', 'tp.media'],
    },
    {
      name: 'GetYourGuide Explore — Tenerife', provider: 'getyourguide', type: 'activity', dest: 'Tenerife',
      build: () => buildExploreGetYourGuide(),
      assertions: ['partner_id=SsZyZ48h', 'q=Tenerife', 'searchSource=1'],
      finalUrlMustContain: ['getyourguide.'],
    },
    {
      name: 'Viator Explore — Tenerife', provider: 'viator', type: 'activity', dest: 'Tenerife',
      build: () => buildExploreViator(),
      assertions: ['pid=P00293856', 'mcid=42383', 'text=Tenerife'],
      finalUrlMustContain: ['viator.com'],
    },
  ];
}

function checkAssertions(url: string, assertions: string[]): { ok: boolean; reason?: string } {
  const missing = assertions.filter((s) => !url.includes(s));
  if (missing.length > 0) return { ok: false, reason: `missing parameters: ${missing.join(', ')}` };
  return { ok: true };
}

async function checkReachability(url: string, finalUrlMustContain: string[]): Promise<{ ok: boolean; soft?: boolean; reason?: string; finalUrl?: string; detail?: string }> {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml', 'accept-language': 'en-GB,en;q=0.9' },
      redirect: 'follow',
      signal: ctrl.signal,
    });
    if (res.status === 429 || res.status === 403 || res.status === 503) {
      return { ok: true, soft: true, reason: `soft-pass: provider blocked probe (${res.status})`, finalUrl: res.url };
    }
    if (!res.ok) return { ok: false, reason: `non-2xx ${res.status}`, finalUrl: res.url };
    const matched = finalUrlMustContain.some((s) => res.url.includes(s));
    if (!matched) {
      return { ok: false, reason: `final URL doesn't contain any of: ${finalUrlMustContain.join(' | ')}`, finalUrl: res.url };
    }
    return { ok: true, finalUrl: res.url };
  } catch (e: unknown) {
    return { ok: false, reason: 'fetch failed', detail: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const expected = process.env.BUG_MONITOR_SECRET || '';
  if (!expected) {
    return NextResponse.json({ ok: false, error: 'BUG_MONITOR_SECRET not configured' }, { status: 500 });
  }
  const supplied = req.headers.get('x-bug-monitor-secret') || '';
  if (!timingSafeEqual(supplied, expected)) {
    return NextResponse.json({ ok: false, error: 'unauthorised' }, { status: 401 });
  }

  const t0 = Date.now();
  const { dep, ret } = pickDates();
  const targets = buildMonitorTargets({ dep, ret });
  const results: Array<{ name: string; provider: string; type: string; kind: string; ok: boolean; soft?: boolean; reason?: string; url?: string; finalUrl?: string; detail?: string }> = [];

  let passed = 0, soft = 0, failed = 0;

  for (const target of targets) {
    const url = target.build();
    const assertion = checkAssertions(url, target.assertions);
    if (!assertion.ok) {
      failed++;
      results.push({ name: target.name, provider: target.provider, type: target.type, kind: 'assertion', ok: false, reason: assertion.reason, url });
      continue;
    }
    const reach = await checkReachability(url, target.finalUrlMustContain);
    if (reach.ok && reach.soft) {
      soft++;
      results.push({ name: target.name, provider: target.provider, type: target.type, kind: 'reach', ok: true, soft: true, reason: reach.reason, url, finalUrl: reach.finalUrl });
    } else if (reach.ok) {
      passed++;
      results.push({ name: target.name, provider: target.provider, type: target.type, kind: 'reach', ok: true, url, finalUrl: reach.finalUrl });
    } else {
      failed++;
      results.push({ name: target.name, provider: target.provider, type: target.type, kind: 'reach', ok: false, reason: reach.reason, url, finalUrl: reach.finalUrl, detail: reach.detail });
    }
  }

  const summary = { passed, soft, failed, total: targets.length, durationMs: Date.now() - t0 };
  return NextResponse.json({ ok: failed === 0, summary, targets: results }, {
    status: failed === 0 ? 200 : 503,
    headers: { 'cache-control': 'no-store' },
  });
}
