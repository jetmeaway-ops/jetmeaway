/**
 * Server-safe affiliate deep-link builders for the /world-cup-2026 campaign page.
 *
 * These are VERBATIM copies of the canonical builders that live in the
 * 'use client' files:
 *   - hotels:  src/app/hotels/hotels-client.tsx  (buildExpediaUrl / buildTripcomUrl)
 *   - flights: src/app/flights/flights-client.tsx (buildAviasalesUrl / buildTripUrl / buildExpediaUrl)
 *
 * They are duplicated here (rather than imported) so BOTH the server page and
 * the client FlightPicker can use them without pulling a 'use client' module
 * into the server graph. If a partner URL contract changes in the client files,
 * mirror the change here too. Affiliate params MUST never be stripped (CLAUDE.md).
 */

/* ── Hotels ──────────────────────────────────────────────────────────────── */

/** Expedia UK hotel search. Pass a hotel NAME as `dest` to search that property. */
export function hotelExpediaUrl(
  dest: string,
  cin: string,
  cout: string,
  adults: number = 2,
  children: number = 0,
  childrenAges: number[] = [],
  rooms: number = 1,
): string {
  let u = `https://www.expedia.co.uk/Hotel-Search?destination=${encodeURIComponent(dest)}&startDate=${cin}&endDate=${cout}&adults=${adults}`;
  const childCount = Math.max(0, children | 0);
  if (childCount > 0) {
    const ages: number[] = [];
    for (let i = 0; i < childCount; i++) {
      const a = childrenAges[i];
      ages.push(typeof a === 'number' && a >= 0 && a <= 17 ? a : 8);
    }
    u += `&children=${childCount}_${ages.join('_')}`;
  }
  const safeRooms = Math.max(1, Math.min(8, rooms | 0));
  if (safeRooms > 1) u += `&rooms=${safeRooms}`;
  u += `&affcid=clbU3QK`;
  return u;
}

/** Trip.com UK hotel search (keyword mode — searches the hotel name). */
export function hotelTripcomUrl(
  dest: string,
  cin: string,
  cout: string,
  adults: number = 2,
  resolvedCityId?: number | null,
  children: number = 0,
  childrenAges: number[] = [],
  rooms: number = 1,
): string {
  const cinSlash = cin.replace(/-/g, '/');
  const coutSlash = cout.replace(/-/g, '/');
  const keyword = encodeURIComponent(dest);
  // Campaign always runs in keyword mode (no numeric cityId for hotel-name search).
  const cityId = resolvedCityId ?? null;
  const childCount = Math.max(0, children | 0);
  const safeRooms = Math.max(1, Math.min(5, rooms | 0));
  const base = [
    `city=${cityId ?? -1}`,
    `cityName=${keyword}`,
    `checkin=${cinSlash}`,
    `checkout=${coutSlash}`,
    `adult=${adults}`,
    `crn=${safeRooms}`,
    `children=${childCount}`,
    'barCurr=GBP',
    'curr=GBP',
    'locale=en-GB',
    'Allianceid=8023009',
    'SID=303363796',
    'trip_sub3=D15021113',
  ];
  for (let i = 0; i < childCount; i++) {
    const age = childrenAges[i];
    const safeAge = typeof age === 'number' && age >= 0 && age <= 17 ? age : 8;
    base.push(`age${i + 1}=${safeAge}`);
  }
  if (cityId == null) {
    base.push(
      'provinceId=0',
      'countryId=0',
      'districtId=0',
      `searchValue=${keyword}***`,
      'searchBoxArg=t',
      'travelPurpose=0',
      'ctm_ref=ix_sb_dl',
    );
  }
  return `https://uk.trip.com/hotels/list?${base.join('&')}`;
}

/* ── Flights ─────────────────────────────────────────────────────────────── */

/** Aviasales (Travelpayouts) city-to-city search. `dep`/`ret` are YYYY-MM-DD. */
export function flightAviasalesUrl(
  o: string,
  d: string,
  dep: string,
  ret: string | null = null,
  adults: number = 1,
): string {
  const p = dep.split('-');
  const ddmm = p[2] + p[1];
  let path = `${o}${ddmm}${d}`;
  if (ret) {
    const rp = ret.split('-');
    path += rp[2] + rp[1];
  }
  path += String(adults);
  return `https://tp.media/r?marker=714449&trs=512633&p=4114&u=${encodeURIComponent(`https://www.aviasales.com/search/${path}`)}`;
}

/** Trip.com flights city-to-city. One-way uses the canonical path; RT uses showfarefirst. */
export function flightTripUrl(
  o: string,
  d: string,
  dep: string,
  ret: string | null = null,
  adults: number = 1,
): string {
  const oL = o.toLowerCase();
  const dL = d.toLowerCase();
  const common = `dcity=${o}&acity=${d}&ddate=${dep}&adult=${adults}&class=y&Allianceid=8023009&SID=303363796&trip_sub3=D15021113`;
  if (ret) {
    return `https://www.trip.com/flights/showfarefirst?triptype=RT&${common}&rdate=${ret}&quantity=${adults}`;
  }
  return `https://www.trip.com/flights/${oL}-to-${dL}/tickets-${o}-${d}?${common}`;
}

/** Expedia UK flights city-to-city. Dates are converted to MM/DD/YYYY internally. */
export function flightExpediaUrl(
  o: string,
  d: string,
  dep: string,
  ret: string | null = null,
  adults: number = 1,
): string {
  const toUS = (iso: string) => {
    const [y, m, d2] = iso.split('-');
    return `${m}/${d2}/${y}`;
  };
  const trip = ret ? 'roundtrip' : 'oneway';
  const passengers = `adults:${adults},children:0,seniors:0,infantinlap:Y`;
  let u = `https://www.expedia.co.uk/Flights-Search?mode=search&trip=${trip}&leg1=from:${o},to:${d},departure:${toUS(dep)}TANYT`;
  if (ret) u += `&leg2=from:${d},to:${o},departure:${toUS(ret)}TANYT`;
  u += `&passengers=${passengers}&affcid=clbU3QK`;
  return u;
}

/* ── Default tournament dates (single source) ────────────────────────────── */

/**
 * Deep-link seed dates inside the 11 Jun – 19 Jul 2026 tournament window.
 * These are just defaults the traveller can change on the partner site.
 */
export const WC_DATES = {
  hotelCin: '2026-06-16',
  hotelCout: '2026-06-19',
  flightDep: '2026-06-15',
  flightRet: '2026-06-22',
} as const;
