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
import { reportBug } from './report-bug';

export type BookingType = 'hotel' | 'flight' | 'package' | 'car';

export type Supplier =
  | 'liteapi'
  | 'ratehawk'
  | 'webbeds'
  | 'dotw'
  | 'duffel'
  | 'airgateway'
  | 'kyte'
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

  // ── Channel attribution (added 2026-05-10) ────────────────────────────
  // Booking origin captured server-side from request UA at start-booking
  // time. Optional on older records that pre-date the field.
  channel?: 'ios' | 'android' | 'web';

  // ── £5-off-2nd-booking-via-app promo (added 2026-05-10) ───────────────
  // v1 ships LiteAPI-only with a manual cashback payout. The eligibility
  // engine lives at src/lib/promo.ts; the checkout flow flags the booking
  // here so the admin /admin/promos page can surface it for the owner to
  // process the £5 refund manually until v2 ships an automated payout.
  /** Promo code applied to this booking. v1 only sets 'APP_2ND_5OFF'. */
  promoCode?: string | null;
  /** Discount amount in pence (always 500 for APP_2ND_5OFF in v1). */
  promoDiscountPence?: number;
  /** Cashback payout state.
   *   'eligible' = flagged at booking confirmation, owner needs to refund £5.
   *   'paid'     = owner has issued the refund and clicked "Mark as paid".
   *   'denied'   = re-validation at book-time refused the promo (e.g. race). */
  promoStatus?: 'eligible' | 'paid' | 'denied' | null;
  /** ISO timestamp of when the owner marked the cashback as paid. */
  promoPaidAt?: string;
  /** Free-text note from the owner: e.g. "LiteAPI partial refund txn=xyz"
   *  or "Wise transfer ref=abc". Surfaces on the admin booking detail page. */
  promoPaidNote?: string;
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

/** Strip a phone number to just digits, then keep the last 10. Lets us
 *  match across whatever format customers entered at booking time
 *  ("+44 786 123 4567", "07861234567", "(786) 123-4567" all collapse to
 *  the same 10-digit suffix). 10 digits is the right length for UK
 *  mobile (drop leading 0 / +44) and most international formats — short
 *  enough to be format-tolerant, long enough to avoid false matches. */
function phoneTail(raw: string | null | undefined): string {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  return digits.slice(-10);
}

/** Find bookings whose customerPhone matches the given caller-ID number.
 *  Twilio sends caller IDs in E.164 (e.g. +447863750285). We compare the
 *  last 10 digits to be tolerant of how the customer originally entered
 *  their number at booking time. Returns newest-first. */
export async function getBookingsByPhone(callerNumber: string): Promise<Booking[]> {
  const tail = phoneTail(callerNumber);
  if (!tail) return [];
  const all = await listBookings();
  return all
    .filter(b => phoneTail(b.customerPhone) === tail)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function upsertBooking(booking: Booking): Promise<void> {
  const all = await listBookings();
  const idx = all.findIndex(b => b.id === booking.id);
  if (idx >= 0) all[idx] = booking;
  else all.unshift(booking);
  try {
    await kv.set(KV_KEY, all);
  } catch (e) {
    // LOUD by design. A swallowed booking write means the customer paid and
    // the supplier booking went through, but JetMeAway holds no record — it
    // vanishes from the admin dashboard, the Twilio IVR lookup, Scout
    // reminders, promo checks and /api/account. This previously only
    // console.error'd, so it failed silently.
    //
    // Likeliest cause at scale: `bookings:all` is one giant KV array and the
    // whole thing is rewritten on every booking; once it nears Upstash's
    // ~1 MB request limit (~1k bookings) the kv.set starts failing. The real
    // fix is one-key-per-booking — see the build-queue KV-size note — but
    // until then this at least makes the failure impossible to miss.
    console.error('bookings: KV write failed', e);
    reportBug('bookings: KV write failed — booking NOT persisted', {
      bookingId: booking.id,
      type: booking.type,
      supplier: booking.supplier,
      status: booking.status,
      bookingCount: all.length,
      error: String(e),
    });
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
    kyte: 'Kyte',
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
