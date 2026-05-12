/**
 * Kyte client — LCC flight supplier.
 *
 * ⚠ RUNTIME EXCEPTION: this file CANNOT run on Vercel Edge.
 *   Routes that import from here MUST declare `export const runtime = 'nodejs'`.
 *
 * Why: Kyte's sandbox requires all calls to come from one of two whitelisted
 * Fixie static IPs (54.217.142.99 + 54.195.3.54). Vercel Edge rotates IPs
 * and can't be allow-listed; the Fixie HTTP proxy gives us fixed outbound
 * IPs but requires `undici.ProxyAgent` (Node-only — Edge doesn't ship the
 * undici named exports). So /api/flights/kyte/* routes run on the Node
 * runtime by design. The rest of the app stays on Edge.
 *
 * Env vars (all in Vercel, marked Sensitive — `vercel env pull` returns
 * empty for these, must be pasted into .env.local manually for local dev):
 *   - KYTE_SANDBOX_BASE_URL (e.g. https://api.sandbox.gokyte.com)
 *   - KYTE_API_KEY
 *   - KYTE_PROXY_URL (Fixie auth URL with embedded password — never log)
 *
 * Privacy: scrub PII before logging. We log status + latency + transaction
 * IDs (first 8 chars) only. Never log request/response bodies, passenger
 * names, DOB, passport, or card data.
 *
 * Plan: ~/.claude/plans/kyte-lcc-integration.md
 */

import { fetch, ProxyAgent } from 'undici';
import { randomUUID } from 'node:crypto';

const KYTE_BASE = (process.env.KYTE_SANDBOX_BASE_URL || '').replace(/\/+$/, '');
const KYTE_KEY = process.env.KYTE_API_KEY || '';
const KYTE_PROXY = process.env.KYTE_PROXY_URL || '';

let _dispatcher: ProxyAgent | null = null;
function getDispatcher(): ProxyAgent {
  if (!KYTE_PROXY) {
    throw new KyteConfigError('KYTE_PROXY_URL not set — cannot route to Kyte sandbox');
  }
  if (!_dispatcher) _dispatcher = new ProxyAgent(KYTE_PROXY);
  return _dispatcher;
}

// ---------- Errors ----------

export class KyteError extends Error {
  statusCode?: number;
  requestId?: string;
  constructor(message: string, statusCode?: number, requestId?: string) {
    super(message);
    this.name = 'KyteError';
    this.statusCode = statusCode;
    this.requestId = requestId;
  }
}

export class KyteConfigError extends KyteError {
  constructor(message: string) {
    super(message);
    this.name = 'KyteConfigError';
  }
}

export class KyteAuthError extends KyteError {
  constructor(message: string, statusCode: number, requestId?: string) {
    super(message, statusCode, requestId);
    this.name = 'KyteAuthError';
  }
}

export class KyteValidationError extends KyteError {
  constructor(message: string, statusCode: number, requestId?: string) {
    super(message, statusCode, requestId);
    this.name = 'KyteValidationError';
  }
}

export class KyteCarrierError extends KyteError {
  carrierCode?: string;
  constructor(message: string, carrierCode?: string, statusCode?: number, requestId?: string) {
    super(message, statusCode, requestId);
    this.name = 'KyteCarrierError';
    this.carrierCode = carrierCode;
  }
}

export class KyteProxyError extends KyteError {
  constructor(message: string) {
    super(message);
    this.name = 'KyteProxyError';
  }
}

export class KyteServerError extends KyteError {
  constructor(message: string, statusCode: number, requestId?: string) {
    super(message, statusCode, requestId);
    this.name = 'KyteServerError';
  }
}

// ---------- Context ----------

/**
 * Threaded through every call in a single booking flow. `transactionId`
 * stays constant from Shop → OfferDetails → Book → Payment → Retrieve so
 * Kyte can correlate the flow on their side. Generate once at the start
 * of a flow (search call) and persist on our side (session / KV) for the
 * subsequent calls.
 */
export type KyteContext = {
  transactionId: string;
  posCountry?: string;
  currency?: string;
};

