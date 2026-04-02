'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const AIRPORTS: { code: string; name: string; city: string; country: string }[] = [
  { code: 'LHR', name: 'London Heathrow', city: 'London', country: 'GB' },
  { code: 'LGW', name: 'London Gatwick', city: 'London', country: 'GB' },
  { code: 'STN', name: 'London Stansted', city: 'London', country: 'GB' },
  { code: 'MAN', name: 'Manchester Airport', city: 'Manchester', country: 'GB' },
  { code: 'BHX', name: 'Birmingham Airport', city: 'Birmingham', country: 'GB' },
  { code: 'EDI', name: 'Edinburgh Airport', city: 'Edinburgh', country: 'GB' },
  { code: 'GLA', name: 'Glasgow Airport', city: 'Glasgow', country: 'GB' },
  { code: 'BRS', name: 'Bristol Airport', city: 'Bristol', country: 'GB' },
  { code: 'JFK', name: 'JFK International', city: 'New York', country: 'US' },
  { code: 'LAX', name: 'Los Angeles International', city: 'Los Angeles', country: 'US' },
  { code: 'ORD', name: "O'Hare International", city: 'Chicago', country: 'US' },
  { code: 'MIA', name: 'Miami International', city: 'Miami', country: 'US' },
  { code: 'CDG', name: 'Charles de Gaulle', city: 'Paris', country: 'FR' },
  { code: 'AMS', name: 'Amsterdam Schiphol', city: 'Amsterdam', country: 'NL' },
  { code: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'DE' },
  { code: 'MAD', name: 'Madrid Barajas', city: 'Madrid', country: 'ES' },
  { code: 'BCN', name: 'Barcelona El Prat', city: 'Barcelona', country: 'ES' },
  { code: 'FCO', name: 'Rome Fiumicino', city: 'Rome', country: 'IT' },
  { code: 'DXB', name: 'Dubai International', city: 'Dubai', country: 'AE' },
  { code: 'DOH', name: 'Hamad International', city: 'Doha', country: 'QA' },
  { code: 'SIN', name: 'Singapore Changi', city: 'Singapore', country: 'SG' },
  { code: 'BKK', name: 'Suvarnabhumi Airport', city: 'Bangkok', country: 'TH' },
  { code: 'HKG', name: 'Hong Kong International', city: 'Hong Kong', country: 'HK' },
  { code: 'NRT', name: 'Tokyo Narita', city: 'Tokyo', country: 'JP' },
  { code: 'SYD', name: 'Sydney Kingsford Smith', city: 'Sydney', country: 'AU' },
  { code: 'DEL', name: 'Indira Gandhi International', city: 'New Delhi', country: 'IN' },
  { code: 'BOM', name: 'Mumbai Chhatrapati Shivaji', city: 'Mumbai', country: 'IN' },
  { code: 'DUB', name: 'Dublin Airport', city: 'Dublin', country: 'IE' },
  { code: 'LIS', name: 'Lisbon Humberto Delgado', city: 'Lisbon', country: 'PT' },
  { code: 'ATH', name: 'Athens International', city: 'Athens', country: 'GR' },
  { code: 'IST', name: 'Istanbul Airport', city: 'Istanbul', country: 'TR' },
];

function searchAirports(q: string) {
  if (!q || q.length < 2) return [];
  const lq = q.toLowerCase();
  return AIRPORTS.filter(a =>
    a.code.toLowerCase().startsWith(lq) ||
    a.city.toLowerCase().startsWith(lq) ||
    a.name.toLowerCase().includes(lq)
  ).slice(0, 5);
}

