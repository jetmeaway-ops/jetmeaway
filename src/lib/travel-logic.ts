/**
 * JetMeAway Travel Logic
 * ─────────────────────────────────────────────────────────
 * Centralised pricing, markup, and booking-intent helpers.
 * Used by API routes and UI components.
 */

/* ═══════════════════════════════════════════════════════════════════════════
   MARKUP
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Percentage markup applied to every Duffel flight price.
 * 0.05 = 5 % — tuned to price competitively against Kiwi.com (0–3 %) and
 * Trip.com (1–4 %) on LCC fares while still covering Stripe (2.9 % + 20p)
 * plus support/chargeback buffer. On premium long-haul (£500+) 5 % still
 * yields £25+ per passenger, which is healthy for a comparison engine.
 * Previous value (0.10) was pricing us out of the grid on every £30 LCC
 * ticket — £4 minimum dominated and we lost the cheapest-card slot.
 */
export const MARKUP_PCT = 0.05;

/** Minimum markup per passenger (GBP) — covers Stripe fees + chargeback reserve. */
export const MARKUP_MIN_GBP = 2;

/**
 * @deprecated Legacy fixed markup (£). Kept as a fallback for any code still
 * importing it — treat as the *typical* per-person markup for display only.
 * Prefer {@link markupFor} for accurate per-price markup.
 */
export const MARKUP_GBP = MARKUP_MIN_GBP;

/** Per-passenger markup in GBP for a given raw airline price. */
export function markupFor(basePrice: number): number {
  const pct = basePrice * MARKUP_PCT;
  return Math.round(Math.max(pct, MARKUP_MIN_GBP) * 100) / 100;
}

/** Apply markup to a raw airline price and return the customer-facing total */
export function applyMarkup(basePrice: number): number {
  return Math.round((basePrice + markupFor(basePrice)) * 100) / 100;
}

/**
 * Given a customer-facing (post-markup) per-passenger price, return the
 * original base airline price. Used by the orchestrator to reverse-engineer
 * what the customer paid vs the airline quote for drift detection.
 *
 * At base = MARKUP_MIN / MARKUP_PCT the two branches meet, so `Math.min`
 * picks the correct one either side.
 */
export function reverseMarkup(paidPerPerson: number): number {
  const pctPath = paidPerPerson / (1 + MARKUP_PCT);
  const floorPath = paidPerPerson - MARKUP_MIN_GBP;
  return Math.min(pctPath, floorPath);
}

/** Format a GBP price for display (e.g. "£142.50") */
export function formatPrice(amount: number): string {
  return `£${amount.toFixed(2)}`;
}

/** Return a breakdown object for transparency / debugging */
export function priceBreakdown(basePrice: number) {
  const markup = markupFor(basePrice);
  const total = Math.round((basePrice + markup) * 100) / 100;
  return {
    airline: basePrice,
    markup,
    total,
    display: formatPrice(total),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   BOOKING INTENT (Vercel KV)
   ═══════════════════════════════════════════════════════════════════════════ */

import { kv } from '@vercel/kv';

export type BookingIntent = {
  offerId: string;
  email: string;
  origin: string;
  destination: string;
  departure: string;
  returnDate: string | null;
  passengers: number;
  totalPrice: number;
  airline: string;
  createdAt: string;
};

/**
 * Save a booking intent — the user has selected an offer and entered
 * their email. Stored for 24 hours so they can resume if they refresh.
 */
export async function saveBookingIntent(sessionId: string, intent: BookingIntent) {
  try {
    const key = `booking:${sessionId}`;
    await kv.set(key, intent, { ex: 86400 }); // 24h TTL
  } catch (error) {
    console.error('Failed to save booking intent', error);
  }
}

/** Retrieve a saved booking intent by session ID */
export async function getBookingIntent(sessionId: string): Promise<BookingIntent | null> {
  try {
    return await kv.get<BookingIntent>(`booking:${sessionId}`);
  } catch {
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   SEARCH HISTORY (Vercel KV)
   ═══════════════════════════════════════════════════════════════════════════ */

export type FlightSearch = {
  origin: string;
  destination: string;
  departure: string;
  returnDate: string | null;
  passengers: number;
  cheapest: number | null; // cheapest total price found (with markup)
  ts: number; // timestamp
};

/**
 * Log a flight search to the user's history.
 * Keeps only the 5 most recent, deduped by route + date.
 */
export async function logFlightSearch(sessionId: string, search: FlightSearch) {
  try {
    const key = `searches:${sessionId}`;
    const existing = await kv.get<FlightSearch[]>(key) || [];

    // Remove duplicate route+date
    const filtered = existing.filter(
      s => !(s.origin === search.origin && s.destination === search.destination && s.departure === search.departure)
    );

    const updated = [search, ...filtered].slice(0, 5);
    await kv.set(key, updated, { ex: 604800 }); // 7 day TTL
  } catch (error) {
    console.error('Failed to log flight search', error);
  }
}

/** Get the user's recent flight searches */
export async function getFlightSearches(sessionId: string): Promise<FlightSearch[]> {
  try {
    return await kv.get<FlightSearch[]>(`searches:${sessionId}`) || [];
  } catch {
    return [];
  }
}
