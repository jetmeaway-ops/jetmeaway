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
    highlight: '28M+ properties · Free cancellation options · No booking fees',
    getUrl: (city: string, cin: string, cout: string, adults: number, children: number) =>
      `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(city)}&checkin=${cin}&checkout=${cout}&group_adults=${adults}&group_children=${children}&no_rooms=1`,
  },
  {
    name: 'Expedia',
    logo: '🌍',
    badge: 'Bundle & Save',
    highlight: 'Save up to 30% when you bundle hotel with a flight',
    getUrl: (city: string, cin: string, cout: string, adults: number) => {
      const u = `https://www.expedia.co.uk/Hotel-Search?destination=${encodeURIComponent(city)}&startDate=${cin}&endDate=${cout}&adults=${adults}`;
      return `${u}&affcid=clbU3QK`;
    },
  },
  {
    name: 'Trip.com',
    logo: '🗺',
    badge: 'Exclusive Deals',
    highlight: 'Flash sales & exclusive member prices on Asia & Middle East',
    getUrl: (city: string, cin: string, cout: string, adults: number, children: number) =>
      `https://uk.trip.com/hotels/list?cityName=${encodeURIComponent(city)}&checkin=${cin}&checkout=${cout}&adult=${adults}&child=${children}&Allianceid=8023009&SID=303363796&trip_sub3=D14969586`,
  },
];

function HotelsContent() {
  const [city, setCity] = useState('');
  const [checkin, setCheckin] = useState('');
  const [checkout, setCheckout] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(false);

  // Read URL params on client only — useEffect never runs on the server
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
    setResults(false);
    setLoading(true);
    setTimeout(() => { setLoading(false); setResults(true); }, 1200);
  }

  const nights = checkin && checkout
    ? Math.max(0, Math.round((new Date(checkout).getTime() - new Date(checkin).getTime()) / 86400000))
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
          <p className="text-[1rem] text-[#8E95A9] font-semibold max-w-[500px] mx-auto">Compare Booking.com, Expedia & Trip.com — results shown right here.</p>
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

          <button onClick={handleSearch} disabled={loading}
            className="w-full bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 disabled:opacity-60 text-white font-[Poppins] font-black text-[.95rem] py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(249,115,22,0.3)]">
            {loading ? 'Searching…' : 'Search Hotels →'}
          </button>
        </div>
      </section>

      {/* Loading */}
      {loading && (
        <section className="max-w-[860px] mx-auto px-5 py-10 text-center">
          <div className="inline-flex items-center gap-3 bg-white border border-[#F1F3F7] rounded-2xl px-6 py-4 shadow-sm">
            <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-[.85rem] font-bold text-[#5C6378]">Comparing 3 providers for <strong className="text-[#1A1D2B]">{city}</strong>…</span>
          </div>
        </section>
      )}

      {/* Results */}
      {results && (
        <section className="max-w-[900px] mx-auto px-5 pb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h2 className="font-[Poppins] font-black text-[1.3rem] text-[#1A1D2B]">
                Hotels in {city}
                {nights ? <span className="text-[#8E95A9] font-semibold text-[1rem]"> · {nights} night{nights !== 1 ? 's' : ''}</span> : null}
              </h2>
              <p className="text-[.72rem] text-[#8E95A9] font-semibold mt-0.5">
                {adults} adult{adults !== 1 ? 's' : ''}{children > 0 ? ` · ${children} child${children !== 1 ? 'ren' : ''}` : ''} · Click a provider to see live prices
              </p>
            </div>
            <span className="text-[.7rem] font-bold text-orange-500 bg-orange-50 px-3 py-1.5 rounded-full">{PROVIDERS.length} providers</span>
          </div>

          <div className="bg-white border border-[#E8ECF4] rounded-2xl overflow-hidden mb-4">
            {/* Table header */}
            <div className="hidden md:grid grid-cols-[auto_1fr_auto] gap-4 px-5 py-3 bg-[#F8FAFC] border-b border-[#F1F3F7]">
              <div className="text-[.62rem] font-black uppercase tracking-[2px] text-[#8E95A9]">Provider</div>
              <div className="text-[.62rem] font-black uppercase tracking-[2px] text-[#8E95A9]">Why book here</div>
              <div className="text-[.62rem] font-black uppercase tracking-[2px] text-[#8E95A9] text-right">Action</div>
            </div>

            {PROVIDERS.map((p, i) => (
              <div key={p.name}
                className={`flex flex-col md:grid md:grid-cols-[auto_1fr_auto] md:items-center gap-3 md:gap-4 px-5 py-5 border-b border-[#F1F3F7] last:border-0 hover:bg-orange-50/30 transition-colors ${i === 0 ? 'bg-orange-50/20' : ''}`}>
                {/* Provider */}
                <div className="flex items-center gap-3 min-w-[160px]">
                  <div className="text-2xl">{p.logo}</div>
                  <div>
                    <div className="font-[Poppins] font-bold text-[.9rem] text-[#1A1D2B] flex items-center gap-2">
                      {p.name}
                      {i === 0 && <span className="text-[.58rem] font-black uppercase tracking-[1.5px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">Most Popular</span>}
                    </div>
                    <div className="text-[.65rem] text-[#8E95A9] font-semibold">{p.badge}</div>
                  </div>
                </div>
                {/* Highlight */}
                <p className="text-[.78rem] text-[#5C6378] font-semibold">{p.highlight}</p>
                {/* CTA */}
                <a href={p.getUrl(city, checkin, checkout, adults, children)} target="_blank" rel="noopener"
                  className="inline-flex items-center justify-center gap-2 bg-[#0066FF] hover:bg-[#0052CC] text-white font-[Poppins] font-bold text-[.78rem] px-5 py-3 rounded-xl transition-all whitespace-nowrap shadow-[0_4px_12px_rgba(0,102,255,0.2)]">
                  Check Prices →
                </a>
              </div>
            ))}
          </div>

          <p className="text-center text-[.68rem] text-[#8E95A9] font-semibold">
            Clicking any provider earns JetMeAway a commission at no extra cost to you.
          </p>
        </section>
      )}

      {/* Tips */}
      <section className="max-w-[860px] mx-auto px-5 pb-16">
        <div className="bg-[#F8FAFC] border border-[#F1F3F7] rounded-3xl p-8">
          <h3 className="font-[Poppins] font-black text-[1.05rem] text-[#1A1D2B] mb-4">Tips for Getting the Best Hotel Rate</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              ['Book directly after comparing', 'Show the hotel a cheaper rate from a comparison site — many will price-match.'],
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
