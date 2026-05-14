'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import DateRangePicker from '@/components/DateRangePicker';
import { redirectUrl } from '@/lib/redirect';
import { saveSticky, loadSticky, type StickyPackages } from '@/lib/sticky-search';
import AppStoreBadges from '@/components/AppStoreBadges';

/* ═══════════════════════════════════════════════════════════════════════════
   DESTINATIONS (matches hotels page)
   ═══════════════════════════════════════════════════════════════════════════ */

const DESTINATIONS = [
  'London', 'Manchester', 'Birmingham', 'Edinburgh', 'Glasgow', 'Liverpool',
  'Barcelona', 'Madrid', 'Malaga', 'Marbella', 'Seville', 'Valencia', 'Ibiza', 'Mallorca',
  'Tenerife', 'Lanzarote', 'Fuerteventura', 'Gran Canaria', 'Palma', 'Alicante', 'Benidorm',
  'Faro', 'Algarve', 'Lisbon', 'Madeira', 'Porto',
  'Paris', 'Nice', 'Amsterdam', 'Rome', 'Venice', 'Florence', 'Milan', 'Naples', 'Sicily', 'Sardinia',
  'Athens', 'Crete', 'Rhodes', 'Corfu', 'Santorini', 'Mykonos', 'Kos', 'Zante',
  'Dubrovnik', 'Split', 'Antalya', 'Bodrum', 'Dalaman', 'Marmaris', 'Istanbul',
  'Dubai', 'Abu Dhabi', 'Marrakech', 'Agadir', 'Cairo', 'Sharm El Sheikh', 'Hurghada',
  'New York', 'Los Angeles', 'Miami', 'Las Vegas', 'Orlando', 'San Francisco',
  'Cancun', 'Punta Cana', 'Mexico City', 'Tulum', 'Jamaica', 'Barbados',
  'Tokyo', 'Bangkok', 'Singapore', 'Bali', 'Phuket', 'Krabi', 'Maldives', 'Sri Lanka', 'Colombo',
  'Sydney', 'Melbourne', 'Cape Town', 'Johannesburg', 'Mauritius', 'Seychelles', 'Zanzibar', 'Mombasa',
  'Toronto', 'Vancouver', 'Hong Kong', 'Seoul', 'Kuala Lumpur',
  'Lima', 'Buenos Aires', 'Rio de Janeiro',
  'Vienna', 'Prague', 'Budapest', 'Copenhagen', 'Stockholm', 'Oslo', 'Helsinki',
  'Cyprus', 'Paphos', 'Larnaca', 'Malta',
  'Doha', 'Reykjavik', 'Dublin',
  // Pakistan
  'Lahore', 'Islamabad', 'Karachi',
  // Caucasus & Central Asia
  'Baku', 'Yerevan', 'Tbilisi', 'Ashgabat', 'Tashkent',
  'Almaty', 'Astana', 'Bishkek', 'Dushanbe',
];

/**
 * Country / region aliases — typing a country name surfaces the most popular
 * cities in that country as suggestions. Without this, "Spain" returns zero
 * matches even though we have eight Spanish cities listed. (See Clarity
 * session 2026-05-10: 37 seconds of typing on /packages with no autocomplete
 * hits → bounce.)
 */
