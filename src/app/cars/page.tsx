'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import DateRangePicker from '@/components/DateRangePicker';
import { redirectUrl } from '@/lib/redirect';

/* ═══════════════════════════════════════════════════════════════════════════
   LOCATIONS — verified EconomyBookings airports
   Each entry has a numeric `plc` ID extracted from EB's own city pages.
   These IDs are required to land on a fully pre-filled results page —
   never ship a location without one (affiliate review will fail otherwise).
   ═══════════════════════════════════════════════════════════════════════════ */

type CarLocation = { name: string; plc: number; iata: string };

const LOCATIONS: CarLocation[] = [
  // United Kingdom
  { name: 'London Heathrow Airport (LHR)',      plc: 272703, iata: 'LHR' },
  { name: 'London Gatwick Airport (LGW)',       plc: 272699, iata: 'LGW' },
  { name: 'London Stansted Airport (STN)',      plc: 272717, iata: 'STN' },
  { name: 'London Luton Airport (LTN)',         plc: 4150,   iata: 'LTN' },
  { name: 'London City Airport (LCY)',          plc: 272694, iata: 'LCY' },
  { name: 'London Southend Airport (SEN)',      plc: 38478,  iata: 'SEN' },
  { name: 'Manchester Airport (MAN)',           plc: 4050,   iata: 'MAN' },
  { name: 'Birmingham Airport (BHX)',           plc: 4069,   iata: 'BHX' },
  { name: 'Edinburgh Airport (EDI)',            plc: 3993,   iata: 'EDI' },
  { name: 'Glasgow Airport (GLA)',              plc: 4113,   iata: 'GLA' },
  { name: 'Bristol Airport (BRS)',              plc: 3982,   iata: 'BRS' },
  { name: 'Leeds Bradford Airport (LBA)',       plc: 4139,   iata: 'LBA' },
  { name: 'Liverpool Airport (LPL)',            plc: 4145,   iata: 'LPL' },
  { name: 'Newcastle Airport (NCL)',            plc: 4158,   iata: 'NCL' },
  { name: 'East Midlands Airport (EMA)',        plc: 89503,  iata: 'EMA' },
  { name: 'Belfast Airport (BFS)',              plc: 3979,   iata: 'BFS' },
  { name: 'Aberdeen Airport (ABZ)',             plc: 4057,   iata: 'ABZ' },
  { name: 'Southampton Airport (SOU)',          plc: 4190,   iata: 'SOU' },
  { name: 'Cardiff Airport (CWL)',              plc: 3988,   iata: 'CWL' },
  { name: 'Bournemouth Airport (BOH)',          plc: 4077,   iata: 'BOH' },
  // Spain & Portugal
  { name: 'Barcelona Airport (BCN)',            plc: 3317,   iata: 'BCN' },
  { name: 'Madrid Airport (MAD)',               plc: 3356,   iata: 'MAD' },
  { name: 'Malaga Airport (AGP)',               plc: 3376,   iata: 'AGP' },
  { name: 'Alicante Airport (ALC)',             plc: 3312,   iata: 'ALC' },
  { name: 'Palma Mallorca Airport (PMI)',       plc: 4393,   iata: 'PMI' },
  { name: 'Tenerife South Airport (TFS)',       plc: 208938, iata: 'TFS' },
  { name: 'Tenerife North Airport (TFN)',       plc: 208937, iata: 'TFN' },
  { name: 'Lanzarote Airport (ACE)',            plc: 4425,   iata: 'ACE' },
  { name: 'Fuerteventura Airport (FUE)',        plc: 4405,   iata: 'FUE' },
  { name: 'Gran Canaria Airport (LPA)',         plc: 4415,   iata: 'LPA' },
  { name: 'Ibiza Airport (IBZ)',                plc: 4381,   iata: 'IBZ' },
  { name: 'Seville Airport (SVQ)',              plc: 3403,   iata: 'SVQ' },
  { name: 'Faro Airport (FAO)',                 plc: 2971,   iata: 'FAO' },
  { name: 'Lisbon Airport (LIS)',               plc: 222945, iata: 'LIS' },
  // France
  { name: 'Paris Charles de Gaulle Airport (CDG)', plc: 780,    iata: 'CDG' },
  { name: 'Paris Orly Airport (ORY)',           plc: 112647, iata: 'ORY' },
  { name: 'Nice Airport (NCE)',                 plc: 758,    iata: 'NCE' },
  { name: 'Lyon Airport (LYS)',                 plc: 724,    iata: 'LYS' },
  { name: 'Marseille Airport (MRS)',            plc: 726,    iata: 'MRS' },
  // Italy
  { name: 'Rome Fiumicino Airport (FCO)',       plc: 2151,   iata: 'FCO' },
  { name: 'Milan Malpensa Airport (MXP)',       plc: 2042,   iata: 'MXP' },
  { name: 'Venice Airport (VCE)',               plc: 10236,  iata: 'VCE' },
  { name: 'Florence Airport (FLR)',             plc: 2348,   iata: 'FLR' },
  { name: 'Naples Airport (NAP)',               plc: 2087,   iata: 'NAP' },
  // Netherlands
  { name: 'Amsterdam Schiphol Airport (AMS)',   plc: 2748,   iata: 'AMS' },
  // Greece
  { name: 'Athens Airport (ATH)',               plc: 1519,   iata: 'ATH' },
  { name: 'Heraklion Crete Airport (HER)',      plc: 4338,   iata: 'HER' },
  { name: 'Rhodes Airport (RHO)',               plc: 1628,   iata: 'RHO' },
  { name: 'Corfu Airport (CFU)',                plc: 1548,   iata: 'CFU' },
  { name: 'Santorini Airport (JTR)',            plc: 1652,   iata: 'JTR' },
  // Croatia
  { name: 'Dubrovnik Airport (DBV)',            plc: 422,    iata: 'DBV' },
  { name: 'Split Airport (SPU)',                plc: 436,    iata: 'SPU' },
  // Turkey
  { name: 'Antalya Airport (AYT)',              plc: 211299, iata: 'AYT' },
  { name: 'Bodrum Airport (BJV)',               plc: 3833,   iata: 'BJV' },
  { name: 'Dalaman Airport (DLM)',              plc: 211304, iata: 'DLM' },
  { name: 'Istanbul Airport (IST)',             plc: 371168, iata: 'IST' },
  // UAE
  { name: 'Dubai Airport (DXB)',                plc: 256206, iata: 'DXB' },
  { name: 'Abu Dhabi Airport (AUH)',            plc: 3928,   iata: 'AUH' },
  // Morocco & Egypt
  { name: 'Marrakech Airport (RAK)',            plc: 2713,   iata: 'RAK' },
  { name: 'Cairo Airport (CAI)',                plc: 255838, iata: 'CAI' },
  // Americas
  { name: 'New York JFK Airport (JFK)',         plc: 4801,   iata: 'JFK' },
  { name: 'Los Angeles Airport (LAX)',          plc: 4502,   iata: 'LAX' },
  { name: 'Miami Airport (MIA)',                plc: 4564,   iata: 'MIA' },
  { name: 'San Francisco Airport (SFO)',        plc: 4518,   iata: 'SFO' },
  { name: 'Las Vegas Airport (LAS)',            plc: 4758,   iata: 'LAS' },
  { name: 'Orlando Airport (MCO)',              plc: 4575,   iata: 'MCO' },
  { name: 'Cancun Airport (CUN)',               plc: 10868,  iata: 'CUN' },
  { name: 'Toronto Airport (YYZ)',              plc: 4303,   iata: 'YYZ' },
  { name: 'Vancouver Airport (YVR)',            plc: 4309,   iata: 'YVR' },
  // Asia
  { name: 'Bangkok Airport (BKK)',              plc: 3779,   iata: 'BKK' },
  { name: 'Singapore Changi Airport (SIN)',     plc: 15201,  iata: 'SIN' },
  { name: 'Tokyo Narita Airport (NRT)',         plc: 15816,  iata: 'NRT' },
  { name: 'Bali Airport (DPS)',                 plc: 226090, iata: 'DPS' },
  { name: 'Phuket Airport (HKT)',               plc: 3795,   iata: 'HKT' },
  { name: 'Kuala Lumpur Airport (KUL)',         plc: 14950,  iata: 'KUL' },
  { name: 'Seoul Incheon Airport (ICN)',        plc: 278108, iata: 'ICN' },
  // Australia
  { name: 'Sydney Airport (SYD)',               plc: 10489,  iata: 'SYD' },
  { name: 'Melbourne Airport (MEL)',            plc: 44,     iata: 'MEL' },
  // Africa
  { name: 'Cape Town Airport (CPT)',            plc: 5442,   iata: 'CPT' },
  { name: 'Johannesburg Airport (JNB)',         plc: 256209, iata: 'JNB' },
  // Caucasus & Central Asia
  { name: 'Baku Airport (GYD)',                 plc: 12849,  iata: 'GYD' },
  { name: 'Yerevan Airport (EVN)',              plc: 211571, iata: 'EVN' },
  { name: 'Tbilisi Airport (TBS)',              plc: 5267,   iata: 'TBS' },
  { name: 'Ashgabat Airport (ASB)',             plc: 356225, iata: 'ASB' },
  { name: 'Tashkent Airport (TAS)',             plc: 216158, iata: 'TAS' },
  { name: 'Almaty Airport (ALA)',               plc: 15048,  iata: 'ALA' },
  { name: 'Astana Airport (NQZ)',               plc: 15049,  iata: 'NQZ' },
  { name: 'Bishkek Airport (FRU)',              plc: 226064, iata: 'FRU' },
  { name: 'Dushanbe Airport (DYU)',             plc: 356243, iata: 'DYU' },
];

