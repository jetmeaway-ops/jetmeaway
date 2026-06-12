'use client';

/**
 * Interactive From -> To flight picker for the /world-cup-2026 page.
 * Navigates to JetMeAway's OWN flight search (/flights, Duffel direct) — no
 * affiliate redirect. The only client island on the page.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WC_CITIES, WC_DATES } from '@/data/world-cup-cities';

export default function FlightPicker() {
  const router = useRouter();
  const [from, setFrom] = useState('DFW'); // Dallas — England's opener
  const [to, setTo] = useState('BOS'); // Boston — England's 2nd
  const [dep, setDep] = useState<string>(WC_DATES.flightDep);
  const [adults, setAdults] = useState(1);

  const sameCity = from === to;

  const search = () => {
    if (sameCity) return;
    router.push(`/flights?origin=${from}&dest=${to}&departure=${dep}&adults=${adults}`);
  };

  const selectCls =
    'w-full rounded-xl border border-[#E8ECF4] bg-white px-3.5 py-3 font-poppins text-[.9rem] font-semibold text-[#1A1D2B] focus:border-[#0066FF] focus:outline-none';

  return (
    <div className="rounded-3xl border border-[#E8ECF4] bg-white p-5 md:p-7 shadow-[0_12px_40px_-12px_rgba(0,102,255,0.14)]">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="mb-1.5 block text-[.7rem] font-bold uppercase tracking-[1.5px] text-[#8E95A9]">From</span>
          <select className={selectCls} value={from} onChange={(e) => setFrom(e.target.value)}>
            {WC_CITIES.map((c) => (
              <option key={`f-${c.slug}`} value={c.iata[0]}>
                {c.flag} {c.shortName} ({c.iata[0]})
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[.7rem] font-bold uppercase tracking-[1.5px] text-[#8E95A9]">To</span>
          <select className={selectCls} value={to} onChange={(e) => setTo(e.target.value)}>
            {WC_CITIES.map((c) => (
              <option key={`t-${c.slug}`} value={c.iata[0]}>
                {c.flag} {c.shortName} ({c.iata[0]})
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[.7rem] font-bold uppercase tracking-[1.5px] text-[#8E95A9]">Depart</span>
          <input
            type="date"
            className={selectCls}
            value={dep}
            min="2026-06-11"
            max="2026-07-19"
            onChange={(e) => setDep(e.target.value)}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[.7rem] font-bold uppercase tracking-[1.5px] text-[#8E95A9]">Travellers</span>
          <select className={selectCls} value={adults} onChange={(e) => setAdults(Number(e.target.value))}>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>{n} adult{n > 1 ? 's' : ''}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-5 flex justify-center">
        <button
          type="button"
          disabled={sameCity}
          onClick={search}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0066FF] to-[#0052CC] px-7 py-3.5 font-poppins text-[.95rem] font-black text-white shadow-[0_8px_24px_rgba(0,102,255,0.28)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(0,102,255,0.35)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 sm:w-auto"
        >
          <i className="fa-solid fa-bolt" aria-hidden="true" />
          {sameCity ? 'Pick two different cities' : 'Search flights direct on JetMeAway'}
          {!sameCity && <i className="fa-solid fa-arrow-right text-[.8rem]" aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}
