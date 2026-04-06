'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { MARKUP_GBP } from '@/lib/travel-logic';

export const runtime = 'edge';

/* Load DuffelPayments only on client (it uses Stripe internally) */
const DuffelPayments = dynamic(
  () => import('@duffel/components').then(mod => mod.DuffelPayments),
  { ssr: false },
);

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

type OfferData = {
  id: string;
  airline: string;
  airlineCode: string;
  origin: string;
  originCity: string;
  destination: string;
  destinationCity: string;
  departureAt: string | null;
  arrivalAt: string | null;
  durationOut: number;
  stopsOut: number;
  hasReturn: boolean;
  returnDepartureAt: string | null;
  returnArrivalAt: string | null;
  durationBack: number;
  stopsBack: number;
  passengerCount: number;
  passengers: { id: string; type: string }[];
  currency: string;
  basePerPerson: number;
  pricing: { airline: number; markup: number; total: number; display: string };
  totalForAll: number;
  refundable: boolean;
  changeable: boolean;
  cabinClass: string;
  expiresAt: string | null;
};

type PassengerForm = {
  firstName: string;
  lastName: string;
  dob: string;
  gender: 'male' | 'female' | 'undisclosed' | '';
  email: string;
  phone: string;
};

type FieldErrors = Partial<Record<keyof PassengerForm, string>>;

type CheckoutStep = 'passengers' | 'payment' | 'processing' | 'confirmed';

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

