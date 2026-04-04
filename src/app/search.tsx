'use client';

import { useState, useRef, useEffect } from 'react';

// ── UK Airports with exact coordinates ────────────────────────────────────────
const AIRPORTS = [
  { code: 'LHR', name: 'London Heathrow', lat: 51.4700, lon: -0.4543 },
  { code: 'LGW', name: 'London Gatwick', lat: 51.1537, lon: -0.1821 },
  { code: 'STN', name: 'London Stansted', lat: 51.8860, lon: 0.2389 },
  { code: 'LTN', name: 'London Luton', lat: 51.8747, lon: -0.3683 },
  { code: 'SEN', name: 'London Southend', lat: 51.5714, lon: 0.6956 },
  { code: 'LCY', name: 'London City', lat: 51.5048, lon: 0.0495 },
  { code: 'MAN', name: 'Manchester', lat: 53.3537, lon: -2.2750 },
  { code: 'BHX', name: 'Birmingham', lat: 52.4539, lon: -1.7480 },
  { code: 'EDI', name: 'Edinburgh', lat: 55.9508, lon: -3.3726 },
  { code: 'GLA', name: 'Glasgow', lat: 55.8642, lon: -4.4331 },
  { code: 'BRS', name: 'Bristol', lat: 51.3827, lon: -2.7190 },
  { code: 'LPL', name: 'Liverpool', lat: 53.3336, lon: -2.8497 },
  { code: 'NCL', name: 'Newcastle', lat: 55.0375, lon: -1.6917 },
  { code: 'LBA', name: 'Leeds Bradford', lat: 53.8659, lon: -1.6606 },
  { code: 'EMA', name: 'East Midlands', lat: 52.8311, lon: -1.3281 },
  { code: 'BFS', name: 'Belfast', lat: 54.6575, lon: -6.2158 },
  { code: 'CWL', name: 'Cardiff', lat: 51.3967, lon: -3.3433 },
  { code: 'ABZ', name: 'Aberdeen', lat: 57.2019, lon: -2.1978 },
  { code: 'SOU', name: 'Southampton', lat: 50.9503, lon: -1.3568 },
  { code: 'EXT', name: 'Exeter', lat: 50.7344, lon: -3.4139 },
];

