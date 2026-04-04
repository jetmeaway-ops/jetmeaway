'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { redirectUrl } from '@/lib/redirect';

/* ═══════════════════════════════════════════════════════════════════════════
   DESTINATIONS (matches hotels page)
   ═══════════════════════════════════════════════════════════════════════════ */

const DESTINATIONS = [
  'London', 'Manchester', 'Birmingham', 'Edinburgh', 'Glasgow', 'Liverpool',
  'Barcelona', 'Madrid', 'Malaga', 'Tenerife', 'Lanzarote', 'Fuerteventura',
  'Gran Canaria', 'Palma', 'Alicante', 'Faro', 'Lisbon',
  'Paris', 'Nice', 'Amsterdam', 'Rome', 'Venice', 'Florence', 'Milan',
  'Athens', 'Crete', 'Rhodes', 'Corfu', 'Santorini',
  'Dubrovnik', 'Split', 'Antalya', 'Bodrum', 'Dalaman', 'Istanbul',
  'Dubai', 'Marrakech', 'Cairo', 'New York', 'Los Angeles', 'Miami',
  'Las Vegas', 'Orlando', 'San Francisco', 'Cancun', 'Punta Cana',
  'Tokyo', 'Bangkok', 'Singapore', 'Bali', 'Phuket', 'Maldives',
  'Sydney', 'Melbourne', 'Cape Town', 'Johannesburg',
  'Toronto', 'Vancouver', 'Hong Kong', 'Seoul', 'Kuala Lumpur',
  'Lima', 'Buenos Aires', 'Rio de Janeiro',
  'Vienna', 'Prague', 'Budapest', 'Copenhagen', 'Stockholm',
  'Doha', 'Reykjavik', 'Dublin',
  // Pakistan
  'Lahore', 'Islamabad', 'Karachi',
];

/* ═══════════════════════════════════════════════════════════════════════════
   UK AIRPORTS (for "From" field)
   ═══════════════════════════════════════════════════════════════════════════ */

const UK_AIRPORTS = [
  { name: 'London Heathrow', code: 'LHR' }, { name: 'London Gatwick', code: 'LGW' },
  { name: 'London Stansted', code: 'STN' }, { name: 'London Luton', code: 'LTN' },
  { name: 'London City', code: 'LCY' }, { name: 'London Southend', code: 'SEN' },
  { name: 'Manchester', code: 'MAN' }, { name: 'Birmingham', code: 'BHX' },
  { name: 'Edinburgh', code: 'EDI' }, { name: 'Glasgow', code: 'GLA' },
  { name: 'Bristol', code: 'BRS' }, { name: 'Leeds Bradford', code: 'LBA' },
  { name: 'Liverpool', code: 'LPL' }, { name: 'Newcastle', code: 'NCL' },
  { name: 'East Midlands', code: 'EMA' }, { name: 'Belfast', code: 'BFS' },
  { name: 'Aberdeen', code: 'ABZ' }, { name: 'Southampton', code: 'SOU' },
  { name: 'Cardiff', code: 'CWL' }, { name: 'Bournemouth', code: 'BOH' },
];

/* ═══════════════════════════════════════════════════════════════════════════
   DESTINATION → IATA mapping (for flight API calls)
   ═══════════════════════════════════════════════════════════════════════════ */

const DEST_IATA: Record<string, string> = {
  'barcelona': 'BCN', 'madrid': 'MAD', 'malaga': 'AGP', 'tenerife': 'TFS',
  'lanzarote': 'ACE', 'fuerteventura': 'FUE', 'gran canaria': 'LPA', 'palma': 'PMI',
  'alicante': 'ALC', 'faro': 'FAO', 'lisbon': 'LIS', 'paris': 'CDG', 'nice': 'NCE',
  'amsterdam': 'AMS', 'rome': 'FCO', 'venice': 'VCE', 'florence': 'FLR', 'milan': 'MXP',
  'athens': 'ATH', 'crete': 'HER', 'rhodes': 'RHO', 'corfu': 'CFU', 'santorini': 'JTR',
  'dubrovnik': 'DBV', 'split': 'SPU', 'antalya': 'AYT', 'bodrum': 'BJV', 'dalaman': 'DLM',
  'istanbul': 'IST', 'dubai': 'DXB', 'marrakech': 'RAK', 'cairo': 'CAI',
  'new york': 'JFK', 'los angeles': 'LAX', 'miami': 'MIA', 'las vegas': 'LAS',
  'orlando': 'MCO', 'san francisco': 'SFO', 'cancun': 'CUN', 'punta cana': 'PUJ',
  'tokyo': 'NRT', 'bangkok': 'BKK', 'singapore': 'SIN', 'bali': 'DPS', 'phuket': 'HKT',
  'maldives': 'MLE', 'sydney': 'SYD', 'melbourne': 'MEL', 'cape town': 'CPT',
  'toronto': 'YYZ', 'vancouver': 'YVR', 'hong kong': 'HKG', 'seoul': 'ICN',
  'kuala lumpur': 'KUL', 'vienna': 'VIE', 'prague': 'PRG', 'budapest': 'BUD',
  'copenhagen': 'CPH', 'stockholm': 'ARN', 'doha': 'DOH', 'reykjavik': 'KEF',
  'dublin': 'DUB', 'london': 'LHR', 'manchester': 'MAN', 'edinburgh': 'EDI',
  'glasgow': 'GLA', 'birmingham': 'BHX', 'liverpool': 'LPL',
  'lahore': 'LHE', 'islamabad': 'ISB', 'karachi': 'KHI',
  'lima': 'LIM', 'buenos aires': 'EZE', 'rio de janeiro': 'GIG',
  'johannesburg': 'JNB',
};

