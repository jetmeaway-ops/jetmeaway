'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { redirectUrl } from '@/lib/redirect';

/* ═══════════════════════════════════════════════════════════════════════════
   DESTINATIONS
   ═══════════════════════════════════════════════════════════════════════════ */

const DESTINATIONS = [
  'Barcelona', 'Dubai', 'Rome', 'Paris', 'London', 'Istanbul', 'Amsterdam',
  'Tenerife', 'Antalya', 'Bangkok', 'Tokyo', 'New York', 'Lisbon', 'Crete',
  'Marrakech', 'Bali', 'Singapore', 'Athens', 'Prague', 'Budapest',
];

/* ═══════════════════════════════════════════════════════════════════════════
   PROVIDERS
   ═══════════════════════════════════════════════════════════════════════════ */

function buildGetYourGuideUrl(dest: string): string {
  return `https://www.getyourguide.co.uk/s/?q=${encodeURIComponent(dest)}&searchSource=1&partner_id=SsZyZ48h&cmp=jetmeaway`;
}

function buildViatorUrl(dest: string): string {
  return `https://www.viator.com/searchResults/all?text=${encodeURIComponent(dest)}&pid=P00293856&mcid=42383&medium=link`;
}

function buildKlookUrl(dest: string): string {
  return `https://klook.tpk.lu/CByEYa65?city=${encodeURIComponent(dest)}`;
}

function buildTiqetsUrl(dest: string): string {
  const u = `https://www.tiqets.com/en/search?q=${encodeURIComponent(dest)}`;
  return `https://tp.media/r?marker=714449&trs=512633&p=8972&u=${encodeURIComponent(u)}`;
}

function buildWeGoTripUrl(dest: string): string {
  const u = `https://wegotrip.com/en/?search=${encodeURIComponent(dest)}`;
  return `https://tp.media/r?marker=714449&trs=512633&p=9221&u=${encodeURIComponent(u)}`;
}

type Provider = {
  name: string;
  logo: string;
  tagline: string;
  points: string[];
  color: string;
  getUrl: (dest: string) => string;
};

