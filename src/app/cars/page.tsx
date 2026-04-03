'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const PROVIDERS = [
  {
    name: 'Economy Bookings',
    logo: '🚗',
    desc: 'Lowest-price guarantee across 30,000+ locations.',
    badge: 'Cheapest Rates',
    getUrl: (loc: string, pickup: string, dropoff: string) =>
      `https://tp.media/r?campaign_id=203&marker=714449&trs=512633&p=4567&u=https%3A%2F%2Fwww.economybookings.com%2Fsearch%3Fpickup_location%3D${encodeURIComponent(loc)}%26pickup_date%3D${pickup}%26dropoff_date%3D${dropoff}`,
  },
  {
    name: 'Rentalcars.com',
    logo: '🔑',
    desc: 'Trusted by 5M+ travellers. Compare 900+ suppliers.',
    badge: 'Most Trusted',
    getUrl: (loc: string, pickup: string, dropoff: string) =>
      `https://tp.media/r?campaign_id=203&marker=714449&trs=512633&p=3380&u=https%3A%2F%2Fwww.rentalcars.com%2Fsearch%3FpickUpLocation%3D${encodeURIComponent(loc)}%26pickUpDate%3D${pickup}%26dropOffDate%3D${dropoff}`,
  },
  {
    name: 'Discover Cars',
    logo: '🔭',
    desc: 'No hidden fees — what you see is what you pay.',
    badge: 'No Hidden Fees',
    getUrl: (loc: string, pickup: string, dropoff: string) =>
      `https://tp.media/r?campaign_id=203&marker=714449&trs=512633&p=5983&u=https%3A%2F%2Fwww.discovercars.com%2Fcars%2F${encodeURIComponent(loc)}%3Ffrom%3D${pickup}%26to%3D${dropoff}`,
  },
  {
    name: 'Localrent',
    logo: '🗺',
    desc: 'Local suppliers = much cheaper rates, same quality.',
    badge: 'Local Deals',
    getUrl: (loc: string, pickup: string, dropoff: string) =>
      `https://tp.media/r?campaign_id=203&marker=714449&trs=512633&p=6105&u=https%3A%2F%2Flocalrent.com%2Fcars%2F${encodeURIComponent(loc)}%3FstartDate%3D${pickup}%26endDate%3D${dropoff}`,
  },
  {
    name: 'Qeeq',
    logo: '⚡',
    desc: 'Flash prices & instant confirmation at 50,000+ locations.',
    badge: 'Instant Booking',
    getUrl: (loc: string, pickup: string, dropoff: string) =>
      `https://tp.media/r?campaign_id=203&marker=714449&trs=512633&p=6205&u=https%3A%2F%2Fwww.qeeq.com%2Fsearch%3FpickupLocation%3D${encodeURIComponent(loc)}%26startDate%3D${pickup}%26endDate%3D${dropoff}`,
  },
  {
    name: 'GetRentaCar',
    logo: '🌐',
    desc: 'Best for exotic destinations & 24/7 support.',
    badge: 'Worldwide',
    getUrl: (loc: string, pickup: string, dropoff: string) =>
      `https://tp.media/r?campaign_id=203&marker=714449&trs=512633&p=5437&u=https%3A%2F%2Fgetrentacar.com%2Fsearch%3Flocation%3D${encodeURIComponent(loc)}%26pickup%3D${pickup}%26dropoff%3D${dropoff}`,
  },
];

