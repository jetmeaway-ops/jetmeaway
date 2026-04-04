'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const ScoutSidebar = dynamic(() => import('@/components/ScoutSidebar'), { ssr: false });

/* ═══════════════════════════════════════════════════════════════════════════
   DESTINATIONS
   ═══════════════════════════════════════════════════════════════════════════ */

const DESTINATIONS = [
  // UK
  'London', 'Manchester', 'Birmingham', 'Edinburgh', 'Glasgow', 'Liverpool',
  // Spain
  'Barcelona', 'Madrid', 'Malaga', 'Tenerife', 'Lanzarote', 'Fuerteventura',
  'Gran Canaria', 'Palma', 'Alicante',
  // Portugal
  'Faro', 'Lisbon',
  // France
  'Paris', 'Nice',
  // Netherlands
  'Amsterdam',
  // Italy
  'Rome', 'Venice', 'Florence', 'Milan',
  // Greece
  'Athens', 'Crete', 'Rhodes', 'Corfu', 'Santorini',
  // Croatia
  'Dubrovnik', 'Split',
  // Turkey
  'Antalya', 'Bodrum', 'Dalaman', 'Istanbul',
  // Morocco
  'Marrakech', 'Casablanca',
  // Egypt
  'Sharm El Sheikh', 'Hurghada', 'Cairo',
  // Indian Ocean
  'Maldives', 'Mauritius', 'Seychelles', 'Zanzibar',
  // Pakistan
  'Lahore', 'Islamabad', 'Karachi', 'Peshawar',
  // India
  'Mumbai', 'Delhi', 'Goa', 'Colombo',
  // Middle East
  'Dubai', 'Abu Dhabi', 'Doha', 'Amman', 'Beirut', 'Riyadh', 'Jeddah', 'Muscat', 'Kuwait City',
  // Southeast Asia
  'Bangkok', 'Phuket', 'Bali', 'Singapore', 'Kuala Lumpur', 'Jakarta',
  // East Asia
  'Tokyo', 'Hong Kong', 'Shanghai', 'Beijing', 'Seoul',
  // Oceania
  'Sydney', 'Melbourne',
  // Africa
  'Cape Town', 'Johannesburg', 'Nairobi', 'Lagos', 'Accra',
  // Americas
  'New York', 'Los Angeles', 'Orlando', 'Cancun', 'Mexico City', 'Toronto',
  'Buenos Aires', 'Lima', 'Bogota', 'Havana',
];

/* ═══════════════════════════════════════════════════════════════════════════
   PROVIDER DEEP LINKS (only affiliated providers)
   ═══════════════════════════════════════════════════════════════════════════ */

function buildKlookUrl(dest: string): string {
  return `https://klook.tpk.lu/CByEYa65?city=${encodeURIComponent(dest)}`;
}

function buildTripcomUrl(dest: string, cin: string, cout: string, adults: number): string {
  const u = `https://www.trip.com/hotels/list?city=${encodeURIComponent(dest)}&checkin=${cin}&checkout=${cout}&adult=${adults}&curr=GBP`;
  return `https://tp.media/r?marker=714449&trs=512633&p=8311&u=${encodeURIComponent(u)}`;
}

function buildExpediaUrl(dest: string, cin: string, cout: string, adults: number): string {
  const u = `https://www.expedia.co.uk/Hotel-Search?destination=${encodeURIComponent(dest)}&startDate=${cin}&endDate=${cout}&adults=${adults}`;
  return `https://tp.media/r?marker=714449&trs=512633&p=11584&u=${encodeURIComponent(u)}`;
}

type Provider = { name: string; logo: string; getUrl: (dest: string, cin: string, cout: string, adults: number) => string };

const PROVIDERS: Provider[] = [
  { name: 'Klook', logo: '🎟', getUrl: (d) => buildKlookUrl(d) },
  { name: 'Trip.com', logo: '🗺', getUrl: (d, ci, co, a) => buildTripcomUrl(d, ci, co, a) },
  { name: 'Expedia', logo: '🌍', getUrl: (d, ci, co, a) => buildExpediaUrl(d, ci, co, a) },
];

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

type HotelResult = {
  id: number;
  name: string;
  stars: number;
  pricePerNight: number;
  location: string;
  district: string | null;
  lat?: number;
  lng?: number;
};

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

function DestinationPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const q = value.toLowerCase().trim();
  const filtered = q.length >= 1
    ? DESTINATIONS.filter(d => d.toLowerCase().includes(q)).slice(0, 8)
    : DESTINATIONS.slice(0, 10);

  return (
    <div ref={ref} className="relative">
      <input type="text" placeholder="City — e.g. Barcelona, Dubai" value={value} autoComplete="off"
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className="w-full px-4 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.9rem] font-semibold text-[#1A1D2B] outline-none focus:border-orange-400 focus:bg-white transition-all placeholder:text-[#B0B8CC]" />
      {open && (
        <ul className="absolute z-50 w-full mt-1.5 bg-white border border-[#E8ECF4] rounded-2xl shadow-2xl overflow-auto max-h-64">
          {filtered.map(c => (
            <li key={c} onMouseDown={() => { onChange(c); setOpen(false); }}
              className={`px-4 py-3 hover:bg-orange-50 cursor-pointer transition-colors border-b border-[#F1F3F7] last:border-0 font-[Poppins] font-semibold text-[.88rem] text-[#1A1D2B] ${value === c ? 'bg-orange-50' : ''}`}>
              {c}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GuestPicker({ adults, onChange }: { adults: number; onChange: (a: number) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full px-4 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-left text-[.85rem] font-semibold text-[#1A1D2B] outline-none focus:border-orange-400 hover:bg-white transition-all flex items-center justify-between">
        <span>{adults} Adult{adults !== 1 ? 's' : ''}</span>
        <span className="text-[#B0B8CC] text-xs">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div className="absolute z-50 w-48 mt-1.5 right-0 bg-white border border-[#E8ECF4] rounded-2xl shadow-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="font-[Poppins] font-bold text-[.85rem] text-[#1A1D2B]">Adults</span>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => onChange(Math.max(1, adults - 1))}
                className="w-8 h-8 rounded-full border-2 border-[#E8ECF4] flex items-center justify-center text-[#5C6378] font-bold text-lg hover:border-orange-400 transition-all disabled:opacity-30" disabled={adults <= 1}>−</button>
              <span className="font-[Poppins] font-black text-[.95rem] text-[#1A1D2B] w-5 text-center">{adults}</span>
              <button type="button" onClick={() => onChange(Math.min(6, adults + 1))}
                className="w-8 h-8 rounded-full border-2 border-[#E8ECF4] flex items-center justify-center text-[#5C6378] font-bold text-lg hover:border-orange-400 transition-all disabled:opacity-30" disabled={adults >= 6}>+</button>
            </div>
          </div>
          <button type="button" onClick={() => setOpen(false)}
            className="w-full mt-3 bg-orange-500 hover:bg-orange-600 text-white font-[Poppins] font-bold text-[.8rem] py-2 rounded-xl transition-colors">
            Done
          </button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   LOADING
   ═══════════════════════════════════════════════════════════════════════════ */

const LOADING_MSGS = [
  'Searching Klook...',
  'Checking Trip.com...',
  'Comparing Expedia...',
  'Finding the best rates...',
];

function LoadingState({ dest }: { dest: string }) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const msgTimer = setInterval(() => setMsgIdx(i => (i + 1) % LOADING_MSGS.length), 600);
    const progTimer = setInterval(() => setProgress(p => Math.min(p + 1.2, 95)), 50);
    return () => { clearInterval(msgTimer); clearInterval(progTimer); };
  }, []);

  return (
    <section className="max-w-[900px] mx-auto px-5 py-10">
      <div className="bg-white border border-[#E8ECF4] rounded-2xl p-8 text-center shadow-sm">
        <div className="w-full bg-[#F1F3F7] rounded-full h-2 mb-5 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-orange-400 to-amber-500 rounded-full transition-all duration-100" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-[.9rem] font-bold text-[#5C6378]">{LOADING_MSGS[msgIdx]}</span>
        </div>
        <p className="text-[.78rem] text-[#8E95A9] font-semibold">Comparing hotel prices in <strong className="text-[#1A1D2B]">{dest}</strong></p>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   STAR RATING
   ═══════════════════════════════════════════════════════════════════════════ */

function Stars({ count }: { count: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={`text-[.7rem] ${i < count ? 'text-amber-400' : 'text-[#E8ECF4]'}`}>★</span>
      ))}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

function HotelsContent() {
  const [destination, setDestination] = useState('');
  const [checkin, setCheckin] = useState('');
  const [checkout, setCheckout] = useState('');
  const [adults, setAdults] = useState(2);

  const [loading, setLoading] = useState(false);
  const [hotels, setHotels] = useState<HotelResult[] | null>(null);
  const [apiError, setApiError] = useState('');
  const [searched, setSearched] = useState(false);
  const [searchedDest, setSearchedDest] = useState('');

  // Scout sidebar state
  const [scoutHotel, setScoutHotel] = useState<{ name: string; lat: number; lng: number } | null>(null);

  const resultsRef = useRef<HTMLDivElement>(null);

  // Read URL params
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const dest = p.get('destination') || p.get('city') || '';
    const cin = p.get('checkin') || '';
    const cout = p.get('checkout') || '';
    const a = p.get('adults');
    if (dest) setDestination(dest);
    if (cin) setCheckin(cin);
    if (cout) setCheckout(cout);
    if (a) setAdults(Math.max(1, parseInt(a)));
  }, []);

  const today = new Date().toISOString().split('T')[0];

  // Calculate nights
  function getNights(): number {
    if (!checkin || !checkout) return 0;
    const d1 = new Date(checkin);
    const d2 = new Date(checkout);
    const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }

  const handleSearch = useCallback(async () => {
    if (!destination) { alert('Please enter a destination'); return; }
    if (!checkin) { alert('Please select a check-in date'); return; }
    if (!checkout) { alert('Please select a check-out date'); return; }

    setHotels(null);
    setApiError('');
    setLoading(true);
    setSearched(true);
    setSearchedDest(destination);

    try {
      const params = new URLSearchParams({
        city: destination,
        checkin,
        checkout,
        adults: String(adults),
      });

      const res = await fetch(`/api/hotels?${params}`);
      const data = await res.json();

      if (data.error) {
        setApiError(data.error);
        setLoading(false);
        return;
      }

      setHotels(data.hotels || []);
      setLoading(false);

      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch {
      setApiError('Could not load hotel prices. Please try again.');
      setLoading(false);
    }
  }, [destination, checkin, checkout, adults]);

  // Auto-search when URL params are present
  const autoSearched = useRef(false);
  useEffect(() => {
    if (!autoSearched.current && destination && checkin && checkout) {
      autoSearched.current = true;
      handleSearch();
    }
  }, [destination, checkin, checkout, handleSearch]);

  const cheapest = hotels && hotels.length > 0 ? hotels[0] : null;
  const nights = getNights();

  return (
    <>
      <Header />

      {/* ── Hero + Search ── */}
      <section className="pt-36 pb-10 px-5 bg-[radial-gradient(ellipse_at_top,#FFF7ED_0%,#fff_55%,#F8FAFC_100%)]">
        <div className="max-w-[860px] mx-auto text-center mb-8">
          <span className="inline-block bg-orange-50 text-orange-500 text-[.65rem] font-black uppercase tracking-[2.5px] px-3.5 py-1.5 rounded-full mb-4">🏨 Hotel Comparison</span>
          <h1 className="font-[Poppins] text-[2.4rem] md:text-[3.6rem] font-black text-[#1A1D2B] leading-[1.05] tracking-tight mb-3">
            Find the <em className="italic bg-gradient-to-br from-orange-400 to-amber-600 bg-clip-text text-transparent">Best</em> Hotels
          </h1>
          <p className="text-[1rem] text-[#8E95A9] font-semibold max-w-[520px] mx-auto">Compare trusted hotel providers — real prices shown right here.</p>
        </div>

        <div className="max-w-[860px] mx-auto bg-white border border-[#E8ECF4] rounded-3xl p-6 shadow-[0_8px_40px_rgba(245,158,11,0.08)]">
          {/* Destination */}
          <div className="mb-3">
            <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Destination</label>
            <DestinationPicker value={destination} onChange={setDestination} />
          </div>

          {/* Dates + Guests */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Check-in</label>
              <input type="date" min={today} value={checkin} onChange={e => setCheckin(e.target.value)}
                className="w-full px-3 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.85rem] font-semibold text-[#1A1D2B] outline-none focus:border-orange-400 focus:bg-white transition-all" />
            </div>
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Check-out</label>
              <input type="date" min={checkin || today} value={checkout} onChange={e => setCheckout(e.target.value)}
                className="w-full px-3 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.85rem] font-semibold text-[#1A1D2B] outline-none focus:border-orange-400 focus:bg-white transition-all" />
            </div>
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Guests</label>
              <GuestPicker adults={adults} onChange={setAdults} />
            </div>
          </div>

          <button onClick={handleSearch} disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-[Poppins] font-black text-[.95rem] py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(245,158,11,0.3)]">
            {loading ? 'Searching…' : 'Search Hotels →'}
          </button>
          <p className="text-center text-[.68rem] text-[#8E95A9] font-semibold mt-2.5">Free comparison · Prices shown here · Click any hotel to book on the provider</p>
        </div>
      </section>

      {/* ── Loading ── */}
      {loading && <LoadingState dest={destination} />}

      {/* ── Error ── */}
      {apiError && (
        <section className="max-w-[860px] mx-auto px-5 py-6">
          <div className="bg-red-50 border border-red-100 rounded-2xl p-5 text-center">
            <p className="text-[.85rem] font-bold text-red-600 mb-3">{apiError}</p>
            <button onClick={handleSearch}
              className="bg-orange-500 hover:bg-orange-600 text-white font-[Poppins] font-bold text-[.82rem] px-6 py-2.5 rounded-xl transition-all">
              Try Again
            </button>
          </div>
        </section>
      )}

      {/* ── Results ── */}
      {searched && !loading && hotels !== null && (
        <div ref={resultsRef}>
          {/* Section 1: Results Summary */}
          {cheapest && (
            <section className="max-w-[1000px] mx-auto px-5 pt-8 pb-4">
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🏷</span>
                  <span className="font-[Poppins] font-black text-[1rem] text-[#1A1D2B]">
                    {hotels!.length} hotel{hotels!.length !== 1 ? 's' : ''} found in {searchedDest} from <span className="text-orange-600">£{cheapest.pricePerNight}/night</span>
                  </span>
                </div>
                <p className="text-[.7rem] text-[#8E95A9] font-semibold">Prices based on recent searches — click any hotel for live pricing</p>
              </div>
            </section>
          )}

          {/* Section 2: Hotel Result Cards */}
          {hotels!.length > 0 ? (
            <section className="max-w-[1000px] mx-auto px-5 pb-6">
              <div className="space-y-3">
                {hotels!.map((h, i) => {
                  const isCheapest = i === 0;
                  // Rotate through Unsplash hotel images
                  const HOTEL_PHOTOS = [
                    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=640&h=480&fit=crop',
                    'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=640&h=480&fit=crop',
                    'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=640&h=480&fit=crop',
                    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=640&h=480&fit=crop',
                    'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=640&h=480&fit=crop',
                    'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=640&h=480&fit=crop',
                    'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=640&h=480&fit=crop',
                    'https://images.unsplash.com/photo-1455587734955-081b22074882?w=640&h=480&fit=crop',
                    'https://images.unsplash.com/photo-1587213811864-46e59f6873b1?w=640&h=480&fit=crop',
                    'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=640&h=480&fit=crop',
                  ];
                  const photoUrl = HOTEL_PHOTOS[i % HOTEL_PHOTOS.length];
                  const totalPrice = h.pricePerNight * (nights || 1);
                  const klookUrl = buildKlookUrl(searchedDest);
                  const tripUrl = buildTripcomUrl(searchedDest, checkin, checkout, adults);
                  const expediaUrl = buildExpediaUrl(searchedDest, checkin, checkout, adults);

                  return (
                    <div key={h.id || i} className={`bg-white border rounded-2xl overflow-hidden transition-shadow hover:shadow-md ${isCheapest ? 'border-orange-200 ring-1 ring-orange-100' : 'border-[#E8ECF4]'}`}>
                      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr_auto] gap-0">
                        {/* Image */}
                        <div className="relative h-48 md:h-full min-h-[180px]">
                          {photoUrl ? (
                            <img src={photoUrl} alt={h.name} loading="lazy"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const el = e.target as HTMLImageElement;
                                el.style.display = 'none';
                                el.parentElement!.classList.add('bg-gradient-to-br', 'from-orange-100', 'to-amber-50');
                                el.parentElement!.innerHTML = '<div class="flex items-center justify-center h-full"><span class="text-4xl">🛏</span></div>';
                              }} />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-orange-100 to-amber-50 flex items-center justify-center">
                              <span className="text-4xl">🛏</span>
                            </div>
                          )}
                          {isCheapest && (
                            <span className="absolute top-3 left-3 text-[.55rem] font-black uppercase tracking-[1.5px] bg-orange-500 text-white px-2 py-1 rounded-full">Cheapest</span>
                          )}
                        </div>

                        {/* Info */}
                        <div className="p-5 flex flex-col justify-center">
                          <div className="mb-1">
                            <Stars count={h.stars} />
                          </div>
                          <h3 className="font-[Poppins] font-black text-[1.05rem] text-[#1A1D2B] mb-1">{h.name}</h3>
                          {h.district && (
                            <p className="text-[.75rem] text-[#8E95A9] font-semibold mb-2">📍 {h.district}</p>
                          )}
                          {nights > 0 && (
                            <p className="text-[.72rem] text-[#5C6378] font-semibold">{nights} night{nights !== 1 ? 's' : ''} · {adults} guest{adults !== 1 ? 's' : ''}</p>
                          )}
                        </div>

                        {/* Price + Actions */}
                        <div className="p-5 flex flex-col items-end justify-center gap-2 border-t md:border-t-0 md:border-l border-[#F1F3F7]">
                          <div className="text-right">
                            <div className="font-[Poppins] font-black text-[1.5rem] text-[#1A1D2B] leading-none">£{h.pricePerNight}<span className="text-[.7rem] font-semibold text-[#8E95A9]">/night</span></div>
                            {nights > 0 && (
                              <div className="text-[.68rem] text-[#8E95A9] font-semibold mt-0.5">£{totalPrice} total for {nights} night{nights !== 1 ? 's' : ''}</div>
                            )}
                          </div>
                          <div className="flex flex-col gap-1.5 w-full">
                            <a href={tripUrl} target="_blank" rel="noopener noreferrer"
                              className="bg-[#287DFA] hover:bg-[#1A6AE0] text-white font-[Poppins] font-bold text-[.72rem] px-4 py-2.5 rounded-lg transition-all text-center whitespace-nowrap">
                              Trip.com →
                            </a>
                            <a href={expediaUrl} target="_blank" rel="noopener noreferrer"
                              className="bg-[#1B2B65] hover:bg-[#142050] text-white font-[Poppins] font-bold text-[.72rem] px-4 py-2.5 rounded-lg transition-all text-center whitespace-nowrap">
                              Expedia →
                            </a>
                            <a href={klookUrl} target="_blank" rel="noopener noreferrer"
                              className="bg-orange-500 hover:bg-orange-600 text-white font-[Poppins] font-bold text-[.72rem] px-4 py-2.5 rounded-lg transition-all text-center whitespace-nowrap">
                              Klook →
                            </a>
                          </div>
                          {h.lat && h.lng ? (
                            <button type="button"
                              onClick={() => setScoutHotel({ name: h.name, lat: h.lat!, lng: h.lng! })}
                              className="text-[.68rem] font-bold text-teal-600 border border-teal-200 hover:bg-teal-50 px-3 py-1.5 rounded-lg transition-all cursor-pointer">
                              Explore Neighbourhood 🧭
                            </button>
                          ) : (
                            <button type="button" disabled
                              className="text-[.68rem] font-bold text-gray-400 border border-gray-200 px-3 py-1.5 rounded-lg cursor-default opacity-50">
                              Neighbourhood N/A
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : (
            /* No results */
            <section className="max-w-[860px] mx-auto px-5 py-8">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
                <span className="text-3xl mb-3 block">🔎</span>
                <p className="font-[Poppins] font-bold text-[.95rem] text-[#1A1D2B] mb-2">
                  We couldn&apos;t find cached hotel prices for {searchedDest}.
                </p>
                <p className="text-[.78rem] text-[#8E95A9] font-semibold">
                  Compare live prices directly across our providers below.
                </p>
              </div>
            </section>
          )}

          {/* Section 3: Provider Comparison Strip */}
          <section className="max-w-[1000px] mx-auto px-5 pb-8">
            <h3 className="font-[Poppins] font-black text-[1.05rem] text-[#1A1D2B] mb-4">Also Compare on These Providers</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PROVIDERS.map(p => {
                const url = p.getUrl(searchedDest, checkin, checkout, adults);
                return (
                  <div key={p.name} className="bg-white border border-[#E8ECF4] rounded-xl p-4 flex flex-col items-center text-center hover:border-orange-300 hover:shadow-md transition-all">
                    <div className="w-10 h-10 rounded-lg bg-[#F8FAFC] border border-[#E8ECF4] flex items-center justify-center text-xl mb-2">{p.logo}</div>
                    <div className="font-[Poppins] font-bold text-[.85rem] text-[#1A1D2B] mb-1">{p.name}</div>
                    {cheapest ? (
                      <div className="text-[.75rem] font-bold text-orange-600 mb-2">From £{cheapest.pricePerNight}/night</div>
                    ) : (
                      <div className="text-[.72rem] font-semibold text-[#8E95A9] mb-2">Check Price</div>
                    )}
                    <a href={url} target="_blank" rel="noopener noreferrer"
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white font-[Poppins] font-bold text-[.72rem] py-2 rounded-lg transition-all">
                      Search {p.name} →
                    </a>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Section D: Cross-sell */}
          <section className="max-w-[1000px] mx-auto px-5 pb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Flights */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5">
                <span className="text-2xl mb-2 block">✈</span>
                <h4 className="font-[Poppins] font-black text-[.9rem] text-[#1A1D2B] mb-1">Flights to {searchedDest}</h4>
                <p className="text-[.75rem] text-[#5C6378] font-semibold mb-3">Need a flight too? Compare across our providers.</p>
                <a href={`/flights?to=${encodeURIComponent(searchedDest)}`}
                  className="inline-block bg-white hover:bg-blue-50 text-[#0066FF] font-[Poppins] font-bold text-[.75rem] px-4 py-2 rounded-lg border border-blue-200 transition-all">
                  Compare Flights →
                </a>
              </div>

              {/* Car Hire */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-5">
                <span className="text-2xl mb-2 block">🚗</span>
                <h4 className="font-[Poppins] font-black text-[.9rem] text-[#1A1D2B] mb-1">Car Hire in {searchedDest}</h4>
                <p className="text-[.75rem] text-[#5C6378] font-semibold mb-3">Explore {searchedDest} on your own terms.</p>
                <a href={`/cars?location=${encodeURIComponent(searchedDest)}`}
                  className="inline-block bg-white hover:bg-amber-50 text-amber-600 font-[Poppins] font-bold text-[.75rem] px-4 py-2 rounded-lg border border-amber-200 transition-all">
                  Compare Car Hire →
                </a>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ── Tips ── */}
      <section className="max-w-[860px] mx-auto px-5 pb-16">
        <div className="bg-[#F8FAFC] border border-[#F1F3F7] rounded-3xl p-8">
          <h3 className="font-[Poppins] font-black text-[1.05rem] text-[#1A1D2B] mb-4">Tips for Finding Cheaper Hotels</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              ['Book 2–3 weeks ahead', 'Last-minute deals exist, but the best prices are typically 2–3 weeks before travel.'],
              ['Compare across providers', 'The same hotel can vary by 20–40% across different booking sites.'],
              ['Check cancellation policies', 'Free cancellation rates let you book now and keep looking for better deals.'],
              ['Consider location carefully', 'A cheaper hotel in the right area can save on transport and give a better experience.'],
            ].map(([title, body]) => (
              <div key={title} className="flex gap-3">
                <div className="w-1.5 flex-shrink-0 rounded-full bg-gradient-to-b from-orange-400 to-amber-500 self-stretch" />
                <div>
                  <div className="font-[Poppins] font-bold text-[.85rem] text-[#1A1D2B] mb-0.5">{title}</div>
                  <p className="text-[.75rem] text-[#5C6378] font-semibold leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Scout Sidebar */}
      {scoutHotel && (
        <ScoutSidebar
          hotelName={scoutHotel.name}
          latitude={scoutHotel.lat}
          longitude={scoutHotel.lng}
          onClose={() => setScoutHotel(null)}
        />
      )}

      <Footer />
    </>
  );
}

export default function HotelsPage() {
  return <HotelsContent />;
}
