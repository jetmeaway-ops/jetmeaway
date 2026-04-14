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
};

export type BookingEvent = {
  at: string;
  kind: 'created' | 'status_change' | 'payment' | 'refund' | 'note';
  message: string;
};

/* --------------------------------- seed --------------------------------- */

const SEED: Booking[] = [
  {
    id: 'JMA-2026-0007',
    type: 'hotel',
    supplier: 'liteapi',
    supplierRef: 'LA-8827361',
    status: 'confirmed',
    customerName: 'Sami Iqbal',
    customerEmail: 'sami.iqbal@example.com',
    customerPhone: '+447944644000',
    destination: 'Baku, Azerbaijan',
    checkIn: '2026-04-22',
    checkOut: '2026-04-27',
    guests: 2,
    title: 'Fairmont Baku Flame Towers',
    totalPence: 68400,
    netPence: 61200,
    marginPence: 7200,
    stripePaymentId: 'pi_3OQxYZ2eZvKYlo2C1abc',
    paymentStatus: 'paid',
    createdAt: '2026-04-13T18:42:11Z',
    updatedAt: '2026-04-13T18:42:44Z',
    notes: 'Repeat customer — trip to Baku',
  },
  {
    id: 'JMA-2026-0006',
    type: 'flight',
    supplier: 'duffel',
    supplierRef: 'DUF-ord_0000B4pQ7',
    status: 'confirmed',
    customerName: 'Hannah Clarke',
    customerEmail: 'h.clarke@example.co.uk',
    customerPhone: '+447700900142',
    destination: 'LHR → DXB',
    checkIn: '2026-05-02',
    checkOut: '2026-05-12',
    guests: 1,
    title: 'British Airways BA105 return',
    totalPence: 51900,
    netPence: 49200,
    marginPence: 2700,
    stripePaymentId: 'pi_3OQwLm2eZvKYlo2C9xyz',
    paymentStatus: 'paid',
    createdAt: '2026-04-13T14:08:22Z',
    updatedAt: '2026-04-13T14:09:01Z',
    notes: null,
  },
  {
    id: 'JMA-2026-0005',
    type: 'hotel',
    supplier: 'ratehawk',
    supplierRef: 'RH-44128821',
    status: 'pending',
    customerName: 'Omar Khalil',
    customerEmail: 'omar.k@example.com',
    customerPhone: '+447911223344',
    destination: 'Sharm El Sheikh, Egypt',
    checkIn: '2026-04-19',
    checkOut: '2026-04-26',
    guests: 4,
    title: 'Rixos Sharm El Sheikh (All Inclusive)',
    totalPence: 182400,
    netPence: 164000,
    marginPence: 18400,
    stripePaymentId: 'pi_3OQvA12eZvKYlo2Cdef',
    paymentStatus: 'paid',
    createdAt: '2026-04-13T11:17:55Z',
    updatedAt: '2026-04-13T11:18:12Z',
    notes: 'Awaiting supplier confirmation',
  },
  {
    id: 'JMA-2026-0004',
    type: 'hotel',
    supplier: 'liteapi',
    supplierRef: 'LA-8826104',
    status: 'completed',
    customerName: 'Priya Sharma',
    customerEmail: 'priya.sharma@example.com',
    customerPhone: '+447894561230',
    destination: 'Paris, France',
    checkIn: '2026-04-04',
    checkOut: '2026-04-08',
    guests: 2,
    title: 'Hôtel Le Marais Opéra',
    totalPence: 42800,
    netPence: 38500,
    marginPence: 4300,
    stripePaymentId: 'pi_3OQsKL2eZvKYlo2Cgh1',
    paymentStatus: 'paid',
    createdAt: '2026-04-01T09:32:10Z',
    updatedAt: '2026-04-08T12:00:00Z',
    notes: 'Stay completed, guest reviewed 5★',
  },
  {
    id: 'JMA-2026-0003',
    type: 'package',
    supplier: 'affiliate',
    supplierRef: null,
    status: 'confirmed',
    customerName: 'James Whitaker',
    customerEmail: 'jw@example.co.uk',
    customerPhone: null,
    destination: 'Maldives',
    checkIn: '2026-06-10',
    checkOut: '2026-06-18',
    guests: 2,
    title: 'Expedia — Maldives 8-night package',
    totalPence: 0,
    netPence: 0,
    marginPence: 4200,
    stripePaymentId: null,
    paymentStatus: 'paid',
    createdAt: '2026-04-10T16:44:09Z',
    updatedAt: '2026-04-11T10:21:00Z',
    notes: 'Affiliate click → confirmed on Expedia. Commission pending',
  },
  {
    id: 'JMA-2026-0002',
    type: 'hotel',
    supplier: 'liteapi',
    supplierRef: 'LA-8824992',
    status: 'refunded',
    customerName: 'Diana Mwangi',
    customerEmail: 'd.mwangi@example.com',
    customerPhone: '+447889001122',
    destination: 'Barcelona, Spain',
    checkIn: '2026-04-20',
    checkOut: '2026-04-24',
    guests: 2,
    title: 'Hotel Arts Barcelona',
    totalPence: 56000,
    netPence: 50400,
    marginPence: 5600,
    stripePaymentId: 'pi_3OQoR82eZvKYlo2Cmno',
    paymentStatus: 'refunded',
    createdAt: '2026-04-05T20:14:40Z',
    updatedAt: '2026-04-07T09:12:22Z',
    notes: 'Cancelled within free-cancellation window',
  },
  {
    id: 'JMA-2026-0001',
    type: 'car',
    supplier: 'affiliate',
    supplierRef: null,
    status: 'confirmed',
    customerName: 'Alan Forster',
    customerEmail: 'alan.forster@example.co.uk',
    customerPhone: null,
    destination: 'Málaga Airport, Spain',
    checkIn: '2026-05-15',
    checkOut: '2026-05-22',
    guests: 4,
    title: 'EconomyBookings — SUV 7 days',
    totalPence: 0,
    netPence: 0,
    marginPence: 1800,
    stripePaymentId: null,
    paymentStatus: 'paid',
    createdAt: '2026-04-02T13:05:00Z',
    updatedAt: '2026-04-02T13:05:00Z',
    notes: null,
  },
];

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
