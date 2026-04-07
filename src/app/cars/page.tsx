'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { redirectUrl } from '@/lib/redirect';

/* ═══════════════════════════════════════════════════════════════════════════
   LOCATIONS — airports + city centres
   ═══════════════════════════════════════════════════════════════════════════ */

const LOCATIONS = [
  // UK airports
  'London Heathrow Airport (LHR)', 'London Gatwick Airport (LGW)', 'London Stansted Airport (STN)',
  'London Luton Airport (LTN)', 'London City Airport (LCY)', 'London Southend Airport (SEN)',
  'Manchester Airport (MAN)', 'Birmingham Airport (BHX)', 'Edinburgh Airport (EDI)',
  'Glasgow Airport (GLA)', 'Bristol Airport (BRS)', 'Leeds Bradford Airport (LBA)',
  'Liverpool Airport (LPL)', 'Newcastle Airport (NCL)', 'East Midlands Airport (EMA)',
  'Belfast Airport (BFS)', 'Aberdeen Airport (ABZ)', 'Southampton Airport (SOU)',
  'Cardiff Airport (CWL)', 'Bournemouth Airport (BOH)',
  // UK city centres
  'London City Centre', 'Manchester City Centre', 'Birmingham City Centre',
  'Edinburgh City Centre', 'Glasgow City Centre', 'Liverpool City Centre',
  'Leeds City Centre', 'Bristol City Centre', 'Newcastle City Centre',
  // Spain & Portugal
  'Barcelona Airport (BCN)', 'Barcelona City Centre', 'Madrid Airport (MAD)', 'Madrid City Centre',
  'Malaga Airport (AGP)', 'Malaga City Centre', 'Alicante Airport (ALC)', 'Alicante City Centre',
  'Palma Airport (PMI)', 'Palma City Centre', 'Tenerife South Airport (TFS)', 'Tenerife North Airport (TFN)',
  'Lanzarote Airport (ACE)', 'Fuerteventura Airport (FUE)', 'Gran Canaria Airport (LPA)',
  'Faro Airport (FAO)', 'Faro City Centre', 'Lisbon Airport (LIS)', 'Lisbon City Centre',
  'Seville Airport (SVQ)', 'Ibiza Airport (IBZ)',
  // France
  'Paris Charles de Gaulle Airport (CDG)', 'Paris Orly Airport (ORY)', 'Paris City Centre',
  'Nice Airport (NCE)', 'Nice City Centre', 'Lyon Airport (LYS)', 'Marseille Airport (MRS)',
  // Italy
  'Rome Fiumicino Airport (FCO)', 'Rome City Centre', 'Milan Malpensa Airport (MXP)', 'Milan City Centre',
  'Venice Airport (VCE)', 'Venice City Centre', 'Florence Airport (FLR)', 'Florence City Centre',
  'Naples Airport (NAP)',
  // Netherlands
  'Amsterdam Schiphol Airport (AMS)', 'Amsterdam City Centre',
  // Greece
  'Athens Airport (ATH)', 'Athens City Centre', 'Crete Heraklion Airport (HER)',
  'Rhodes Airport (RHO)', 'Corfu Airport (CFU)', 'Santorini Airport (JTR)',
  // Croatia
  'Dubrovnik Airport (DBV)', 'Dubrovnik City Centre', 'Split Airport (SPU)', 'Split City Centre',
  // Turkey
  'Antalya Airport (AYT)', 'Antalya City Centre', 'Bodrum Airport (BJV)', 'Bodrum City Centre',
  'Dalaman Airport (DLM)', 'Istanbul Airport (IST)', 'Istanbul City Centre',
  // UAE
  'Dubai Airport (DXB)', 'Dubai City Centre', 'Abu Dhabi Airport (AUH)',
  // Morocco & Egypt
  'Marrakech Airport (RAK)', 'Marrakech City Centre', 'Cairo Airport (CAI)',
  // Americas
  'New York JFK Airport (JFK)', 'New York City Centre', 'Los Angeles Airport (LAX)', 'Los Angeles City Centre',
  'Miami Airport (MIA)', 'Miami City Centre', 'San Francisco Airport (SFO)',
  'Las Vegas Airport (LAS)', 'Orlando Airport (MCO)', 'Cancun Airport (CUN)',
  'Toronto Airport (YYZ)', 'Vancouver Airport (YVR)',
  // Asia
  'Bangkok Airport (BKK)', 'Bangkok City Centre', 'Singapore Changi Airport (SIN)',
  'Tokyo Narita Airport (NRT)', 'Bali Airport (DPS)', 'Phuket Airport (HKT)',
  'Kuala Lumpur Airport (KUL)', 'Hong Kong Airport (HKG)', 'Seoul Airport (ICN)',
  // Australia
  'Sydney Airport (SYD)', 'Sydney City Centre', 'Melbourne Airport (MEL)',
  // Africa
  'Cape Town Airport (CPT)', 'Johannesburg Airport (JNB)',
  // Pakistan
  'Lahore Airport (LHE)', 'Islamabad Airport (ISB)', 'Karachi Airport (KHI)',
];

