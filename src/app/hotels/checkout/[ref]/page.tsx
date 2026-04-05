'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createCheckoutSession } from '@/app/actions/stripe';

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

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  const handleBookAndSecure = async () => {
    if (!booking || !formOk) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      // 1) Save guest details to KV pending-booking record
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

      // 2) Create Stripe Checkout Session via server action
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      const result = await createCheckoutSession(
        { hotelPrice: booking.totalPrice, currency: booking.currency.toLowerCase() },
        {
          name: fullName,
          reference: booking.ref,
          email: email.trim(),
          departureDate: booking.checkIn,
          destination: booking.city,
        },
      );
      if (!result.success || !result.url) throw new Error(result.error || 'Could not start checkout');

      // 3) Redirect to Stripe
      window.location.assign(result.url);
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Unexpected error');
      setSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <main className="max-w-[720px] mx-auto px-5 py-16">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <p className="font-[Poppins] font-bold text-red-700">{loadError}</p>
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
      <h1 className="font-[Poppins] font-black text-[1.8rem] text-[#1A1D2B] mt-3 mb-1">Confirm your booking</h1>
      <p className="text-[.85rem] text-[#5C6378] font-semibold mb-6">Booking reference: <span className="font-mono">{booking.ref}</span></p>

      <div className="grid md:grid-cols-[1fr_320px] gap-6">
        <div className="bg-white border border-[#E8ECF4] rounded-2xl p-6">
          <h2 className="font-[Poppins] font-black text-[1.1rem] text-[#1A1D2B] mb-4">Lead guest details</h2>
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
            onClick={handleBookAndSecure}
            disabled={!formOk || submitting}
            className="w-full mt-6 bg-[#0066FF] hover:bg-[#0052CC] disabled:opacity-60 disabled:cursor-not-allowed text-white font-[Poppins] font-black text-[.95rem] py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(0,102,255,0.3)] flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Redirecting to Stripe…
              </>
            ) : (
              <>
                <i className="fa-solid fa-lock text-[.85rem]" /> Book &amp; Secure
              </>
            )}
          </button>
          {submitError && (
            <p className="text-[.72rem] font-bold text-red-600 mt-2 text-center">{submitError}</p>
          )}
          <p className="text-[.68rem] text-[#8E95A9] mt-3 font-semibold text-center">
            You will be redirected to Stripe&apos;s secure checkout. After payment, your hotel booking is confirmed automatically.
          </p>
        </div>

        <aside className="bg-[#F8FAFC] border border-[#E8ECF4] rounded-2xl p-5 h-fit">
          {booking.thumbnail && (
            <img src={booking.thumbnail} alt={booking.hotelName}
              className="w-full h-36 object-cover rounded-xl mb-3" />
          )}
          <StarRow count={booking.stars} />
          <h3 className="font-[Poppins] font-black text-[1rem] text-[#1A1D2B] mb-1">{booking.hotelName}</h3>
          {booking.city && <p className="text-[.75rem] text-[#8E95A9] font-semibold mb-3">📍 {booking.city}</p>}
          <div className="text-[.78rem] text-[#5C6378] font-semibold space-y-1 mb-4">
            <div>Check-in: <strong className="text-[#1A1D2B]">{booking.checkIn}</strong></div>
            <div>Check-out: <strong className="text-[#1A1D2B]">{booking.checkOut}</strong></div>
            <div>{booking.nights} night{booking.nights !== 1 ? 's' : ''} · {booking.adults} guest{booking.adults !== 1 ? 's' : ''}</div>
          </div>
          <div className="border-t border-[#E8ECF4] pt-3 flex items-center justify-between">
            <span className="text-[.8rem] font-bold text-[#5C6378]">Total</span>
            <span className="font-[Poppins] font-black text-[1.3rem] text-[#1A1D2B]">
              {booking.currency === 'GBP' ? '£' : `${booking.currency} `}
              {booking.totalPrice.toFixed(2)}
            </span>
          </div>
        </aside>
      </div>
    </main>
  );
}
