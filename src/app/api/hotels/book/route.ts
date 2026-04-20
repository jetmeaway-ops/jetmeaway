import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import Stripe from 'stripe';
import { bookWithTransactionId } from '@/lib/liteapi';
import { getRooms as dotwGetRooms, confirmBooking as dotwConfirmBooking } from '@/lib/dotw';
import {
  dotwRoomsToDetail,
  dotwConfirmToBookingRef,
} from '@/lib/suppliers/dotw-adapter';
import { upsertBooking, type Booking, type Supplier } from '@/lib/bookings';
import type { PendingBooking } from '../start-booking/route';
import type { PendingGuest } from '../pending/[ref]/guest/route';

/**
 * Mirror a hotel booking into the unified admin-facing bookings store.
 *
 * We call this twice: once when the booking succeeds (status='confirmed') and
 * once inside each failure helper (status='failed'). The LiteAPI webhook at
 * /api/webhooks/liteapi then picks up later status changes (cancel, refund,
 * supplier modification) by matching on `id === clientReference` or
 * `supplierRef === liteapiBookingId`. So this call is the *initial write* —
 * without it the webhook has nothing to update.
 *
 * Margin is left at 0 for this first pass. LiteAPI's prebook response carries
 * a commission figure we could wire through later; for now the admin shows
 * revenue-only and marks margin as "not tracked yet".
 */
async function mirrorToUnified(
  record: PendingBooking & { guest: PendingGuest },
  opts: {
    status: Booking['status'];
    supplierRef: string | null;
    notes: string;
    paymentStatus?: Booking['paymentStatus'];
  },
): Promise<void> {
  try {
    const supplier: Supplier = record.supplier === 'dotw' ? 'dotw' : 'liteapi';
    const totalPence = Math.round(record.totalPrice * 100);
    const guestName =
      `${record.guest.firstName || ''} ${record.guest.lastName || ''}`.trim() || 'Guest';
    const destination = record.city || '';
    const nowIso = new Date().toISOString();

    const booking: Booking = {
      id: record.ref, // JMA-H-XXXXXXXX — matches clientReference sent to supplier
      type: 'hotel',
      supplier,
      supplierRef: opts.supplierRef,
      status: opts.status,
      customerName: guestName,
      customerEmail: record.guest.email || '',
      customerPhone: record.guest.phone || null,
      destination,
      checkIn: record.checkIn || null,
      checkOut: record.checkOut || null,
      guests: record.adults + (record.children || 0),
      title: record.hotelName,
      totalPence,
      netPence: 0,
      marginPence: 0,
      stripePaymentId: record.stripePaymentIntentId || null,
      paymentStatus: opts.paymentStatus ?? 'paid',
      createdAt: nowIso,
      updatedAt: nowIso,
      notes: opts.notes,
    };

    await upsertBooking(booking);
  } catch (err) {
    // Admin-store write failing must never break the customer-facing flow.
    console.error('[hotels/book] mirrorToUnified failed', err);
  }
}

// Node runtime — LiteAPI book can take 15-25s, DOTW block→confirm must
// complete inside 3 minutes with MD5+gzip via `node:crypto`/`node:zlib`.
export const runtime = 'nodejs';
export const maxDuration = 60;

/** £2 price-drift tolerance — matches the flights orchestrator constant. */
const PRICE_DRIFT_TOLERANCE_GBP = 2;

/** Optional auto-refund helper. Mirrors flights/book pattern. */
async function refundPaymentIntent(
  paymentIntentId: string | undefined,
  reason: string,
): Promise<void> {
  if (!paymentIntentId) return;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.warn('[hotels/book] STRIPE_SECRET_KEY unset — cannot refund', paymentIntentId);
    return;
  }
  try {
    const stripe = new Stripe(key);
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      reason: 'requested_by_customer',
      metadata: { failure_reason: reason.slice(0, 500) },
    });
    console.log('[hotels/book] auto-refund issued', refund.id, 'for', paymentIntentId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[hotels/book] refund failed for', paymentIntentId, msg);
  }
}

