/**
 * RateHawk (ETG / Emerging Travel Group) — Hotel API Client Scaffold
 *
 * Account:  JETMEAWAY LTD — Office B2B-377923 (GBP)
 * Contact:  api@ratehawk.com
 * Status:   Awaiting sandbox credentials (email sent 2026-04-18).
 *
 * Docs base (production):  https://api.worldota.net/api/b2b/v3/
 * Docs base (sandbox):     TBC — RateHawk usually issues a separate host.
 *
 * Auth model: HTTP Basic — `${KEY_ID}:${API_KEY}` base64-encoded.
 *             Edge-compatible via btoa() (no Node Buffer available).
 *
 * Three-layer data strategy:
 *   1. Static dump (weekly cron → Vercel Blob)  → images, names, amenities
 *   2. Live search (this module, KV-cached 15m) → prices, availability
 *   3. Scout overlay (src/lib/scout/*)           → wellness, rituals, intel
 *
 * ENV VARS REQUIRED (all server-side — never prefix with NEXT_PUBLIC_):
 *   RATEHAWK_KEY_ID      — numeric or string key identifier
 *   RATEHAWK_API_KEY     — secret token
 *   RATEHAWK_BASE_URL    — optional override (defaults to production host)
 *   RATEHAWK_MODE        — 'sandbox' | 'production' (defaults to sandbox)
 */

const RH_BASE = process.env.RATEHAWK_BASE_URL || 'https://api.worldota.net/api/b2b/v3';
const RH_KEY_ID = process.env.RATEHAWK_KEY_ID || '';
const RH_API_KEY = process.env.RATEHAWK_API_KEY || '';
const RH_MODE = (process.env.RATEHAWK_MODE || 'sandbox') as 'sandbox' | 'production';

// ───────────────────────────────────────────────────────────
// Types — Request / Response shapes
// ───────────────────────────────────────────────────────────

export type RHGuests = {
  adults: number;
  children: number[]; // ages, empty array if none
};

export type RHSearchRequest = {
  checkin: string;   // YYYY-MM-DD
  checkout: string;  // YYYY-MM-DD
  residency: string; // ISO-2 lowercase, e.g. 'gb'
  language: string;  // 'en'
  guests: RHGuests[];
  region_id: number; // numeric region id from RateHawk
  currency?: 'GBP' | 'EUR' | 'USD';
  timeout?: number;       // ms
  hotels_limit?: number;  // 1–1000
  upsells?: Record<string, unknown>;
};

export type RHHotelPageRequest = {
  checkin: string;
  checkout: string;
  residency: string;
  language: string;
  guests: RHGuests[];
  id: string;          // hotel id from search results (book_hash's parent)
  currency?: 'GBP' | 'EUR' | 'USD';
  timeout?: number;
  upsells?: Record<string, unknown>;
};

export type RHPrebookRequest = {
  hash: string;        // book_hash from /search/hp
  price_increase_percent?: number;
};

export type RHBookFormRequest = {
  partner_order_id: string;  // our idempotency key
  book_hash: string;
  language?: string;
  user_ip: string;
  rooms: Array<{
    guests: Array<{
      first_name: string;
      last_name: string;
      is_child?: boolean;
      age?: number;
    }>;
  }>;
  payment_type: {
    type: 'deposit' | 'hotel';
    amount: string;
    currency_code: string;
  };
  return_path?: string;
  arrival_datetime?: string;
};

export type RHResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
  requestId?: string;
};

// ───────────────────────────────────────────────────────────
// Core fetch wrapper — Basic auth, JSON, timeout, retry
// ───────────────────────────────────────────────────────────

/**
 * Low-level RateHawk request. Handles auth, JSON encoding, and a
 * single retry on 5xx or network failure. All RateHawk endpoints
 * accept POST with JSON bodies — even "GET"-shaped reads like region
 * search are POSTs in their spec.
 */
export async function rhFetch<T = unknown>(
  path: string,
  body: Record<string, unknown> = {},
  opts: { timeoutMs?: number; retry?: boolean } = {}
): Promise<RHResult<T>> {
  if (!RH_KEY_ID || !RH_API_KEY) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: 'RateHawk credentials not set — awaiting sandbox key from api@ratehawk.com',
    };
  }

  const auth = btoa(`${RH_KEY_ID}:${RH_API_KEY}`);
  const url = `${RH_BASE}${path}`;
  const { timeoutMs = 10_000, retry = true } = opts;

  const doRequest = async (): Promise<RHResult<T>> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'JetMeAway/1.0 (B2B-377923)',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const requestId = res.headers.get('x-request-id') || undefined;
      let json: unknown = null;
      try { json = await res.json(); } catch { /* non-JSON body */ }

      // RateHawk wraps responses as { status: 'ok' | 'error', data, error }
      const payload = json as { status?: string; data?: T; error?: string } | null;
      const apiOk = payload?.status === 'ok';

      return {
        ok: res.ok && apiOk,
        status: res.status,
        data: apiOk ? (payload?.data ?? null) : null,
        error: !apiOk ? (payload?.error || `HTTP ${res.status}`) : undefined,
        requestId,
      };
    } catch (err) {
      const aborted = err instanceof Error && err.name === 'AbortError';
      return {
        ok: false,
        status: aborted ? 408 : 0,
        data: null,
        error: aborted ? 'timeout' : (err instanceof Error ? err.message : 'network error'),
      };
    } finally {
      clearTimeout(timer);
    }
  };

  const first = await doRequest();
  if (first.ok || !retry) return first;

  // Retry once on network error or 5xx — idempotent for reads,
  // caller MUST disable retry for book/prebook via opts.retry=false.
  if (first.status === 0 || first.status >= 500) {
    await new Promise(r => setTimeout(r, 400));
    return doRequest();
  }
  return first;
}

