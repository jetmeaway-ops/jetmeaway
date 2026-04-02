'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const PROVIDERS = [
  {
    name: 'Booking.com',
    logo: '🏨',
    desc: 'World\'s largest hotel platform — 28M+ listings.',
    badge: '#1 Worldwide',
    getUrl: (city: string, cin: string, cout: string, guests: string) =>
      `https://tp.media/r?campaign_id=7&marker=714449&trs=512633&p=1&u=https%3A%2F%2Fwww.booking.com%2Fsearchresults.html%3Fss%3D${encodeURIComponent(city)}%26checkin%3D${cin}%26checkout%3D${cout}%26group_adults%3D${guests}%26no_rooms%3D1`,
  },
  {
    name: 'Expedia',
    logo: '🌍',
    desc: 'Bundle with flights for exclusive member discounts.',
    badge: 'Bundle Deals',
    getUrl: (city: string, cin: string, cout: string, guests: string) =>
      `https://tp.media/r?campaign_id=8&marker=714449&trs=512633&p=590&u=https%3A%2F%2Fwww.expedia.co.uk%2FHotel-Search%3Fdestination%3D${encodeURIComponent(city)}%26startDate%3D${cin}%26endDate%3D${cout}%26adults%3D${guests}`,
  },
  {
    name: 'Hotels.com',
    logo: '🔑',
    desc: 'Collect 10 nights, get 1 free with rewards.',
    badge: 'Loyalty Rewards',
    getUrl: (city: string, cin: string, cout: string, guests: string) =>
      `https://tp.media/r?campaign_id=8&marker=714449&trs=512633&p=590&u=https%3A%2F%2Fwww.hotels.com%2Fsearch%2Fresult%3Fq-destination%3D${encodeURIComponent(city)}%26q-check-in%3D${cin}%26q-check-out%3D${cout}`,
  },
  {
    name: 'Trip.com',
    logo: '🗺',
    desc: 'Exclusive Asian hotel deals & flash sales.',
    badge: 'Asia Deals',
    getUrl: (city: string, cin: string, cout: string) =>
      `https://tp.media/r?campaign_id=336&marker=714449&trs=512633&p=6589&u=https%3A%2F%2Fuk.trip.com%2Fhotels%2Flist%3FcityName%3D${encodeURIComponent(city)}%26checkin%3D${cin}%26checkout%3D${cout}`,
  },
  {
    name: 'Agoda',
    logo: '🌸',
    desc: 'Best prices across Asia, Europe & Middle East.',
    badge: 'Asia Specialist',
    getUrl: (city: string, cin: string, cout: string, guests: string) =>
      `https://www.agoda.com/search?city=${encodeURIComponent(city)}&checkIn=${cin}&checkOut=${cout}&adults=${guests}`,
  },
  {
    name: 'Hostelworld',
    logo: '🎒',
    desc: 'Best hostels & budget stays for solo travellers.',
    badge: 'Budget Stays',
    getUrl: (city: string, cin: string, cout: string) =>
      `https://www.hostelworld.com/search?search_keywords=${encodeURIComponent(city)}&date_from=${cin}&date_to=${cout}`,
  },
];

