/**
 * Affiliate URL builders for the /car-hire/[slug] landing pages.
 *
 * These are LIFTED VERBATIM from the contracts already proven in
 * `src/app/cars/page.tsx` — same params, same markers, same verified
 * behaviour. Do not "tidy" them: the param shapes were reverse-engineered
 * from real form submissions and re-verified in a browser (see the comment
 * blocks in cars/page.tsx for the verification log).
 *
 * The landing pages are server components, so they can't hold live date
 * state. We therefore build links with a sensible default window (a week
 * starting ~30 days out) purely so the partner lands on a *populated*
 * results page rather than an empty form — the user then adjusts dates
 * on the partner side. Affiliate review fails on empty/unresolved
 * results pages, which is why we never link to a bare homepage.
 */

const TP_MARKER = '714449';
const TP_TRS = '512633';
const EB_P = '2018';
const EB_CAMP = '10';

const TRIP_ALLIANCE = '8023009';
const TRIP_SID = '303363796';
const TRIP_SUB = 'D15021113';

/** YYYY-MM-DD for `days` from now, computed at render time. */
function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Default search window used by the static landing pages. */
export function defaultWindow(): { pickupDate: string; dropoffDate: string } {
  return { pickupDate: isoDaysFromNow(30), dropoffDate: isoDaysFromNow(37) };
}

/** EconomyBookings via Travelpayouts — contract proven in cars/page.tsx. */
export function buildEcoBookingsUrl(opts: {
  plc: number;
  pickupDate: string;
  dropoffDate: string;
  pickupTime?: string;
  dropoffTime?: string;
  driverAge?: number;
  currency?: string;
}): string {
  const [py, pm, pd] = opts.pickupDate.split('-');
  const [dy, dm, dd] = opts.dropoffDate.split('-');
  const pt = (opts.pickupTime ?? '10:00').replace(':', '');
  const dt = (opts.dropoffTime ?? '10:00').replace(':', '');

  const ebParams = new URLSearchParams({
    cr: '233',
    crcy: opts.currency ?? 'GBP',
    lang: 'en',
    age: String(opts.driverAge ?? 30),
    py, pm, pd,
    dy, dm, dd,
    pt, dt,
    plc: String(opts.plc),
    dlc: String(opts.plc),
    reload: '1',
  });
  const ebUrl = `https://www.economybookings.com/en/cars/results?${ebParams.toString()}`;

  const tpParams = new URLSearchParams({
    marker: TP_MARKER,
    trs: TP_TRS,
    p: EB_P,
    campaign_id: EB_CAMP,
    u: ebUrl,
  });
  return `https://tp.media/r?${tpParams.toString()}`;
}

/** Trip.com direct affiliate — contract proven in cars/page.tsx. */
export function buildTripComUrl(opts: {
  iata: string;
  pickupDate: string;
  dropoffDate: string;
  pickupTime?: string;
  dropoffTime?: string;
  currency?: string;
}): string {
  const ptime = `${opts.pickupDate.replace(/-/g, '/')} ${opts.pickupTime ?? '10:00'}`;
  const rtime = `${opts.dropoffDate.replace(/-/g, '/')} ${opts.dropoffTime ?? '10:00'}`;

  const params = new URLSearchParams({
    Allianceid: TRIP_ALLIANCE,
    SID: TRIP_SID,
    trip_sub3: TRIP_SUB,
    scountry: '109',
    locale: 'en-XX',
    curr: opts.currency ?? 'GBP',
    fromPage: 'Home',
    pcode: opts.iata,
    ptype: '1',
    ptime,
    rcode: opts.iata,
    rtype: '1',
    rtime,
    age: '30-60',
  });
  return `https://www.trip.com/carhire/online/list?${params.toString()}`;
}