function findLocation(name: string): CarLocation | undefined {
  return LOCATIONS.find(l => l.name === name);
}

/* ═══════════════════════════════════════════════════════════════════════════
   AFFILIATE URL BUILDER — EconomyBookings via Travelpayouts
   URL contract reverse-engineered from a real EB form submission on 2026-04-11.
   The plc IDs in LOCATIONS are EB's `mergedLocationId`, NOT the internal `id`.
   Wrapped in tp.media so the click goes through Travelpayouts attribution
   (btag=travelpayouts + tpo_uid=...-714449 are appended by tp.media itself).

   Verified end-to-end on 2026-04-11 in a real browser, both UK and Spain:
     LHR (plc=272703): lands on /en/cars/results, real cars from
       Hertz/Sixt/Europcar/Enterprise/Alamo/Dollar at £47–£54.
     BCN (plc=3317):   lands on /en/cars/results, real cars from
       Hertz/Sixt/Europcar/Enterprise/Alamo/Dollar/Thrifty/Drivalia/
       Goldcar/Record at £39–£159.
     Both show btag=travelpayouts and tpo_uid=...-714449 in the final URL.
     `cr=233` is constant — not country-specific.
   ═══════════════════════════════════════════════════════════════════════════ */

const TP_MARKER = '714449';
const TP_TRS    = '512633';
const EB_P      = '2018';
const EB_CAMP   = '10';