/**
 * POST /api/hotels/book
 *
 * LiteAPI path (existing):
 *   Body: { ref, prebookId, transactionId }
 *   Called after the customer pays via the LiteAPI Payment SDK.
 *
 * DOTW path (new):
 *   Body: { ref }
 *   Called after the customer pays via our Stripe Elements form. We then
 *   do getrooms(block) → price-drift check → confirmbooking inside a
 *   single server action to stay inside DOTW's 3-minute rate lock.
 *   On ANY failure after a successful Stripe charge, auto-refunds via
 *   `refundPaymentIntent`.
 */
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { ref } = body || {};
  if (!ref || typeof ref !== 'string') {
    return NextResponse.json({ success: false, error: 'ref is required' }, { status: 400 });
  }

  const record = await kv.get<PendingBooking & { guest?: PendingGuest }>(`pending-booking:${ref}`);
  if (!record) {
    return NextResponse.json({ success: false, error: 'Booking not found or expired' }, { status: 404 });
  }

  // Idempotency: if already confirmed, return success immediately.
  if (record.state === 'confirmed') {
    if (record.supplier === 'dotw' && record.dotwBookingRef) {
      return NextResponse.json({
        success: true,
        booking: {
          bookingId: record.dotwBookingRef,
          status: record.dotwStatus,
          confirmationCode: record.dotwBookingRef,
        },
      });
    }
    if (record.liteapiBookingId) {
      return NextResponse.json({
        success: true,
        booking: {
          bookingId: record.liteapiBookingId,
          status: record.liteapiStatus,
          confirmationCode: record.liteapiConfirmationCode,
        },
      });
    }
  }

  // Prevent double-booking: if already being processed, reject
  if (record.state === 'booking') {
    return NextResponse.json({ success: false, error: 'Booking is already being processed' }, { status: 409 });
  }

  // Mark as 'booking' so concurrent calls can't race.
  await kv.set(`pending-booking:${ref}`, { ...record, state: 'booking' }, { ex: 4 * 60 * 60 });

  if (!record.guest) {
    return NextResponse.json({ success: false, error: 'Guest details missing' }, { status: 400 });
  }

  /* ──────────────────────────── DOTW PATH ─────────────────────────── */
  if (record.supplier === 'dotw') {
    return bookDotw(ref, record as PendingBooking & { guest: PendingGuest });
  }

  /* ───────────────────────── LiteAPI (existing) ───────────────────── */
  const { prebookId, transactionId } = body;
  if (!prebookId || typeof prebookId !== 'string') {
    return NextResponse.json({ success: false, error: 'prebookId is required' }, { status: 400 });
  }
  if (!transactionId || typeof transactionId !== 'string') {
    return NextResponse.json({ success: false, error: 'transactionId is required' }, { status: 400 });
  }
  // Verify transactionId matches what was stored during prebook
  if (record.transactionId && record.transactionId !== transactionId) {
    return NextResponse.json({ success: false, error: 'Transaction ID mismatch' }, { status: 400 });
  }

  try {
    const booking = await bookWithTransactionId({
      prebookId,
      transactionId,
      guest: {
        firstName: record.guest.firstName,
        lastName: record.guest.lastName,
        email: record.guest.email,
        phone: record.guest.phone,
        nationality: record.guest.nationality,
      },
      clientReference: ref,
      // Forward the Scout Special Requests note to the hotel as LiteAPI
      // `remarks`. Null/undefined when the guest left the box empty.
      specialRequests: record.specialRequests ?? null,
    });

    const updated = {
      ...record,
      state: 'confirmed' as const,
      liteapiBookingId: booking.bookingId,
      liteapiStatus: booking.status,
      liteapiConfirmationCode: booking.hotelConfirmationCode ?? null,
    };
    await kv.set(`pending-booking:${ref}`, updated, { ex: 30 * 24 * 60 * 60 });

    // Mirror to admin-facing bookings store so /admin sees the booking.
    await mirrorToUnified(record as PendingBooking & { guest: PendingGuest }, {
      status: 'confirmed',
      supplierRef: booking.bookingId,
      notes: `LiteAPI confirmed. Hotel confirmation: ${booking.hotelConfirmationCode ?? 'pending'}`,
    });

    return NextResponse.json({
      success: true,
      booking: {
        bookingId: booking.bookingId,
        status: booking.status,
        confirmationCode: booking.hotelConfirmationCode,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Booking failed';
    console.error('[hotels/book]', message);
    try {
      const cur = await kv.get<PendingBooking>(`pending-booking:${ref}`);
      if (cur && cur.state !== 'confirmed') {
        await kv.set(`pending-booking:${ref}`, { ...cur, state: 'failed', error: message }, { ex: 24 * 60 * 60 });
      }
    } catch { /* KV update failure is ok */ }

    // Mirror the failure so admin can see failed bookings too (useful for triage).
    await mirrorToUnified(record as PendingBooking & { guest: PendingGuest }, {
      status: 'failed',
      supplierRef: null,
      notes: `LiteAPI book failed: ${message}`,
    });

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/* ──────────────────────────────────────────────────────────────────── */
/*  DOTW booking flow                                                   */
/*  getrooms(block:true) → price-drift check → confirmbooking.          */
/*  All inside the 3-minute rate lock window.                           */
/* ──────────────────────────────────────────────────────────────────── */

async function bookDotw(
  ref: string,
  record: PendingBooking & { guest: PendingGuest },
): Promise<NextResponse> {
  const fail = async (reason: string, httpStatus = 500) => {
    try {
      const cur = await kv.get<PendingBooking>(`pending-booking:${ref}`);
      if (cur && cur.state !== 'confirmed') {
        await kv.set(`pending-booking:${ref}`, { ...cur, state: 'failed', error: reason }, { ex: 24 * 60 * 60 });
      }
    } catch { /* noop */ }
    // Auto-refund the Stripe charge we captured at checkout.
    await refundPaymentIntent(record.stripePaymentIntentId, reason);
    // Mirror the failure + auto-refund into the unified store so admin sees it.
    await mirrorToUnified(record, {
      status: 'refunded',
      supplierRef: null,
      notes: `DOTW book failed and auto-refunded: ${reason}`,
      paymentStatus: 'refunded',
    });
    return NextResponse.json({ success: false, error: reason }, { status: httpStatus });
  };

  try {
    // DOTW `offerId` format is `dotw:{hotelId}`
    const hotelId = (record.offerId || '').replace(/^dotw:/, '');
    if (!hotelId) return fail('Missing DOTW hotel id on booking', 400);

    // Build multi-room occupancy from the booking record — same split rule
    // search uses (adults spread across rooms, children all in first room).
    const safeAdults = Math.max(1, Math.min(10, record.adults || 2));
    const safeRooms = Math.max(1, Math.min(5, record.rooms || 1));
    const safeChildren = Math.max(0, Math.min(10, record.children || 0));
    const ages: number[] = Array.isArray(record.childAges)
      ? record.childAges.slice(0, safeChildren)
      : [];
    while (ages.length < safeChildren) ages.push(8);
    const adultsPerRoom: number[] = [];
    {
      let remaining = safeAdults;
      for (let i = 0; i < safeRooms; i++) {
        const a = i === safeRooms - 1 ? remaining : Math.max(1, Math.floor(safeAdults / safeRooms));
        adultsPerRoom.push(a);
        remaining -= a;
      }
    }
    const nationality = record.guest.nationality || 'GB';

    // Step 1: blocking getrooms — locks rate for 3 minutes, gives us the
    // freshest allocationDetails token that confirmbooking must receive.
    const getRoomsParams = {
      hotelId,
      fromDate: record.checkIn,
      toDate: record.checkOut,
      currency: record.currency || 'GBP',
      rooms: adultsPerRoom.map((adultsCode, idx) => ({
        adultsCode,
        childAges: idx === 0 ? ages : [],
        passengerNationality: nationality,
        passengerCountryOfResidence: nationality,
      })),
      block: true,
    };
    const getRoomsResp = await dotwGetRooms(getRoomsParams);
    const detail = dotwRoomsToDetail(getRoomsResp, getRoomsParams);
    if (!detail) return fail('DOTW getrooms(block) returned no rooms — rate no longer available');

    // Step 2: price-drift check against the £ we quoted at start-booking.
    const drift = detail.total - record.totalPrice;
    if (Math.abs(drift) > PRICE_DRIFT_TOLERANCE_GBP) {
      return fail(
        `Rate changed during checkout (quoted £${record.totalPrice.toFixed(2)}, supplier now £${detail.total.toFixed(2)}). Refunded.`,
        409,
      );
    }

    // Step 3: confirmbooking with the fresh allocationDetails token.
    const confirmResp = await dotwConfirmBooking({
      allocationDetails: detail.allocationDetails,
      customerReference: ref,
      leadGuest: {
        title: record.guest.title || 'Mr',
        firstName: record.guest.firstName,
        lastName: record.guest.lastName,
        email: record.guest.email,
        phone: record.guest.phone || '',
        nationality,
      },
    });
    const confirmed = dotwConfirmToBookingRef(confirmResp);
    if (!confirmed) return fail('DOTW did not return a confirmed booking reference');

    // Step 4: stamp as confirmed. Drop the allocationDetails — it's single-use.
    const updated: PendingBooking = {
      ...record,
      state: 'confirmed',
      dotwBookingRef: confirmed.bookingRef,
      dotwStatus: confirmed.status,
      dotwAllocationDetails: undefined,
    };
    await kv.set(`pending-booking:${ref}`, updated, { ex: 30 * 24 * 60 * 60 });

    // Mirror to admin-facing bookings store so /admin sees the booking.
    await mirrorToUnified(record, {
      status: 'confirmed',
      supplierRef: confirmed.bookingRef,
      notes: `DOTW confirmed (${confirmed.status})`,
    });

    return NextResponse.json({
      success: true,
      booking: {
        bookingId: confirmed.bookingRef,
        status: confirmed.status,
        confirmationCode: confirmed.bookingRef,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'DOTW booking failed';
    console.error('[hotels/book][dotw]', msg);
    return fail(msg);
  }
}