function fmtTime(iso: string | null): string {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDuration(mins: number): string {
  if (!mins) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function stopsLabel(n: number): string {
  return n === 0 ? 'Direct' : n === 1 ? '1 stop' : `${n} stops`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_RE = /^[a-zA-Z\s'-]{2,}$/;

function validatePassenger(p: PassengerForm, isLead: boolean, paxType?: string): FieldErrors {
  const err: FieldErrors = {};
  if (!NAME_RE.test(p.firstName.trim())) err.firstName = 'Enter a valid first name (as on passport)';
  if (!NAME_RE.test(p.lastName.trim())) err.lastName = 'Enter a valid last name (as on passport)';
  if (!p.dob || !/^\d{4}-\d{2}-\d{2}$/.test(p.dob)) {
    err.dob = 'Enter date of birth (YYYY-MM-DD)';
  } else {
    const ageYears = (Date.now() - new Date(p.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    if (ageYears < 0 || ageYears > 120) {
      err.dob = 'Enter a valid date of birth';
    } else if (paxType === 'adult' && ageYears < 18) {
      err.dob = 'Adults must be 18 or older';
    } else if (paxType === 'child' && (ageYears < 2 || ageYears >= 12)) {
      err.dob = 'Children must be aged 2–11';
    } else if (paxType === 'infant_without_seat' && ageYears >= 2) {
      err.dob = 'Infants must be under 2';
    }
  }
  if (!p.gender) err.gender = 'Select gender';
  if (isLead) {
    if (!EMAIL_RE.test(p.email.trim())) err.email = 'Enter a valid email address';
    if (!p.phone.trim() || p.phone.trim().length < 7) err.phone = 'Enter a valid phone number';
  }
  return err;
}

/* ═══════════════════════════════════════════════════════════════════════════
   LOADING SKELETON
   ═══════════════════════════════════════════════════════════════════════════ */

function LoadingSkeleton() {
  return (
    <div className="max-w-[1100px] mx-auto px-5 pt-36 pb-16 animate-pulse">
      <div className="h-8 w-64 bg-[#E8ECF4] rounded-xl mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-4">
          <div className="h-48 bg-[#F1F3F7] rounded-2xl" />
          <div className="h-48 bg-[#F1F3F7] rounded-2xl" />
        </div>
        <div className="h-64 bg-[#F1F3F7] rounded-2xl" />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   FLIGHT SUMMARY CARD (reused in form + confirmation)
   ═══════════════════════════════════════════════════════════════════════════ */

function FlightSummary({ offer, compact }: { offer: OfferData; compact?: boolean }) {
  return (
    <div className="bg-white border border-[#E8ECF4] rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <img
          src={`https://pics.avs.io/60/60/${offer.airlineCode}.png`}
          alt={offer.airline}
          className="w-8 h-8 object-contain rounded"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <div>
          <div className="font-poppins font-bold text-[.85rem] text-[#1A1D2B]">{offer.airline}</div>
          {!compact && <div className="text-[.65rem] text-[#8E95A9] font-semibold">{offer.cabinClass}</div>}
        </div>
      </div>
      <div className="flex items-center gap-4 text-[.78rem]">
        <div>
          <div className="font-poppins font-black text-[#1A1D2B]">{fmtTime(offer.departureAt)}</div>
          <div className="text-[.65rem] text-[#8E95A9] font-semibold">{offer.origin}</div>
        </div>
        <div className="flex-1 flex flex-col items-center gap-0.5">
          <div className="text-[.62rem] text-[#8E95A9] font-semibold">{fmtDuration(offer.durationOut)}</div>
          <div className="w-full h-px bg-[#D1D5DB]" />
          <span className={`text-[.58rem] font-black uppercase ${offer.stopsOut === 0 ? 'text-green-600' : 'text-orange-500'}`}>
            {stopsLabel(offer.stopsOut)}
          </span>
        </div>
        <div>
          <div className="font-poppins font-black text-[#1A1D2B]">{fmtTime(offer.arrivalAt)}</div>
          <div className="text-[.65rem] text-[#8E95A9] font-semibold">{offer.destination}</div>
        </div>
      </div>
      <div className="text-[.65rem] text-[#8E95A9] font-semibold mt-2">{fmtDate(offer.departureAt)}</div>
      {offer.hasReturn && (
        <div className="border-t border-[#F1F3F7] mt-3 pt-3 flex items-center gap-4 text-[.78rem]">
          <div>
            <div className="font-poppins font-black text-[#1A1D2B]">{fmtTime(offer.returnDepartureAt)}</div>
            <div className="text-[.65rem] text-[#8E95A9] font-semibold">{offer.destination}</div>
          </div>
          <div className="flex-1 flex flex-col items-center gap-0.5">
            <div className="text-[.62rem] text-[#8E95A9] font-semibold">{fmtDuration(offer.durationBack)}</div>
            <div className="w-full h-px bg-[#D1D5DB]" />
            <span className={`text-[.58rem] font-black uppercase ${offer.stopsBack === 0 ? 'text-green-600' : 'text-orange-500'}`}>
              {stopsLabel(offer.stopsBack)}
            </span>
          </div>
          <div>
            <div className="font-poppins font-black text-[#1A1D2B]">{fmtTime(offer.returnArrivalAt)}</div>
            <div className="text-[.65rem] text-[#8E95A9] font-semibold">{offer.origin}</div>
          </div>
          <div className="text-[.65rem] text-[#8E95A9] font-semibold">{fmtDate(offer.returnDepartureAt)}</div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   STEP INDICATOR
   ═══════════════════════════════════════════════════════════════════════════ */

function StepIndicator({ current }: { current: CheckoutStep }) {
  const steps: { key: CheckoutStep; label: string }[] = [
    { key: 'passengers', label: 'Passengers' },
    { key: 'payment', label: 'Payment' },
    { key: 'confirmed', label: 'Confirmed' },
  ];

  const getIndex = (s: CheckoutStep) => {
    if (s === 'processing') return 1; // same visual position as payment
    return steps.findIndex(st => st.key === s);
  };

  const currentIdx = getIndex(current);

  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((s, i) => {
        const isDone = i < currentIdx;
        const isActive = i === currentIdx || (current === 'processing' && s.key === 'payment');
        return (
          <div key={s.key} className="flex items-center gap-2">
            {i > 0 && (
              <div className={`w-8 h-px ${isDone ? 'bg-[#0066FF]' : 'bg-[#E8ECF4]'}`} />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[.6rem] font-black
                  ${isDone ? 'bg-[#0066FF] text-white' : isActive ? 'bg-[#0066FF] text-white' : 'bg-[#F1F3F7] text-[#8E95A9]'}`}
              >
                {isDone ? '✓' : i + 1}
              </div>
              <span className={`text-[.68rem] font-bold ${isActive || isDone ? 'text-[#1A1D2B]' : 'text-[#8E95A9]'}`}>
                {s.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PRICE SIDEBAR
   ═══════════════════════════════════════════════════════════════════════════ */

function PriceSidebar({
  offer,
  step,
  onCta,
  ctaDisabled,
  ctaLabel,
  errorMsg,
}: {
  offer: OfferData;
  step: CheckoutStep;
  onCta?: () => void;
  ctaDisabled?: boolean;
  ctaLabel?: string;
  errorMsg?: string | null;
}) {
  return (
    <div className="hidden lg:block">
      <div className="sticky top-28 space-y-4">
        <div className="bg-white border border-[#E8ECF4] rounded-2xl p-5 shadow-[0_2px_16px_rgba(0,102,255,0.06)]">
          <h3 className="font-poppins font-black text-[.85rem] text-[#1A1D2B] mb-4">Price Summary</h3>

          <div className="space-y-2.5 text-[.78rem]">
            <div className="flex justify-between">
              <span className="text-[#5C6378] font-semibold">Flight ({offer.airline})</span>
              <span className="font-bold text-[#1A1D2B]">£{offer.pricing.airline.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5C6378] font-semibold">JetMeAway fee</span>
              <span className="font-bold text-[#1A1D2B]">£{MARKUP_GBP.toFixed(2)}</span>
            </div>
            <div className="border-t border-[#F1F3F7] pt-2.5 flex justify-between">
              <span className="font-poppins font-black text-[#1A1D2B]">Per person</span>
              <span className="font-poppins font-black text-green-600 text-[1.1rem]">{offer.pricing.display}</span>
            </div>
            {offer.passengerCount > 1 && (
              <div className="flex justify-between text-[.72rem]">
                <span className="text-[#8E95A9] font-semibold">&times; {offer.passengerCount} passengers</span>
                <span className="font-bold text-[#1A1D2B]">£{offer.totalForAll.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Conditions */}
          <div className="border-t border-[#F1F3F7] mt-4 pt-3 space-y-1.5">
            <div className="flex items-center gap-2 text-[.68rem] font-semibold">
              <span className={offer.refundable ? 'text-green-600' : 'text-[#8E95A9]'}>
                {offer.refundable ? '✓' : '✕'}
              </span>
              <span className={offer.refundable ? 'text-green-700' : 'text-[#8E95A9]'}>
                {offer.refundable ? 'Refundable' : 'Non-refundable'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[.68rem] font-semibold">
              <span className={offer.changeable ? 'text-green-600' : 'text-[#8E95A9]'}>
                {offer.changeable ? '✓' : '✕'}
              </span>
              <span className={offer.changeable ? 'text-green-700' : 'text-[#8E95A9]'}>
                {offer.changeable ? 'Changeable' : 'Non-changeable'}
              </span>
            </div>
          </div>

          {/* CTA — only on passenger step */}
          {step === 'passengers' && onCta && (
            <>
              <button
                onClick={onCta}
                disabled={ctaDisabled}
                className="w-full mt-5 bg-[#0066FF] hover:bg-[#0052CC] disabled:bg-[#0066FF]/50 text-white font-poppins font-bold text-[.85rem] px-6 py-3 rounded-xl transition-all shadow-[0_4px_16px_rgba(0,102,255,0.2)]"
              >
                {ctaLabel || 'Continue to Payment →'}
              </button>
              {errorMsg && (
                <p className="text-[.65rem] text-red-500 font-semibold text-center mt-2">{errorMsg}</p>
              )}
            </>
          )}
        </div>

        {/* Trust badges */}
        <div className="bg-[#F8FAFC] border border-[#F1F3F7] rounded-2xl p-4">
          <div className="space-y-2 text-[.68rem] font-semibold text-[#5C6378]">
            <div className="flex items-center gap-2">
              <span className="text-green-600">🔒</span> Secure checkout — SSL encrypted
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span> Prices include all taxes &amp; fees
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span> Instant e-ticket confirmation
            </div>
            {step === 'payment' && (
              <div className="flex items-center gap-2">
                <span className="text-green-600">💳</span> Powered by Stripe via Duffel
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CHECKOUT PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function CheckoutPage() {
  const { id } = useParams<{ id: string }>();

  const [offer, setOffer] = useState<OfferData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Passenger forms
  const [passengers, setPassengers] = useState<PassengerForm[]>([]);
  const [errors, setErrors] = useState<FieldErrors[]>([]);
  const [submitted, setSubmitted] = useState(false);

  // Step management
  const [step, setStep] = useState<CheckoutStep>('passengers');

  // Payment state
  const [paymentClientToken, setPaymentClientToken] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Order state
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    bookingReference: string;
    documentsUrl: string | null;
    emailSent: boolean;
    totalPerPerson: number;
    totalAll: number;
  } | null>(null);

  const paymentSectionRef = useRef<HTMLDivElement>(null);

  // ── Fetch offer ──
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    fetch(`/api/offers/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setOffer(data.offer);
          const count = data.offer.passengerCount || 1;
          setPassengers(
            Array.from({ length: count }, () => ({
              firstName: '',
              lastName: '',
              dob: '',
              gender: '' as const,
              email: '',
              phone: '',
            }))
          );
          setErrors(Array.from({ length: count }, () => ({})));
        }
      })
      .catch(() => setError('Failed to load offer. Please try again.'))
      .finally(() => setLoading(false));
  }, [id]);

  // Update a passenger field
  const updateField = useCallback((idx: number, field: keyof PassengerForm, value: string) => {
    setPassengers(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
    setErrors(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: undefined };
      return copy;
    });
  }, []);

  // ── Build Duffel passenger array (shared by payment + order) ──
  // Lead passenger (contact email/phone) is the first ADULT in the offer.
  // The server ({@link /api/create-order}) links infants to adults via
  // `infant_passenger_id` using the `type` we pass here.
  const leadIdx = offer
    ? Math.max(0, offer.passengers.findIndex((p) => p.type === 'adult'))
    : 0;
  const buildDuffelPassengers = useCallback(() => {
    if (!offer) return [];
    return passengers.map((p, i) => ({
      id: offer.passengers[i]?.id,
      type: offer.passengers[i]?.type, // 'adult' | 'child' | 'infant_without_seat'
      given_name: p.firstName.trim(),
      family_name: p.lastName.trim(),
      born_on: p.dob,
      gender: p.gender || 'undisclosed',
      ...(i === leadIdx ? { email: p.email.trim(), phone: p.phone.trim() } : {}),
    }));
  }, [offer, passengers, leadIdx]);

  // ── Step 1: Validate passengers → create payment intent → go to step 2 ──
  const handleContinueToPayment = async () => {
    if (!offer || paymentLoading) return;

    // Validate
    const newErrors = passengers.map((p, i) =>
      validatePassenger(p, i === leadIdx, offer?.passengers[i]?.type),
    );
    setErrors(newErrors);
    setSubmitted(true);

    const hasErrors = newErrors.some(e => Object.keys(e).length > 0);
    if (hasErrors) return;

    setPaymentLoading(true);
    setPaymentError(null);

    try {
      // Create payment intent for the TOTAL amount (all passengers, with markup)
      const totalAmount = offer.totalForAll.toFixed(2);

      const res = await fetch('/api/payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalAmount,
          currency: offer.currency || 'GBP',
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setPaymentError(data.error || 'Failed to initialise payment. Please try again.');
        return;
      }

      setPaymentClientToken(data.clientToken);
      setPaymentIntentId(data.paymentIntentId);
      setStep('payment');

      // Scroll to payment section after render
      setTimeout(() => {
        paymentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    } catch {
      setPaymentError('Something went wrong. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  // ── Step 2b: Payment succeeded → create order ──
  const handlePaymentSuccess = async () => {
    if (!offer || !paymentIntentId) return;

    setStep('processing');
    setOrderLoading(true);
    setOrderError(null);

    try {
      const duffelPassengers = buildDuffelPassengers();
      const baseTotal = (offer.basePerPerson * offer.passengerCount).toFixed(2);

      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId: offer.id,
          passengers: duffelPassengers,
          paymentIntentId,
          totalAmount: baseTotal,
          currency: offer.currency || 'GBP',
          sessionId: typeof window !== 'undefined' ? (localStorage.getItem('jma_sid') || 'anon') : 'anon',
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setOrderError(data.error || 'Booking failed. Please contact support.');
        setStep('payment'); // allow retry
        return;
      }

      setConfirmation({
        bookingReference: data.bookingReference,
        documentsUrl: data.documentsUrl,
        emailSent: data.emailSent,
        totalPerPerson: data.totalPerPerson,
        totalAll: data.totalAll,
      });
      setStep('confirmed');
    } catch {
      setOrderError('An unexpected error occurred. Please contact support.');
      setStep('payment');
    } finally {
      setOrderLoading(false);
    }
  };

  // ── Step 2c: Payment failed ──
  const handlePaymentFailure = (error: any) => {
    console.error('Payment failed:', error);
    const message = error?.message || error?.decline_code || 'Your card was declined. Please try a different card.';
    setPaymentError(message);
  };

  // ── Go back to passenger step ──
  const handleBackToPassengers = () => {
    setStep('passengers');
    setPaymentError(null);
    setOrderError(null);
  };

  return (
    <>
      <Header />

      {loading && <LoadingSkeleton />}

      {error && !loading && (
        <div className="max-w-[860px] mx-auto px-5 pt-36 pb-16">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
            <span className="text-3xl mb-3 block">⏰</span>
            <h2 className="font-poppins font-black text-[1.1rem] text-[#1A1D2B] mb-2">Offer Expired</h2>
            <p className="text-[.82rem] text-[#5C6378] font-semibold mb-5">{error}</p>
            <a
              href="/flights"
              className="inline-block bg-[#0066FF] hover:bg-[#0052CC] text-white font-poppins font-bold text-[.82rem] px-6 py-2.5 rounded-xl transition-all"
            >
              Search Again →
            </a>
          </div>
        </div>
      )}

      {/* ═══════════════ CONFIRMED ═══════════════ */}
      {!loading && !error && offer && step === 'confirmed' && confirmation && (
        <div className="max-w-[680px] mx-auto px-5 pt-36 pb-16">
          {/* Success banner */}
          <div className="bg-gradient-to-br from-green-600 to-emerald-500 rounded-3xl p-8 text-center mb-6 shadow-[0_8px_32px_rgba(22,163,74,0.25)]">
            <div className="text-5xl mb-3">✓</div>
            <h1 className="font-poppins font-black text-[1.6rem] text-white mb-1">Booking Confirmed!</h1>
            <p className="text-[.82rem] text-white/80 font-semibold">Your e-ticket will be sent by the airline shortly.</p>
          </div>

          {/* Booking reference */}
          <div className="bg-white border border-[#E8ECF4] rounded-2xl p-6 mb-4 text-center">
            <div className="text-[.62rem] font-black uppercase tracking-[2px] text-[#8E95A9] mb-1">Booking Reference</div>
            <div className="font-poppins font-black text-[1.5rem] text-[#1A1D2B] tracking-[2px]">
              {confirmation.bookingReference}
            </div>
          </div>

          {/* Flight summary */}
          <div className="mb-4">
            <FlightSummary offer={offer} compact />
          </div>

          {/* Price paid */}
          <div className="bg-white border border-[#E8ECF4] rounded-2xl p-5 mb-4">
            <div className="text-[.62rem] font-black uppercase tracking-[2px] text-[#8E95A9] mb-3">Total Paid</div>
            <div className="flex justify-between items-baseline">
              <span className="text-[.78rem] text-[#5C6378] font-semibold">
                {offer.passengerCount > 1 ? `${offer.passengerCount} passengers` : '1 passenger'}
              </span>
              <span className="font-poppins font-black text-[1.3rem] text-green-600">
                £{confirmation.totalAll.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Email + Documents info */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-6 space-y-2.5">
            {confirmation.emailSent && (
              <div className="flex items-center gap-2 text-[.78rem] text-blue-700 font-semibold">
                <span>✉</span> Confirmation email sent to {passengers[leadIdx]?.email}
              </div>
            )}
            {confirmation.documentsUrl && (
              <div className="flex items-center gap-2 text-[.78rem] text-blue-700 font-semibold">
                <span>📄</span>
                <a
                  href={confirmation.documentsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-900"
                >
                  Download your e-ticket (PDF)
                </a>
              </div>
            )}
            {!confirmation.emailSent && !confirmation.documentsUrl && (
              <div className="text-[.78rem] text-blue-700 font-semibold">
                Your airline will send your e-ticket via email shortly.
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="/flights"
              className="flex-1 text-center bg-[#0066FF] hover:bg-[#0052CC] text-white font-poppins font-bold text-[.82rem] px-6 py-3 rounded-xl transition-all"
            >
              Search More Flights
            </a>
            <a
              href="/"
              className="flex-1 text-center bg-white border border-[#E8ECF4] hover:border-[#0066FF] text-[#1A1D2B] font-poppins font-bold text-[.82rem] px-6 py-3 rounded-xl transition-all"
            >
              Back to Home
            </a>
          </div>
        </div>
      )}

      {/* ═══════════════ PASSENGERS + PAYMENT STEPS ═══════════════ */}
      {!loading && !error && offer && step !== 'confirmed' && (
        <div className="max-w-[1100px] mx-auto px-5 pt-36 pb-16">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-[.72rem] font-semibold text-[#8E95A9] mb-4">
            <a href="/flights" className="hover:text-[#0066FF]">Flights</a>
            <span>›</span>
            <span className="text-[#1A1D2B]">Checkout</span>
          </div>

          {/* Step indicator */}
          <StepIndicator current={step} />

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
            {/* ── Left column ── */}
            <div className="space-y-5">

              {/* ═══ STEP 1: Passenger Details ═══ */}
              {step === 'passengers' && (
                <>
                  <h1 className="font-poppins font-black text-[1.5rem] text-[#1A1D2B] mb-1">
                    Who&apos;s flying?
                  </h1>
                  <p className="text-[.8rem] text-[#5C6378] font-semibold mb-2">
                    Enter details exactly as they appear on each passenger&apos;s passport.
                  </p>

                  {/* Flight summary */}
                  <FlightSummary offer={offer} />

                  {/* Passenger forms */}
                  {passengers.map((p, idx) => {
                    const isLead = idx === leadIdx;
                    const paxType = offer.passengers[idx]?.type || 'adult';
                    const paxTypeLabel =
                      paxType === 'infant_without_seat' ? 'infant'
                      : paxType === 'child' ? 'child'
                      : 'adult';
                    const pErr = errors[idx] || {};

                    return (
                      <div key={idx} className="bg-white border border-[#E8ECF4] rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-poppins font-black text-[.92rem] text-[#1A1D2B]">
                            {isLead ? 'Lead Passenger' : `Passenger ${idx + 1}`}
                          </h3>
                          <span className="text-[.6rem] font-black uppercase tracking-[1.5px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                            {paxTypeLabel}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* First Name */}
                          <div>
                            <label className="block text-[.68rem] font-bold text-[#5C6378] uppercase tracking-[1px] mb-1.5">
                              First Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={p.firstName}
                              onChange={e => updateField(idx, 'firstName', e.target.value)}
                              placeholder="As on passport"
                              className={`w-full border ${pErr.firstName ? 'border-red-300 bg-red-50' : 'border-[#E8ECF4]'} rounded-xl px-4 py-2.5 text-[.82rem] font-semibold text-[#1A1D2B] outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all`}
                            />
                            {pErr.firstName && <p className="text-[.62rem] text-red-500 font-semibold mt-1">{pErr.firstName}</p>}
                          </div>

                          {/* Last Name */}
                          <div>
                            <label className="block text-[.68rem] font-bold text-[#5C6378] uppercase tracking-[1px] mb-1.5">
                              Last Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={p.lastName}
                              onChange={e => updateField(idx, 'lastName', e.target.value)}
                              placeholder="As on passport"
                              className={`w-full border ${pErr.lastName ? 'border-red-300 bg-red-50' : 'border-[#E8ECF4]'} rounded-xl px-4 py-2.5 text-[.82rem] font-semibold text-[#1A1D2B] outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all`}
                            />
                            {pErr.lastName && <p className="text-[.62rem] text-red-500 font-semibold mt-1">{pErr.lastName}</p>}
                          </div>

                          {/* Date of Birth */}
                          <div>
                            <label className="block text-[.68rem] font-bold text-[#5C6378] uppercase tracking-[1px] mb-1.5">
                              Date of Birth <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="date"
                              value={p.dob}
                              onChange={e => updateField(idx, 'dob', e.target.value)}
                              max={new Date().toISOString().split('T')[0]}
                              className={`w-full border ${pErr.dob ? 'border-red-300 bg-red-50' : 'border-[#E8ECF4]'} rounded-xl px-4 py-2.5 text-[.82rem] font-semibold text-[#1A1D2B] outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all`}
                            />
                            {pErr.dob && <p className="text-[.62rem] text-red-500 font-semibold mt-1">{pErr.dob}</p>}
                          </div>

                          {/* Gender */}
                          <div>
                            <label className="block text-[.68rem] font-bold text-[#5C6378] uppercase tracking-[1px] mb-1.5">
                              Gender <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={p.gender}
                              onChange={e => updateField(idx, 'gender', e.target.value)}
                              className={`w-full border ${pErr.gender ? 'border-red-300 bg-red-50' : 'border-[#E8ECF4]'} rounded-xl px-4 py-2.5 text-[.82rem] font-semibold text-[#1A1D2B] outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all bg-white`}
                            >
                              <option value="">Select gender</option>
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                              <option value="undisclosed">Prefer not to say</option>
                            </select>
                            {pErr.gender && <p className="text-[.62rem] text-red-500 font-semibold mt-1">{pErr.gender}</p>}
                          </div>

                          {/* Email (lead only) */}
                          {isLead && (
                            <div>
                              <label className="block text-[.68rem] font-bold text-[#5C6378] uppercase tracking-[1px] mb-1.5">
                                Email <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="email"
                                value={p.email}
                                onChange={e => updateField(idx, 'email', e.target.value)}
                                placeholder="you@example.com"
                                className={`w-full border ${pErr.email ? 'border-red-300 bg-red-50' : 'border-[#E8ECF4]'} rounded-xl px-4 py-2.5 text-[.82rem] font-semibold text-[#1A1D2B] outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all`}
                              />
                              {pErr.email && <p className="text-[.62rem] text-red-500 font-semibold mt-1">{pErr.email}</p>}
                            </div>
                          )}

                          {/* Phone (lead only) */}
                          {isLead && (
                            <div>
                              <label className="block text-[.68rem] font-bold text-[#5C6378] uppercase tracking-[1px] mb-1.5">
                                Phone <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="tel"
                                value={p.phone}
                                onChange={e => updateField(idx, 'phone', e.target.value)}
                                placeholder="+44 7700 900000"
                                className={`w-full border ${pErr.phone ? 'border-red-300 bg-red-50' : 'border-[#E8ECF4]'} rounded-xl px-4 py-2.5 text-[.82rem] font-semibold text-[#1A1D2B] outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all`}
                              />
                              {pErr.phone && <p className="text-[.62rem] text-red-500 font-semibold mt-1">{pErr.phone}</p>}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Payment init error */}
                  {paymentError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                      <p className="text-[.78rem] text-red-600 font-semibold">{paymentError}</p>
                    </div>
                  )}

                  {/* Mobile CTA */}
                  <div className="lg:hidden">
                    <button
                      onClick={handleContinueToPayment}
                      disabled={paymentLoading}
                      className="w-full bg-[#0066FF] hover:bg-[#0052CC] disabled:bg-[#0066FF]/50 text-white font-poppins font-bold text-[.88rem] px-6 py-3.5 rounded-xl transition-all shadow-[0_4px_16px_rgba(0,102,255,0.2)]"
                    >
                      {paymentLoading ? 'Loading payment...' : 'Continue to Payment →'}
                    </button>
                    {submitted && errors.some(e => Object.keys(e).length > 0) && (
                      <p className="text-[.7rem] text-red-500 font-semibold text-center mt-2">
                        Please fix the errors above before continuing.
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* ═══ STEP 2: Payment ═══ */}
              {(step === 'payment' || step === 'processing') && (
                <div ref={paymentSectionRef}>
                  <div className="flex items-center justify-between mb-4">
                    <h1 className="font-poppins font-black text-[1.5rem] text-[#1A1D2B]">
                      Payment
                    </h1>
                    <button
                      onClick={handleBackToPassengers}
                      className="text-[.72rem] font-bold text-[#0066FF] hover:text-[#0052CC] transition-all"
                    >
                      ← Edit passengers
                    </button>
                  </div>

                  {/* Passenger summary (collapsed) */}
                  <div className="bg-[#F8FAFC] border border-[#F1F3F7] rounded-2xl p-4 mb-5">
                    <div className="text-[.62rem] font-black uppercase tracking-[2px] text-[#8E95A9] mb-2">Passengers</div>
                    <div className="space-y-1">
                      {passengers.map((p, i) => (
                        <div key={i} className="text-[.78rem] font-semibold text-[#1A1D2B]">
                          {p.firstName} {p.lastName}
                          {i === 0 && <span className="text-[.62rem] text-[#8E95A9] ml-2">(Lead)</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Flight summary */}
                  <div className="mb-5">
                    <FlightSummary offer={offer} compact />
                  </div>

                  {/* Processing overlay */}
                  {step === 'processing' && (
                    <div className="bg-white border border-[#E8ECF4] rounded-2xl p-8 text-center">
                      <div className="animate-spin w-10 h-10 border-4 border-[#0066FF] border-t-transparent rounded-full mx-auto mb-4" />
                      <h3 className="font-poppins font-black text-[1rem] text-[#1A1D2B] mb-1">
                        Booking your flight...
                      </h3>
                      <p className="text-[.78rem] text-[#5C6378] font-semibold">
                        Payment received. Confirming with the airline — please don&apos;t close this page.
                      </p>
                    </div>
                  )}

                  {/* Order creation error */}
                  {orderError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center mb-4">
                      <p className="text-[.78rem] text-red-600 font-semibold mb-1">{orderError}</p>
                      <p className="text-[.68rem] text-red-500">Your payment was processed. Contact <a href="mailto:waqar@jetmeaway.co.uk" className="underline">waqar@jetmeaway.co.uk</a> for assistance.</p>
                    </div>
                  )}

                  {/* Payment card error */}
                  {paymentError && step === 'payment' && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <span className="text-red-500 text-lg leading-none mt-0.5">✕</span>
                        <div>
                          <p className="text-[.82rem] text-red-700 font-bold mb-0.5">Payment declined</p>
                          <p className="text-[.72rem] text-red-600 font-semibold">{paymentError}</p>
                          <p className="text-[.68rem] text-red-500 mt-1">Please check your card details and try again, or use a different card.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Duffel Payments Card Element */}
                  {step === 'payment' && paymentClientToken && (
                    <div className="bg-white border border-[#E8ECF4] rounded-2xl p-6 shadow-[0_2px_16px_rgba(0,102,255,0.06)]">
                      <div className="flex items-center gap-2 mb-5">
                        <span className="text-lg">💳</span>
                        <h3 className="font-poppins font-black text-[.92rem] text-[#1A1D2B]">
                          Card Details
                        </h3>
                      </div>

                      <div className="text-[.72rem] text-[#5C6378] font-semibold mb-4">
                        Total charge: <span className="text-[#1A1D2B] font-black">£{offer.totalForAll.toFixed(2)}</span>
                      </div>

                      <DuffelPayments
                        paymentIntentClientToken={paymentClientToken}
                        onSuccessfulPayment={handlePaymentSuccess}
                        onFailedPayment={handlePaymentFailure}
                        styles={{
                          accentColor: '#0066FF',
                          fontFamily: 'Poppins, system-ui, sans-serif',
                          buttonCornerRadius: '12px',
                        }}
                      />

                      <div className="mt-4 pt-4 border-t border-[#F1F3F7] flex items-center gap-2 text-[.65rem] text-[#8E95A9] font-semibold">
                        <span>🔒</span> Payments are securely processed via Stripe. JetMeAway never sees your card number.
                      </div>
                    </div>
                  )}

                  {/* Mobile price reminder */}
                  <div className="lg:hidden mt-5 bg-[#F8FAFC] border border-[#F1F3F7] rounded-2xl p-4">
                    <div className="flex justify-between items-baseline">
                      <span className="text-[.78rem] text-[#5C6378] font-semibold">Total to pay</span>
                      <span className="font-poppins font-black text-[1.1rem] text-green-600">£{offer.totalForAll.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Right: Price Sidebar ── */}
            <PriceSidebar
              offer={offer}
              step={step}
              onCta={handleContinueToPayment}
              ctaDisabled={paymentLoading}
              ctaLabel={paymentLoading ? 'Loading payment...' : 'Continue to Payment →'}
              errorMsg={submitted && errors.some(e => Object.keys(e).length > 0) ? 'Please fix the errors above.' : null}
            />
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
