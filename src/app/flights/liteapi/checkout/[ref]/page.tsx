'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import PaymentTrustStrip from '@/components/PaymentTrustStrip';

/* ── Types (kept local — do NOT import from src/lib/liteapi-flights.ts; that
 *    module reads process.env inside its helpers and must never be bundled
 *    into this client component). Shapes mirror the verified LiteAPI flights
 *    contract: gender M/F/X, phoneCountryCode numeric, birthday YYYY-MM-DD. ── */

type Cabin = 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST' | string;

interface TripSummary {
  origin: string;
  destination: string;
  depDate: string;
  retDate?: string | null;
  adults: number;
  children: number;
  infants: number;
  cabin?: Cabin;
  currency: string;
  totalPrice: number;
  airline?: string;
  airlineName?: string;
  segments?: unknown[];
}

/** Sanitised GET /pending/[ref] payload (spec §3 — NEVER carries
 *  offerId / secretKey / transactionId). */
interface PendingFlight {
  ref: string;
  state: 'pending' | 'prebooked' | 'confirmed' | 'failed';
  trip: TripSummary;
  passengers?: PassengerInput[];
  hasContact?: boolean;
}

interface PassengerInput {
  firstName: string;
  lastName: string;
  birthday: string; // YYYY-MM-DD
  gender: 'M' | 'F' | 'X';
  type: 'ADULT' | 'CHILD' | 'INFANT';
  nationality: string;          // ISO alpha-2
  documentNumber: string;
  documentIssueCountry: string; // ISO alpha-2
  documentExpiry: string;       // YYYY-MM-DD
}

/* Compact travel-nationality list. Values are ISO 3166-1 alpha-2 codes that
   LiteAPI accepts for `nationality` / `documentIssueCountry`. */
const COUNTRIES: Array<{ code: string; name: string }> = [
  { code: 'GB', name: 'United Kingdom' },
  { code: 'IE', name: 'Ireland' },
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'PT', name: 'Portugal' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'AT', name: 'Austria' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'PL', name: 'Poland' },
  { code: 'GR', name: 'Greece' },
  { code: 'CZ', name: 'Czechia' },
  { code: 'HU', name: 'Hungary' },
  { code: 'RO', name: 'Romania' },
  { code: 'TR', name: 'Turkey' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'QA', name: 'Qatar' },
  { code: 'IN', name: 'India' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'CN', name: 'China' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'SG', name: 'Singapore' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'TH', name: 'Thailand' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'PH', name: 'Philippines' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'EG', name: 'Egypt' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'KE', name: 'Kenya' },
  { code: 'BR', name: 'Brazil' },
  { code: 'AR', name: 'Argentina' },
  { code: 'MX', name: 'Mexico' },
];

type Step = 'loading' | 'form' | 'saving' | 'payment' | 'price-changed' | 'sold-out' | 'error';

/* Return translation KEYS — rendered via t(`cabin.${cabinKey(c)}`) etc. so the
   stored enum values never change (they feed the API). */
function cabinKey(c?: string) {
  switch (c) {
    case 'ECONOMY': return 'economy';
    case 'PREMIUM_ECONOMY': return 'premiumEconomy';
    case 'BUSINESS': return 'business';
    case 'FIRST': return 'first';
    default: return 'economy';
  }
}

function paxKey(t: PassengerInput['type']) {
  return t === 'ADULT' ? 'adult' : t === 'CHILD' ? 'child' : 'infant';
}