export function newKyteContext(init?: Partial<KyteContext>): KyteContext {
  return {
    transactionId: init?.transactionId || randomUUID(),
    posCountry: init?.posCountry || 'GB',
    currency: init?.currency || 'GBP',
  };
}

// ---------- Domain types ----------

export type Cabin = 'economy' | 'premium-economy' | 'business' | 'first';
export type Gender = 'male' | 'female';
export type Title = 'mr' | 'mrs' | 'ms' | 'miss' | 'dr';

export type KyteJourney = {
  id?: string;
  departureAirport: string;
  arrivalAirport: string;
  date: { main: string; latest?: string };
};

export type KyteShopRequest = {
  journeys: KyteJourney[];
  cabinType: Cabin;
  nonStopFlight?: boolean;
  exactMatch?: boolean;
  flexibility?: 'lowest' | 'medium' | 'high';
  passengers: Array<{ age: number }>;
};

/** Currency as returned by Kyte. `decimals` is how many to shift `totalPrice`
 * by for major-unit display (`totalPrice=18530`, `decimals=2` → £185.30). */
export type KyteCurrency = {
  code: string;
  decimals: number;
};

/** Offer shape observed in sandbox (Jet2 + easyJet runs 2026-05-12). Nested
 * structures (flightSolutions / fares / passengers) typed as `unknown`
 * until we wire them to UI — keeps the lib loose, narrows at the call site. */
export type KyteOffer = {
  id: string;
  flightSolutions?: unknown;
  singleJourneyLeg?: unknown;
  expiration?: string;
  passengers?: unknown;
  totalPrice?: number;
  currency?: KyteCurrency;
  fares?: unknown;
  [k: string]: unknown;
};

export type KyteShopResponse = {
  offers?: Record<string, KyteOffer>;
  legs?: unknown;
  flightSolutions?: unknown;
  errors?: unknown;
  warnings?: unknown;
  possibleActions?: unknown;
  actionList?: unknown;
  [k: string]: unknown;
};

/** Booking response shape — `id` and `currentBalance` confirmed live;
 * other fields commonly seen on the airline-issued ticket response. */
export type KyteBookingResponse = {
  id?: string;
  bookingId?: string;
  currentBalance?: number;
  totalAmount?: number;
  currency?: KyteCurrency;
  booking?: {
    id?: string;
    currentBalance?: number;
    ticketStatus?: 'ticketed' | 'pending' | 'cancelled' | string;
    status?: 'valid' | 'cancelled' | string;
    pnr?: string;
    [k: string]: unknown;
  };
  errors?: unknown;
  warnings?: unknown;
  possibleActions?: unknown;
  actionList?: unknown;
  [k: string]: unknown;
};

/** Payment response confirmed live: `status: 'ok'` + possibleActions/actionList. */
export type KytePaymentResponse = {
  status?: 'ok' | string;
  possibleActions?: unknown;
  actionList?: unknown;
  paymentInfo?: unknown;
  [k: string]: unknown;
};

export type KytePassenger = {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  gender: Gender;
  title: Title;
  dateOfBirth: string;
  contactInformation: {
    email: string;
    phone: Array<{ countryCode: string; number: string; type?: string }>;
  };
};

export type KyteCard = {
  number: string;
  cardholderName: string;
  valid: { month: number; year: number };
  security: string;
  type: 'visa-credit' | 'visa-debit' | 'mastercard-credit' | 'mastercard-debit' | 'amex';
  isCorporate?: boolean;
  address: {
    addressLines: string[];
    city: string;
    postalCode: string;
    countryCode: string;
  };
  owner: string;
};

export type KytePayer = {
  id: string;
  firstName: string;
  lastName: string;
  title: Title;
  contactInformation: {
    email: string;
    phone: Array<{ countryCode: string; number: string; type?: string }>;
  };
};

export type KytePaymentRequest = {
  method: 'card';
  amount: number;
  creditCardInfo: KyteCard[];
  payerInformation: KytePayer[];
  /** Mail-Order/Telephone-Order transaction. Required by Ryanair OTA
   * and accepted (no-op) by other carriers. Bypasses 3DS challenge in
   * sandbox for Transavia. */
  transactionType?: 'moto';
  /** Ryanair OTA flag. */
  codegen?: boolean;
};

