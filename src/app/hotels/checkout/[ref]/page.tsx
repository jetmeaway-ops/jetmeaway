'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';

// Lazy-load StripeCardForm so @stripe/react-stripe-js (and js.stripe.com)
// is NEVER pulled in on LiteAPI checkouts. If loaded eagerly, Stripe's new
// "dahlia" bundle gets fetched, and LiteAPI's own SDK then blows up with
// `Unsupported on version [dahlia]: Can not provide apiVersion to Stripe()`
// because their wrapper still passes apiVersion to Stripe().
const StripeCardForm = dynamic(() => import('@/components/StripeCardForm'), {
  ssr: false,
});

interface PendingSummary {
  ref: string;
  hotelName: string;
  stars: number;
  totalPrice: number;
  currency: string;
  checkIn: string;
  checkOut: string;
  city: string;
  adults: number;
  /** Optional — set whenever the search included kids. The /api/hotels/pending/[ref]
   *  GET route now echoes these from the KV record so the checkout summary can
   *  surface them honestly (was showing only "N guests" — looked like a 2-adult
   *  booking even when kids were on file). */
  children?: number;
  childAges?: number[];
  rooms?: number;
  nights: number;
  thumbnail: string | null;
  localFees?: number;
  refundable?: boolean | null;
  cancellationDeadline?: string | null;
  /** Scout stay-schedule — surfaces what time the room opens / closes so the
   *  guest isn't surprised on arrival. Either may be absent when the
   *  supplier omits it. */
  checkInTime?: string | null;
  checkOutTime?: string | null;
  state: 'pending' | 'paid' | 'confirmed' | 'failed';
  /** Which wholesale supplier owns this offer. Drives the payment + book flow. */
  supplier?: 'liteapi' | 'dotw';
}

/**
 * Scout's Final Check — high-visibility badge that warns users whether the
 * rate they're about to pay for is refundable or locked-in. Reduces support
 * tickets from people surprised by non-refundable terms after booking.
 */