function fmtDate(d?: string | null) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export default function FlightCheckoutPage() {
  const params = useParams<{ ref: string }>();
  const ref = params?.ref || '';

  const [pending, setPending] = useState<PendingFlight | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [step, setStep] = useState<Step>('loading');
  const [stepError, setStepError] = useState<string | null>(null);

  // Passenger blocks — sized from trip pax counts once pending loads.
  const [passengers, setPassengers] = useState<PassengerInput[]>([]);

  // Lead contact (spec §7: email + numeric country code + digits-only number).
  const [email, setEmail] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('44');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Prebook result → drives the payment SDK + price display.
  const [prebookResult, setPrebookResult] = useState<{
    prebookId: string;
    transactionId: string;
    secretKey: string;
    price: number | null;
    currency: string;
  } | null>(null);

  // 409 price_changed detail.
  const [priceChange, setPriceChange] = useState<{ newPrice?: number; currency?: string } | null>(null);

  const paymentContainerRef = useRef<HTMLDivElement>(null);
  const sdkLoadedRef = useRef(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paymentInstanceRef = useRef<any>(null);
  const [payingNow, setPayingNow] = useState(false);
  const t = useTranslations('checkout');
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const trip = pending?.trip;
  const currency = trip?.currency || 'GBP';

  const fmtPrice = useCallback(
    (amount: number) => (currency === 'GBP' ? `£${amount.toFixed(2)}` : `${currency} ${amount.toFixed(2)}`),
    [currency],
  );

  // ── Load the pending flight record ──────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/flights/liteapi/pending/${encodeURIComponent(ref)}`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || data?.error || !data?.trip) {
          setLoadError(data?.error === 'not_found' ? t('sessionExpired') : (data?.error || t('couldNotLoadFlight')));
          return;
        }
        const tripData: TripSummary = data.trip;
        setPending(data as PendingFlight);

        // Build one passenger block per seat: adults first, then children, infants.
        const built: PassengerInput[] = [];
        const push = (type: PassengerInput['type'], n: number) => {
          for (let i = 0; i < n; i++) {
            built.push({
              firstName: '', lastName: '', birthday: '', gender: 'M', type,
              nationality: 'GB', documentNumber: '', documentIssueCountry: 'GB', documentExpiry: '',
            });
          }
        };
        push('ADULT', Math.max(1, tripData.adults || 1));
        push('CHILD', tripData.children || 0);
        push('INFANT', tripData.infants || 0);

        // If passengers were already saved on this record, prefill from them.
        if (Array.isArray(data.passengers) && data.passengers.length === built.length) {
          setPassengers(data.passengers.map((p: PassengerInput, i: number) => ({ ...built[i], ...p })));
        } else {
          setPassengers(built);
        }
        setStep('form');
      } catch (e: unknown) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : t('networkError'));
      }
    })();
    return () => { cancelled = true; };
  }, [ref]);

  const updatePax = (idx: number, patch: Partial<PassengerInput>) => {
    setPassengers(prev => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  // ── Validation ──────────────────────────────────────────────────────────
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  const alpha2Re = /^[A-Z]{2}$/;
  const passengersValid =
    passengers.length > 0 &&
    passengers.every(p =>
      p.firstName.trim().length >= 2 &&
      p.lastName.trim().length >= 2 &&
      dateRe.test(p.birthday) &&
      (p.gender === 'M' || p.gender === 'F' || p.gender === 'X') &&
      alpha2Re.test(p.nationality) &&
      p.documentNumber.trim().length >= 3 &&
      alpha2Re.test(p.documentIssueCountry) &&
      dateRe.test(p.documentExpiry),
    );
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const ccDigits = phoneCountryCode.replace(/\D/g, '');
  const ccOk = ccDigits.length >= 1 && ccDigits.length <= 4;
  const phoneDigits = phoneNumber.replace(/\D/g, '');
  const phoneOk = /^\d{6,15}$/.test(phoneDigits);
  const formOk = passengersValid && emailOk && ccOk && phoneOk;

  // ── LiteAPI Payment SDK init — COPIED VERBATIM from the hotels checkout
  //    (src/app/hotels/checkout/[ref]/page.tsx). The ONLY change is the
  //    returnUrl, which points at the flights confirm route. NO Stripe. ─────
  const initPaymentSdk = useCallback((secretKey: string, pbId: string, txId: string, mode: string) => {
    if (sdkLoadedRef.current) return;
    sdkLoadedRef.current = true;

    const script = document.createElement('script');
    script.src = 'https://payment-wrapper.liteapi.travel/dist/liteAPIPayment.js?v=a1';
    script.async = true;

    // 30s timeout — if LiteAPI CDN is slow, don't leave user on spinner forever
    const timeout = setTimeout(() => {
      if (!paymentInstanceRef.current) {
        setStepError(t('paymentFormTimeout'));
        setStep('error');
      }
    }, 30_000);

    script.onload = () => {
      clearTimeout(timeout);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const LiteAPIPayment = (window as any).LiteAPIPayment;
      if (!LiteAPIPayment) {
        setStepError(t('paymentFormFailed'));
        setStep('error');
        return;
      }

      const returnUrl = `${window.location.origin}/flights/liteapi/confirm?ref=${encodeURIComponent(ref)}&prebookId=${encodeURIComponent(pbId)}&transactionId=${encodeURIComponent(txId)}`;

      try {
        const payment = new LiteAPIPayment({
          // 'sandbox' or 'live' — supplied by the prebook route from the key it
          // booked with, so the SDK mode always matches (sandbox test card
          // 4242… works when the sandbox key is in use).
          publicKey: mode,
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
        setStepError(t('paymentFormFailed'));
        setStep('error');
      }
    };
    script.onerror = () => {
      clearTimeout(timeout);
      setStepError(t('paymentFormFailed'));
      setStep('error');
    };
    document.head.appendChild(script);
  }, [ref]);

  // Pay-now handler — copied verbatim from hotels checkout.
  const handlePayNow = async () => {
    const pi = paymentInstanceRef.current;
    if (!pi) {
      setPaymentError(t('paymentFormNotReady'));
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
          const form = document.querySelector('#liteapi-payment-form form') as HTMLFormElement | null;
          if (form) form.requestSubmit();
        }
      }
    } catch (e: unknown) {
      setPaymentError(e instanceof Error ? e.message : t('paymentFailedRetry'));
      setPayingNow(false);
    }
  };

  // ── Submit: save passengers+contact → prebook → init payment SDK ─────────
  const handleSubmit = async () => {
    if (!pending || !trip || !formOk) return;
    setStep('saving');
    setStepError(null);

    try {
      const lead = passengers[0];
      const contact = {
        firstName: lead.firstName.trim(),
        lastName: lead.lastName.trim(),
        email: email.trim(),
        phoneNumber: phoneDigits,
        phoneCountryCode: ccDigits,
      };
      const paxPayload = passengers.map(p => ({
        firstName: p.firstName.trim(),
        lastName: p.lastName.trim(),
        birthday: p.birthday,
        gender: p.gender,
        type: p.type,
        nationality: p.nationality,
        documentType: 'passport',
        documentIssueCountry: p.documentIssueCountry,
        documentNumber: p.documentNumber.trim(),
        documentExpiry: p.documentExpiry,
      }));

      // 1. Save passengers + contact onto the pending record.
      const saveRes = await fetch(`/api/flights/liteapi/pending/${encodeURIComponent(ref)}/passengers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passengers: paxPayload, contact }),
      });
      const saveData = await saveRes.json().catch(() => ({}));
      if (!saveRes.ok || !saveData?.ok) {
        throw new Error(saveData?.error || t('couldNotSavePassengers'));
      }

      // 2. Prebook (verify + hold + open payment session).
      const pbRes = await fetch('/api/flights/liteapi/prebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref }),
      });
      const pbData = await pbRes.json().catch(() => ({}));

      if (pbRes.status === 409) {
        if (pbData?.error === 'price_changed') {
          setPriceChange({ newPrice: pbData.newPrice, currency: pbData.currency });
          setStep('price-changed');
          return;
        }
        if (pbData?.error === 'sold_out') {
          setStep('sold-out');
          return;
        }
        throw new Error(pbData?.error || t('couldNotLockFare'));
      }
      if (!pbRes.ok) throw new Error(pbData?.error || t('couldNotLockFare'));

      setPrebookResult({
        prebookId: pbData.prebookId,
        transactionId: pbData.transactionId,
        secretKey: pbData.secretKey,
        price: pbData.price ?? null,
        currency: pbData.currency || currency,
      });

      // 3. Hand off to LiteAPI's hosted payment SDK.
      initPaymentSdk(pbData.secretKey, pbData.prebookId, pbData.transactionId, pbData.paymentMode || 'sandbox');
    } catch (e: unknown) {
      setStepError(e instanceof Error ? e.message : t('unexpectedError'));
      setStep('form');
    }
  };

  // ── Render: hard load error ─────────────────────────────────────────────
  if (loadError) {
    return (
      <main className="max-w-[720px] mx-auto px-5 py-16">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <p className="font-poppins font-bold text-red-700">{loadError}</p>
          <a href="/flights" className="inline-block mt-4 text-sm font-bold text-[#0066FF] underline">← {t('backToFlights')}</a>
        </div>
      </main>
    );
  }

  if (!pending || !trip) {
    return (
      <main className="max-w-[720px] mx-auto px-5 py-16 text-center">
        <div className="inline-block w-8 h-8 border-4 border-[#E8ECF4] border-t-[#0066FF] rounded-full animate-spin" />
        <p className="mt-4 text-sm font-semibold text-[#5C6378]">{t('loadingFlight')}</p>
      </main>
    );
  }

  const inputCls = 'w-full mt-1 px-3 py-3 sm:py-2.5 rounded-lg border border-[#E8ECF4] bg-white text-[16px] sm:text-[.88rem] font-semibold text-[#1A1D2B] outline-none focus:border-[#0066FF] placeholder:text-[#B0B8CC] placeholder:font-normal';
  const labelCls = 'text-[.7rem] font-bold text-[#5C6378] uppercase tracking-wide';

  const airline = trip.airlineName || trip.airline || '';
  const displayPrice = prebookResult?.price ?? trip.totalPrice;

  return (
    <main className="max-w-[860px] mx-auto px-4 sm:px-5 py-6 sm:py-10">
      <a href="/flights" className="text-[.78rem] font-bold text-[#0066FF] hover:underline">← {t('backToSearch')}</a>
      <h1 className="font-poppins font-black text-[1.4rem] sm:text-[1.8rem] text-[#1A1D2B] mt-3 mb-1">{t('confirmYourFlight')}</h1>
      <p className="text-[.82rem] text-[#5C6378] font-semibold mb-4">{t('refLabel')} <span className="font-mono">{pending.ref}</span></p>

      {/* Checkout progress */}
      {(() => {
        const onPayment = step === 'payment';
        const stages: Array<{ label: string; active: boolean; complete: boolean }> = [
          { label: t('stagePassengers'), active: !onPayment, complete: onPayment },
          { label: t('stageSecurePayment'), active: onPayment, complete: false },
          { label: t('stageDone'), active: false, complete: false },
        ];
        return (
          <ol className="flex items-center gap-2 mb-5 sm:mb-6" aria-label={t('checkoutProgress')}>
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
          {/* Step: passenger form */}
          {step === 'form' && (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 mb-4 flex items-start gap-2">
                <i className="fa-solid fa-passport text-amber-600 text-sm mt-0.5 flex-shrink-0" />
                <p className="text-[.75rem] sm:text-[.78rem] text-amber-800 font-semibold leading-snug">
                  {t('passportNotice')}
                </p>
              </div>

              {passengers.map((p, idx) => (
                <div key={idx} className="mb-5 last:mb-0 border border-[#E8ECF4] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#0066FF]/10 text-[#0066FF] text-[.72rem] font-black">
                      {idx + 1}
                    </span>
                    <h2 className="font-poppins font-black text-[.98rem] text-[#1A1D2B]">
                      {t(`pax.${paxKey(p.type)}`)}{' '}
                      <span className="text-[.75rem] font-bold text-[#8E95A9]">
                        {p.type === 'ADULT' ? t('ageAdult') : p.type === 'CHILD' ? t('ageChild') : t('ageInfant')}
                      </span>
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block">
                      <span className={labelCls}>{t('firstName')}</span>
                      <input type="text" value={p.firstName} onChange={e => updatePax(idx, { firstName: e.target.value })}
                        placeholder={t('asOnPassport')} className={inputCls} />
                    </label>
                    <label className="block">
                      <span className={labelCls}>{t('lastName')}</span>
                      <input type="text" value={p.lastName} onChange={e => updatePax(idx, { lastName: e.target.value })}
                        placeholder={t('asOnPassport')} className={inputCls} />
                    </label>
                    <label className="block">
                      <span className={labelCls}>{t('dateOfBirth')}</span>
                      <input type="date" value={p.birthday} onChange={e => updatePax(idx, { birthday: e.target.value })}
                        className={inputCls} />
                    </label>
                    <label className="block">
                      <span className={labelCls}>{t('gender')}</span>
                      <select value={p.gender} onChange={e => updatePax(idx, { gender: e.target.value as PassengerInput['gender'] })}
                        className={inputCls}>
                        <option value="M">{t('male')}</option>
                        <option value="F">{t('female')}</option>
                        <option value="X">{t('unspecifiedX')}</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className={labelCls}>{t('nationality')}</span>
                      <select value={p.nationality} onChange={e => updatePax(idx, { nationality: e.target.value })}
                        className={inputCls}>
                        {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className={labelCls}>{t('passportNumber')}</span>
                      <input type="text" value={p.documentNumber}
                        onChange={e => updatePax(idx, { documentNumber: e.target.value.toUpperCase() })}
                        placeholder={t('passportNumberPh')} className={`${inputCls} uppercase`} />
                    </label>
                    <label className="block">
                      <span className={labelCls}>{t('passportIssuingCountry')}</span>
                      <select value={p.documentIssueCountry} onChange={e => updatePax(idx, { documentIssueCountry: e.target.value })}
                        className={inputCls}>
                        {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className={labelCls}>{t('passportExpiry')}</span>
                      <input type="date" value={p.documentExpiry} onChange={e => updatePax(idx, { documentExpiry: e.target.value })}
                        className={inputCls} />
                    </label>
                  </div>
                </div>
              ))}

              {/* Lead contact */}
              <div className="mt-5 border border-[#E8ECF4] rounded-xl p-4">
                <h2 className="font-poppins font-black text-[.98rem] text-[#1A1D2B] mb-1">{t('contactDetails')}</h2>
                <p className="text-[.72rem] font-semibold text-[#8E95A9] mb-3">
                  {t('contactSub')}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block sm:col-span-2">
                    <span className={labelCls}>{t('emailLabel')}</span>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com" className={inputCls} />
                  </label>
                  <label className="block">
                    <span className={labelCls}>{t('countryCode')}</span>
                    <div className="flex items-center mt-1">
                      <span className="px-2.5 py-3 sm:py-2.5 rounded-l-lg border border-r-0 border-[#E8ECF4] bg-[#F8FAFC] text-[.88rem] font-bold text-[#5C6378]">+</span>
                      <input type="tel" inputMode="numeric" value={phoneCountryCode}
                        onChange={e => setPhoneCountryCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="44"
                        className="w-full px-3 py-3 sm:py-2.5 rounded-r-lg border border-[#E8ECF4] bg-white text-[16px] sm:text-[.88rem] font-semibold text-[#1A1D2B] outline-none focus:border-[#0066FF] placeholder:text-[#B0B8CC] placeholder:font-normal" />
                    </div>
                  </label>
                  <label className="block">
                    <span className={labelCls}>{t('phoneNumber')}</span>
                    <input type="tel" inputMode="numeric" value={phoneNumber}
                      onChange={e => setPhoneNumber(e.target.value.replace(/[^\d\s]/g, ''))}
                      placeholder="7911 123456" className={inputCls} />
                  </label>
                </div>
              </div>

              {/* Reassurance band */}
              <div className="mt-5 sm:mt-6 flex items-center justify-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 sm:px-4 py-2.5 text-[.74rem] sm:text-[.78rem] font-semibold text-emerald-800 leading-snug">
                <span aria-hidden="true">🔒</span>
                <span className="text-center">{t('reassurance')}</span>
              </div>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!formOk}
                className="w-full mt-3 bg-[#0066FF] hover:bg-[#0052CC] disabled:opacity-60 disabled:cursor-not-allowed text-white font-poppins font-black text-[.92rem] sm:text-[.95rem] py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(0,102,255,0.3)] flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-credit-card text-[.85rem]" /> {t('continueToPayment')}
              </button>
              {stepError && (
                <p className="text-[.72rem] font-bold text-red-600 mt-2 text-center">{stepError}</p>
              )}
              <p className="text-[.68rem] text-[#8E95A9] mt-3 font-semibold text-center">
                {t('cardEncryptedNote')}
              </p>
            </>
          )}

          {/* Step: saving / locking fare */}
          {step === 'saving' && (
            <div className="text-center py-10">
              <div className="inline-block w-8 h-8 border-4 border-[#E8ECF4] border-t-[#0066FF] rounded-full animate-spin" />
              <p className="mt-4 text-sm font-semibold text-[#5C6378]">{t('confirmingFare')}</p>
              <p className="mt-1 text-[.75rem] text-[#8E95A9]">{t('canTake30s')}</p>
            </div>
          )}

          {/* Step: 409 price_changed */}
          {step === 'price-changed' && (
            <div className="py-4">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 sm:p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
                  <i className="fa-solid fa-triangle-exclamation text-amber-600 text-xl" />
                </div>
                <h2 className="font-poppins font-black text-[1.1rem] text-[#1A1D2B] mb-2">{t('fareChanged')}</h2>
                <p className="text-[.82rem] text-[#5C6378] font-semibold mb-4 max-w-sm mx-auto">
                  {t('fareChangedBody')}
                </p>
                {typeof priceChange?.newPrice === 'number' && (
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="text-center">
                      <p className="text-[.68rem] font-bold text-[#8E95A9] uppercase tracking-wide mb-0.5">{t('youSaw')}</p>
                      <p className="font-poppins font-black text-[1.15rem] text-[#8E95A9] line-through">{fmtPrice(trip.totalPrice)}</p>
                    </div>
                    <i className="fa-solid fa-arrow-right text-[#8E95A9] text-sm" />
                    <div className="text-center">
                      <p className="text-[.68rem] font-bold text-[#1A1D2B] uppercase tracking-wide mb-0.5">{t('newFare')}</p>
                      <p className="font-poppins font-black text-[1.3rem] text-red-600">
                        {priceChange.currency === 'GBP' || !priceChange.currency ? `£${priceChange.newPrice.toFixed(2)}` : `${priceChange.currency} ${priceChange.newPrice.toFixed(2)}`}
                      </p>
                    </div>
                  </div>
                )}
                <a href="/flights" className="inline-block bg-[#0066FF] hover:bg-[#0052CC] text-white font-poppins font-black text-[.88rem] px-6 py-3.5 rounded-xl transition-all shadow-[0_4px_20px_rgba(0,102,255,0.3)]">
                  {t('searchFreshFares')} →
                </a>
              </div>
            </div>
          )}

          {/* Step: 409 sold_out */}
          {step === 'sold-out' && (
            <div className="py-4">
              <div className="bg-[#FAF3E6]/60 ring-1 ring-[#E8D8A8]/60 rounded-2xl p-5 sm:p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-[#FAF3E6] ring-1 ring-[#E8D8A8] flex items-center justify-center mx-auto mb-3">
                  <i className="fa-solid fa-shield-halved text-[#8a6d00] text-xl" />
                </div>
                <p className="text-[.62rem] font-black uppercase tracking-[2px] text-[#8a6d00] mb-2">{t('scoutShield')}</p>
                <h2 className="font-poppins font-black text-[1.2rem] text-[#0a1628] mb-2">{t('fareSoldOut')}</h2>
                <p className="text-[.85rem] text-slate-600 font-medium leading-relaxed mb-4 max-w-sm mx-auto">
                  {t('soldOutBody')}
                </p>
                <a href="/flights" className="inline-block bg-[#0a1628] hover:bg-[#0066FF] text-white font-poppins font-bold text-[.85rem] rounded-full px-6 py-3 transition-colors shadow-[0_6px_18px_rgba(10,22,40,0.18)]">
                  {t('seeLiveFares')} →
                </a>
              </div>
            </div>
          )}

          {/* Step: LiteAPI Payment SDK */}
          {step === 'payment' && (
            <>
              <h2 className="font-poppins font-black text-[1.1rem] text-[#1A1D2B] mb-1">{t('securePayment')}</h2>
              <p className="text-[.78rem] text-[#5C6378] font-semibold mb-4">
                {t('enterCardBelow')}
              </p>
              {paymentError && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 flex items-start gap-2.5">
                  <i className="fa-solid fa-circle-xmark text-red-600 text-sm mt-0.5" />
                  <div>
                    <p className="text-[.78rem] text-red-700 font-bold">{t('paymentFailedTitle')}</p>
                    <p className="text-[.72rem] text-red-600 font-semibold">{paymentError}</p>
                  </div>
                </div>
              )}
              <div className="mb-4">
                <PaymentTrustStrip />
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
                    {t('processing')}
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-lock text-[.8rem]" />
                    {t('payNow', {price: fmtPrice(displayPrice)})}
                  </>
                )}
              </button>
              <p className="text-[.65rem] text-[#8E95A9] font-semibold text-center mt-2">
                {t.rich('agreeTerms', {link: (chunks) => <a href="/terms" className="underline">{chunks}</a>})}
              </p>
            </>
          )}

          {/* Step: generic error */}
          {step === 'error' && (
            <div className="text-center py-10">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                <i className="fa-solid fa-xmark text-red-600 text-xl" />
              </div>
              <p className="font-poppins font-bold text-red-700 mb-2">{stepError || t('somethingWentWrong')}</p>
              <p className="text-[.78rem] text-slate-500 mb-4 max-w-sm mx-auto">{t('cardNotCharged')}</p>
              <a href="/flights" className="text-sm font-bold text-[#0066FF] underline">{t('backToSearch')}</a>
            </div>
          )}
        </div>

        {/* Trip summary sidebar — shows first on mobile */}
        <aside className="bg-[#F8FAFC] border border-[#E8ECF4] rounded-2xl p-4 sm:p-5 h-fit order-first md:order-last">
          <div className="flex items-center gap-2 mb-3">
            <i className="fa-solid fa-plane-up text-[#0066FF] text-sm" />
            <h3 className="font-poppins font-black text-[1rem] text-[#1A1D2B]">
              {trip.origin} → {trip.destination}
            </h3>
          </div>
          {airline && <p className="text-[.75rem] text-[#8E95A9] font-semibold mb-3">{airline}</p>}
          <div className="text-[.78rem] text-[#5C6378] font-semibold space-y-1 mb-4">
            <div>{t('departs')} <strong className="text-[#1A1D2B]">{fmtDate(trip.depDate)}</strong></div>
            {trip.retDate && <div>{t('returns')} <strong className="text-[#1A1D2B]">{fmtDate(trip.retDate)}</strong></div>}
            <div>
              {t('adultsCount', {count: trip.adults})}
              {(trip.children ?? 0) > 0 && <> · {t('childrenCount', {count: trip.children})}</>}
              {(trip.infants ?? 0) > 0 && <> · {t('infantsCount', {count: trip.infants})}</>}
            </div>
            <div>{t('cabinLabel')} <strong className="text-[#1A1D2B]">{t(`cabin.${cabinKey(trip.cabin)}`)}</strong></div>
          </div>

          <div className="border-t border-[#E8ECF4] pt-3 space-y-1.5">
            {prebookResult?.price != null && prebookResult.price !== trip.totalPrice && (
              <div className="flex items-center justify-between text-[.72rem] text-amber-700 font-semibold">
                <span>{t('fareUpdatedFrom', {price: fmtPrice(trip.totalPrice)})}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-1.5">
              <span className="text-[.82rem] font-bold text-[#1A1D2B]">{t('total')}</span>
              <span className="font-poppins font-black text-[1.3rem] text-[#1A1D2B]">{fmtPrice(displayPrice)}</span>
            </div>
            <p className="text-[.65rem] text-[#8E95A9] font-semibold">
              {t('includesTaxes')}
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