const PROVIDERS: Provider[] = [
  {
    name: 'GetYourGuide',
    logo: '🎫',
    tagline: '450,000+ activities worldwide',
    points: ['Free cancellation up to 24h', 'Instant confirmation', 'Mobile tickets'],
    color: 'border-l-blue-500',
    getUrl: buildGetYourGuideUrl,
  },
  {
    name: 'Viator',
    logo: '🗺',
    tagline: 'A TripAdvisor company — trusted reviews',
    points: ['300,000+ experiences', 'Lowest price guarantee', 'Verified reviews'],
    color: 'border-l-green-500',
    getUrl: buildViatorUrl,
  },
  {
    name: 'Klook',
    logo: '🎟',
    tagline: 'Best for Asia, growing in Europe',
    points: ['Exclusive deals', 'Instant e-tickets', 'Best price guarantee'],
    color: 'border-l-orange-500',
    getUrl: buildKlookUrl,
  },
  {
    name: 'Tiqets',
    logo: '🏛',
    tagline: 'Museums, attractions & instant e-tickets',
    points: ['Skip-the-line tickets', 'Last-minute booking', 'Flexible cancellation'],
    color: 'border-l-purple-500',
    getUrl: buildTiqetsUrl,
  },
  {
    name: 'WeGoTrip',
    logo: '🎧',
    tagline: 'Self-guided audio tours',
    points: ['Go at your own pace', 'Available offline', 'Unique local stories'],
    color: 'border-l-rose-500',
    getUrl: buildWeGoTripUrl,
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   CURATED EXPERIENCES
   ═══════════════════════════════════════════════════════════════════════════ */

const CURATED: Record<string, { name: string; type: string; from: number; provider: string }[]> = {
  'barcelona': [
    { name: 'Sagrada Familia: Skip-the-Line Guided Tour', type: 'Tours', from: 35, provider: 'GetYourGuide' },
    { name: 'Tapas & Wine Walking Tour', type: 'Food', from: 49, provider: 'Viator' },
    { name: 'Park Guell Skip-the-Line Entry', type: 'Attractions', from: 13, provider: 'Tiqets' },
    { name: 'Gothic Quarter Audio Walking Tour', type: 'Tours', from: 8, provider: 'WeGoTrip' },
    { name: 'Montserrat Half-Day Trip', type: 'Day Trips', from: 45, provider: 'GetYourGuide' },
    { name: 'Sailing Cruise with Drinks', type: 'Adventure', from: 55, provider: 'Klook' },
  ],
  'dubai': [
    { name: 'Desert Safari with BBQ Dinner', type: 'Adventure', from: 35, provider: 'GetYourGuide' },
    { name: 'Burj Khalifa: At the Top Tickets', type: 'Attractions', from: 40, provider: 'Tiqets' },
    { name: 'Abu Dhabi Full-Day Tour', type: 'Day Trips', from: 55, provider: 'Viator' },
    { name: 'Dubai Marina Yacht Cruise', type: 'Adventure', from: 25, provider: 'Klook' },
    { name: 'Old Dubai Walking Audio Tour', type: 'Tours', from: 6, provider: 'WeGoTrip' },
    { name: 'Aquaventure Waterpark', type: 'Family', from: 65, provider: 'GetYourGuide' },
  ],
  'rome': [
    { name: 'Colosseum, Forum & Palatine Skip-the-Line', type: 'Tours', from: 45, provider: 'GetYourGuide' },
    { name: 'Vatican Museums & Sistine Chapel', type: 'Tours', from: 35, provider: 'Tiqets' },
    { name: 'Trastevere Food Tour', type: 'Food', from: 58, provider: 'Viator' },
    { name: 'Rome in a Day Audio Tour', type: 'Tours', from: 9, provider: 'WeGoTrip' },
    { name: 'Pompeii Day Trip from Rome', type: 'Day Trips', from: 85, provider: 'GetYourGuide' },
    { name: 'Borghese Gallery Skip-the-Line', type: 'Attractions', from: 20, provider: 'Tiqets' },
  ],
  'paris': [
    { name: 'Eiffel Tower Summit Access', type: 'Attractions', from: 35, provider: 'GetYourGuide' },
    { name: 'Louvre Museum Skip-the-Line', type: 'Attractions', from: 22, provider: 'Tiqets' },
    { name: 'Seine River Dinner Cruise', type: 'Adventure', from: 75, provider: 'Viator' },
    { name: 'Montmartre Audio Walking Tour', type: 'Tours', from: 7, provider: 'WeGoTrip' },
    { name: 'Versailles Full-Day Tour', type: 'Day Trips', from: 69, provider: 'GetYourGuide' },
    { name: 'Paris Catacombs Skip-the-Line', type: 'Attractions', from: 29, provider: 'Tiqets' },
  ],
};

/* ═══════════════════════════════════════════════════════════════════════════
   POPULAR DESTINATIONS WITH PHOTOS
   ═══════════════════════════════════════════════════════════════════════════ */

const POPULAR = [
  { name: 'Barcelona', photo: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=400&h=300&fit=crop', count: 2400 },
  { name: 'Dubai', photo: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=300&fit=crop', count: 1800 },
  { name: 'Rome', photo: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400&h=300&fit=crop', count: 2100 },
  { name: 'Paris', photo: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=300&fit=crop', count: 3200 },
  { name: 'Istanbul', photo: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=400&h=300&fit=crop', count: 1500 },
  { name: 'Amsterdam', photo: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=400&h=300&fit=crop', count: 1200 },
  { name: 'Marrakech', photo: 'https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=400&h=300&fit=crop', count: 800 },
  { name: 'Bangkok', photo: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=400&h=300&fit=crop', count: 1600 },
];

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

function DestinationPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = { current: null as HTMLDivElement | null };

  const q = value.toLowerCase().trim();
  const filtered = q.length >= 1
    ? DESTINATIONS.filter(d => d.toLowerCase().includes(q)).slice(0, 8)
    : DESTINATIONS.slice(0, 10);

  return (
    <div ref={el => { ref.current = el; }} className="relative">
      <input type="text" placeholder="City — e.g. Barcelona, Dubai, Rome" value={value} autoComplete="off"
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        className="w-full px-4 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.9rem] font-semibold text-[#1A1D2B] outline-none focus:border-teal-400 focus:bg-white transition-all placeholder:text-[#B0B8CC]" />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 w-full mt-1.5 bg-white border border-[#E8ECF4] rounded-2xl shadow-2xl overflow-auto max-h-64">
          {filtered.map(c => (
            <li key={c} onMouseDown={() => { onChange(c); setOpen(false); }}
              className={`px-4 py-3 hover:bg-teal-50 cursor-pointer transition-colors border-b border-[#F1F3F7] last:border-0 font-[Poppins] font-semibold text-[.88rem] text-[#1A1D2B] ${value === c ? 'bg-teal-50' : ''}`}>
              🧭 {c}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

function ExploreContent() {
  const [destination, setDestination] = useState('');
  const [searched, setSearched] = useState(false);
  const [searchedDest, setSearchedDest] = useState('');

  // Read URL params
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const dest = p.get('destination') || p.get('dest') || '';
    if (dest) {
      setDestination(dest);
      setSearchedDest(dest);
      setSearched(true);
    }
  }, []);

  const handleSearch = () => {
    if (!destination) return;
    setSearchedDest(destination);
    setSearched(true);
  };

  const destKey = searchedDest.toLowerCase();
  const experiences = CURATED[destKey] || [];

  return (
    <>
      <Header />

      {/* Hero */}
      <section className="pt-36 pb-10 px-5 bg-[radial-gradient(ellipse_at_top,#F0FDF4_0%,#fff_55%,#F8FAFC_100%)]">
        <div className="max-w-[860px] mx-auto text-center mb-8">
          <span className="inline-block bg-teal-50 text-teal-600 text-[.65rem] font-black uppercase tracking-[2.5px] px-3.5 py-1.5 rounded-full mb-4">🧭 Explore</span>
          <h1 className="font-[Poppins] text-[2.4rem] md:text-[3.6rem] font-black text-[#1A1D2B] leading-[1.05] tracking-tight mb-3">
            Things To <em className="italic bg-gradient-to-br from-teal-500 to-emerald-600 bg-clip-text text-transparent">Do</em>
          </h1>
          <p className="text-[1rem] text-[#8E95A9] font-semibold max-w-[520px] mx-auto">Compare activities, tours & experiences from 5 trusted providers.</p>
        </div>

        <div className="max-w-[860px] mx-auto bg-white border border-[#E8ECF4] rounded-3xl p-6 shadow-[0_8px_40px_rgba(20,184,166,0.08)]">
          <div className="mb-3">
            <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Destination</label>
            <DestinationPicker value={destination} onChange={setDestination} />
          </div>
          <button onClick={handleSearch} className="w-full bg-teal-500 hover:bg-teal-600 text-white font-[Poppins] font-black text-[.95rem] py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(20,184,166,0.3)]">
            Explore Activities →
          </button>
        </div>
      </section>

      {/* Results */}
      {searched && (
        <>
          {/* Provider cards */}
          <section className="max-w-[900px] mx-auto px-5 pt-8 pb-6">
            <h2 className="font-[Poppins] font-black text-[1.1rem] text-[#1A1D2B] mb-2">
              Search {searchedDest} on 5 providers
            </h2>
            <p className="text-[.78rem] text-[#8E95A9] font-semibold mb-5">
              Each provider has different activities and prices — compare them all
            </p>
            <div className="space-y-4">
              {PROVIDERS.map(p => {
                const url = p.getUrl(searchedDest);
                return (
                  <div key={p.name} className={`bg-white border border-[#E8ECF4] ${p.color} border-l-4 rounded-2xl p-6 hover:shadow-md transition-all`}>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-[200px]">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{p.logo}</span>
                          <div>
                            <h3 className="font-[Poppins] font-black text-[1rem] text-[#1A1D2B]">{p.name}</h3>
                            <p className="text-[.72rem] text-[#8E95A9] font-semibold">{p.tagline}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-3 mt-3">
                          {p.points.map(pt => (
                            <span key={pt} className="text-[.68rem] font-semibold text-[#5C6378] bg-[#F8FAFC] border border-[#F1F3F7] px-2.5 py-1 rounded-full">
                              ✓ {pt}
                            </span>
                          ))}
                        </div>
                      </div>
                      <a href={redirectUrl(url, p.name, searchedDest, 'explore')}
                        className="bg-teal-500 hover:bg-teal-600 text-white font-[Poppins] font-bold text-[.82rem] px-6 py-3 rounded-xl transition-all whitespace-nowrap shadow-sm">
                        Search {p.name} →
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Curated experiences (if available) */}
          {experiences.length > 0 && (
            <section className="max-w-[900px] mx-auto px-5 pb-6">
              <h2 className="font-[Poppins] font-black text-[1.1rem] text-[#1A1D2B] mb-4">
                Top experiences in {searchedDest}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {experiences.map((exp, i) => {
                  const prov = PROVIDERS.find(p => p.name === exp.provider);
                  const url = prov ? prov.getUrl(searchedDest) : '#';
                  return (
                    <div key={i} className="bg-white border border-[#E8ECF4] rounded-2xl p-5 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <span className="text-[.6rem] font-black uppercase tracking-[1.5px] text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">{exp.type}</span>
                          <h3 className="font-[Poppins] font-bold text-[.88rem] text-[#1A1D2B] mt-2 mb-1">{exp.name}</h3>
                          <p className="text-[.72rem] text-[#8E95A9] font-semibold">via {exp.provider}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-[Poppins] font-black text-[1.2rem] text-[#1A1D2B]">£{exp.from}</div>
                          <div className="text-[.6rem] text-[#8E95A9] font-semibold">from</div>
                        </div>
                      </div>
                      <a href={redirectUrl(url, exp.provider, searchedDest, 'explore')}
                        className="mt-3 block w-full text-center bg-teal-50 hover:bg-teal-100 text-teal-700 font-[Poppins] font-bold text-[.75rem] py-2.5 rounded-xl transition-all border border-teal-200">
                        View on {exp.provider} →
                      </a>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Cross-sell */}
          <section className="max-w-[900px] mx-auto px-5 pb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5">
              <span className="text-2xl mb-2 block">✈</span>
              <h3 className="font-[Poppins] font-black text-[.9rem] text-[#1A1D2B] mb-1">Flights to {searchedDest}</h3>
              <p className="text-[.75rem] text-[#5C6378] font-semibold mb-3">Compare across 5 providers.</p>
              <a href={`/flights?to=${encodeURIComponent(searchedDest)}`}
                className="inline-block px-4 py-2 rounded-xl border-2 border-[#0066FF] text-[#0066FF] font-[Poppins] font-bold text-[.75rem] hover:bg-blue-50 transition-colors">
                Compare Flights →
              </a>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 rounded-2xl p-5">
              <span className="text-2xl mb-2 block">🏨</span>
              <h3 className="font-[Poppins] font-black text-[.9rem] text-[#1A1D2B] mb-1">Hotels in {searchedDest}</h3>
              <p className="text-[.75rem] text-[#5C6378] font-semibold mb-3">Find and compare the best rates.</p>
              <a href={`/hotels?destination=${encodeURIComponent(searchedDest)}`}
                className="inline-block px-4 py-2 rounded-xl border-2 border-orange-500 text-orange-500 font-[Poppins] font-bold text-[.75rem] hover:bg-orange-50 transition-colors">
                Compare Hotels →
              </a>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 rounded-2xl p-5">
              <span className="text-2xl mb-2 block">📦</span>
              <h3 className="font-[Poppins] font-black text-[.9rem] text-[#1A1D2B] mb-1">Package to {searchedDest}</h3>
              <p className="text-[.75rem] text-[#5C6378] font-semibold mb-3">Flight + hotel bundles.</p>
              <a href={`/packages?dest=${encodeURIComponent(searchedDest)}`}
                className="inline-block px-4 py-2 rounded-xl border-2 border-purple-500 text-purple-500 font-[Poppins] font-bold text-[.75rem] hover:bg-purple-50 transition-colors">
                View Packages →
              </a>
            </div>
          </section>
        </>
      )}

      {/* Popular destinations (when not searched) */}
      {!searched && (
        <section className="max-w-[1000px] mx-auto px-5 py-8">
          <h2 className="font-[Poppins] font-black text-[1.1rem] text-[#1A1D2B] mb-4">Popular Destinations for Activities</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {POPULAR.map(d => (
              <button key={d.name} onClick={() => { setDestination(d.name); setSearchedDest(d.name); setSearched(true); }}
                className="group relative rounded-2xl overflow-hidden h-44 block border border-[#E8ECF4] hover:shadow-lg transition-all text-left">
                <img src={d.photo} alt={d.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="font-[Poppins] font-black text-white text-[.95rem]">{d.name}</div>
                  <div className="text-[.65rem] text-white/70 font-semibold">{d.count.toLocaleString()}+ activities</div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Tips */}
      <section className="max-w-[860px] mx-auto px-5 pb-16">
        <div className="bg-[#F8FAFC] border border-[#F1F3F7] rounded-3xl p-8">
          <h3 className="font-[Poppins] font-black text-[1.05rem] text-[#1A1D2B] mb-4">Tips for Booking Activities</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              ['Book skip-the-line tickets', 'Popular attractions sell out fast. Skip-the-line tickets save hours of waiting.'],
              ['Compare across providers', 'The same tour can be 20-30% cheaper on one provider vs another.'],
              ['Check cancellation policies', 'Look for free cancellation up to 24h before — plans change.'],
              ['Book combo deals', 'Multi-attraction passes often save 30-40% vs individual tickets.'],
            ].map(([title, body]) => (
              <div key={title} className="flex gap-3">
                <div className="w-1.5 flex-shrink-0 rounded-full bg-gradient-to-b from-teal-400 to-emerald-500 self-stretch" />
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

export default function ExplorePage() {
  return <ExploreContent />;
}
