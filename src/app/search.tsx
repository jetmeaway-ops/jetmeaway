'use client';

import { useState, useRef, useEffect } from 'react';

const DESTINATIONS = [
  { code: 'DXB', city: 'Dubai', country: 'UAE', flag: '🇦🇪' },
  { code: 'BCN', city: 'Barcelona', country: 'Spain', flag: '🇪🇸' },
  { code: 'AYT', city: 'Antalya', country: 'Turkey', flag: '🇹🇷' },
  { code: 'PMI', city: 'Palma', country: 'Spain', flag: '🇪🇸' },
  { code: 'TFS', city: 'Tenerife', country: 'Spain', flag: '🇪🇸' },
  { code: 'LPA', city: 'Gran Canaria', country: 'Spain', flag: '🇪🇸' },
  { code: 'AGP', city: 'Málaga', country: 'Spain', flag: '🇪🇸' },
  { code: 'FAO', city: 'Faro', country: 'Portugal', flag: '🇵🇹' },
  { code: 'LIS', city: 'Lisbon', country: 'Portugal', flag: '🇵🇹' },
  { code: 'OPO', city: 'Porto', country: 'Portugal', flag: '🇵🇹' },
  { code: 'CDG', city: 'Paris', country: 'France', flag: '🇫🇷' },
  { code: 'AMS', city: 'Amsterdam', country: 'Netherlands', flag: '🇳🇱' },
  { code: 'FCO', city: 'Rome', country: 'Italy', flag: '🇮🇹' },
  { code: 'VCE', city: 'Venice', country: 'Italy', flag: '🇮🇹' },
  { code: 'NAP', city: 'Naples', country: 'Italy', flag: '🇮🇹' },
  { code: 'ATH', city: 'Athens', country: 'Greece', flag: '🇬🇷' },
  { code: 'HER', city: 'Crete', country: 'Greece', flag: '🇬🇷' },
  { code: 'RHO', city: 'Rhodes', country: 'Greece', flag: '🇬🇷' },
  { code: 'CFU', city: 'Corfu', country: 'Greece', flag: '🇬🇷' },
  { code: 'IST', city: 'Istanbul', country: 'Turkey', flag: '🇹🇷' },
  { code: 'JFK', city: 'New York', country: 'USA', flag: '🇺🇸' },
  { code: 'LAX', city: 'Los Angeles', country: 'USA', flag: '🇺🇸' },
  { code: 'MIA', city: 'Miami', country: 'USA', flag: '🇺🇸' },
  { code: 'MCO', city: 'Orlando', country: 'USA', flag: '🇺🇸' },
  { code: 'LAS', city: 'Las Vegas', country: 'USA', flag: '🇺🇸' },
  { code: 'SIN', city: 'Singapore', country: 'Singapore', flag: '🇸🇬' },
  { code: 'BKK', city: 'Bangkok', country: 'Thailand', flag: '🇹🇭' },
  { code: 'HKG', city: 'Hong Kong', country: 'China', flag: '🇭🇰' },
  { code: 'NRT', city: 'Tokyo', country: 'Japan', flag: '🇯🇵' },
  { code: 'SYD', city: 'Sydney', country: 'Australia', flag: '🇦🇺' },
  { code: 'MXP', city: 'Milan', country: 'Italy', flag: '🇮🇹' },
  { code: 'ZRH', city: 'Zürich', country: 'Switzerland', flag: '🇨🇭' },
  { code: 'VIE', city: 'Vienna', country: 'Austria', flag: '🇦🇹' },
  { code: 'BUD', city: 'Budapest', country: 'Hungary', flag: '🇭🇺' },
  { code: 'PRG', city: 'Prague', country: 'Czech Republic', flag: '🇨🇿' },
  { code: 'KEF', city: 'Reykjavik', country: 'Iceland', flag: '🇮🇸' },
  { code: 'DUB', city: 'Dublin', country: 'Ireland', flag: '🇮🇪' },
  { code: 'MLE', city: 'Maldives', country: 'Maldives', flag: '🇲🇻' },
  { code: 'CMB', city: 'Colombo', country: 'Sri Lanka', flag: '🇱🇰' },
  { code: 'KTM', city: 'Kathmandu', country: 'Nepal', flag: '🇳🇵' },
  { code: 'DEL', city: 'New Delhi', country: 'India', flag: '🇮🇳' },
  { code: 'BOM', city: 'Mumbai', country: 'India', flag: '🇮🇳' },
  { code: 'DOH', city: 'Doha', country: 'Qatar', flag: '🇶🇦' },
  { code: 'AUH', city: 'Abu Dhabi', country: 'UAE', flag: '🇦🇪' },
  { code: 'CUN', city: 'Cancún', country: 'Mexico', flag: '🇲🇽' },
  { code: 'CPT', city: 'Cape Town', country: 'South Africa', flag: '🇿🇦' },
  { code: 'MAD', city: 'Madrid', country: 'Spain', flag: '🇪🇸' },
  { code: 'IBZ', city: 'Ibiza', country: 'Spain', flag: '🇪🇸' },
  { code: 'FNC', city: 'Madeira', country: 'Portugal', flag: '🇵🇹' },
  { code: 'TLV', city: 'Tel Aviv', country: 'Israel', flag: '🇮🇱' },
  { code: 'KUL', city: 'Kuala Lumpur', country: 'Malaysia', flag: '🇲🇾' },
];

