'use client';

import { useState, useEffect, useRef } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const CITIES = [
  'Dubai', 'Barcelona', 'Antalya', 'Palma', 'Tenerife', 'Maldives', 'Tokyo', 'Paris',
  'New York', 'Bangkok', 'Athens', 'Lisbon', 'Rome', 'Faro', 'Gran Canaria', 'Crete',
  'Amsterdam', 'Singapore', 'Istanbul', 'Doha', 'Cancún', 'Cape Town', 'Reykjavik',
  'Vienna', 'Prague', 'London', 'Manchester', 'Edinburgh', 'Dublin', 'Nice', 'Milan',
  'Venice', 'Naples', 'Porto', 'Zürich', 'Geneva', 'Brussels', 'Copenhagen', 'Stockholm',
  'Oslo', 'Helsinki', 'Warsaw', 'Kraków', 'Budapest', 'Bucharest', 'Split', 'Dubrovnik',
  'Marrakesh', 'Cairo', 'Nairobi', 'Johannesburg', 'Mumbai', 'Bali', 'Phuket',
  'Kuala Lumpur', 'Hong Kong', 'Shanghai', 'Seoul', 'Sydney', 'Melbourne', 'Auckland',
  'Los Angeles', 'San Francisco', 'Miami', 'Las Vegas', 'Orlando', 'Toronto', 'Vancouver',
  'Havana', 'Punta Cana', 'Lima', 'Buenos Aires', 'Rio de Janeiro', 'São Paulo',
  'London Gatwick', 'London Heathrow', 'London Stansted', 'London Luton', 'London City',
  'Manchester Airport', 'Birmingham Airport', 'Edinburgh Airport', 'Glasgow Airport',
  'Bristol Airport', 'Leeds Bradford', 'Liverpool Airport', 'Newcastle Airport',
  'Malaga Airport', 'Alicante Airport', 'Faro Airport', 'Antalya Airport',
  'Dubai Airport', 'Larnaca Airport', 'Paphos Airport', 'Dalaman Airport',
];

