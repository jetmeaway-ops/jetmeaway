'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const PROVIDERS = [
  {
    name: 'Booking.com',
    logo: '🏨',
    badge: '#1 Worldwide',
    highlight: '28M+ properties · Free cancellation options',
    fromPrice: 'From £45/night',
    getUrl: (city: string, cin: string, cout: string, guests: string) =>
      `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(city)}&checkin=${cin}&checkout=${cout}&group_adults=${guests}&no_rooms=1`,
  },
  {
    name: 'Expedia',
    logo: '🌍',
    badge: 'Bundle & Save',
    highlight: 'Save up to 30% when you add a flight',
    fromPrice: 'From £52/night',
    getUrl: (city: string, cin: string, cout: string, guests: string) =>
      `https://www.expedia.co.uk/Hotel-Search?destination=${encodeURIComponent(city)}&startDate=${cin}&endDate=${cout}&adults=${guests}`,
  },
  {
    name: 'Hotels.com',
    logo: '🔑',
    badge: 'Loyalty Rewards',
    highlight: 'Collect 10 nights, get 1 free',
    fromPrice: 'From £48/night',
    getUrl: (city: string, cin: string, cout: string) =>
      `https://www.hotels.com/search/result?q-destination=${encodeURIComponent(city)}&q-check-in=${cin}&q-check-out=${cout}`,
  },
  {
    name: 'Trip.com',
    logo: '🗺',
    badge: 'Asia Deals',
    highlight: 'Exclusive flash sales · Great for Asia routes',
    fromPrice: 'From £38/night',
    getUrl: (city: string, cin: string, cout: string) =>
      `https://uk.trip.com/hotels/list?cityName=${encodeURIComponent(city)}&checkin=${cin}&checkout=${cout}`,
  },
  {
    name: 'Agoda',
    logo: '🌸',
    badge: 'Asia Specialist',
    highlight: 'Best coverage across Southeast Asia & Middle East',
    fromPrice: 'From £35/night',
    getUrl: (city: string, cin: string, cout: string, guests: string) =>
      `https://www.agoda.com/search?city=${encodeURIComponent(city)}&checkIn=${cin}&checkOut=${cout}&adults=${guests}`,
  },
  {
    name: 'Hostelworld',
    logo: '🎒',
    badge: 'Budget Stays',
    highlight: 'Best hostels, guesthouses & budget hotels',
    fromPrice: 'From £12/night',
    getUrl: (city: string, cin: string, cout: string) =>
      `https://www.hostelworld.com/search?search_keywords=${encodeURIComponent(city)}&date_from=${cin}&date_to=${cout}`,
  },
];