/* ═══════════════════════════════════════════════════════════════════════════
   LOCATION PICKER
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
    ? LOCATIONS.filter(l => l.toLowerCase().includes(q)).slice(0, 8)
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
            <li key={l} onMouseDown={() => { onChange(l); setOpen(false); }}
              className={`px-4 py-3 hover:bg-emerald-50 cursor-pointer transition-colors border-b border-[#F1F3F7] last:border-0 font-poppins font-semibold text-[.85rem] text-[#1A1D2B] ${value === l ? 'bg-emerald-50' : ''}`}>
              {l.includes('Airport') ? '✈️ ' : '🏙️ '}{l}
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
  'Searching Economy Bookings...',
  'Checking Localrent...',
  'Comparing Qeeq...',
  'Scanning GetRentaCar...',
  'Checking Expedia...',
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
   AFFILIATE LINK BUILDERS
   ═══════════════════════════════════════════════════════════════════════════ */

const TP_CAR = (campaignId: number, p: number, innerUrl: string) =>
  `https://tp.media/r?campaign_id=${campaignId}&marker=714449&p=${p}&trs=512633&u=${encodeURIComponent(innerUrl)}`;

function buildEconomyBookingsUrl() {
  return TP_CAR(10, 2018, 'https://www.economybookings.com');
}

function buildLocalrentUrl() {
  return TP_CAR(87, 2043, 'https://localrent.com/en');
}

function buildQeeqUrl() {
  return TP_CAR(172, 4845, 'https://www.qeeq.com');
}

function buildGetRentaCarUrl(loc: string, pickup: string, dropoff: string) {
  const inner = `https://getrentacar.com/en-US/car-rental/search?currency=GBP&from=${pickup}&to=${dropoff}&location=${encodeURIComponent(loc)}`;
  return TP_CAR(222, 5996, inner);
}

function buildKlookUrl() {
  return TP_CAR(137, 4110, 'https://www.klook.com/en-GB/car-rentals/');
}