// ── Top 50 UK holiday destinations ────────────────────────────────────────────
const DESTINATIONS = [
  { code: 'BCN', city: 'Barcelona', country: 'Spain', flag: '🇪🇸' },
  { code: 'DXB', city: 'Dubai', country: 'UAE', flag: '🇦🇪' },
  { code: 'AGP', city: 'Malaga', country: 'Spain', flag: '🇪🇸' },
  { code: 'TFS', city: 'Tenerife', country: 'Spain', flag: '🇪🇸' },
  { code: 'PMI', city: 'Palma', country: 'Spain', flag: '🇪🇸' },
  { code: 'AYT', city: 'Antalya', country: 'Turkey', flag: '🇹🇷' },
  { code: 'CDG', city: 'Paris', country: 'France', flag: '🇫🇷' },
  { code: 'AMS', city: 'Amsterdam', country: 'Netherlands', flag: '🇳🇱' },
  { code: 'JFK', city: 'New York', country: 'USA', flag: '🇺🇸' },
  { code: 'FCO', city: 'Rome', country: 'Italy', flag: '🇮🇹' },
  { code: 'LIS', city: 'Lisbon', country: 'Portugal', flag: '🇵🇹' },
  { code: 'BKK', city: 'Bangkok', country: 'Thailand', flag: '🇹🇭' },
  { code: 'CUN', city: 'Cancun', country: 'Mexico', flag: '🇲🇽' },
  { code: 'MCO', city: 'Orlando', country: 'USA', flag: '🇺🇸' },
  { code: 'LCA', city: 'Larnaca', country: 'Cyprus', flag: '🇨🇾' },
  { code: 'CFU', city: 'Corfu', country: 'Greece', flag: '🇬🇷' },
  { code: 'RHO', city: 'Rhodes', country: 'Greece', flag: '🇬🇷' },
  { code: 'FAO', city: 'Faro', country: 'Portugal', flag: '🇵🇹' },
  { code: 'ALC', city: 'Alicante', country: 'Spain', flag: '🇪🇸' },
  { code: 'DLM', city: 'Dalaman', country: 'Turkey', flag: '🇹🇷' },
  { code: 'BJV', city: 'Bodrum', country: 'Turkey', flag: '🇹🇷' },
  { code: 'RAK', city: 'Marrakech', country: 'Morocco', flag: '🇲🇦' },
  { code: 'SSH', city: 'Sharm El Sheikh', country: 'Egypt', flag: '🇪🇬' },
  { code: 'HRG', city: 'Hurghada', country: 'Egypt', flag: '🇪🇬' },
  { code: 'ATH', city: 'Athens', country: 'Greece', flag: '🇬🇷' },
  { code: 'HER', city: 'Crete', country: 'Greece', flag: '🇬🇷' },
  { code: 'ACE', city: 'Lanzarote', country: 'Spain', flag: '🇪🇸' },
  { code: 'FUE', city: 'Fuerteventura', country: 'Spain', flag: '🇪🇸' },
  { code: 'LPA', city: 'Gran Canaria', country: 'Spain', flag: '🇪🇸' },
  { code: 'FNC', city: 'Madeira', country: 'Portugal', flag: '🇵🇹' },
  { code: 'DBV', city: 'Dubrovnik', country: 'Croatia', flag: '🇭🇷' },
  { code: 'SPU', city: 'Split', country: 'Croatia', flag: '🇭🇷' },
  { code: 'NCE', city: 'Nice', country: 'France', flag: '🇫🇷' },
  { code: 'DPS', city: 'Bali', country: 'Indonesia', flag: '🇮🇩' },
  { code: 'MLE', city: 'Maldives', country: 'Maldives', flag: '🇲🇻' },
  { code: 'HKT', city: 'Phuket', country: 'Thailand', flag: '🇹🇭' },
  { code: 'GOI', city: 'Goa', country: 'India', flag: '🇮🇳' },
  { code: 'LHE', city: 'Lahore', country: 'Pakistan', flag: '🇵🇰' },
  { code: 'ISB', city: 'Islamabad', country: 'Pakistan', flag: '🇵🇰' },
  { code: 'KHI', city: 'Karachi', country: 'Pakistan', flag: '🇵🇰' },
  { code: 'CPT', city: 'Cape Town', country: 'South Africa', flag: '🇿🇦' },
  { code: 'JNB', city: 'Johannesburg', country: 'South Africa', flag: '🇿🇦' },
  { code: 'SIN', city: 'Singapore', country: 'Singapore', flag: '🇸🇬' },
  { code: 'TYO', city: 'Tokyo', country: 'Japan', flag: '🇯🇵' },
  { code: 'SYD', city: 'Sydney', country: 'Australia', flag: '🇦🇺' },
  { code: 'YYZ', city: 'Toronto', country: 'Canada', flag: '🇨🇦' },
  { code: 'MRU', city: 'Mauritius', country: 'Mauritius', flag: '🇲🇺' },
  { code: 'SEZ', city: 'Seychelles', country: 'Seychelles', flag: '🇸🇨' },
  { code: 'ZNZ', city: 'Zanzibar', country: 'Tanzania', flag: '🇹🇿' },
  { code: 'HAV', city: 'Havana', country: 'Cuba', flag: '🇨🇺' },
];

type Dest = typeof DESTINATIONS[number];
type Airport = typeof AIRPORTS[number];

// ── Haversine distance in km ──────────────────────────────────────────────────
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getNearestAirport(lat: number, lon: number): Airport {
  let best = AIRPORTS[0];
  let bestDist = Infinity;
  for (const ap of AIRPORTS) {
    const d = haversine(lat, lon, ap.lat, ap.lon);
    if (d < bestDist) { bestDist = d; best = ap; }
  }
  return best;
}

// ── Popular pills (subset shown on homepage) ─────────────────────────────────
const POPULAR_CODES = ['DXB', 'BCN', 'AYT', 'PMI', 'TFS', 'MLE'];
const POPULAR = DESTINATIONS.filter(d => POPULAR_CODES.includes(d.code));

