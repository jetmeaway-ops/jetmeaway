'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

/* ═══════════════════════════════════════════════════════════════════════════
   AIRPORTS — 20 UK departures + 250+ worldwide destinations
   ═══════════════════════════════════════════════════════════════════════════ */

const UK_AIRPORTS = [
  { code: 'LHR', name: 'London Heathrow', city: 'London' },
  { code: 'LGW', name: 'London Gatwick', city: 'London' },
  { code: 'STN', name: 'London Stansted', city: 'London' },
  { code: 'LTN', name: 'London Luton', city: 'London' },
  { code: 'SEN', name: 'London Southend', city: 'London' },
  { code: 'LCY', name: 'London City', city: 'London' },
  { code: 'MAN', name: 'Manchester', city: 'Manchester' },
  { code: 'BHX', name: 'Birmingham', city: 'Birmingham' },
  { code: 'EDI', name: 'Edinburgh', city: 'Edinburgh' },
  { code: 'GLA', name: 'Glasgow', city: 'Glasgow' },
  { code: 'BRS', name: 'Bristol', city: 'Bristol' },
  { code: 'LPL', name: 'Liverpool', city: 'Liverpool' },
  { code: 'NCL', name: 'Newcastle', city: 'Newcastle' },
  { code: 'LBA', name: 'Leeds Bradford', city: 'Leeds' },
  { code: 'EMA', name: 'East Midlands', city: 'Nottingham' },
  { code: 'BFS', name: 'Belfast International', city: 'Belfast' },
  { code: 'CWL', name: 'Cardiff', city: 'Cardiff' },
  { code: 'ABZ', name: 'Aberdeen', city: 'Aberdeen' },
  { code: 'SOU', name: 'Southampton', city: 'Southampton' },
  { code: 'EXT', name: 'Exeter', city: 'Exeter' },
];

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

type UKAirport = typeof UK_AIRPORTS[number];
type Dest = typeof DESTINATIONS[number];

/* ═══════════════════════════════════════════════════════════════════════════
   AIRLINE NAMES (for display)
   ═══════════════════════════════════════════════════════════════════════════ */

const AIRLINE_NAMES: Record<string, string> = {
  FR: 'Ryanair', U2: 'easyJet', BA: 'British Airways', W6: 'Wizz Air',
  BY: 'TUI', LS: 'Jet2', LH: 'Lufthansa', EW: 'Eurowings',
  VY: 'Vueling', EI: 'Aer Lingus', KL: 'KLM', AF: 'Air France',
  TK: 'Turkish Airlines', EK: 'Emirates', QR: 'Qatar Airways',
  WN: 'Southwest', AA: 'American Airlines', UA: 'United Airlines',
  DL: 'Delta', W9: 'Wizz Air UK', D8: 'Norwegian', DY: 'Norwegian',
  PC: 'Pegasus', SQ: 'Singapore Airlines', VS: 'Virgin Atlantic',
  IB: 'Iberia', TP: 'TAP Portugal', SK: 'SAS', AY: 'Finnair',
  OS: 'Austrian', LX: 'Swiss', SN: 'Brussels Airlines',
};

/* ═══════════════════════════════════════════════════════════════════════════
   PROVIDER DEEP LINK BUILDERS
   ═══════════════════════════════════════════════════════════════════════════ */

function buildAviasalesUrl(o: string, d: string, dep: string, ret: string | null, adults: number): string {
  const p = dep.split('-');
  const ddmm = p[2] + p[1];
  let path = `${o}${ddmm}${d}`;
  if (ret) { const rp = ret.split('-'); path += rp[2] + rp[1]; }
  path += String(adults);
  return `https://tp.media/r?marker=714449&trs=512633&p=4114&u=${encodeURIComponent(`https://www.aviasales.com/search/${path}`)}`;
}

function buildTripUrl(o: string, d: string, dep: string, ret: string | null, adults: number): string {
  const oL = o.toLowerCase();
  const dL = d.toLowerCase();
  let u = `https://www.trip.com/flights/${oL}-to-${dL}/tickets-${o}-${d}?dcity=${o}&acity=${d}&ddate=${dep}&adult=${adults}`;
  if (ret) u += `&rdate=${ret}`;
  return `https://tp.media/r?marker=714449&trs=512633&p=8311&u=${encodeURIComponent(u)}`;
}

function buildSkyscannerUrl(o: string, d: string, dep: string, ret: string | null, adults: number): string {
  const fmt = (date: string) => date.slice(2).replace(/-/g, ''); // YYMMDD
  let u = `https://www.skyscanner.net/transport/flights/${o}/${d}/${fmt(dep)}/`;
  if (ret) u += `${fmt(ret)}/`;
  u += `?adultsv2=${adults}&cabinclass=economy&rtn=${ret ? '1' : '0'}`;
  return u;
}

