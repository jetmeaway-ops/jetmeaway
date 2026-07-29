import { NextRequest, NextResponse } from 'next/server';
import { kyteCertAllowed } from '@/lib/kyte-access';
import {
  shopFlights,
  newKyteContext,
  KyteAuthError,
  KyteConfigError,
  KyteProxyError,
  KyteServerError,
  KyteValidationError,
  type Cabin,
  type KyteShopRequest,
} from '@/lib/kyte';

/* ═══════════════════════════════════════════════════════════════════════════
   POST /api/flights/kyte/search

   Kicks off a Kyte LCC ShopFlights call via the Fixie static-IP proxy.
   Synchronous (Kyte's Shop endpoint is not async) — returns offers in the
   same response.

   ⚠ Node runtime, NOT Edge. Kyte requires undici.ProxyAgent which is not
   available on Vercel Edge. The rest of the app stays on Edge.

   Body:
     { origin, destination, departure, return?, adults, children?, infants?,
       cabin?, airlines? }

   Response (200):
     { transactionId, offerCount, offers, raw }
     - transactionId: pass back to subsequent Book/Payment/Retrieve calls
     - offerCount: number of offers in the response
     - offers: Kyte's offers map keyed by offerId (raw shape, not yet
       normalised to JetMeAway flight rows — Phase 3 work)
     - raw: any other top-level keys Kyte returned, useful for debugging

   Response (4xx/5xx):
     { error: string, status?: number }
   ═══════════════════════════════════════════════════════════════════════════ */

export const runtime = 'nodejs';
// Branded fares fire 3 Shop calls (lowest/low/flexible). They run in parallel,
// but the single Fixie static-IP proxy serialises them, so wall-time ≈ 3× a
// single call and can breach the old 30s cap (observed live: HTTP 504 @ ~30s).
// 60s gives headroom for all three tiers to return. Kyte is cert-only for now;
// revisit for customer launch (Fixie concurrency / caching) — a 30-45s search
// is fine for certification but too slow for real customers.
export const maxDuration = 60;

// ── Kyte access gate ─────────────────────────────────────────────────────────
// Kyte is OFF for customers until the LIVE key lands (the sandbox key covers
// only a handful of fixed routes). The public /flights search carries no cert
// token, so it gets an empty offer set and falls back to Duffel + Travelpayouts.
// Only requests from the private /kyte-cert page (carrying the x-kyte-cert token)
// — or a global KYTE_ENABLED=true — get real sandbox offers. See @/lib/kyte-access.

type Body = {
  origin?: string;
  destination?: string;
  departure?: string;
  return?: string | null;
  adults?: number;
  children?: number;
  infants?: number;
  cabin?: Cabin;
  airlines?: string;
  nonStopFlight?: boolean;
};

/** Merge Kyte `legs` across the parallel fare-tier responses. Kyte returns
 * `legs` as either a map keyed by id or an array; the same journey recurs in
 * every tier, so we dedupe by id (array) or spread-merge (map). Not consumed
 * by the client converter today, but passed through for debug/forward-compat. */
function mergeLegs(a: unknown, b: unknown): unknown {
  if (b == null) return a;
  if (a == null) return b;
  if (Array.isArray(a) && Array.isArray(b)) {
    const seen = new Set(a.map((x) => (x as { id?: unknown })?.id));
    const merged = [...a];
    for (const item of b) {
      const id = (item as { id?: unknown })?.id;
      if (id === undefined || !seen.has(id)) {
        merged.push(item);
        seen.add(id);
      }
    }
    return merged;
  }
  if (typeof a === 'object' && typeof b === 'object') {
    return { ...(a as object), ...(b as object) };
  }
  return b;
}

