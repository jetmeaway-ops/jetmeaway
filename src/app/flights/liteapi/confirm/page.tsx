import { kv } from '@vercel/kv';
import { redirect } from 'next/navigation';
import ConversionPixel from '@/components/ConversionPixel';
import { finalizeFlightBooking } from '@/lib/finalize-flight-booking';

/**
 * /flights/liteapi/confirm — LiteAPI Flights post-payment confirmation page.
 *
 * SEPARATE route from the hotels /success page (never touch /success).
 *
 * Arrives here from the LiteAPI Payment SDK returnUrl once the PaymentIntent
 * has captured:  ?ref=JMA-F-XXXXXXXX&prebookId=…&transactionId=…
 *
 * Flow:
 *   1. Parking gate — flag off → redirect to /flights (dark in production).
 *   2. Read ?ref,prebookId,transactionId.
 *   3. Call finalizeFlightBooking(...) DIRECTLY (shared lib — no internal HTTP
 *      hop, so a password-protected deployment can't 401 it). It is idempotent —
 *      a reload / back-nav re-runs it and returns the already-confirmed booking.
 *   4. Read the pending-flight:{ref} KV record for the itinerary + total paid.
 *   5. Render a green "Flight booked" card with the PNR + <ConversionPixel/>.
 *
 * Node runtime: finalizeFlightBooking does the LiteAPI /flights/bookings call
 * which can take 15–25s; give the whole flow 60s.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/* ── Shape of the pending-flight:{ref} KV record (see scratch/flights-build-spec.md §KV).
 *    Defined locally so this page doesn't couple to a route file another builder owns. ── */
interface FlightTrip {
  origin: string;
  destination: string;
  depDate: string;
  retDate?: string;
  adults: number;
  children: number;
  infants: number;
  cabin: string;
  currency: string;
  totalPrice: number;
  airline?: string;
  airlineName?: string;
  segments?: unknown[];
}

interface PendingFlight {
  ref: string;
  type: 'flight';
  supplier: 'liteapi';
  state: 'pending' | 'prebooked' | 'confirmed' | 'failed';
  offerId?: string;
  trip: FlightTrip;
  prebookId?: string;
  transactionId?: string;
  verifiedPrice?: number;
  verifiedCurrency?: string;
  bookingId?: string;
  bookingRef?: string;
  createdAt: number;
  updatedAt: number;
  error?: string;
}

function currencySymbol(cur?: string): string {
  const c = (cur || 'GBP').toUpperCase();
  return c === 'GBP' ? '£' : `${c} `;
}

function cabinLabel(c?: string): string {
  switch ((c || '').toUpperCase()) {
    case 'PREMIUM_ECONOMY':
      return 'Premium Economy';
    case 'BUSINESS':
      return 'Business';
    case 'FIRST':
      return 'First';
    case 'ECONOMY':
      return 'Economy';
    default:
      return c || 'Economy';
  }
}

function paxSummary(t: FlightTrip): string {
  const parts: string[] = [];
  if (t.adults > 0) parts.push(`${t.adults} adult${t.adults !== 1 ? 's' : ''}`);
  if (t.children > 0) parts.push(`${t.children} child${t.children !== 1 ? 'ren' : ''}`);
  if (t.infants > 0) parts.push(`${t.infants} infant${t.infants !== 1 ? 's' : ''}`);
  return parts.join(' · ') || '1 adult';
}