function AirportPicker({ placeholder, value, onSelect }: { placeholder: string; value: string; onSelect: (code: string) => void }) {
  const [q, setQ] = useState(value ? `${value}` : '');
  const [open, setOpen] = useState(false);
  const results = searchAirports(q);

  return (
    <div className="relative">
      <input
        type="text"
        placeholder={placeholder}
        value={q}
        onChange={e => { setQ(e.target.value); setOpen(true); onSelect(''); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        autoComplete="off"
        className="w-full px-4 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.9rem] font-semibold text-[#1A1D2B] outline-none focus:border-[#0066FF] focus:bg-white transition-all placeholder:text-[#B0B8CC] placeholder:font-medium"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1.5 bg-white border border-[#E8ECF4] rounded-2xl shadow-xl overflow-hidden">
          {results.map(a => (
            <li key={a.code} onMouseDown={() => { setQ(`${a.city} (${a.code})`); onSelect(a.code); setOpen(false); }}
              className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors border-b border-[#F1F3F7] last:border-0">
              <span className="font-black text-[.78rem] text-[#0066FF] w-9 flex-shrink-0">{a.code}</span>
              <span className="text-[.82rem] text-[#1A1D2B] font-semibold leading-tight">
                {a.name}
                <span className="block text-[.7rem] text-[#8E95A9] font-medium">{a.city}, {a.country}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const PROVIDERS = [
  {
    name: 'Aviasales',
    logo: '✈',
    desc: 'Best for cheap flights & budget airlines worldwide.',
    badge: 'Best Value',
    color: '#FF6B35',
    getUrl: (o: string, d: string, date: string) => {
      const d1 = date.replace(/-/g, '').slice(4) + date.replace(/-/g, '').slice(2, 4);
      return `https://tp.media/r?campaign_id=121&marker=714449&trs=512633&p=4114&u=https%3A%2F%2Fwww.aviasales.com%2Fsearch%2F${o}${d1}${d}1`;
    },
  },
  {
    name: 'Skyscanner',
    logo: '🔍',
    desc: 'Compare hundreds of airlines and OTAs at once.',
    badge: 'Most Popular',
    color: '#0770E3',
    getUrl: (o: string, d: string, date: string) =>
      `https://www.skyscanner.net/transport/flights/${o.toLowerCase()}/${d.toLowerCase()}/${date.replace(/-/g, '')}/`,
  },
  {
    name: 'Kiwi.com',
    logo: '🥝',
    desc: 'Unique combination routes with missed-flight guarantee.',
    badge: 'Flexible Routes',
    color: '#00B2A3',
    getUrl: (o: string, d: string, date: string) =>
      `https://tp.media/r?campaign_id=105&marker=714449&trs=512633&p=3956&u=https%3A%2F%2Fwww.kiwi.com%2Fen%2Fsearch%2Fresults%2F${o}%2F${d}%2F${date}%2F`,
  },
  {
    name: 'Expedia',
    logo: '🌍',
    desc: 'Bundle flights with hotels for extra savings.',
    badge: 'Bundle & Save',
    color: '#1B3DB5',
    getUrl: (o: string, d: string, date: string) =>
      `https://tp.media/r?campaign_id=8&marker=714449&trs=512633&p=590&u=https%3A%2F%2Fwww.expedia.co.uk%2FFlights-Search%3Ftrip%3Doneway%26leg1%3Dfrom%253A${o}%252Cto%253A${d}%252Cdeparture%253A${date}TANYT`,
  },
  {
    name: 'Trip.com',
    logo: '🗺',
    desc: 'Great fares to Asia & Middle East routes.',
    badge: 'Asia Specialist',
    color: '#007AFF',
    getUrl: (o: string, d: string) =>
      `https://tp.media/r?campaign_id=336&marker=714449&trs=512633&p=6589&u=https%3A%2F%2Fuk.trip.com%2Fflights%2F${o}-to-${d}%2Ftickets`,
  },
  {
    name: 'Momondo',
    logo: '🌈',
    desc: 'Finds hidden deals other sites often miss.',
    badge: 'Hidden Deals',
    color: '#E91E63',
    getUrl: (o: string, d: string, date: string) =>
      `https://www.momondo.co.uk/flight-search/${o}-${d}/${date}`,
  },
  {
    name: 'Kayak',
    logo: '🛶',
    desc: 'Price forecasts & flexible date search.',
    badge: 'Price Predictor',
    color: '#FF690F',
    getUrl: (o: string, d: string, date: string) =>
      `https://www.kayak.co.uk/flights/${o}-${d}/${date}`,
  },
];

export default function FlightsPage() {
  const [origin, setOrigin] = useState('');
  const [dest, setDest] = useState('');
  const [date, setDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [passengers, setPassengers] = useState('1');
  const [searched, setSearched] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  function openAll() {
    if (!origin || !dest || !date) { alert('Please select origin, destination and departure date'); return; }
    setSearched(true);
    PROVIDERS.forEach((p, i) => {
      setTimeout(() => {
        window.open(p.getUrl(origin, dest, date), '_blank', 'noopener');
      }, i * 200);
    });
  }

  return (
    <>
      <Header />

      {/* Hero */}
      <section className="pt-36 pb-16 px-5 bg-[radial-gradient(ellipse_at_top,#E8F0FE_0%,#fff_55%,#F8FAFC_100%)] relative">
        <div className="max-w-[860px] mx-auto text-center mb-10">
          <span className="inline-block bg-blue-50 text-[#0066FF] text-[.65rem] font-black uppercase tracking-[2.5px] px-3.5 py-1.5 rounded-full mb-4">✈ Flight Comparison</span>
          <h1 className="font-[Poppins] text-[2.6rem] md:text-[3.8rem] font-black text-[#1A1D2B] leading-[1.05] tracking-tight mb-3">
            Find the <em className="italic bg-gradient-to-br from-[#0066FF] to-[#4F46E5] bg-clip-text text-transparent">Cheapest</em> Flights
          </h1>
          <p className="text-[1rem] text-[#8E95A9] font-semibold max-w-[520px] mx-auto">We compare 7 providers simultaneously — one search, every deal.</p>
        </div>

        {/* Search form */}
        <div className="max-w-[860px] mx-auto bg-white border border-[#E8ECF4] rounded-3xl p-6 shadow-[0_8px_40px_rgba(0,102,255,0.08)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <AirportPicker placeholder="From — city or airport code" value={origin} onSelect={setOrigin} />
            <AirportPicker placeholder="To — city or airport code" value={dest} onSelect={setDest} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Departure</label>
              <input type="date" min={today} value={date} onChange={e => setDate(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.85rem] font-semibold text-[#1A1D2B] outline-none focus:border-[#0066FF] focus:bg-white transition-all" />
            </div>
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Return (optional)</label>
              <input type="date" min={date || today} value={returnDate} onChange={e => setReturnDate(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.85rem] font-semibold text-[#1A1D2B] outline-none focus:border-[#0066FF] focus:bg-white transition-all" />
            </div>
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Passengers</label>
              <select value={passengers} onChange={e => setPassengers(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.85rem] font-semibold text-[#1A1D2B] outline-none focus:border-[#0066FF] focus:bg-white transition-all">
                {[1,2,3,4,5,6,7,8,9].map(n => <option key={n} value={n}>{n} passenger{n > 1 ? 's' : ''}</option>)}
              </select>
            </div>
          </div>
          <button onClick={openAll}
            className="w-full bg-[#0066FF] hover:bg-[#0052CC] text-white font-[Poppins] font-black text-[.95rem] py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(0,102,255,0.3)] hover:shadow-[0_6px_28px_rgba(0,102,255,0.4)]">
            Compare {PROVIDERS.length} Flight Providers →
          </button>
          <p className="text-center text-[.68rem] text-[#8E95A9] font-semibold mt-2.5">Opens all providers simultaneously in new tabs. Free. No booking fees.</p>
        </div>
      </section>

      {/* Provider grid */}
      <section className="max-w-[1100px] mx-auto px-5 pb-16">
        <p className="text-[.65rem] font-extrabold uppercase tracking-[3px] text-[#8E95A9] mb-1.5">All Providers</p>
        <h2 className="font-[Poppins] text-[1.4rem] font-black text-[#1A1D2B] mb-6">7 Flight Search Engines, One Click</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {PROVIDERS.map(p => (
            <a key={p.name} href={origin && dest && date ? p.getUrl(origin, dest, date) : '#'}
              onClick={e => { if (!origin || !dest || !date) { e.preventDefault(); alert('Fill in the search form above first'); } }}
              target="_blank" rel="noopener"
              className="block p-5 bg-white border border-[#F1F3F7] rounded-2xl hover:border-blue-200 hover:shadow-md transition-all group">
              <div className="text-2xl mb-3">{p.logo}</div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="font-[Poppins] font-extrabold text-[.92rem] text-[#1A1D2B]">{p.name}</span>
                <span className="text-[.58rem] font-black uppercase tracking-[1.5px] px-2 py-0.5 rounded-full bg-blue-50 text-[#0066FF]">{p.badge}</span>
              </div>
              <p className="text-[.75rem] text-[#5C6378] font-semibold leading-relaxed mb-3">{p.desc}</p>
              <span className="text-[.72rem] font-black text-[#0066FF] group-hover:underline">Search →</span>
            </a>
          ))}
        </div>
      </section>

      {/* Tips */}
      <section className="max-w-[860px] mx-auto px-5 pb-16">
        <div className="bg-[#F8FAFC] border border-[#F1F3F7] rounded-3xl p-8">
          <h3 className="font-[Poppins] font-black text-[1.05rem] text-[#1A1D2B] mb-4">Tips for Finding Cheaper Flights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              ['Book 6–8 weeks ahead', 'The sweet spot for domestic & short-haul. Long-haul is best 3–6 months out.'],
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
