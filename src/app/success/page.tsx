import { kv } from '@vercel/kv';
import Stripe from 'stripe';
import { completeBooking } from '@/lib/liteapi';
import type { PendingBooking } from '@/app/api/hotels/start-booking/route';
import type { PendingGuest } from '@/app/api/hotels/pending/[ref]/guest/route';

// LiteAPI prebook+book can take 15–25s in sandbox. Stripe retrieve + KV are
// quick. Give the whole flow 60s before Vercel pulls the plug.
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * /success?session_id=...
 *
 * Post-payment finalisation page. Runs on Node (default) because the Stripe
 * SDK is not Edge-compatible. Flow:
 *   1. Retrieve Stripe Checkout Session via session_id
 *   2. Read booking_reference from session metadata
 *   3. Look up the pending-booking KV record
 *   4. If still pending + we have guest details, call LiteAPI completeBooking()
 *      with Stripe PaymentIntent ID as clientReference
 *   5. Update KV to state='confirmed' so refreshes are idempotent
 *   6. Render the confirmation
 */

const STRIPE_API_VERSION = '2026-03-25.dahlia' as const;

function stripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key, { apiVersion: STRIPE_API_VERSION, typescript: true });
}

interface StoredBooking extends PendingBooking {
  guest?: PendingGuest;
}

