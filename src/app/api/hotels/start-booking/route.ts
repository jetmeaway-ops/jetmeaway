import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const runtime = 'edge';

/**
 * POST /api/hotels/start-booking
 *
 * Body: {
 *   offerId: string,
 *   hotelName: string,
 *   totalPrice: number,  // GBP, full stay
 *   currency?: string,
 *   checkIn: string,     // YYYY-MM-DD
 *   checkOut: string,    // YYYY-MM-DD
 *   city?: string,
 *   adults?: number,
 *   nights?: number,
 *   thumbnail?: string,
 * }
 *
 * Stores a pending booking in Vercel KV and returns a short reference the
 * client uses to land on /hotels/checkout/[ref]. The ref is also what we put
 * into Stripe Checkout metadata as `booking_reference`, so /success can match
 * the Stripe session back to the LiteAPI offer and finalise with completeBooking().
 */
export interface PendingBooking {
  ref: string;
  offerId: string;
  hotelName: string;
  stars: number;
  totalPrice: number;
  currency: string;
  checkIn: string;
  checkOut: string;
  city: string;
  adults: number;
  nights: number;
  /** Occupancy shape captured at search time; DOTW booking path mirrors the
   *  same rooms array when confirming. Default: single room, no children. */
  rooms?: number;
  children?: number;
  childAges?: number[];
  thumbnail: string | null;
  lat?: number;
  lng?: number;
  /** Taxes/fees NOT included in totalPrice — payable at property (e.g. city tax) */
  localFees?: number;
  /** Whether the rate is refundable (drives the Scout's Final Check badge on checkout) */
  refundable?: boolean;
  /** ISO timestamp by which the user must cancel to get a refund */
  cancellationDeadline?: string | null;
  state: 'pending' | 'paid' | 'booking' | 'confirmed' | 'failed';
  createdAt: number;
  /** Which wholesale supplier issued this offer. Drives the booking flow branch. */
  supplier?: 'liteapi' | 'dotw';
  // Populated after prebook (LiteAPI Payment SDK flow)
  prebookId?: string;
  transactionId?: string;
  // Populated after Stripe checkout (legacy flow + DOTW)
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  // Populated after LiteAPI book
  liteapiBookingId?: string;
  liteapiStatus?: string;
  liteapiConfirmationCode?: string | null;
  // Populated after DOTW confirmbooking
  dotwBookingRef?: string;
  dotwStatus?: string;
  dotwAllocationDetails?: string;   // only kept transiently during the 3-min lock
  error?: string;
}

const PENDING_TTL_SECONDS = 4 * 60 * 60; // 4h to complete checkout

function makeRef(): string {
  // JMA-H-XXXXXXXX (8 char alphanumeric, no confusable 0/O/1/I)
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 8; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `JMA-H-${s}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      offerId,
      hotelName,
      stars = 0,
      totalPrice,
      currency = 'GBP',
      checkIn,
      checkOut,
      city = '',
      adults = 2,
      nights,
      rooms = 1,
      children = 0,
      childAges,
      thumbnail = null,
      lat,
      lng,
      localFees = 0,
      refundable,
      cancellationDeadline = null,
      supplier,
    } = body || {};

    if (!offerId || typeof offerId !== 'string') {
      return NextResponse.json({ success: false, error: 'offerId is required' }, { status: 400 });
    }
    if (!hotelName || typeof hotelName !== 'string') {
      return NextResponse.json({ success: false, error: 'hotelName is required' }, { status: 400 });
    }
    if (!Number.isFinite(totalPrice) || totalPrice <= 0 || totalPrice > 50000) {
      return NextResponse.json({ success: false, error: 'totalPrice invalid' }, { status: 400 });
    }
    if (!checkIn || !checkOut) {
      return NextResponse.json({ success: false, error: 'checkIn and checkOut are required' }, { status: 400 });
    }

    const computedNights = Number.isFinite(nights) && nights > 0
      ? Math.round(nights)
      : Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000));

    const ref = makeRef();
    const record: PendingBooking = {
      ref,
      offerId,
      hotelName,
      stars: Number.isFinite(stars) ? Math.max(0, Math.min(5, Math.round(stars))) : 0,
      totalPrice: Math.round(totalPrice * 100) / 100,
      currency: currency.toUpperCase(),
      checkIn,
      checkOut,
      city,
      adults,
      nights: computedNights,
      rooms: Number.isFinite(rooms) && rooms > 0 ? Math.min(5, Math.round(rooms)) : 1,
      children: Number.isFinite(children) && children > 0 ? Math.min(10, Math.round(children)) : 0,
      ...(Array.isArray(childAges) && childAges.length > 0
        ? { childAges: childAges.slice(0, 10).map((n) => Math.max(0, Math.min(17, Number(n) || 0))) }
        : {}),
      thumbnail,
      ...(Number.isFinite(lat) ? { lat } : {}),
      ...(Number.isFinite(lng) ? { lng } : {}),
      ...(Number.isFinite(localFees) && localFees > 0 ? { localFees: Math.round(localFees * 100) / 100 } : {}),
      ...(typeof refundable === 'boolean' ? { refundable } : {}),
      ...(typeof cancellationDeadline === 'string' && cancellationDeadline ? { cancellationDeadline } : {}),
      // Derive supplier: explicit `supplier` field wins; else infer from offerId prefix
      // (`dotw:...` → dotw, otherwise liteapi).
      supplier: supplier === 'dotw' || offerId.startsWith('dotw:')
        ? 'dotw'
        : 'liteapi',
      state: 'pending',
      createdAt: Date.now(),
    };

    await kv.set(`pending-booking:${ref}`, record, { ex: PENDING_TTL_SECONDS });
    return NextResponse.json({ success: true, ref });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[hotels/start-booking]', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
