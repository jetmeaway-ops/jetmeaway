/**
 * Shared types for the JSON payloads returned by jetmeaway.co.uk's API.
 * Mirrors the public surface — internal admin / supplier shapes are NOT
 * surfaced here on purpose (those are blocked at the network layer in
 * `apiClient` callers).
 */

import type { SavedBooking, BookingProvider } from '../services/offline-bookings';

/* ── /api/account/me ────────────────────────────────────────────────── */

export type RemoteBooking = {
  id: string;
  type: 'flight' | 'hotel' | 'package';
  title?: string;
  destination?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  nights?: number;
  totalPence?: number;
  status?: string;
  paymentStatus?: string;
  supplierRef?: string;
  provider?: BookingProvider;
  lat?: number;
  lng?: number;
  phone?: string;
  createdAt?: number;
};

export type AccountMeResponse = {
  success: boolean;
  email?: string;
  bookings?: RemoteBooking[];
};

/* ── /api/account/saved-searches ────────────────────────────────────── */

export type SavedSearchType = 'flight' | 'hotel';

export type SavedSearchCriteria = {
  origin?: string;          // IATA code or city slug
  destination?: string;     // IATA code or city slug
  destinationLabel?: string;
  originLabel?: string;
  departure?: string;       // ISO yyyy-mm-dd
  return?: string;          // ISO yyyy-mm-dd, undefined for one-way / hotel
  passengers?: number;
  cabin?: 'economy' | 'premium' | 'business' | 'first';
  checkIn?: string;
  checkOut?: string;
  guests?: number;
};

export type SavedSearch = {
  id: string;
  type: SavedSearchType;
  label: string;
  criteria: SavedSearchCriteria;
  savedPricePence: number;
  currency: string;
  url: string;
  notify: boolean;
  createdAt: number;
  updatedAt: number;
  lastCheckedAt?: number;
  lastObservedPricePence?: number;
};

export type SavedSearchesResponse = {
  success: boolean;
  searches?: SavedSearch[];
};

/* ── Helpers ────────────────────────────────────────────────────────── */

/**
 * Map a backend RemoteBooking into the on-device SavedBooking shape so
 * the cache merge inside `useTrips` can dedupe by id.
 */
export function remoteToSaved(r: RemoteBooking): SavedBooking {
  const guests = typeof r.guests === 'number' ? r.guests : undefined;
  const subtitle = guests
    ? `${guests} guest${guests === 1 ? '' : 's'}`
    : undefined;
  const total =
    typeof r.totalPence === 'number'
      ? `£${(r.totalPence / 100).toFixed(2)}`
      : undefined;

  return {
    id: r.id,
    type: r.type,
    title: r.title || r.destination || r.id,
    subtitle,
    startDate: r.checkIn,
    endDate: r.checkOut,
    address: r.destination,
    phone: r.phone,
    total,
    url: `https://jetmeaway.co.uk/account/bookings#${r.id}`,
    savedAt: r.createdAt ?? Date.now(),
    provider: r.provider,
    lat: r.lat,
    lng: r.lng,
    nights: r.nights,
    passengers: guests,
  };
}
