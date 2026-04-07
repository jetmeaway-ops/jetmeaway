import { kv } from '@vercel/kv';
import { bookWithTransactionId, completeBooking } from '@/lib/liteapi';
import type { PendingBooking } from '@/app/api/hotels/start-booking/route';
import type { PendingGuest } from '@/app/api/hotels/pending/[ref]/guest/route';

// LiteAPI prebook+book can take 15–25s. Give the whole flow 60s.
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * /success — Post-payment finalisation page.
 *
 * Two flows arrive here:
 *
 * 1. **Payment SDK** (new): ?ref=JMA-H-XXX&prebookId=...&transactionId=...
 *    Customer paid via LiteAPI's embedded payment form. We call /rates/book
 *    with TRANSACTION_ID method to confirm.
 *
 * 2. **Stripe** (legacy): ?session_id=...
 *    Old Stripe flow kept for backward compat with any in-flight bookings.
 */

interface StoredBooking extends PendingBooking {
  guest?: PendingGuest;
  prebookId?: string;
  transactionId?: string;
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAYMENT SDK FLOW
   ═══════════════════════════════════════════════════════════════════════════ */

async function finalisePaymentSdk(
  ref: string,
  prebookId: string,
  transactionId: string,
): Promise<{
  ok: boolean;
  error?: string;
  booking?: StoredBooking;
}> {
  const record = await kv.get<StoredBooking>(`pending-booking:${ref}`);
  if (!record) {
    return { ok: false, error: 'Booking record not found or expired' };
  }

  // Idempotency: already confirmed
  if (record.state === 'confirmed' && record.liteapiBookingId) {
    return { ok: true, booking: record };
  }

  if (!record.guest) {
    await kv.set(`pending-booking:${ref}`, { ...record, state: 'failed', error: 'Guest details missing' }, { ex: 24 * 60 * 60 });
    return { ok: false, error: 'Guest details were missing. Please contact waqar@jetmeaway.co.uk with your reference.', booking: record };
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
    });

    const updated: StoredBooking = {
      ...record,
      state: 'confirmed',
      liteapiBookingId: booking.bookingId,
      liteapiStatus: booking.status,
      liteapiConfirmationCode: booking.hotelConfirmationCode ?? null,
    };
    await kv.set(`pending-booking:${ref}`, updated, { ex: 30 * 24 * 60 * 60 });
    return { ok: true, booking: updated };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[/success] bookWithTransactionId failed', message);
    const updated: StoredBooking = { ...record, state: 'failed', error: message };
    await kv.set(`pending-booking:${ref}`, updated, { ex: 24 * 60 * 60 });
    return { ok: false, error: message, booking: updated };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   STRIPE LEGACY FLOW
   ═══════════════════════════════════════════════════════════════════════════ */

async function finaliseStripe(sessionId: string): Promise<{
  ok: boolean;
  error?: string;
  booking?: StoredBooking;
  paidAmount?: number;
  paidCurrency?: string;
  refunded?: boolean;
  refundStatus?: string;
}> {
  // Dynamic import — Stripe SDK is only needed for legacy flow
  const Stripe = (await import('stripe')).default;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return { ok: false, error: 'Stripe is not configured' };

  const stripe = new Stripe(key, { apiVersion: '2026-03-25.dahlia' as any, typescript: true });
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent'],
  });

  if (session.payment_status !== 'paid') {
    return { ok: false, error: `Payment not completed (status: ${session.payment_status})` };
  }

  const ref = (session.metadata?.booking_reference || '').trim();
  if (!ref) return { ok: false, error: 'Missing booking reference in session metadata' };

  const record = await kv.get<StoredBooking>(`pending-booking:${ref}`);
  if (!record) return { ok: false, error: 'Booking record not found or expired' };

  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id;
  const paidAmount = (session.amount_total ?? 0) / 100;
  const paidCurrency = (session.currency || 'gbp').toUpperCase();

  if (record.state === 'confirmed' && record.liteapiBookingId) {
    return { ok: true, booking: record, paidAmount, paidCurrency };
  }

  if (!record.guest) {
    const refund = paymentIntentId ? await safeRefund(stripe, paymentIntentId, 'Guest details missing') : null;
    const updated: StoredBooking = { ...record, state: 'failed', error: 'Guest details missing' };
    await kv.set(`pending-booking:${ref}`, updated, { ex: 24 * 60 * 60 });
    return { ok: false, error: 'Guest details were missing — card refunded.', booking: updated, paidAmount, paidCurrency, refunded: !!refund, refundStatus: refund?.status };
  }

  try {
    const booking = await completeBooking({
      offerId: record.offerId,
      guest: { firstName: record.guest.firstName, lastName: record.guest.lastName, email: record.guest.email, phone: record.guest.phone, nationality: record.guest.nationality },
      stripePaymentIntentId: paymentIntentId,
    });
    const updated: StoredBooking = { ...record, state: 'confirmed', liteapiBookingId: booking.bookingId, liteapiStatus: booking.status, liteapiConfirmationCode: booking.hotelConfirmationCode ?? null };
    await kv.set(`pending-booking:${ref}`, updated, { ex: 30 * 24 * 60 * 60 });
    return { ok: true, booking: updated, paidAmount, paidCurrency };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[/success] completeBooking failed', message);
    const refund = paymentIntentId ? await safeRefund(stripe, paymentIntentId, `LiteAPI book failed: ${message}`) : null;
    const updated: StoredBooking = { ...record, state: 'failed', error: message };
    await kv.set(`pending-booking:${ref}`, updated, { ex: 24 * 60 * 60 });
    return { ok: false, error: message, booking: updated, paidAmount, paidCurrency, refunded: !!refund, refundStatus: refund?.status };
  }
}