const DESTINATION_ALIASES: Record<string, string[]> = {
  spain: ['Barcelona', 'Madrid', 'Malaga', 'Marbella', 'Tenerife', 'Lanzarote', 'Mallorca', 'Ibiza'],
  portugal: ['Lisbon', 'Algarve', 'Faro', 'Porto', 'Madeira'],
  greece: ['Athens', 'Crete', 'Rhodes', 'Corfu', 'Santorini', 'Mykonos', 'Kos', 'Zante'],
  italy: ['Rome', 'Venice', 'Florence', 'Milan', 'Naples', 'Sicily', 'Sardinia'],
  france: ['Paris', 'Nice'],
  turkey: ['Antalya', 'Bodrum', 'Dalaman', 'Marmaris', 'Istanbul'],
  croatia: ['Dubrovnik', 'Split'],
  egypt: ['Cairo', 'Sharm El Sheikh', 'Hurghada'],
  morocco: ['Marrakech', 'Agadir'],
  uae: ['Dubai', 'Abu Dhabi'],
  emirates: ['Dubai', 'Abu Dhabi'],
  thailand: ['Bangkok', 'Phuket', 'Krabi'],
  indonesia: ['Bali'],
  japan: ['Tokyo'],
  australia: ['Sydney', 'Melbourne'],
  usa: ['New York', 'Los Angeles', 'Miami', 'Las Vegas', 'Orlando', 'San Francisco'],
  america: ['New York', 'Los Angeles', 'Miami', 'Las Vegas', 'Orlando', 'San Francisco'],
  mexico: ['Cancun', 'Tulum', 'Mexico City'],
  caribbean: ['Punta Cana', 'Jamaica', 'Barbados', 'Cancun'],
  pakistan: ['Lahore', 'Islamabad', 'Karachi'],
  'sri lanka': ['Colombo'],
  'south africa': ['Cape Town', 'Johannesburg'],
  canaries: ['Tenerife', 'Lanzarote', 'Fuerteventura', 'Gran Canaria'],
  'canary islands': ['Tenerife', 'Lanzarote', 'Fuerteventura', 'Gran Canaria'],
  balearics: ['Mallorca', 'Ibiza', 'Palma'],
  'costa del sol': ['Malaga', 'Marbella'],
};

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
  // Caucasus & Central Asia
  'baku': 'GYD', 'yerevan': 'EVN', 'tbilisi': 'TBS', 'ashgabat': 'ASB',
  'tashkent': 'TAS', 'almaty': 'ALA', 'astana': 'NQZ', 'bishkek': 'FRU', 'dushanbe': 'DYU',
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
  // 1) Direct matches against the curated city list
  const directHits = q.length >= 1
    ? DESTINATIONS.filter(d => d.toLowerCase().includes(q))
    : DESTINATIONS.slice(0, 10);
  // 2) Country / region aliases — surface popular cities when user types a
  //    country name. Filtered against actual DESTINATIONS so we don't suggest
  //    cities that won't survive the search submit.
  const aliasHits: string[] = [];
  if (q.length >= 1) {
    for (const [key, cities] of Object.entries(DESTINATION_ALIASES)) {
      if (key.includes(q) || q.includes(key)) {
        for (const c of cities) {
          if (!directHits.includes(c) && !aliasHits.includes(c)) aliasHits.push(c);
        }
      }
    }
  }
  const filtered = [...directHits, ...aliasHits].slice(0, 8);
  // Free-text fallback — when the user's query doesn't match anything in our
  // curated list, packages search will still pass the raw text through to
  // Expedia / Trip.com (their resolvers handle "Marbella", "Mauritius" etc.
  // even though we don't list them). Surface this as the first suggestion so
  // the user knows the form isn't a dead end.
  const showFreeText =
    q.length >= 2 &&
    filtered.length === 0 &&
    !DESTINATIONS.some(d => d.toLowerCase() === q);

  return (
    <div ref={ref} className="relative">
      <input type="text" placeholder="Where do you want to go? — e.g. Tenerife, Dubai, Bali" value={value} autoComplete="off"
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className="w-full px-4 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.9rem] font-semibold text-[#1A1D2B] outline-none focus:border-purple-500 focus:bg-white transition-all placeholder:text-[#B0B8CC]" />
      {open && (filtered.length > 0 || showFreeText) && (
        <ul className="absolute z-50 w-full mt-1.5 bg-white border border-[#E8ECF4] rounded-2xl shadow-2xl overflow-auto max-h-64">
          {showFreeText && (
            <li onMouseDown={() => { setOpen(false); }}
              className="px-4 py-3 hover:bg-purple-50 cursor-pointer transition-colors border-b border-[#F1F3F7] font-poppins font-semibold text-[.88rem] text-[#1A1D2B]">
              <span className="text-purple-600">Search</span> &ldquo;{value}&rdquo; <span className="text-[.7rem] text-[#8E95A9] font-medium">— we&rsquo;ll pass it to package providers</span>
            </li>
          )}
          {filtered.map(c => (
            <li key={c} onMouseDown={() => { onChange(c); setOpen(false); }}
              className={`px-4 py-3 hover:bg-purple-50 cursor-pointer transition-colors border-b border-[#F1F3F7] last:border-0 font-poppins font-semibold text-[.88rem] text-[#1A1D2B] ${value === c ? 'bg-purple-50' : ''}`}>
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
              className="px-4 py-3 hover:bg-purple-50 cursor-pointer transition-colors border-b border-[#F1F3F7] last:border-0 font-poppins font-semibold text-[.85rem] text-[#1A1D2B]">
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
            <div><div className="font-poppins font-bold text-[.85rem] text-[#1A1D2B]">Adults</div><div className="text-[.7rem] text-[#8E95A9]">Age 16+</div></div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setAdults(adults - 1)} disabled={adults <= 1} className="w-8 h-8 rounded-full border-2 border-[#E8ECF4] flex items-center justify-center text-[#5C6378] font-bold text-lg hover:border-purple-500 transition-all disabled:opacity-30">−</button>
              <span className="font-poppins font-black text-[.95rem] text-[#1A1D2B] w-5 text-center">{adults}</span>
              <button type="button" onClick={() => setAdults(adults + 1)} disabled={adults >= 10} className="w-8 h-8 rounded-full border-2 border-[#E8ECF4] flex items-center justify-center text-[#5C6378] font-bold text-lg hover:border-purple-500 transition-all disabled:opacity-30">+</button>
            </div>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-[#F1F3F7]">
            <div><div className="font-poppins font-bold text-[.85rem] text-[#1A1D2B]">Children</div><div className="text-[.7rem] text-[#8E95A9]">Age 0–15</div></div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setChildren(ch - 1)} disabled={ch <= 0} className="w-8 h-8 rounded-full border-2 border-[#E8ECF4] flex items-center justify-center text-[#5C6378] font-bold text-lg hover:border-purple-500 transition-all disabled:opacity-30">−</button>
              <span className="font-poppins font-black text-[.95rem] text-[#1A1D2B] w-5 text-center">{ch}</span>
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
            className="w-full mt-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-poppins font-bold text-[.8rem] py-2.5 rounded-xl transition-colors">Done</button>
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

/**
 * Calculate the integer night count between two ISO yyyy-mm-dd dates.
 * Floors fractional results (DST shifts) and clamps the minimum to 1
 * so a `duration=0` never gets pushed to a partner page that would
 * default back to its own 7-night fallback.
 *
 * Used by the Expedia + Trip.com package URL builders below to send
 * an explicit `duration` / `noOfNights` parameter alongside the
 * start/end dates. Both partners normally derive duration from the
 * date range, but a defensive explicit value insures against either
 * side failing to parse the dates and silently falling back to a
 * 7-day default — the failure mode owners reported on Build #15/#16
 * after navigating from the native packages search.
 */
export function calculateNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 1;
  const a = new Date(checkIn).getTime();
  const b = new Date(checkOut).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 1;
  const days = Math.floor((b - a) / 86_400_000);
  return Math.max(1, days);
}

/* ─── Expedia bundle-flow data ─────────────────────────────────────────────
 * Without `misId` Expedia's `/Hotel-Search?packageType=fh` falls back to
 * hotels-only (the user reported this on Build 19: "Only opens hotels, no
 * flights"). Reverse-engineered from a manual form-submit on
 * /Holidays — Expedia regenerates the misId PREFIX from the user's session
 * but the SUFFIX is a deterministic protobuf encoding of the search
 * criteria. Sending `misId=A~<correct-suffix>` triggers the package flow
 * and Expedia rewrites the prefix on landing. (Verified live 2026-05-06.)
 *
 * Per-destination data (Expedia city regionId + airport regionId) gathered
 * by inspecting Expedia's form-submit URLs. Only destinations with full
 * data here get the bundle URL; the rest fall back to the hotels-only URL
 * and we tag the link so analytics can show coverage gaps.
 *
 * To add a new destination:
 *   1. Visit https://www.expedia.co.uk/Holidays
 *   2. Pick London (LON-All Airports) → the city → submit Search
 *   3. From the resulting URL, grab `regionId=...` (city) and decode the
 *      `misId` suffix to read the airport regionId (varint after airport
 *      code). Add a row below.
 */
const EXPEDIA_ORIGIN_REGION: Record<string, number> = {
  // London airports all map to the "All London Airports" aggregate
  // (LON, regionId 6139104) in Expedia's package flow.
  LHR: 6139104, LGW: 6139104, STN: 6139104, LTN: 6139104, LCY: 6139104, SEN: 6139104,
};
type ExpediaDest = { city: number; airport: number; iata: string; display: string };
const EXPEDIA_DEST: Record<string, ExpediaDest> = {
  // Verified live on expedia.co.uk 2026-05-06 — captured by submitting
  // the /Holidays form for each city and decoding the resulting misId
  // suffix (see scripts/affiliate-link-monitor.mjs for the protobuf
  // structure). Add a row by repeating that flow.
  TFS: { city: 6047194, airport: 5457492, iata: 'TFS', display: 'Tenerife, Canary Islands, Spain' },
  AYT: { city: 481,     airport: 5527873, iata: 'AYT', display: 'Antalya, Antalya Region, Türkiye' },
};

function varintBytes(n: number): number[] {
  const out: number[] = [];
  let v = n >>> 0;
  while (v > 0x7f) { out.push((v & 0x7f) | 0x80); v >>>= 7; }
  out.push(v & 0x7f);
  return out;
}
function lenPrefixed(tag: number, body: number[]): number[] {
  return [tag, ...varintBytes(body.length), ...body];
}
function bytesToBase64Url(bytes: number[]): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  if (typeof btoa === 'undefined') return ''; // SSR safety; this only runs client-side
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Encode the deterministic misId suffix protobuf — the prefix before
 *  the `~` is regenerated by Expedia from the user's session and is
 *  effectively a placeholder. */
function buildExpediaMisId(
  adults: number,
  destCityRegionId: number,
  originIata: string,
  originRegionId: number,
  destIata: string,
  destAirportRegionId: number,
  departDate: string,
  returnDate: string,
): string {
  const enc = new TextEncoder();
  const outboundLeg = [
    ...lenPrefixed(0x0a, Array.from(enc.encode(originIata))),    // field 1: airport code
    0x18, ...varintBytes(originRegionId),                         // field 3: regionId
    ...lenPrefixed(0x2a, Array.from(enc.encode(departDate))),    // field 5: yyyy-mm-dd
  ];
  const inboundLeg = [
    ...lenPrefixed(0x0a, Array.from(enc.encode(destIata))),
    0x18, ...varintBytes(destAirportRegionId),
    ...lenPrefixed(0x2a, Array.from(enc.encode(returnDate))),
  ];
  const flightBlock = [
    0x08, 0x01,                                                   // field 1: round-trip flag
    ...lenPrefixed(0x12, outboundLeg),                            // field 2: outbound
    ...lenPrefixed(0x12, inboundLeg),                             // field 2: inbound
  ];
  const headerBlock = [
    ...lenPrefixed(0x1a, [0x08, adults]),                         // field 3: { field 1: adults }
    0x20, ...varintBytes(destCityRegionId),                       // field 4: dest city regionId
  ];
  const message = [
    0x01,                                                          // leading version byte
    ...lenPrefixed(0x12, headerBlock),
    ...lenPrefixed(0x1a, flightBlock),
  ];
  return `A~${bytesToBase64Url(message)}`;
}

function buildExpediaUrl(
  dest: string,
  from: string,
  depDate: string,
  retDate: string,
  adults: number,
  children: number = 0,
  childrenAges: number[] = [],
  destIata?: string,
) {
  // Expedia's flight+hotel package URL — schema verified 2026-05-06 by
  // reproducing the working form-submit URL via Chrome MCP. The misId
  // token is the trigger for the bundle flow; without it the page
  // renders hotels-only even with `packageType=fh` (which is what
  // owner saw on Build 19). For destinations we have Expedia regionId
  // data for (EXPEDIA_DEST below), we construct misId from the search
  // criteria — Expedia regenerates the misId prefix from the user's
  // session on landing, so any prefix works. Without dest regionId
  // data we fall back to the bare /Hotel-Search URL (hotels-only).
  // `duration` is sent in both paths as a defensive echo of
  // calculateNights() — Expedia normally derives it from start/endDate
  // but a date-parse failure made owners see 7-night fallback packages
  // on Build #15/#16. Belt-and-braces.
  // Key params:
  //   packageType=fh                    → flight+hotel bundle
  //   searchProduct=hotel               → required by the FH flow
  //   adults=N
  //   children=1_AGE,1_AGE              → one entry per child (counter prefix
  //                                        is always `1_`), comma-separated.
  //                                        NOT the same as the hotels-only
  //                                        format (`children=N_age1_age2`).
  //   tripType=ROUND_TRIP, cabinClass=COACH
  //   startDate / endDate               → ISO yyyy-mm-dd
  //   duration                          → integer night count
  //   misId (optional)                  → bundle-flow trigger
  //   regionId (optional)               → Expedia city ID
  //   destination / origin              → display strings (Expedia resolves)
  const childCount = Math.max(0, children | 0);
  const nights = calculateNights(depDate, retDate);
  const params = new URLSearchParams();
  params.set('packageType', 'fh');
  params.set('searchProduct', 'hotel');
  params.set('adults', String(adults));
  if (childCount > 0) {
    const entries: string[] = [];
    for (let i = 0; i < childCount; i++) {
      const a = childrenAges[i];
      const safe = typeof a === 'number' && a >= 0 && a <= 17 ? a : 8;
      entries.push(`1_${safe}`);
    }
    params.set('children', entries.join(','));
  }
  params.set('sort', 'RECOMMENDED');
  params.set('tripType', 'ROUND_TRIP');
  params.set('cabinClass', 'COACH');
  params.set('startDate', depDate);
  params.set('endDate', retDate);
  params.set('duration', String(nights));

  const fromMatch = from.match(/\(([A-Z]{3})\)/);
  const fromIata = fromMatch ? fromMatch[1] : '';
  const originRegionId = EXPEDIA_ORIGIN_REGION[fromIata];
  const destInfo = destIata ? EXPEDIA_DEST[destIata] : undefined;

  if (destInfo && originRegionId && typeof window !== 'undefined') {
    // Full bundle-flow URL — uses display strings + regionId + misId.
    params.set('regionId', String(destInfo.city));
    params.set('destination', destInfo.display);
    params.set('origin', 'London, United Kingdom (LON-All Airports)');
    params.set('misId', buildExpediaMisId(
      adults, destInfo.city,
      'LON', originRegionId,
      destInfo.iata, destInfo.airport,
      depDate, retDate,
    ));
  } else {
    // Fallback — hotels-only landing page. Honest but not bundled.
    params.set('destination', dest);
    params.set('origin', from);
  }
  params.set('affcid', 'clbU3QK');
  return `https://www.expedia.co.uk/Hotel-Search?${params.toString()}`;
}

/* Trip.com uses city-level codes, not airport IATA codes */
const TRIP_CITY_CODE: Record<string, string> = {
  'LHR': 'LON', 'LGW': 'LON', 'STN': 'LON', 'LTN': 'LON', 'LCY': 'LON', 'SEN': 'LON',
  'MAN': 'MAN', 'BHX': 'BHX', 'EDI': 'EDI', 'GLA': 'GLA', 'BRS': 'BRS', 'LBA': 'LBA',
  'LPL': 'LPL', 'NCL': 'NCL', 'EMA': 'EMA', 'BFS': 'BFS', 'ABZ': 'ABZ', 'SOU': 'SOU',
  'CWL': 'CWL', 'BOH': 'BOH',
  'BCN': 'BCN', 'MAD': 'MAD', 'AGP': 'AGP', 'TFS': 'TCI', 'ACE': 'ACE', 'FUE': 'FUE',
  'LPA': 'LPA', 'PMI': 'PMI', 'ALC': 'ALC', 'FAO': 'FAO', 'LIS': 'LIS',
  'CDG': 'PAR', 'NCE': 'NCE', 'AMS': 'AMS', 'FCO': 'ROM', 'VCE': 'VCE', 'FLR': 'FLR',
  'MXP': 'MIL', 'ATH': 'ATH', 'HER': 'HER', 'RHO': 'RHO', 'CFU': 'CFU', 'JTR': 'JTR',
  'DBV': 'DBV', 'SPU': 'SPU', 'AYT': 'AYT', 'BJV': 'BJV', 'DLM': 'DLM', 'IST': 'IST',
  'DXB': 'DXB', 'RAK': 'RAK', 'CAI': 'CAI',
  'JFK': 'NYC', 'LAX': 'LAX', 'MIA': 'MIA', 'LAS': 'LAS', 'MCO': 'ORL', 'SFO': 'SFO',
  'CUN': 'CUN', 'PUJ': 'PUJ', 'NRT': 'TYO', 'BKK': 'BKK', 'SIN': 'SIN', 'DPS': 'DPS',
  'HKT': 'HKT', 'MLE': 'MLE', 'SYD': 'SYD', 'MEL': 'MEL', 'CPT': 'CPT', 'JNB': 'JNB',
  'YYZ': 'YTO', 'YVR': 'YVR', 'HKG': 'HKG', 'ICN': 'SEL', 'KUL': 'KUL',
  'VIE': 'VIE', 'PRG': 'PRG', 'BUD': 'BUD', 'CPH': 'CPH', 'ARN': 'STO',
  'DOH': 'DOH', 'KEF': 'REK', 'DUB': 'DUB',
  'LHE': 'LHE', 'ISB': 'ISB', 'KHI': 'KHI',
  'LIM': 'LIM', 'EZE': 'BUE', 'GIG': 'RIO',
  // Caucasus & Central Asia
  'GYD': 'BAK', 'EVN': 'EVN', 'TBS': 'TBS', 'ASB': 'ASB',
  'TAS': 'TAS', 'ALA': 'ALA', 'NQZ': 'NQZ', 'FRU': 'FRU', 'DYU': 'DYU',
};

function buildTripUrl(
  dest: string,
  fromAirport: string,
  depDate: string,
  retDate: string,
  adults: number,
  children: number = 0,
  childrenAges: number[] = [],
) {
  const destIata = DEST_IATA[dest.toLowerCase()] || '';
  const destCity = TRIP_CITY_CODE[destIata] || destIata;
  const fromMatch = fromAirport.match(/\(([A-Z]{3})\)/);
  const fromIata = fromMatch ? fromMatch[1] : '';
  const fromCity = TRIP_CITY_CODE[fromIata] || fromIata || 'LON';
  const destName = dest.charAt(0).toUpperCase() + dest.slice(1).toLowerCase();
  // Was hardcoded `&child=0` — dropped every kid the user selected. Now
  // forwards the count + per-child ages (Trip.com hotel format reuses
  // age1, age2, …; same convention works on the packages endpoint). Ages
  // default to 8 when absent.
  const childCount = Math.max(0, children | 0);
  const ageParams: string[] = [];
  for (let i = 0; i < childCount; i++) {
    const a = childrenAges[i];
    const safe = typeof a === 'number' && a >= 0 && a <= 17 ? a : 8;
    ageParams.push(`age${i + 1}=${safe}`);
  }
  const ageQuery = ageParams.length > 0 ? `&${ageParams.join('&')}` : '';
  // 2026-05-06 — combines two Build 19 fixes:
  //   `iDate`/`oDate`: Trip.com's `/packages/list` requires hotel-leg
  //     dates on top of flight-leg dates (`dDate`/`rDate`). Without
  //     them the hotel side defaulted to the user's last-searched city —
  //     that's why owners reported "Philadelphia → Savannah" instead of
  //     "London → Tenerife". Hotel city ID (`hCity`) is auto-resolved
  //     server-side from `destinationName` once the hotel dates are
  //     present (verified by replaying the working URL after a real
  //     Search submit on trip.com/packages).
  //   `noOfNights`: defensive echo of (rDate - dDate). Trip.com normally
  //     derives the night count from the date pair, but on edge cases
  //     (locale parse drift, malformed ISO dates) the page falls back
  //     to a 7-night default — what owners reported on Build #15/#16.
  //     Belt-and-braces alongside the explicit dates.
  const nights = calculateNights(depDate, retDate);
  return `https://www.trip.com/packages/list?adult=${adults}&child=${childCount}&infants=0${ageQuery}&aCityCode=${destCity}&dCityCode=${fromCity}&tripWay=round-trip&classType=ys&dDate=${depDate}&rDate=${retDate}&iDate=${depDate}&oDate=${retDate}&noOfNights=${nights}&room=1&sourceFrom=IBUdefault&destinationName=${encodeURIComponent(destName)}&isOversea=true&locale=en-GB&curr=GBP&Allianceid=8023009&SID=303363796&trip_sub3=D15021113`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   POPULAR DESTINATIONS
   ═══════════════════════════════════════════════════════════════════════════ */

const POPULAR_DESTS = [
  { name: 'Tenerife', flag: '🇪🇸', est: 449, photo: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=400&h=300&fit=crop&fm=webp&q=75' },
  { name: 'Antalya', flag: '🇹🇷', est: 399, photo: 'https://images.unsplash.com/photo-1568322503122-d237a9968485?w=400&h=300&fit=crop&fm=webp&q=75' },
  { name: 'Palma', flag: '🇪🇸', est: 399, photo: 'https://images.unsplash.com/photo-1591970934008-b42acc22a339?w=400&h=300&fit=crop&fm=webp&q=75' },
  { name: 'Dubai', flag: '🇦🇪', est: 599, photo: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=300&fit=crop&fm=webp&q=75' },
  { name: 'Lanzarote', flag: '🇪🇸', est: 429, photo: 'https://images.unsplash.com/photo-1572099606223-6e29045d7de3?w=400&h=300&fit=crop&fm=webp&q=75' },
  { name: 'Crete', flag: '🇬🇷', est: 449, photo: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=400&h=300&fit=crop&fm=webp&q=75' },
  { name: 'Faro', flag: '🇵🇹', est: 349, photo: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=400&h=300&fit=crop&fm=webp&q=75' },
  { name: 'Cancun', flag: '🇲🇽', est: 799, photo: 'https://images.unsplash.com/photo-1510097467424-192d713fd8b2?w=400&h=300&fit=crop&fm=webp&q=75' },
];

/* ═══════════════════════════════════════════════════════════════════════════
   FAMILY SUMMER PACKAGES — pre-built July/August deep links from London (LHR)
   for a family of 4. Click-through goes straight to a fully pre-filled
   Trip.com or Expedia results page. Uses the existing buildTripUrl /
   buildExpediaUrl helpers (proven in production after a manual search).
   ═══════════════════════════════════════════════════════════════════════════ */

const FAMILY_FROM_AIRPORT = 'London Heathrow (LHR)';
const FAMILY_ADULTS = 4;

const FAMILY_PACKAGES = [
  { name: 'Tenerife',  flag: '🇪🇸', dep: '2026-07-18', ret: '2026-07-25', pp: 549, tag: 'Year-Round Sun', photo: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=600&h=400&fit=crop&fm=webp&q=75' },
  { name: 'Palma',     flag: '🇪🇸', dep: '2026-07-25', ret: '2026-08-01', pp: 499, tag: 'School Holidays', photo: 'https://images.unsplash.com/photo-1591970934008-b42acc22a339?w=600&h=400&fit=crop&fm=webp&q=75' },
  { name: 'Antalya',   flag: '🇹🇷', dep: '2026-08-01', ret: '2026-08-08', pp: 429, tag: 'All-Inclusive', photo: 'https://images.unsplash.com/photo-1568322503122-d237a9968485?w=600&h=400&fit=crop&fm=webp&q=75' },
  { name: 'Crete',     flag: '🇬🇷', dep: '2026-08-08', ret: '2026-08-15', pp: 559, tag: 'Family Resorts', photo: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=600&h=400&fit=crop&fm=webp&q=75' },
  { name: 'Faro',      flag: '🇵🇹', dep: '2026-07-18', ret: '2026-07-25', pp: 519, tag: 'Algarve Coast', photo: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=600&h=400&fit=crop&fm=webp&q=75' },
  { name: 'Lanzarote', flag: '🇪🇸', dep: '2026-08-15', ret: '2026-08-22', pp: 529, tag: 'Volcanic Beaches', photo: 'https://images.unsplash.com/photo-1572099606223-6e29045d7de3?w=600&h=400&fit=crop&fm=webp&q=75' },
  { name: 'Malaga',    flag: '🇪🇸', dep: '2026-07-25', ret: '2026-08-01', pp: 489, tag: 'Costa del Sol', photo: 'https://images.unsplash.com/photo-1559627755-43c39e6c1a78?w=600&h=400&fit=crop&fm=webp&q=75' },
  { name: 'Rhodes',    flag: '🇬🇷', dep: '2026-08-08', ret: '2026-08-15', pp: 569, tag: 'Greek Island', photo: 'https://images.unsplash.com/photo-1601581875309-fafbf2d3ed3a?w=600&h=400&fit=crop&fm=webp&q=75' },
];

function FamilyPackages() {
  return (
    <section className="max-w-[1100px] mx-auto px-5 pb-12 pt-2">
      <div className="text-center mb-7">
        <span className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-600 text-[.65rem] font-black uppercase tracking-[2.5px] px-3.5 py-1.5 rounded-full mb-3">
          ☀️ July & August · Family of 4
        </span>
        <h2 className="font-poppins text-[1.8rem] md:text-[2.2rem] font-black text-[#1A1D2B] leading-tight mb-2">
          Pre-Built Summer Packages
        </h2>
        <p className="text-[.85rem] text-[#8E95A9] font-semibold max-w-[560px] mx-auto">
          7 nights from London Heathrow · Click any deal to see live prices on Trip.com or Expedia — all dates &amp; travellers pre-filled
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {FAMILY_PACKAGES.map(p => {
          const tripUrl = buildTripUrl(p.name, FAMILY_FROM_AIRPORT, p.dep, p.ret, FAMILY_ADULTS);
          const expediaUrl = buildExpediaUrl(p.name, FAMILY_FROM_AIRPORT, p.dep, p.ret, FAMILY_ADULTS, 0, [], DEST_IATA[p.name.toLowerCase()]);
          const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
          return (
            <div key={p.name} className="bg-white border border-[#E8ECF4] rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all flex flex-col">
              <div className="relative h-40 bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-600">
                <img src={p.photo} alt="" loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                <span className="absolute top-2.5 left-2.5 text-[.55rem] font-black uppercase tracking-[1.5px] bg-white/95 text-purple-600 px-2 py-1 rounded-full">
                  {p.tag}
                </span>
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <div className="font-poppins font-black text-white text-[1.1rem] leading-tight">{p.name} {p.flag}</div>
                  <div className="text-[.66rem] text-white/85 font-semibold mt-0.5">{fmt(p.dep)} — {fmt(p.ret)} · 7 nights</div>
                </div>
              </div>
              <div className="p-3 flex flex-col gap-1.5 flex-1">
                <div className="text-[.7rem] text-[#5C6378] font-semibold mb-0.5">
                  From <span className="font-poppins font-black text-[1rem] text-[#1A1D2B]">£{p.pp}</span> pp
                </div>
                <a href={redirectUrl(tripUrl, 'Trip.com', p.name, 'packages')} target="_blank" rel="noopener sponsored"
                  className="bg-[#287DFA] hover:bg-[#1A6AE0] text-white font-poppins font-bold text-[.72rem] py-2 rounded-lg transition-all text-center">
                  Trip.com →
                </a>
                <a href={redirectUrl(expediaUrl, 'Expedia', p.name, 'packages')} target="_blank" rel="noopener sponsored"
                  className="bg-[#1B2B65] hover:bg-[#142050] text-white font-poppins font-bold text-[.72rem] py-2 rounded-lg transition-all text-center">
                  Expedia →
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

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

  // True when the user landed on this page with search params already in
  // the URL (e.g. from the native mobile app or a deep-link). We hide the
  // curated "7 nights from London Heathrow" FAMILY_PACKAGES section in
  // that case — the async auto-search takes 1-2s and the curated copy
  // misleads users into thinking the duration on their actual search is
  // 7 nights. (2026-05-06 — fix for native Build #15 "duration says 7
  // days" report.)
  const [hasInitialQuery, setHasInitialQuery] = useState(false);

  const resultsRef = useRef<HTMLDivElement>(null);

  // Read URL params + sticky search + legacy localStorage airport pref.
  // Priority for every field: URL > sticky > legacy fallback > house default.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const d = p.get('dest') || p.get('to') || p.get('destination') || '';
    const f = p.get('from') || '';
    const dep = p.get('depart') || p.get('departure') || '';
    const ret = p.get('return') || '';
    const a = p.get('adults');
    const c = p.get('children');

    // Treat the page as "user has an inflight query" the moment we see
    // any meaningful search param. That hides the curated 7-night
    // section before the async auto-search resolves.
    if (d || dep || ret || a || c) {
      setHasInitialQuery(true);
    }

    const sticky = loadSticky<StickyPackages>('packages');
    const today = new Date().toISOString().split('T')[0];

    if (d) setDest(d);
    else if (sticky?.dest) setDest(sticky.dest);

    if (dep) setDepDate(dep);
    else if (sticky?.departure && sticky.departure >= today) setDepDate(sticky.departure);

    if (ret) setRetDate(ret);
    else if (sticky?.return && sticky.return >= today) setRetDate(sticky.return);

    if (a) setAdults(Math.max(1, parseInt(a)));
    else if (sticky?.adults) setAdults(Math.max(1, sticky.adults));

    if (c) setChildren(Math.max(0, parseInt(c)));
    else if (typeof sticky?.children === 'number') setChildren(Math.max(0, sticky.children));

    // From field: URL > sticky > saved-airport pref > London default.
    if (f) {
      setFrom(f);
    } else if (sticky?.from) {
      setFrom(sticky.from);
    } else {
      try {
        const stored = localStorage.getItem('jma_departure_airport');
        // Older versions stored a JSON object; newer code stores a plain code.
        // Handle both shapes defensively.
        if (stored) {
          if (stored.startsWith('{')) {
            const parsed = JSON.parse(stored);
            if (parsed?.name && parsed?.code) {
              setFrom(`${parsed.name} (${parsed.code})`);
              return;
            }
          } else if (/^[A-Z]{3}$/.test(stored)) {
            setFrom(`London (${stored})`);
            return;
          }
        }
      } catch { /* no stored airport */ }
      // Fallback: London.
      setFrom('London (LON)');
    }
  }, []);

  const today = new Date().toISOString().split('T')[0];

  const nights = depDate && retDate
    ? Math.max(1, Math.round((new Date(retDate).getTime() - new Date(depDate).getTime()) / 86400000))
    : parseInt(duration);

  // Keep the Duration dropdown in lockstep with the calendar. Without this
  // the field showed the default "7 nights" while the user had picked
  // 13 May → 16 May (3 nights) — drift that read like a bug even though the
  // search itself uses the calendar (`nights` above). Calendar wins; the
  // dropdown is just a display + alternate input. (2026-05-06.)
  useEffect(() => {
    if (!depDate || !retDate) return;
    const n = Math.max(1, Math.round((new Date(retDate).getTime() - new Date(depDate).getTime()) / 86400000));
    const next = String(n);
    if (next !== duration) setDuration(next);
  }, [depDate, retDate, duration]);

  // Picking a duration in the dropdown shifts the return date so the two
  // controls stay consistent in the other direction too. Only fires when
  // there's a departure date to anchor — otherwise it's a no-op until the
  // user picks one.
  const handleDurationChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const n = e.target.value;
    setDuration(n);
    if (!depDate) return;
    const d = new Date(depDate);
    d.setDate(d.getDate() + parseInt(n));
    setRetDate(d.toISOString().split('T')[0]);
  }, [depDate]);

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

    // Persist this search so the user comes back to a pre-filled form.
    saveSticky<StickyPackages>('packages', {
      from,
      dest,
      departure: depDate,
      return: retDate,
      adults,
      children,
    });

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
        <div className="max-w-[860px] mx-auto bg-white border border-white/20 rounded-3xl p-6 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.6),0_8px_24px_-8px_rgba(236,72,153,0.3),0_0_0_1px_rgba(249,168,212,0.08)] relative z-[1]">

        <style>{`
          @keyframes blob-drift-a { 0%,100%{transform:translate(0,0) scale(1);} 50%{transform:translate(20px,-15px) scale(1.08);} }
          @keyframes blob-drift-b { 0%,100%{transform:translate(0,0) scale(1);} 50%{transform:translate(-25px,10px) scale(1.05);} }
          @keyframes blob-drift-c { 0%,100%{transform:translate(0,0) scale(1);} 50%{transform:translate(15px,20px) scale(1.1);} }
          .animate-blob-drift-a{animation:blob-drift-a 11s ease-in-out infinite;}
          .animate-blob-drift-b{animation:blob-drift-b 13s ease-in-out infinite;}
          .animate-blob-drift-c{animation:blob-drift-c 15s ease-in-out infinite;}
          @keyframes float-slow { 0%,100%{transform:translateY(0) rotate(12deg);} 50%{transform:translateY(-12px) rotate(14deg);} }
          @keyframes float-slow-reverse { 0%,100%{transform:translateY(0) rotate(-6deg);} 50%{transform:translateY(-10px) rotate(-8deg);} }
          .animate-float-slow{animation:float-slow 8s ease-in-out infinite;}
          .animate-float-slow-reverse{animation:float-slow-reverse 9s ease-in-out infinite;}
          @keyframes twinkle { 0%,100%{opacity:.2;transform:scale(.85);} 50%{opacity:1;transform:scale(1.15);} }
          .animate-twinkle{animation:twinkle 3.2s ease-in-out infinite;}
          .animate-twinkle-delay{animation:twinkle 3.2s ease-in-out infinite;animation-delay:1.6s;}
        `}</style>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5 text-center">From</label>
              <FromPicker value={from} onChange={setFrom} />
            </div>
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5 text-center">Destination</label>
              <DestinationPicker value={dest} onChange={setDest} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5 text-center">Calendar</label>
              <DateRangePicker
                start={depDate}
                end={retDate}
                minDate={today}
                accent="purple"
                startWord="departure"
                endWord="return"
                onChange={({ start: s, end: e }) => { setDepDate(s); setRetDate(e); }}
              />
            </div>
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5 text-center">Duration</label>
              <select value={duration} onChange={handleDurationChange}
                className="w-full px-3 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.82rem] font-semibold text-[#1A1D2B] outline-none focus:border-purple-500 focus:bg-white transition-all">
                {(() => {
                  const presets = [3, 4, 5, 6, 7, 10, 14, 21];
                  const current = parseInt(duration);
                  // If the calendar resolved to a non-preset night count
                  // (e.g. 8 or 12), prepend it as an extra option so the
                  // <select> can actually display it.
                  const opts = Number.isFinite(current) && current > 0 && !presets.includes(current)
                    ? [current, ...presets].sort((a, b) => a - b)
                    : presets;
                  return opts.map(n => <option key={n} value={n}>{n} night{n === 1 ? '' : 's'}</option>);
                })()}
              </select>
            </div>
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5 text-center">Guests</label>
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
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-poppins font-black text-[.95rem] py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(124,58,237,0.3)]">
            Search Packages →
          </button>
          <p className="text-center text-[.68rem] text-[#8E95A9] font-semibold mt-2.5">ATOL-protected options included · Book direct with providers</p>
        </div>

      {/* App-store badge row — sits under the search form on the dark hero. */}
      <AppStoreBadges variant="dark" className="mt-7 mb-1" />

      {/* ── Pre-built family packages (empty state only) ──
            Hidden when the user came in with a search query — the
            curated "7 nights" headline misled native-app users who
            saw it before the async auto-search completed. */}
      {!searched && !loading && !hasInitialQuery && <FamilyPackages />}

      {/* ── Loading ── */}
      {loading && <LoadingState dest={dest} />}

      {/* ── Results ── */}
      {searched && (
        <div ref={resultsRef}>

          {/* Section 1 — Package Estimate Card */}
          {hasPartialData && (
            <section className="max-w-[900px] mx-auto px-5 pt-8 pb-4">
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-6">
                <h2 className="font-poppins font-black text-[1.1rem] text-[#1A1D2B] mb-4">
                  Estimated Package Price: {searchedFrom ? searchedFrom.replace(/\s*\(.*\)$/, '') : 'UK'} → {searchedDest}
                </h2>
                <div className="space-y-2.5 mb-4">
                  {cheapestFlight !== null && (
                    <div className="flex items-center justify-between">
                      <span className="text-[.85rem] text-[#5C6378] font-semibold">✈️ Cheapest flight found</span>
                      <div className="text-right">
                        <span className="font-poppins font-black text-[1rem] text-[#1A1D2B]">£{cheapestFlight}</span>
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
                          <span className="font-poppins font-black text-[1rem] text-[#1A1D2B]">£{cheapestHotel}</span>
                          <span className="text-[.65rem] text-[#8E95A9] font-medium ml-1">/night</span>
                          <div className="text-[.6rem] text-[#8E95A9]">(indicative price)</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[.85rem] text-[#5C6378] font-semibold">📅 {nights} night{nights !== 1 ? 's' : ''}</span>
                        <span className="font-poppins font-black text-[1rem] text-[#1A1D2B]">£{hotelTotal}</span>
                      </div>
                    </>
                  )}
                  {estimatedTotal !== null && (
                    <div className="flex items-center justify-between pt-3 border-t border-purple-200">
                      <span className="text-[.95rem] text-[#1A1D2B] font-black">💰 Estimated total from</span>
                      <span className="font-poppins font-black text-[1.4rem] text-purple-600">£{estimatedTotal}<span className="text-[.7rem] font-semibold text-[#8E95A9] ml-1">per person</span></span>
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
                      <h3 className="font-poppins font-black text-[1.2rem] text-[#1A1D2B] mb-1">Expedia Packages</h3>
                      <p className="text-[.82rem] text-[#5C6378] font-semibold">Flight + Hotel bundles with price guarantee</p>
                    </div>
                    <a href={redirectUrl(buildExpediaUrl(searchedDest, searchedFrom, depDate, effectiveReturn, adults, children, childrenAges, DEST_IATA[searchedDest.toLowerCase()]), 'Expedia', searchedDest, 'packages')}
                      className="flex-shrink-0 px-6 py-3 rounded-xl font-poppins font-black text-[.85rem] text-white bg-[#1B2B65] hover:bg-[#142050] transition-all shadow-md">
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
                      <h3 className="font-poppins font-black text-[1.2rem] text-[#1A1D2B] mb-1">Trip.com Packages</h3>
                      <p className="text-[.82rem] text-[#5C6378] font-semibold">Flight + Hotel deals from a global travel leader</p>
                    </div>
                    <a href={redirectUrl(buildTripUrl(searchedDest, searchedFrom, depDate, effectiveReturn, adults, children, childrenAges), 'Trip.com', searchedDest, 'packages')}
                      className="flex-shrink-0 px-6 py-3 rounded-xl font-poppins font-black text-[.85rem] text-white bg-[#287DFA] hover:bg-[#1A6AE0] transition-all shadow-md">
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
              <h3 className="font-poppins font-black text-[1.05rem] text-[#1A1D2B] mb-2">Build Your Own Package & Save</h3>
              <p className="text-[.8rem] text-[#5C6378] font-semibold mb-5">Sometimes booking flights and hotels separately gives you more flexibility and better prices. Use our tools to build your own package:</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-5 border border-[#E8ECF4]">
                  <span className="text-2xl mb-2 block">✈️</span>
                  <h4 className="font-poppins font-black text-[.9rem] text-[#1A1D2B] mb-1">Find Flights</h4>
                  <p className="text-[.72rem] text-[#5C6378] font-semibold mb-3">
                    {searchedFrom ? searchedFrom.replace(/\s*\(.*\)$/, '') : 'UK'} → {searchedDest}{cheapestFlight ? ` from £${cheapestFlight}` : ''}
                  </p>
                  <a href={`/flights?${searchedFrom ? `from=${encodeURIComponent(searchedFrom)}` : ''}${destIata ? `&to=${destIata}` : `&destCity=${encodeURIComponent(searchedDest)}`}&departure=${depDate}${effectiveReturn ? `&return=${effectiveReturn}` : ''}`}
                    className="inline-block px-4 py-2 rounded-xl border-2 border-[#0066FF] text-[#0066FF] font-poppins font-bold text-[.75rem] hover:bg-blue-50 transition-colors">
                    Compare Flights →
                  </a>
                </div>
                <div className="bg-white rounded-xl p-5 border border-[#E8ECF4]">
                  <span className="text-2xl mb-2 block">🏨</span>
                  <h4 className="font-poppins font-black text-[.9rem] text-[#1A1D2B] mb-1">Find Hotels</h4>
                  <p className="text-[.72rem] text-[#5C6378] font-semibold mb-3">
                    Hotels in {searchedDest}{cheapestHotel ? ` from £${cheapestHotel}/night` : ''}
                  </p>
                  <a href={`/hotels?destination=${encodeURIComponent(searchedDest)}&checkin=${depDate}&checkout=${effectiveReturn}`}
                    className="inline-block px-4 py-2 rounded-xl border-2 border-orange-500 text-orange-500 font-poppins font-bold text-[.75rem] hover:bg-orange-50 transition-colors">
                    Compare Hotels →
                  </a>
                </div>
                <div className="bg-white rounded-xl p-5 border border-[#E8ECF4]">
                  <span className="text-2xl mb-2 block">🚗</span>
                  <h4 className="font-poppins font-black text-[.9rem] text-[#1A1D2B] mb-1">Add Car Hire</h4>
                  <p className="text-[.72rem] text-[#5C6378] font-semibold mb-3">
                    Car hire in {searchedDest} from your arrival
                  </p>
                  <a href={`/cars?location=${encodeURIComponent(searchedDest)}&pickup=${depDate}&dropoff=${effectiveReturn}`}
                    className="inline-block px-4 py-2 rounded-xl border-2 border-emerald-500 text-emerald-500 font-poppins font-bold text-[.75rem] hover:bg-emerald-50 transition-colors">
                    Compare Car Hire →
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4 — Popular Destinations */}
          <section className="max-w-[900px] mx-auto px-5 pb-8">
            <h3 className="font-poppins font-black text-[1.05rem] text-[#1A1D2B] mb-4">Popular Package Destinations</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {POPULAR_DESTS.map(d => (
                <a key={d.name} href={`/packages?dest=${encodeURIComponent(d.name)}&departure=${depDate || today}&return=${effectiveReturn || ''}`}
                  className="group relative rounded-2xl overflow-hidden h-44 block border border-[#E8ECF4] hover:shadow-lg transition-all">
                  <img src={d.photo} alt={d.name} loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <div className="font-poppins font-black text-white text-[.9rem]">{d.name} {d.flag}</div>
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
          <h3 className="font-poppins font-black text-[1.05rem] text-[#1A1D2B] mb-4">Tips for Finding the Best Package Holiday</h3>
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
                  <div className="font-poppins font-bold text-[.85rem] text-[#1A1D2B] mb-0.5">{title}</div>
                  <p className="text-[.75rem] text-[#5C6378] font-semibold leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </>
  );
}

export default PackagesContent;
