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

type Hotel = {
  id: number;
  name: string;
  stars: number;
  price: number;
  currency: string;
  photo: string | null;
  location: string;
  bookingUrl: string;
};

function HotelsContent() {
  const [city, setCity] = useState('');
  const [checkin, setCheckin] = useState('');
  const [checkout, setCheckout] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hotels, setHotels] = useState<Hotel[] | null>(null);
  const [apiError, setApiError] = useState('');

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

  async function handleSearch() {
    if (!city || !checkin || !checkout) { alert('Please enter destination and both dates'); return; }
    setHotels(null);
    setApiError('');
    setLoading(true);
    try {
      const params = new URLSearchParams({ city, checkin, checkout, adults: String(adults), children: String(children) });
      const res = await fetch(`/api/hotels?${params}`);
      const data = await res.json();
      if (data.hotels?.length) {
        setHotels(data.hotels);
      } else {
        setHotels([]);
        setApiError(data.message || 'No hotels found for these dates');
      }
    } catch {
      setApiError('Failed to fetch hotel prices. Please try again.');
    } finally {
      setLoading(false);
    }
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
            <span className="text-[.85rem] font-bold text-[#5C6378]">Searching hotels in <strong className="text-[#1A1D2B]">{city}</strong>…</span>
          </div>
        </section>
      )}

      {/* API Error */}
      {apiError && !loading && (
        <section className="max-w-[860px] mx-auto px-5 py-6">
          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5 text-center">
            <p className="text-[.85rem] text-[#5C6378] font-semibold mb-3">{apiError}</p>
            <p className="text-[.75rem] text-[#8E95A9]">Try searching on our partner sites directly:</p>
            <div className="flex flex-wrap justify-center gap-3 mt-3">
              {PROVIDERS.map(p => (
                <a key={p.name} href={p.getUrl(city, checkin, checkout, adults, children)} target="_blank" rel="noopener"
                  className="text-[.78rem] font-bold text-orange-600 hover:text-orange-700 underline">{p.name} →</a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Hotel Results - Live Data */}
      {hotels && hotels.length > 0 && !loading && (
        <section className="max-w-[1000px] mx-auto px-5 pb-6">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
            <div>
              <h2 className="font-[Poppins] font-black text-[1.3rem] text-[#1A1D2B]">
                Hotels in {city}
                {nights ? <span className="text-[#8E95A9] font-semibold text-[1rem]"> · {nights} night{nights !== 1 ? 's' : ''}</span> : null}
              </h2>
              <p className="text-[.72rem] text-[#8E95A9] font-semibold mt-0.5">
                {hotels.length} hotels found · {adults} adult{adults !== 1 ? 's' : ''}{children > 0 ? ` · ${children} child${children !== 1 ? 'ren' : ''}` : ''} · Prices are cached estimates
              </p>
            </div>
            <span className="text-[.7rem] font-bold text-orange-500 bg-orange-50 px-3 py-1.5 rounded-full">Live prices</span>
          </div>

          {/* Hotel cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {hotels.map((h, i) => (
              <div key={h.id || i} className="bg-white border border-[#E8ECF4] rounded-2xl overflow-hidden hover:shadow-lg transition-all group">
                {/* Hotel photo */}
                <div className="relative h-44 bg-[#F1F3F7] overflow-hidden">
                  {h.photo ? (
                    <img src={h.photo} alt={h.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl text-[#C0C8D8]">🏨</div>
                  )}
                  {i === 0 && (
                    <span className="absolute top-3 left-3 text-[.6rem] font-black uppercase tracking-[1.5px] bg-orange-500 text-white px-2.5 py-1 rounded-full shadow-md">Best Price</span>
                  )}
                  {h.stars > 0 && (
                    <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-[.7rem] font-bold text-amber-500 px-2 py-0.5 rounded-full">
                      {'★'.repeat(h.stars)}
                    </span>
                  )}
                </div>

                {/* Hotel info */}
                <div className="p-4">
                  <h3 className="font-[Poppins] font-bold text-[.9rem] text-[#1A1D2B] mb-1 line-clamp-2 leading-tight">{h.name}</h3>
                  <p className="text-[.7rem] text-[#8E95A9] font-semibold mb-3">{h.location}</p>

                  <div className="flex items-end justify-between">
                    <div>
                      <span className="text-[.65rem] text-[#8E95A9] font-semibold">from</span>
                      <div className="font-[Poppins] font-black text-[1.3rem] text-[#1A1D2B] leading-none">{h.currency}{h.price}</div>
                      <span className="text-[.6rem] text-[#8E95A9] font-medium">total stay</span>
                    </div>
                    <a href={h.bookingUrl} target="_blank" rel="noopener"
                      className="bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-[Poppins] font-bold text-[.75rem] px-4 py-2.5 rounded-xl transition-all shadow-sm">
                      Book →
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Also compare on providers */}
          <div className="bg-[#F8FAFC] border border-[#F1F3F7] rounded-2xl p-5">
            <p className="text-[.72rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-3">Also compare on</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PROVIDERS.map(p => (
                <a key={p.name} href={p.getUrl(city, checkin, checkout, adults, children)} target="_blank" rel="noopener"
                  className="flex items-center gap-3 bg-white border border-[#E8ECF4] rounded-xl px-4 py-3 hover:border-orange-200 hover:shadow-sm transition-all">
                  <span className="text-xl">{p.logo}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-[Poppins] font-bold text-[.82rem] text-[#1A1D2B]">{p.name}</div>
                    <div className="text-[.65rem] text-[#8E95A9] font-semibold truncate">{p.badge}</div>
                  </div>
                  <span className="text-orange-500 font-bold text-[.75rem]">→</span>
                </a>
              ))}
            </div>
          </div>

          <p className="text-center text-[.68rem] text-[#8E95A9] font-semibold mt-4">
            Prices are cached estimates from our data partners. Final prices shown on booking.
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
