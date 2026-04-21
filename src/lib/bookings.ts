/**
 * Bookings — unified cross-supplier booking store.
 *
 * Source of truth for every booking made through JetMeAway, regardless of
 * which supplier (LiteAPI, RateHawk, WebBeds, Duffel, AirGateway) handled
 * the fulfilment. Admin portal reads from here; supplier webhooks write
 * to here.
 *
 * Backed by Vercel KV in production. Falls back to in-memory seed data
 * when KV is unavailable (local dev / preview), so the admin dashboard
 * always has something to render.
 */

import { kv } from '@vercel/kv';

export type BookingType = 'hotel' | 'flight' | 'package' | 'car';

export type Supplier =
  | 'liteapi'
  | 'ratehawk'
  | 'webbeds'
  | 'dotw'
  | 'duffel'
  | 'airgateway'
  | 'affiliate';

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'refunded'
  | 'failed';

export type Booking = {
  id: string;                    // e.g. JMA-2026-0001
  type: BookingType;
  supplier: Supplier;
  supplierRef: string | null;    // Supplier's own booking reference
  status: BookingStatus;

  // Customer
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;

  // Trip
  destination: string;
  checkIn: string | null;        // ISO date
  checkOut: string | null;       // ISO date
  guests: number;
  title: string;                 // Hotel name / flight route / package title

  // Money (all in GBP pence to avoid float issues)
  totalPence: number;            // What customer paid JetMeAway
  netPence: number;              // What we pay / owe the supplier
  marginPence: number;           // total - net

  // Payment
  stripePaymentId: string | null;
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'disputed';

  // Audit
  createdAt: string;             // ISO timestamp
  updatedAt: string;
  notes: string | null;

  // BACKLOG B3 (2026-04-21): free-cancel deadline copied from the rate at
  // booking time. Null when the rate is non-refundable or the supplier
  // doesn't surface one. /api/account/bookings/cancel gates self-service
  // cancellation on this being in the future.
  cancellationDeadline?: string | null;
};

export type BookingEvent = {
  at: string;
  kind: 'created' | 'status_change' | 'payment' | 'refund' | 'note';
  message: string;
};

/* --------------------------------- seed --------------------------------- */

// Empty — dashboard shows real bookings only. Real bookings land in KV via
// upsertBooking() from supplier webhooks / book routes.
const SEED: Booking[] = [];

/* ------------------------------ operations ------------------------------ */

const KV_KEY = 'bookings:all';

/** List all bookings, newest first. KV-backed with seed fallback. */
export async function listBookings(): Promise<Booking[]> {
  try {
    const fromKv = await kv.get<Booking[]>(KV_KEY);
    if (fromKv && fromKv.length) return fromKv;
  } catch {
    // KV unavailable — fall through to seed
  }
  return [...SEED].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function getBooking(id: string): Promise<Booking | null> {
  const all = await listBookings();
  return all.find(b => b.id === id) || null;
}

export async function upsertBooking(booking: Booking): Promise<void> {
  const all = await listBookings();
  const idx = all.findIndex(b => b.id === booking.id);
  if (idx >= 0) all[idx] = booking;
  else all.unshift(booking);
  try {
    await kv.set(KV_KEY, all);
  } catch (e) {
    console.error('bookings: KV write failed', e);
  }
}

/* ------------------------------ summaries ------------------------------ */

export type BookingStats = {
  total: number;
  confirmed: number;
  pending: number;
  cancelled: number;
  grossGbp: number;
  netGbp: number;
  marginGbp: number;
  last7Days: number;
  last30Days: number;
  upcomingCheckIns: number;
};

export function summarise(bookings: Booking[]): BookingStats {
  const now = Date.now();
  const d7 = now - 7 * 86400_000;
  const d30 = now - 30 * 86400_000;

  let gross = 0;
  let net = 0;
  let margin = 0;
  let confirmed = 0;
  let pending = 0;
  let cancelled = 0;
  let last7 = 0;
  let last30 = 0;
  let upcoming = 0;

  for (const b of bookings) {
    if (b.status === 'confirmed' || b.status === 'completed') {
      gross += b.totalPence;
      net += b.netPence;
      margin += b.marginPence;
      confirmed++;
    } else if (b.status === 'pending') pending++;
    else if (b.status === 'cancelled' || b.status === 'refunded') cancelled++;

    const created = new Date(b.createdAt).getTime();
    if (created >= d7) last7++;
    if (created >= d30) last30++;

    if (b.checkIn && b.status === 'confirmed') {
      const ci = new Date(b.checkIn).getTime();
      if (ci >= now && ci <= now + 7 * 86400_000) upcoming++;
    }
  }

  return {
    total: bookings.length,
    confirmed,
    pending,
    cancelled,
    grossGbp: gross / 100,
    netGbp: net / 100,
    marginGbp: margin / 100,
    last7Days: last7,
    last30Days: last30,
    upcomingCheckIns: upcoming,
  };
}

/* --------------------------------- fmt --------------------------------- */

export function fmtGbp(pence: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(pence / 100);
}

export function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function statusColor(status: BookingStatus): string {
  switch (status) {
    case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
    case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'pending':   return 'bg-amber-100 text-amber-900 border-amber-200';
    case 'cancelled': return 'bg-gray-100 text-gray-700 border-gray-200';
    case 'refunded':  return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'failed':    return 'bg-red-100 text-red-800 border-red-200';
  }
}

export function supplierLabel(s: Supplier): string {
  return {
    liteapi: 'LiteAPI',
    ratehawk: 'RateHawk',
    webbeds: 'WebBeds',
    dotw: 'DOTW',
    duffel: 'Duffel',
    airgateway: 'AirGateway',
    affiliate: 'Affiliate',
  }[s];
}

export function typeIcon(t: BookingType): string {
  return {
    hotel: 'fa-hotel',
    flight: 'fa-plane',
    package: 'fa-suitcase-rolling',
    car: 'fa-car',
  }[t];
}
