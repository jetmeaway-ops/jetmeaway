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

/* ── 2. PREBOOK — POST /flights/prebook (collects passengers, locks price, opens
 *      the LiteAPI-hosted payment session). Returns a Stripe PaymentIntent secret
 *      in `secretKey` (LiteAPI is merchant-of-record, same model as hotels). ──── */

export interface FlightPrebookResult {
  prebookId: string;
  transactionId: string;
  secretKey: string;        // Stripe PaymentIntent client secret (pi_…_secret_…)
  price: number;
  currency: string;
  booking?: unknown;        // journey/segments/pricing/baggage snapshot
  paymentTypes?: unknown[];
  [k: string]: unknown;
}

export async function prebookFlight(
  offerId: string,
  contact: FlightContact,
  passengers: FlightPassenger[],
): Promise<FlightPrebookResult> {
  const res = await flightFetch<{ data?: FlightPrebookResult | FlightPrebookResult[] }>(
    '/flights/prebook',
    { method: 'POST', body: JSON.stringify({ offerId, usePaymentSdk: true, contact, passengers }) },
  );
  const data = res.data;
  return (Array.isArray(data) ? data[0] : data) as FlightPrebookResult;
}

/* ── 3. BOOK — POST /flights/book. Finalises AFTER the payment SDK has captured
 *      the PaymentIntent. Just needs the prebookId + transactionId; returns PNR +
 *      e-tickets. (No card/charge here — funds already captured by the SDK.) ──── */

export interface FlightBookParams {
  prebookId: string;
  transactionId: string;
  clientReference?: string; // our JMA-F-… ref
  [k: string]: unknown;
}

export async function bookFlight(params: FlightBookParams): Promise<any> {
  const res = await flightFetch<{ data?: unknown }>(
    '/flights/book',
    { method: 'POST', body: JSON.stringify(params) },
    50_000,
  );
  const data = (res as any).data;
  return Array.isArray(data) ? data[0] : (data ?? res);
}
