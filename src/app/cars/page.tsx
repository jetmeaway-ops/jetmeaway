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

const TP_WRAP = 'https://tp.media/r?marker=714449&trs=512633';

function buildEconomyBookingsUrl(loc: string, pickup: string, dropoff: string, pickupTime: string, dropoffTime: string, age: string) {
  const inner = `https://www.economybookings.com/search?location=${encodeURIComponent(loc)}&pick_up_date=${pickup}&drop_off_date=${dropoff}&pick_up_time=${pickupTime}&drop_off_time=${dropoffTime}&driver_age=${age}&currency=GBP`;
  return `${TP_WRAP}&p=3882&u=${encodeURIComponent(inner)}`;
}

function buildLocalrentUrl(loc: string, pickup: string, dropoff: string) {
  const inner = `https://localrent.com/en/search?location=${encodeURIComponent(loc)}&date_from=${pickup}&date_to=${dropoff}&currency=GBP`;
  return `${TP_WRAP}&p=7791&u=${encodeURIComponent(inner)}`;
}

function buildQeeqUrl(loc: string, pickup: string, dropoff: string, pickupTime: string, dropoffTime: string) {
  const inner = `https://www.qeeq.com/search?pickup=${encodeURIComponent(loc)}&pickup_date=${pickup}&dropoff_date=${dropoff}&pickup_time=${pickupTime}&dropoff_time=${dropoffTime}&currency=GBP`;
  return `${TP_WRAP}&p=8048&u=${encodeURIComponent(inner)}`;
}

function buildGetRentaCarUrl(loc: string, pickup: string, dropoff: string) {
  const inner = `https://getrentacar.com/search?location=${encodeURIComponent(loc)}&from=${pickup}&to=${dropoff}&currency=GBP`;
  return `${TP_WRAP}&p=9498&u=${encodeURIComponent(inner)}`;
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
    buildUrl: (loc, pickup, dropoff, pickupTime, dropoffTime, age) =>
      buildEconomyBookingsUrl(loc, pickup, dropoff, pickupTime, dropoffTime, age),
  },
  {
    name: 'Localrent',
    tagline: 'Rent directly from local companies — often cheaper than international chains',
    selling: ['Direct from local owners', 'Full insurance included', 'No deposit on many cars'],
    color: '#059669',
    bgColor: '#ECFDF5',
    buildUrl: (loc, pickup, dropoff) => buildLocalrentUrl(loc, pickup, dropoff),
  },
  {
    name: 'Qeeq',
    tagline: 'Compare 300+ car rental suppliers worldwide',
    selling: ['Price match guarantee', 'Free cancellation', 'No credit card fees'],
    color: '#7C3AED',
    bgColor: '#F5F3FF',
    buildUrl: (loc, pickup, dropoff, pickupTime, dropoffTime) =>
      buildQeeqUrl(loc, pickup, dropoff, pickupTime, dropoffTime),
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
          <section className="max-w-[900px] mx-auto px-5 pt-8 pb-4">
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl px-6 py-4">
              <h2 className="font-poppins font-black text-[1.15rem] text-[#1A1D2B]">
                Car hire in {city} — {pickupDate} to {dropoffDate}{days ? ` (${days} day${days !== 1 ? 's' : ''})` : ''}
              </h2>
              <p className="text-[.75rem] text-[#5C6378] font-semibold mt-1">Compare prices across 5 providers below</p>
            </div>
          </section>

          {/* Provider cards */}
          <section className="max-w-[900px] mx-auto px-5 pb-6">
            <div className="space-y-4">
              {PROVIDERS.map((p) => {
                const url = p.buildUrl(searchedLoc, pickupDate, dropoffDate, pickupTime, dropoffTime, driverAge);
                return (
                  <div key={p.name}
                    className="bg-white border border-[#E8ECF4] rounded-2xl overflow-hidden hover:shadow-lg transition-all"
                    style={{ borderLeftWidth: '4px', borderLeftColor: p.color }}>
                    <div className="p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                        <div>
                          <h3 className="font-poppins font-black text-[1.15rem] text-[#1A1D2B] mb-1">{p.name}</h3>
                          <p className="text-[.8rem] text-[#5C6378] font-semibold">{p.tagline}</p>
                        </div>
                        <a href={redirectUrl(url, p.name, city, 'cars')} target="_blank" rel="noopener noreferrer"
                          className="flex-shrink-0 px-6 py-3 rounded-xl font-poppins font-black text-[.85rem] text-white transition-all hover:opacity-90 shadow-md"
                          style={{ backgroundColor: p.color }}>
                          Search {p.name} →
                        </a>
                      </div>

                      {/* Selling points */}
                      <div className="flex flex-wrap gap-3 mb-3">
                        {p.selling.map(s => (
                          <span key={s} className="flex items-center gap-1.5 text-[.75rem] font-semibold text-[#1A1D2B] rounded-full px-3 py-1.5"
                            style={{ backgroundColor: p.bgColor }}>
                            <span className="text-emerald-500">✓</span> {s}
                          </span>
                        ))}
                      </div>

                      {/* Extra note */}
                      {p.extra && (
                        <div className="mt-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-100">
                          <p className="text-[.72rem] font-semibold text-amber-800">💡 {p.extra}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Smart recommendation */}
          <section className="max-w-[900px] mx-auto px-5 pb-6">
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
          <section className="max-w-[900px] mx-auto px-5 pb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <section className="max-w-[900px] mx-auto px-5 pb-8">
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
