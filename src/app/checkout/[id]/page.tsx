'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { MARKUP_GBP } from '@/lib/travel-logic';

export const runtime = 'edge';

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

function validatePassenger(p: PassengerForm, isLead: boolean): FieldErrors {
  const err: FieldErrors = {};
  if (!NAME_RE.test(p.firstName.trim())) err.firstName = 'Enter a valid first name (as on passport)';
  if (!NAME_RE.test(p.lastName.trim())) err.lastName = 'Enter a valid last name (as on passport)';
  if (!p.dob || !/^\d{4}-\d{2}-\d{2}$/.test(p.dob)) {
    err.dob = 'Enter date of birth (YYYY-MM-DD)';
  } else {
    const age = (Date.now() - new Date(p.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    if (age < 0 || age > 120) err.dob = 'Enter a valid date of birth';
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
   CHECKOUT PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function CheckoutPage() {
  const { id } = useParams<{ id: string }>();

  const [offer, setOffer] = useState<OfferData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Build passenger forms array (one per passenger)
  const [passengers, setPassengers] = useState<PassengerForm[]>([]);
  const [errors, setErrors] = useState<FieldErrors[]>([]);
  const [submitted, setSubmitted] = useState(false);

  // Fetch offer
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
          // Init passenger forms
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
    // Clear error on change
    setErrors(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: undefined };
      return copy;
    });
  }, []);

  // Submit
  const handleSubmit = () => {
    if (!offer) return;

    const newErrors = passengers.map((p, i) => validatePassenger(p, i === 0));
    setErrors(newErrors);
    setSubmitted(true);

    const hasErrors = newErrors.some(e => Object.keys(e).length > 0);
    if (hasErrors) return;

    // TODO: Phase 3 — proceed to payment
    alert('Passenger details validated! Payment step coming in Phase 3.');
  };

  return (
    <>
      <Header />

      {loading && <LoadingSkeleton />}

      {error && (
        <div className="max-w-[860px] mx-auto px-5 pt-36 pb-16">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
            <span className="text-3xl mb-3 block">⏰</span>
            <h2 className="font-[Poppins] font-black text-[1.1rem] text-[#1A1D2B] mb-2">Offer Expired</h2>
            <p className="text-[.82rem] text-[#5C6378] font-semibold mb-5">{error}</p>
            <a href="/flights"
              className="inline-block bg-[#0066FF] hover:bg-[#0052CC] text-white font-[Poppins] font-bold text-[.82rem] px-6 py-2.5 rounded-xl transition-all">
              Search Again →
            </a>
          </div>
        </div>
      )}

      {!loading && !error && offer && (
        <div className="max-w-[1100px] mx-auto px-5 pt-36 pb-16">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-[.72rem] font-semibold text-[#8E95A9] mb-6">
            <a href="/flights" className="hover:text-[#0066FF]">Flights</a>
            <span>›</span>
            <span className="text-[#1A1D2B]">Passenger Details</span>
          </div>

          <h1 className="font-[Poppins] font-black text-[1.5rem] text-[#1A1D2B] mb-1">
            Who&apos;s flying?
          </h1>
          <p className="text-[.8rem] text-[#5C6378] font-semibold mb-8">
            Enter details exactly as they appear on each passenger&apos;s passport.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
            {/* ── Left: Passenger Forms ── */}
            <div className="space-y-5">
              {/* Flight summary card */}
              <div className="bg-white border border-[#E8ECF4] rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <img src={`https://pics.avs.io/60/60/${offer.airlineCode}.png`} alt={offer.airline}
                    className="w-8 h-8 object-contain rounded"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <div>
                    <div className="font-[Poppins] font-bold text-[.85rem] text-[#1A1D2B]">{offer.airline}</div>
                    <div className="text-[.65rem] text-[#8E95A9] font-semibold">{offer.cabinClass}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-[.78rem]">
                  <div>
                    <div className="font-[Poppins] font-black text-[#1A1D2B]">{fmtTime(offer.departureAt)}</div>
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
                    <div className="font-[Poppins] font-black text-[#1A1D2B]">{fmtTime(offer.arrivalAt)}</div>
                    <div className="text-[.65rem] text-[#8E95A9] font-semibold">{offer.destination}</div>
                  </div>
                </div>
                <div className="text-[.65rem] text-[#8E95A9] font-semibold mt-2">{fmtDate(offer.departureAt)}</div>
                {offer.hasReturn && (
                  <div className="border-t border-[#F1F3F7] mt-3 pt-3 flex items-center gap-4 text-[.78rem]">
                    <div>
                      <div className="font-[Poppins] font-black text-[#1A1D2B]">{fmtTime(offer.returnDepartureAt)}</div>
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
                      <div className="font-[Poppins] font-black text-[#1A1D2B]">{fmtTime(offer.returnArrivalAt)}</div>
                      <div className="text-[.65rem] text-[#8E95A9] font-semibold">{offer.origin}</div>
                    </div>
                    <div className="text-[.65rem] text-[#8E95A9] font-semibold">{fmtDate(offer.returnDepartureAt)}</div>
                  </div>
                )}
              </div>

              {/* Passenger forms */}
              {passengers.map((p, idx) => {
                const isLead = idx === 0;
                const paxType = offer.passengers[idx]?.type || 'adult';
                const pErr = errors[idx] || {};

                return (
                  <div key={idx} className="bg-white border border-[#E8ECF4] rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-[Poppins] font-black text-[.92rem] text-[#1A1D2B]">
                        {isLead ? '👤 Lead Passenger' : `👤 Passenger ${idx + 1}`}
                      </h3>
                      <span className="text-[.6rem] font-black uppercase tracking-[1.5px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                        {paxType}
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

              {/* Submit button (mobile — also shown in sidebar on desktop) */}
              <div className="lg:hidden">
                <button
                  onClick={handleSubmit}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-[Poppins] font-bold text-[.88rem] px-6 py-3.5 rounded-xl transition-all shadow-[0_4px_16px_rgba(22,163,74,0.25)]"
                >
                  Continue to Payment →
                </button>
                {submitted && errors.some(e => Object.keys(e).length > 0) && (
                  <p className="text-[.7rem] text-red-500 font-semibold text-center mt-2">
                    Please fix the errors above before continuing.
                  </p>
                )}
              </div>
            </div>

            {/* ── Right: Price Sidebar (sticky) ── */}
            <div className="hidden lg:block">
              <div className="sticky top-28 space-y-4">
                {/* Price breakdown */}
                <div className="bg-white border border-[#E8ECF4] rounded-2xl p-5 shadow-[0_2px_16px_rgba(0,102,255,0.06)]">
                  <h3 className="font-[Poppins] font-black text-[.85rem] text-[#1A1D2B] mb-4">Price Summary</h3>

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
                      <span className="font-[Poppins] font-black text-[#1A1D2B]">Per person</span>
                      <span className="font-[Poppins] font-black text-green-600 text-[1.1rem]">{offer.pricing.display}</span>
                    </div>
                    {offer.passengerCount > 1 && (
                      <div className="flex justify-between text-[.72rem]">
                        <span className="text-[#8E95A9] font-semibold">× {offer.passengerCount} passengers</span>
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

                  {/* CTA */}
                  <button
                    onClick={handleSubmit}
                    className="w-full mt-5 bg-green-600 hover:bg-green-700 text-white font-[Poppins] font-bold text-[.85rem] px-6 py-3 rounded-xl transition-all shadow-[0_4px_16px_rgba(22,163,74,0.25)]"
                  >
                    Continue to Payment →
                  </button>
                  {submitted && errors.some(e => Object.keys(e).length > 0) && (
                    <p className="text-[.65rem] text-red-500 font-semibold text-center mt-2">
                      Please fix the errors above.
                    </p>
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
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
