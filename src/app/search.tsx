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

type RecentSearch = { code: string; city: string; country: string; flag: string; ts: number };

function saveRecentSearch(dest: Dest) {
  try {
    const raw = localStorage.getItem('jma_recent_searches');
    const existing: RecentSearch[] = raw ? JSON.parse(raw) : [];
    const entry: RecentSearch = { code: dest.code, city: dest.city, country: dest.country, flag: dest.flag, ts: Date.now() };
    const filtered = existing.filter(s => s.code !== dest.code);
    const updated = [entry, ...filtered].slice(0, 3);
    localStorage.setItem('jma_recent_searches', JSON.stringify(updated));
  } catch { /* localStorage unavailable */ }
}

function getRecentSearches(): RecentSearch[] {
  try {
    const raw = localStorage.getItem('jma_recent_searches');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export default function FlightSearch() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Dest[]>([]);
  const [showSugg, setShowSugg] = useState(false);
  const [origin, setOrigin] = useState<Airport>(AIRPORTS[0]);
  const [showOriginPicker, setShowOriginPicker] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const originRef = useRef<HTMLDivElement>(null);

  // ── Auto-detect nearest airport with localStorage persistence ──
  useEffect(() => {
    // Load recent searches
    setRecentSearches(getRecentSearches());

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
    saveRecentSearch(dest);
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

  function submitSearch() {
    const q = query.trim().toLowerCase();
    if (!q) {
      inputRef.current?.focus();
      return;
    }
    // Resolve to a destination: exact match first, then startsWith, then includes
    const exact = DESTINATIONS.find(d => d.city.toLowerCase() === q || d.code.toLowerCase() === q);
    const partial = exact || DESTINATIONS.find(d => d.city.toLowerCase().startsWith(q)) || DESTINATIONS.find(d => d.city.toLowerCase().includes(q));
    if (partial) goToFlights(partial);
  }

  return (
    <div className="max-w-[680px] mx-auto w-full">
      {/* ── Floating Command Bar — glassmorphic dark, single horizontal row ── */}
      <div ref={ref}
        className="relative backdrop-blur-2xl bg-white/[.08] border border-white/15 rounded-2xl shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6),0_8px_24px_-8px_rgba(255,140,40,0.15)] p-2.5 flex items-center gap-2">

        {/* Origin pill — glass within glass */}
        <div ref={originRef} className="relative flex-shrink-0">
          <button type="button" onClick={() => setShowOriginPicker(!showOriginPicker)}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/25 transition-all">
            <span className="text-[.85rem]" aria-hidden="true">🛫</span>
            <span className="font-mono font-black text-[.78rem] sm:text-[.82rem] text-white tracking-wider">{origin.code}</span>
            <span className="text-[.55rem] text-white/40 hidden sm:inline" aria-hidden="true">▾</span>
          </button>
          {showOriginPicker && (
            <ul className="absolute z-50 left-0 mt-2 w-[260px] backdrop-blur-2xl bg-[#0F1B33]/95 border border-white/15 rounded-2xl shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7)] overflow-auto max-h-72 p-1">
              {AIRPORTS.map(ap => (
                <li key={ap.code} onMouseDown={() => changeOrigin(ap)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all ${ap.code === origin.code ? 'bg-orange-500/15 border border-orange-400/30' : 'hover:bg-white/10 border border-transparent'}`}>
                  <span className="font-mono text-[.72rem] font-black text-orange-300 w-9">{ap.code}</span>
                  <span className="font-poppins font-semibold text-[.82rem] text-white/90">{ap.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Destination input — borderless inside the glass bar */}
        <div className="relative flex-1 min-w-0">
          <input ref={inputRef} type="text" value={query}
            onChange={e => handleInput(e.target.value)}
            onFocus={() => { if (query.trim()) handleInput(query); }}
            onKeyDown={e => { if (e.key === 'Enter') submitSearch(); }}
            placeholder="Where will Scout take you?"
            aria-label="Where will Scout take you"
            className="w-full px-2 py-2.5 bg-transparent outline-none font-poppins font-semibold text-[.95rem] sm:text-[1rem] text-white placeholder:text-white/45 placeholder:font-medium" />

          {showSugg && suggestions.length > 0 && (
            <ul className="absolute z-50 left-0 right-0 mt-2 backdrop-blur-2xl bg-[#0F1B33]/95 border border-white/15 rounded-2xl shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7)] overflow-hidden p-1">
              {suggestions.map(d => (
                <li key={d.code} onMouseDown={() => selectDest(d)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 cursor-pointer transition-colors">
                  <span className="text-2xl" aria-hidden="true">{d.flag}</span>
                  <div className="flex-1 text-left min-w-0">
                    <div className="font-poppins font-bold text-[.9rem] text-white truncate">{d.city}</div>
                    <div className="text-[.7rem] text-white/50 truncate">{d.country}</div>
                  </div>
                  <span className="font-mono text-[.66rem] font-black text-orange-300/80">{d.code}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Search button — orange CTA with subtle glow */}
        <button type="button" onMouseDown={submitSearch}
          aria-label="Search"
          className="flex-shrink-0 flex items-center justify-center gap-1.5 px-3.5 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 hover:from-orange-300 hover:to-orange-500 text-white font-poppins font-black text-[.78rem] sm:text-[.85rem] uppercase tracking-wider shadow-[0_8px_24px_-6px_rgba(249,115,22,0.6)] hover:shadow-[0_12px_28px_-6px_rgba(249,115,22,0.8)] transition-all">
          <i className="fa-solid fa-magnifying-glass text-[.78rem]" aria-hidden="true" />
          <span className="hidden sm:inline">Go</span>
        </button>
      </div>

      {/* ── Pills row beneath the bar: recent searches → popular → surprise me ── */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
        {/* Recent searches first — most personal */}
        {recentSearches.length > 0 && (
          <>
            <span className="text-[.6rem] font-black uppercase tracking-[2px] text-orange-300/80 mr-1 hidden sm:inline">Pick up where you left off</span>
            {recentSearches.map(s => {
              const dest = DESTINATIONS.find(d => d.code === s.code);
              return (
                <button key={`recent-${s.code}`} type="button" onMouseDown={() => dest && goToFlights(dest)}
                  className="px-3 py-1.5 backdrop-blur-md bg-orange-400/15 hover:bg-orange-400/25 border border-orange-300/30 hover:border-orange-300/60 rounded-full text-[.74rem] font-bold text-orange-100 transition-all">
                  <span className="mr-1" aria-hidden="true">{s.flag}</span>{s.city}
                </button>
              );
            })}
            <span className="w-px h-4 bg-white/15 mx-1 hidden sm:inline-block" aria-hidden="true" />
          </>
        )}
        {/* Popular destinations */}
        {POPULAR.slice(0, 5).map(d => (
          <button key={`pop-${d.code}`} type="button" onMouseDown={() => goToFlights(d)}
            className="px-3 py-1.5 backdrop-blur-md bg-white/[.06] hover:bg-white/15 border border-white/15 hover:border-white/30 rounded-full text-[.74rem] font-semibold text-white/80 hover:text-white transition-all">
            <span className="mr-1" aria-hidden="true">{d.flag}</span>{d.city}
          </button>
        ))}
        <button type="button" onMouseDown={surpriseMe}
          className="px-3 py-1.5 backdrop-blur-md bg-gradient-to-r from-purple-400/15 to-pink-400/15 hover:from-purple-400/25 hover:to-pink-400/25 border border-purple-300/30 hover:border-purple-300/60 rounded-full text-[.74rem] font-bold text-purple-100 transition-all">
          🎲 Surprise me
        </button>
      </div>
    </div>
  );
}