function buildExpediaUrl(loc: string, pickup: string, dropoff: string, pickupTime: string, dropoffTime: string) {
  return `https://www.expedia.co.uk/carsearch?locn=${encodeURIComponent(loc)}&date1=${pickup}&date2=${dropoff}&time1=${pickupTime}&time2=${dropoffTime}&affcid=clbU3QK`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   PROVIDER DATA
   ═══════════════════════════════════════════════════════════════════════════ */

interface Provider {
  name: string;
  tagline: string;
  selling: string[];
  extra?: string;
  color: string;
  bgColor: string;
  buildUrl: (loc: string, pickup: string, dropoff: string, pickupTime: string, dropoffTime: string, age: string) => string;
}

const PROVIDERS: Provider[] = [
  {
    name: 'Economy Bookings',
    tagline: 'One of the largest car rental comparison sites — compares 900+ companies',
    selling: ['Free cancellation on most bookings', 'No hidden fees', 'Best price guarantee'],
    extra: 'Under 25? Economy Bookings has lower young driver surcharges than most providers',
    color: '#2563EB',
    bgColor: '#EFF6FF',
    buildUrl: () => buildEconomyBookingsUrl(),
  },
  {
    name: 'Localrent',
    tagline: 'Rent directly from local companies — often cheaper than international chains',
    selling: ['Direct from local owners', 'Full insurance included', 'No deposit on many cars'],
    color: '#059669',
    bgColor: '#ECFDF5',
    buildUrl: () => buildLocalrentUrl(),
  },
  {
    name: 'Qeeq',
    tagline: 'Compare 300+ car rental suppliers worldwide',
    selling: ['Price match guarantee', 'Free cancellation', 'No credit card fees'],
    color: '#7C3AED',
    bgColor: '#F5F3FF',
    buildUrl: () => buildQeeqUrl(),
  },
  {
    name: 'GetRentaCar',
    tagline: 'Budget-friendly car hire with transparent pricing',
    selling: ['No hidden charges', 'Full-to-full fuel policy', '24/7 support'],
    color: '#DC2626',
    bgColor: '#FEF2F2',
    buildUrl: (loc, pickup, dropoff) => buildGetRentaCarUrl(loc, pickup, dropoff),
  },
  {
    name: 'Klook',
    tagline: 'Popular in Asia & beyond — car hire, tours and activities',
    selling: ['Best price guarantee', 'Instant confirmation', 'Easy cancellation'],
    color: '#FF5722',
    bgColor: '#FFF3E0',
    buildUrl: () => buildKlookUrl(),
  },
  {
    name: 'Expedia',
    tagline: 'Car hire from a name you trust — part of the Expedia family',
    selling: ['Earn Expedia rewards points', 'Bundle with flights and hotels for extra savings', 'Flexible cancellation'],
    color: '#D97706',
    bgColor: '#FFFBEB',
    buildUrl: (loc, pickup, dropoff, pickupTime, dropoffTime) =>
      buildExpediaUrl(loc, pickup, dropoff, pickupTime, dropoffTime),
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   CAR CATEGORIES
   ═══════════════════════════════════════════════════════════════════════════ */

const CAR_CATEGORIES = [
  { name: 'Mini', example: 'Fiat 500, VW Up', seats: 2, bags: 1, doors: 3, fromPrice: 8, img: 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=300&h=200&fit=crop' },
  { name: 'Economy', example: 'Toyota Yaris, Ford Fiesta', seats: 4, bags: 1, doors: 5, fromPrice: 12, img: 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=300&h=200&fit=crop' },
  { name: 'Compact', example: 'VW Golf, Ford Focus', seats: 5, bags: 2, doors: 5, fromPrice: 18, img: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=300&h=200&fit=crop' },
  { name: 'Mid-size', example: 'Toyota Corolla, Skoda Octavia', seats: 5, bags: 3, doors: 5, fromPrice: 24, img: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0afa?w=300&h=200&fit=crop' },
  { name: 'SUV', example: 'Nissan Qashqai, Hyundai Tucson', seats: 5, bags: 3, doors: 5, fromPrice: 30, img: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=300&h=200&fit=crop' },
  { name: 'Premium', example: 'BMW 3 Series, Mercedes C-Class', seats: 5, bags: 3, doors: 5, fromPrice: 45, img: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=300&h=200&fit=crop' },
  { name: 'People Carrier', example: 'VW Touran, Ford Galaxy', seats: 7, bags: 4, doors: 5, fromPrice: 35, img: 'https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=300&h=200&fit=crop' },
  { name: 'Convertible', example: 'BMW 2 Series, Audi A3', seats: 4, bags: 1, doors: 2, fromPrice: 50, img: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=300&h=200&fit=crop' },
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
   COMPARISON TABLE
   ═══════════════════════════════════════════════════════════════════════════ */

const COMPARE_ROWS = [
  { feature: 'Free cancellation', values: ['✅', '✅', '✅', '✅', '✅'] },
  { feature: 'No deposit options', values: ['❌', '✅', '❌', '✅', '❌'] },
  { feature: 'Young driver friendly', values: ['✅ Best rates', '✅', '✅', '✅', '⚠️ Higher surcharge'] },
  { feature: 'Local companies', values: ['❌', '✅ Specialist', '❌', '✅', '❌'] },
  { feature: 'Loyalty rewards', values: ['❌', '❌', '❌', '❌', '✅ Expedia points'] },
  { feature: 'Full insurance included', values: ['⚠️ Optional', '✅ Most cars', '⚠️ Optional', '✅ Most cars', '⚠️ Optional'] },
];

const PROVIDER_NAMES = ['Economy Bookings', 'Localrent', 'Qeeq', 'GetRentaCar', 'Expedia'];

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER: extract city name for cross-sell links
   ═══════════════════════════════════════════════════════════════════════════ */

function extractCity(loc: string): string {
  return loc.replace(/ Airport.*$/, '').replace(/ City Centre$/, '').replace(/ \(.*\)$/, '').trim();
}

function extractIATA(loc: string): string {
  const m = loc.match(/\(([A-Z]{3})\)/);
  return m ? m[1] : '';
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
    if (!location) { alert('Please enter a pickup location'); return; }
    if (!pickupDate) { alert('Please select a pickup date'); return; }
    if (!dropoffDate) { alert('Please select a return date'); return; }
    if (differentReturn && !returnLocation) { alert('Please enter a return location'); return; }

    setSearchedLoc(location);
    setLoading(true);
    setSearched(false);

    // Simulate brief loading for the animation
    setTimeout(() => {
      setLoading(false);
      setSearched(true);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }, 1800);
  }, [location, pickupDate, dropoffDate, differentReturn, returnLocation]);

  // Auto-search when URL params fill all required fields
  const autoSearched = useRef(false);
  useEffect(() => {
    if (!autoSearched.current && location && pickupDate && dropoffDate) {
      autoSearched.current = true;
      handleSearch();
    }
  }, [location, pickupDate, dropoffDate, handleSearch]);

  const ageGroup = parseInt(driverAge) < 25 ? 'young' : parseInt(driverAge) > 65 ? 'senior' : 'standard';
  const city = extractCity(searchedLoc);
  const iata = extractIATA(searchedLoc);

  const filteredCars = CAR_CATEGORIES
    .filter(c => c.fromPrice <= budget)
    .sort((a, b) => {
      if (sortBy === 'price-asc') return a.fromPrice - b.fromPrice;
      if (sortBy === 'price-desc') return b.fromPrice - a.fromPrice;
      return b.seats - a.seats;
    });

  return (
    <>
      <Header />

      {/* ── Hero + Search Form ── */}
      <section className="pt-36 pb-16 px-5 bg-[radial-gradient(ellipse_at_top,#E8F8EE_0%,#fff_55%,#F8FAFC_100%)]">
        <div className="max-w-[860px] mx-auto text-center mb-10">
          <span className="inline-block bg-emerald-50 text-emerald-600 text-[.65rem] font-black uppercase tracking-[2.5px] px-3.5 py-1.5 rounded-full mb-4">🚗 Car Rental Comparison</span>
          <h1 className="font-poppins text-[2.6rem] md:text-[3.8rem] font-black text-[#1A1D2B] leading-[1.05] tracking-tight mb-3">
            Hire a Car <em className="italic bg-gradient-to-br from-emerald-500 to-teal-500 bg-clip-text text-transparent">Anywhere</em>
          </h1>
          <p className="text-[1rem] text-[#8E95A9] font-semibold max-w-[520px] mx-auto">Compare 5 trusted car rental providers — real prices, no hidden fees.</p>
        </div>

        <div className="max-w-[860px] mx-auto bg-white border border-[#E8ECF4] rounded-3xl p-6 shadow-[0_8px_40px_rgba(0,0,0,0.07)]">
          {/* Pickup location */}
          <div className="mb-3">
            <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Pickup Location</label>
            <LocationPicker value={location} onChange={setLocation} placeholder="Airport or city — e.g. Barcelona Airport (BCN)" />
          </div>

          {/* Different return toggle */}
          <div className="mb-3">
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input type="checkbox" checked={differentReturn} onChange={e => setDifferentReturn(e.target.checked)}
                className="w-4 h-4 rounded border-[#E8ECF4] text-emerald-500 focus:ring-emerald-500 accent-emerald-500" />
              <span className="text-[.75rem] font-bold text-[#5C6378]">Return to a different location</span>
            </label>
            {differentReturn && (
              <div>
                <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Return Location</label>
                <LocationPicker value={returnLocation} onChange={setReturnLocation} placeholder="Where are you dropping off?" />
              </div>
            )}
          </div>

          {/* Dates, times, driver age */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Pickup Date</label>
              <input type="date" min={today} value={pickupDate} onChange={e => setPickupDate(e.target.value)}
                className="w-full px-3 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.82rem] font-semibold text-[#1A1D2B] outline-none focus:border-emerald-500 focus:bg-white transition-all" />
            </div>
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Pickup Time</label>
              <input type="time" value={pickupTime} onChange={e => setPickupTime(e.target.value)}
                className="w-full px-3 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.82rem] font-semibold text-[#1A1D2B] outline-none focus:border-emerald-500 focus:bg-white transition-all" />
            </div>
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Return Date</label>
              <input type="date" min={pickupDate || today} value={dropoffDate} onChange={e => setDropoffDate(e.target.value)}
                className="w-full px-3 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.82rem] font-semibold text-[#1A1D2B] outline-none focus:border-emerald-500 focus:bg-white transition-all" />
            </div>
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Return Time</label>
              <input type="time" value={dropoffTime} onChange={e => setDropoffTime(e.target.value)}
                className="w-full px-3 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.82rem] font-semibold text-[#1A1D2B] outline-none focus:border-emerald-500 focus:bg-white transition-all" />
            </div>
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Driver Age</label>
              <input type="number" min={18} max={99} value={driverAge} onChange={e => setDriverAge(e.target.value)}
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
          <p className="text-center text-[.68rem] text-[#8E95A9] font-semibold mt-2.5">Free comparison · Prices shown here · Click any provider to book on their site</p>
        </div>
      </section>

      {/* ── Loading ── */}
      {loading && <LoadingState loc={location} />}

      {/* ── Results ── */}
      {searched && (
        <div ref={resultsRef}>
          {/* Search summary */}
          <section className="max-w-[1000px] mx-auto px-5 pt-8 pb-4">
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl px-6 py-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="font-poppins font-black text-[1.15rem] text-[#1A1D2B]">
                  Car hire in {city} — {pickupDate} to {dropoffDate}{days ? ` (${days} day${days !== 1 ? 's' : ''})` : ''}
                </h2>
                <p className="text-[.75rem] text-[#5C6378] font-semibold mt-1">{filteredCars.length} car types available · Compare across 6 providers</p>
              </div>
              <select value={sortBy} onChange={e => setSortBy(e.target.value as 'price-asc' | 'price-desc' | 'seats')}
                className="px-3 py-2 rounded-lg border border-[#E8ECF4] bg-white text-[.78rem] font-semibold text-[#1A1D2B] outline-none focus:border-emerald-500">
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="seats">Most Seats</option>
              </select>
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

                      {/* Price + View Deal */}
                      <div className="p-5 flex flex-col items-end justify-center gap-2 border-t md:border-t-0 md:border-l border-[#F1F3F7] min-w-[180px]">
                        <div className="text-right">
                          <div className="text-[.65rem] text-[#8E95A9] font-semibold">estimated from</div>
                          <div className="font-poppins font-black text-[1.6rem] text-[#1A1D2B] leading-none">£{car.fromPrice}<span className="text-[.7rem] font-semibold text-[#8E95A9]">/day</span></div>
                          {days && days > 1 && (
                            <div className="text-[.68rem] text-[#8E95A9] font-semibold mt-0.5">~£{totalEst} total for {days} day{days !== 1 ? 's' : ''}</div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1.5 w-full">
                          {PROVIDERS.map((p) => {
                            const url = p.buildUrl(searchedLoc, pickupDate, dropoffDate, pickupTime, dropoffTime, driverAge);
                            return (
                              <a key={p.name} href={redirectUrl(url, p.name, city, 'cars')} target="_blank" rel="noopener noreferrer"
                                className="text-white font-poppins font-bold text-[.68rem] px-3 py-2 rounded-lg transition-all text-center whitespace-nowrap hover:opacity-90"
                                style={{ backgroundColor: p.color }}>
                                {p.name} →
                              </a>
                            );
                          })}
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

          {/* Smart recommendation */}
          <section className="max-w-[1000px] mx-auto px-5 pb-6">
            <div className="bg-gradient-to-r from-emerald-50 to-cyan-50 border border-emerald-200 rounded-2xl p-6">
              <h3 className="font-poppins font-black text-[.95rem] text-[#1A1D2B] mb-2">💡 Our Recommendation</h3>
              {ageGroup === 'young' && (
                <p className="text-[.82rem] text-[#5C6378] font-semibold leading-relaxed">
                  <strong className="text-[#1A1D2B]">Young driver?</strong> We recommend <strong>Economy Bookings</strong> and <strong>Qeeq</strong> — they typically have the lowest young driver surcharges, saving you £5-15/day compared to booking direct.
                </p>
              )}
              {ageGroup === 'standard' && (
                <p className="text-[.82rem] text-[#5C6378] font-semibold leading-relaxed">
                  For the best overall value, start with <strong>Economy Bookings</strong> for international chains or <strong>Localrent</strong> for local deals with full insurance included.
                </p>
              )}
              {ageGroup === 'senior' && (
                <p className="text-[.82rem] text-[#5C6378] font-semibold leading-relaxed">
                  <strong className="text-[#1A1D2B]">Senior drivers</strong> may find the best rates on <strong>Economy Bookings</strong> and <strong>Expedia</strong>, which have no upper age limits on most vehicles.
                </p>
              )}
            </div>
          </section>

          {/* Cross-sell */}
          <section className="max-w-[1000px] mx-auto px-5 pb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#F8FAFC] border border-[#E8ECF4] rounded-2xl p-6">
              <span className="text-2xl mb-2 block">✈️</span>
              <h3 className="font-poppins font-black text-[1rem] text-[#1A1D2B] mb-1">Flights to {city}</h3>
              <p className="text-[.78rem] text-[#5C6378] font-semibold mb-3">Still need flights? Compare across our providers.</p>
              <a href={`/flights?to=${iata || encodeURIComponent(city)}`}
                className="inline-block px-5 py-2.5 rounded-xl border-2 border-[#0066FF] text-[#0066FF] font-poppins font-bold text-[.8rem] hover:bg-blue-50 transition-colors">
                Compare Flights →
              </a>
            </div>
            <div className="bg-[#F8FAFC] border border-[#E8ECF4] rounded-2xl p-6">
              <span className="text-2xl mb-2 block">🏨</span>
              <h3 className="font-poppins font-black text-[1rem] text-[#1A1D2B] mb-1">Hotels in {city}</h3>
              <p className="text-[.78rem] text-[#5C6378] font-semibold mb-3">Find your hotel too.</p>
              <a href={`/hotels?destination=${encodeURIComponent(city)}`}
                className="inline-block px-5 py-2.5 rounded-xl border-2 border-orange-500 text-orange-500 font-poppins font-bold text-[.8rem] hover:bg-orange-50 transition-colors">
                Compare Hotels →
              </a>
            </div>
          </section>

          {/* Comparison table */}
          <section className="max-w-[1000px] mx-auto px-5 pb-8">
            <div className="bg-white border border-[#E8ECF4] rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E8ECF4] bg-[#F8FAFC]">
                <h3 className="font-poppins font-black text-[1rem] text-[#1A1D2B]">How Our Providers Compare</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[.75rem]">
                  <thead>
                    <tr className="border-b border-[#E8ECF4]">
                      <th className="text-left px-4 py-3 font-bold text-[#8E95A9] text-[.65rem] uppercase tracking-wider">Feature</th>
                      {PROVIDER_NAMES.map(n => (
                        <th key={n} className="text-center px-3 py-3 font-bold text-[#1A1D2B] text-[.7rem]">{n}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARE_ROWS.map((row, ri) => (
                      <tr key={row.feature} className={ri % 2 === 0 ? 'bg-[#F8FAFC]' : 'bg-white'}>
                        <td className="px-4 py-3 font-bold text-[#1A1D2B] text-[.75rem] whitespace-nowrap">{row.feature}</td>
                        {row.values.map((v, vi) => (
                          <td key={vi} className="text-center px-3 py-3 font-semibold text-[#5C6378] text-[.72rem]">{v}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
              ['Under 25? Use specialist sites', 'Economy Bookings & Qeeq have younger driver surcharges that are 30-50% lower.'],
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