async function safeRefund(stripe: any, paymentIntentId: string, reason: string) {
  try {
    const refund = await stripe.refunds.create({ payment_intent: paymentIntentId, reason: 'requested_by_customer', metadata: { auto_refund_reason: reason.slice(0, 500) } });
    console.log(`[/success] auto-refund ${refund.id} (${refund.status}) for ${paymentIntentId}`);
    return { id: refund.id, status: refund.status || 'unknown' };
  } catch (err: unknown) {
    console.error('[/success] auto-refund failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; ref?: string; prebookId?: string; transactionId?: string }>;
}) {
  const sp = await searchParams;

  // Determine which flow
  const isPaymentSdk = !!(sp.ref && sp.prebookId && sp.transactionId);
  const isStripe = !!sp.session_id;

  if (!isPaymentSdk && !isStripe) {
    return (
      <main className="max-w-[680px] mx-auto px-5 py-16">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
          <p className="font-poppins font-bold text-amber-800">Missing booking parameters. Were you redirected here correctly?</p>
          <a href="/hotels" className="inline-block mt-4 text-sm font-bold text-[#0066FF] underline">← Back to hotels</a>
        </div>
      </main>
    );
  }

  let result: { ok: boolean; error?: string; booking?: StoredBooking; paidAmount?: number; paidCurrency?: string; refunded?: boolean; refundStatus?: string };

  try {
    if (isPaymentSdk) {
      result = await finalisePaymentSdk(sp.ref!, sp.prebookId!, sp.transactionId!);
    } else {
      result = await finaliseStripe(sp.session_id!);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return (
      <main className="max-w-[680px] mx-auto px-5 py-16">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <h1 className="font-poppins font-black text-[1.3rem] text-red-700 mb-2">We couldn&apos;t finalise your booking</h1>
          <p className="text-[.85rem] text-red-700 font-semibold">{message}</p>
          <p className="text-[.78rem] text-[#5C6378] mt-3">Please email <a className="underline" href="mailto:waqar@jetmeaway.co.uk">waqar@jetmeaway.co.uk</a> with your reference.</p>
        </div>
      </main>
    );
  }

  // ── FAILURE ──
  if (!result.ok) {
    // Stripe refunded
    if (result.refunded) {
      return (
        <main className="max-w-[680px] mx-auto px-5 py-16">
          <div className="bg-white border border-[#E8ECF4] rounded-2xl p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <i className="fa-solid fa-rotate-left text-green-600 text-xl" />
              </div>
              <div>
                <h1 className="font-poppins font-black text-[1.4rem] text-[#1A1D2B] leading-tight">Booking cancelled — card refunded</h1>
                <p className="text-[.82rem] text-[#5C6378] font-semibold">Your card has been automatically refunded in full.</p>
              </div>
            </div>
            <div className="bg-[#F8FAFC] border border-[#E8ECF4] rounded-xl p-4 text-[.8rem] text-[#5C6378] font-semibold">
              <div className="flex justify-between mb-1"><span>Refund amount</span><strong className="text-[#1A1D2B]">{result.paidCurrency === 'GBP' ? '£' : `${result.paidCurrency} `}{(result.paidAmount ?? 0).toFixed(2)}</strong></div>
              {result.booking?.ref && <div className="flex justify-between mb-1"><span>Reference</span><span className="font-mono font-bold text-[#1A1D2B]">{result.booking.ref}</span></div>}
              {result.refundStatus && <div className="flex justify-between"><span>Refund status</span><strong className="text-[#1A1D2B]">{result.refundStatus}</strong></div>}
            </div>
            <p className="text-[.78rem] text-[#5C6378] font-semibold mt-4">
              We couldn&apos;t secure the hotel at the price you paid, so we automatically cancelled the charge. Refunds typically appear within 5–10 business days.
            </p>
            <p className="text-[.72rem] text-[#8E95A9] font-semibold mt-2">Reason: {result.error}</p>
            <div className="mt-5 flex gap-3">
              <a href="/hotels" className="flex-1 text-center bg-orange-500 hover:bg-orange-600 text-white font-poppins font-black text-[.85rem] py-3 rounded-xl transition-all">Search again</a>
              <a href="/" className="flex-1 text-center bg-white border border-[#E8ECF4] hover:border-[#0066FF] text-[#1A1D2B] font-poppins font-black text-[.85rem] py-3 rounded-xl transition-all">Back to home</a>
            </div>
          </div>
        </main>
      );
    }

    // Payment SDK failure (no refund needed — LiteAPI handles it)
    return (
      <main className="max-w-[680px] mx-auto px-5 py-16">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <h1 className="font-poppins font-black text-[1.3rem] text-amber-800 mb-2">Booking needs attention</h1>
          <p className="text-[.85rem] text-amber-800 font-semibold mb-2">{result.error}</p>
          {result.booking && (
            <p className="text-[.78rem] text-[#5C6378]">Reference: <span className="font-mono font-bold">{result.booking.ref}</span></p>
          )}
          <p className="text-[.78rem] text-[#5C6378] mt-3">
            Your payment was processed by our hotel partner. If the booking couldn&apos;t be confirmed, any charge will be automatically reversed. Please email <a className="underline" href="mailto:waqar@jetmeaway.co.uk">waqar@jetmeaway.co.uk</a> if you need help.
          </p>
          <div className="mt-5 flex gap-3">
            <a href="/hotels" className="flex-1 text-center bg-orange-500 hover:bg-orange-600 text-white font-poppins font-black text-[.85rem] py-3 rounded-xl transition-all">Search again</a>
            <a href="/" className="flex-1 text-center bg-white border border-[#E8ECF4] hover:border-[#0066FF] text-[#1A1D2B] font-poppins font-black text-[.85rem] py-3 rounded-xl transition-all">Back to home</a>
          </div>
        </div>
      </main>
    );
  }

  // ── SUCCESS ──
  const b = result.booking!;

  return (
    <main className="max-w-[760px] mx-auto px-5 py-12">
      <div className="bg-white border border-[#E8ECF4] rounded-2xl p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <i className="fa-solid fa-check text-green-600 text-xl" />
          </div>
          <div>
            <h1 className="font-poppins font-black text-[1.6rem] text-[#1A1D2B] leading-tight">Booking confirmed</h1>
            <p className="text-[.82rem] text-[#5C6378] font-semibold">A confirmation email is on its way to <strong>{b.guest?.email}</strong>.</p>
          </div>
        </div>

        <div className="bg-[#F8FAFC] border border-[#E8ECF4] rounded-xl p-5 mt-4 space-y-2">
          <div className="flex justify-between text-[.85rem]">
            <span className="text-[#5C6378] font-semibold">Hotel</span>
            <strong className="text-[#1A1D2B] text-right">
              {b.hotelName}
              {b.stars && b.stars > 0 ? (
                <span className="block mt-0.5" aria-label={`${b.stars} star hotel`}>
                  {Array.from({ length: Math.min(5, Math.round(b.stars)) }).map((_, i) => (
                    <i key={i} className="fa-solid fa-star text-amber-400 text-[.7rem] ml-0.5" />
                  ))}
                </span>
              ) : null}
            </strong>
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
              {(b.currency || 'GBP') === 'GBP' ? '£' : `${b.currency} `}
              {b.totalPrice.toFixed(2)}
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
          <a href="/hotels" className="flex-1 text-center bg-[#0066FF] hover:bg-[#0052CC] text-white font-poppins font-black text-[.85rem] py-3 rounded-xl transition-all">
            Search more hotels
          </a>
          <a href="/" className="flex-1 text-center bg-white border border-[#E8ECF4] hover:border-[#0066FF] text-[#1A1D2B] font-poppins font-black text-[.85rem] py-3 rounded-xl transition-all">
            Back to home
          </a>
        </div>
      </div>
    </main>
  );
}
