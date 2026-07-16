import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import type { FlightContact, FlightPassenger } from '@/lib/liteapi-flights';

export const runtime = 'edge';

/**
 * Parking gate (Kyte pattern). Production leaves LITEAPI_FLIGHTS_ENABLED unset →
 * every write route 404s → checkout is unreachable → nothing changes for live
 * users. Preview sets it `true`. See scratch/flights-build-spec.md §PARKING.
 */
const LITEAPI_FLIGHTS_ENABLED = process.env.LITEAPI_FLIGHTS_ENABLED === 'true';

/**
 * POST /api/flights/liteapi/start-booking
 *
 * Body: {
 *   offerId: string,
 *   trip: {
 *     origin, destination,           // IATA
 *     depDate, retDate?,             // YYYY-MM-DD
 *     adults, children?, infants?,
 *     cabin?, currency?,
 *     totalPrice,                    // indicative search price (GBP)
 *     airline?, airlineName?, segments?
 *   }
 * }
 *
 * Mints a JMA-F-… reference, stores the pending flight booking in Vercel KV
 * (`pending-flight:{ref}` — a SEPARATE namespace from hotels' `pending-booking:`),
 * and returns { ref } for the client to land on /flights/liteapi/checkout/[ref].
 *
 * offerId is stored server-side ONLY and is NEVER echoed back in a URL or response.
 */

/** Trip summary captured at offer-select time. Mirrors the search offer + query. */
export interface FlightTrip {
  origin: string;
  destination: string;
  depDate: string;
  retDate?: string;
  adults: number;
  children: number;
  infants: number;
  cabin: string;
  currency: string;
  totalPrice: number;
  airline?: string;
  airlineName?: string;
  segments?: unknown[];
}

/** KV record for `pending-flight:{ref}`. Grows through the booking flow. */
export interface PendingFlight {
  ref: string;
  type: 'flight';
  supplier: 'liteapi';
  state: 'pending' | 'prebooked' | 'confirmed' | 'failed';
  /** Server-side only — NEVER returned in a URL or client response. */
  offerId: string;
  trip: FlightTrip;
  passengers?: FlightPassenger[];
  contact?: FlightContact;
  // Populated after prebook (LiteAPI Payment SDK flow)
  prebookId?: string;
  transactionId?: string;
  secretKey?: string;
  verifiedPrice?: number;
  verifiedCurrency?: string;
  // Populated after book
  bookingId?: string;
  bookingRef?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

const PENDING_TTL_SECONDS = 4 * 60 * 60; // 4h to complete checkout

function makeRef(): string {
  // JMA-F-XXXXXXXX — 8 uppercase A–Z0–9, crypto random.
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let s = '';
  for (let i = 0; i < 8; i++) s += alphabet[bytes[i] % alphabet.length];
  return `JMA-F-${s}`;
}

export async function POST(req: NextRequest) {
  if (!LITEAPI_FLIGHTS_ENABLED) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { offerId, trip } = body || {};

    if (!offerId || typeof offerId !== 'string') {
      return NextResponse.json({ error: 'offerId is required' }, { status: 400 });
    }
    if (!trip || typeof trip !== 'object') {
      return NextResponse.json({ error: 'trip is required' }, { status: 400 });
    }

    const origin = String(trip.origin || '').trim().toUpperCase();
    const destination = String(trip.destination || '').trim().toUpperCase();
    const depDate = String(trip.depDate || '').trim();
    const retDate = String(trip.retDate || '').trim();

    if (!/^[A-Z]{3}$/.test(origin) || !/^[A-Z]{3}$/.test(destination)) {
      return NextResponse.json({ error: 'trip.origin and trip.destination must be IATA codes' }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(depDate)) {
      return NextResponse.json({ error: 'trip.depDate must be YYYY-MM-DD' }, { status: 400 });
    }

    const totalPrice = Number(trip.totalPrice);
    if (!Number.isFinite(totalPrice) || totalPrice <= 0 || totalPrice > 50000) {
      return NextResponse.json({ error: 'trip.totalPrice invalid' }, { status: 400 });
    }

    const adults = Math.max(1, Math.round(Number(trip.adults) || 1));
    const children = Math.max(0, Math.round(Number(trip.children) || 0));
    const infants = Math.max(0, Math.round(Number(trip.infants) || 0));

    // Family bookings enabled 2026-07-16: the old adults-only backstop is gone.
    // Child/infant prebooks work once passengers carry numeric `passengerType`
    // (0/1/2) — LiteAPI silently ignored our `type` strings, which is what made
    // 53099 look like "children unsupported" (ticket LAS-1312; prebookFlight in
    // src/lib/liteapi-flights.ts now does the translation).

    const now = Date.now();
    const ref = makeRef();
    const record: PendingFlight = {
      ref,
      type: 'flight',
      supplier: 'liteapi',
      state: 'pending',
      offerId,
      trip: {
        origin,
        destination,
        depDate,
        ...(/^\d{4}-\d{2}-\d{2}$/.test(retDate) ? { retDate } : {}),
        adults,
        children,
        infants,
        cabin: String(trip.cabin || 'ECONOMY').toUpperCase(),
        currency: String(trip.currency || 'GBP').toUpperCase(),
        totalPrice: Math.round(totalPrice * 100) / 100,
        ...(trip.airline ? { airline: String(trip.airline) } : {}),
        ...(trip.airlineName ? { airlineName: String(trip.airlineName) } : {}),
        ...(Array.isArray(trip.segments) ? { segments: trip.segments } : {}),
      },
      createdAt: now,
      updatedAt: now,
    };

    await kv.set(`pending-flight:${ref}`, record, { ex: PENDING_TTL_SECONDS });
    return NextResponse.json({ ref });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[flights/liteapi/start-booking]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
