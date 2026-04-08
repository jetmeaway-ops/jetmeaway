import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { bookWithTransactionId } from '@/lib/liteapi';
import type { PendingBooking } from '../start-booking/route';
import type { PendingGuest } from '../pending/[ref]/guest/route';

// Node runtime — LiteAPI book can take 15-25s, Edge times out too early
export const maxDuration = 60;

/**
 * POST /api/hotels/book
 *
 * Body: { ref: string, prebookId: string, transactionId: string }
 *
 * Called after the customer has paid via the LiteAPI Payment SDK.
 * Reads guest details from the KV pending-booking record and confirms
 * the booking with LiteAPI using the TRANSACTION_ID payment method.
 */
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const { ref, prebookId, transactionId } = body || {};

  if (!ref || typeof ref !== 'string') {
    return NextResponse.json({ success: false, error: 'ref is required' }, { status: 400 });
  }
  if (!prebookId || typeof prebookId !== 'string') {
    return NextResponse.json({ success: false, error: 'prebookId is required' }, { status: 400 });
  }
  if (!transactionId || typeof transactionId !== 'string') {
    return NextResponse.json({ success: false, error: 'transactionId is required' }, { status: 400 });
  }

  try {
    const record = await kv.get<PendingBooking & { guest?: PendingGuest }>(`pending-booking:${ref}`);
    if (!record) {
      return NextResponse.json({ success: false, error: 'Booking not found or expired' }, { status: 404 });
    }

    // Idempotency: if already confirmed, return success
    if (record.state === 'confirmed' && record.liteapiBookingId) {
      return NextResponse.json({
        success: true,
        booking: {
          bookingId: record.liteapiBookingId,
          status: record.liteapiStatus,
          confirmationCode: record.liteapiConfirmationCode,
        },
      });
    }

    // Prevent double-booking: if already being processed, reject
    if (record.state === 'booking') {
      return NextResponse.json({ success: false, error: 'Booking is already being processed' }, { status: 409 });
    }

    // Verify transactionId matches what was stored during prebook
    if (record.transactionId && record.transactionId !== transactionId) {
      return NextResponse.json({ success: false, error: 'Transaction ID mismatch' }, { status: 400 });
    }

    // Mark as 'booking' to prevent concurrent requests
    await kv.set(`pending-booking:${ref}`, { ...record, state: 'booking' }, { ex: 4 * 60 * 60 });

    if (!record.guest) {
      return NextResponse.json({ success: false, error: 'Guest details missing' }, { status: 400 });
    }

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
    });

    // Update KV record to confirmed
    const updated = {
      ...record,
      state: 'confirmed' as const,
      liteapiBookingId: booking.bookingId,
      liteapiStatus: booking.status,
      liteapiConfirmationCode: booking.hotelConfirmationCode ?? null,
    };
    await kv.set(`pending-booking:${ref}`, updated, { ex: 30 * 24 * 60 * 60 });

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

    // Update KV to failed state
    try {
      const record = await kv.get<PendingBooking>(`pending-booking:${ref}`);
      if (record && record.state !== 'confirmed') {
        await kv.set(`pending-booking:${ref}`, { ...record, state: 'failed', error: message }, { ex: 24 * 60 * 60 });
      }
    } catch { /* KV update failure is ok */ }

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
