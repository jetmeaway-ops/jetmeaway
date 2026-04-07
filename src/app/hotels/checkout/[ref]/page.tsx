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

type Step = 'guest' | 'prebook' | 'payment' | 'booking' | 'done' | 'error';

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

  const [step, setStep] = useState<Step>('guest');
  const [stepError, setStepError] = useState<string | null>(null);

  // Payment SDK state
  const [prebookId, setPrebookId] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [confirmedPrice, setConfirmedPrice] = useState<number | null>(null);
  const [prebookWarnings, setPrebookWarnings] = useState<string[]>([]);
  const paymentContainerRef = useRef<HTMLDivElement>(null);
  const sdkLoadedRef = useRef(false);

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

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const formOk =
    firstName.trim().length >= 1 &&
    lastName.trim().length >= 1 &&
    emailOk &&
    phone.trim().length >= 6;

  // Initialize LiteAPI Payment SDK once we have the secretKey
  const initPaymentSdk = useCallback((secretKey: string) => {
    if (sdkLoadedRef.current) return;
    sdkLoadedRef.current = true;

    const script = document.createElement('script');
    script.src = 'https://payment-wrapper.liteapi.travel/dist/liteAPIPayment.js?v=a1';
    script.async = true;
    script.onload = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const LiteAPIPayment = (window as any).LiteAPIPayment;
      if (!LiteAPIPayment) {
        setStepError('Failed to load payment form. Please refresh and try again.');
        setStep('error');
        return;
      }

      const returnUrl = `${window.location.origin}/success?ref=${encodeURIComponent(ref)}&prebookId=${encodeURIComponent(prebookId || '')}&transactionId=${encodeURIComponent(transactionId || '')}`;

      LiteAPIPayment.init(secretKey, '#liteapi-payment-form', {
        returnUrl,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#0066FF',
            fontFamily: 'Poppins, system-ui, sans-serif',
            borderRadius: '12px',
          },
        },
      });
      setStep('payment');
    };
    script.onerror = () => {
      setStepError('Failed to load payment form. Please refresh and try again.');
      setStep('error');
    };
    document.head.appendChild(script);
  }, [ref, prebookId, transactionId]);

  const handleContinueToPayment = async () => {
    if (!booking || !formOk) return;
    setStep('prebook');
    setStepError(null);

    try {
      // 1) Save guest details to KV
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

      // 2) Prebook with Payment SDK
      const prebookRes = await fetch('/api/hotels/prebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref }),
      });
      const prebookData = await prebookRes.json();
      if (!prebookData.success) throw new Error(prebookData.error || 'Prebook failed');

      setPrebookId(prebookData.prebookId);
      setTransactionId(prebookData.transactionId);
      if (prebookData.price) setConfirmedPrice(prebookData.price);

      // Check for rate changes since search
      const warnings: string[] = [];
      if (prebookData.priceDifferencePercent && prebookData.priceDifferencePercent !== 0) {
        warnings.push(`Price has changed by ${prebookData.priceDifferencePercent}% since your search`);
      }
      if (prebookData.cancellationChanged) {
        warnings.push('Cancellation policy has changed since your search');
      }
      if (prebookData.boardChanged) {
        warnings.push('Board/meal plan has changed since your search');
      }
      setPrebookWarnings(warnings);

      // 3) Load and init the LiteAPI Payment SDK
      initPaymentSdk(prebookData.secretKey);
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
    <main className="max-w-[860px] mx-auto px-5 py-10">
      <a href="/hotels" className="text-[.78rem] font-bold text-[#0066FF] hover:underline">← Back to search</a>
      <h1 className="font-poppins font-black text-[1.8rem] text-[#1A1D2B] mt-3 mb-1">Confirm your booking</h1>
      <p className="text-[.85rem] text-[#5C6378] font-semibold mb-6">Booking reference: <span className="font-mono">{booking.ref}</span></p>

      <div className="grid md:grid-cols-[1fr_320px] gap-6">
        <div className="bg-white border border-[#E8ECF4] rounded-2xl p-6">
          {/* Step 1: Guest details form */}
          {step === 'guest' && (
            <>
              <h2 className="font-poppins font-black text-[1.1rem] text-[#1A1D2B] mb-3">Lead guest details</h2>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 flex items-start gap-2.5">
                <i className="fa-solid fa-passport text-amber-600 text-sm mt-0.5" />
                <p className="text-[.78rem] text-amber-800 font-semibold leading-snug">
                  Enter all names exactly as they appear on your passport or ID to avoid boarding and check-in complications.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[.7rem] font-bold text-[#5C6378] uppercase tracking-wide">First name</span>
                  <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                    className="w-full mt-1 px-3 py-2.5 rounded-lg border border-[#E8ECF4] text-[.88rem] font-semibold outline-none focus:border-[#0066FF]" />
                </label>
                <label className="block">
                  <span className="text-[.7rem] font-bold text-[#5C6378] uppercase tracking-wide">Last name</span>
                  <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                    className="w-full mt-1 px-3 py-2.5 rounded-lg border border-[#E8ECF4] text-[.88rem] font-semibold outline-none focus:border-[#0066FF]" />
                </label>
                <label className="block col-span-2">
                  <span className="text-[.7rem] font-bold text-[#5C6378] uppercase tracking-wide">Email</span>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full mt-1 px-3 py-2.5 rounded-lg border border-[#E8ECF4] text-[.88rem] font-semibold outline-none focus:border-[#0066FF]" />
                </label>
                <label className="block col-span-2">
                  <span className="text-[.7rem] font-bold text-[#5C6378] uppercase tracking-wide">Phone</span>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="+44…"
                    className="w-full mt-1 px-3 py-2.5 rounded-lg border border-[#E8ECF4] text-[.88rem] font-semibold outline-none focus:border-[#0066FF]" />
                </label>
                <label className="block col-span-2">
                  <span className="text-[.7rem] font-bold text-[#5C6378] uppercase tracking-wide">Nationality (ISO-3166 alpha-2)</span>
                  <input type="text" maxLength={2} value={nationality} onChange={e => setNationality(e.target.value.toUpperCase())}
                    className="w-24 mt-1 px-3 py-2.5 rounded-lg border border-[#E8ECF4] text-[.88rem] font-semibold outline-none focus:border-[#0066FF] uppercase" />
                </label>
              </div>

              <button
                type="button"
                onClick={handleContinueToPayment}
                disabled={!formOk}
                className="w-full mt-6 bg-[#0066FF] hover:bg-[#0052CC] disabled:opacity-60 disabled:cursor-not-allowed text-white font-poppins font-black text-[.95rem] py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(0,102,255,0.3)] flex items-center justify-center gap-2"
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

          {/* Step 2: Prebooking in progress */}
          {step === 'prebook' && (
            <div className="text-center py-10">
              <div className="inline-block w-8 h-8 border-4 border-[#E8ECF4] border-t-[#0066FF] rounded-full animate-spin" />
              <p className="mt-4 text-sm font-semibold text-[#5C6378]">Locking your rate…</p>
              <p className="mt-1 text-[.75rem] text-[#8E95A9]">This takes a few seconds</p>
            </div>
          )}

          {/* Step 3: LiteAPI Payment SDK form */}
          {step === 'payment' && (
            <>
              <h2 className="font-poppins font-black text-[1.1rem] text-[#1A1D2B] mb-1">Secure payment</h2>
              <p className="text-[.78rem] text-[#5C6378] font-semibold mb-4">
                Enter your card details below. Payment is processed securely by our hotel booking partner.
              </p>
              {prebookWarnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 flex items-start gap-2.5">
                  <i className="fa-solid fa-triangle-exclamation text-amber-600 text-sm mt-0.5" />
                  <div className="text-[.78rem] text-amber-800 font-semibold leading-snug">
                    {prebookWarnings.map((w, i) => <p key={i}>{w}</p>)}
                  </div>
                </div>
              )}
              {confirmedPrice && confirmedPrice !== booking.totalPrice && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4 flex items-start gap-2.5">
                  <i className="fa-solid fa-info-circle text-blue-600 text-sm mt-0.5" />
                  <p className="text-[.78rem] text-blue-800 font-semibold leading-snug">
                    Confirmed price: <strong>{booking.currency === 'GBP' ? '£' : `${booking.currency} `}{confirmedPrice.toFixed(2)}</strong>
                  </p>
                </div>
              )}
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 flex items-start gap-2.5">
                <i className="fa-solid fa-shield-halved text-green-600 text-sm mt-0.5" />
                <p className="text-[.78rem] text-green-800 font-semibold leading-snug">
                  Your card details are handled directly by our secure payment partner. JetMeAway never sees or stores your card number.
                </p>
              </div>
              <div id="liteapi-payment-form" ref={paymentContainerRef} className="min-h-[200px]" />
            </>
          )}

          {/* Error state */}
          {step === 'error' && (
            <div className="text-center py-10">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                <i className="fa-solid fa-xmark text-red-600 text-xl" />
              </div>
              <p className="font-poppins font-bold text-red-700 mb-2">{stepError || 'Something went wrong'}</p>
              <button
                type="button"
                onClick={() => { setStep('guest'); setStepError(null); sdkLoadedRef.current = false; }}
                className="text-sm font-bold text-[#0066FF] underline"
              >
                Try again
              </button>
            </div>
          )}
        </div>

        {/* Booking summary sidebar */}
        <aside className="bg-[#F8FAFC] border border-[#E8ECF4] rounded-2xl p-5 h-fit">
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
            <span className="font-poppins font-black text-[1.3rem] text-[#1A1D2B]">
              {booking.currency === 'GBP' ? '£' : `${booking.currency} `}
              {booking.totalPrice.toFixed(2)}
            </span>
          </div>
        </aside>
      </div>
    </main>
  );
}