function buildExpediaUrl(o: string, d: string, dep: string, ret: string | null, adults: number): string {
  const trip = ret ? 'roundtrip' : 'oneway';
  let u = `https://www.expedia.co.uk/Flights-Search?trip=${trip}&leg1=from:${o},to:${d},departure:${dep}TANYT&passengers=adults:${adults}&affcid=clbU3QK`;
  if (ret) u += `&leg2=from:${d},to:${o},departure:${ret}TANYT`;
  return `https://tp.media/r?marker=714449&trs=512633&p=11584&u=${encodeURIComponent(u)}`;
}

function buildKiwiUrl(o: string, d: string, dep: string, ret: string | null, adults: number, fromCity: string, toCity: string): string {
  const fC = fromCity.toLowerCase().replace(/\s+/g, '-');
  const tC = toCity.toLowerCase().replace(/\s+/g, '-');
  const path = ret ? `${fC}/${tC}/${dep}/${ret}` : `${fC}/${tC}/${dep}/no-return`;
  return `https://tp.media/r?marker=714449&trs=512633&p=7054&u=${encodeURIComponent(`https://www.kiwi.com/en/search/results/${path}/${adults}adults`)}`;
}

type ProviderInfo = {
  name: string;
  logo: string;
  getUrl: (o: string, d: string, dep: string, ret: string | null, adults: number, fromCity: string, toCity: string) => string;
};

const PROVIDERS: ProviderInfo[] = [
  { name: 'Aviasales', logo: '✈', getUrl: (o, d, dep, ret, a) => buildAviasalesUrl(o, d, dep, ret, a) },
  { name: 'Trip.com', logo: '🗺', getUrl: (o, d, dep, ret, a) => buildTripUrl(o, d, dep, ret, a) },
  { name: 'Skyscanner', logo: '🔍', getUrl: (o, d, dep, ret, a) => buildSkyscannerUrl(o, d, dep, ret, a) },
  { name: 'Expedia', logo: '🌍', getUrl: (o, d, dep, ret, a) => buildExpediaUrl(o, d, dep, ret, a) },
  { name: 'Kiwi.com', logo: '🥝', getUrl: (o, d, dep, ret, a, fc, tc) => buildKiwiUrl(o, d, dep, ret, a, fc, tc) },
];

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

type FlightResult = {
  airline: string;
  airlineCode: string;
  price: number;
  currency: string;
  stops: string;
  transfers: number;
  duration_to: number;
  duration_back: number;
  departure_at: string | null;
  return_at: string | null;
  flight_number: number | null;
  link: string | null;
};

type CalendarDay = {
  depart_date: string;
  return_date?: string;
  value: number;
  number_of_changes: number;
  duration: number;
  origin: string;
  destination: string;
};

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