export type RetrieveInfoKey =
  | 'PNR'
  | 'passengerDetails'
  | 'ticketInfo'
  | 'itinerary'
  | 'ancillaries'
  | 'paymentInfo'
  | 'pricingBreakdown';

export type RetrieveOpts = {
  forceRefresh?: boolean;
  requestedInfo?: RetrieveInfoKey[];
};

export type CancelEstimate = {
  estimationId: string;
  status: string;
  [k: string]: unknown;
};

// ---------- Core fetcher ----------

type FetchOpts = {
  method: 'GET' | 'POST' | 'DELETE';
  path: string;
  body?: unknown;
  ctx: KyteContext;
};

async function kyteFetch<T>({ method, path, body, ctx }: FetchOpts): Promise<T> {
  if (!KYTE_BASE) throw new KyteConfigError('KYTE_SANDBOX_BASE_URL not set');
  if (!KYTE_KEY) throw new KyteConfigError('KYTE_API_KEY not set');

  const requestId = randomUUID();
  const url = `${KYTE_BASE}${path}`;
  const t0 = Date.now();

  let res;
  try {
    res = await fetch(url, {
      method,
      headers: {
        'x-api-key': KYTE_KEY,
        'content-type': 'application/json',
        'x-request-id': requestId,
        'x-transaction-id': ctx.transactionId,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      dispatcher: getDispatcher(),
    });
  } catch (err) {
    throw new KyteProxyError(`Kyte network/proxy error: ${(err as Error).message}`);
  }

  const latencyMs = Date.now() - t0;
  const text = await res.text();
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { raw: text.slice(0, 200) };
  }

  // PII-scrubbed audit log — status, timing, truncated IDs only.
  // Never expand to include request/response body.
  // eslint-disable-next-line no-console
  console.log(
    `[kyte] ${method} ${path} -> ${res.status} (${latencyMs}ms) tx=${ctx.transactionId.slice(0, 8)} req=${requestId.slice(0, 8)}`,
  );

  if (res.status === 401 || res.status === 403) {
    throw new KyteAuthError(`Kyte auth/IP error (${res.status})`, res.status, requestId);
  }
  if (res.status >= 400 && res.status < 500) {
    const msg =
      (payload as { message?: string; error?: string } | null)?.message ||
      (payload as { message?: string; error?: string } | null)?.error ||
      `Kyte ${res.status}`;
    throw new KyteValidationError(msg, res.status, requestId);
  }
  if (res.status >= 500) {
    throw new KyteServerError(`Kyte server error (${res.status})`, res.status, requestId);
  }

  return payload as T;
}

// ---------- Pre-ticketing ----------

export function shopFlights(
  req: KyteShopRequest,
  ctx: KyteContext,
  opts?: { airlines?: string },
): Promise<KyteShopResponse> {
  const qs = opts?.airlines ? `?airlines=${encodeURIComponent(opts.airlines)}` : '';
  return kyteFetch<KyteShopResponse>({
    method: 'POST',
    path: `/api/v3/flights/shop${qs}`,
    body: req,
    ctx,
  });
}

export function offerDetails(offerIds: string[], ctx: KyteContext): Promise<unknown> {
  return kyteFetch({
    method: 'POST',
    path: '/api/v3/flights/shop/offer-details',
    body: { offerIds },
    ctx,
  });
}

export function shopBundles(offerIds: string[], ctx: KyteContext): Promise<unknown> {
  return kyteFetch({
    method: 'POST',
    path: '/api/v3/flights/shop/bundles',
    body: { offerIds },
    ctx,
  });
}

export function shopAncillaries(
  offerOrBookingId: string,
  requestedTypes: Array<'bag' | 'seat' | 'meal' | 'sportsEquipment' | 'service' | 'bundle'>,
  ctx: KyteContext,
): Promise<unknown> {
  // The same endpoint takes either an offerId (pre-Book, for browsing
  // available ancillaries) or a bookingId (post-Book, mandatory for
  // Ryanair OTA's seat-selection flow).
  return kyteFetch({
    method: 'POST',
    path: `/api/v3/flights/shop/ancillaries/${offerOrBookingId}`,
    body: { requestedTypes },
    ctx,
  });
}

