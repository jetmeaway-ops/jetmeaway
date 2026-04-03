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
        className="w-full px-4 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.9rem] font-semibold text-[#1A1D2B] outline-none focus:border-purple-500 focus:bg-white transition-all placeholder:text-[#B0B8CC] placeholder:font-medium" />
      {open && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1.5 bg-white border border-[#E8ECF4] rounded-2xl shadow-2xl overflow-hidden">
          {results.map(c => (
            <li key={c} onMouseDown={() => { onChange(c); setOpen(false); }}
              className="px-4 py-3 hover:bg-purple-50 cursor-pointer transition-colors border-b border-[#F1F3F7] last:border-0 font-[Poppins] font-semibold text-[.88rem] text-[#1A1D2B]">
              {c}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const PROVIDERS = [
  {
    name: 'Expedia',
    logo: '🌍',
    desc: 'Flight + hotel bundles saving up to 30% vs booking separately.',
    badge: 'Best Bundles',
    getUrl: (dest: string, dep: string, ret: string, guests: string) =>
      `https://www.expedia.co.uk/Vacations/search?destination=${encodeURIComponent(dest)}&startDate=${dep}&endDate=${ret}&adults=${guests}`,
  },
  {
    name: 'On the Beach',
    logo: '🏖',
    desc: 'Best UK-departure beach holiday packages from £199pp.',
    badge: 'UK Favourite',
    getUrl: (dest: string, dep: string) =>
      `https://www.onthebeach.co.uk/holidays/search?destination=${encodeURIComponent(dest)}&depDate=${dep}`,
  },
  {
    name: 'Jet2Holidays',
    logo: '✈',
    desc: 'Award-winning UK package holidays with ATOL protection.',
    badge: 'ATOL Protected',
    getUrl: (dest: string, dep: string) =>
      `https://www.jet2holidays.com/search?destination=${encodeURIComponent(dest)}&departing=${dep}`,
  },
  {
    name: 'TUI',
    logo: '🌴',
    desc: 'All-inclusive resorts & villa holidays worldwide.',
    badge: 'All-Inclusive',
    getUrl: (dest: string) =>
      `https://www.tui.co.uk/destinations/${encodeURIComponent(dest.toLowerCase().replace(/ /g, '-'))}/holidays.html`,
  },
  {
    name: 'Trip.com',
    logo: '🗺',
    desc: 'City breaks & Asia packages with exclusive flash deals.',
    badge: 'City Breaks',
    getUrl: (dest: string) =>
      `https://uk.trip.com/holidays/${encodeURIComponent(dest)}`,
  },
  {
    name: 'WeGoTrip',
    logo: '🎫',
    desc: 'Guided tours & experience packages from local experts.',
    badge: 'Guided Tours',
    getUrl: (dest: string) =>
      `https://wegotrip.com/en/catalog?q=${encodeURIComponent(dest)}`,
  },
  {
    name: 'GetYourGuide',
    logo: '🎟',
    desc: 'Experiences, tours & activities at your destination.',
    badge: 'Activities',
    getUrl: (dest: string) =>
      `https://www.getyourguide.com/${encodeURIComponent(dest.toLowerCase().replace(/ /g, '-'))}-l`,
  },
  {
    name: 'Klook',
    logo: '🎪',
    desc: 'Theme parks, day trips & tours across Asia & beyond.',
    badge: 'Asia & Beyond',
    getUrl: (dest: string) =>
      `https://www.klook.com/en-GB/search?query=${encodeURIComponent(dest)}`,
  },
];

export default function PackagesPage() {
  const [dest, setDest] = useState('');
  const [depDate, setDepDate] = useState('');
  const [retDate, setRetDate] = useState('');
  const [guests, setGuests] = useState('2');
  const [duration, setDuration] = useState('7');

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const d = p.get('dest');
    const dep = p.get('departure');
    const ret = p.get('return');
    const g = p.get('guests');
    if (d) setDest(d);
    if (dep) setDepDate(dep);
    if (ret) setRetDate(ret);
    if (g) setGuests(g);
  }, []);

  const today = new Date().toISOString().split('T')[0];

  function openAll() {
    if (!dest || !depDate) { alert('Please enter a destination and departure date'); return; }
    PROVIDERS.forEach((p, i) => {
      setTimeout(() => window.open(p.getUrl(dest, depDate, retDate, guests), '_blank', 'noopener'), i * 200);
    });
  }

  return (
    <>
      <Header />

      <section className="pt-36 pb-16 px-5 bg-[radial-gradient(ellipse_at_top,#F0E8FF_0%,#fff_55%,#F8FAFC_100%)] relative">
        <div className="max-w-[860px] mx-auto text-center mb-10">
          <span className="inline-block bg-purple-50 text-purple-600 text-[.65rem] font-black uppercase tracking-[2.5px] px-3.5 py-1.5 rounded-full mb-4">📦 Holiday Packages</span>
          <h1 className="font-[Poppins] text-[2.6rem] md:text-[3.8rem] font-black text-[#1A1D2B] leading-[1.05] tracking-tight mb-3">
            Complete <em className="italic bg-gradient-to-br from-purple-500 to-indigo-600 bg-clip-text text-transparent">Holiday</em> Packages
          </h1>
          <p className="text-[1rem] text-[#8E95A9] font-semibold max-w-[520px] mx-auto">Flight + hotel bundles, all-inclusives, city breaks & guided tours — all in one place.</p>
        </div>

        <div className="max-w-[860px] mx-auto bg-white border border-[#E8ECF4] rounded-3xl p-6 shadow-[0_8px_40px_rgba(0,0,0,0.07)]">
          <div className="mb-3">
            <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Destination</label>
            <CityPicker value={dest} onChange={setDest} placeholder="Where do you want to go? — e.g. Maldives, New York, Bali, Dubai" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
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
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Guests</label>
              <select value={guests} onChange={e => setGuests(e.target.value)}
                className="w-full px-3 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.82rem] font-semibold text-[#1A1D2B] outline-none focus:border-purple-500 focus:bg-white transition-all">
                {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} {n === 1 ? 'person' : 'people'}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Duration</label>
              <select value={duration} onChange={e => setDuration(e.target.value)}
                className="w-full px-3 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.82rem] font-semibold text-[#1A1D2B] outline-none focus:border-purple-500 focus:bg-white transition-all">
                {[3,4,5,6,7,10,14,21].map(n => <option key={n} value={n}>{n} nights</option>)}
              </select>
            </div>
          </div>
          <button onClick={openAll}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-[Poppins] font-black text-[.95rem] py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(124,58,237,0.3)]">
            Compare {PROVIDERS.length} Holiday Platforms →
          </button>
          <p className="text-center text-[.68rem] text-[#8E95A9] font-semibold mt-2.5">ATOL-protected options included. Book direct with providers.</p>
        </div>
      </section>

      <section className="max-w-[1100px] mx-auto px-5 pb-16">
        <p className="text-[.65rem] font-extrabold uppercase tracking-[3px] text-[#8E95A9] mb-1.5">All Providers</p>
        <h2 className="font-[Poppins] text-[1.4rem] font-black text-[#1A1D2B] mb-6">8 Holiday & Experience Platforms</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PROVIDERS.map(p => (
            <a key={p.name} href={dest ? p.getUrl(dest, depDate, retDate, guests) : '#'}
              onClick={e => { if (!dest || !depDate) { e.preventDefault(); alert('Fill in the search form above first'); } }}
              target="_blank" rel="noopener"
              className="block p-5 bg-white border border-[#F1F3F7] rounded-2xl hover:border-purple-200 hover:shadow-md transition-all group">
              <div className="text-2xl mb-3">{p.logo}</div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="font-[Poppins] font-extrabold text-[.88rem] text-[#1A1D2B]">{p.name}</span>
                <span className="text-[.58rem] font-black uppercase tracking-[1.5px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">{p.badge}</span>
              </div>
              <p className="text-[.75rem] text-[#5C6378] font-semibold leading-relaxed mb-3">{p.desc}</p>
              <span className="text-[.72rem] font-black text-purple-600 group-hover:underline">Explore →</span>
            </a>
          ))}
        </div>
      </section>

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