function AutocompleteFrom({ value, onChange, initialCode }: {
  value: string;
  onChange: (code: string, name: string) => void;
  initialCode: string;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<UKAirport | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  useEffect(() => {
    if (!initialCode) return;
    const ap = UK_AIRPORTS.find(a => a.code === initialCode.toUpperCase());
    if (ap && (!chosen || chosen.code !== ap.code)) {
      setQ(`${ap.name} (${ap.code})`);
      setChosen(ap);
      onChangeRef.current(ap.code, ap.city);
    }
  }, [initialCode]);

  const filtered = q.length >= 1
    ? UK_AIRPORTS.filter(a =>
      a.code.toLowerCase().includes(q.toLowerCase()) ||
      a.name.toLowerCase().includes(q.toLowerCase()) ||
      a.city.toLowerCase().includes(q.toLowerCase())
    ).slice(0, 8)
    : UK_AIRPORTS;

  return (
    <div ref={ref} className="relative">
      <input type="text" placeholder="City or airport — e.g. Manchester, MAN" value={q} autoComplete="off"
        onChange={e => { setQ(e.target.value); setChosen(null); onChange('', ''); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className="w-full px-4 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.9rem] font-semibold text-[#1A1D2B] outline-none focus:border-[#0066FF] focus:bg-white transition-all placeholder:text-[#B0B8CC]" />
      {chosen && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <span className="text-[.7rem] font-black text-[#0066FF] bg-blue-50 px-2 py-0.5 rounded-md">{chosen.code}</span>
        </div>
      )}
      {open && (
        <ul className="absolute z-50 w-full mt-1.5 bg-white border border-[#E8ECF4] rounded-2xl shadow-2xl overflow-auto max-h-64">
          {filtered.map(a => (
            <li key={a.code}
              onMouseDown={() => { setQ(`${a.name} (${a.code})`); setChosen(a); onChange(a.code, a.city); setOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors border-b border-[#F1F3F7] last:border-0 ${chosen?.code === a.code ? 'bg-blue-50' : ''}`}>
              <span className="font-black text-[.75rem] text-[#0066FF] w-10 flex-shrink-0 bg-blue-50 px-1.5 py-0.5 rounded text-center">{a.code}</span>
              <span className="font-[Poppins] font-bold text-[.83rem] text-[#1A1D2B]">{a.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AutocompleteTo({ value, onChange, initialCode }: {
  value: string;
  onChange: (code: string, city: string) => void;
  initialCode: string;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<Dest | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  useEffect(() => {
    if (!initialCode) return;
    const d = DESTINATIONS.find(d => d.code === initialCode.toUpperCase());
    if (d && (!chosen || chosen.code !== d.code)) {
      setQ(`${d.city} (${d.code})`);
      setChosen(d);
      onChangeRef.current(d.code, d.city);
    }
  }, [initialCode]);

  const lq = q.toLowerCase();
  const filtered = q.length >= 1
    ? DESTINATIONS.filter(d =>
      d.city.toLowerCase().includes(lq) ||
      d.country.toLowerCase().includes(lq) ||
      d.code.toLowerCase().startsWith(lq)
    ).slice(0, 8)
    : DESTINATIONS.slice(0, 10);

  return (
    <div ref={ref} className="relative">
      <input type="text" placeholder="City or airport — e.g. Barcelona, BCN" value={q} autoComplete="off"
        onChange={e => { setQ(e.target.value); setChosen(null); onChange('', ''); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className="w-full px-4 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.9rem] font-semibold text-[#1A1D2B] outline-none focus:border-[#0066FF] focus:bg-white transition-all placeholder:text-[#B0B8CC]" />
      {chosen && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <span className="text-[.7rem] font-black text-[#0066FF] bg-blue-50 px-2 py-0.5 rounded-md">{chosen.code}</span>
        </div>
      )}
      {open && (
        <ul className="absolute z-50 w-full mt-1.5 bg-white border border-[#E8ECF4] rounded-2xl shadow-2xl overflow-auto max-h-64">
          {filtered.map(d => (
            <li key={d.code}
              onMouseDown={() => { setQ(`${d.city} (${d.code})`); setChosen(d); onChange(d.code, d.city); setOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors border-b border-[#F1F3F7] last:border-0 ${chosen?.code === d.code ? 'bg-blue-50' : ''}`}>
              <span className="text-xl">{d.flag}</span>
              <div className="flex-1">
                <span className="font-[Poppins] font-bold text-[.85rem] text-[#1A1D2B]">{d.city}</span>
                <span className="text-[.72rem] text-[#8E95A9] ml-1.5">{d.country}</span>
              </div>
              <span className="font-mono text-[.68rem] font-bold text-[#8E95A9]">{d.code}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PaxRow({ label: lbl, sub, val, min, max, onDec, onInc }: {
  label: string; sub: string; val: number; min: number; max: number;
  onDec: () => void; onInc: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#F1F3F7] last:border-0">
      <div>
        <div className="font-[Poppins] font-bold text-[.85rem] text-[#1A1D2B]">{lbl}</div>
        <div className="text-[.7rem] text-[#8E95A9] font-medium">{sub}</div>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={onDec} disabled={val <= min}
          className="w-8 h-8 rounded-full border-2 border-[#E8ECF4] flex items-center justify-center text-[#5C6378] font-bold text-lg hover:border-[#0066FF] hover:text-[#0066FF] transition-all disabled:opacity-30">−</button>
        <span className="font-[Poppins] font-black text-[.95rem] text-[#1A1D2B] w-5 text-center">{val}</span>
        <button type="button" onClick={onInc} disabled={val >= max}
          className="w-8 h-8 rounded-full border-2 border-[#E8ECF4] flex items-center justify-center text-[#5C6378] font-bold text-lg hover:border-[#0066FF] hover:text-[#0066FF] transition-all disabled:opacity-30">+</button>
      </div>
    </div>
  );
}

function PassengerPicker({ adults, children, infants, onChange }: {
  adults: number; children: number; infants: number;
  onChange: (a: number, c: number, i: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const label = [
    `${adults} Adult${adults !== 1 ? 's' : ''}`,
    children > 0 ? `${children} Child${children !== 1 ? 'ren' : ''}` : null,
    infants > 0 ? `${infants} Infant${infants !== 1 ? 's' : ''}` : null,
  ].filter(Boolean).join(', ');

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full px-4 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-left text-[.85rem] font-semibold text-[#1A1D2B] outline-none focus:border-[#0066FF] hover:bg-white transition-all flex items-center justify-between">
        <span>{label}</span>
        <span className="text-[#B0B8CC] text-xs">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div className="absolute z-50 w-72 mt-1.5 right-0 bg-white border border-[#E8ECF4] rounded-2xl shadow-2xl p-4">
          <PaxRow label="Adults" sub="Age 12+" val={adults} min={1} max={9}
            onDec={() => onChange(adults - 1, children, infants)} onInc={() => onChange(adults + 1, children, infants)} />
          <PaxRow label="Children" sub="Age 2–11" val={children} min={0} max={8}
            onDec={() => onChange(adults, children - 1, infants)} onInc={() => onChange(adults, children + 1, infants)} />
          <PaxRow label="Infants" sub="Under 2" val={infants} min={0} max={adults}
            onDec={() => onChange(adults, children, infants - 1)} onInc={() => onChange(adults, children, infants + 1)} />
          <button type="button" onClick={() => setOpen(false)}
            className="w-full mt-3 bg-[#0066FF] hover:bg-[#0052CC] text-white font-[Poppins] font-bold text-[.8rem] py-2.5 rounded-xl transition-colors">
            Done
          </button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   LOADING ANIMATION
   ═══════════════════════════════════════════════════════════════════════════ */

const LOADING_MSGS = [
  'Searching Aviasales...',
  'Checking Trip.com...',
  'Comparing Skyscanner...',
  'Scanning Expedia...',
  'Checking Kiwi.com...',
  'Finding you the best deal...',
];

function LoadingState({ origin, dest }: { origin: string; dest: string }) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const msgTimer = setInterval(() => setMsgIdx(i => (i + 1) % LOADING_MSGS.length), 500);
    const progTimer = setInterval(() => setProgress(p => Math.min(p + 1.2, 95)), 50);
    return () => { clearInterval(msgTimer); clearInterval(progTimer); };
  }, []);

  return (
    <section className="max-w-[860px] mx-auto px-5 py-10">
      <div className="bg-white border border-[#E8ECF4] rounded-2xl p-8 text-center shadow-sm">
        <div className="w-full bg-[#F1F3F7] rounded-full h-2 mb-5 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#0066FF] to-[#4F46E5] rounded-full transition-all duration-100" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-5 h-5 border-2 border-[#0066FF] border-t-transparent rounded-full animate-spin" />
          <span className="text-[.9rem] font-bold text-[#5C6378]">{LOADING_MSGS[msgIdx]}</span>
        </div>
        <p className="text-[.78rem] text-[#8E95A9] font-semibold">Comparing prices for <strong className="text-[#1A1D2B]">{origin} → {dest}</strong></p>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PRICE HISTORY BAR CHART
   ═══════════════════════════════════════════════════════════════════════════ */

function PriceCalendar({ origin, dest, depDate }: { origin: string; dest: string; depDate: string }) {
  const [data, setData] = useState<CalendarDay[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const month = depDate.slice(0, 7);
    setLoading(true);
    fetch(`/api/flights?origin=${origin}&destination=${dest}&mode=calendar&month=${month}`)
      .then(r => r.json())
      .then(d => { setData(d.data || []); setLoading(false); })
      .catch(() => { setData([]); setLoading(false); });
  }, [origin, dest, depDate]);

  if (loading) {
    return (
      <div className="bg-white border border-[#E8ECF4] rounded-2xl p-6">
        <div className="h-4 w-48 bg-[#F1F3F7] rounded animate-pulse mb-4" />
        <div className="flex gap-1 items-end h-32">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="flex-1 bg-[#F1F3F7] rounded-t animate-pulse" style={{ height: `${30 + Math.random() * 70}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) return null;

  const sorted = [...data].sort((a, b) => new Date(a.depart_date).getTime() - new Date(b.depart_date).getTime());
  const prices = sorted.map(d => d.value);
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  const range = maxPrice - minPrice || 1;

  function getColor(price: number): string {
    const ratio = (price - minPrice) / range;
    if (ratio < 0.33) return '#10b981'; // green
    if (ratio < 0.66) return '#f59e0b'; // amber
    return '#ef4444'; // red
  }

  return (
    <div className="bg-white border border-[#E8ECF4] rounded-2xl p-6">
      <h3 className="font-[Poppins] font-black text-[1rem] text-[#1A1D2B] mb-1">Best Days to Fly {origin} → {dest}</h3>
      <p className="text-[.72rem] text-[#8E95A9] font-semibold mb-4">
        <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#10b981] mr-1 align-middle" /> Cheap
        <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#f59e0b] mx-1 ml-3 align-middle" /> Medium
        <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#ef4444] mx-1 ml-3 align-middle" /> Expensive
      </p>
      <div className="flex gap-[3px] items-end h-36 overflow-x-auto pb-1">
        {sorted.map((d, i) => {
          const h = 15 + ((d.value - minPrice) / range) * 85;
          const day = new Date(d.depart_date).getDate();
          const mon = new Date(d.depart_date).toLocaleString('en-GB', { month: 'short' });
          return (
            <div key={i} className="flex flex-col items-center flex-1 min-w-[22px] group relative">
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#1A1D2B] text-white text-[.6rem] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                £{d.value} · {day} {mon}
              </div>
              <div className="w-full rounded-t-sm transition-all hover:opacity-80 cursor-default"
                style={{ height: `${h}%`, backgroundColor: getColor(d.value) }} />
              <span className="text-[.55rem] text-[#8E95A9] font-semibold mt-1">{day}</span>
            </div>
          );
        })}
      </div>
      <p className="text-[.65rem] text-[#8E95A9] font-semibold mt-3 text-center">Hover over bars to see prices · Based on recent searches</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═��═════════════════════════════════════════════════════════════════════════ */

function FlightsContent() {
  const [originCode, setOriginCode] = useState('');
  const [originCity, setOriginCity] = useState('');
  const [destCode, setDestCode] = useState('');
  const [destCity, setDestCity] = useState('');
  const [depDate, setDepDate] = useState('');
  const [retDate, setRetDate] = useState('');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [tripType, setTripType] = useState<'one-way' | 'return'>('return');

  const [loading, setLoading] = useState(false);
  const [flights, setFlights] = useState<FlightResult[] | null>(null);
  const [apiError, setApiError] = useState('');
  const [searched, setSearched] = useState(false);

  // URL param initialisation
  const [initOrigin, setInitOrigin] = useState('');
  const [initDest, setInitDest] = useState('');

  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const o = p.get('origin') || p.get('from') || '';
    const d = p.get('dest') || p.get('to') || '';
    const destCityParam = p.get('destCity') || '';
    const dep = p.get('departure') || '';
    const ret = p.get('return') || '';

    // Read from localStorage as fallback for origin
    if (!o) {
      const saved = localStorage.getItem('jma_departure_airport');
      if (saved) setInitOrigin(saved);
    } else {
      setInitOrigin(o);
    }

    if (d) setInitDest(d);
    if (destCityParam && d) setDestCity(destCityParam);
    if (dep) setDepDate(dep);
    if (ret) { setRetDate(ret); setTripType('return'); }
  }, []);

  const today = new Date().toISOString().split('T')[0];

  const handleSearch = useCallback(async () => {
    if (!originCode) { alert('Please select a departure airport'); return; }
    if (!destCode) { alert('Please select a destination'); return; }
    if (!depDate) { alert('Please select a departure date'); return; }

    setFlights(null);
    setApiError('');
    setLoading(true);
    setSearched(true);

    try {
      const params = new URLSearchParams({
        origin: originCode,
        destination: destCode,
        departure: depDate,
        adults: String(adults),
      });
      if (retDate && tripType === 'return') params.set('return', retDate);

      const res = await fetch(`/api/flights?${params}`);
      const data = await res.json();

      if (data.error) {
        setApiError(data.error);
        setLoading(false);
        return;
      }

      setFlights(data.flights || []);
      setLoading(false);

      // Scroll to results
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch {
      setApiError('Could not load flight prices. Please try again.');
      setLoading(false);
    }
  }, [originCode, destCode, depDate, retDate, adults, tripType]);

  // Helper: format departure/arrival times from ISO string
  function fmtTime(iso: string | null): string {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    } catch { return '—'; }
  }

  function fmtDate(iso: string | null): string {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch { return ''; }
  }

  function fmtDuration(mins: number): string {
    if (!mins || mins <= 0) return '';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  // Compute arrival time by adding duration to departure
  function arrivalTime(depIso: string | null, durationMins: number): string {
    if (!depIso || !durationMins) return '—';
    try {
      const d = new Date(depIso);
      d.setMinutes(d.getMinutes() + durationMins);
      return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    } catch { return '—'; }
  }

  const cheapest = flights && flights.length > 0 ? flights[0] : null;
  const effectiveRet = tripType === 'return' ? retDate : null;

  return (
    <>
      <Header />

      {/* ── Hero + Search ── */}
      <section className="pt-36 pb-10 px-5 bg-[radial-gradient(ellipse_at_top,#E8F0FE_0%,#fff_55%,#F8FAFC_100%)]">
        <div className="max-w-[860px] mx-auto text-center mb-8">
          <span className="inline-block bg-blue-50 text-[#0066FF] text-[.65rem] font-black uppercase tracking-[2.5px] px-3.5 py-1.5 rounded-full mb-4">✈ Flight Comparison</span>
          <h1 className="font-[Poppins] text-[2.4rem] md:text-[3.6rem] font-black text-[#1A1D2B] leading-[1.05] tracking-tight mb-3">
            Find the <em className="italic bg-gradient-to-br from-[#0066FF] to-[#4F46E5] bg-clip-text text-transparent">Cheapest</em> Flights
          </h1>
          <p className="text-[1rem] text-[#8E95A9] font-semibold max-w-[520px] mx-auto">Compare 5 providers in seconds — real prices shown right here.</p>
        </div>

        <div className="max-w-[860px] mx-auto bg-white border border-[#E8ECF4] rounded-3xl p-6 shadow-[0_8px_40px_rgba(0,102,255,0.08)]">
          {/* Trip type */}
          <div className="flex gap-1.5 mb-5 bg-[#F8FAFC] p-1 rounded-xl w-fit">
            {(['return', 'one-way'] as const).map(t => (
              <button key={t} onClick={() => { setTripType(t); if (t === 'one-way') setRetDate(''); }}
                className={`px-4 py-2 rounded-lg text-[.75rem] font-extrabold uppercase tracking-[1.5px] transition-all ${tripType === t ? 'bg-white text-[#0066FF] shadow-sm' : 'text-[#8E95A9] hover:text-[#1A1D2B]'}`}>
                {t === 'return' ? '↔ Return' : '→ One-way'}
              </button>
            ))}
          </div>

          {/* From / To */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">From</label>
              <AutocompleteFrom value={originCode} onChange={(code, city) => { setOriginCode(code); setOriginCity(city); }} initialCode={initOrigin} />
            </div>
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">To</label>
              <AutocompleteTo value={destCode} onChange={(code, city) => { setDestCode(code); setDestCity(city); }} initialCode={initDest} />
            </div>
          </div>

          {/* Dates + Passengers */}
          <div className={`grid gap-3 mb-4 ${tripType === 'return' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Departure</label>
              <input type="date" min={today} value={depDate} onChange={e => setDepDate(e.target.value)}
                className="w-full px-3 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.85rem] font-semibold text-[#1A1D2B] outline-none focus:border-[#0066FF] focus:bg-white transition-all" />
            </div>
            {tripType === 'return' && (
              <div>
                <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Return</label>
                <input type="date" min={depDate || today} value={retDate} onChange={e => setRetDate(e.target.value)}
                  className="w-full px-3 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.85rem] font-semibold text-[#1A1D2B] outline-none focus:border-[#0066FF] focus:bg-white transition-all" />
              </div>
            )}
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Passengers</label>
              <PassengerPicker adults={adults} children={children} infants={infants}
                onChange={(a, c, i) => { setAdults(a); setChildren(c); setInfants(i); }} />
            </div>
          </div>

          <button onClick={handleSearch} disabled={loading}
            className="w-full bg-[#0066FF] hover:bg-[#0052CC] disabled:opacity-60 text-white font-[Poppins] font-black text-[.95rem] py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(0,102,255,0.3)]">
            {loading ? 'Searching…' : 'Search 5 Providers →'}
          </button>
          <p className="text-center text-[.68rem] text-[#8E95A9] font-semibold mt-2.5">Free comparison · Results shown here · Click any deal to book on the provider site</p>
        </div>
      </section>

      {/* ── Loading State ── */}
      {loading && <LoadingState origin={originCode} dest={destCode} />}

      {/* ── API Error ── */}
      {apiError && (
        <section className="max-w-[860px] mx-auto px-5 py-6">
          <div className="bg-red-50 border border-red-100 rounded-2xl p-5 text-center">
            <p className="text-[.85rem] font-bold text-red-600 mb-3">{apiError}</p>
            <button onClick={handleSearch}
              className="bg-[#0066FF] hover:bg-[#0052CC] text-white font-[Poppins] font-bold text-[.82rem] px-6 py-2.5 rounded-xl transition-all">
              Try Again
            </button>
          </div>
        </section>
      )}

      {/* ── Results ── */}
      {searched && !loading && flights !== null && (
        <div ref={resultsRef}>
          {/* Section 1: Price Summary Bar */}
          {cheapest && (
            <section className="max-w-[1000px] mx-auto px-5 pt-8 pb-4">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🏷</span>
                  <span className="font-[Poppins] font-black text-[1rem] text-[#1A1D2B]">
                    Cheapest found: <span className="text-green-600">£{cheapest.price}</span> with {cheapest.airline}
                    {cheapest.transfers === 0 && <span className="text-green-600"> (direct)</span>}
                  </span>
                </div>
                <p className="text-[.7rem] text-[#8E95A9] font-semibold">Prices are indicative based on recent searches. Click &apos;View Deal&apos; for live pricing from the provider.</p>
              </div>
            </section>
          )}

          {/* Section 2: Flight Result Cards */}
          {flights.length > 0 ? (
            <section className="max-w-[1000px] mx-auto px-5 pb-6">
              <div className="space-y-3">
                {flights.map((f, i) => {
                  const isCheapest = i === 0;
                  const depTime = fmtTime(f.departure_at);
                  const arrTime = arrivalTime(f.departure_at, f.duration_to);
                  const duration = fmtDuration(f.duration_to);
                  const airlineLogo = `https://pics.avs.io/80/80/${f.airlineCode}.png`;
                  const viewDealUrl = buildAviasalesUrl(originCode, destCode, depDate, effectiveRet, adults);

                  return (
                    <div key={i} className={`bg-white border rounded-2xl overflow-hidden transition-shadow hover:shadow-md ${isCheapest ? 'border-green-200 ring-1 ring-green-100' : 'border-[#E8ECF4]'}`}>
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-4 p-5 items-center">
                        {/* Airline */}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#F8FAFC] border border-[#E8ECF4] flex items-center justify-center flex-shrink-0 overflow-hidden">
                            <img src={airlineLogo} alt={f.airline} className="w-8 h-8 object-contain"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-lg">✈</span>'; }} />
                          </div>
                          <div>
                            <div className="font-[Poppins] font-bold text-[.88rem] text-[#1A1D2B] flex items-center gap-2">
                              {f.airline}
                              {isCheapest && <span className="text-[.55rem] font-black uppercase tracking-[1.5px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Cheapest</span>}
                            </div>
                            {f.flight_number && <div className="text-[.65rem] text-[#8E95A9] font-semibold">{f.airlineCode} {f.flight_number}</div>}
                          </div>
                        </div>

                        {/* Flight info */}
                        <div className="flex items-center gap-3">
                          <div className="text-center min-w-[50px]">
                            <div className="font-[Poppins] font-black text-[1.05rem] text-[#1A1D2B]">{depTime}</div>
                            <div className="text-[.62rem] text-[#8E95A9] font-semibold">{originCode}</div>
                          </div>
                          <div className="flex-1 flex flex-col items-center gap-0.5 min-w-[80px]">
                            <div className="text-[.65rem] text-[#8E95A9] font-semibold">{duration}</div>
                            <div className="w-full flex items-center gap-0.5">
                              <div className="flex-1 h-px bg-[#D1D5DB]" />
                              <span className="text-[#B0B8CC] text-[.7rem]">✈</span>
                              <div className="flex-1 h-px bg-[#D1D5DB]" />
                            </div>
                            <span className={`text-[.58rem] font-black uppercase tracking-[1px] ${f.transfers === 0 ? 'text-green-600' : 'text-orange-500'}`}>
                              {f.stops}
                            </span>
                          </div>
                          <div className="text-center min-w-[50px]">
                            <div className="font-[Poppins] font-black text-[1.05rem] text-[#1A1D2B]">{arrTime}</div>
                            <div className="text-[.62rem] text-[#8E95A9] font-semibold">{destCode}</div>
                          </div>
                        </div>

                        {/* Price + View Deal */}
                        <div className="flex items-center gap-4 md:flex-col md:items-end md:gap-2">
                          <div className="text-right">
                            <div className="font-[Poppins] font-black text-[1.5rem] text-[#1A1D2B] leading-none">{f.currency}{f.price}</div>
                            <div className="text-[.6rem] text-[#8E95A9] font-semibold">per person, {f.return_at ? 'return' : 'one-way'}</div>
                          </div>
                          <a href={viewDealUrl} target="_blank" rel="noopener noreferrer"
                            className="bg-[#0066FF] hover:bg-[#0052CC] text-white font-[Poppins] font-bold text-[.78rem] px-5 py-2.5 rounded-xl transition-all shadow-[0_4px_12px_rgba(0,102,255,0.2)] whitespace-nowrap">
                            View Deal →
                          </a>
                        </div>
                      </div>

                      {/* Return flight info */}
                      {f.return_at && f.duration_back > 0 && (
                        <div className="border-t border-[#F1F3F7] px-5 py-2.5 bg-[#FAFBFD] flex items-center gap-3 text-[.72rem] text-[#8E95A9] font-semibold">
                          <span className="text-[#5C6378] font-bold">Return:</span>
                          <span>{fmtDate(f.return_at)}, {fmtTime(f.return_at)} → {arrivalTime(f.return_at, f.duration_back)}</span>
                          <span>({fmtDuration(f.duration_back)}, {f.transfers === 0 ? 'Direct' : f.stops})</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ) : (
            /* Section G: No results */
            <section className="max-w-[860px] mx-auto px-5 py-8">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
                <span className="text-3xl mb-3 block">🔎</span>
                <p className="font-[Poppins] font-bold text-[.95rem] text-[#1A1D2B] mb-2">
                  We don&apos;t have cached prices for this route yet.
                </p>
                <p className="text-[.78rem] text-[#8E95A9] font-semibold">
                  Compare live prices directly across our providers below.
                </p>
              </div>
            </section>
          )}

          {/* Section 3: Provider Comparison Strip */}
          <section className="max-w-[1000px] mx-auto px-5 pb-8">
            <h3 className="font-[Poppins] font-black text-[1.05rem] text-[#1A1D2B] mb-4">Compare This Route Across All Providers</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {PROVIDERS.map(p => {
                const url = p.getUrl(originCode, destCode, depDate, effectiveRet, adults, originCity, destCity);
                return (
                  <div key={p.name} className="bg-white border border-[#E8ECF4] rounded-xl p-4 flex flex-col items-center text-center hover:border-blue-300 hover:shadow-md transition-all">
                    <div className="w-10 h-10 rounded-lg bg-[#F8FAFC] border border-[#E8ECF4] flex items-center justify-center text-xl mb-2">{p.logo}</div>
                    <div className="font-[Poppins] font-bold text-[.85rem] text-[#1A1D2B] mb-1">{p.name}</div>
                    {cheapest && (
                      <div className="text-[.75rem] font-bold text-green-600 mb-2">From £{cheapest.price}</div>
                    )}
                    {!cheapest && (
                      <div className="text-[.72rem] font-semibold text-[#8E95A9] mb-2">Check Price</div>
                    )}
                    <a href={url} target="_blank" rel="noopener noreferrer"
                      className="w-full bg-[#0066FF] hover:bg-[#0052CC] text-white font-[Poppins] font-bold text-[.72rem] py-2 rounded-lg transition-all">
                      Search {p.name} →
                    </a>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Section D: Cross-sell sections */}
          <section className="max-w-[1000px] mx-auto px-5 pb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Hotels */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5">
                <span className="text-2xl mb-2 block">🏨</span>
                <h4 className="font-[Poppins] font-black text-[.9rem] text-[#1A1D2B] mb-1">Hotels in {destCity || destCode}</h4>
                <p className="text-[.75rem] text-[#5C6378] font-semibold mb-3">Found your flight? Now find your hotel.</p>
                <a href={`/hotels?destination=${encodeURIComponent(destCity || destCode)}${depDate ? `&checkin=${depDate}` : ''}${retDate ? `&checkout=${retDate}` : ''}`}
                  className="inline-block bg-white hover:bg-blue-50 text-[#0066FF] font-[Poppins] font-bold text-[.75rem] px-4 py-2 rounded-lg border border-blue-200 transition-all">
                  Compare Hotels →
                </a>
              </div>

              {/* Car Hire */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-5">
                <span className="text-2xl mb-2 block">🚗</span>
                <h4 className="font-[Poppins] font-black text-[.9rem] text-[#1A1D2B] mb-1">Car Hire at {destCity || destCode}</h4>
                <p className="text-[.75rem] text-[#5C6378] font-semibold mb-3">Need wheels when you land?</p>
                <a href={`/cars?location=${encodeURIComponent(destCity || destCode)}`}
                  className="inline-block bg-white hover:bg-amber-50 text-amber-600 font-[Poppins] font-bold text-[.75rem] px-4 py-2 rounded-lg border border-amber-200 transition-all">
                  Compare Car Hire →
                </a>
              </div>

              {/* Packages */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 rounded-2xl p-5">
                <span className="text-2xl mb-2 block">📦</span>
                <h4 className="font-[Poppins] font-black text-[.9rem] text-[#1A1D2B] mb-1">Complete Package Deal</h4>
                <p className="text-[.75rem] text-[#5C6378] font-semibold mb-3">Save up to 30% by booking flight + hotel together.</p>
                <a href={`/packages?from=${originCode}&to=${destCode}&depart=${depDate}&return=${retDate}`}
                  className="inline-block bg-white hover:bg-purple-50 text-purple-600 font-[Poppins] font-bold text-[.75rem] px-4 py-2 rounded-lg border border-purple-200 transition-all">
                  View Packages →
                </a>
              </div>
            </div>
          </section>

          {/* Section E: Price History */}
          <section className="max-w-[1000px] mx-auto px-5 pb-8">
            <PriceCalendar origin={originCode} dest={destCode} depDate={depDate} />
          </section>
        </div>
      )}

      {/* ── Tips ── */}
      <section className="max-w-[860px] mx-auto px-5 pb-16">
        <div className="bg-[#F8FAFC] border border-[#F1F3F7] rounded-3xl p-8">
          <h3 className="font-[Poppins] font-black text-[1.05rem] text-[#1A1D2B] mb-4">Tips for Finding Cheaper Flights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              ['Book 6–8 weeks ahead', 'The sweet spot for short-haul. Long-haul is best 3–6 months out.'],
              ['Fly mid-week', 'Tuesday & Wednesday departures are consistently cheaper than weekends.'],
              ['Compare nearby airports', 'LTN/STN can be £50–£200 cheaper than LHR for the same route.'],
              ['Use flexible dates', 'A ±3 day window can reveal huge price drops on every provider.'],
            ].map(([title, body]) => (
              <div key={title} className="flex gap-3">
                <div className="w-1.5 flex-shrink-0 rounded-full bg-gradient-to-b from-[#0066FF] to-[#4F46E5] self-stretch" />
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

export default function FlightsPage() {
  return <FlightsContent />;
}
