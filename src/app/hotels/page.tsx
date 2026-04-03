'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const CITIES = [
  'Dubai', 'Barcelona', 'Antalya', 'Palma', 'Tenerife', 'Maldives', 'Tokyo', 'Paris',
  'New York', 'Bangkok', 'Athens', 'Lisbon', 'Rome', 'Faro', 'Gran Canaria', 'Crete',
  'Amsterdam', 'Singapore', 'Istanbul', 'Doha', 'Cancún', 'Cape Town', 'Reykjavik',
  'Vienna', 'Prague', 'London', 'Manchester', 'Edinburgh', 'Dublin', 'Nice', 'Milan',
  'Venice', 'Naples', 'Porto', 'Zürich', 'Geneva', 'Brussels', 'Copenhagen', 'Stockholm',
  'Oslo', 'Helsinki', 'Warsaw', 'Kraków', 'Budapest', 'Bucharest', 'Split', 'Dubrovnik',
  'Marrakesh', 'Cairo', 'Nairobi', 'Johannesburg', 'Mumbai', 'Bali', 'Phuket',
  'Kuala Lumpur', 'Hong Kong', 'Shanghai', 'Seoul', 'Sydney', 'Melbourne', 'Auckland',
  'Los Angeles', 'San Francisco', 'Miami', 'Las Vegas', 'Orlando', 'Toronto', 'Vancouver',
  'Havana', 'Punta Cana', 'Lima', 'Buenos Aires', 'Rio de Janeiro', 'São Paulo',
];