function ScoutFinalCheck({ refundable, deadline }: { refundable: boolean | null | undefined; deadline?: string | null }) {
  if (refundable === null || refundable === undefined) return null;
  const isRefundable = refundable === true;

  // Format deadline as a friendly date if provided
  let deadlineLabel: string | null = null;
  if (isRefundable && deadline) {
    const d = new Date(deadline);
    if (!isNaN(d.getTime())) {
      deadlineLabel = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    }
  }

  return (
    <div className={`p-4 rounded-xl border flex gap-3 mb-4 ${isRefundable ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
      <span className="text-xl leading-none mt-0.5" aria-hidden="true">{isRefundable ? '✅' : '⚠️'}</span>
      <div className="flex-1">
        <p className={`font-poppins font-black text-[.85rem] ${isRefundable ? 'text-green-800' : 'text-amber-900'}`}>
          {isRefundable ? 'Scout Approved · Refundable booking' : 'Scout Warning · Non-refundable rate'}
        </p>
        <p className={`text-[.72rem] font-semibold leading-snug mt-0.5 ${isRefundable ? 'text-green-700' : 'text-amber-800'}`}>
          {isRefundable
            ? deadlineLabel
              ? `Flexibility included. Cancel free until ${deadlineLabel}.`
              : 'Flexibility included. Cancel before the deadline shown in your confirmation email.'
            : 'Best price, but locked in — no refunds or changes after booking. Make sure your travel insurance is active before paying.'}
        </p>
      </div>
    </div>
  );
}

function StarRow({ count }: { count: number }) {
  if (!count || count < 1) return null;
  return (
    <div className="flex items-center gap-0.5 mb-1" role="img" aria-label={`${count} star hotel`}>
      {Array.from({ length: Math.min(5, Math.round(count)) }).map((_, i) => (
        <i key={i} className="fa-solid fa-star text-amber-400 text-[.7rem]" />
      ))}
    </div>
  );
}

type Step = 'locking' | 'price-warning' | 'guest' | 'saving' | 'payment' | 'done' | 'error';

export default function HotelCheckoutPage() {
  const params = useParams<{ ref: string }>();
  const ref = params?.ref || '';

  const [booking, setBooking] = useState<PendingSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [title, setTitle] = useState('Mr');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [nationality, setNationality] = useState('GB');
  /* Scout Special Requests — free-text note for the hotel (early arrival,
     extra pillows, quiet room). Trimmed + capped at 500 chars on send. */
  const [specialRequests, setSpecialRequests] = useState('');

  const [step, setStep] = useState<Step>('locking');
  const [stepError, setStepError] = useState<string | null>(null);

  // Prebook fires on page load — stored for later payment init
  const [prebookResult, setPrebookResult] = useState<{
    prebookId: string;
    transactionId: string;
    secretKey: string;
    price: number | null;
  } | null>(null);
  const [prebookWarnings, setPrebookWarnings] = useState<string[]>([]);
  const [priceChangeAccepted, setPriceChangeAccepted] = useState(false);
  const prebookFiredRef = useRef(false);

  // Safe-checkout acknowledgement (non-refundable bookings only)
  const [fareAcknowledged, setFareAcknowledged] = useState(false);

  const paymentContainerRef = useRef<HTMLDivElement>(null);
  const sdkLoadedRef = useRef(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paymentInstanceRef = useRef<any>(null);
  const [payingNow, setPayingNow] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // DOTW/Stripe path — Stripe PaymentIntent client secret for merchant-of-record checkout.
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const router = useRouter();
  const isDotw = booking?.supplier === 'dotw';

  // Load booking summary
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/hotels/pending/${encodeURIComponent(ref)}`, { cache: 'no-store' });
        const data = await res.json();
        if (cancelled) return;
        if (!data.success) setLoadError(data.error || 'Could not load booking');
        else setBooking(data.booking);
      } catch (e: unknown) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Network error');
      }
    })();
    return () => { cancelled = true; };
  }, [ref]);

  // Fire prebook as soon as booking loads — locks the rate before guest fills form.
  // DOTW skips this step: it has no prebook endpoint. Instead we do getrooms(block)
  // server-side at the moment of payment, and wrap the whole thing inside the 3-min lock.
  useEffect(() => {
    if (!booking || prebookFiredRef.current) return;
    prebookFiredRef.current = true;

    if (booking.supplier === 'dotw') {
      // DOTW path: jump straight to guest form. Rate lock happens server-side
      // during the book call (getrooms(block) → confirmbooking) after Stripe pays.
      setStep('guest');
      return;
    }

    (async () => {
      try {
        const res = await fetch('/api/hotels/prebook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ref }),
        });
        const data = await res.json();
        if (!data.success) {
          // Server returns `message` (human-readable) when price drift
          // is rejected (>5% or >£5). Fall back to `error` (machine code)
          // for everything else.
          throw new Error(data.message || data.error || 'Prebook failed');
        }

        setPrebookResult({
          prebookId: data.prebookId,
          transactionId: data.transactionId,
          secretKey: data.secretKey,
          price: data.price ?? null,
        });

        const warnings: string[] = [];
        if (data.priceDifferencePercent && data.priceDifferencePercent !== 0) {
          warnings.push(`Price has changed by ${data.priceDifferencePercent}% since your search`);
        }
        if (data.cancellationChanged) warnings.push('Cancellation policy has changed since your search');
        if (data.boardChanged) warnings.push('Board/meal plan has changed since your search');
        setPrebookWarnings(warnings);

        // Show price-change warning if price differs, otherwise go to guest form
        if (data.price != null && data.price !== booking.totalPrice) {
          setStep('price-warning');
        } else if (data.price == null) {
          // Prebook returned no price — rate may not be locked, warn user
          setStepError('Could not verify the rate. The price may change at payment.');
          setStep('guest');
        } else {
          setStep('guest');
        }
      } catch (e: unknown) {
        setStepError(e instanceof Error ? e.message : 'Could not lock rate');
        setStep('error');
      }
    })();
  }, [booking, ref]);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  // Phone: at least 7 digits after stripping spaces / dashes / parens / leading +.
  // The previous "≥ 6 chars" rule let blatantly invalid numbers through, which
  // then failed silently at LiteAPI/DOTW after the user had already submitted.
  const phoneDigits = phone.replace(/[\s\-().+]/g, '');
  const phoneOk = /^\d{7,15}$/.test(phoneDigits);
  const formOk =
    firstName.trim().length >= 2 &&
    lastName.trim().length >= 2 &&
    emailOk &&
    phoneOk;

  const fmtPrice = (amount: number) =>
    booking?.currency === 'GBP' ? `£${amount.toFixed(2)}` : `${booking?.currency} ${amount.toFixed(2)}`;

  // Initialize LiteAPI Payment SDK once we have the secretKey
  const initPaymentSdk = useCallback((secretKey: string, pbId: string, txId: string) => {
    if (sdkLoadedRef.current) return;
    sdkLoadedRef.current = true;

    const script = document.createElement('script');
    script.src = 'https://payment-wrapper.liteapi.travel/dist/liteAPIPayment.js?v=a1';
    script.async = true;

    // 30s timeout — if LiteAPI CDN is slow, don't leave user on spinner forever
    const timeout = setTimeout(() => {
      if (!paymentInstanceRef.current) {
        setStepError('Payment form took too long to load. Please refresh and try again.');
        setStep('error');
      }
    }, 30_000);

    script.onload = () => {
      clearTimeout(timeout);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const LiteAPIPayment = (window as any).LiteAPIPayment;
      if (!LiteAPIPayment) {
        setStepError('Failed to load payment form. Please refresh and try again.');
        setStep('error');
        return;
      }

      const returnUrl = `${window.location.origin}/success?ref=${encodeURIComponent(ref)}&prebookId=${encodeURIComponent(pbId)}&transactionId=${encodeURIComponent(txId)}`;

      try {
        const payment = new LiteAPIPayment({
          publicKey: 'live',
          secretKey,
          targetElement: '#liteapi-payment-form',
          returnUrl,
          appearance: { theme: 'flat' },
          options: { business: { name: 'JetMeAway' } },
        });
        // Store ref BEFORE handlePayment so it's available if SDK triggers events immediately
        paymentInstanceRef.current = payment;
        payment.handlePayment();
        setStep('payment');
      } catch (err) {
        console.error('[LiteAPIPayment] init failed:', err);
        setStepError('Failed to initialize payment form. Please refresh and try again.');
        setStep('error');
      }
    };
    script.onerror = () => {
      clearTimeout(timeout);
      setStepError('Failed to load payment form. Please refresh and try again.');
      setStep('error');
    };
    document.head.appendChild(script);
  }, [ref]);

  const handlePayNow = async () => {
    const pi = paymentInstanceRef.current;
    if (!pi) {
      setPaymentError('Payment form is not ready. Please refresh the page.');
      return;
    }
    setPayingNow(true);
    setPaymentError(null);
    try {
      // LiteAPI Payment SDK exposes submit / confirmPayment
      if (typeof pi.submit === 'function') {
        await pi.submit();
      } else if (typeof pi.confirmPayment === 'function') {
        await pi.confirmPayment();
      } else {
        // Fallback: click the SDK's own submit button if it exists but is hidden
        const btn = document.querySelector('#liteapi-payment-form button[type="submit"], #liteapi-payment-form form button, #liteapi-payment-form [data-testid="submit"]') as HTMLButtonElement | null;
        if (btn) btn.click();
        else {
          // Last resort: submit the form element inside the SDK container
          const form = document.querySelector('#liteapi-payment-form form') as HTMLFormElement | null;
          if (form) form.requestSubmit();
        }
      }
    } catch (e: unknown) {
      setPaymentError(e instanceof Error ? e.message : 'Payment failed. Please try again.');
      setPayingNow(false);
    }
  };

  // Saves guest details + inits payment. Two paths:
  //   LiteAPI: inits the LiteAPI Payment SDK (prebook already done on load)
  //   DOTW: creates a Stripe PaymentIntent and renders <StripeCardForm>
  const handleContinueToPayment = async () => {
    if (!booking || !formOk) return;
    // Used to silently return here if the prebook hadn't landed yet — leaving
    // the user clicking a non-responsive button. Now we surface it so they
    // can refresh or wait for the rate-lock to finish instead of bouncing.
    if (!isDotw && !prebookResult) {
      setStepError("Hold on — we're still locking your rate. Try again in a few seconds, or refresh if this keeps happening.");
      return;
    }
    setStep('saving');
    setStepError(null);

    try {
      const saveRes = await fetch(`/api/hotels/pending/${encodeURIComponent(ref)}/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          nationality,
          specialRequests: specialRequests.trim().slice(0, 500),
        }),
      });
      const saveData = await saveRes.json();
      if (!saveData.success) throw new Error(saveData.error || 'Could not save guest details');

      if (isDotw) {
        // Create a Stripe PaymentIntent for the full stay total (pence).
        const total = (booking.totalPrice || 0) * 100;
        const piRes = await fetch('/api/stripe/payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: Math.round(total),
            currency: (booking.currency || 'gbp').toLowerCase(),
            offerId: `dotw:${ref}`,
            sessionId: ref,
            // Tag the PI as a hotel booking so Stripe metadata + the
            // customer's card-statement description are accurate (was
            // defaulting to "JetMeAway flight booking" otherwise).
            source: 'jetmeaway_hotels',
            description: `JetMeAway hotel booking — ${booking.hotelName || 'stay'} (${ref})`,
          }),
        });
        const piData = await piRes.json();
        if (!piData.clientSecret) throw new Error(piData.error || 'Could not create Stripe PaymentIntent');
        setStripeClientSecret(piData.clientSecret);
        setStep('payment');
        return;
      }

      initPaymentSdk(prebookResult!.secretKey, prebookResult!.prebookId, prebookResult!.transactionId);
    } catch (e: unknown) {
      setStepError(e instanceof Error ? e.message : 'Unexpected error');
      setStep('guest');
    }
  };

  /** Called after Stripe succeeds on a DOTW booking — fires the server-side
   *  block+confirm, then navigates to /success. */
  const handleDotwStripeSuccess = async () => {
    setPayingNow(true);
    try {
      const res = await fetch('/api/hotels/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Booking failed');
      router.push(`/success?ref=${encodeURIComponent(ref)}`);
    } catch (e: unknown) {
      setPaymentError(e instanceof Error ? e.message : 'Could not finalise booking');
      setPayingNow(false);
    }
  };

  if (loadError) {
    return (
      <main className="max-w-[720px] mx-auto px-5 py-16">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <p className="font-poppins font-bold text-red-700">{loadError}</p>
          <a href="/hotels" className="inline-block mt-4 text-sm font-bold text-[#0066FF] underline">← Back to hotels</a>
        </div>
      </main>
    );
  }

  if (!booking) {
    return (
      <main className="max-w-[720px] mx-auto px-5 py-16 text-center">
        <div className="inline-block w-8 h-8 border-4 border-[#E8ECF4] border-t-[#0066FF] rounded-full animate-spin" />
        <p className="mt-4 text-sm font-semibold text-[#5C6378]">Loading your booking…</p>
      </main>
    );
  }

  return (
    <main className="max-w-[860px] mx-auto px-4 sm:px-5 py-6 sm:py-10">
      <a href={`/hotels?destination=${encodeURIComponent(booking.city)}&checkin=${booking.checkIn}&checkout=${booking.checkOut}&adults=${booking.adults}`} className="text-[.78rem] font-bold text-[#0066FF] hover:underline">← Back to search</a>
      <h1 className="font-poppins font-black text-[1.4rem] sm:text-[1.8rem] text-[#1A1D2B] mt-3 mb-1">Confirm your booking</h1>
      <p className="text-[.82rem] text-[#5C6378] font-semibold mb-4">Ref: <span className="font-mono">{booking.ref}</span></p>

      {/* Checkout progress — gives the user the finish line so they don't
          abandon mid-flow. Maps internal steps:
            locking / price-warning / guest / saving → "Details"
            payment                                  → "Secure Payment"
            confirmed (state === 'confirmed')        → "Done" */}
      {(() => {
        const done = booking.state === 'confirmed' || booking.state === 'paid';
        const onPayment = step === 'payment' || done;
        const stages: Array<{ label: string; active: boolean; complete: boolean }> = [
          { label: 'Details', active: !onPayment, complete: onPayment },
          { label: 'Secure Payment', active: step === 'payment' && !done, complete: done },
          { label: 'Done', active: done, complete: done },
        ];
        return (
          <ol className="flex items-center gap-2 mb-5 sm:mb-6" aria-label="Checkout progress">
            {stages.map((s, i) => (
              <li key={s.label} className="flex items-center gap-2 flex-1 last:flex-none">
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[.7rem] sm:text-[.75rem] font-bold whitespace-nowrap ${
                    s.complete
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : s.active
                      ? 'bg-[#0066FF] text-white border-[#0066FF]'
                      : 'bg-white text-[#8E95A9] border-[#E8ECF4]'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full text-[.6rem] flex items-center justify-center font-black ${
                    s.complete ? 'bg-emerald-600 text-white' : s.active ? 'bg-white text-[#0066FF]' : 'bg-[#E8ECF4] text-[#8E95A9]'
                  }`}>
                    {s.complete ? <i className="fa-solid fa-check text-[.55rem]" aria-hidden /> : i + 1}
                  </span>
                  {s.label}
                </div>
                {i < stages.length - 1 && (
                  <div className={`flex-1 h-[2px] rounded-full ${s.complete ? 'bg-emerald-300' : 'bg-[#E8ECF4]'}`} />
                )}
              </li>
            ))}
          </ol>
        );
      })()}

      <div className="grid md:grid-cols-[1fr_320px] gap-5 sm:gap-6">
        <div className="bg-white border border-[#E8ECF4] rounded-2xl p-4 sm:p-6">
          {/* Scout's Final Check — refundable / non-refundable banner */}
          <ScoutFinalCheck refundable={booking.refundable} deadline={booking.cancellationDeadline} />

          {/* Step: Locking rate on page load */}
          {step === 'locking' && (
            <div className="text-center py-10">
              <div className="inline-block w-8 h-8 border-4 border-[#E8ECF4] border-t-[#0066FF] rounded-full animate-spin" />
              <p className="mt-4 text-sm font-semibold text-[#5C6378]">Scout is verifying your rate with the hotel…</p>
              <p className="mt-1 text-[.75rem] text-[#8E95A9]">This can take up to 30 seconds</p>
            </div>
          )}

          {/* Step: Price changed warning */}
          {step === 'price-warning' && prebookResult?.price && (
            <div className="py-4">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 sm:p-6 text-center mb-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
                  <i className="fa-solid fa-triangle-exclamation text-amber-600 text-xl" />
                </div>
                <h2 className="font-poppins font-black text-[1.1rem] text-[#1A1D2B] mb-2">Price has changed</h2>
                <p className="text-[.82rem] text-[#5C6378] font-semibold mb-4">
                  The hotel has updated their rate since your search.
                </p>
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="text-center">
                    <p className="text-[.68rem] font-bold text-[#8E95A9] uppercase tracking-wide mb-0.5">Search price</p>
                    <p className="font-poppins font-black text-[1.15rem] text-[#8E95A9] line-through">
                      {fmtPrice(booking.totalPrice)}
                    </p>
                  </div>
                  <i className="fa-solid fa-arrow-right text-[#8E95A9] text-sm" />
                  <div className="text-center">
                    <p className="text-[.68rem] font-bold text-[#1A1D2B] uppercase tracking-wide mb-0.5">Confirmed price</p>
                    <p className={`font-poppins font-black text-[1.3rem] ${prebookResult.price > booking.totalPrice ? 'text-red-600' : 'text-green-600'}`}>
                      {fmtPrice(prebookResult.price)}
                    </p>
                  </div>
                </div>
                {prebookWarnings.length > 0 && (
                  <div className="text-[.75rem] text-amber-800 font-semibold mb-4 space-y-0.5">
                    {prebookWarnings.map((w, i) => <p key={i}>{w}</p>)}
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      // Sync local booking state with confirmed price
                      setBooking(prev => prev ? { ...prev, totalPrice: prebookResult.price! } : prev);
                      setPriceChangeAccepted(true);
                      // Persist acceptance to KV so the book call knows user agreed
                      fetch(`/api/hotels/pending/${encodeURIComponent(ref)}/guest`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ priceChangeAccepted: true }),
                      }).catch(() => {/* best-effort */});
                      setStep('guest');
                    }}
                    className="bg-[#0066FF] hover:bg-[#0052CC] text-white font-poppins font-black text-[.88rem] px-6 py-3.5 rounded-xl transition-all shadow-[0_4px_20px_rgba(0,102,255,0.3)]"
                  >
                    Continue at {fmtPrice(prebookResult.price)}
                  </button>
                  <a href="/hotels"
                    className="text-[.82rem] font-bold text-[#5C6378] hover:text-[#0066FF] px-6 py-3.5 rounded-xl border border-[#E8ECF4] transition-all text-center"
                  >
                    Go back to search
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Step: Guest details form */}
          {step === 'guest' && (
            <>
              <h2 className="font-poppins font-black text-[1.05rem] sm:text-[1.1rem] text-[#1A1D2B] mb-1">Lead guest details</h2>
              {prebookResult?.price && prebookResult.price !== booking.totalPrice && (
                <p className="text-[.75rem] font-semibold text-amber-700 mb-3">
                  <i className="fa-solid fa-circle-info mr-1" />
                  Confirmed rate: {fmtPrice(prebookResult.price)}
                </p>
              )}
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 mb-4 flex items-start gap-2">
                <i className="fa-solid fa-passport text-amber-600 text-sm mt-0.5 flex-shrink-0" />
                <p className="text-[.75rem] sm:text-[.78rem] text-amber-800 font-semibold leading-snug">
                  Enter names exactly as they appear on your passport or ID.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block sm:col-span-2">
                  <span className="text-[.7rem] font-bold text-[#5C6378] uppercase tracking-wide">Title</span>
                  <select
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-36 mt-1 px-3 py-3 sm:py-2.5 rounded-lg border border-[#E8ECF4] bg-white text-[16px] sm:text-[.88rem] font-semibold text-[#1A1D2B] outline-none focus:border-[#0066FF]"
                  >
                    <option value="Mr">Mr</option>
                    <option value="Mrs">Mrs</option>
                    <option value="Ms">Ms</option>
                    <option value="Miss">Miss</option>
                    <option value="Mstr">Master</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-[.7rem] font-bold text-[#5C6378] uppercase tracking-wide">First name</span>
                  <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                    placeholder="As on passport"
                    className="w-full mt-1 px-3 py-3 sm:py-2.5 rounded-lg border border-[#E8ECF4] bg-white text-[16px] sm:text-[.88rem] font-semibold text-[#1A1D2B] outline-none focus:border-[#0066FF] placeholder:text-[#B0B8CC] placeholder:font-normal" />
                </label>
                <label className="block">
                  <span className="text-[.7rem] font-bold text-[#5C6378] uppercase tracking-wide">Last name</span>
                  <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                    placeholder="As on passport"
                    className="w-full mt-1 px-3 py-3 sm:py-2.5 rounded-lg border border-[#E8ECF4] bg-white text-[16px] sm:text-[.88rem] font-semibold text-[#1A1D2B] outline-none focus:border-[#0066FF] placeholder:text-[#B0B8CC] placeholder:font-normal" />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-[.7rem] font-bold text-[#5C6378] uppercase tracking-wide">Email</span>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full mt-1 px-3 py-3 sm:py-2.5 rounded-lg border border-[#E8ECF4] bg-white text-[16px] sm:text-[.88rem] font-semibold text-[#1A1D2B] outline-none focus:border-[#0066FF] placeholder:text-[#B0B8CC] placeholder:font-normal" />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-[.7rem] font-bold text-[#5C6378] uppercase tracking-wide">Phone</span>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="+44 7911 123456"
                    className="w-full mt-1 px-3 py-3 sm:py-2.5 rounded-lg border border-[#E8ECF4] bg-white text-[16px] sm:text-[.88rem] font-semibold text-[#1A1D2B] outline-none focus:border-[#0066FF] placeholder:text-[#B0B8CC] placeholder:font-normal" />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-[.7rem] font-bold text-[#5C6378] uppercase tracking-wide">Country code</span>
                  <input type="text" maxLength={2} value={nationality} onChange={e => setNationality(e.target.value.toUpperCase())}
                    placeholder="GB"
                    className="w-24 mt-1 px-3 py-3 sm:py-2.5 rounded-lg border border-[#E8ECF4] bg-white text-[16px] sm:text-[.88rem] font-semibold text-[#1A1D2B] outline-none focus:border-[#0066FF] uppercase placeholder:text-[#B0B8CC] placeholder:font-normal" />
                </label>
              </div>

              {/* Scout Special Requests — optional free-text note. We pass
                  this to LiteAPI as `remarks` on /rates/book; it's visible
                  to the hotel front desk but never a guarantee. Scout voice
                  makes that honest up front. */}
              <div className="mt-5 sm:mt-6 bg-[#FAF3E6]/60 ring-1 ring-[#E8D8A8]/60 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <i className="fa-solid fa-feather-pointed text-[#8a6d00] text-[.8rem]" />
                  <span className="font-poppins font-black text-[.85rem] text-[#0a1628]">
                    A note for the front desk
                  </span>
                  <span className="text-[.65rem] font-semibold text-slate-500 ml-1">(optional)</span>
                </div>
                <p className="text-[.72rem] font-medium text-slate-600 leading-snug mb-2.5">
                  Early arrival, extra pillows, quiet room, high floor — we&apos;ll pass it along. The hotel does its best but can&apos;t promise every request.
                </p>
                <textarea
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value.slice(0, 500))}
                  rows={4}
                  maxLength={500}
                  placeholder="e.g. arriving after midnight, need extra blanket, high floor if possible…"
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E8D8A8]/80 bg-white text-[16px] sm:text-[.85rem] font-medium text-[#1A1D2B] outline-none focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20 placeholder:text-[#B0B8CC] placeholder:font-normal resize-none"
                />
                <div className="text-right text-[.62rem] font-semibold text-slate-400 mt-1">
                  {specialRequests.length}/500
                </div>
              </div>

              {/* Reassurance band — sits directly above the primary CTA.
                  Three honest signals: card processed by our PSP, no
                  booking fees added, no surprise line items at the end.
                  Keeps the user confident at the highest-friction click. */}
              <div className="mt-5 sm:mt-6 flex items-center justify-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 sm:px-4 py-2.5 text-[.74rem] sm:text-[.78rem] font-semibold text-emerald-800 leading-snug">
                <span aria-hidden="true">🔒</span>
                <span className="text-center">Secure payment · No booking fees · No hidden charges</span>
              </div>
              <button
                type="button"
                onClick={handleContinueToPayment}
                disabled={!formOk}
                className="w-full mt-3 bg-[#0066FF] hover:bg-[#0052CC] disabled:opacity-60 disabled:cursor-not-allowed text-white font-poppins font-black text-[.92rem] sm:text-[.95rem] py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(0,102,255,0.3)] flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-credit-card text-[.85rem]" /> Continue to payment
              </button>
              {stepError && (
                <p className="text-[.72rem] font-bold text-red-600 mt-2 text-center">{stepError}</p>
              )}
              <p className="text-[.68rem] text-[#8E95A9] mt-3 font-semibold text-center">
                You&apos;ll pay securely on the next step. Your card is charged directly by our hotel partner.
              </p>
            </>
          )}

          {/* Step: Saving guest details */}
          {step === 'saving' && (
            <div className="text-center py-10">
              <div className="inline-block w-8 h-8 border-4 border-[#E8ECF4] border-t-[#0066FF] rounded-full animate-spin" />
              <p className="mt-4 text-sm font-semibold text-[#5C6378]">Saving your details…</p>
            </div>
          )}

          {/* Step: LiteAPI Payment SDK form */}
          {step === 'payment' && (
            <>
              <h2 className="font-poppins font-black text-[1.1rem] text-[#1A1D2B] mb-1">Secure payment</h2>
              <p className="text-[.78rem] text-[#5C6378] font-semibold mb-4">
                Enter your card details below. Payment is processed securely by our hotel booking partner.
              </p>
              {paymentError && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 flex items-start gap-2.5">
                  <i className="fa-solid fa-circle-xmark text-red-600 text-sm mt-0.5" />
                  <div>
                    <p className="text-[.78rem] text-red-700 font-bold">Payment failed</p>
                    <p className="text-[.72rem] text-red-600 font-semibold">{paymentError}</p>
                  </div>
                </div>
              )}
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 flex items-start gap-2.5">
                <i className="fa-solid fa-shield-halved text-green-600 text-sm mt-0.5" />
                <p className="text-[.78rem] text-green-800 font-semibold leading-snug">
                  Your card details are handled directly by our secure payment partner. JetMeAway never sees or stores your card number.
                </p>
              </div>
              {/* Safe Checkout — non-refundable acknowledgement (above payment form) */}
              {booking.refundable === false && (
                <label className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={fareAcknowledged}
                    onChange={e => setFareAcknowledged(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[#0066FF] shrink-0"
                  />
                  <span className="text-[.78rem] font-semibold text-amber-900 leading-snug">
                    I confirm that I have read the booking conditions and understand that this hotel booking is <strong>non-refundable</strong>.
                  </span>
                </label>
              )}

              <div className={booking.refundable === false && !fareAcknowledged ? 'opacity-50 pointer-events-none' : ''}>
                {isDotw ? (
                  // DOTW / merchant-of-record path: Stripe Elements card form.
                  // On success we call /api/hotels/book which does the 3-minute
                  // getrooms(block) → confirmbooking sequence server-side.
                  stripeClientSecret ? (
                    <StripeCardForm
                      clientSecret={stripeClientSecret}
                      amountLabel={fmtPrice(booking.totalPrice)}
                      onSucceeded={handleDotwStripeSuccess}
                      onError={(msg) => setPaymentError(msg)}
                      disabled={booking.refundable === false && !fareAcknowledged}
                    />
                  ) : (
                    <div className="py-6 text-center text-[.78rem] text-[#5C6378] font-semibold">
                      <span className="inline-block w-5 h-5 border-2 border-[#E8ECF4] border-t-[#0066FF] rounded-full animate-spin mr-2 align-middle" />
                      Preparing secure payment…
                    </div>
                  )
                ) : (
                  <>
                    <div id="liteapi-payment-form" ref={paymentContainerRef} className="min-h-[120px]" />
                    <button
                      type="button"
                      onClick={handlePayNow}
                      disabled={payingNow}
                      className="w-full mt-5 bg-[#0066FF] hover:bg-[#0052CC] disabled:opacity-60 disabled:cursor-not-allowed text-white font-poppins font-black text-[.95rem] py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(0,102,255,0.3)] flex items-center justify-center gap-2"
                    >
                      {payingNow ? (
                        <>
                          <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          Processing…
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-lock text-[.8rem]" />
                          Pay {prebookResult?.price ? fmtPrice(prebookResult.price) : booking ? fmtPrice(booking.totalPrice) : ''} now
                        </>
                      )}
                    </button>
                  </>
                )}
                <p className="text-[.65rem] text-[#8E95A9] font-semibold text-center mt-2">
                  By paying you agree to our <a href="/terms" className="underline">Terms of Service</a>
                </p>
              </div>
            </>
          )}

          {/* Error state — Scout Shield framing.
              When LiteAPI returns 5000 / 2001 / generic prebook failures it
              almost always means "ghost inventory": the rate was still in
              cache when the user clicked Reserve, but the hotel sold that
              specific room in the gap. This is the *right* behaviour — we
              refused to take payment for a room we couldn't lock. We frame
              it as the Scout Shield, not a failure. */}
          {step === 'error' && (() => {
            const raw = (stepError || '').toLowerCase();
            const isGhostInventory =
              raw.includes('prebook') ||
              raw.includes('5000') ||
              raw.includes('2001') ||
              raw.includes('unable to process') ||
              raw.includes('sold out') ||
              raw.includes('not available') ||
              raw.includes('no availability') ||
              raw.includes('rate') && raw.includes('expired');
            const backHref = `/hotels?destination=${encodeURIComponent(booking.city)}&checkin=${booking.checkIn}&checkout=${booking.checkOut}&adults=${booking.adults}`;

            if (isGhostInventory) {
              return (
                <div className="py-8 md:py-10">
                  {/* Shield badge */}
                  <div className="flex items-center justify-center mb-5">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full bg-[#FAF3E6] ring-1 ring-[#E8D8A8] flex items-center justify-center">
                        <i className="fa-solid fa-shield-halved text-[#8a6d00] text-xl" />
                      </div>
                    </div>
                  </div>

                  <p className="text-center text-[.62rem] font-black uppercase tracking-[2px] text-[#8a6d00] mb-2">
                    Scout Shield · Protection activated
                  </p>
                  <h2 className="text-center font-[var(--font-playfair)] font-black text-[1.5rem] md:text-[1.8rem] text-[#0a1628] leading-tight tracking-tight mb-3">
                    That room just sold —<br className="hidden md:block" /> we stopped the payment.
                  </h2>
                  <p className="text-center text-[.88rem] font-medium text-slate-600 leading-relaxed max-w-md mx-auto mb-5">
                    The hotel sold this exact rate in the seconds between you clicking <em>Reserve</em> and our live inventory check. Unlike sites that take your money first and email apologies later, Scout never charges for a room we can&apos;t lock.
                  </p>

                  {/* Scout tokens row — "what just happened" in 3 beats */}
                  <div className="max-w-md mx-auto bg-[#FAF3E6]/60 ring-1 ring-[#E8D8A8]/60 rounded-2xl p-4 mb-6">
                    <ul className="space-y-2 text-[.78rem] font-semibold text-[#0a1628]">
                      <li className="flex items-start gap-2">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" aria-hidden />
                        <span>No charge on your card — we didn&apos;t authorise payment.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" aria-hidden />
                        <span>Your details are safe — no booking was created.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" aria-hidden />
                        <span>Live rates for <strong>{booking.city || 'your dates'}</strong> are one click away.</span>
                      </li>
                    </ul>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                    <a
                      href={backHref}
                      className="inline-flex items-center gap-2 font-poppins font-bold text-[.85rem] bg-[#0a1628] text-white rounded-full px-6 py-3 hover:bg-[#0066FF] transition-colors shadow-[0_6px_18px_rgba(10,22,40,0.18)]"
                    >
                      See live rates in {booking.city || 'this city'} →
                    </a>
                    <a
                      href="/hotels"
                      className="inline-flex items-center gap-2 font-poppins font-bold text-[.8rem] text-[#0a1628] hover:text-[#0066FF] transition-colors"
                    >
                      Search somewhere else
                    </a>
                  </div>
                </div>
              );
            }

            // Unknown error — keep the red state but still Scout-voiced
            return (
              <div className="text-center py-10">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                  <i className="fa-solid fa-xmark text-red-600 text-xl" />
                </div>
                <p className="font-poppins font-bold text-red-700 mb-2">{stepError || 'Something went wrong'}</p>
                <p className="text-[.78rem] text-slate-500 mb-4 max-w-sm mx-auto">Your card wasn&apos;t charged. Let&apos;s try fresh rates.</p>
                <a href={backHref} className="text-sm font-bold text-[#0066FF] underline">
                  Back to search
                </a>
              </div>
            );
          })()}
        </div>

        {/* Booking summary sidebar — shows first on mobile */}
        <aside className="bg-[#F8FAFC] border border-[#E8ECF4] rounded-2xl p-4 sm:p-5 h-fit order-first md:order-last">
          {booking.thumbnail && (
            <img src={booking.thumbnail} alt={booking.hotelName}
              className="w-full h-36 object-cover rounded-xl mb-3" loading="lazy" />
          )}
          <StarRow count={booking.stars} />
          <h3 className="font-poppins font-black text-[1rem] text-[#1A1D2B] mb-1">{booking.hotelName}</h3>
          {booking.city && <p className="text-[.75rem] text-[#8E95A9] font-semibold mb-3">📍 {booking.city}</p>}
          <div className="text-[.78rem] text-[#5C6378] font-semibold space-y-1 mb-4">
            <div>Check-in: <strong className="text-[#1A1D2B]">{booking.checkIn}</strong></div>
            <div>Check-out: <strong className="text-[#1A1D2B]">{booking.checkOut}</strong></div>
            <div>
              {booking.nights} night{booking.nights !== 1 ? 's' : ''} ·{' '}
              {booking.adults} adult{booking.adults !== 1 ? 's' : ''}
              {(booking.children ?? 0) > 0 && (
                <>
                  {' · '}
                  {booking.children} child{booking.children !== 1 ? 'ren' : ''}
                  {Array.isArray(booking.childAges) && booking.childAges.length > 0 && (
                    <span className="text-[#8E95A9]"> (ages {booking.childAges.join(', ')})</span>
                  )}
                </>
              )}
              {(booking.rooms ?? 1) > 1 && (
                <> · {booking.rooms} room{booking.rooms !== 1 ? 's' : ''}</>
              )}
            </div>
          </div>

          {/* Stay schedule — surfaces arrival/departure times before payment
              so the guest isn't caught out on arrival. Stated, not scolded. */}
          {(booking.checkInTime || booking.checkOutTime) && (
            <div className="bg-[#FAF3E6]/60 ring-1 ring-[#E8D8A8]/60 rounded-xl p-3 mb-4">
              <div className="text-[.6rem] font-black uppercase tracking-[1.5px] text-[#8a6d00] mb-1.5">
                Your stay schedule
              </div>
              <div className="space-y-1 text-[.75rem]">
                {booking.checkInTime && (
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden />
                    <span className="font-semibold text-[#0a1628]">Room ready from <strong>{booking.checkInTime}</strong></span>
                  </div>
                )}
                {booking.checkOutTime && (
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full border border-slate-400 shrink-0" aria-hidden />
                    <span className="font-medium text-slate-600">Check-out by <strong className="text-[#0a1628]">{booking.checkOutTime}</strong></span>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* ── Price breakdown ── */}
          <div className="border-t border-[#E8ECF4] pt-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[.78rem] font-semibold text-[#5C6378]">Secure now</span>
              <span className="font-poppins font-bold text-[.9rem] text-[#1A1D2B]">
                {fmtPrice(prebookResult?.price ?? booking.totalPrice)}
              </span>
            </div>
            {booking.localFees != null && booking.localFees > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[.78rem] font-semibold text-[#5C6378]">Local fees <span className="text-[.68rem] text-[#8E95A9]">(pay at hotel)</span></span>
                <span className="font-poppins font-bold text-[.9rem] text-[#1A1D2B]">
                  {fmtPrice(booking.localFees)}
                </span>
              </div>
            )}
            {prebookResult?.price && prebookResult.price !== booking.totalPrice && (
              <div className="flex items-center justify-between text-[.72rem] text-amber-700 font-semibold">
                <span>Price updated from {fmtPrice(booking.totalPrice)}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-1.5 border-t border-[#E8ECF4]">
              <span className="text-[.82rem] font-bold text-[#1A1D2B]">Total</span>
              <span className="font-poppins font-black text-[1.3rem] text-[#1A1D2B]">
                {fmtPrice((prebookResult?.price ?? booking.totalPrice) + (booking.localFees || 0))}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