function fmtDate(d?: string): string {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

interface FinaliseResult {
  ok: boolean;
  error?: string;
  bookingRef?: string;
  record?: PendingFlight;
}

async function finaliseBooking(
  ref: string,
  prebookId: string,
  transactionId: string,
): Promise<FinaliseResult> {
  // Call the booking finaliser DIRECTLY — no server-to-server HTTP hop. A fetch
  // to our own /book route gets blocked (401 "Protected deployment") on a Vercel
  // password-protected deployment, and adds a needless failure point to a payment
  // flow even in production. finalizeFlightBooking is idempotent, so reloads /
  // back-navs are safe.
  let bookOk = false;
  let bookError: string | undefined;
  let bookingRefFromApi: string | undefined;

  try {
    const res = await finalizeFlightBooking(ref, prebookId, transactionId);
    if (res.ok) {
      bookOk = true;
      bookingRefFromApi = res.bookingRef ?? undefined;
    } else {
      // Always a string from finalizeFlightBooking, but coerce defensively so a
      // stray object can never crash this page's render.
      const rawErr: unknown = res.error;
      bookError =
        typeof rawErr === 'string' && rawErr
          ? rawErr
          : rawErr
            ? JSON.stringify(rawErr)
            : 'Booking could not be completed.';
    }
  } catch (err) {
    bookError = err instanceof Error ? err.message : 'Booking request failed';
  }

  const record = (await kv.get<PendingFlight>(`pending-flight:${ref}`)) || undefined;

  // Idempotent replay: the record is already confirmed (reload / back-nav).
  if (record?.state === 'confirmed' && (record.bookingRef || bookingRefFromApi)) {
    return { ok: true, bookingRef: record.bookingRef || bookingRefFromApi, record };
  }

  if (bookOk) {
    return { ok: true, bookingRef: bookingRefFromApi || record?.bookingRef, record };
  }

  return { ok: false, error: bookError, record };
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default async function FlightConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; prebookId?: string; transactionId?: string }>;
}) {
  // ── Parking gate: LiteAPI Flights stays dark until this env flag is set. ──
  const LITEAPI_FLIGHTS_ENABLED = process.env.LITEAPI_FLIGHTS_ENABLED === 'true';
  if (!LITEAPI_FLIGHTS_ENABLED) redirect('/flights');

  const sp = await searchParams;
  const ref = (sp.ref || '').trim();
  const prebookId = (sp.prebookId || '').trim();
  const transactionId = (sp.transactionId || '').trim();

  // ── Missing parameters — were they redirected here correctly? ──
  if (!ref || !prebookId || !transactionId) {
    return (
      <main className="max-w-[680px] mx-auto px-5 py-16">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
          <p className="font-poppins font-bold text-amber-800">
            Missing booking parameters. Were you redirected here correctly?
          </p>
          <a
            href="/flights"
            className="inline-block mt-4 text-sm font-bold text-[#0066FF] underline"
          >
            ← Back to flights
          </a>
        </div>
      </main>
    );
  }

  let result: FinaliseResult;
  try {
    result = await finaliseBooking(ref, prebookId, transactionId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return (
      <main className="max-w-[680px] mx-auto px-5 py-16">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <h1 className="font-poppins font-black text-[1.3rem] text-red-700 mb-2">
            We couldn&apos;t finalise your booking
          </h1>
          <p className="text-[.85rem] text-red-700 font-semibold">{message}</p>
          <p className="text-[.78rem] text-[#5C6378] mt-3">
            Please email{' '}
            <a className="underline" href="mailto:contact@jetmeaway.co.uk">
              contact@jetmeaway.co.uk
            </a>{' '}
            with your reference <span className="font-mono font-bold">{ref}</span>.
          </p>
        </div>
      </main>
    );
  }

  // ── FAILURE — payment was taken by LiteAPI; booking needs attention. ──
  if (!result.ok) {
    return (
      <main className="max-w-[680px] mx-auto px-5 py-16">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <h1 className="font-poppins font-black text-[1.3rem] text-amber-800 mb-2">
            Booking needs attention
          </h1>
          <p className="text-[.85rem] text-amber-800 font-semibold mb-2">{result.error}</p>
          <p className="text-[.78rem] text-[#5C6378]">
            Reference: <span className="font-mono font-bold">{ref}</span>
          </p>
          <p className="text-[.78rem] text-[#5C6378] mt-3">
            Your payment was processed by our flight partner. If the booking couldn&apos;t be
            confirmed, any charge will be automatically reversed. Please email{' '}
            <a className="underline" href="mailto:contact@jetmeaway.co.uk">
              contact@jetmeaway.co.uk
            </a>{' '}
            if you need help.
          </p>
          <div className="mt-5 flex gap-3">
            <a
              href="/flights"
              className="flex-1 text-center bg-orange-500 hover:bg-orange-600 text-white font-poppins font-black text-[.85rem] py-3 rounded-xl transition-all"
            >
              Search again
            </a>
            <a
              href="/"
              className="flex-1 text-center bg-white border border-[#E8ECF4] hover:border-[#0066FF] text-[#1A1D2B] font-poppins font-black text-[.85rem] py-3 rounded-xl transition-all"
            >
              Back to home
            </a>
          </div>
        </div>
      </main>
    );
  }

  // ── SUCCESS — green "Flight booked" card. ──
  const record = result.record;
  const trip = record?.trip;
  const bookingRef = result.bookingRef || record?.bookingRef || '—';
  const isRoundTrip = !!trip?.retDate;

  const paidCurrency = record?.verifiedCurrency || trip?.currency || 'GBP';
  const paidAmount =
    typeof record?.verifiedPrice === 'number' ? record.verifiedPrice : trip?.totalPrice ?? 0;

  return (
    <main className="max-w-[760px] mx-auto px-5 py-12">
      {/* Google Ads conversion — mounted only on the confirmed booking path,
          deduped per-ref so reloads don't re-fire. */}
      <ConversionPixel bookingRef={ref} valueGbp={Number(paidAmount) || 0} currency={paidCurrency} />

      <div className="bg-white border border-[#E8ECF4] rounded-2xl p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <i className="fa-solid fa-plane-departure text-green-600 text-xl" />
          </div>
          <div>
            <h1 className="font-poppins font-black text-[1.6rem] text-[#1A1D2B] leading-tight">
              Flight booked
            </h1>
            <p className="text-[.82rem] text-[#5C6378] font-semibold">
              Your seats are confirmed. Keep your airline reference handy for check-in.
            </p>
          </div>
        </div>

        {trip && (
          <div className="bg-[#F8FAFC] border border-[#E8ECF4] rounded-xl p-5 mt-4 space-y-2">
            {trip.airlineName || trip.airline ? (
              <div className="flex justify-between text-[.85rem]">
                <span className="text-[#5C6378] font-semibold">Airline</span>
                <strong className="text-[#1A1D2B] text-right">
                  {trip.airlineName || trip.airline}
                </strong>
              </div>
            ) : null}

            <div className="flex justify-between text-[.85rem]">
              <span className="text-[#5C6378] font-semibold">
                {isRoundTrip ? 'Outbound' : 'Flight'}
              </span>
              <strong className="text-[#1A1D2B] text-right">
                {trip.origin} → {trip.destination}
              </strong>
            </div>
            <div className="flex justify-between text-[.85rem]">
              <span className="text-[#5C6378] font-semibold">Departs</span>
              <strong className="text-[#1A1D2B]">{fmtDate(trip.depDate)}</strong>
            </div>

            {isRoundTrip && (
              <>
                <div className="flex justify-between text-[.85rem] pt-2 border-t border-[#E8ECF4]">
                  <span className="text-[#5C6378] font-semibold">Return</span>
                  <strong className="text-[#1A1D2B] text-right">
                    {trip.destination} → {trip.origin}
                  </strong>
                </div>
                <div className="flex justify-between text-[.85rem]">
                  <span className="text-[#5C6378] font-semibold">Returns</span>
                  <strong className="text-[#1A1D2B]">{fmtDate(trip.retDate)}</strong>
                </div>
              </>
            )}

            <div className="flex justify-between text-[.85rem] pt-2 border-t border-[#E8ECF4]">
              <span className="text-[#5C6378] font-semibold">Passengers</span>
              <strong className="text-[#1A1D2B] text-right">{paxSummary(trip)}</strong>
            </div>
            <div className="flex justify-between text-[.85rem]">
              <span className="text-[#5C6378] font-semibold">Cabin</span>
              <strong className="text-[#1A1D2B]">{cabinLabel(trip.cabin)}</strong>
            </div>

            <div className="flex justify-between text-[.85rem] pt-2 border-t border-[#E8ECF4]">
              <span className="text-[#5C6378] font-semibold">Total paid</span>
              <strong className="text-[#1A1D2B]">
                {currencySymbol(paidCurrency)}
                {Number(paidAmount).toFixed(2)}
              </strong>
            </div>
          </div>
        )}

        <div className="mt-5 grid sm:grid-cols-2 gap-3">
          <div className="bg-white border border-[#E8ECF4] rounded-xl p-4">
            <div className="text-[.68rem] uppercase tracking-wider font-bold text-[#8E95A9]">
              JetMeAway reference
            </div>
            <div className="font-mono font-bold text-[.95rem] text-[#1A1D2B] mt-1">{ref}</div>
          </div>
          <div className="bg-white border border-[#E8ECF4] rounded-xl p-4">
            <div className="text-[.68rem] uppercase tracking-wider font-bold text-[#8E95A9]">
              Airline reference (PNR)
            </div>
            <div className="font-mono font-bold text-[.95rem] text-[#1A1D2B] mt-1">
              {bookingRef}
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <a
            href="/flights"
            className="flex-1 text-center bg-[#0066FF] hover:bg-[#0052CC] text-white font-poppins font-black text-[.85rem] py-3 rounded-xl transition-all"
          >
            Search more flights
          </a>
          <a
            href="/"
            className="flex-1 text-center bg-white border border-[#E8ECF4] hover:border-[#0066FF] text-[#1A1D2B] font-poppins font-black text-[.85rem] py-3 rounded-xl transition-all"
          >
            Back to home
          </a>
        </div>
      </div>
    </main>
  );
}
