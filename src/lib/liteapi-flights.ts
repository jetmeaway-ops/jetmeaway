/**
 * LiteAPI (Nuitée) Flights — Edge-compatible wrapper.
 *
 * Mirrors src/lib/liteapi.ts (hotels) but for the Flights product. Same domain
 * (api.liteapi.travel/v3.0) and same X-API-Key auth — LiteAPI decides sandbox vs
 * production from the KEY, not the URL (the api.sandbox.* subdomain is dead).
 *
 * Three-call flow, identical shape to hotels:
 *   1. searchFlights()  → POST /flights/rates          (offers, each with offerId)
 *   2. prebookFlight()  → POST /flights/rates/prebook  (lock price, get txn id)
 *   3. bookFlight()     → POST /flights/rates/book      (confirm → PNR + e-tickets)
 *
 * Env:
 *   LITEAPI_FLIGHTS_KEY  — flights key (sandbox `sand_…` while testing).
 *                          Falls back to LITE_API_KEY so a single prod key works
 *                          for both once flights go live. Keeping them separate
 *                          lets flights run on the SANDBOX key while hotels stay
 *                          on the PRODUCTION key.
 *   LITE_API_BASE        — optional base override (defaults to production).
 */

function baseUrl(): string {
  return (process.env.LITE_API_BASE || 'https://api.liteapi.travel/v3.0').replace(/\/$/, '');
}

function flightApiKey(): string {
  const k = process.env.LITEAPI_FLIGHTS_KEY || process.env.LITE_API_KEY;
  if (!k) throw new Error('LITEAPI_FLIGHTS_KEY (or LITE_API_KEY) is not set');
  return k;
}

const DEFAULT_TIMEOUT_MS = 30_000; // flight search can be slower than hotels