export default function FlightSearch() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Dest[]>([]);
  const [showSugg, setShowSugg] = useState(false);
  const [origin, setOrigin] = useState<Airport>(AIRPORTS[0]);
  const [showOriginPicker, setShowOriginPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const originRef = useRef<HTMLDivElement>(null);

  // ── Auto-detect nearest airport with localStorage persistence ──
  useEffect(() => {
    // Check localStorage first
    const saved = localStorage.getItem('jma_departure_airport');
    if (saved) {
      const found = AIRPORTS.find(a => a.code === saved);
      if (found) { setOrigin(found); return; }
    }

    // Otherwise detect via geolocation
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const nearest = getNearestAirport(pos.coords.latitude, pos.coords.longitude);
          setOrigin(nearest);
          localStorage.setItem('jma_departure_airport', nearest.code);
        },
        () => { /* denied — keep default LHR */ }
      );
    }
  }, []);

  // ── Close dropdowns on outside click ──
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (originRef.current && !originRef.current.contains(e.target as Node)) setShowOriginPicker(false);
      if (ref.current && !ref.current.contains(e.target as Node)) setShowSugg(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // ── Search input handler ──
  function handleInput(val: string) {
    setQuery(val);
    if (!val.trim()) { setSuggestions([]); setShowSugg(false); return; }
    const q = val.toLowerCase();
    const matches = DESTINATIONS.filter(d =>
      d.city.toLowerCase().startsWith(q) ||
      d.country.toLowerCase().startsWith(q) ||
      d.code.toLowerCase().startsWith(q) ||
      d.city.toLowerCase().includes(q)
    ).slice(0, 7);
    setSuggestions(matches.length ? matches : DESTINATIONS.slice(0, 5));
    setShowSugg(true);
  }

  // ── Navigate to flights page ──
  function goToFlights(dest: Dest) {
    window.location.href = `/flights?origin=${origin.code}&dest=${dest.code}&destCity=${encodeURIComponent(dest.city)}`;
  }

  function selectDest(d: Dest) {
    setQuery(`${d.city}, ${d.country}`);
    setShowSugg(false);
    goToFlights(d);
  }

  function surpriseMe() {
    const d = DESTINATIONS[Math.floor(Math.random() * DESTINATIONS.length)];
    goToFlights(d);
  }

  function changeOrigin(ap: Airport) {
    setOrigin(ap);
    setShowOriginPicker(false);
    localStorage.setItem('jma_departure_airport', ap.code);
  }

  return (
    <div className="max-w-2xl mx-auto w-full">
      <div ref={ref} className="bg-white border border-[#E8ECF4] rounded-3xl shadow-[0_8px_40px_rgba(0,102,255,0.08)] p-5">
        {/* Departing from */}
        <div ref={originRef} className="relative mb-3">
          <p className="text-[.62rem] font-black uppercase tracking-[2px] text-[#8E95A9] mb-1">Departing from</p>
          <button onClick={() => setShowOriginPicker(!showOriginPicker)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#E8ECF4] hover:border-[#0066FF] transition-colors w-full text-left">
            <span className="text-sm">🛫</span>
            <span className="font-[Poppins] font-bold text-[.85rem] text-[#1A1D2B]">{origin.name}</span>
            <span className="text-[.72rem] text-[#8E95A9] font-semibold">({origin.code})</span>
            <span className="ml-auto text-[.65rem] text-[#0066FF] font-bold">Change</span>
          </button>
          {showOriginPicker && (
            <ul className="absolute z-50 w-full mt-1 bg-white border border-[#E8ECF4] rounded-2xl shadow-2xl overflow-auto max-h-60">
              {AIRPORTS.map(ap => (
                <li key={ap.code} onMouseDown={() => changeOrigin(ap)}
                  className={`flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 cursor-pointer border-b border-[#F8FAFC] last:border-0 transition-colors ${ap.code === origin.code ? 'bg-blue-50' : ''}`}>
                  <span className="font-mono text-[.75rem] font-bold text-[#0066FF] w-8">{ap.code}</span>
                  <span className="font-[Poppins] font-semibold text-[.82rem] text-[#1A1D2B]">{ap.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Where to? */}
        <p className="text-[.65rem] font-black uppercase tracking-[2.5px] text-[#0066FF] mb-2">Where to? 🌍</p>
        <div className="relative mb-4">
          <input ref={inputRef} type="text" value={query}
            onChange={e => handleInput(e.target.value)}
            onFocus={() => { if (query.trim()) handleInput(query); }}
            placeholder="Type a city or country..."
            className="w-full px-4 py-4 rounded-2xl border-2 border-[#E8ECF4] focus:border-[#0066FF] outline-none font-[Poppins] font-semibold text-[1rem] text-[#1A1D2B] placeholder:text-[#C0C8D8] transition-colors" />

          {showSugg && suggestions.length > 0 && (
            <ul className="absolute z-50 w-full mt-2 bg-white border border-[#E8ECF4] rounded-2xl shadow-2xl overflow-hidden">
              {suggestions.map(d => (
                <li key={d.code} onMouseDown={() => selectDest(d)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-[#F8FAFC] last:border-0 transition-colors">
                  <span className="text-2xl">{d.flag}</span>
                  <div className="flex-1 text-left">
                    <div className="font-[Poppins] font-bold text-[.9rem] text-[#1A1D2B]">{d.city}</div>
                    <div className="text-[.72rem] text-[#8E95A9]">{d.country}</div>
                  </div>
                  <span className="font-mono text-[.68rem] font-bold text-[#8E95A9]">{d.code}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Popular chips */}
        <div className="mb-2">
          <p className="text-[.62rem] font-bold uppercase tracking-[2px] text-[#C0C8D8] mb-2">Popular right now</p>
          <div className="flex flex-wrap gap-2">
            {POPULAR.map(d => (
              <button key={d.code} onMouseDown={() => goToFlights(d)}
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
      </div>
    </div>
  );
}