type Dest = typeof DESTINATIONS[number];

export default function FlightSearch() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Dest[]>([]);
  const [selected, setSelected] = useState<Dest | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  function handleInput(val: string) {
    setQuery(val);
    setSelected(null);
    if (val.length < 1) { setSuggestions([]); setOpen(false); return; }
    const q = val.toLowerCase();
    const matches = DESTINATIONS.filter(d =>
      d.city.toLowerCase().startsWith(q) ||
      d.country.toLowerCase().startsWith(q) ||
      d.code.toLowerCase().startsWith(q)
    ).slice(0, 7);
    setSuggestions(matches);
    setOpen(matches.length > 0);
  }

  function handleSelect(d: Dest) {
    setQuery(`${d.city}, ${d.country}`);
    setSelected(d);
    setOpen(false);
  }

  function handleSearch() {
    if (!query.trim()) return;
    // If nothing selected from dropdown, try to match
    if (!selected) {
      const q = query.toLowerCase();
      const match = DESTINATIONS.find(d =>
        d.city.toLowerCase().startsWith(q) || d.code.toLowerCase() === q
      );
      if (match) { setSelected(match); setOpen(false); }
    }
  }

  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  const flightsUrl = selected
    ? `/flights?dest=${selected.code}&destCity=${encodeURIComponent(selected.city)}`
    : '/flights';

  const hotelsUrl = selected
    ? `/hotels?city=${encodeURIComponent(selected.city)}`
    : '/hotels';

  return (
    <div className="max-w-2xl mx-auto w-full">

      {/* Search bar */}
      <div ref={ref} className="relative">
        <div className="bg-white border border-[#E8ECF4] rounded-2xl shadow-[0_8px_40px_rgba(0,102,255,0.08)] flex items-center gap-3 px-5 py-4">
          <span className="text-[1.3rem]">🌍</span>
          <input
            type="text"
            value={query}
            onChange={e => handleInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Where do you want to go?"
            className="flex-1 bg-transparent outline-none font-[Poppins] font-semibold text-[1rem] text-[#1A1D2B] placeholder:text-[#B0B8CC]"
            autoComplete="off"
          />
          <button
            onClick={handleSearch}
            className="bg-[#0066FF] hover:bg-[#0052CC] text-white font-[Poppins] font-black text-[.82rem] px-5 py-2.5 rounded-xl transition-all shadow-[0_4px_14px_rgba(0,102,255,0.3)] whitespace-nowrap">
            Search →
          </button>
        </div>

        {/* Dropdown suggestions */}
        {open && suggestions.length > 0 && (
          <ul className="absolute z-50 w-full mt-2 bg-white border border-[#E8ECF4] rounded-2xl shadow-2xl overflow-hidden">
            {suggestions.map(d => (
              <li key={d.code}
                onMouseDown={() => handleSelect(d)}
                className="flex items-center gap-3 px-5 py-3 hover:bg-blue-50 cursor-pointer transition-colors border-b border-[#F1F3F7] last:border-0">
                <span className="text-xl">{d.flag}</span>
                <div className="text-left">
                  <div className="font-[Poppins] font-bold text-[.88rem] text-[#1A1D2B]">{d.city}</div>
                  <div className="text-[.72rem] text-[#8E95A9] font-medium">{d.country} · {d.code}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Results — show once destination selected */}
      {selected && (
        <div className="mt-5 text-left">
          <p className="text-[.68rem] font-black uppercase tracking-[2px] text-[#8E95A9] mb-3 text-center">
            {selected.flag} Results for <strong className="text-[#1A1D2B]">{selected.city}</strong>
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Flights card */}
            <a href={flightsUrl}
              className="bg-white border border-[#E8ECF4] rounded-2xl p-5 hover:border-blue-300 hover:shadow-md transition-all group text-left">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-xl">✈</div>
                <div>
                  <div className="font-[Poppins] font-black text-[.9rem] text-[#1A1D2B] group-hover:text-[#0066FF] transition-colors">
                    Flights to {selected.city}
                  </div>
                  <div className="text-[.68rem] text-[#8E95A9] font-semibold">Compare 5 providers · live prices</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[.7rem] text-[#8E95A9]">Aviasales · Kiwi · Expedia · Trip.com</span>
                <span className="text-[#0066FF] font-bold text-[.78rem]">Search →</span>
              </div>
            </a>

            {/* Hotels card */}
            <a href={hotelsUrl}
              className="bg-white border border-[#E8ECF4] rounded-2xl p-5 hover:border-blue-300 hover:shadow-md transition-all group text-left">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-xl">🏨</div>
                <div>
                  <div className="font-[Poppins] font-black text-[.9rem] text-[#1A1D2B] group-hover:text-[#0066FF] transition-colors">
                    Hotels in {selected.city}
                  </div>
                  <div className="text-[.68rem] text-[#8E95A9] font-semibold">Compare 3 providers · best rates</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[.7rem] text-[#8E95A9]">Booking.com · Expedia · Trip.com</span>
                <span className="text-[#0066FF] font-bold text-[.78rem]">Search →</span>
              </div>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
