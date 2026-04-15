/**
 * DOTW / WebBeds XML client (DCML — DOTWconnect Markup Language).
 *
 * Wraps the `<customer>` envelope, handles MD5 password hashing, gzip
 * compression in both directions, and XML (de)serialisation via
 * `fast-xml-parser`. The exposed functions return parsed JS objects that
 * downstream adapters can map into our unified `HotelOffer` shape.
 *
 * When `DOTW_USERNAME` is unset (pre-credential dev mode) every function
 * delegates to `src/lib/dotw-mock.ts` so the app runs end-to-end locally
 * without the real API. Once Anthony Potts sends test credentials we flip
 * the env vars in Vercel and the real path kicks in.
 *
 * Runtime: Node only (MD5 + gzip require `node:crypto` and `node:zlib`).
 */
import crypto from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import {
  mockSearchHotelsResponse,
  mockGetRoomsResponse,
  mockConfirmBookingResponse,
  mockCancelBookingResponse,
  mockGetBookingDetailsResponse,
} from './dotw-mock';

const DEFAULT_HOST = 'xmldev.dotwconnect.com';
const ENDPOINT_PATH = '/gatewayV4.dotw';
const REQUEST_TIMEOUT_MS = 30_000;

export interface DotwCredentials {
  username: string;
  password: string;   // plain text — hashed per-request
  companyId: string;
  host: string;       // `xmldev.dotwconnect.com` (test) or `us.dotwconnect.com` (prod)
}

export interface DotwRoomOccupancy {
  adultsCode: number;          // 1-10
  childAges?: number[];        // 0-17, one per child
  rateBasis?: number;          // internal code, defaults to 1 (All Rates)
  passengerNationality: string; // DOTW internal country code (default: GB when available)
  passengerCountryOfResidence: string;
}

export interface DotwSearchParams {
  fromDate: string;     // YYYY-MM-DD
  toDate: string;       // YYYY-MM-DD
  currency: string;     // DOTW internal currency code (GBP)
  rooms: DotwRoomOccupancy[];
  cityCode?: string;
  countryCode?: string;
  filters?: Array<{ fieldName: string; fieldTest: string; fieldValues: (string | number)[] }>;
}

export interface DotwGetRoomsParams extends DotwSearchParams {
  hotelId: string;
  /** When true DOTW locks the rate for 3 minutes. Mandatory before confirmbooking. */
  block?: boolean;
}

export interface DotwConfirmBookingParams {
  allocationDetails: string;     // token from the blocking getrooms call
  customerReference: string;     // our booking ref (e.g. JMA-2026-ABC123)
  leadGuest: {
    title: string;               // Mr / Mrs / Ms / Mstr / Miss
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    nationality: string;         // DOTW internal country code
  };
  otherGuests?: Array<{ title: string; firstName: string; lastName: string }>;
  specialRequests?: string;
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Credentials & transport                                               */
/* ────────────────────────────────────────────────────────────────────── */

function readCreds(): DotwCredentials | null {
  const username = process.env.DOTW_USERNAME;
  const password = process.env.DOTW_PASSWORD;
  const companyId = process.env.DOTW_COMPANY_ID;
  if (!username || !password || !companyId) return null;
  return {
    username,
    password,
    companyId,
    host: process.env.DOTW_HOST || DEFAULT_HOST,
  };
}

function md5(input: string): string {
  return crypto.createHash('md5').update(input, 'utf8').digest('hex');
}

const xmlBuilder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  suppressEmptyNode: false,
  format: false,
});

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: true,
  parseTagValue: true,
  trimValues: true,
  // Treat these as always-arrays so downstream code doesn't have to juggle
  // "one hotel vs many" shape-shifting.
  isArray: (name) =>
    ['hotel', 'room', 'rate', 'mealType', 'child', 'hotels', 'bookings'].includes(name),
});

/** Build the XML `<customer>` envelope DOTW expects. */
function buildEnvelope(
  creds: DotwCredentials,
  command: string,
  innerBody: Record<string, unknown>,
): string {
  const obj = {
    customer: {
      username: creds.username,
      password: md5(creds.password),
      id: creds.companyId,
      source: 1,
      product: 'hotel',
      request: {
        '@_command': command,
        ...innerBody,
      },
    },
  };
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + xmlBuilder.build(obj);
}