function CityPicker({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const q = value.toLowerCase().trim();
  const results = q.length >= 1
    ? CITIES.filter(c => c.toLowerCase().startsWith(q) || c.toLowerCase().includes(q)).slice(0, 7)
    : [];

  return (
    <div ref={ref} className="relative">
      <input type="text" placeholder={placeholder} value={value} autoComplete="off"
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => { if (results.length > 0) setOpen(true); }}
        onKeyDown={e => { if (e.key === 'Enter') setOpen(false); }}
        className="w-full px-4 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.9rem] font-semibold text-[#1A1D2B] outline-none focus:border-orange-400 focus:bg-white transition-all placeholder:text-[#B0B8CC]" />
      {open && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1.5 bg-white border border-[#E8ECF4] rounded-2xl shadow-2xl overflow-hidden">
          {results.map(c => (
            <li key={c} onMouseDown={() => { onChange(c); setOpen(false); }}
              className="px-4 py-3 hover:bg-orange-50 cursor-pointer transition-colors border-b border-[#F1F3F7] last:border-0 font-[Poppins] font-semibold text-[.88rem] text-[#1A1D2B]">
              {c}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const PROVIDERS = [
  {
    name: 'Booking.com',
    logo: '🏨',
    badge: '#1 Worldwide',
    desc: '28M+ properties worldwide with free cancellation options and no booking fees.',
    perks: ['Free cancellation on most rooms', 'No booking fees', 'Genius loyalty discounts', 'Pay at the hotel options'],
    color: 'bg-blue-600',
    getUrl: (city: string, cin: string, cout: string, adults: number, children: number) =>
      `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(city)}&checkin=${cin}&checkout=${cout}&group_adults=${adults}&group_children=${children}&no_rooms=1`,
  },
  {
    name: 'Expedia',
    logo: '🌍',
    badge: 'Bundle & Save',
    desc: 'Save up to 30% when you bundle your hotel with a flight. Member prices available.',
    perks: ['Save up to 30% on bundles', 'Expedia Rewards points', 'Price match guarantee', 'Mobile-exclusive deals'],
    color: 'bg-yellow-500',
    getUrl: (city: string, cin: string, cout: string, adults: number) => {
      const u = `https://www.expedia.co.uk/Hotel-Search?destination=${encodeURIComponent(city)}&startDate=${cin}&endDate=${cout}&adults=${adults}`;
      return `${u}&affcid=clbU3QK`;
    },
  },
  {
    name: 'Trip.com',
    logo: '🗺',
    badge: 'Flash Deals',
    desc: 'Flash sales and exclusive member prices, especially strong on Asia & Middle East.',
    perks: ['Flash sale prices', 'Exclusive member deals', 'Asia & Middle East specialist', '24/7 customer support'],
    color: 'bg-sky-500',
    getUrl: (city: string, cin: string, cout: string, adults: number, children: number) =>
      `https://uk.trip.com/hotels/list?cityName=${encodeURIComponent(city)}&checkin=${cin}&checkout=${cout}&adult=${adults}&child=${children}&Allianceid=8023009&SID=303363796&trip_sub3=D14969586`,
  },
  {
    name: 'Hotels.com',
    logo: '🛏',
    badge: 'Earn Free Nights',
    desc: 'Collect 1 stamp per night — get 1 reward night after 10 stamps. Over 500,000 properties.',
    perks: ['Earn free nights with stamps', '500,000+ properties', 'Secret Prices for members', 'Flexible date search'],
    color: 'bg-red-600',
    getUrl: (city: string, cin: string, cout: string, adults: number) =>
      `https://uk.hotels.com/Hotel-Search?destination=${encodeURIComponent(city)}&startDate=${cin}&endDate=${cout}&adults=${adults}`,
  },
  {
    name: 'Agoda',
    logo: '🏝',
    badge: 'Insider Deals',
    desc: 'Best prices for Asia-Pacific hotels. Insider deals up to 75% off rack rates.',
    perks: ['Up to 75% insider deals', 'Best Asia-Pacific coverage', 'No hidden fees', 'Reward program cashback'],
    color: 'bg-violet-600',
    getUrl: (city: string, cin: string, cout: string, adults: number) =>
      `https://www.agoda.com/search?city=${encodeURIComponent(city)}&checkIn=${cin}&checkOut=${cout}&rooms=1&adults=${adults}`,
  },
  {
    name: 'Trivago',
    logo: '🔍',
    badge: 'Price Comparison',
    desc: 'Compares 5M+ hotels across 400+ sites to find the lowest price for you.',
    perks: ['Compares 400+ booking sites', '5M+ hotels indexed', 'Price alerts', 'Deal ratings & reviews'],
    color: 'bg-emerald-600',
    getUrl: (city: string, cin: string, cout: string) =>
      `https://www.trivago.co.uk/en-GB/srl?search=hotel&location=${encodeURIComponent(city)}&checkin=${cin}&checkout=${cout}`,
  },
];

function HotelsContent() {
  const [city, setCity] = useState('');
  const [checkin, setCheckin] = useState('');
  const [checkout, setCheckout] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const c = p.get('city');
    const cin = p.get('checkin');
    const cout = p.get('checkout');
    const a = p.get('adults');
    const ch = p.get('children');
    if (c) setCity(c);
    if (cin) setCheckin(cin);
    if (cout) setCheckout(cout);
    if (a) setAdults(Math.max(1, parseInt(a)));
    if (ch) setChildren(Math.max(0, parseInt(ch)));
  }, []);

  const today = new Date().toISOString().split('T')[0];

  function handleSearch() {
    if (!city || !checkin || !checkout) { alert('Please enter destination and both dates'); return; }
    setSearched(true);
    // Scroll to results
    setTimeout(() => document.getElementById('hotel-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }

  const nights = checkin && checkout
    ? Math.max(0, Math.round((new Date(checkout).getTime() - new Date(checkin).getTime()) / 86400000))
    : null;

  function openAll() {
    if (!city || !checkin || !checkout) return;
    PROVIDERS.forEach((p, i) => {
      setTimeout(() => window.open(p.getUrl(city, checkin, checkout, adults, children), '_blank', 'noopener'), i * 200);
    });
  }

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
          <p className="text-[1rem] text-[#8E95A9] font-semibold max-w-[500px] mx-auto">Compare 6 top hotel sites side-by-side — find the cheapest room in seconds.</p>
        </div>

        {/* Search */}
        <div className="max-w-[860px] mx-auto bg-white border border-[#E8ECF4] rounded-3xl p-6 shadow-[0_8px_40px_rgba(0,0,0,0.07)]">
          <div className="mb-3">
            <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Destination</label>
            <CityPicker value={city} onChange={setCity} placeholder="City or hotel name — e.g. Dubai, Paris, Bali" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-3">
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
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Adults</label>
              <div className="flex items-center border border-[#E8ECF4] bg-[#F8FAFC] rounded-xl px-3 py-2.5 gap-2">
                <button type="button" onClick={() => setAdults(Math.max(1, adults - 1))}
                  className="w-8 h-8 rounded-full bg-white border border-[#E8ECF4] flex items-center justify-center text-[#5C6378] font-bold hover:border-orange-400 hover:text-orange-500 transition-all text-sm">−</button>
                <span className="flex-1 text-center font-[Poppins] font-black text-[.9rem] text-[#1A1D2B]">{adults}</span>
                <button type="button" onClick={() => setAdults(Math.min(10, adults + 1))}
                  className="w-8 h-8 rounded-full bg-white border border-[#E8ECF4] flex items-center justify-center text-[#5C6378] font-bold hover:border-orange-400 hover:text-orange-500 transition-all text-sm">+</button>
              </div>
            </div>
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Children</label>
              <div className="flex items-center border border-[#E8ECF4] bg-[#F8FAFC] rounded-xl px-3 py-2.5 gap-2">
                <button type="button" onClick={() => setChildren(Math.max(0, children - 1))}
                  className="w-6 h-6 rounded-full bg-white border border-[#E8ECF4] flex items-center justify-center text-[#5C6378] font-bold hover:border-orange-400 hover:text-orange-500 transition-all text-sm disabled:opacity-30" disabled={children === 0}>−</button>
                <span className="flex-1 text-center font-[Poppins] font-black text-[.9rem] text-[#1A1D2B]">{children}</span>
                <button type="button" onClick={() => setChildren(Math.min(6, children + 1))}
                  className="w-8 h-8 rounded-full bg-white border border-[#E8ECF4] flex items-center justify-center text-[#5C6378] font-bold hover:border-orange-400 hover:text-orange-500 transition-all text-sm">+</button>
              </div>
            </div>
          </div>

          <button onClick={handleSearch}
            className="w-full bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-[Poppins] font-black text-[.95rem] py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(249,115,22,0.3)]">
            Search Hotels →
          </button>
        </div>
      </section>

      {/* Search Results */}
      {searched && city && checkin && checkout && (
        <section id="hotel-results" className="max-w-[1000px] mx-auto px-5 py-10">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
            <div>
              <h2 className="font-[Poppins] font-black text-[1.3rem] text-[#1A1D2B]">
                Hotels in {city}
                {nights ? <span className="text-[#8E95A9] font-semibold text-[1rem]"> · {nights} night{nights !== 1 ? 's' : ''}</span> : null}
              </h2>
              <p className="text-[.72rem] text-[#8E95A9] font-semibold mt-0.5">
                {adults} adult{adults !== 1 ? 's' : ''}{children > 0 ? ` · ${children} child${children !== 1 ? 'ren' : ''}` : ''} · {checkin} to {checkout}
              </p>
            </div>
            <button onClick={openAll}
              className="bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-[Poppins] font-bold text-[.75rem] px-5 py-2.5 rounded-xl transition-all shadow-sm">
              Open All 6 Sites →
            </button>
          </div>

          {/* Provider cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {PROVIDERS.map((p, i) => (
              <a key={p.name} href={p.getUrl(city, checkin, checkout, adults, children)} target="_blank" rel="noopener"
                className="block bg-white border border-[#E8ECF4] rounded-2xl overflow-hidden hover:shadow-lg hover:border-orange-200 transition-all group">
                {/* Header strip */}
                <div className={`${p.color} px-5 py-3 flex items-center justify-between`}>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{p.logo}</span>
                    <span className="font-[Poppins] font-extrabold text-[.95rem] text-white">{p.name}</span>
                  </div>
                  <span className="text-[.6rem] font-black uppercase tracking-[1.5px] bg-white/20 text-white px-2.5 py-1 rounded-full">{p.badge}</span>
                </div>

                {/* Body */}
                <div className="p-5">
                  <p className="text-[.78rem] text-[#5C6378] font-semibold leading-relaxed mb-3">{p.desc}</p>

                  <ul className="space-y-1.5 mb-4">
                    {p.perks.map(perk => (
                      <li key={perk} className="flex items-start gap-2 text-[.72rem] text-[#5C6378] font-medium">
                        <span className="text-orange-400 mt-0.5 flex-shrink-0">✓</span>
                        {perk}
                      </li>
                    ))}
                  </ul>

                  <div className="flex items-center justify-between">
                    <span className="text-[.68rem] text-[#8E95A9] font-semibold">{city} · {nights || '—'} nights</span>
                    <span className="bg-gradient-to-r from-orange-500 to-rose-500 text-white font-[Poppins] font-bold text-[.75rem] px-4 py-2 rounded-xl group-hover:shadow-md transition-all">
                      Check Prices →
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>

          <p className="text-center text-[.68rem] text-[#8E95A9] font-semibold">
            Click any card to see live prices and availability on that site. We recommend comparing at least 2–3 sites.
          </p>
        </section>
      )}

      {/* All Providers (shown before search too) */}
      {!searched && (
        <section className="max-w-[1100px] mx-auto px-5 py-10">
          <p className="text-[.65rem] font-extrabold uppercase tracking-[3px] text-[#8E95A9] mb-1.5">Our Partners</p>
          <h2 className="font-[Poppins] text-[1.4rem] font-black text-[#1A1D2B] mb-6">6 Hotel Comparison Platforms</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PROVIDERS.map(p => (
              <div key={p.name} className="block p-5 bg-white border border-[#F1F3F7] rounded-2xl">
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="text-2xl">{p.logo}</span>
                  <span className="font-[Poppins] font-extrabold text-[.88rem] text-[#1A1D2B]">{p.name}</span>
                  <span className="text-[.58rem] font-black uppercase tracking-[1.5px] px-2 py-0.5 rounded-full bg-orange-50 text-orange-500">{p.badge}</span>
                </div>
                <p className="text-[.75rem] text-[#5C6378] font-semibold leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tips */}
      <section className="max-w-[860px] mx-auto px-5 pb-16">
        <div className="bg-[#F8FAFC] border border-[#F1F3F7] rounded-3xl p-8">
          <h3 className="font-[Poppins] font-black text-[1.05rem] text-[#1A1D2B] mb-4">Tips for Getting the Best Hotel Rate</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              ['Compare at least 3 sites', 'Prices vary by 10–40% across booking platforms for the same room and dates.'],
              ['Free cancellation is worth it', 'Always prefer free cancellation — prices are often identical or slightly higher.'],
              ['Sunday check-ins are cheapest', 'Business hotels drop rates on weekends when corporate demand falls.'],
              ['Join loyalty programmes', 'Booking.com Genius and Expedia Rewards are free and unlock 10–15% off.'],
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

export default function HotelsPage() {
  return (
    <Suspense>
      <HotelsContent />
    </Suspense>
  );
}