/* ═══════════════════════════════════════════════════════════════════════════
   AUTOCOMPLETE COMPONENTS
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
      <input type="text" placeholder="Where do you want to go? — e.g. Tenerife, Dubai, Bali" value={value} autoComplete="off"
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className="w-full px-4 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.9rem] font-semibold text-[#1A1D2B] outline-none focus:border-purple-500 focus:bg-white transition-all placeholder:text-[#B0B8CC]" />
      {open && (
        <ul className="absolute z-50 w-full mt-1.5 bg-white border border-[#E8ECF4] rounded-2xl shadow-2xl overflow-auto max-h-64">
          {filtered.map(c => (
            <li key={c} onMouseDown={() => { onChange(c); setOpen(false); }}
              className={`px-4 py-3 hover:bg-purple-50 cursor-pointer transition-colors border-b border-[#F1F3F7] last:border-0 font-[Poppins] font-semibold text-[.88rem] text-[#1A1D2B] ${value === c ? 'bg-purple-50' : ''}`}>
              {c}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FromPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const q = value.toLowerCase().trim();
  const filtered = q.length >= 1
    ? UK_AIRPORTS.filter(a => a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q)).slice(0, 8)
    : UK_AIRPORTS.slice(0, 10);

  return (
    <div ref={ref} className="relative">
      <input type="text" placeholder="Departure airport — e.g. London Heathrow" value={value} autoComplete="off"
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className="w-full px-4 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.9rem] font-semibold text-[#1A1D2B] outline-none focus:border-purple-500 focus:bg-white transition-all placeholder:text-[#B0B8CC]" />
      {open && (
        <ul className="absolute z-50 w-full mt-1.5 bg-white border border-[#E8ECF4] rounded-2xl shadow-2xl overflow-auto max-h-64">
          {filtered.map(a => (
            <li key={a.code} onMouseDown={() => { onChange(`${a.name} (${a.code})`); setOpen(false); }}
              className="px-4 py-3 hover:bg-purple-50 cursor-pointer transition-colors border-b border-[#F1F3F7] last:border-0 font-[Poppins] font-semibold text-[.85rem] text-[#1A1D2B]">
              ✈️ {a.name} <span className="text-[#8E95A9] text-[.75rem]">({a.code})</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   GUEST PICKER (reused from old page)
   ═══════════════════════════════════════════════════════════════════════════ */

