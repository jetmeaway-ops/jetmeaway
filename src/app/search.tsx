'use client';

import { useState, useRef, useEffect } from 'react';

const DESTINATIONS = [
  { code: 'DXB', city: 'Dubai', country: 'UAE', flag: '🇦🇪', reaction: "Ooh la la! 🏙️", msg: "Dubai turned a desert into a dream. The tallest tower, the biggest mall, the wildest skyline." },
  { code: 'BCN', city: 'Barcelona', country: 'Spain', flag: '🇪🇸', reaction: "¡Fantástico! 🥂", msg: "Gaudí, tapas, and sunsets on Barceloneta. There's no city with more life." },
  { code: 'AYT', city: 'Antalya', country: 'Turkey', flag: '🇹🇷', reaction: "Incredible! 🌊", msg: "300+ sunny days a year and the most turquoise water you've ever seen." },
  { code: 'PMI', city: 'Palma', country: 'Spain', flag: '🇪🇸', reaction: "Oh yes! ☀️", msg: "Golden beaches, hidden coves, mountain villages and the best sunsets in the Med." },
  { code: 'TFS', city: 'Tenerife', country: 'Spain', flag: '🇪🇸', reaction: "The eternal summer! 🌋", msg: "A volcanic island with sunshine 365 days a year. Pure magic." },
  { code: 'MLE', city: 'Maldives', country: 'Maldives', flag: '🇲🇻', reaction: "You absolute legend! 🏝️", msg: "Crystal water, overwater bungalows, coral reefs. The Maldives is a dream you get to live." },
  { code: 'NRT', city: 'Tokyo', country: 'Japan', flag: '🇯🇵', reaction: "Sugoi! 🍜✨", msg: "Tokyo is the future and the past living together. Ramen at midnight, cherry blossoms at dawn." },
  { code: 'CDG', city: 'Paris', country: 'France', flag: '🇫🇷', reaction: "Ooh là là! 🗼", msg: "The Eiffel Tower sparkling at night. Croissants in the morning. Paris never gets old." },
  { code: 'JFK', city: 'New York', country: 'USA', flag: '🇺🇸', reaction: "New York, New York! 🗽", msg: "The city that never sleeps. Every corner is a movie scene." },
  { code: 'BKK', city: 'Bangkok', country: 'Thailand', flag: '🇹🇭', reaction: "Sawadee kha! 🙏✨", msg: "Golden temples, floating markets, street food that'll change your life." },
  { code: 'ATH', city: 'Athens', country: 'Greece', flag: '🇬🇷', reaction: "Opa! 🏛️", msg: "The birthplace of democracy — and the most stunning ancient ruins on earth." },
  { code: 'LIS', city: 'Lisbon', country: 'Portugal', flag: '🇵🇹', reaction: "Que maravilha! 🎵", msg: "Cobblestone hills, pastel buildings, Fado music from a doorway. Lisbon steals hearts." },
  { code: 'FCO', city: 'Rome', country: 'Italy', flag: '🇮🇹', reaction: "Mamma mia! 🍕", msg: "The Colosseum, Vatican, gelato on every corner. When in Rome..." },
  { code: 'FAO', city: 'Faro', country: 'Portugal', flag: '🇵🇹', reaction: "Perfeito! 🌅", msg: "Golden cliffs, warm sea, and the Algarve's finest beaches." },
  { code: 'LPA', city: 'Gran Canaria', country: 'Spain', flag: '🇪🇸', reaction: "Brilliant choice! 🌴", msg: "Year-round sun, sand dunes, and carnival vibes. A little continent of an island." },
  { code: 'HER', city: 'Crete', country: 'Greece', flag: '🇬🇷', reaction: "Opa! 🫒", msg: "Minoan palaces, gorges, and the clearest sea in Greece." },
  { code: 'AMS', city: 'Amsterdam', country: 'Netherlands', flag: '🇳🇱', reaction: "Geweldig! 🚲", msg: "Canals, bikes, tulips, and the world's best museums." },
  { code: 'SIN', city: 'Singapore', country: 'Singapore', flag: '🇸🇬', reaction: "Shiok! 🌆", msg: "The cleanest, greenest, most futuristic city on earth." },
  { code: 'IST', city: 'Istanbul', country: 'Turkey', flag: '🇹🇷', reaction: "Merhaba! 🕌", msg: "Two continents, one city. The Bosphorus at sunset is unforgettable." },
  { code: 'DOH', city: 'Doha', country: 'Qatar', flag: '🇶🇦', reaction: "Yalla! 🌙", msg: "Ultra-modern skyline meets ancient souks. A city of contrasts." },
  { code: 'CUN', city: 'Cancún', country: 'Mexico', flag: '🇲🇽', reaction: "¡Ándale! 🌮", msg: "Caribbean turquoise water, ancient Mayan ruins, all-inclusive paradise." },
  { code: 'CPT', city: 'Cape Town', country: 'South Africa', flag: '🇿🇦', reaction: "Lekker! 🦁", msg: "Table Mountain, the finest wine, and the most dramatic coastline on earth." },
  { code: 'KEF', city: 'Reykjavik', country: 'Iceland', flag: '🇮🇸', reaction: "Frábært! 🌌", msg: "Northern Lights, geysers, hot springs, and midnight sun." },
  { code: 'VIE', city: 'Vienna', country: 'Austria', flag: '🇦🇹', reaction: "Wunderbar! 🎼", msg: "Mozart, schnitzel, imperial palaces, and the finest coffee culture." },
  { code: 'PRG', city: 'Prague', country: 'Czech Republic', flag: '🇨🇿', reaction: "Úžasné! 🏰", msg: "A fairytale city of cobblestones, gothic spires, and great beer." },
];