export async function POST(req: NextRequest) {
  // No cert token (and not globally enabled) → empty offer set, so the public
  // client shows no Kyte rows and the search falls back to Duffel +
  // Travelpayouts. The /kyte-cert page sends the token and gets real offers.
  if (!kyteCertAllowed(req)) {
    return NextResponse.json({ transactionId: null, offerCount: 0, offers: {} });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid json body' }, { status: 400 });
  }

  const origin = (body.origin || '').toUpperCase();
  const destination = (body.destination || '').toUpperCase();
  const departure = body.departure || '';
  const returnDate = body.return || null;
  const adults = Math.max(1, Number(body.adults) || 1);
  const children = Math.max(0, Number(body.children) || 0);
  const infants = Math.max(0, Number(body.infants) || 0);
  const cabin: Cabin = body.cabin || 'economy';

  if (!origin || !destination || !departure) {
    return NextResponse.json(
      { error: 'origin, destination, departure are required' },
      { status: 400 },
    );
  }
  if (!/^[A-Z]{3}$/.test(origin) || !/^[A-Z]{3}$/.test(destination)) {
    return NextResponse.json(
      { error: 'origin and destination must be IATA-3 codes' },
      { status: 400 },
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(departure)) {
    return NextResponse.json(
      { error: 'departure must be YYYY-MM-DD' },
      { status: 400 },
    );
  }

  // Kyte's passengers shape is age-based. Map our adults/children/infants
  // to representative ages. Kyte LCC sample uses adult age=30; children
  // and infants we approximate (LCC fare classes typically only care
  // about age bucket: adult/child/infant).
  const passengers: Array<{ age: number }> = [
    ...Array.from({ length: adults }, () => ({ age: 30 })),
    ...Array.from({ length: children }, () => ({ age: 8 })),
    ...Array.from({ length: infants }, () => ({ age: 1 })),
  ];

  const journeys = [
    { departureAirport: origin, arrivalAirport: destination, date: { main: departure } },
  ];
  if (returnDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(returnDate)) {
      return NextResponse.json(
        { error: 'return must be YYYY-MM-DD' },
        { status: 400 },
      );
    }
    journeys.push({
      departureAirport: destination,
      arrivalAirport: origin,
      date: { main: returnDate },
    });
  }

  const baseReq: Omit<KyteShopRequest, 'flexibility'> = {
    journeys,
    cabinType: cabin,
    nonStopFlight: body.nonStopFlight ?? false,
    exactMatch: true,
    passengers,
  };

  const ctx = newKyteContext();

  // Branded fares: Kyte returns only ONE fare tier per Shop call, so a lone
  // `flexibility: 'lowest'` call surfaced just the basic fare. Per Kyte
  // (Raquel Garcia, 2026-07-29) fan out three parallel Shop calls on ONE
  // transaction and merge the results:
  //   lowest   → basic fare (all airlines)
  //   low      → fares between basic and flexible
  //   flexible → flexible fare (LCCs that expose one on the API)
  // All three reuse ctx.transactionId (kyteFetch never mutates ctx), so every
  // merged offer stays bookable through the existing single-transaction
  // Book → Commit → Payment flow. allSettled: a tier with no product (common
  // for `flexible`) may 4xx or return empty without failing the whole search.
  const FLEX = ['lowest', 'low', 'flexible'] as const;

  try {
    const settled = await Promise.allSettled(
      FLEX.map((flexibility) =>
        shopFlights({ ...baseReq, flexibility }, ctx, { airlines: body.airlines }),
      ),
    );

    if (!settled.some((s) => s.status === 'fulfilled')) {
      // Every tier failed — rethrow the first error so the mapping below
      // returns the right status (config/proxy/auth/validation/server).
      throw (settled.find((s) => s.status === 'rejected') as PromiseRejectedResult).reason;
    }

    // Merge offers + flightSolutions (both maps keyed by id) and legs across
    // the fulfilled tiers. The same journey recurs in every tier, so identical
    // solution/leg ids spread-merge (dedupe); offers differ by fare → distinct
    // offerIds. `raw` carries anything else Kyte returned, for debug only.
    const offers: Record<string, unknown> = {};
    const flightSolutions: Record<string, unknown> = {};
    let legs: unknown;
    const raw: Record<string, unknown> = {};

    for (const s of settled) {
      if (s.status !== 'fulfilled') continue;
      const res = s.value as Record<string, unknown>;
      Object.assign(offers, (res.offers as Record<string, unknown>) || {});
      Object.assign(flightSolutions, (res.flightSolutions as Record<string, unknown>) || {});
      legs = mergeLegs(legs, res.legs);
      for (const [k, v] of Object.entries(res)) {
        if (k !== 'offers' && k !== 'flightSolutions' && k !== 'legs') raw[k] = v;
      }
    }

    return NextResponse.json({
      transactionId: ctx.transactionId,
      offerCount: Object.keys(offers).length,
      offers,
      flightSolutions,
      legs,
      raw,
    });
  } catch (err) {
    if (err instanceof KyteConfigError) {
      return NextResponse.json(
        { error: 'kyte not configured', detail: err.message },
        { status: 503 },
      );
    }
    if (err instanceof KyteProxyError) {
      return NextResponse.json(
        { error: 'kyte proxy error', detail: err.message },
        { status: 502 },
      );
    }
    if (err instanceof KyteAuthError) {
      return NextResponse.json(
        { error: 'kyte auth/IP rejected', status: err.statusCode },
        { status: 502 },
      );
    }
    if (err instanceof KyteValidationError) {
      return NextResponse.json(
        { error: err.message, status: err.statusCode },
        { status: 400 },
      );
    }
    if (err instanceof KyteServerError) {
      return NextResponse.json(
        { error: 'kyte upstream error', status: err.statusCode },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { error: 'unexpected error', detail: (err as Error).message },
      { status: 500 },
    );
  }
}