/** Add or remove an ancillary on an existing booking. Used for seat
 *  selection on bundle airlines (easyJet, Ryanair OTA) and for adding
 *  bags / sports equipment on any carrier that supports it.
 *
 *  Each ancillary entry sets `action: 'add'` or `'remove'`. The seat
 *  ancillary `id` is the seat number string (e.g. "1A") as returned in
 *  `shopAncillaries(bookingId).seatMap[<segmentId>].cabins[].rows[<n>][].number`.
 *  `flightSegments` is the segment ID (e.g. "U28672-LGW-AMS"). */
export type BookAncillaryAction = 'add' | 'remove';
export type BookAncillaryType =
  | 'seat'
  | 'bag'
  | 'meal'
  | 'sportsEquipment'
  | 'service'
  | 'bundle';
export type BookAncillaryEntry = {
  id: string;
  type: BookAncillaryType;
  action: BookAncillaryAction;
  quantity: number;
  flightSegments: string[];
};
export type BookAncillariesRequest = {
  passengers: Array<{ id: string; ancillaries: BookAncillaryEntry[] }>;
};
export function bookAncillaries(
  bookingId: string,
  req: BookAncillariesRequest,
  ctx: KyteContext,
): Promise<KyteBookingResponse> {
  return kyteFetch<KyteBookingResponse>({
    method: 'POST',
    path: `/api/v3/flights/book/ancillaries/${bookingId}`,
    body: req,
    ctx,
  });
}

/** Optional `address` is required for Ryanair OTA; safely included for
 * other LCCs (they ignore it). For Jet2 sandbox book the address field
 * can be omitted entirely. */
export type BookFlightBody = {
  passengers: KytePassenger[];
  address?: {
    addressLines: string[];
    city: string;
    postalCode: string;
    countryCode: string;
  };
  languageCode?: string;
};

export function bookFlight(
  offerId: string,
  body: KytePassenger[] | BookFlightBody,
  ctx: KyteContext,
): Promise<KyteBookingResponse> {
  const payload: BookFlightBody = Array.isArray(body) ? { passengers: body } : body;
  return kyteFetch<KyteBookingResponse>({
    method: 'POST',
    path: `/api/v3/flights/book/${offerId}`,
    body: payload,
    ctx,
  });
}

/**
 * Ryanair OTA-only step. After BookAncillaries and before Payment, Kyte
 * needs us to "commit" the booking. The response includes
 * `x-session-token` in the response headers — required to launch the
 * Ryanair flight-confirmation iframe before the customer can pay.
 *
 * Sandbox routes Payment through even without confirming the iframe;
 * production requires the iframe round-trip to complete first.
 */
export type CommitBookingResult = {
  body: KyteBookingResponse;
  sessionToken: string | null;
};

