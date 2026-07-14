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

/* ── 2. PREBOOK (lock the price before payment) ─────────────────────────────── */

export interface FlightPrebookResult {
  prebookId?: string;
  transactionId?: string;
  offerId?: string;
  pricing?: FlightPricing;
  [k: string]: unknown;
}

export async function prebookFlight(offerId: string): Promise<FlightPrebookResult> {
  const res = await flightFetch<{ data?: FlightPrebookResult }>('/flights/rates/prebook', {
    method: 'POST',
    body: JSON.stringify({ offerId }),
  });
  return res.data || {};
}

/* ── 3. BOOK (confirm → PNR + e-tickets) ────────────────────────────────────── */

export interface FlightPassenger {
  title?: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;      // YYYY-MM-DD
  gender?: string;
  email?: string;
  phone?: string;
  type?: 'adult' | 'child' | 'infant';
  [k: string]: unknown;
}

export interface FlightBookParams {
  prebookId?: string;
  transactionId?: string;
  passengers: FlightPassenger[];
  payment?: Record<string, unknown>; // payment handled per LiteAPI flights model
  [k: string]: unknown;
}

export async function bookFlight(params: FlightBookParams): Promise<any> {
  const res = await flightFetch<{ data?: unknown }>('/flights/rates/book', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return (res as any).data ?? res;
}
