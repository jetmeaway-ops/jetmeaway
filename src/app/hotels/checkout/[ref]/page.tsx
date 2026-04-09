'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';

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
  nights: number;
  thumbnail: string | null;
  state: 'pending' | 'paid' | 'confirmed' | 'failed';
}

function StarRow({ count }: { count: number }) {
  if (!count || count < 1) return null;
  return (
    <div className="flex items-center gap-0.5 mb-1" aria-label={`${count} star hotel`}>
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

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [nationality, setNationality] = useState('GB');

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

  const paymentContainerRef = useRef<HTMLDivElement>(null);
  const sdkLoadedRef = useRef(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paymentInstanceRef = useRef<any>(null);
  const [payingNow, setPayingNow] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

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

  // Fire prebook as soon as booking loads — locks the rate before guest fills form
  useEffect(() => {
    if (!booking || prebookFiredRef.current) return;
    prebookFiredRef.current = true;

    (async () => {
      try {
        const res = await fetch('/api/hotels/prebook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ref }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Prebook failed');

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
  const formOk =
    firstName.trim().length >= 1 &&
    lastName.trim().length >= 1 &&
    emailOk &&
    phone.trim().length >= 6;

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

  // Now only saves guest details + inits payment (prebook already done on load)
  const handleContinueToPayment = async () => {
    if (!booking || !formOk || !prebookResult) return;
    setStep('saving');
    setStepError(null);

    try {
      const saveRes = await fetch(`/api/hotels/pending/${encodeURIComponent(ref)}/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          nationality,
        }),
      });
      const saveData = await saveRes.json();
      if (!saveData.success) throw new Error(saveData.error || 'Could not save guest details');

      initPaymentSdk(prebookResult.secretKey, prebookResult.prebookId, prebookResult.transactionId);
    } catch (e: unknown) {
      setStepError(e instanceof Error ? e.message : 'Unexpected error');
      setStep('guest');
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
      <a href="/hotels" className="text-[.78rem] font-bold text-[#0066FF] hover:underline">← Back to search</a>
      <h1 className="font-poppins font-black text-[1.4rem] sm:text-[1.8rem] text-[#1A1D2B] mt-3 mb-1">Confirm your booking</h1>
      <p className="text-[.82rem] text-[#5C6378] font-semibold mb-5 sm:mb-6">Ref: <span className="font-mono">{booking.ref}</span></p>

      <div className="grid md:grid-cols-[1fr_320px] gap-5 sm:gap-6">
        <div className="bg-white border border-[#E8ECF4] rounded-2xl p-4 sm:p-6">
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

              <button
                type="button"
                onClick={handleContinueToPayment}
                disabled={!formOk}
                className="w-full mt-5 sm:mt-6 bg-[#0066FF] hover:bg-[#0052CC] disabled:opacity-60 disabled:cursor-not-allowed text-white font-poppins font-black text-[.92rem] sm:text-[.95rem] py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(0,102,255,0.3)] flex items-center justify-center gap-2"
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
              <p className="text-[.65rem] text-[#8E95A9] font-semibold text-center mt-2">
                By paying you agree to our <a href="/terms" className="underline">Terms of Service</a>
              </p>
            </>
          )}

          {/* Error state */}
          {step === 'error' && (
            <div className="text-center py-10">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                <i className="fa-solid fa-xmark text-red-600 text-xl" />
              </div>
              <p className="font-poppins font-bold text-red-700 mb-2">{stepError || 'Something went wrong'}</p>
              <a href="/hotels" className="text-sm font-bold text-[#0066FF] underline">
                Back to search
              </a>
            </div>
          )}
        </div>

        {/* Booking summary sidebar — shows first on mobile */}
        <aside className="bg-[#F8FAFC] border border-[#E8ECF4] rounded-2xl p-4 sm:p-5 h-fit order-first md:order-last">
          {booking.thumbnail && (
            <img src={booking.thumbnail} alt={booking.hotelName}
              className="w-full h-36 object-cover rounded-xl mb-3" />
          )}
          <StarRow count={booking.stars} />
          <h3 className="font-poppins font-black text-[1rem] text-[#1A1D2B] mb-1">{booking.hotelName}</h3>
          {booking.city && <p className="text-[.75rem] text-[#8E95A9] font-semibold mb-3">📍 {booking.city}</p>}
          <div className="text-[.78rem] text-[#5C6378] font-semibold space-y-1 mb-4">
            <div>Check-in: <strong className="text-[#1A1D2B]">{booking.checkIn}</strong></div>
            <div>Check-out: <strong className="text-[#1A1D2B]">{booking.checkOut}</strong></div>
            <div>{booking.nights} night{booking.nights !== 1 ? 's' : ''} · {booking.adults} guest{booking.adults !== 1 ? 's' : ''}</div>
          </div>
          <div className="border-t border-[#E8ECF4] pt-3 flex items-center justify-between">
            <span className="text-[.8rem] font-bold text-[#5C6378]">Total</span>
            <div className="text-right">
              {prebookResult?.price && prebookResult.price !== booking.totalPrice ? (
                <>
                  <span className="font-poppins font-bold text-[.85rem] text-[#8E95A9] line-through mr-1.5">
                    {fmtPrice(booking.totalPrice)}
                  </span>
                  <span className="font-poppins font-black text-[1.3rem] text-[#1A1D2B]">
                    {fmtPrice(prebookResult.price)}
                  </span>
                </>
              ) : (
                <span className="font-poppins font-black text-[1.3rem] text-[#1A1D2B]">
                  {fmtPrice(booking.totalPrice)}
                </span>
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