async function finalise(sessionId: string): Promise<{
  ok: boolean;
  error?: string;
  booking?: StoredBooking;
  paidAmount?: number;
  paidCurrency?: string;
}> {
  const stripe = stripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent'],
  });

  if (session.payment_status !== 'paid') {
    return { ok: false, error: `Payment not completed (status: ${session.payment_status})` };
  }

  const ref = (session.metadata?.booking_reference || '').trim();
  if (!ref) {
    return { ok: false, error: 'Missing booking reference in session metadata' };
  }

  const record = await kv.get<StoredBooking>(`pending-booking:${ref}`);
  if (!record) {
    return { ok: false, error: 'Booking record not found or expired' };
  }

  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id;

  const paidAmount = (session.amount_total ?? 0) / 100;
  const paidCurrency = (session.currency || 'gbp').toUpperCase();

  // Idempotency: if already confirmed, just return it.
  if (record.state === 'confirmed' && record.liteapiBookingId) {
    return { ok: true, booking: record, paidAmount, paidCurrency };
  }

  if (!record.guest) {
    // Mark as paid so we have a trail, even though we can't complete without guest
    const updated: StoredBooking = {
      ...record,
      state: 'paid',
      stripeSessionId: session.id,
      stripePaymentIntentId: paymentIntentId || undefined,
    };
    await kv.set(`pending-booking:${ref}`, updated, { ex: 24 * 60 * 60 });
    return { ok: false, error: 'Guest details missing — please contact support with your booking reference.', booking: updated, paidAmount, paidCurrency };
  }

  // Call LiteAPI
  try {
    const booking = await completeBooking({
      offerId: record.offerId,
      guest: {
        firstName: record.guest.firstName,
        lastName: record.guest.lastName,
        email: record.guest.email,
        phone: record.guest.phone,
        nationality: record.guest.nationality,
      },
      stripePaymentIntentId: paymentIntentId,
    });

    const updated: StoredBooking = {
      ...record,
      state: 'confirmed',
      stripeSessionId: session.id,
      stripePaymentIntentId: paymentIntentId || undefined,
      liteapiBookingId: booking.bookingId,
      liteapiStatus: booking.status,
      liteapiConfirmationCode: booking.hotelConfirmationCode ?? null,
    };
    // Keep confirmed bookings in KV for 30 days
    await kv.set(`pending-booking:${ref}`, updated, { ex: 30 * 24 * 60 * 60 });
    return { ok: true, booking: updated, paidAmount, paidCurrency };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[/success] completeBooking failed', message);
    const updated: StoredBooking = {
      ...record,
      state: 'failed',
      stripeSessionId: session.id,
      stripePaymentIntentId: paymentIntentId || undefined,
      error: message,
    };
    await kv.set(`pending-booking:${ref}`, updated, { ex: 24 * 60 * 60 });
    return { ok: false, error: message, booking: updated, paidAmount, paidCurrency };
  }
}

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const sp = await searchParams;
  const sessionId = sp?.session_id || '';

  if (!sessionId) {
    return (
      <main className="max-w-[680px] mx-auto px-5 py-16">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
          <p className="font-[Poppins] font-bold text-amber-800">Missing session id. Were you redirected here from Stripe?</p>
          <a href="/hotels" className="inline-block mt-4 text-sm font-bold text-[#0066FF] underline">← Back to hotels</a>
        </div>
      </main>
    );
  }

  let result: Awaited<ReturnType<typeof finalise>>;
  try {
    result = await finalise(sessionId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return (
      <main className="max-w-[680px] mx-auto px-5 py-16">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <h1 className="font-[Poppins] font-black text-[1.3rem] text-red-700 mb-2">We couldn&apos;t finalise your booking</h1>
          <p className="text-[.85rem] text-red-700 font-semibold">{message}</p>
          <p className="text-[.78rem] text-[#5C6378] mt-3">Your card was charged — please email <a className="underline" href="mailto:waqar@jetmeaway.co.uk">waqar@jetmeaway.co.uk</a> with this session id: <span className="font-mono">{sessionId}</span></p>
        </div>
      </main>
    );
  }

  if (!result.ok) {
    return (
      <main className="max-w-[680px] mx-auto px-5 py-16">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <h1 className="font-[Poppins] font-black text-[1.3rem] text-amber-800 mb-2">Payment received — booking needs attention</h1>
          <p className="text-[.85rem] text-amber-800 font-semibold mb-2">{result.error}</p>
          {result.booking && (
            <p className="text-[.78rem] text-[#5C6378]">Reference: <span className="font-mono font-bold">{result.booking.ref}</span></p>
          )}
          <p className="text-[.78rem] text-[#5C6378] mt-3">
            Please email <a className="underline" href="mailto:waqar@jetmeaway.co.uk">waqar@jetmeaway.co.uk</a> and we&apos;ll sort this out within minutes.
          </p>
        </div>
      </main>
    );
  }

  const b = result.booking!;

  return (
    <main className="max-w-[760px] mx-auto px-5 py-12">
      <div className="bg-white border border-[#E8ECF4] rounded-2xl p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <i className="fa-solid fa-check text-green-600 text-xl" />
          </div>
          <div>
            <h1 className="font-[Poppins] font-black text-[1.6rem] text-[#1A1D2B] leading-tight">Booking confirmed</h1>
            <p className="text-[.82rem] text-[#5C6378] font-semibold">A confirmation email is on its way to <strong>{b.guest?.email}</strong>.</p>
          </div>
        </div>

        <div className="bg-[#F8FAFC] border border-[#E8ECF4] rounded-xl p-5 mt-4 space-y-2">
          <div className="flex justify-between text-[.85rem]">
            <span className="text-[#5C6378] font-semibold">Hotel</span>
            <strong className="text-[#1A1D2B]">{b.hotelName}</strong>
          </div>
          <div className="flex justify-between text-[.85rem]">
            <span className="text-[#5C6378] font-semibold">Check-in</span>
            <strong className="text-[#1A1D2B]">{b.checkIn}</strong>
          </div>
          <div className="flex justify-between text-[.85rem]">
            <span className="text-[#5C6378] font-semibold">Check-out</span>
            <strong className="text-[#1A1D2B]">{b.checkOut}</strong>
          </div>
          <div className="flex justify-between text-[.85rem]">
            <span className="text-[#5C6378] font-semibold">Guests</span>
            <strong className="text-[#1A1D2B]">{b.adults} · {b.nights} night{b.nights !== 1 ? 's' : ''}</strong>
          </div>
          <div className="flex justify-between text-[.85rem] pt-2 border-t border-[#E8ECF4]">
            <span className="text-[#5C6378] font-semibold">Total paid</span>
            <strong className="text-[#1A1D2B]">
              {result.paidCurrency === 'GBP' ? '£' : `${result.paidCurrency} `}
              {(result.paidAmount ?? b.totalPrice).toFixed(2)}
            </strong>
          </div>
        </div>

        <div className="mt-5 grid sm:grid-cols-2 gap-3">
          <div className="bg-white border border-[#E8ECF4] rounded-xl p-4">
            <div className="text-[.68rem] uppercase tracking-wider font-bold text-[#8E95A9]">JetMeAway reference</div>
            <div className="font-mono font-bold text-[.95rem] text-[#1A1D2B] mt-1">{b.ref}</div>
          </div>
          <div className="bg-white border border-[#E8ECF4] rounded-xl p-4">
            <div className="text-[.68rem] uppercase tracking-wider font-bold text-[#8E95A9]">Hotel confirmation</div>
            <div className="font-mono font-bold text-[.95rem] text-[#1A1D2B] mt-1">
              {b.liteapiConfirmationCode || b.liteapiBookingId || '—'}
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <a href="/hotels" className="flex-1 text-center bg-[#0066FF] hover:bg-[#0052CC] text-white font-[Poppins] font-black text-[.85rem] py-3 rounded-xl transition-all">
            Search more hotels
          </a>
          <a href="/" className="flex-1 text-center bg-white border border-[#E8ECF4] hover:border-[#0066FF] text-[#1A1D2B] font-[Poppins] font-black text-[.85rem] py-3 rounded-xl transition-all">
            Back to home
          </a>
        </div>
      </div>
    </main>
  );
}