/** POST an XML body (gzipped) to DOTW and return the parsed XML response. */
async function postDotw(creds: DotwCredentials, xml: string): Promise<Record<string, unknown>> {
  const url = `https://${creds.host}${ENDPOINT_PATH}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=UTF-8',
        'Content-Encoding': 'gzip',
        'Accept-Encoding': 'gzip',
      },
      body: gzipSync(Buffer.from(xml, 'utf8')),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`DOTW HTTP ${res.status}: ${text.slice(0, 400)}`);
    }

    // Node fetch decompresses gzip automatically when Accept-Encoding is set,
    // but some edge proxies pass the raw gzipped body through. Handle both.
    const buf = Buffer.from(await res.arrayBuffer());
    let xmlText: string;
    if (buf[0] === 0x1f && buf[1] === 0x8b) {
      xmlText = gunzipSync(buf).toString('utf8');
    } else {
      xmlText = buf.toString('utf8');
    }

    return xmlParser.parse(xmlText) as Record<string, unknown>;
  } finally {
    clearTimeout(timeout);
  }
}

/** Transport wrapper with 1 retry on network error (per Webbeds recommendation). */
async function postWithRetry(
  creds: DotwCredentials,
  xml: string,
): Promise<Record<string, unknown>> {
  try {
    return await postDotw(creds, xml);
  } catch (err) {
    // Retry once on abort / network errors. Do NOT retry 4xx/5xx.
    const msg = err instanceof Error ? err.message : String(err);
    const retriable = msg.includes('aborted') || msg.includes('fetch failed') || msg.includes('ECONN');
    if (!retriable) throw err;
    console.warn('[dotw] transport retry after:', msg);
    return postDotw(creds, xml);
  }
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Request builders                                                      */
/* ────────────────────────────────────────────────────────────────────── */

function buildRoomsFragment(rooms: DotwRoomOccupancy[]): Record<string, unknown> {
  return {
    '@_no': rooms.length,
    room: rooms.map((r, idx) => ({
      '@_runno': idx,
      adultsCode: r.adultsCode,
      children: {
        '@_no': r.childAges?.length ?? 0,
        ...(r.childAges && r.childAges.length > 0
          ? {
              child: r.childAges.map((age, cIdx) => ({
                '@_runno': cIdx,
                '#text': age,
              })),
            }
          : {}),
      },
      rateBasis: r.rateBasis ?? 1,
      passengerNationality: r.passengerNationality,
      passengerCountryOfResidence: r.passengerCountryOfResidence,
    })),
  };
}

function buildFiltersFragment(params: DotwSearchParams): Record<string, unknown> {
  const filters: Record<string, unknown> = {};
  if (params.cityCode) filters.city = params.cityCode;
  if (params.countryCode) filters.country = params.countryCode;
  // Optional atomic conditions can be added by callers via `filters` array.
  if (params.filters && params.filters.length > 0) {
    filters['a:condition'] = params.filters.map((f) => ({
      fieldName: f.fieldName,
      fieldTest: f.fieldTest,
      fieldValues: { fieldValue: f.fieldValues },
    }));
  }
  return filters;
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Public API                                                            */
/* ────────────────────────────────────────────────────────────────────── */

/** searchhotels — list hotels with cheapest rate per meal plan. */
export async function searchHotels(params: DotwSearchParams): Promise<Record<string, unknown>> {
  const creds = readCreds();
  if (!creds) return mockSearchHotelsResponse(params);

  const xml = buildEnvelope(creds, 'searchhotels', {
    bookingDetails: {
      fromDate: params.fromDate,
      toDate: params.toDate,
      currency: params.currency,
      rooms: buildRoomsFragment(params.rooms),
    },
    return: {
      filters: buildFiltersFragment(params),
      getRooms: false,  // v4: must call getrooms separately for full rates
    },
  });
  return postWithRetry(creds, xml);
}

/**
 * getrooms — full rates, cancellation policies, allocationDetails token.
 *
 * Call TWICE per booking:
 *   1. `block: false` — discovery. Returns all rates + cancellation policies.
 *   2. `block: true`  — rate lock. 3-minute window to call confirmbooking.
 */
export async function getRooms(params: DotwGetRoomsParams): Promise<Record<string, unknown>> {
  const creds = readCreds();
  if (!creds) return mockGetRoomsResponse(params);

  const xml = buildEnvelope(creds, 'getrooms', {
    bookingDetails: {
      fromDate: params.fromDate,
      toDate: params.toDate,
      currency: params.currency,
      rooms: buildRoomsFragment(params.rooms),
    },
    productId: params.hotelId,
    block: params.block ? 'true' : 'false',
  });
  return postWithRetry(creds, xml);
}

/** confirmbooking — finalise using the allocationDetails from blocking getrooms. */
export async function confirmBooking(
  params: DotwConfirmBookingParams,
): Promise<Record<string, unknown>> {
  const creds = readCreds();
  if (!creds) return mockConfirmBookingResponse(params);

  const xml = buildEnvelope(creds, 'confirmbooking', {
    customerReference: params.customerReference,
    allocationDetails: params.allocationDetails,
    guests: {
      leadGuest: {
        title: params.leadGuest.title,
        firstName: params.leadGuest.firstName,
        lastName: params.leadGuest.lastName,
        email: params.leadGuest.email,
        phone: params.leadGuest.phone,
        nationality: params.leadGuest.nationality,
      },
      ...(params.otherGuests && params.otherGuests.length > 0
        ? {
            otherGuest: params.otherGuests.map((g) => ({
              title: g.title,
              firstName: g.firstName,
              lastName: g.lastName,
            })),
          }
        : {}),
    },
    ...(params.specialRequests ? { specialRequests: params.specialRequests } : {}),
  });
  return postWithRetry(creds, xml);
}

/** cancelbooking — cancel an existing booking by DOTW booking reference. */
export async function cancelBooking(bookingRef: string): Promise<Record<string, unknown>> {
  const creds = readCreds();
  if (!creds) return mockCancelBookingResponse(bookingRef);

  const xml = buildEnvelope(creds, 'cancelbooking', {
    bookingReference: bookingRef,
  });
  return postWithRetry(creds, xml);
}

/** getbookingdetails — retrieve an existing booking. */
export async function getBookingDetails(bookingRef: string): Promise<Record<string, unknown>> {
  const creds = readCreds();
  if (!creds) return mockGetBookingDetailsResponse(bookingRef);

  const xml = buildEnvelope(creds, 'getbookingdetails', {
    bookingReference: bookingRef,
  });
  return postWithRetry(creds, xml);
}

/** True if real DOTW credentials are configured. Adapters branch on this. */
export function isDotwLive(): boolean {
  return readCreds() !== null;
}