export default function HotelsPage() {
  const [city, setCity] = useState('');
  const [checkin, setCheckin] = useState('');
  const [checkout, setCheckout] = useState('');
  const [guests, setGuests] = useState('2');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  function handleSearch() {
    if (!city || !checkin || !checkout) { alert('Please enter destination and both dates'); return; }
    setResults(false);
    setLoading(true);
    setTimeout(() => { setLoading(false); setResults(true); }, 1500);
  }

  const nights = checkin && checkout
    ? Math.round((new Date(checkout).getTime() - new Date(checkin).getTime()) / 86400000)
    : null;

  return (
    <>
      <Header />

      {/* Hero */}
      <section className="pt-36 pb-10 px-5 bg-[radial-gradient(ellipse_at_top,#FFF0E8_0%,#fff_55%,#F8FAFC_100%)]">
        <div className="max-w-[860px] mx-auto text-center mb-8">
          <span className="inline-block bg-orange-50 text-orange-500 text-[.65rem] font-black uppercase tracking-[2.5px] px-3.5 py-1.5 rounded-full mb-4">🏨 Hotel Comparison</span>
          <h1 className="font-[Poppins] text-[2.4rem] md:text-[3.6rem] font-black text-[#1A1D2B] leading-[1.05] tracking-tight mb-3">
            Best Hotel <em className="italic bg-gradient-to-br from-orange-400 to-rose-500 bg-clip-text text-transparent">Rates</em>
          </h1>
          <p className="text-[1rem] text-[#8E95A9] font-semibold max-w-[500px] mx-auto">We search 6 platforms and show you every deal — no tab-hopping.</p>
        </div>

        {/* Search */}
        <div className="max-w-[860px] mx-auto bg-white border border-[#E8ECF4] rounded-3xl p-6 shadow-[0_8px_40px_rgba(0,0,0,0.07)]">
          <div className="mb-3">
            <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Destination</label>
            <input type="text" placeholder="City, region or hotel name — e.g. Dubai, Paris, Bali"
              value={city} onChange={e => setCity(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.9rem] font-semibold text-[#1A1D2B] outline-none focus:border-orange-400 focus:bg-white transition-all placeholder:text-[#B0B8CC]" />
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
            <div className="flex items-end">
              <button onClick={handleSearch} disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 disabled:opacity-60 text-white font-[Poppins] font-black text-[.85rem] py-3.5 rounded-xl transition-all shadow-[0_4px_16px_rgba(249,115,22,0.3)]">
                {loading ? 'Searching…' : 'Search →'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Loading */}
      {loading && (
        <section className="max-w-[860px] mx-auto px-5 py-10 text-center">
          <div className="inline-flex items-center gap-3 bg-white border border-[#F1F3F7] rounded-2xl px-6 py-4 shadow-sm">
            <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-[.85rem] font-bold text-[#5C6378]">Comparing 6 hotel platforms for <strong className="text-[#1A1D2B]">{city}</strong>…</span>
          </div>
        </section>
      )}

      {/* Results */}
      {results && (
        <section className="max-w-[1100px] mx-auto px-5 pb-6">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
            <div>
              <h2 className="font-[Poppins] font-black text-[1.3rem] text-[#1A1D2B]">
                Hotels in {city}
                {nights ? <span className="text-[#8E95A9] font-semibold text-[1rem]"> · {nights} night{nights > 1 ? 's' : ''} · {guests} guest{Number(guests) > 1 ? 's' : ''}</span> : null}
              </h2>
              <p className="text-[.75rem] text-[#8E95A9] font-semibold mt-0.5">Click any provider to see live prices and availability</p>
            </div>
            <span className="text-[.7rem] font-bold text-orange-500 bg-orange-50 px-3 py-1.5 rounded-full">{PROVIDERS.length} providers found</span>
          </div>
          <div className="flex flex-col gap-3">
            {PROVIDERS.map(p => (
              <div key={p.name} className="bg-white border border-[#F1F3F7] rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4 hover:border-orange-200 hover:shadow-md transition-all">
                <div className="text-3xl flex-shrink-0">{p.logo}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-[Poppins] font-extrabold text-[1rem] text-[#1A1D2B]">{p.name}</span>
                    <span className="text-[.6rem] font-black uppercase tracking-[1.5px] px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-500">{p.badge}</span>
                  </div>
                  <p className="text-[.78rem] text-[#5C6378] font-semibold">{p.highlight}</p>
                </div>
                <div className="flex flex-col md:items-end gap-2 flex-shrink-0">
                  <span className="font-[Poppins] font-black text-[1.1rem] text-[#1A1D2B]">{p.fromPrice}</span>
                  <a href={p.getUrl(city, checkin, checkout, guests)} target="_blank" rel="noopener"
                    className="inline-flex items-center gap-2 bg-[#0066FF] hover:bg-[#0052CC] text-white font-[Poppins] font-bold text-[.78rem] px-5 py-2.5 rounded-xl transition-all whitespace-nowrap">
                    Check Price →
                  </a>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-[.68rem] text-[#8E95A9] font-semibold mt-4">Prices are indicative. Final price confirmed on each provider's site.</p>
        </section>
      )}

      {/* Tips */}
      <section className="max-w-[860px] mx-auto px-5 pb-16">
        <div className="bg-[#F8FAFC] border border-[#F1F3F7] rounded-3xl p-8">
          <h3 className="font-[Poppins] font-black text-[1.05rem] text-[#1A1D2B] mb-4">Tips for Getting the Best Hotel Rate</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              ['Book directly after comparing', 'Show the hotel a cheaper rate from a comparison site — many will price-match.'],
              ['Free cancellation is worth it', 'Always prefer free cancellation — prices are often identical or just slightly higher.'],
              ['Sunday check-ins are cheapest', 'Business hotels drop rates dramatically on weekends when corporate demand falls.'],
              ['Join loyalty programmes', 'Booking.com Genius and Hotels.com Rewards are free and unlock 10–15% off.'],
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