type Dest = typeof DESTINATIONS[number];
type Step = 'destination' | 'dates' | 'passengers' | 'results';

export default function FlightSearch() {
  const [step, setStep] = useState<Step>('destination');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Dest[]>([]);
  const [showSugg, setShowSugg] = useState(false);
  const [dest, setDest] = useState<Dest | null>(null);
  const [depDate, setDepDate] = useState('');
  const [retDate, setRetDate] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [animating, setAnimating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const ref = useRef<HTMLDivElement>(null);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowSugg(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  useEffect(() => {
    if (step === 'destination') setTimeout(() => inputRef.current?.focus(), 100);
  }, [step]);

  function goStep(s: Step) {
    setAnimating(true);
    setTimeout(() => { setStep(s); setAnimating(false); }, 180);
  }

  function handleInput(val: string) {
    setQuery(val);
    setDest(null);
    if (!val.trim()) { setSuggestions([]); setShowSugg(false); return; }
    const q = val.toLowerCase();
    const matches = DESTINATIONS.filter(d =>
      d.city.toLowerCase().startsWith(q) ||
      d.country.toLowerCase().startsWith(q) ||
      d.code.toLowerCase().startsWith(q)
    ).slice(0, 7);
    setSuggestions(matches.length ? matches : DESTINATIONS.slice(0, 5));
    setShowSugg(true);
  }

  function selectDest(d: Dest) {
    setDest(d);
    setQuery(`${d.city}, ${d.country}`);
    setShowSugg(false);
    setTimeout(() => goStep('dates'), 600);
  }

  function surpriseMe() {
    selectDest(DESTINATIONS[Math.floor(Math.random() * DESTINATIONS.length)]);
  }

  const countdown = depDate
    ? Math.ceil((new Date(depDate).getTime() - Date.now()) / 86400000)
    : null;

  // Build pre-filled URLs with ALL details
  const flightsUrl = dest
    ? `/flights?dest=${dest.code}&destCity=${encodeURIComponent(dest.city)}${depDate ? `&departure=${depDate}` : ''}${retDate ? `&return=${retDate}` : ''}&adults=${adults}&children=${children}`
    : '/flights';

  const hotelsUrl = dest
    ? `/hotels?city=${encodeURIComponent(dest.city)}${depDate ? `&checkin=${depDate}` : ''}${retDate ? `&checkout=${retDate}` : ''}&adults=${adults}&children=${children}`
    : '/hotels';

  const carsUrl = dest
    ? `/cars?location=${encodeURIComponent(dest.city)}${depDate ? `&pickup=${depDate}` : ''}${retDate ? `&dropoff=${retDate}` : ''}`
    : '/cars';

  const packagesUrl = dest
    ? `/packages?dest=${encodeURIComponent(dest.city)}${depDate ? `&departure=${depDate}` : ''}${retDate ? `&return=${retDate}` : ''}&guests=${adults}`
    : '/packages';

  return (
    <div className="max-w-2xl mx-auto w-full">
      <div className={`transition-all duration-200 ${animating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}>

        {/* ── STEP 1: Destination ── */}
        {step === 'destination' && (
          <div ref={ref} className="bg-white border border-[#E8ECF4] rounded-3xl shadow-[0_8px_40px_rgba(0,102,255,0.08)] p-5">
            <p className="text-[.65rem] font-black uppercase tracking-[2.5px] text-[#0066FF] mb-2">Where to? 🌍</p>
            <div className="relative mb-4">
              <input ref={inputRef} type="text" value={query}
                onChange={e => handleInput(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSugg(true)}
                placeholder="Type a city or country..."
                className="w-full px-4 py-4 rounded-2xl border-2 border-[#E8ECF4] focus:border-[#0066FF] outline-none font-[Poppins] font-semibold text-[1rem] text-[#1A1D2B] placeholder:text-[#C0C8D8] transition-colors" />

              {showSugg && suggestions.length > 0 && (
                <ul className="absolute z-50 w-full mt-2 bg-white border border-[#E8ECF4] rounded-2xl shadow-2xl overflow-hidden">
                  {suggestions.map(d => (
                    <li key={d.code} onMouseDown={() => selectDest(d)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-[#F8FAFC] last:border-0 transition-colors">
                      <span className="text-2xl">{d.flag}</span>
                      <div className="text-left">
                        <div className="font-[Poppins] font-bold text-[.9rem] text-[#1A1D2B]">{d.city}</div>
                        <div className="text-[.72rem] text-[#8E95A9]">{d.country}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Reaction */}
            {dest && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 mb-4">
                <div className="font-[Poppins] font-black text-[1.05rem] text-[#1A1D2B]">{dest.reaction}</div>
                <p className="text-[.8rem] text-[#5C6378] font-semibold mt-1">{dest.msg}</p>
              </div>
            )}

            {/* Popular chips */}
            {!dest && (
              <div className="mb-2">
                <p className="text-[.62rem] font-bold uppercase tracking-[2px] text-[#C0C8D8] mb-2">Popular right now</p>
                <div className="flex flex-wrap gap-2">
                  {DESTINATIONS.slice(0, 6).map(d => (
                    <button key={d.code} onMouseDown={() => selectDest(d)}
                      className="px-3 py-1.5 bg-[#F8FAFC] hover:bg-blue-50 border border-[#E8ECF4] hover:border-blue-200 rounded-full text-[.78rem] font-semibold text-[#5C6378] hover:text-[#0066FF] transition-all">
                      {d.flag} {d.city}
                    </button>
                  ))}
                  <button onMouseDown={surpriseMe}
                    className="px-3 py-1.5 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 hover:border-purple-300 rounded-full text-[.78rem] font-bold text-purple-600 transition-all">
                    🎲 Surprise me!
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Dates ── */}
        {step === 'dates' && dest && (
          <div className="bg-white border border-[#E8ECF4] rounded-3xl shadow-[0_8px_40px_rgba(0,102,255,0.08)] p-5">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{dest.flag}</span>
              <div>
                <p className="text-[.65rem] font-black uppercase tracking-[2.5px] text-[#0066FF]">When are you going?</p>
                <p className="font-[Poppins] font-black text-[1.1rem] text-[#1A1D2B]">{dest.city}, {dest.country}</p>
              </div>
              <button onClick={() => goStep('destination')} className="ml-auto text-[.72rem] text-[#8E95A9] hover:text-[#0066FF] font-semibold transition-colors">Change ✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-[.62rem] font-black uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Departure</label>
                <input type="date" value={depDate} min={today}
                  onChange={e => setDepDate(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-[#E8ECF4] focus:border-[#0066FF] outline-none font-[Poppins] font-semibold text-[.9rem] text-[#1A1D2B] transition-colors" />
              </div>
              <div>
                <label className="block text-[.62rem] font-black uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Return</label>
                <input type="date" value={retDate} min={depDate || today}
                  onChange={e => setRetDate(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-[#E8ECF4] focus:border-[#0066FF] outline-none font-[Poppins] font-semibold text-[.9rem] text-[#1A1D2B] transition-colors" />
              </div>
            </div>

            {countdown !== null && countdown > 0 && (
              <div className="bg-green-50 border border-green-100 rounded-2xl p-3 mb-4 text-center">
                <span className="font-[Poppins] font-black text-[1.5rem] text-[#1A1D2B]">{countdown}</span>
                <span className="text-[.78rem] font-bold text-green-700 ml-2">days until {dest.city}!</span>
                <p className="text-[.7rem] text-[#8E95A9] mt-0.5">
                  {countdown < 14 ? '🎒 Almost time — pack your bags!' : countdown < 60 ? '🎉 The excitement is building!' : '🧠 Smart — booking early gets the best prices!'}
                </p>
              </div>
            )}

            <button onClick={() => depDate && goStep('passengers')} disabled={!depDate}
              className="w-full bg-[#0066FF] hover:bg-[#0052CC] disabled:opacity-40 disabled:cursor-not-allowed text-white font-[Poppins] font-black text-[.95rem] py-3.5 rounded-2xl transition-all shadow-[0_4px_20px_rgba(0,102,255,0.25)]">
              Next — Who's going? →
            </button>
          </div>
        )}

        {/* ── STEP 3: Passengers ── */}
        {step === 'passengers' && dest && (
          <div className="bg-white border border-[#E8ECF4] rounded-3xl shadow-[0_8px_40px_rgba(0,102,255,0.08)] p-5">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-2xl">{dest.flag}</span>
              <div>
                <p className="text-[.65rem] font-black uppercase tracking-[2.5px] text-[#0066FF]">Who's joining you?</p>
                <p className="font-[Poppins] font-black text-[1.1rem] text-[#1A1D2B]">{dest.city} · {depDate}{retDate ? ` → ${retDate}` : ''}</p>
              </div>
              <button onClick={() => goStep('dates')} className="ml-auto text-[.72rem] text-[#8E95A9] hover:text-[#0066FF] font-semibold transition-colors">Change ✕</button>
            </div>
            <p className="text-[.8rem] text-[#8E95A9] font-semibold mb-5">
              {children > 0 ? "A family adventure! The best memories are made together 👨‍👩‍👧" : adults > 1 ? "Even better with company! 🥂" : "Solo trip — the bravest kind! 💪"}
            </p>

            {[
              { label: 'Adults', sub: 'Age 12+', val: adults, min: 1, set: setAdults },
              { label: 'Children', sub: 'Age 2–11', val: children, min: 0, set: setChildren },
            ].map(({ label, sub, val, min, set }) => (
              <div key={label} className="flex items-center justify-between py-4 border-b border-[#F8FAFC] last:border-0">
                <div>
                  <div className="font-[Poppins] font-bold text-[.9rem] text-[#1A1D2B]">{label}</div>
                  <div className="text-[.72rem] text-[#8E95A9]">{sub}</div>
                </div>
                <div className="flex items-center gap-4">
                  <button type="button" onClick={() => set(Math.max(min, val - 1))} disabled={val <= min}
                    className="w-10 h-10 rounded-full border-2 border-[#E8ECF4] hover:border-[#0066FF] hover:text-[#0066FF] flex items-center justify-center font-bold text-lg text-[#5C6378] transition-all disabled:opacity-30">−</button>
                  <span className="font-[Poppins] font-black text-[1.1rem] text-[#1A1D2B] w-6 text-center">{val}</span>
                  <button type="button" onClick={() => set(val + 1)}
                    className="w-10 h-10 rounded-full border-2 border-[#E8ECF4] hover:border-[#0066FF] hover:text-[#0066FF] flex items-center justify-center font-bold text-lg text-[#5C6378] transition-all">+</button>
                </div>
              </div>
            ))}

            <button onClick={() => goStep('results')}
              className="w-full mt-5 bg-[#0066FF] hover:bg-[#0052CC] text-white font-[Poppins] font-black text-[.95rem] py-3.5 rounded-2xl transition-all shadow-[0_4px_20px_rgba(0,102,255,0.25)]">
              Find me the best deals! 🔍
            </button>
          </div>
        )}

        {/* ── STEP 4: Results ── */}
        {step === 'results' && dest && (
          <div className="space-y-4">
            {/* Summary bar */}
            <div className="bg-white border border-[#E8ECF4] rounded-2xl px-5 py-3.5 flex items-center justify-between flex-wrap gap-2 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-xl">{dest.flag}</span>
                <div>
                  <span className="font-[Poppins] font-black text-[.95rem] text-[#1A1D2B]">{dest.city}</span>
                  <span className="text-[.75rem] text-[#8E95A9] font-semibold ml-2">{depDate}{retDate ? ` → ${retDate}` : ''} · {adults} adult{adults !== 1 ? 's' : ''}{children > 0 ? `, ${children} child${children !== 1 ? 'ren' : ''}` : ''}</span>
                </div>
              </div>
              <button onClick={() => { setStep('destination'); setDest(null); setQuery(''); setDepDate(''); setRetDate(''); }}
                className="text-[.72rem] text-[#0066FF] hover:text-[#0052CC] font-bold transition-colors">
                Start over ↺
              </button>
            </div>

            {/* Flights */}
            <div className="bg-white border border-[#E8ECF4] rounded-2xl overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F3F7]">
                <div className="flex items-center gap-2">
                  <span className="text-xl">✈</span>
                  <div>
                    <div className="font-[Poppins] font-black text-[.95rem] text-[#1A1D2B]">Flights to {dest.city}</div>
                    <div className="text-[.68rem] text-[#8E95A9] font-semibold">Compare 5 providers · live prices</div>
                  </div>
                </div>
                <a href={flightsUrl}
                  className="bg-[#0066FF] hover:bg-[#0052CC] text-white font-[Poppins] font-bold text-[.75rem] px-4 py-2 rounded-xl transition-all whitespace-nowrap">
                  See all →
                </a>
              </div>
              <div className="divide-y divide-[#F8FAFC]">
                {[
                  { name: 'Aviasales', icon: '✈', desc: 'Best price from 750+ airlines' },
                  { name: 'Kiwi.com', icon: '🥝', desc: 'Flexible combo routes' },
                  { name: 'Expedia', icon: '🌍', desc: 'Bundle flight + hotel & save 30%' },
                  { name: 'Trip.com', icon: '🗺', desc: 'Best for Asia & Middle East' },
                ].map(p => (
                  <a key={p.name} href={flightsUrl}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-blue-50/50 transition-colors group">
                    <span className="text-lg w-7 text-center">{p.icon}</span>
                    <div className="flex-1">
                      <div className="font-[Poppins] font-bold text-[.85rem] text-[#1A1D2B]">{p.name}</div>
                      <div className="text-[.68rem] text-[#8E95A9]">{p.desc}</div>
                    </div>
                    <span className="text-[#0066FF] text-[.75rem] font-bold opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Hotels */}
            <div className="bg-white border border-[#E8ECF4] rounded-2xl overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F3F7]">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🏨</span>
                  <div>
                    <div className="font-[Poppins] font-black text-[.95rem] text-[#1A1D2B]">Where to stay in {dest.city}</div>
                    <div className="text-[.68rem] text-[#8E95A9] font-semibold">Compare 3 providers · best rates</div>
                  </div>
                </div>
                <a href={hotelsUrl}
                  className="bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-[Poppins] font-bold text-[.75rem] px-4 py-2 rounded-xl transition-all whitespace-nowrap">
                  See all →
                </a>
              </div>
              <div className="divide-y divide-[#F8FAFC]">
                {[
                  { name: 'Booking.com', icon: '🏷', desc: '28M+ properties · free cancellation' },
                  { name: 'Expedia', icon: '🌍', desc: 'Bundle with flight and save' },
                  { name: 'Trip.com', icon: '🗺', desc: 'Flash sales & exclusive prices' },
                ].map(p => (
                  <a key={p.name} href={hotelsUrl}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-orange-50/50 transition-colors group">
                    <span className="text-lg w-7 text-center">{p.icon}</span>
                    <div className="flex-1">
                      <div className="font-[Poppins] font-bold text-[.85rem] text-[#1A1D2B]">{p.name}</div>
                      <div className="text-[.68rem] text-[#8E95A9]">{p.desc}</div>
                    </div>
                    <span className="text-[#0066FF] text-[.75rem] font-bold opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Car Hire + Packages row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <a href={carsUrl}
                className="bg-white border border-[#E8ECF4] rounded-2xl p-5 hover:border-emerald-200 hover:shadow-md transition-all group">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🚗</span>
                  <div className="font-[Poppins] font-black text-[.95rem] text-[#1A1D2B]">Car Hire</div>
                </div>
                <p className="text-[.75rem] text-[#8E95A9] font-semibold mb-3">Compare 6 providers in {dest.city}</p>
                <span className="text-emerald-600 font-[Poppins] font-bold text-[.78rem] group-hover:translate-x-0.5 transition-transform inline-block">Compare prices →</span>
              </a>
              <a href={packagesUrl}
                className="bg-white border border-[#E8ECF4] rounded-2xl p-5 hover:border-purple-200 hover:shadow-md transition-all group">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">📦</span>
                  <div className="font-[Poppins] font-black text-[.95rem] text-[#1A1D2B]">Packages</div>
                </div>
                <p className="text-[.75rem] text-[#8E95A9] font-semibold mb-3">Flight + hotel bundles to {dest.city}</p>
                <span className="text-purple-600 font-[Poppins] font-bold text-[.78rem] group-hover:translate-x-0.5 transition-transform inline-block">See deals →</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