function PkgGuestPicker({ adults, children: ch, childrenAges, onChange }: {
  adults: number; children: number; childrenAges: number[];
  onChange: (a: number, c: number, ages: number[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  function setAdults(n: number) { onChange(n, ch, childrenAges); }
  function setChildren(n: number) {
    const ages = [...childrenAges];
    while (ages.length < n) ages.push(5);
    onChange(adults, n, ages.slice(0, n));
  }
  function setChildAge(idx: number, age: number) {
    const ages = [...childrenAges];
    ages[idx] = age;
    onChange(adults, ch, ages);
  }

  const label = [
    `${adults} Adult${adults !== 1 ? 's' : ''}`,
    ch > 0 ? `${ch} Child${ch !== 1 ? 'ren' : ''}` : null,
  ].filter(Boolean).join(', ');

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full px-3 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-left text-[.82rem] font-semibold text-[#1A1D2B] outline-none focus:border-purple-500 hover:bg-white transition-all flex items-center justify-between">
        <span>{label}</span>
        <span className="text-[#B0B8CC] text-xs">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div className="absolute z-50 w-80 mt-1.5 right-0 bg-white border border-[#E8ECF4] rounded-2xl shadow-2xl p-4">
          <div className="flex items-center justify-between py-3 border-b border-[#F1F3F7]">
            <div><div className="font-[Poppins] font-bold text-[.85rem] text-[#1A1D2B]">Adults</div><div className="text-[.7rem] text-[#8E95A9]">Age 16+</div></div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setAdults(adults - 1)} disabled={adults <= 1} className="w-8 h-8 rounded-full border-2 border-[#E8ECF4] flex items-center justify-center text-[#5C6378] font-bold text-lg hover:border-purple-500 transition-all disabled:opacity-30">−</button>
              <span className="font-[Poppins] font-black text-[.95rem] text-[#1A1D2B] w-5 text-center">{adults}</span>
              <button type="button" onClick={() => setAdults(adults + 1)} disabled={adults >= 10} className="w-8 h-8 rounded-full border-2 border-[#E8ECF4] flex items-center justify-center text-[#5C6378] font-bold text-lg hover:border-purple-500 transition-all disabled:opacity-30">+</button>
            </div>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-[#F1F3F7]">
            <div><div className="font-[Poppins] font-bold text-[.85rem] text-[#1A1D2B]">Children</div><div className="text-[.7rem] text-[#8E95A9]">Age 0–15</div></div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setChildren(ch - 1)} disabled={ch <= 0} className="w-8 h-8 rounded-full border-2 border-[#E8ECF4] flex items-center justify-center text-[#5C6378] font-bold text-lg hover:border-purple-500 transition-all disabled:opacity-30">−</button>
              <span className="font-[Poppins] font-black text-[.95rem] text-[#1A1D2B] w-5 text-center">{ch}</span>
              <button type="button" onClick={() => setChildren(ch + 1)} disabled={ch >= 6} className="w-8 h-8 rounded-full border-2 border-[#E8ECF4] flex items-center justify-center text-[#5C6378] font-bold text-lg hover:border-purple-500 transition-all disabled:opacity-30">+</button>
            </div>
          </div>
          {ch > 0 && (
            <div className="py-3 border-b border-[#F1F3F7]">
              <p className="text-[.68rem] font-bold text-[#8E95A9] uppercase tracking-[1.5px] mb-2">Child ages</p>
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: ch }).map((_, i) => (
                  <div key={i} className="text-center">
                    <div className="text-[.6rem] text-[#8E95A9] mb-1">Child {i + 1}</div>
                    <select value={childrenAges[i] ?? 5} onChange={e => setChildAge(i, Number(e.target.value))}
                      className="w-full text-center text-[.8rem] font-bold text-[#1A1D2B] bg-[#F8FAFC] border border-[#E8ECF4] rounded-lg py-1.5 outline-none focus:border-purple-500">
                      {Array.from({ length: 16 }, (_, a) => a).map(age => (
                        <option key={age} value={age}>{age < 1 ? 'Under 1' : age}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
          <button type="button" onClick={() => setOpen(false)}
            className="w-full mt-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-[Poppins] font-bold text-[.8rem] py-2.5 rounded-xl transition-colors">Done</button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   LOADING STATE
   ═══════════════════════════════════════════════════════════════════════════ */

const LOADING_MSGS = [
  'Checking flight prices...',
  'Finding hotel rates...',
  'Calculating package estimate...',
  'Comparing Expedia packages...',
  'Checking Trip.com deals...',
];

function LoadingState({ dest }: { dest: string }) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const msgTimer = setInterval(() => setMsgIdx(i => (i + 1) % LOADING_MSGS.length), 700);
    const progTimer = setInterval(() => setProgress(p => Math.min(p + 1, 92)), 50);
    return () => { clearInterval(msgTimer); clearInterval(progTimer); };
  }, []);

  return (
    <section className="max-w-[900px] mx-auto px-5 py-10">
      <div className="bg-white border border-[#E8ECF4] rounded-2xl p-8 text-center shadow-sm">
        <div className="w-full bg-[#F1F3F7] rounded-full h-2 mb-5 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-purple-400 to-indigo-500 rounded-full transition-all duration-100" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-[.9rem] font-bold text-[#5C6378]">{LOADING_MSGS[msgIdx]}</span>
        </div>
        <p className="text-[.78rem] text-[#8E95A9] font-semibold">Building package estimate for <strong className="text-[#1A1D2B]">{dest}</strong></p>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   AFFILIATE LINK BUILDERS
   ═══════════════════════════════════════════════════════════════════════════ */

const TP_WRAP = 'https://tp.media/r?marker=714449&trs=512633';

function buildExpediaUrl(dest: string, from: string, depDate: string, retDate: string, adults: number) {
  const fromCity = from.replace(/\s*\(.*\)$/, '');
  return `https://www.expedia.co.uk/Packages-search?destination=${encodeURIComponent(dest)}&startDate=${depDate}&endDate=${retDate}&adults=${adults}&origin=${encodeURIComponent(fromCity)}&affcid=clbU3QK`;
}

function buildTripUrl(dest: string, depDate: string, retDate: string, adults: number) {
  const inner = `https://www.trip.com/packages/list?from=&to=${encodeURIComponent(dest)}&startDate=${depDate}&endDate=${retDate}&adult=${adults}`;
  return `${TP_WRAP}&p=8311&u=${encodeURIComponent(inner)}`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   POPULAR DESTINATIONS
   ═══════════════════════════════════════════════════════════════════════════ */

const POPULAR_DESTS = [
  { name: 'Tenerife', flag: '🇪🇸', est: 449, photo: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=400&h=300&fit=crop' },
  { name: 'Antalya', flag: '🇹🇷', est: 399, photo: 'https://images.unsplash.com/photo-1568322503122-d237a9968485?w=400&h=300&fit=crop' },
  { name: 'Palma', flag: '🇪🇸', est: 399, photo: 'https://images.unsplash.com/photo-1591970934008-b42acc22a339?w=400&h=300&fit=crop' },
  { name: 'Dubai', flag: '🇦🇪', est: 599, photo: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=300&fit=crop' },
  { name: 'Lanzarote', flag: '🇪🇸', est: 429, photo: 'https://images.unsplash.com/photo-1572099606223-6e29045d7de3?w=400&h=300&fit=crop' },
  { name: 'Crete', flag: '🇬🇷', est: 449, photo: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=400&h=300&fit=crop' },
  { name: 'Faro', flag: '🇵🇹', est: 349, photo: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=400&h=300&fit=crop' },
  { name: 'Cancun', flag: '🇲🇽', est: 799, photo: 'https://images.unsplash.com/photo-1510097467424-192d713fd8b2?w=400&h=300&fit=crop' },
];

/* ═══════════════════════════════════════════════════════════════════════════
   BOARD / STAR OPTIONS
   ═══════════════════════════════════════════════════════════════════════════ */

const BOARD_TYPES = ['Any', 'Room Only', 'Half Board', 'Full Board', 'All Inclusive'] as const;
const STAR_OPTIONS = ['Any', '2★', '3★', '4★', '5★'] as const;

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

interface FlightResult { price: number; airline: string; }
interface HotelResult { name: string; pricePerNight: number; stars: number; }

function PackagesContent() {
  const [from, setFrom] = useState('');
  const [dest, setDest] = useState('');
  const [depDate, setDepDate] = useState('');
  const [retDate, setRetDate] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [childrenAges, setChildrenAges] = useState<number[]>([]);
  const [duration, setDuration] = useState('7');
  const [starFilter, setStarFilter] = useState('Any');
  const [boardFilter, setBoardFilter] = useState('Any');

  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchedDest, setSearchedDest] = useState('');
  const [searchedFrom, setSearchedFrom] = useState('');

  const [cheapestFlight, setCheapestFlight] = useState<number | null>(null);
  const [cheapestHotel, setCheapestHotel] = useState<number | null>(null);
  const [flightAirline, setFlightAirline] = useState('');

  const resultsRef = useRef<HTMLDivElement>(null);

  // Read URL params + localStorage
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const d = p.get('dest') || p.get('to') || p.get('destination') || '';
    const f = p.get('from') || '';
    const dep = p.get('depart') || p.get('departure') || '';
    const ret = p.get('return') || '';
    const a = p.get('adults');
    const c = p.get('children');
    if (d) setDest(d);
    if (dep) setDepDate(dep);
    if (ret) setRetDate(ret);
    if (a) setAdults(Math.max(1, parseInt(a)));
    if (c) setChildren(Math.max(0, parseInt(c)));

    // From field: URL param > localStorage > empty
    if (f) {
      setFrom(f);
    } else {
      try {
        const stored = localStorage.getItem('jma_departure_airport');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.name && parsed.code) setFrom(`${parsed.name} (${parsed.code})`);
        }
      } catch { /* no stored airport */ }
    }
  }, []);

  const today = new Date().toISOString().split('T')[0];

  const nights = depDate && retDate
    ? Math.max(1, Math.round((new Date(retDate).getTime() - new Date(depDate).getTime()) / 86400000))
    : parseInt(duration);

  const handleSearch = useCallback(async () => {
    if (!dest) { alert('Please enter a destination'); return; }
    if (!depDate) { alert('Please select a departure date'); return; }

    setSearchedDest(dest);
    setSearchedFrom(from);
    setLoading(true);
    setSearched(false);
    setCheapestFlight(null);
    setCheapestHotel(null);
    setFlightAirline('');

    // Extract IATA codes
    const fromMatch = from.match(/\(([A-Z]{3})\)/);
    const fromCode = fromMatch ? fromMatch[1] : '';
    const destCode = DEST_IATA[dest.toLowerCase()] || '';

    // Fetch flight + hotel data in parallel
    const effectiveReturn = retDate || (() => {
      const d = new Date(depDate);
      d.setDate(d.getDate() + parseInt(duration));
      return d.toISOString().split('T')[0];
    })();

    const [flightRes, hotelRes] = await Promise.all([
      fromCode && destCode
        ? fetch(`/api/flights?origin=${fromCode}&destination=${destCode}&departure=${depDate}&return=${effectiveReturn}&adults=${adults}`)
            .then(r => r.ok ? r.json() : null).catch(() => null)
        : Promise.resolve(null),
      fetch(`/api/hotels?city=${encodeURIComponent(dest)}&checkin=${depDate}&checkout=${effectiveReturn}&adults=${adults}`)
        .then(r => r.ok ? r.json() : null).catch(() => null),
    ]);

    // Extract cheapest flight
    if (flightRes?.flights?.length > 0) {
      const cheapest = flightRes.flights[0];
      setCheapestFlight(cheapest.price);
      setFlightAirline(cheapest.airline || '');
    }

    // Extract cheapest hotel
    if (hotelRes?.hotels?.length > 0) {
      const sorted = [...hotelRes.hotels].sort((a: HotelResult, b: HotelResult) => a.pricePerNight - b.pricePerNight);
      setCheapestHotel(sorted[0].pricePerNight);
    }

    setLoading(false);
    setSearched(true);
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }, [from, dest, depDate, retDate, adults, duration]);

  // Auto-search when URL params fill all required fields
  const autoSearched = useRef(false);
  useEffect(() => {
    if (!autoSearched.current && dest && depDate) {
      autoSearched.current = true;
      handleSearch();
    }
  }, [dest, depDate, handleSearch]);

  const effectiveReturn = retDate || (() => {
    if (!depDate) return '';
    const d = new Date(depDate);
    d.setDate(d.getDate() + parseInt(duration));
    return d.toISOString().split('T')[0];
  })();

  const hotelTotal = cheapestHotel ? cheapestHotel * nights : null;
  const estimatedTotal = cheapestFlight && hotelTotal ? cheapestFlight + hotelTotal : null;
  const hasPartialData = cheapestFlight !== null || cheapestHotel !== null;

  const destIata = DEST_IATA[searchedDest.toLowerCase()] || '';

  return (
    <>
      <Header />

      {/* ── Hero + Search ── */}
      <section className="pt-36 pb-10 px-5 bg-[radial-gradient(ellipse_at_top,#F0E8FF_0%,#fff_55%,#F8FAFC_100%)]">
        <div className="max-w-[860px] mx-auto text-center mb-8">
          <span className="inline-block bg-purple-50 text-purple-600 text-[.65rem] font-black uppercase tracking-[2.5px] px-3.5 py-1.5 rounded-full mb-4">📦 Holiday Packages</span>
          <h1 className="font-[Poppins] text-[2.4rem] md:text-[3.6rem] font-black text-[#1A1D2B] leading-[1.05] tracking-tight mb-3">
            Complete <em className="italic bg-gradient-to-br from-purple-500 to-indigo-600 bg-clip-text text-transparent">Holiday</em> Packages
          </h1>
          <p className="text-[1rem] text-[#8E95A9] font-semibold max-w-[520px] mx-auto">Flight + hotel bundles — compare prices across 2 package providers.</p>
        </div>

        <div className="max-w-[860px] mx-auto bg-white border border-[#E8ECF4] rounded-3xl p-6 shadow-[0_8px_40px_rgba(0,0,0,0.07)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">From</label>
              <FromPicker value={from} onChange={setFrom} />
            </div>
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Destination</label>
              <DestinationPicker value={dest} onChange={setDest} />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Departure</label>
              <input type="date" min={today} value={depDate} onChange={e => setDepDate(e.target.value)}
                className="w-full px-3 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.82rem] font-semibold text-[#1A1D2B] outline-none focus:border-purple-500 focus:bg-white transition-all" />
            </div>
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Return</label>
              <input type="date" min={depDate || today} value={retDate} onChange={e => setRetDate(e.target.value)}
                className="w-full px-3 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.82rem] font-semibold text-[#1A1D2B] outline-none focus:border-purple-500 focus:bg-white transition-all" />
            </div>
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Duration</label>
              <select value={duration} onChange={e => setDuration(e.target.value)}
                className="w-full px-3 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.82rem] font-semibold text-[#1A1D2B] outline-none focus:border-purple-500 focus:bg-white transition-all">
                {[3,4,5,6,7,10,14,21].map(n => <option key={n} value={n}>{n} nights</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Guests</label>
              <PkgGuestPicker adults={adults} children={children} childrenAges={childrenAges}
                onChange={(a, c, ages) => { setAdults(a); setChildren(c); setChildrenAges(ages); }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Star Rating</label>
              <select value={starFilter} onChange={e => setStarFilter(e.target.value)}
                className="w-full px-3 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.82rem] font-semibold text-[#1A1D2B] outline-none focus:border-purple-500 focus:bg-white transition-all">
                {STAR_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Board Type</label>
              <select value={boardFilter} onChange={e => setBoardFilter(e.target.value)}
                className="w-full px-3 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.82rem] font-semibold text-[#1A1D2B] outline-none focus:border-purple-500 focus:bg-white transition-all">
                {BOARD_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>
          <button onClick={handleSearch}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-[Poppins] font-black text-[.95rem] py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(124,58,237,0.3)]">
            Search Packages →
          </button>
          <p className="text-center text-[.68rem] text-[#8E95A9] font-semibold mt-2.5">ATOL-protected options included · Book direct with providers</p>
        </div>
      </section>

      {/* ── Loading ── */}
      {loading && <LoadingState dest={dest} />}

      {/* ── Results ── */}
      {searched && (
        <div ref={resultsRef}>

          {/* Section 1 — Package Estimate Card */}
          {hasPartialData && (
            <section className="max-w-[900px] mx-auto px-5 pt-8 pb-4">
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-6">
                <h2 className="font-[Poppins] font-black text-[1.1rem] text-[#1A1D2B] mb-4">
                  Estimated Package Price: {searchedFrom ? searchedFrom.replace(/\s*\(.*\)$/, '') : 'UK'} → {searchedDest}
                </h2>
                <div className="space-y-2.5 mb-4">
                  {cheapestFlight !== null && (
                    <div className="flex items-center justify-between">
                      <span className="text-[.85rem] text-[#5C6378] font-semibold">✈️ Cheapest flight found</span>
                      <div className="text-right">
                        <span className="font-[Poppins] font-black text-[1rem] text-[#1A1D2B]">£{cheapestFlight}</span>
                        <span className="text-[.65rem] text-[#8E95A9] font-medium ml-1">return per person</span>
                        <div className="text-[.6rem] text-[#8E95A9]">(via Aviasales data{flightAirline ? ` · ${flightAirline}` : ''})</div>
                      </div>
                    </div>
                  )}
                  {cheapestHotel !== null && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-[.85rem] text-[#5C6378] font-semibold">🏨 Cheapest hotel found</span>
                        <div className="text-right">
                          <span className="font-[Poppins] font-black text-[1rem] text-[#1A1D2B]">£{cheapestHotel}</span>
                          <span className="text-[.65rem] text-[#8E95A9] font-medium ml-1">/night</span>
                          <div className="text-[.6rem] text-[#8E95A9]">(indicative price)</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[.85rem] text-[#5C6378] font-semibold">📅 {nights} night{nights !== 1 ? 's' : ''}</span>
                        <span className="font-[Poppins] font-black text-[1rem] text-[#1A1D2B]">£{hotelTotal}</span>
                      </div>
                    </>
                  )}
                  {estimatedTotal !== null && (
                    <div className="flex items-center justify-between pt-3 border-t border-purple-200">
                      <span className="text-[.95rem] text-[#1A1D2B] font-black">💰 Estimated total from</span>
                      <span className="font-[Poppins] font-black text-[1.4rem] text-purple-600">£{estimatedTotal}<span className="text-[.7rem] font-semibold text-[#8E95A9] ml-1">per person</span></span>
                    </div>
                  )}
                  {!estimatedTotal && (
                    <div className="pt-3 border-t border-purple-200">
                      <p className="text-[.78rem] text-amber-700 font-semibold">
                        ⚠️ Partial estimate — {cheapestFlight === null ? 'flight' : 'hotel'} pricing unavailable for this route. Check providers for complete package deals.
                      </p>
                    </div>
                  )}
                </div>
                <div className="bg-white/60 rounded-xl px-4 py-3">
                  <p className="text-[.72rem] text-[#5C6378] font-semibold">
                    ℹ️ This is an estimate based on booking flights and hotels separately. Package providers below may offer bundled deals that are 15–30% cheaper. Always compare.
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* No data note */}
          {!hasPartialData && (
            <section className="max-w-[900px] mx-auto px-5 pt-8 pb-4">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4">
                <p className="text-[.82rem] text-amber-800 font-semibold">
                  We couldn't estimate a price for this route. Compare live package deals directly with our providers below.
                </p>
              </div>
            </section>
          )}

          {/* Section 2 — Provider Cards */}
          <section className="max-w-[900px] mx-auto px-5 pb-6">
            <div className="space-y-4">
              {/* Expedia */}
              <div className="bg-white border border-[#E8ECF4] rounded-2xl overflow-hidden hover:shadow-lg transition-all"
                style={{ borderLeftWidth: '4px', borderLeftColor: '#1B2B65' }}>
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                    <div>
                      <h3 className="font-[Poppins] font-black text-[1.2rem] text-[#1A1D2B] mb-1">Expedia Packages</h3>
                      <p className="text-[.82rem] text-[#5C6378] font-semibold">Flight + Hotel bundles with price guarantee</p>
                    </div>
                    <a href={redirectUrl(buildExpediaUrl(searchedDest, searchedFrom, depDate, effectiveReturn, adults), 'Expedia', searchedDest, 'packages')}
                      className="flex-shrink-0 px-6 py-3 rounded-xl font-[Poppins] font-black text-[.85rem] text-white bg-[#1B2B65] hover:bg-[#142050] transition-all shadow-md">
                      Search Expedia Packages →
                    </a>
                  </div>
                  <div className="flex flex-wrap gap-2.5 mb-4">
                    {['Save up to 30% vs booking separately', 'ATOL protected for UK customers', 'Free cancellation on most packages', 'Earn Expedia Rewards points', 'Bundle with car hire for extra savings'].map(s => (
                      <span key={s} className="flex items-center gap-1.5 text-[.73rem] font-semibold text-[#1A1D2B] bg-blue-50 rounded-full px-3 py-1.5">
                        <span className="text-blue-500">✓</span> {s}
                      </span>
                    ))}
                  </div>
                  <div className="bg-[#F8FAFC] rounded-xl px-4 py-3">
                    <p className="text-[.72rem] text-[#5C6378] font-semibold">
                      📋 {searchedFrom ? searchedFrom.replace(/\s*\(.*\)$/, '') : 'UK'} → {searchedDest} · {depDate} — {effectiveReturn} · {nights} nights · {adults} adult{adults !== 1 ? 's' : ''}{children > 0 ? ` · ${children} child${children !== 1 ? 'ren' : ''}` : ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* Trip.com */}
              <div className="bg-white border border-[#E8ECF4] rounded-2xl overflow-hidden hover:shadow-lg transition-all"
                style={{ borderLeftWidth: '4px', borderLeftColor: '#287DFA' }}>
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                    <div>
                      <h3 className="font-[Poppins] font-black text-[1.2rem] text-[#1A1D2B] mb-1">Trip.com Packages</h3>
                      <p className="text-[.82rem] text-[#5C6378] font-semibold">Flight + Hotel deals from a global travel leader</p>
                    </div>
                    <a href={redirectUrl(buildTripUrl(searchedDest, depDate, effectiveReturn, adults), 'Trip.com', searchedDest, 'packages')}
                      className="flex-shrink-0 px-6 py-3 rounded-xl font-[Poppins] font-black text-[.85rem] text-white bg-[#287DFA] hover:bg-[#1A6AE0] transition-all shadow-md">
                      Search Trip.com Packages →
                    </a>
                  </div>
                  <div className="flex flex-wrap gap-2.5 mb-4">
                    {['Exclusive app-only package discounts', 'Price match guarantee', '24/7 customer support', 'Flexible cancellation options', 'Covers 200+ countries worldwide'].map(s => (
                      <span key={s} className="flex items-center gap-1.5 text-[.73rem] font-semibold text-[#1A1D2B] bg-sky-50 rounded-full px-3 py-1.5">
                        <span className="text-sky-500">✓</span> {s}
                      </span>
                    ))}
                  </div>
                  <div className="bg-[#F8FAFC] rounded-xl px-4 py-3">
                    <p className="text-[.72rem] text-[#5C6378] font-semibold">
                      📋 {searchedFrom ? searchedFrom.replace(/\s*\(.*\)$/, '') : 'UK'} → {searchedDest} · {depDate} — {effectiveReturn} · {nights} nights · {adults} adult{adults !== 1 ? 's' : ''}{children > 0 ? ` · ${children} child${children !== 1 ? 'ren' : ''}` : ''}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3 — DIY Package Builder */}
          <section className="max-w-[900px] mx-auto px-5 pb-6">
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-6">
              <h3 className="font-[Poppins] font-black text-[1.05rem] text-[#1A1D2B] mb-2">Build Your Own Package & Save</h3>
              <p className="text-[.8rem] text-[#5C6378] font-semibold mb-5">Sometimes booking flights and hotels separately gives you more flexibility and better prices. Use our tools to build your own package:</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-5 border border-[#E8ECF4]">
                  <span className="text-2xl mb-2 block">✈️</span>
                  <h4 className="font-[Poppins] font-black text-[.9rem] text-[#1A1D2B] mb-1">Find Flights</h4>
                  <p className="text-[.72rem] text-[#5C6378] font-semibold mb-3">
                    {searchedFrom ? searchedFrom.replace(/\s*\(.*\)$/, '') : 'UK'} → {searchedDest}{cheapestFlight ? ` from £${cheapestFlight}` : ''}
                  </p>
                  <a href={`/flights?${searchedFrom ? `from=${encodeURIComponent(searchedFrom)}` : ''}${destIata ? `&to=${destIata}` : `&destCity=${encodeURIComponent(searchedDest)}`}&departure=${depDate}${effectiveReturn ? `&return=${effectiveReturn}` : ''}`}
                    className="inline-block px-4 py-2 rounded-xl border-2 border-[#0066FF] text-[#0066FF] font-[Poppins] font-bold text-[.75rem] hover:bg-blue-50 transition-colors">
                    Compare Flights →
                  </a>
                </div>
                <div className="bg-white rounded-xl p-5 border border-[#E8ECF4]">
                  <span className="text-2xl mb-2 block">🏨</span>
                  <h4 className="font-[Poppins] font-black text-[.9rem] text-[#1A1D2B] mb-1">Find Hotels</h4>
                  <p className="text-[.72rem] text-[#5C6378] font-semibold mb-3">
                    Hotels in {searchedDest}{cheapestHotel ? ` from £${cheapestHotel}/night` : ''}
                  </p>
                  <a href={`/hotels?destination=${encodeURIComponent(searchedDest)}&checkin=${depDate}&checkout=${effectiveReturn}`}
                    className="inline-block px-4 py-2 rounded-xl border-2 border-orange-500 text-orange-500 font-[Poppins] font-bold text-[.75rem] hover:bg-orange-50 transition-colors">
                    Compare Hotels →
                  </a>
                </div>
                <div className="bg-white rounded-xl p-5 border border-[#E8ECF4]">
                  <span className="text-2xl mb-2 block">🚗</span>
                  <h4 className="font-[Poppins] font-black text-[.9rem] text-[#1A1D2B] mb-1">Add Car Hire</h4>
                  <p className="text-[.72rem] text-[#5C6378] font-semibold mb-3">
                    Car hire in {searchedDest} from your arrival
                  </p>
                  <a href={`/cars?location=${encodeURIComponent(searchedDest)}&pickup=${depDate}&dropoff=${effectiveReturn}`}
                    className="inline-block px-4 py-2 rounded-xl border-2 border-emerald-500 text-emerald-500 font-[Poppins] font-bold text-[.75rem] hover:bg-emerald-50 transition-colors">
                    Compare Car Hire →
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4 — Popular Destinations */}
          <section className="max-w-[900px] mx-auto px-5 pb-8">
            <h3 className="font-[Poppins] font-black text-[1.05rem] text-[#1A1D2B] mb-4">Popular Package Destinations</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {POPULAR_DESTS.map(d => (
                <a key={d.name} href={`/packages?dest=${encodeURIComponent(d.name)}&departure=${depDate || today}&return=${effectiveReturn || ''}`}
                  className="group relative rounded-2xl overflow-hidden h-44 block border border-[#E8ECF4] hover:shadow-lg transition-all">
                  <img src={d.photo} alt={d.name} loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <div className="font-[Poppins] font-black text-white text-[.9rem]">{d.name} {d.flag}</div>
                    <div className="text-[.68rem] text-white/80 font-semibold">Packages from £{d.est}pp</div>
                  </div>
                </a>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ── Tips (always visible) ── */}
      <section className="max-w-[860px] mx-auto px-5 pb-16">
        <div className="bg-[#F8FAFC] border border-[#F1F3F7] rounded-3xl p-8">
          <h3 className="font-[Poppins] font-black text-[1.05rem] text-[#1A1D2B] mb-4">Tips for Finding the Best Package Holiday</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              ['Bundle beats building separately', 'Flight + hotel packages are typically 15–30% cheaper than booking each individually.'],
              ['Check ATOL protection', 'UK law requires ATOL protection for flight-inclusive packages — always verify before paying.'],
              ['All-inclusive vs room-only', 'AI resorts work best in destinations where eating out is expensive (Caribbean, Maldives).'],
              ['Last-minute works for packages', 'Unlike flights, unsold package holidays drop sharply in price 2–3 weeks before departure.'],
            ].map(([title, body]) => (
              <div key={title} className="flex gap-3">
                <div className="w-1.5 flex-shrink-0 rounded-full bg-gradient-to-b from-purple-500 to-indigo-600 self-stretch" />
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

export default function PackagesPage() {
  return <PackagesContent />;
}