function CityPicker({ value, onChange, placeholder }: {
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
    ? CITIES.filter(c => c.toLowerCase().startsWith(q) || c.toLowerCase().includes(q)).slice(0, 7)
    : [];

  return (
    <div ref={ref} className="relative">
      <input type="text" placeholder={placeholder} value={value} autoComplete="off"
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => { if (results.length > 0) setOpen(true); }}
        onKeyDown={e => { if (e.key === 'Enter') setOpen(false); }}
        className="w-full px-4 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.9rem] font-semibold text-[#1A1D2B] outline-none focus:border-emerald-500 focus:bg-white transition-all placeholder:text-[#B0B8CC] placeholder:font-medium" />
      {open && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1.5 bg-white border border-[#E8ECF4] rounded-2xl shadow-2xl overflow-hidden">
          {results.map(c => (
            <li key={c} onMouseDown={() => { onChange(c); setOpen(false); }}
              className="px-4 py-3 hover:bg-emerald-50 cursor-pointer transition-colors border-b border-[#F1F3F7] last:border-0 font-[Poppins] font-semibold text-[.88rem] text-[#1A1D2B]">
              {c}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Providers ──────────────────────────────────────────────────────────────
const PROVIDERS = [
  {
    name: 'Economy Bookings',
    logo: '🚗',
    desc: 'Lowest-price guarantee across 30,000+ locations.',
    badge: 'Cheapest Rates',
    getUrl: (loc: string, ret: string, pickup: string, dropoff: string) =>
      `https://www.economybookings.com/search?pickup_location=${encodeURIComponent(loc)}&dropoff_location=${encodeURIComponent(ret || loc)}&pickup_date=${pickup}&dropoff_date=${dropoff}`,
  },
  {
    name: 'Rentalcars.com',
    logo: '🔑',
    desc: 'Trusted by 5M+ travellers. Compare 900+ suppliers.',
    badge: 'Most Trusted',
    getUrl: (loc: string, ret: string, pickup: string, dropoff: string) =>
      `https://www.rentalcars.com/search?pickUpLocation=${encodeURIComponent(loc)}&dropOffLocation=${encodeURIComponent(ret || loc)}&pickUpDate=${pickup}&dropOffDate=${dropoff}`,
  },
  {
    name: 'Discover Cars',
    logo: '🔭',
    desc: 'No hidden fees — what you see is what you pay.',
    badge: 'No Hidden Fees',
    getUrl: (loc: string, ret: string, pickup: string, dropoff: string) =>
      `https://www.discovercars.com/cars/${encodeURIComponent(loc)}?from=${pickup}&to=${dropoff}${ret && ret !== loc ? `&dropoff=${encodeURIComponent(ret)}` : ''}`,
  },
  {
    name: 'Localrent',
    logo: '🗺',
    desc: 'Local suppliers = much cheaper rates, same quality.',
    badge: 'Local Deals',
    getUrl: (loc: string, ret: string, pickup: string, dropoff: string) =>
      `https://localrent.com/cars/${encodeURIComponent(loc)}?startDate=${pickup}&endDate=${dropoff}`,
  },
  {
    name: 'Qeeq',
    logo: '⚡',
    desc: 'Flash prices & instant confirmation at 50,000+ locations.',
    badge: 'Instant Booking',
    getUrl: (loc: string, ret: string, pickup: string, dropoff: string) =>
      `https://www.qeeq.com/search?pickupLocation=${encodeURIComponent(loc)}&dropoffLocation=${encodeURIComponent(ret || loc)}&startDate=${pickup}&endDate=${dropoff}`,
  },
  {
    name: 'GetRentaCar',
    logo: '🌐',
    desc: 'Best for exotic destinations & 24/7 support.',
    badge: 'Worldwide',
    getUrl: (loc: string, ret: string, pickup: string, dropoff: string) =>
      `https://getrentacar.com/search?location=${encodeURIComponent(loc)}&dropoff=${encodeURIComponent(ret || loc)}&pickup=${pickup}&return=${dropoff}`,
  },
];

// ─── Curated car data ───────────────────────────────────────────────────────
type CuratedCar = {
  type: string;
  example: string;
  seats: number;
  bags: number;
  transmission: 'Manual' | 'Automatic';
  ac: boolean;
  pricePerDay: number;
  features: string[];
};

const CURATED_CARS: Record<string, CuratedCar[]> = {
  'UK & Europe': [
    { type: 'Economy', example: 'Fiat 500 or similar', seats: 4, bags: 1, transmission: 'Manual', ac: true, pricePerDay: 18, features: ['Great fuel economy', 'Easy to park', 'Insurance included'] },
    { type: 'Compact', example: 'VW Golf or similar', seats: 5, bags: 2, transmission: 'Manual', ac: true, pricePerDay: 25, features: ['Comfortable for 4', 'Motorway-ready', 'USB charging'] },
    { type: 'Mid-size', example: 'Ford Focus or similar', seats: 5, bags: 3, transmission: 'Automatic', ac: true, pricePerDay: 32, features: ['Spacious boot', 'Auto gearbox', 'Cruise control'] },
    { type: 'SUV', example: 'Nissan Qashqai or similar', seats: 5, bags: 3, transmission: 'Automatic', ac: true, pricePerDay: 42, features: ['High driving position', 'All-terrain capable', 'Family-friendly'] },
    { type: 'Estate', example: 'Skoda Octavia Estate or similar', seats: 5, bags: 5, transmission: 'Automatic', ac: true, pricePerDay: 38, features: ['Huge boot space', 'Perfect for road trips', 'Roof rack option'] },
    { type: 'Premium', example: 'BMW 3 Series or similar', seats: 5, bags: 3, transmission: 'Automatic', ac: true, pricePerDay: 55, features: ['Leather seats', 'Sat-nav included', 'Premium audio'] },
    { type: 'Minivan', example: 'Ford Galaxy or similar', seats: 7, bags: 4, transmission: 'Automatic', ac: true, pricePerDay: 58, features: ['7 seats', 'Sliding doors', 'Great for groups'] },
    { type: 'Convertible', example: 'MINI Cooper Convertible or similar', seats: 4, bags: 1, transmission: 'Automatic', ac: true, pricePerDay: 48, features: ['Open-top driving', 'Fun & sporty', 'Perfect for coast roads'] },
  ],
  'Dubai & Middle East': [
    { type: 'Economy', example: 'Toyota Yaris or similar', seats: 5, bags: 2, transmission: 'Automatic', ac: true, pricePerDay: 15, features: ['Fuel efficient', 'Easy to park', 'AC standard'] },
    { type: 'Mid-size', example: 'Toyota Camry or similar', seats: 5, bags: 3, transmission: 'Automatic', ac: true, pricePerDay: 28, features: ['Comfortable sedan', 'Highway cruiser', 'Great value'] },
    { type: 'SUV', example: 'Nissan X-Trail or similar', seats: 5, bags: 3, transmission: 'Automatic', ac: true, pricePerDay: 38, features: ['Desert-ready', 'High clearance', 'Family-friendly'] },
    { type: 'Luxury SUV', example: 'Range Rover Sport or similar', seats: 5, bags: 3, transmission: 'Automatic', ac: true, pricePerDay: 120, features: ['Premium interior', 'Off-road capable', 'Heads will turn'] },
    { type: 'Premium', example: 'BMW 5 Series or similar', seats: 5, bags: 3, transmission: 'Automatic', ac: true, pricePerDay: 85, features: ['Business class on wheels', 'Leather & nav', 'Valet-worthy'] },
    { type: 'Minivan', example: 'Toyota Previa or similar', seats: 7, bags: 4, transmission: 'Automatic', ac: true, pricePerDay: 48, features: ['7 seats', 'Airport pickup ready', 'Great for families'] },
  ],
  'Turkey': [
    { type: 'Economy', example: 'Fiat Egea or similar', seats: 5, bags: 2, transmission: 'Manual', ac: true, pricePerDay: 12, features: ['Best value', 'Fuel efficient', 'Easy parking'] },
    { type: 'Compact', example: 'Renault Clio or similar', seats: 5, bags: 2, transmission: 'Manual', ac: true, pricePerDay: 16, features: ['Comfortable', 'Good for town & coast', 'USB port'] },
    { type: 'Mid-size', example: 'Toyota Corolla or similar', seats: 5, bags: 3, transmission: 'Automatic', ac: true, pricePerDay: 24, features: ['Reliable', 'Auto gearbox', 'Long-distance comfort'] },
    { type: 'SUV', example: 'Dacia Duster or similar', seats: 5, bags: 3, transmission: 'Manual', ac: true, pricePerDay: 28, features: ['Rugged & cheap', 'Mountain-ready', 'High clearance'] },
    { type: 'Minivan', example: 'Fiat Doblo or similar', seats: 7, bags: 4, transmission: 'Manual', ac: true, pricePerDay: 32, features: ['Family-friendly', '7 seats', 'Huge boot'] },
    { type: 'Convertible', example: 'MINI Convertible or similar', seats: 4, bags: 1, transmission: 'Automatic', ac: true, pricePerDay: 45, features: ['Coastal cruising', 'Open-top fun', 'Turquoise Coast perfection'] },
  ],
  'USA': [
    { type: 'Economy', example: 'Nissan Versa or similar', seats: 5, bags: 2, transmission: 'Automatic', ac: true, pricePerDay: 22, features: ['Budget-friendly', 'Great MPG', 'City-ready'] },
    { type: 'Mid-size', example: 'Toyota Camry or similar', seats: 5, bags: 3, transmission: 'Automatic', ac: true, pricePerDay: 35, features: ['Highway cruiser', 'Comfortable ride', 'Apple CarPlay'] },
    { type: 'Full-size SUV', example: 'Chevrolet Tahoe or similar', seats: 7, bags: 5, transmission: 'Automatic', ac: true, pricePerDay: 65, features: ['American classic', 'Room for everything', '7 seats'] },
    { type: 'Convertible', example: 'Ford Mustang Convertible or similar', seats: 4, bags: 2, transmission: 'Automatic', ac: true, pricePerDay: 58, features: ['Iconic road trip car', 'V6 power', 'Open-top thrills'] },
    { type: 'Premium', example: 'Tesla Model 3 or similar', seats: 5, bags: 3, transmission: 'Automatic', ac: true, pricePerDay: 55, features: ['All-electric', 'Autopilot', 'Zero emissions'] },
    { type: 'Minivan', example: 'Chrysler Pacifica or similar', seats: 7, bags: 5, transmission: 'Automatic', ac: true, pricePerDay: 52, features: ['Family road trips', 'Sliding doors', 'Entertainment system'] },
  ],
  'Spain & Portugal': [
    { type: 'Economy', example: 'Seat Ibiza or similar', seats: 5, bags: 2, transmission: 'Manual', ac: true, pricePerDay: 14, features: ['Cheapest option', 'City-friendly', 'Fuel sipper'] },
    { type: 'Compact', example: 'Seat Leon or similar', seats: 5, bags: 2, transmission: 'Manual', ac: true, pricePerDay: 20, features: ['Comfortable cruiser', 'Motorway-ready', 'USB port'] },
    { type: 'SUV', example: 'Seat Ateca or similar', seats: 5, bags: 3, transmission: 'Automatic', ac: true, pricePerDay: 35, features: ['Mountain-ready', 'Auto gearbox', 'Great views'] },
    { type: 'Convertible', example: 'MINI Cooper Convertible or similar', seats: 4, bags: 1, transmission: 'Automatic', ac: true, pricePerDay: 42, features: ['Coastal roads', 'Mediterranean sun', 'Sporty'] },
    { type: 'Minivan', example: 'Citroen Berlingo or similar', seats: 7, bags: 4, transmission: 'Manual', ac: true, pricePerDay: 30, features: ['Family holidays', '7 seats', 'Huge boot'] },
    { type: 'Premium', example: 'Mercedes C-Class or similar', seats: 5, bags: 3, transmission: 'Automatic', ac: true, pricePerDay: 52, features: ['Luxury touring', 'Leather seats', 'Sat-nav'] },
  ],
};

function getRegionForCity(city: string): string {
  const c = city.toLowerCase();
  if (['dubai', 'abu dhabi', 'doha', 'muscat', 'riyadh', 'jeddah', 'bahrain'].some(k => c.includes(k))) return 'Dubai & Middle East';
  if (['antalya', 'istanbul', 'bodrum', 'dalaman', 'izmir', 'fethiye', 'cappadocia'].some(k => c.includes(k))) return 'Turkey';
  if (['new york', 'los angeles', 'san francisco', 'miami', 'las vegas', 'orlando', 'chicago', 'hawaii', 'boston', 'washington'].some(k => c.includes(k))) return 'USA';
  if (['malaga', 'barcelona', 'madrid', 'alicante', 'palma', 'tenerife', 'gran canaria', 'faro', 'lisbon', 'porto', 'seville', 'ibiza'].some(k => c.includes(k))) return 'Spain & Portugal';
  return 'UK & Europe';
}

function getCarsForCity(city: string): CuratedCar[] {
  const region = getRegionForCity(city);
  return CURATED_CARS[region] || CURATED_CARS['UK & Europe'];
}

const CAR_ICONS: Record<string, string> = {
  'Economy': '🚙', 'Compact': '🚗', 'Mid-size': '🚘', 'SUV': '🚙',
  'Full-size SUV': '🚙', 'Luxury SUV': '🚙', 'Estate': '🚗', 'Premium': '🏎',
  'Minivan': '🚐', 'Convertible': '🏎',
};

export default function CarsPage() {
  const [location, setLocation] = useState('');
  const [returnLocation, setReturnLocation] = useState('');
  const [differentReturn, setDifferentReturn] = useState(false);
  const [pickupDate, setPickupDate] = useState('');
  const [dropoffDate, setDropoffDate] = useState('');
  const [pickupTime, setPickupTime] = useState('10:00');
  const [driverAge, setDriverAge] = useState('30-65');
  const [searched, setSearched] = useState(false);
  const [cars, setCars] = useState<CuratedCar[]>([]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const loc = p.get('location');
    const ret = p.get('returnLocation');
    const pickup = p.get('pickup');
    const dropoff = p.get('dropoff');
    if (loc) setLocation(loc);
    if (ret) { setReturnLocation(ret); setDifferentReturn(true); }
    if (pickup) setPickupDate(pickup);
    if (dropoff) setDropoffDate(dropoff);
  }, []);

  const today = new Date().toISOString().split('T')[0];

  const days = pickupDate && dropoffDate
    ? Math.max(1, Math.round((new Date(dropoffDate).getTime() - new Date(pickupDate).getTime()) / 86400000))
    : null;

  const effectiveReturn = differentReturn && returnLocation ? returnLocation : location;
  const isOneWay = differentReturn && returnLocation && returnLocation !== location;

  function handleSearch() {
    if (!location || !pickupDate || !dropoffDate) { alert('Please enter pickup location and both dates'); return; }
    if (differentReturn && !returnLocation) { alert('Please enter a return location'); return; }
    setCars(getCarsForCity(location));
    setSearched(true);
    setTimeout(() => document.getElementById('car-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }

  return (
    <>
      <Header />

      <section className="pt-36 pb-16 px-5 bg-[radial-gradient(ellipse_at_top,#E8F8EE_0%,#fff_55%,#F8FAFC_100%)] relative">
        <div className="max-w-[860px] mx-auto text-center mb-10">
          <span className="inline-block bg-emerald-50 text-emerald-600 text-[.65rem] font-black uppercase tracking-[2.5px] px-3.5 py-1.5 rounded-full mb-4">🚗 Car Rental Comparison</span>
          <h1 className="font-[Poppins] text-[2.6rem] md:text-[3.8rem] font-black text-[#1A1D2B] leading-[1.05] tracking-tight mb-3">
            Hire a Car <em className="italic bg-gradient-to-br from-emerald-500 to-teal-500 bg-clip-text text-transparent">Anywhere</em>
          </h1>
          <p className="text-[1rem] text-[#8E95A9] font-semibold max-w-[520px] mx-auto">Compare 6 car rental platforms — no hidden fees, best prices guaranteed.</p>
        </div>

        <div className="max-w-[860px] mx-auto bg-white border border-[#E8ECF4] rounded-3xl p-6 shadow-[0_8px_40px_rgba(0,0,0,0.07)]">
          {/* Pickup location */}
          <div className="mb-3">
            <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Pickup Location</label>
            <CityPicker value={location} onChange={setLocation} placeholder="Airport, city or address — e.g. London Gatwick, Malaga Airport" />
          </div>

          {/* Different return toggle + return location */}
          <div className="mb-3">
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input type="checkbox" checked={differentReturn} onChange={e => setDifferentReturn(e.target.checked)}
                className="w-4 h-4 rounded border-[#E8ECF4] text-emerald-500 focus:ring-emerald-500 accent-emerald-500" />
              <span className="text-[.75rem] font-bold text-[#5C6378]">Return to a different location</span>
            </label>
            {differentReturn && (
              <div>
                <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Return Location</label>
                <CityPicker value={returnLocation} onChange={setReturnLocation} placeholder="Where are you dropping off? — e.g. Manchester, Edinburgh Airport" />
              </div>
            )}
          </div>

          {/* Date, time, driver age row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
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
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Driver Age</label>
              <select value={driverAge} onChange={e => setDriverAge(e.target.value)}
                className="w-full px-3 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.82rem] font-semibold text-[#1A1D2B] outline-none focus:border-emerald-500 focus:bg-white transition-all">
                <option value="18-24">18-24 (young driver)</option>
                <option value="25-29">25-29</option>
                <option value="30-65">30-65</option>
                <option value="66+">66+</option>
              </select>
            </div>
          </div>

          <button onClick={handleSearch}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-[Poppins] font-black text-[.95rem] py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(16,185,129,0.3)]">
            Search Car Rentals →
          </button>
          <p className="text-center text-[.68rem] text-[#8E95A9] font-semibold mt-2.5">No booking fees added. Prices include taxes where possible.</p>
        </div>
      </section>

      {/* Car Results */}
      {searched && cars.length > 0 && (
        <section id="car-results" className="max-w-[1100px] mx-auto px-5 py-10">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
            <div>
              <h2 className="font-[Poppins] font-black text-[1.3rem] text-[#1A1D2B]">
                Car Hire in {location}
                {days ? <span className="text-[#8E95A9] font-semibold text-[1rem]"> · {days} day{days !== 1 ? 's' : ''}</span> : null}
              </h2>
              <p className="text-[.72rem] text-[#8E95A9] font-semibold mt-0.5">
                {cars.length} vehicles · {pickupDate} to {dropoffDate}
                {isOneWay ? ` · returning to ${returnLocation}` : ''}
              </p>
            </div>
            <div className="flex gap-2">
              {isOneWay && (
                <span className="text-[.7rem] font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full">One-way rental</span>
              )}
              <span className="text-[.7rem] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">{cars.length} options</span>
            </div>
          </div>

          {isOneWay && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5 flex items-start gap-2.5">
              <span className="text-lg">📍</span>
              <div>
                <p className="text-[.78rem] font-bold text-amber-800">One-way rental: {location} → {returnLocation}</p>
                <p className="text-[.7rem] text-amber-700 font-medium">One-way fees vary by provider (typically £30–£150 extra). Check each provider for the exact surcharge.</p>
              </div>
            </div>
          )}

          {/* Car cards */}
          <div className="space-y-4 mb-6">
            {cars.map((car, i) => {
              const totalPrice = days ? car.pricePerDay * days : car.pricePerDay;
              return (
                <div key={car.type} className="bg-white border border-[#E8ECF4] rounded-2xl overflow-hidden hover:shadow-lg transition-all">
                  <div className="flex flex-col md:flex-row">
                    {/* Car icon area */}
                    <div className="relative w-full md:w-56 h-40 md:h-auto flex-shrink-0 bg-gradient-to-br from-[#F1F8F4] to-[#E8F8EE] flex items-center justify-center">
                      <span className="text-6xl">{CAR_ICONS[car.type] || '🚗'}</span>
                      {i === 0 && (
                        <span className="absolute top-3 left-3 text-[.6rem] font-black uppercase tracking-[1.5px] bg-emerald-500 text-white px-2.5 py-1 rounded-full shadow-md">Best Value</span>
                      )}
                      <span className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm text-[.65rem] font-black uppercase tracking-[1px] text-emerald-600 px-2 py-0.5 rounded-full">
                        {car.type}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 p-5 flex flex-col">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <h3 className="font-[Poppins] font-bold text-[1.05rem] text-[#1A1D2B]">{car.type}</h3>
                          <span className="text-[.68rem] font-semibold text-[#8E95A9]">{car.example}</span>
                        </div>

                        {/* Specs */}
                        <div className="flex flex-wrap gap-2.5 mb-2.5 mt-1.5">
                          <span className="flex items-center gap-1 text-[.68rem] font-bold text-[#5C6378]">
                            <span className="text-sm">👤</span> {car.seats} seats
                          </span>
                          <span className="flex items-center gap-1 text-[.68rem] font-bold text-[#5C6378]">
                            <span className="text-sm">🧳</span> {car.bags} bag{car.bags !== 1 ? 's' : ''}
                          </span>
                          <span className="flex items-center gap-1 text-[.68rem] font-bold text-[#5C6378]">
                            <span className="text-sm">⚙</span> {car.transmission}
                          </span>
                          {car.ac && (
                            <span className="flex items-center gap-1 text-[.68rem] font-bold text-[#5C6378]">
                              <span className="text-sm">❄</span> AC
                            </span>
                          )}
                        </div>

                        {/* Features */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {car.features.map(f => (
                            <span key={f} className="flex items-center gap-1 text-[.62rem] font-bold text-green-700 bg-green-50 px-2 py-1 rounded-full">
                              <span className="text-green-500">✓</span> {f}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Price + providers */}
                      <div className="border-t border-[#F1F3F7] pt-3 mt-1">
                        <div className="flex items-end justify-between mb-3">
                          <div>
                            <span className="text-[.62rem] text-[#8E95A9] font-semibold">estimated from</span>
                            <div className="font-[Poppins] font-black text-[1.4rem] text-[#1A1D2B] leading-none">
                              £{car.pricePerDay}<span className="text-[.7rem] font-semibold text-[#8E95A9]">/day</span>
                              {days && days > 1 && (
                                <span className="text-[.75rem] font-semibold text-[#8E95A9] ml-2">· £{totalPrice} total</span>
                              )}
                            </div>
                            <span className="text-[.6rem] text-[#8E95A9] font-medium">prices vary by provider & availability</span>
                          </div>
                        </div>

                        {/* Provider buttons */}
                        <div className="flex flex-wrap gap-2">
                          {PROVIDERS.slice(0, 4).map(p => (
                            <a key={p.name} href={p.getUrl(location, effectiveReturn, pickupDate, dropoffDate)} target="_blank" rel="noopener"
                              className="flex items-center gap-1.5 bg-[#F8FAFC] hover:bg-emerald-50 border border-[#E8ECF4] hover:border-emerald-200 rounded-lg px-3 py-2 transition-all group">
                              <span className="text-sm">{p.logo}</span>
                              <span className="text-[.7rem] font-bold text-[#1A1D2B] group-hover:text-emerald-600">{p.name}</span>
                              <span className="text-[.65rem] text-emerald-500 font-bold">→</span>
                            </a>
                          ))}
                          <a href={PROVIDERS[4].getUrl(location, effectiveReturn, pickupDate, dropoffDate)} target="_blank" rel="noopener"
                            className="flex items-center gap-1.5 bg-[#F8FAFC] hover:bg-emerald-50 border border-[#E8ECF4] hover:border-emerald-200 rounded-lg px-3 py-2 transition-all group">
                            <span className="text-[.7rem] font-bold text-[#8E95A9] group-hover:text-emerald-600">+2 more</span>
                            <span className="text-[.65rem] text-emerald-500 font-bold">→</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* No results */}
      {searched && cars.length === 0 && (
        <section className="max-w-[860px] mx-auto px-5 py-10 text-center">
          <p className="text-[1.2rem] text-[#8E95A9] font-semibold">No cars found for this location. Try a different city or airport.</p>
        </section>
      )}

      {/* Tips section */}
      <section className="max-w-[860px] mx-auto px-5 pb-16">
        <div className="bg-[#F8FAFC] border border-[#F1F3F7] rounded-3xl p-8">
          <h3 className="font-[Poppins] font-black text-[1.05rem] text-[#1A1D2B] mb-4">Tips for Cheaper Car Rentals</h3>
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