export async function commitBooking(
  bookingId: string,
  ctx: KyteContext,
): Promise<CommitBookingResult> {
  if (!KYTE_BASE) throw new KyteConfigError('KYTE_SANDBOX_BASE_URL not set');
  if (!KYTE_KEY) throw new KyteConfigError('KYTE_API_KEY not set');

  const requestId = randomUUID();
  const path = `/api/v3/flights/book/commit/${bookingId}`;
  const t0 = Date.now();

  let res;
  try {
    res = await fetch(`${KYTE_BASE}${path}`, {
      method: 'POST',
      headers: {
        'x-api-key': KYTE_KEY,
        'content-type': 'application/json',
        'x-request-id': requestId,
        'x-transaction-id': ctx.transactionId,
      },
      body: '{}',
      dispatcher: getDispatcher(),
    });
  } catch (err) {
    throw new KyteProxyError(`Kyte network/proxy error: ${(err as Error).message}`);
  }

  const latencyMs = Date.now() - t0;
  const text = await res.text();
  let payload: KyteBookingResponse;
  try {
    payload = JSON.parse(text) as KyteBookingResponse;
  } catch {
    payload = { raw: text.slice(0, 200) } as unknown as KyteBookingResponse;
  }

  const sessionToken = res.headers.get('x-session-token');
  // eslint-disable-next-line no-console
  console.log(
    `[kyte] POST ${path} -> ${res.status} (${latencyMs}ms) tx=${ctx.transactionId.slice(0, 8)} req=${requestId.slice(0, 8)} sessionToken=${sessionToken ? 'present' : 'MISSING'}`,
  );

  if (res.status === 401 || res.status === 403) {
    throw new KyteAuthError(`Kyte auth/IP error (${res.status})`, res.status, requestId);
  }
  if (res.status >= 400 && res.status < 500) {
    const msg =
      (payload as { message?: string; error?: string } | null)?.message ||
      (payload as { message?: string; error?: string } | null)?.error ||
      `Kyte ${res.status}`;
    throw new KyteValidationError(msg, res.status, requestId);
  }
  if (res.status >= 500) {
    throw new KyteServerError(`Kyte server error (${res.status})`, res.status, requestId);
  }

  return { body: payload, sessionToken };
}

export function payBooking(
  bookingId: string,
  payment: KytePaymentRequest,
  ctx: KyteContext,
): Promise<KytePaymentResponse> {
  return kyteFetch<KytePaymentResponse>({
    method: 'POST',
    path: `/api/v3/payment/${bookingId}`,
    body: payment,
    ctx,
  });
}

export function retrieveBooking(
  bookingId: string,
  opts: RetrieveOpts,
  ctx: KyteContext,
): Promise<KyteBookingResponse> {
  return kyteFetch<KyteBookingResponse>({
    method: 'POST',
    path: `/api/v3/flights/book/retrieve/${bookingId}`,
    body: {
      forceRefresh: opts.forceRefresh ?? false,
      requestedInfo:
        opts.requestedInfo ?? [
          'PNR',
          'passengerDetails',
          'ticketInfo',
          'itinerary',
          'ancillaries',
          'paymentInfo',
          'pricingBreakdown',
        ],
    },
    ctx,
  });
}

// ---------- Post-ticketing ----------

export function reshopFlight(
  bookingId: string,
  journeys: KyteJourney[],
  ctx: KyteContext,
): Promise<unknown> {
  return kyteFetch({
    method: 'POST',
    path: `/api/v3/booking/reshop/${bookingId}`,
    body: { journeys },
    ctx,
  });
}

export function reshopOfferDetails(
  bookingId: string,
  offerIds: string[],
  ctx: KyteContext,
): Promise<unknown> {
  return kyteFetch({
    method: 'POST',
    path: `/api/v3/booking/reshop/offer-details/${bookingId}`,
    body: { offerIds },
    ctx,
  });
}

export function confirmReshop(
  reshopOfferId: string,
  opts: { withPayment: boolean; payment?: KytePaymentRequest },
  ctx: KyteContext,
): Promise<unknown> {
  return kyteFetch({
    method: 'POST',
    path: `/api/v3/booking/reshop/confirm/${reshopOfferId}`,
    body: opts.withPayment ? opts.payment : {},
    ctx,
  });
}

// ---------- Cancellation ----------

export function cancelEstimate(
  bookingId: string,
  opts: { retainItinerary?: boolean; refundTo?: 'originalFoP' | 'voucher' },
  ctx: KyteContext,
): Promise<CancelEstimate> {
  return kyteFetch<CancelEstimate>({
    method: 'POST',
    path: `/api/v3/booking/estimate/cancel/${bookingId}`,
    body: {
      retainItinerary: opts.retainItinerary ?? false,
      refundTo: opts.refundTo ?? 'originalFoP',
    },
    ctx,
  });
}

export function cancelConfirm(estimationId: string, ctx: KyteContext): Promise<unknown> {
  return kyteFetch({
    method: 'POST',
    path: `/api/v3/booking/change/confirm/${estimationId}`,
    body: {},
    ctx,
  });
}
