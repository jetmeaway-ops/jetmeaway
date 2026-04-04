/**
 * JetMeAway Travel Logic
 * ─────────────────────────────────────────────────────────
 * Centralised pricing, markup, and booking-intent helpers.
 * Used by API routes and UI components.
 */

/* ═══════════════════════════════════════════════════════════════════════════
   MARKUP
   ═══════════════════════════════════════════════════════════════════════════ */

/** Fixed markup added to every Duffel flight price (GBP) */
export const MARKUP_GBP = 15;

/** Apply markup to a raw airline price and return the customer-facing total */
export function applyMarkup(basePrice: number): number {
  return Math.round((basePrice + MARKUP_GBP) * 100) / 100;
}

/** Format a GBP price for display (e.g. "£142.50") */
export function formatPrice(amount: number): string {
  return `£${amount.toFixed(2)}`;
}

/** Return a breakdown object for transparency / debugging */
export function priceBreakdown(basePrice: number) {
  const total = applyMarkup(basePrice);
  return {
    airline: basePrice,
    markup: MARKUP_GBP,
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