export default function HotelsPage() {
  const [city, setCity] = useState('');
  const [checkin, setCheckin] = useState('');
  const [checkout, setCheckout] = useState('');
  const [guests, setGuests] = useState('2');
  const [rooms, setRooms] = useState('1');

  const today = new Date().toISOString().split('T')[0];

  function openAll() {
    if (!city || !checkin || !checkout) { alert('Please enter destination and dates'); return; }
    PROVIDERS.forEach((p, i) => {
      setTimeout(() => window.open(p.getUrl(city, checkin, checkout, guests), '_blank', 'noopener'), i * 200);
    });
  }

  return (
    <>
      <Header />

      <section className="pt-36 pb-16 px-5 bg-[radial-gradient(ellipse_at_top,#FFF0E8_0%,#fff_55%,#F8FAFC_100%)] relative">
        <div className="max-w-[860px] mx-auto text-center mb-10">
          <span className="inline-block bg-orange-50 text-orange-500 text-[.65rem] font-black uppercase tracking-[2.5px] px-3.5 py-1.5 rounded-full mb-4">🏨 Hotel Comparison</span>
          <h1 className="font-[Poppins] text-[2.6rem] md:text-[3.8rem] font-black text-[#1A1D2B] leading-[1.05] tracking-tight mb-3">
            Best Hotel <em className="italic bg-gradient-to-br from-orange-400 to-rose-500 bg-clip-text text-transparent">Rates</em>
          </h1>
          <p className="text-[1rem] text-[#8E95A9] font-semibold max-w-[520px] mx-auto">Compare 6 booking platforms — from luxury resorts to budget stays.</p>
        </div>

        <div className="max-w-[860px] mx-auto bg-white border border-[#E8ECF4] rounded-3xl p-6 shadow-[0_8px_40px_rgba(0,0,0,0.07)]">
          <div className="mb-3">
            <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Destination</label>
            <input type="text" placeholder="City, region or hotel name — e.g. Dubai, Paris, Maldives"
              value={city} onChange={e => setCity(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.9rem] font-semibold text-[#1A1D2B] outline-none focus:border-orange-400 focus:bg-white transition-all placeholder:text-[#B0B8CC] placeholder:font-medium" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Check-in</label>
              <input type="date" min={today} value={checkin} onChange={e => setCheckin(e.target.value)}
                className="w-full px-3 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.82rem] font-semibold text-[#1A1D2B] outline-none focus:border-orange-400 focus:bg-white transition-all" />
            </div>
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Check-out</label>
              <input type="date" min={checkin || today} value={checkout} onChange={e => setCheckout(e.target.value)}
                className="w-full px-3 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.82rem] font-semibold text-[#1A1D2B] outline-none focus:border-orange-400 focus:bg-white transition-all" />
            </div>
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Guests</label>
              <select value={guests} onChange={e => setGuests(e.target.value)}
                className="w-full px-3 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.82rem] font-semibold text-[#1A1D2B] outline-none focus:border-orange-400 focus:bg-white transition-all">
                {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} guest{n > 1 ? 's' : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Rooms</label>
              <select value={rooms} onChange={e => setRooms(e.target.value)}
                className="w-full px-3 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.82rem] font-semibold text-[#1A1D2B] outline-none focus:border-orange-400 focus:bg-white transition-all">
                {[1,2,3,4].map(n => <option key={n} value={n}>{n} room{n > 1 ? 's' : ''}</option>)}
              </select>
            </div>
          </div>
          <button onClick={openAll}
            className="w-full bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-[Poppins] font-black text-[.95rem] py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(249,115,22,0.3)]">
            Compare {PROVIDERS.length} Hotel Platforms →
          </button>
          <p className="text-center text-[.68rem] text-[#8E95A9] font-semibold mt-2.5">No booking fees. We compare so you don't have to.</p>
        </div>
      </section>

      <section className="max-w-[1100px] mx-auto px-5 pb-16">
        <p className="text-[.65rem] font-extrabold uppercase tracking-[3px] text-[#8E95A9] mb-1.5">All Providers</p>
        <h2 className="font-[Poppins] text-[1.4rem] font-black text-[#1A1D2B] mb-6">6 Hotel Booking Platforms</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PROVIDERS.map(p => (
            <a key={p.name} href={city && checkin && checkout ? p.getUrl(city, checkin, checkout, guests) : '#'}
              onClick={e => { if (!city || !checkin || !checkout) { e.preventDefault(); alert('Fill in the search form above first'); } }}
              target="_blank" rel="noopener"
              className="block p-5 bg-white border border-[#F1F3F7] rounded-2xl hover:border-orange-200 hover:shadow-md transition-all group">
              <div className="text-2xl mb-3">{p.logo}</div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="font-[Poppins] font-extrabold text-[.92rem] text-[#1A1D2B]">{p.name}</span>
                <span className="text-[.58rem] font-black uppercase tracking-[1.5px] px-2 py-0.5 rounded-full bg-orange-50 text-orange-500">{p.badge}</span>
              </div>
              <p className="text-[.75rem] text-[#5C6378] font-semibold leading-relaxed mb-3">{p.desc}</p>
              <span className="text-[.72rem] font-black text-orange-500 group-hover:underline">Search Hotels →</span>
            </a>
          ))}
        </div>
      </section>

      <section className="max-w-[860px] mx-auto px-5 pb-16">
        <div className="bg-[#F8FAFC] border border-[#F1F3F7] rounded-3xl p-8">
          <h3 className="font-[Poppins] font-black text-[1.05rem] text-[#1A1D2B] mb-4">Tips for Getting the Best Hotel Rate</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              ['Book directly after comparing', 'Some hotels offer price-match if you show a cheaper rate from a comparison site.'],
              ['Check cancellation policy', 'Always prefer free cancellation — prices are often the same or just slightly higher.'],
              ['Sunday check-ins are cheapest', 'Business hotels drop rates dramatically on weekends when corporate demand falls.'],
              ['Join loyalty programmes for free', 'Booking.com Genius, Hotels.com Rewards — free tiers still unlock 10–15% off.'],
            ].map(([title, body]) => (
              <div key={title} className="flex gap-3">
                <div className="w-1.5 flex-shrink-0 rounded-full bg-gradient-to-b from-orange-400 to-rose-500 self-stretch" />
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