// ───────────────────────────────────────────────────────────
// Phase II — Multi-hotel search (region-level SERP)
// Endpoint: /search/serp/region/
// ───────────────────────────────────────────────────────────

export async function searchRegion(req: RHSearchRequest): Promise<RHResult<unknown>> {
  return rhFetch('/search/serp/region/', {
    checkin: req.checkin,
    checkout: req.checkout,
    residency: req.residency,
    language: req.language,
    guests: req.guests,
    region_id: req.region_id,
    currency: req.currency || 'GBP',
    timeout: req.timeout ?? 10000,
    hotels_limit: req.hotels_limit ?? 50,
    upsells: req.upsells || {},
  });
}

// ───────────────────────────────────────────────────────────
// Phase III — Single-hotel rate list (hotelpage)
// Endpoint: /search/hp/
// Returns authoritative book_hash values that are passed to prebook.
// ───────────────────────────────────────────────────────────

export async function searchHotelPage(req: RHHotelPageRequest): Promise<RHResult<unknown>> {
  return rhFetch('/search/hp/', {
    checkin: req.checkin,
    checkout: req.checkout,
    residency: req.residency,
    language: req.language,
    guests: req.guests,
    id: req.id,
    currency: req.currency || 'GBP',
    timeout: req.timeout ?? 10000,
    upsells: req.upsells || {},
  });
}

// ───────────────────────────────────────────────────────────
// Phase IV — Prebook (validate rate before payment)
// Endpoint: /hotel/prebook/
// NEVER cache. NEVER retry on non-idempotent failure.
// ───────────────────────────────────────────────────────────

export async function prebook(req: RHPrebookRequest): Promise<RHResult<unknown>> {
  return rhFetch(
    '/hotel/prebook/',
    {
      hash: req.hash,
      price_increase_percent: req.price_increase_percent ?? 0,
    },
    { retry: false, timeoutMs: 15_000 }
  );
}

// ───────────────────────────────────────────────────────────
// Phase V — Book (create reservation)
// Endpoint: /hotel/order/booking/form/
// Uses partner_order_id as idempotency key to prevent double-booking.
// ───────────────────────────────────────────────────────────

export async function bookForm(req: RHBookFormRequest): Promise<RHResult<unknown>> {
  return rhFetch(
    '/hotel/order/booking/form/',
    {
      partner_order_id: req.partner_order_id,
      book_hash: req.book_hash,
      language: req.language || 'en',
      user_ip: req.user_ip,
      rooms: req.rooms,
      payment_type: req.payment_type,
      return_path: req.return_path,
      arrival_datetime: req.arrival_datetime,
    },
    { retry: false, timeoutMs: 20_000 }
  );
}

// ───────────────────────────────────────────────────────────
// Phase VI — Finish booking (poll until confirmed)
// Endpoint: /hotel/order/booking/finish/status/
// ───────────────────────────────────────────────────────────

export async function bookingStatus(partnerOrderId: string): Promise<RHResult<unknown>> {
  return rhFetch(
    '/hotel/order/booking/finish/status/',
    { partner_order_id: partnerOrderId },
    { retry: true, timeoutMs: 8000 }
  );
}

// ───────────────────────────────────────────────────────────
// Region search helper — converts city name → numeric region_id
// Endpoint: /search/multicomplete/
// ───────────────────────────────────────────────────────────

export async function regionSearch(query: string, language = 'en'): Promise<RHResult<unknown>> {
  return rhFetch('/search/multicomplete/', {
    query,
    language,
  });
}

// ───────────────────────────────────────────────────────────
// Health check / credential status
// ───────────────────────────────────────────────────────────

export function credentialsStatus() {
  return {
    configured: !!(RH_KEY_ID && RH_API_KEY),
    mode: RH_MODE,
    base: RH_BASE,
    keyIdPreview: RH_KEY_ID ? `${RH_KEY_ID.slice(0, 4)}…` : null,
  };
}