async function flightFetch<T = any>(
  path: string,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl()}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: {
        'X-API-Key': flightApiKey(),
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
      cache: 'no-store',
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`LiteAPI-Flights ${res.status} ${path}: ${body.slice(0, 400)}`);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`LiteAPI-Flights timeout after ${timeoutMs}ms: ${path}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/* ── Types (light — the raw offer is passed through to the client) ──────────── */

export type CabinClass = 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST';

/** One leg of the itinerary: A→B on a date. Round trips send two legs. */
export interface FlightLeg {
  origin: string;        // IATA, e.g. "LHR"
  destination: string;   // IATA, e.g. "JFK"
  date: string;          // YYYY-MM-DD
  direction?: 'OUTBOUND' | 'INBOUND';
}

export interface FlightSearchParams {
  legs: FlightLeg[];
  adults: number;
  children?: number;
  infants?: number;
  childrenAges?: number[];
  infantAges?: number[];
  cabinClass?: CabinClass;
  currency?: string;     // ISO 4217, default GBP
  country?: string;      // point of sale, ISO 3166-1 alpha-2
}

/** Trimmed shape of the price display block LiteAPI returns. */
export interface FlightPricing {
  display: {
    total: number;
    currency: string;
    base: number;
    taxes: number;
    fees: number;
    perPassenger?: Record<string, { base: number; taxes: number; fees: number; total: number; currency: string }>;
  };
  converted?: boolean;
}

/** A bookable offer (from journeys[].cheapestOffer). `offerId` feeds prebook. */
export interface FlightOffer {
  offerId: string;
  expiration?: string;
  pricing: FlightPricing;
  baggage?: unknown;
  fare?: { family?: string; mixedCabin?: boolean; seatsRemaining?: number };
  seats?: unknown;
  segments?: unknown[];
  segmentAmenities?: unknown[];
  [k: string]: unknown; // pass-through for anything else the client renders
}

export interface FlightJourney {
  cheapestOffer?: FlightOffer;
  offers?: FlightOffer[];
  [k: string]: unknown;
}

export interface FlightSearchResult {
  journeys: FlightJourney[];
  sortMetadata?: unknown;
  [k: string]: unknown;
}

/* ── 1. SEARCH ──────────────────────────────────────────────────────────────── */

export async function searchFlights(params: FlightSearchParams): Promise<FlightSearchResult[]> {
  const legs = params.legs.map((l) => ({
    origin: l.origin.trim().toUpperCase(),
    destination: l.destination.trim().toUpperCase(),
    date: l.date,
    ...(l.direction ? { direction: l.direction } : {}),
  }));
  const body: Record<string, unknown> = {
    legs,
    adults: params.adults,
    currency: params.currency || 'GBP',
    ...(params.children ? { children: params.children } : {}),
    ...(params.infants ? { infants: params.infants } : {}),
    ...(params.childrenAges ? { childrenAges: params.childrenAges } : {}),
    ...(params.infantAges ? { infantAges: params.infantAges } : {}),
    ...(params.cabinClass ? { cabinClass: params.cabinClass } : {}),
    ...(params.country ? { country: params.country } : {}),
  };
  const res = await flightFetch<{ data?: FlightSearchResult[] }>('/flights/rates', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return res.data || [];
}

/* ── Passenger + contact (collected at PREBOOK time for flights — unlike hotels) ─
 * Field names/formats VERIFIED against the LiteAPI flights sandbox (2026-07-14).
 * See scratch/flights-verified-contract.md. gender M/F/X; phoneCountryCode numeric
 * ('44' not '+44'); phoneNumber digits only; `birthday` (not dateOfBirth); document
 * fields required together when a passport number is supplied. */

export interface FlightContact {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;      // digits only, e.g. "7700900000"
  phoneCountryCode: string; // numeric, e.g. "44"
}

export interface FlightPassenger {
  firstName: string;
  lastName: string;
  birthday: string;                 // YYYY-MM-DD
  gender: 'M' | 'F' | 'X';
  type: 'ADULT' | 'CHILD' | 'INFANT';
  nationality: string;              // ISO-3166 alpha-2, e.g. "GB"
  documentType?: string;            // "passport"
  documentIssueCountry?: string;    // ISO-3166 alpha-2
  documentNumber?: string;
  documentExpiry?: string;          // YYYY-MM-DD (required with documentNumber)
  [k: string]: unknown;
}

/* ── 2. VERIFY — POST /flights/verify. REQUIRED before prebook: the search price
 *      is only indicative; verify returns the guaranteed price you can charge and
 *      a `changes` block if the price/fare shifted. (Official docs + sandbox-
 *      verified 2026-07-14.) ──────────────────────────────────────────────────── */

export interface FlightVerifyResult {
  journey?: unknown;      // guaranteed-price journey snapshot
  changes?: unknown;      // present/populated if the price or rules shifted
  offerId?: string;       // verified offerId (use for prebook if returned)
  [k: string]: unknown;
}

export async function verifyFlight(offerId: string): Promise<FlightVerifyResult> {
  const res = await flightFetch<{ data?: FlightVerifyResult | FlightVerifyResult[] }>(
    '/flights/verify',
    { method: 'POST', body: JSON.stringify({ offerId }) },
  );
  const data = res.data;
  return (Array.isArray(data) ? data[0] : data) as FlightVerifyResult;
}

/* ── 3. PREBOOK — POST /flights/prebooks (plural). Collects passengers + contact,
 *      holds the seat / creates the provider reservation, and opens the payment
 *      session. Returns a Stripe PaymentIntent secret in `secretKey` (LiteAPI is
 *      merchant-of-record — same model as hotels).
 *      NB: an optional POST /flights/prebooks/{prebookId}/services (seats/bags)
 *      SUPERSEDES transactionId + secretKey — always pay with the LATEST pair. ── */

export interface FlightPrebookResult {
  prebookId: string;
  transactionId: string;
  secretKey: string;        // Stripe PaymentIntent client secret (pi_…_secret_…)
  price: number;
  currency: string;
  booking?: unknown;        // journey/segments/pricing/baggage snapshot
  servicesAttachable?: unknown; // seats/bags that can be added via .../services
  paymentTypes?: unknown[];
  [k: string]: unknown;
}

/** Wire encoding for passenger classification. LiteAPI SILENTLY IGNORES a
 *  `type: "CHILD"` string — every passenger defaults to adult and children
 *  then fail age validation (53099 "Adult passenger must be at least 12").
 *  The honored field is numeric `passengerType`: 0=adult, 1=child, 2=infant.
 *  Confirmed with Nuitée support (ticket LAS-1312, Kaveh Kiani, 2026-07-16)
 *  and verified by live prod prebooks: child £90.60 + infant £76.51 both 200. */
const PASSENGER_TYPE_CODE: Record<FlightPassenger['type'], number> = {
  ADULT: 0,
  CHILD: 1,
  INFANT: 2,
};

export async function prebookFlight(
  offerId: string,
  contact: FlightContact,
  passengers: FlightPassenger[],
): Promise<FlightPrebookResult> {
  // Translate our readable `type` strings to the numeric `passengerType`
  // LiteAPI actually reads; keep the rest of the codebase on the strings.
  const wirePassengers = passengers.map(({ type, ...rest }) => ({
    ...rest,
    passengerType: PASSENGER_TYPE_CODE[type] ?? 0,
  }));
  const res = await flightFetch<{ data?: FlightPrebookResult | FlightPrebookResult[] }>(
    '/flights/prebooks',
    { method: 'POST', body: JSON.stringify({ offerId, usePaymentSdk: true, contact, passengers: wirePassengers }) },
  );
  const data = res.data;
  return (Array.isArray(data) ? data[0] : data) as FlightPrebookResult;
}

/* ── 4. BOOK — POST /flights/bookings (plural). Finalises AFTER the payment SDK
 *      has captured the PaymentIntent. Needs prebookId + the CURRENT transactionId
 *      (post-attach-services if any). Idempotent: same prebookId returns the same
 *      booking. Returns { bookingId, bookingRef (airline PNR/confirmation) }. ──── */

export interface FlightBookParams {
  prebookId: string;
  transactionId: string;
  clientReference?: string; // our JMA-F-… ref
  [k: string]: unknown;
}

export interface FlightBookResult {
  bookingId?: string;
  bookingRef?: string;      // airline confirmation code / PNR
  status?: string;
  [k: string]: unknown;
}

export async function bookFlight(params: FlightBookParams): Promise<FlightBookResult> {
  const { prebookId, transactionId, clientReference, ...rest } = params;

  // LiteAPI /flights/bookings REQUIRES an explicit payment method (400 45009
  // "payment method must be CREDIT, TRANSACTION_ID, or THIRD_PARTY" otherwise).
  // We settle with the transaction captured by the hosted Payment SDK, so the
  // method is TRANSACTION_ID — the exact same shape the live hotels book uses
  // (src/lib/liteapi.ts bookWithTransactionId → payment:{method:'TRANSACTION_ID',transactionId}).
  const body: Record<string, unknown> = {
    prebookId,
    payment: { method: 'TRANSACTION_ID', transactionId },
    ...(clientReference ? { clientReference } : {}),
    ...rest,
  };

  const res = await flightFetch<{ data?: FlightBookResult | FlightBookResult[] }>(
    '/flights/bookings',
    { method: 'POST', body: JSON.stringify(body) },
    50_000,
  );

  // The docs don't pin down the success shape, and the sandbox does NOT use the
  // field name we first assumed (booking succeeded but bookingId came back
  // undefined → the route retried → 45036 "duplicate"). Normalise across every
  // plausible field name, and drill into a nested `booking`/`data` wrapper.
  const data = (res as { data?: unknown })?.data;
  const d0 = Array.isArray(data) ? data[0] : (data ?? res);
  const rec: Record<string, any> = d0 && typeof d0 === 'object' ? (d0 as any) : {};
  const nested: Record<string, any> =
    rec.booking && typeof rec.booking === 'object' ? rec.booking : {};

  const pick = (...vals: unknown[]) =>
    vals.find((v) => typeof v === 'string' && v.length > 0) as string | undefined;

  const bookingId = pick(
    rec.bookingId, rec.id, rec.bookingReference, rec.reference,
    nested.bookingId, nested.id, nested.bookingReference, nested.reference,
  );
  const bookingRef = pick(
    rec.bookingRef, rec.pnr, rec.airlineReference, rec.airlineConfirmationCode,
    rec.confirmationNumber, rec.confirmationCode, rec.providerConfirmationNumber,
    nested.bookingRef, nested.pnr, nested.airlineReference, nested.confirmationNumber,
    bookingId, // last resort so the confirm page shows *something* real
  );

  // PII-SAFE diagnostic: field NAMES + the (non-PII) ids only — never the raw
  // response (it carries the passenger manifest). Lets us lock the parsing down.
  console.log(
    '[liteapi-flights] book response keys:', Object.keys(rec).join(','),
    '| nested keys:', Object.keys(nested).join(','),
    '| extracted:', JSON.stringify({ bookingId, bookingRef, status: rec.status ?? nested.status }),
  );

  return { ...rec, bookingId, bookingRef, status: rec.status ?? nested.status } as FlightBookResult;
}

/* ── 5. RETRIEVE — GET /flights/bookings/{bookingId} (confirmation page). ─────── */

export async function getFlightBooking(bookingId: string): Promise<FlightBookResult> {
  const res = await flightFetch<{ data?: FlightBookResult | FlightBookResult[] }>(
    `/flights/bookings/${encodeURIComponent(bookingId)}`,
    { method: 'GET' },
  );
  const data = res.data;
  return (Array.isArray(data) ? data[0] : data) as FlightBookResult;
}