function buildEcoBookingsUrl(opts: {
  pickupPlc: number;
  dropoffPlc: number;
  pickupDate: string;   // YYYY-MM-DD
  dropoffDate: string;  // YYYY-MM-DD
  pickupTime: string;   // HH:MM
  dropoffTime: string;  // HH:MM
  driverAge: number;
  currency?: string;
}): string {
  const [py, pm, pd] = opts.pickupDate.split('-');
  const [dy, dm, dd] = opts.dropoffDate.split('-');
  const pt = opts.pickupTime.replace(':', '');   // "10:00" -> "1000"
  const dt = opts.dropoffTime.replace(':', '');

  const ebParams = new URLSearchParams({
    cr: '233',
    crcy: opts.currency || 'GBP',
    lang: 'en',
    age: String(opts.driverAge),
    py, pm, pd,
    dy, dm, dd,
    pt, dt,
    plc: String(opts.pickupPlc),
    dlc: String(opts.dropoffPlc),
    reload: '1',
  });
  const ebUrl = `https://www.economybookings.com/en/cars/results?${ebParams.toString()}`;

  const tpParams = new URLSearchParams({
    marker: TP_MARKER,
    trs: TP_TRS,
    p: EB_P,
    campaign_id: EB_CAMP,
    u: ebUrl,
  });
  return `https://tp.media/r?${tpParams.toString()}`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   AFFILIATE URL BUILDER — Trip.com direct affiliate (Allianceid=8023009)
   URL contract verified on 2026-04-11 against real Trip.com form submission.
   Trip.com resolves airport name, city, country, lat/lon from just the IATA
   code (`pcode`), so we only need IATA + dates + affiliate IDs.

   Verified end-to-end on 2026-04-11:
     LHR: title "London car rentals", pre-fills "London, United Kingdom",
       4 car cards, prices £12-£19/day.
     BCN: title "Barcelona car rentals", pre-fills "Barcelona, Spain",
       4 car cards, prices £7-£400, auto-resolved Josep Tarradellas airport.
     MAD: title "Madrid car rentals", pre-fills "Madrid, Spain", 4 car cards.
     Allianceid=8023009 preserved in final URL in all cases.
   ═══════════════════════════════════════════════════════════════════════════ */

const TRIP_ALLIANCE = '8023009';
const TRIP_SID      = '303363796';
const TRIP_SUB      = 'D15021113';

function buildTripComUrl(opts: {
  pickupIata: string;
  dropoffIata: string;
  pickupDate: string;   // YYYY-MM-DD
  dropoffDate: string;  // YYYY-MM-DD
  pickupTime: string;   // HH:MM
  dropoffTime: string;  // HH:MM
  currency?: string;
}): string {
  // Trip.com uses "YYYY/MM/DD HH:MM" format
  const ptime = `${opts.pickupDate.replace(/-/g, '/')} ${opts.pickupTime}`;
  const rtime = `${opts.dropoffDate.replace(/-/g, '/')} ${opts.dropoffTime}`;

  const params = new URLSearchParams({
    Allianceid: TRIP_ALLIANCE,
    SID: TRIP_SID,
    trip_sub3: TRIP_SUB,
    scountry: '109',
    locale: 'en-XX',
    curr: opts.currency || 'GBP',
    fromPage: 'Home',
    pcode: opts.pickupIata,
    ptype: '1',            // 1 = airport
    ptime,
    rcode: opts.dropoffIata,
    rtype: '1',
    rtime,
    age: '30-60',
  });
  return `https://www.trip.com/carhire/online/list?${params.toString()}`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   LOCATION PICKER — autocomplete from verified list only
   ═══════════════════════════════════════════════════════════════════════════ */

function LocationPicker({ value, onChange, placeholder }: {
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
    ? LOCATIONS.filter(l => l.name.toLowerCase().includes(q) || l.iata.toLowerCase() === q).slice(0, 8)
    : [];

  return (
    <div ref={ref} className="relative">
      <input type="text" placeholder={placeholder} value={value} autoComplete="off"
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => { if (value.length >= 1) setOpen(true); }}
        className="w-full px-4 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.9rem] font-semibold text-[#1A1D2B] outline-none focus:border-emerald-500 focus:bg-white transition-all placeholder:text-[#B0B8CC] placeholder:font-medium" />
      {open && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1.5 bg-white border border-[#E8ECF4] rounded-2xl shadow-2xl overflow-auto max-h-64">
          {results.map(l => (
            <li key={l.name} onMouseDown={() => { onChange(l.name); setOpen(false); }}
              className={`px-4 py-3 hover:bg-emerald-50 cursor-pointer transition-colors border-b border-[#F1F3F7] last:border-0 font-poppins font-semibold text-[.85rem] text-[#1A1D2B] ${value === l.name ? 'bg-emerald-50' : ''}`}>
              ✈️ {l.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   LOADING MESSAGES
   ═══════════════════════════════════════════════════════════════════════════ */

const LOADING_MSGS = [
  'Checking availability...',
  'Comparing prices...',
];

function LoadingState({ loc }: { loc: string }) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const msgTimer = setInterval(() => setMsgIdx(i => (i + 1) % LOADING_MSGS.length), 600);
    const progTimer = setInterval(() => setProgress(p => Math.min(p + 2, 95)), 50);
    return () => { clearInterval(msgTimer); clearInterval(progTimer); };
  }, []);

  return (
    <section className="max-w-[900px] mx-auto px-5 py-10">
      <div className="bg-white border border-[#E8ECF4] rounded-2xl p-8 text-center shadow-sm">
        <div className="w-full bg-[#F1F3F7] rounded-full h-2 mb-5 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-100" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-[.9rem] font-bold text-[#5C6378]">{LOADING_MSGS[msgIdx]}</span>
        </div>
        <p className="text-[.78rem] text-[#8E95A9] font-semibold">Comparing car hire in <strong className="text-[#1A1D2B]">{loc}</strong></p>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CAR CATEGORIES (display only)
   ═══════════════════════════════════════════════════════════════════════════ */

const CAR_CATEGORIES = [
  { name: 'Mini', example: 'Fiat 500, VW Up', seats: 2, bags: 1, doors: 3, fromPrice: 8, img: 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=300&h=200&fit=crop&fm=webp&q=75' },
  { name: 'Economy', example: 'Toyota Yaris, Ford Fiesta', seats: 4, bags: 1, doors: 5, fromPrice: 12, img: 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=300&h=200&fit=crop&fm=webp&q=75' },
  { name: 'Compact', example: 'VW Golf, Ford Focus', seats: 5, bags: 2, doors: 5, fromPrice: 18, img: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=300&h=200&fit=crop&fm=webp&q=75' },
  { name: 'Mid-size', example: 'Toyota Corolla, Skoda Octavia', seats: 5, bags: 3, doors: 5, fromPrice: 24, img: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0afa?w=300&h=200&fit=crop&fm=webp&q=75' },
  { name: 'SUV', example: 'Nissan Qashqai, Hyundai Tucson', seats: 5, bags: 3, doors: 5, fromPrice: 30, img: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=300&h=200&fit=crop&fm=webp&q=75' },
  { name: 'Premium', example: 'BMW 3 Series, Mercedes C-Class', seats: 5, bags: 3, doors: 5, fromPrice: 45, img: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=300&h=200&fit=crop&fm=webp&q=75' },
  { name: 'People Carrier', example: 'VW Touran, Ford Galaxy', seats: 7, bags: 4, doors: 5, fromPrice: 35, img: 'https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=300&h=200&fit=crop&fm=webp&q=75' },
  { name: 'Convertible', example: 'BMW 2 Series, Audi A3', seats: 4, bags: 1, doors: 2, fromPrice: 50, img: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=300&h=200&fit=crop&fm=webp&q=75' },
];

const BUDGET_OPTIONS = [
  { label: 'Any budget', max: Infinity },
  { label: 'Under £15/day', max: 15 },
  { label: 'Under £25/day', max: 25 },
  { label: 'Under £35/day', max: 35 },
  { label: 'Under £50/day', max: 50 },
];

/* ═══════════════════════════════════════════════════════════════════════════
   SUPPLIER LOGOS
   ═══════════════════════════════════════════════════════════════════════════ */

const SUPPLIER_LOGOS = [
  { name: 'Hertz', color: '#FFD700', bg: '#000' },
  { name: 'Europcar', color: '#fff', bg: '#00843D' },
  { name: 'Avis', color: '#fff', bg: '#D4002A' },
  { name: 'Budget', color: '#fff', bg: '#F26522' },
  { name: 'Enterprise', color: '#fff', bg: '#007A53' },
  { name: 'Sixt', color: '#000', bg: '#FF6600' },
  { name: 'Alamo', color: '#fff', bg: '#003087' },
  { name: 'Dollar', color: '#fff', bg: '#E31937' },
  { name: 'Thrifty', color: '#fff', bg: '#0066B3' },
  { name: 'National', color: '#fff', bg: '#006747' },
];

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER: extract city name for cross-sell links
   ═══════════════════════════════════════════════════════════════════════════ */

function extractCity(loc: string): string {
  return loc.replace(/ Airport.*$/, '').replace(/ \(.*\)$/, '').trim();
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

function CarsContent() {
  const [location, setLocation] = useState('');
  const [returnLocation, setReturnLocation] = useState('');
  const [differentReturn, setDifferentReturn] = useState(false);
  const [pickupDate, setPickupDate] = useState('');
  const [dropoffDate, setDropoffDate] = useState('');
  const [pickupTime, setPickupTime] = useState('10:00');
  const [dropoffTime, setDropoffTime] = useState('10:00');
  const [driverAge, setDriverAge] = useState('30');
  const [budget, setBudget] = useState(Infinity);
  const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc' | 'seats'>('price-asc');

  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchedLoc, setSearchedLoc] = useState('');
  const [searchedReturnLoc, setSearchedReturnLoc] = useState('');

  const resultsRef = useRef<HTMLDivElement>(null);

  // Read URL params
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const loc = p.get('location') || '';
    const ret = p.get('returnLocation') || '';
    const pickup = p.get('pickup') || '';
    const dropoff = p.get('dropoff') || '';
    const pTime = p.get('pickupTime') || '';
    const dTime = p.get('dropoffTime') || '';
    const age = p.get('age') || '';
    if (loc) setLocation(loc);
    if (ret) { setReturnLocation(ret); setDifferentReturn(true); }
    if (pickup) setPickupDate(pickup);
    if (dropoff) setDropoffDate(dropoff);
    if (pTime) setPickupTime(pTime);
    if (dTime) setDropoffTime(dTime);
    if (age) setDriverAge(age);
  }, []);

  const today = new Date().toISOString().split('T')[0];

  const days = pickupDate && dropoffDate
    ? Math.max(1, Math.round((new Date(dropoffDate).getTime() - new Date(pickupDate).getTime()) / 86400000))
    : null;

  const handleSearch = useCallback(() => {
    if (!location) { alert('Please choose a pickup airport from the list'); return; }
    if (!findLocation(location)) {
      alert('Please pick a location from the dropdown — only listed airports are supported.');
      return;
    }
    if (!pickupDate) { alert('Please select a pickup date'); return; }
    if (!dropoffDate) { alert('Please select a return date'); return; }
    if (differentReturn) {
      if (!returnLocation) { alert('Please choose a return location'); return; }
      if (!findLocation(returnLocation)) {
        alert('Please pick a return location from the dropdown — only listed airports are supported.');
        return;
      }
    }

    setSearchedLoc(location);
    setSearchedReturnLoc(differentReturn ? returnLocation : location);
    setLoading(true);
    setSearched(false);

    setTimeout(() => {
      setLoading(false);
      setSearched(true);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }, 1800);
  }, [location, pickupDate, dropoffDate, differentReturn, returnLocation]);

  // Auto-search when URL params fill all required fields
  const autoSearched = useRef(false);
  useEffect(() => {
    if (!autoSearched.current && location && pickupDate && dropoffDate && findLocation(location)) {
      autoSearched.current = true;
      handleSearch();
    }
  }, [location, pickupDate, dropoffDate, handleSearch]);

  const city = extractCity(searchedLoc);

  const filteredCars = CAR_CATEGORIES
    .filter(c => c.fromPrice <= budget)
    .sort((a, b) => {
      if (sortBy === 'price-asc') return a.fromPrice - b.fromPrice;
      if (sortBy === 'price-desc') return b.fromPrice - a.fromPrice;
      return b.seats - a.seats;
    });

  // Build the affiliate URLs once per render so every CTA shares the same link.
  const pickupLoc = findLocation(searchedLoc);
  const dropoffLoc = findLocation(searchedReturnLoc) || pickupLoc;

  const ebUrl = pickupLoc && dropoffLoc ? buildEcoBookingsUrl({
    pickupPlc: pickupLoc.plc,
    dropoffPlc: dropoffLoc.plc,
    pickupDate,
    dropoffDate,
    pickupTime,
    dropoffTime,
    driverAge: Number(driverAge) || 30,
    currency: 'GBP',
  }) : null;

  const tripUrl = pickupLoc && dropoffLoc ? buildTripComUrl({
    pickupIata: pickupLoc.iata,
    dropoffIata: dropoffLoc.iata,
    pickupDate,
    dropoffDate,
    pickupTime,
    dropoffTime,
    currency: 'GBP',
  }) : null;

  const ebHref = ebUrl ? redirectUrl(ebUrl, 'EconomyBookings', city, 'cars') : '#';
  const tripHref = tripUrl ? redirectUrl(tripUrl, 'Trip.com', city, 'cars') : '#';

  return (
    <>
      <Header />

      {/* ── Hero + Search Form ── Cars identity: "night drive" slate charcoal with emerald/electric headlights */}
      <section
        className="relative pt-36 pb-16 px-5 min-h-[600px] md:min-h-[700px]"
        style={{ background: 'linear-gradient(160deg, #0a0e1a 0%, #141a2c 50%, #06090f 100%)' }}
      >
        {/* Ambient decoration — clipped to hero so it doesn't bleed, but lets popups overflow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Ambient emerald + electric blue blobs */}
        <div className="absolute top-20 left-[10%] w-72 h-72 rounded-full bg-emerald-500/[.18] blur-3xl pointer-events-none animate-blob-drift-a" />
        <div className="absolute bottom-10 right-[5%] w-80 h-80 rounded-full bg-teal-500/[.14] blur-3xl pointer-events-none animate-blob-drift-b" />
        <div className="absolute top-1/3 left-[42%] w-56 h-56 rounded-full bg-cyan-400/[.12] blur-3xl pointer-events-none animate-blob-drift-c" />
        <div className="absolute top-1/2 right-[20%] w-40 h-40 rounded-full bg-emerald-400/[.10] blur-3xl pointer-events-none animate-blob-drift-a" />

        {/* Floating glass squares */}
        <div className="absolute top-32 right-[12%] w-48 h-48 rounded-2xl border border-emerald-300/20 bg-white/[.05] backdrop-blur-sm rotate-12 hidden md:block pointer-events-none shadow-[0_30px_60px_-25px_rgba(16,185,129,0.4)] animate-float-slow" />
        <div className="absolute bottom-20 left-[7%] w-36 h-36 rounded-2xl border border-teal-300/20 bg-white/[.05] backdrop-blur-sm -rotate-6 hidden md:block pointer-events-none shadow-[0_30px_60px_-25px_rgba(20,184,166,0.35)] animate-float-slow-reverse" />
        <div className="absolute top-[60%] right-[6%] w-20 h-20 rounded-xl border border-cyan-300/20 bg-white/[.05] backdrop-blur-sm rotate-[18deg] hidden lg:block pointer-events-none animate-float-slow-reverse" />
        <div className="absolute top-[24%] left-[6%] w-16 h-16 rounded-xl border border-emerald-300/25 bg-white/[.05] backdrop-blur-sm -rotate-12 hidden lg:block pointer-events-none animate-float-slow" />

        {/* Sparkle dots — like passing taillights */}
        <div className="absolute top-[28%] left-[28%] w-1.5 h-1.5 rounded-full bg-emerald-300/90 shadow-[0_0_12px_4px_rgba(110,231,183,0.6)] pointer-events-none animate-twinkle" />
        <div className="absolute top-[55%] right-[32%] w-1 h-1 rounded-full bg-teal-300/90 shadow-[0_0_10px_3px_rgba(94,234,212,0.6)] pointer-events-none animate-twinkle-delay" />
        <div className="absolute top-[40%] right-[18%] w-1 h-1 rounded-full bg-cyan-300/90 shadow-[0_0_10px_3px_rgba(103,232,249,0.5)] pointer-events-none animate-twinkle" />
        <div className="absolute bottom-[20%] left-[35%] w-1.5 h-1.5 rounded-full bg-emerald-200/90 shadow-[0_0_12px_4px_rgba(167,243,208,0.55)] pointer-events-none animate-twinkle-delay" />
        </div>

        <div className="max-w-[860px] mx-auto text-center mb-10 relative z-[1]">
          <span className="inline-flex items-center gap-1.5 backdrop-blur-md bg-gradient-to-r from-emerald-500/15 to-teal-500/15 border border-emerald-300/30 text-emerald-300 text-[.65rem] font-black uppercase tracking-[2.5px] px-3.5 py-1.5 rounded-full mb-4 shadow-[0_4px_20px_rgba(16,185,129,0.25)]"><span className="text-base leading-none">🚗</span> Car Rental Comparison</span>
          <h1 className="font-poppins text-[2.6rem] md:text-[3.8rem] font-black text-white leading-[1.05] tracking-tight mb-3">
            Hire a Car <em className="italic bg-gradient-to-br from-emerald-300 via-teal-400 to-cyan-400 bg-clip-text text-transparent">Anywhere</em>
          </h1>
          <p className="text-[1rem] text-white/60 font-semibold max-w-[520px] mx-auto">Compare trusted car rental providers — real prices, no hidden fees.</p>
        </div>

        <div className="max-w-[860px] mx-auto bg-white border border-white/20 rounded-3xl p-6 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.6),0_8px_24px_-8px_rgba(16,185,129,0.3),0_0_0_1px_rgba(110,231,183,0.08)] relative z-[1]">

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
          {/* Pickup location */}
          <div className="mb-3">
            <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5 text-center">Pickup Location</label>
            <LocationPicker value={location} onChange={setLocation} placeholder="Airport — e.g. Barcelona Airport (BCN)" />
          </div>

          {/* Different return toggle */}
          <div className="mb-3">
            <label className="flex items-center gap-2 cursor-pointer mb-2 justify-center">
              <input type="checkbox" checked={differentReturn} onChange={e => setDifferentReturn(e.target.checked)}
                className="w-4 h-4 rounded border-[#E8ECF4] text-emerald-500 focus:ring-emerald-500 accent-emerald-500" />
              <span className="text-[.75rem] font-bold text-[#5C6378]">Return to a different location</span>
            </label>
            {differentReturn && (
              <div>
                <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5 text-center">Return Location</label>
                <LocationPicker value={returnLocation} onChange={setReturnLocation} placeholder="Where are you dropping off?" />
              </div>
            )}
          </div>

          {/* Calendar (shared range picker) + times + driver age */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5 text-center">Calendar</label>
              <DateRangePicker
                start={pickupDate}
                end={dropoffDate}
                minDate={today}
                accent="emerald"
                startWord="pickup"
                endWord="return"
                onChange={({ start: s, end: e }) => { setPickupDate(s); setDropoffDate(e); }}
              />
            </div>
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5 text-center">Driver Age</label>
              <input type="number" min={18} max={99} value={driverAge} onChange={e => setDriverAge(e.target.value)}
                className="w-full px-3 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.82rem] font-semibold text-[#1A1D2B] outline-none focus:border-emerald-500 focus:bg-white transition-all" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5 text-center">Pickup Time</label>
              <input type="time" value={pickupTime} onChange={e => setPickupTime(e.target.value)}
                className="w-full px-3 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.82rem] font-semibold text-[#1A1D2B] outline-none focus:border-emerald-500 focus:bg-white transition-all" />
            </div>
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5 text-center">Return Time</label>
              <input type="time" value={dropoffTime} onChange={e => setDropoffTime(e.target.value)}
                className="w-full px-3 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.82rem] font-semibold text-[#1A1D2B] outline-none focus:border-emerald-500 focus:bg-white transition-all" />
            </div>
          </div>

          {/* Budget filter */}
          <div className="mb-4">
            <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Daily Budget</label>
            <div className="flex flex-wrap gap-1.5">
              {BUDGET_OPTIONS.map(opt => (
                <button key={opt.label} type="button" onClick={() => setBudget(opt.max)}
                  className={`px-3 py-1.5 rounded-lg text-[.72rem] font-bold transition-all ${budget === opt.max ? 'bg-emerald-500 text-white shadow-sm' : 'bg-[#F1F3F7] text-[#5C6378] hover:bg-emerald-50'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleSearch}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-poppins font-black text-[.95rem] py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(16,185,129,0.3)]">
            Search Car Rentals →
          </button>
          <p className="text-center text-[.68rem] text-[#8E95A9] font-semibold mt-2.5">Pick from {LOCATIONS.length} verified airports · Compare real live prices on EconomyBookings & Trip.com</p>
        </div>
      </section>

      {/* ── Loading ── */}
      {loading && <LoadingState loc={location} />}

      {/* ── Results ── */}
      {searched && ebUrl && (
        <div ref={resultsRef}>
          {/* Search summary */}
          <section className="max-w-[1000px] mx-auto px-5 pt-8 pb-4">
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl px-6 py-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="font-poppins font-black text-[1.15rem] text-[#1A1D2B]">
                  Car hire in {city} — {pickupDate} to {dropoffDate}{days ? ` (${days} day${days !== 1 ? 's' : ''})` : ''}
                </h2>
                <p className="text-[.75rem] text-[#5C6378] font-semibold mt-1">{filteredCars.length} car types · Live prices on EconomyBookings & Trip.com</p>
              </div>
              <select value={sortBy} onChange={e => setSortBy(e.target.value as 'price-asc' | 'price-desc' | 'seats')}
                className="px-3 py-2 rounded-lg border border-[#E8ECF4] bg-white text-[.78rem] font-semibold text-[#1A1D2B] outline-none focus:border-emerald-500">
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="seats">Most Seats</option>
              </select>
            </div>
          </section>

          {/* Primary CTAs — two providers side by side */}
          <section className="max-w-[1000px] mx-auto px-5 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <a href={ebHref} target="_blank" rel="noopener sponsored"
                className="block bg-gradient-to-br from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-2xl p-5 shadow-[0_8px_30px_rgba(16,185,129,0.25)] transition-all">
                <div className="text-[.6rem] font-black uppercase tracking-[2px] opacity-80 mb-1">Live results · Provider 1</div>
                <div className="font-poppins font-black text-[1.05rem]">EconomyBookings →</div>
                <div className="text-[.72rem] font-semibold opacity-90 mt-0.5">Hertz · Europcar · Avis · Sixt · Enterprise</div>
                <div className="inline-block text-[.62rem] font-bold bg-white/20 px-2.5 py-1 rounded-md mt-2">Free cancellation</div>
              </a>
              <a href={tripHref} target="_blank" rel="noopener sponsored"
                className="block bg-gradient-to-br from-[#1A1D2B] to-[#0F1119] hover:from-[#0F1119] hover:to-black text-white rounded-2xl p-5 shadow-[0_8px_30px_rgba(15,17,25,0.25)] transition-all">
                <div className="text-[.6rem] font-black uppercase tracking-[2px] opacity-80 mb-1">Live results · Provider 2</div>
                <div className="font-poppins font-black text-[1.05rem]">Trip.com →</div>
                <div className="text-[.72rem] font-semibold opacity-90 mt-0.5">Compare rates from global suppliers</div>
                <div className="inline-block text-[.62rem] font-bold bg-white/20 px-2.5 py-1 rounded-md mt-2">Pay at pickup option</div>
              </a>
            </div>
          </section>

          {/* Supplier banner */}
          <section className="max-w-[1000px] mx-auto px-5 pb-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-[.65rem] font-bold text-[#8E95A9] uppercase tracking-wider whitespace-nowrap mr-1">Suppliers include:</span>
              {SUPPLIER_LOGOS.map(s => (
                <span key={s.name} className="flex-shrink-0 px-2.5 py-1 rounded-md text-[.62rem] font-black uppercase tracking-wide"
                  style={{ backgroundColor: s.bg, color: s.color }}>
                  {s.name}
                </span>
              ))}
            </div>
          </section>

          {/* Car category cards */}
          <section className="max-w-[1000px] mx-auto px-5 pb-6">
            <div className="space-y-3">
              {filteredCars.length > 0 ? filteredCars.map((car) => {
                const totalEst = days ? car.fromPrice * days : car.fromPrice;
                return (
                  <div key={car.name} className="bg-white border border-[#E8ECF4] rounded-2xl overflow-hidden hover:shadow-md transition-all">
                    <div className="grid grid-cols-1 md:grid-cols-[220px_1fr_auto] gap-0">
                      {/* Car image */}
                      <div className="relative h-44 md:h-full min-h-[160px] bg-gradient-to-br from-gray-50 to-gray-100">
                        <img src={car.img} alt={car.name} loading="lazy"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const el = e.target as HTMLImageElement;
                            el.style.display = 'none';
                            el.parentElement!.innerHTML = '<div class="flex items-center justify-center h-full"><span class="text-4xl">🚗</span></div>';
                          }} />
                        <span className="absolute top-3 left-3 text-[.6rem] font-black uppercase tracking-[1px] bg-emerald-500 text-white px-2.5 py-1 rounded-full">{car.name}</span>
                      </div>

                      {/* Car info */}
                      <div className="p-5 flex flex-col justify-center">
                        <h3 className="font-poppins font-black text-[1.1rem] text-[#1A1D2B] mb-0.5">{car.name}</h3>
                        <p className="text-[.78rem] text-[#8E95A9] font-semibold mb-3">{car.example}</p>
                        <div className="flex flex-wrap gap-3 mb-3">
                          <span className="flex items-center gap-1 text-[.72rem] font-semibold text-[#5C6378]">
                            <i className="fa-solid fa-user text-[.65rem] text-emerald-500" /> {car.seats} seats
                          </span>
                          <span className="flex items-center gap-1 text-[.72rem] font-semibold text-[#5C6378]">
                            <i className="fa-solid fa-suitcase text-[.65rem] text-emerald-500" /> {car.bags} bag{car.bags !== 1 ? 's' : ''}
                          </span>
                          <span className="flex items-center gap-1 text-[.72rem] font-semibold text-[#5C6378]">
                            <i className="fa-solid fa-door-open text-[.65rem] text-emerald-500" /> {car.doors} doors
                          </span>
                          <span className="flex items-center gap-1 text-[.72rem] font-semibold text-[#5C6378]">
                            <i className="fa-solid fa-snowflake text-[.65rem] text-emerald-500" /> A/C
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="text-[.66rem] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">Free cancellation</span>
                          <span className="text-[.66rem] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">Pay now or later</span>
                        </div>
                      </div>

                      {/* Price + book CTA */}
                      <div className="p-5 flex flex-col items-end justify-center gap-3 border-t md:border-t-0 md:border-l border-[#F1F3F7] min-w-[200px]">
                        <div className="text-right">
                          <div className="text-[.65rem] text-[#8E95A9] font-semibold">estimated from</div>
                          <div className="font-poppins font-black text-[1.6rem] text-[#1A1D2B] leading-none">£{car.fromPrice}<span className="text-[.7rem] font-semibold text-[#8E95A9]">/day</span></div>
                          {days && days > 1 && (
                            <div className="text-[.68rem] text-[#8E95A9] font-semibold mt-0.5">~£{totalEst} total for {days} day{days !== 1 ? 's' : ''}</div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1.5 w-full md:w-auto">
                          <a href={ebHref} target="_blank" rel="noopener sponsored"
                            className="text-center text-[.72rem] font-black text-white bg-emerald-500 hover:bg-emerald-600 px-4 py-2 rounded-lg transition-colors whitespace-nowrap">
                            EconomyBookings →
                          </a>
                          <a href={tripHref} target="_blank" rel="noopener sponsored"
                            className="text-center text-[.72rem] font-black text-white bg-[#1A1D2B] hover:bg-[#0F1119] px-4 py-2 rounded-lg transition-colors whitespace-nowrap">
                            Trip.com →
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
                  <p className="text-[.85rem] font-bold text-amber-800 mb-2">No cars match your budget filter</p>
                  <button type="button" onClick={() => setBudget(Infinity)} className="text-[.78rem] font-bold text-emerald-600 hover:underline">Clear budget filter</button>
                </div>
              )}
            </div>
          </section>

          {/* Bottom CTA repeat — both providers */}
          <section className="max-w-[1000px] mx-auto px-5 pb-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <a href={ebHref} target="_blank" rel="noopener sponsored"
                className="block text-center bg-emerald-500 hover:bg-emerald-600 text-white font-poppins font-black text-[.9rem] py-4 rounded-xl transition-colors">
                Book on EconomyBookings →
              </a>
              <a href={tripHref} target="_blank" rel="noopener sponsored"
                className="block text-center bg-[#1A1D2B] hover:bg-[#0F1119] text-white font-poppins font-black text-[.9rem] py-4 rounded-xl transition-colors">
                Book on Trip.com →
              </a>
            </div>
          </section>

        </div>
      )}

      {/* ── Tips section (always visible) ── */}
      <section className="max-w-[860px] mx-auto px-5 pb-16">
        <div className="bg-[#F8FAFC] border border-[#F1F3F7] rounded-3xl p-8">
          <h3 className="font-poppins font-black text-[1.05rem] text-[#1A1D2B] mb-4">Tips for Cheaper Car Rentals</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              ['Book early, pick up off-airport', 'Off-airport depots are 20-40% cheaper. Take a taxi from arrivals — still worth it.'],
              ['Always take full-to-full fuel', 'Return with a full tank — "full-to-empty" deals sound cheap but rarely are.'],
              ['Decline excess waiver at the desk', 'Buy third-party excess insurance for ~£3/day instead of £15-25/day at the counter.'],
              ['Under 25? Compare specialist sites', 'Specialist car hire sites often have younger driver surcharges that are 30-50% lower than international chains.'],
            ].map(([title, body]) => (
              <div key={title} className="flex gap-3">
                <div className="w-1.5 flex-shrink-0 rounded-full bg-gradient-to-b from-emerald-500 to-teal-500 self-stretch" />
                <div>
                  <div className="font-poppins font-bold text-[.85rem] text-[#1A1D2B] mb-0.5">{title}</div>
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

export default function CarsPage() {
  return <CarsContent />;
}