export default function CarsPage() {
  const [location, setLocation] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [dropoffDate, setDropoffDate] = useState('');
  const [pickupTime, setPickupTime] = useState('10:00');
  const [dropoffTime, setDropoffTime] = useState('10:00');
  const [driverAge, setDriverAge] = useState('30-65');

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const loc = p.get('location');
    const pickup = p.get('pickup');
    const dropoff = p.get('dropoff');
    if (loc) setLocation(loc);
    if (pickup) setPickupDate(pickup);
    if (dropoff) setDropoffDate(dropoff);
  }, []);

  const today = new Date().toISOString().split('T')[0];

  function openAll() {
    if (!location || !pickupDate || !dropoffDate) { alert('Please enter pickup location and dates'); return; }
    PROVIDERS.forEach((p, i) => {
      setTimeout(() => window.open(p.getUrl(location, pickupDate, dropoffDate), '_blank', 'noopener'), i * 200);
    });
  }

  return (
    <>
      <Header />

      <section className="pt-36 pb-16 px-5 bg-[radial-gradient(ellipse_at_top,#E8F8EE_0%,#fff_55%,#F8FAFC_100%)] relative">
        <div className="max-w-[860px] mx-auto text-center mb-10">
          <span className="inline-block bg-emerald-50 text-emerald-600 text-[.65rem] font-black uppercase tracking-[2.5px] px-3.5 py-1.5 rounded-full mb-4">🚗 Car Rental Comparison</span>
          <h1 className="font-[Poppins] text-[2.6rem] md:text-[3.8rem] font-black text-[#1A1D2B] leading-[1.05] tracking-tight mb-3">
            Hire a Car <em className="italic bg-gradient-to-br from-emerald-500 to-teal-500 bg-clip-text text-transparent">Anywhere</em>
          </h1>
          <p className="text-[1rem] text-[#8E95A9] font-semibold max-w-[520px] mx-auto">Compare 6 car rental platforms — no hidden fees, best prices guaranteed.</p>
        </div>

        <div className="max-w-[860px] mx-auto bg-white border border-[#E8ECF4] rounded-3xl p-6 shadow-[0_8px_40px_rgba(0,0,0,0.07)]">
          <div className="mb-3">
            <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Pickup Location</label>
            <input type="text" placeholder="Airport, city or address — e.g. Malaga Airport, Dubai, Rome"
              value={location} onChange={e => setLocation(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.9rem] font-semibold text-[#1A1D2B] outline-none focus:border-emerald-500 focus:bg-white transition-all placeholder:text-[#B0B8CC] placeholder:font-medium" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Pickup Date</label>
              <input type="date" min={today} value={pickupDate} onChange={e => setPickupDate(e.target.value)}
                className="w-full px-3 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.82rem] font-semibold text-[#1A1D2B] outline-none focus:border-emerald-500 focus:bg-white transition-all" />
            </div>
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Pickup Time</label>
              <input type="time" value={pickupTime} onChange={e => setPickupTime(e.target.value)}
                className="w-full px-3 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.82rem] font-semibold text-[#1A1D2B] outline-none focus:border-emerald-500 focus:bg-white transition-all" />
            </div>
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Return Date</label>
              <input type="date" min={pickupDate || today} value={dropoffDate} onChange={e => setDropoffDate(e.target.value)}
                className="w-full px-3 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.82rem] font-semibold text-[#1A1D2B] outline-none focus:border-emerald-500 focus:bg-white transition-all" />
            </div>
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Driver Age</label>
              <select value={driverAge} onChange={e => setDriverAge(e.target.value)}
                className="w-full px-3 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.82rem] font-semibold text-[#1A1D2B] outline-none focus:border-emerald-500 focus:bg-white transition-all">
                <option value="18-24">18–24 (young driver)</option>
                <option value="25-29">25–29</option>
                <option value="30-65">30–65</option>
                <option value="66+">66+</option>
              </select>
            </div>
          </div>
          <button onClick={openAll}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-[Poppins] font-black text-[.95rem] py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(16,185,129,0.3)]">
            Compare {PROVIDERS.length} Car Rental Platforms →
          </button>
          <p className="text-center text-[.68rem] text-[#8E95A9] font-semibold mt-2.5">No booking fees added. Prices include taxes where possible.</p>
        </div>
      </section>

      <section className="max-w-[1100px] mx-auto px-5 pb-16">
        <p className="text-[.65rem] font-extrabold uppercase tracking-[3px] text-[#8E95A9] mb-1.5">All Providers</p>
        <h2 className="font-[Poppins] text-[1.4rem] font-black text-[#1A1D2B] mb-6">6 Car Rental Platforms</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PROVIDERS.map(p => (
            <a key={p.name} href={location && pickupDate && dropoffDate ? p.getUrl(location, pickupDate, dropoffDate) : '#'}
              onClick={e => { if (!location || !pickupDate || !dropoffDate) { e.preventDefault(); alert('Fill in the search form above first'); } }}
              target="_blank" rel="noopener"
              className="block p-5 bg-white border border-[#F1F3F7] rounded-2xl hover:border-emerald-200 hover:shadow-md transition-all group">
              <div className="text-2xl mb-3">{p.logo}</div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="font-[Poppins] font-extrabold text-[.92rem] text-[#1A1D2B]">{p.name}</span>
                <span className="text-[.58rem] font-black uppercase tracking-[1.5px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">{p.badge}</span>
              </div>
              <p className="text-[.75rem] text-[#5C6378] font-semibold leading-relaxed mb-3">{p.desc}</p>
              <span className="text-[.72rem] font-black text-emerald-600 group-hover:underline">Compare Cars →</span>
            </a>
          ))}
        </div>
      </section>

      <section className="max-w-[860px] mx-auto px-5 pb-16">
        <div className="bg-[#F8FAFC] border border-[#F1F3F7] rounded-3xl p-8">
          <h3 className="font-[Poppins] font-black text-[1.05rem] text-[#1A1D2B] mb-4">Tips for Cheaper Car Rentals</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              ['Book early, pick up off-airport', 'Off-airport depots are 20–40% cheaper. Take a taxi from arrivals — still worth it.'],
              ['Always take full-to-full fuel', 'Return with a full tank — "full-to-empty" deals sound cheap but rarely are.'],
              ['Decline excess waiver at the desk', 'Buy third-party excess insurance for ~£3/day instead of £15–25/day at the counter.'],
              ['Under 25? Use specialist sites', 'Economy Bookings & Qeeq have younger driver surcharges that are 30–50% lower.'],
            ].map(([title, body]) => (
              <div key={title} className="flex gap-3">
                <div className="w-1.5 flex-shrink-0 rounded-full bg-gradient-to-b from-emerald-500 to-teal-500 self-stretch" />
                <div>
                  <div className="font-[Poppins] font-bold text-[.85rem] text-[#1A1D2B] mb-0.5">{title}</div>
                  <p className="text-[.75rem] text-[#5C6378] font-semibold leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
