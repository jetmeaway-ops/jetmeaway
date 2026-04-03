'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
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
    badge: 'Best Bundles',
    getUrl: (dest: string, dep: string, ret: string, guests: string) =>
      `https://www.expedia.co.uk/Vacations/search?destination=${encodeURIComponent(dest)}&startDate=${dep}&endDate=${ret}&adults=${guests}&affcid=clbU3QK`,
  },
  {
    name: 'On the Beach',
    logo: '🏖',
    badge: 'UK Favourite',
    getUrl: (dest: string, dep: string) =>
      `https://www.onthebeach.co.uk/holidays/search?destination=${encodeURIComponent(dest)}&depDate=${dep}`,
  },
  {
    name: 'Jet2Holidays',
    logo: '✈',
    badge: 'ATOL Protected',
    getUrl: (dest: string, dep: string) =>
      `https://www.jet2holidays.com/search?destination=${encodeURIComponent(dest)}&departing=${dep}`,
  },
  {
    name: 'TUI',
    logo: '🌴',
    badge: 'All-Inclusive',
    getUrl: (dest: string) =>
      `https://www.tui.co.uk/destinations/${encodeURIComponent(dest.toLowerCase().replace(/ /g, '-'))}/holidays.html`,
  },
  {
    name: 'Trip.com',
    logo: '🗺',
    badge: 'City Breaks',
    getUrl: (dest: string) =>
      `https://uk.trip.com/holidays/${encodeURIComponent(dest)}?Allianceid=8023009&SID=303363796`,
  },
  {
    name: 'Booking.com',
    logo: '🏨',
    badge: 'Flight+Hotel',
    getUrl: (dest: string, dep: string, ret: string, guests: string) =>
      `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(dest)}&checkin=${dep}&checkout=${ret}&group_adults=${guests}&no_rooms=1`,
  },
];

// Curated packages per destination
type CuratedPackage = { name: string; type: string; priceFrom: number; duration: string; includes: string[]; highlights: string[]; photoId: number };
const CURATED_PACKAGES: Record<string, CuratedPackage[]> = {
  Dubai: [
    { name: 'Dubai Beach & City Break', type: 'Flight + Hotel', priceFrom: 499, duration: '7 nights', includes: ['Return flights', '4★ hotel', 'Airport transfers'], highlights: ['JBR Beach', 'Dubai Mall', 'Burj Khalifa views'], photoId: 96491 },
    { name: 'Dubai Luxury All-Inclusive', type: 'All-Inclusive', priceFrom: 1299, duration: '7 nights', includes: ['Return flights', '5★ resort', 'All meals & drinks', 'Spa access'], highlights: ['Palm Jumeirah', 'Private beach', 'Fine dining'], photoId: 7598 },
    { name: 'Dubai Desert Safari Package', type: 'Flight + Hotel + Tour', priceFrom: 599, duration: '5 nights', includes: ['Return flights', '4★ hotel', 'Desert safari tour', 'Dhow cruise dinner'], highlights: ['Dune bashing', 'Camel riding', 'BBQ dinner under stars'], photoId: 289855 },
    { name: 'Dubai Shopping Getaway', type: 'City Break', priceFrom: 399, duration: '4 nights', includes: ['Return flights', '3★ hotel', 'Metro pass'], highlights: ['Dubai Mall', 'Gold Souk', 'Mall of the Emirates'], photoId: 1073498 },
    { name: 'Abu Dhabi & Dubai Combo', type: 'Multi-City', priceFrom: 799, duration: '10 nights', includes: ['Return flights', '4★ hotels', 'Inter-city transfer'], highlights: ['Louvre Abu Dhabi', 'Sheikh Zayed Mosque', 'Both cities'], photoId: 7742 },
  ],
  Maldives: [
    { name: 'Maldives Overwater Villa', type: 'All-Inclusive', priceFrom: 1899, duration: '7 nights', includes: ['Return flights', '5★ water villa', 'All meals & drinks', 'Snorkelling gear'], highlights: ['Overwater bungalow', 'House reef', 'Sunset views'], photoId: 37162 },
    { name: 'Maldives Budget Paradise', type: 'Flight + Hotel', priceFrom: 899, duration: '7 nights', includes: ['Return flights', '4★ island resort', 'Half board'], highlights: ['White sand beach', 'Diving available', 'Island hopping'], photoId: 73178 },
    { name: 'Maldives Honeymoon Escape', type: 'Luxury Package', priceFrom: 2499, duration: '10 nights', includes: ['Return flights', 'Private villa', 'Full board', 'Couples spa', 'Sunset cruise'], highlights: ['Private pool', 'Candlelit dinner', 'Dolphin cruise'], photoId: 75494 },
  ],
  Tenerife: [
    { name: 'Tenerife Beach All-Inclusive', type: 'All-Inclusive', priceFrom: 449, duration: '7 nights', includes: ['Return flights', '4★ resort', 'All meals & drinks', 'Pool'], highlights: ['Playa de las Américas', 'Year-round sun', 'Water park nearby'], photoId: 0 },
    { name: 'Tenerife Family Fun', type: 'Family Package', priceFrom: 1299, duration: '7 nights', includes: ['Return flights (2+2)', '4★ family room', 'Half board', 'Siam Park tickets'], highlights: ['Siam Park', 'Loro Parque', 'Kids club'], photoId: 0 },
    { name: 'Tenerife Hiking & Nature', type: 'Activity Holiday', priceFrom: 399, duration: '5 nights', includes: ['Return flights', '3★ hotel', 'Teide guided hike'], highlights: ['Mount Teide', 'Anaga forest', 'Stargazing'], photoId: 0 },
  ],
  Barcelona: [
    { name: 'Barcelona City Break', type: 'Flight + Hotel', priceFrom: 299, duration: '4 nights', includes: ['Return flights', '3★ central hotel', 'Metro pass'], highlights: ['La Sagrada Familia', 'Gothic Quarter', 'La Rambla'], photoId: 62539 },
    { name: 'Barcelona Beach & Culture', type: 'Flight + Hotel', priceFrom: 449, duration: '7 nights', includes: ['Return flights', '4★ beachfront hotel', 'Sagrada Familia tickets'], highlights: ['Barceloneta Beach', 'Park Güell', 'Tapas tours'], photoId: 15296 },
    { name: 'Costa Brava All-Inclusive', type: 'All-Inclusive', priceFrom: 549, duration: '7 nights', includes: ['Return flights', '4★ resort', 'All meals & drinks'], highlights: ['Pool & beach', 'Day trip to Barcelona', 'Water sports'], photoId: 24574 },
  ],
  'New York': [
    { name: 'NYC City Explorer', type: 'City Break', priceFrom: 599, duration: '5 nights', includes: ['Return flights', '3★ Manhattan hotel', 'CityPASS (6 attractions)'], highlights: ['Times Square', 'Statue of Liberty', 'Central Park'], photoId: 4627 },
    { name: 'New York Shopping & Shows', type: 'Flight + Hotel', priceFrom: 799, duration: '5 nights', includes: ['Return flights', '4★ Midtown hotel', 'Broadway show ticket'], highlights: ['5th Avenue shopping', 'Broadway', 'Top of the Rock'], photoId: 258766 },
    { name: 'NYC Luxury Experience', type: 'Luxury Package', priceFrom: 1499, duration: '7 nights', includes: ['Return flights', '5★ hotel', 'Helicopter tour', 'Private transfers'], highlights: ['Helicopter over Manhattan', 'Fine dining', 'VIP experience'], photoId: 60476 },
  ],
  Bangkok: [
    { name: 'Bangkok City & Temples', type: 'City Break', priceFrom: 449, duration: '7 nights', includes: ['Return flights', '4★ hotel', 'Temple tour', 'River cruise'], highlights: ['Grand Palace', 'Wat Arun', 'Chatuchak Market'], photoId: 3012 },
    { name: 'Thailand Beach & City Combo', type: 'Multi-City', priceFrom: 699, duration: '10 nights', includes: ['Return flights', '4★ hotels', 'Internal flight to Phuket'], highlights: ['Bangkok temples', 'Phuket beaches', 'Thai cooking class'], photoId: 292419 },
    { name: 'Bangkok Budget Backpacker', type: 'Budget Package', priceFrom: 349, duration: '7 nights', includes: ['Return flights', 'Hostel/budget hotel', 'Airport pickup'], highlights: ['Khao San Road', 'Street food', 'Night markets'], photoId: 322785 },
  ],
  Rome: [
    { name: 'Rome & Vatican City Break', type: 'City Break', priceFrom: 299, duration: '4 nights', includes: ['Return flights', '3★ central hotel', 'Vatican skip-the-line'], highlights: ['Colosseum', 'Vatican Museums', 'Trevi Fountain'], photoId: 8878 },
    { name: 'Italian Highlights Multi-City', type: 'Multi-City', priceFrom: 799, duration: '10 nights', includes: ['Return flights', '3★ hotels', 'Train passes (Rome-Florence-Venice)'], highlights: ['Rome', 'Florence', 'Venice', 'All by train'], photoId: 16654 },
    { name: 'Amalfi Coast & Rome', type: 'Flight + Hotel', priceFrom: 599, duration: '7 nights', includes: ['Return flights', '4★ hotels', 'Amalfi day trip'], highlights: ['Positano', 'Amalfi Coast', 'Roman ruins'], photoId: 137994 },
  ],
  Paris: [
    { name: 'Paris Romantic Getaway', type: 'City Break', priceFrom: 299, duration: '3 nights', includes: ['Return Eurostar/flights', '4★ hotel', 'Seine river cruise'], highlights: ['Eiffel Tower', 'Louvre Museum', 'Montmartre'], photoId: 24866 },
    { name: 'Disneyland Paris Family', type: 'Family Package', priceFrom: 499, duration: '3 nights', includes: ['Return transport', 'Disney hotel', '2-day park tickets'], highlights: ['Both Disney parks', 'Character dining', 'Disney Village'], photoId: 42985 },
    { name: 'Paris Food & Wine Tour', type: 'Experience Package', priceFrom: 599, duration: '5 nights', includes: ['Return flights', '4★ hotel', 'Food walking tour', 'Wine tasting'], highlights: ['Le Marais food tour', 'Champagne day trip', 'Cooking class'], photoId: 37048 },
  ],
};

function getPackagesForCity(city: string): CuratedPackage[] {
  const lc = city.toLowerCase().trim();
  for (const [key, pkgs] of Object.entries(CURATED_PACKAGES)) {
    if (key.toLowerCase() === lc) return pkgs;
  }
  return [
    { name: `${city} City Break`, type: 'Flight + Hotel', priceFrom: 399, duration: '5 nights', includes: ['Return flights', '3★ hotel', 'Airport transfers'], highlights: ['City centre location', 'Guided walking tour', 'Local experience'], photoId: 0 },
    { name: `${city} All-Inclusive`, type: 'All-Inclusive', priceFrom: 699, duration: '7 nights', includes: ['Return flights', '4★ resort', 'All meals & drinks'], highlights: ['Pool & beach access', 'Entertainment', 'Full board'], photoId: 0 },
    { name: `${city} Budget Explorer`, type: 'Budget Package', priceFrom: 249, duration: '4 nights', includes: ['Return flights', 'Budget hotel'], highlights: ['Self-guided', 'Flexible schedule', 'Great value'], photoId: 0 },
    { name: `${city} Luxury Escape`, type: 'Luxury Package', priceFrom: 1199, duration: '7 nights', includes: ['Return flights', '5★ hotel', 'Private transfers', 'Spa treatment'], highlights: ['Premium experience', 'Fine dining', 'VIP service'], photoId: 0 },
  ];
}

function PackagesContent() {
  const [dest, setDest] = useState('');
  const [depDate, setDepDate] = useState('');
  const [retDate, setRetDate] = useState('');
  const [guests, setGuests] = useState('2');
  const [duration, setDuration] = useState('7');
  const [searched, setSearched] = useState(false);
  const [packages, setPackages] = useState<CuratedPackage[]>([]);

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

  function handleSearch() {
    if (!dest || !depDate) { alert('Please enter a destination and departure date'); return; }
    setPackages(getPackagesForCity(dest));
    setSearched(true);
    setTimeout(() => document.getElementById('package-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }

  return (
    <>
      <Header />

      <section className="pt-36 pb-10 px-5 bg-[radial-gradient(ellipse_at_top,#F0E8FF_0%,#fff_55%,#F8FAFC_100%)] relative">
        <div className="max-w-[860px] mx-auto text-center mb-8">
          <span className="inline-block bg-purple-50 text-purple-600 text-[.65rem] font-black uppercase tracking-[2.5px] px-3.5 py-1.5 rounded-full mb-4">📦 Holiday Packages</span>
          <h1 className="font-[Poppins] text-[2.4rem] md:text-[3.6rem] font-black text-[#1A1D2B] leading-[1.05] tracking-tight mb-3">
            Complete <em className="italic bg-gradient-to-br from-purple-500 to-indigo-600 bg-clip-text text-transparent">Holiday</em> Packages
          </h1>
          <p className="text-[1rem] text-[#8E95A9] font-semibold max-w-[520px] mx-auto">Flight + hotel bundles, all-inclusives & city breaks — compare prices across 6 platforms.</p>
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
          <button onClick={handleSearch}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-[Poppins] font-black text-[.95rem] py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(124,58,237,0.3)]">
            Search Packages →
          </button>
          <p className="text-center text-[.68rem] text-[#8E95A9] font-semibold mt-2.5">ATOL-protected options included. Book direct with providers.</p>
        </div>
      </section>

      {/* Package Results */}
      {searched && packages.length > 0 && (
        <section id="package-results" className="max-w-[1100px] mx-auto px-5 py-10">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
            <div>
              <h2 className="font-[Poppins] font-black text-[1.3rem] text-[#1A1D2B]">
                Packages to {dest}
              </h2>
              <p className="text-[.72rem] text-[#8E95A9] font-semibold mt-0.5">
                {packages.length} packages · {guests} guest{guests !== '1' ? 's' : ''} · from {depDate}
              </p>
            </div>
            <span className="text-[.7rem] font-bold text-purple-600 bg-purple-50 px-3 py-1.5 rounded-full">{packages.length} results</span>
          </div>

          <div className="space-y-4 mb-6">
            {packages.map((pkg, i) => {
              const hasPhoto = pkg.photoId > 0;
              return (
                <div key={pkg.name} className="bg-white border border-[#E8ECF4] rounded-2xl overflow-hidden hover:shadow-lg transition-all">
                  <div className="flex flex-col md:flex-row">
                    {/* Photo */}
                    <div className="relative w-full md:w-72 h-48 md:h-auto flex-shrink-0 bg-[#F1F3F7] overflow-hidden">
                      {hasPhoto ? (
                        <img src={`https://photo.hotellook.com/image_v2/crop/h${pkg.photoId}/640/480.auto`}
                          alt={pkg.name} className="w-full h-full object-cover"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-5xl text-[#C0C8D8]">📦</div>
                      )}
                      {i === 0 && (
                        <span className="absolute top-3 left-3 text-[.6rem] font-black uppercase tracking-[1.5px] bg-purple-600 text-white px-2.5 py-1 rounded-full shadow-md">Best Value</span>
                      )}
                      <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-[.6rem] font-black uppercase tracking-[1px] text-purple-600 px-2 py-0.5 rounded-full">
                        {pkg.type}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 p-5 flex flex-col">
                      <div className="flex-1">
                        <h3 className="font-[Poppins] font-bold text-[1.05rem] text-[#1A1D2B] mb-0.5">{pkg.name}</h3>
                        <p className="text-[.72rem] text-[#8E95A9] font-semibold mb-2">{pkg.duration} · {pkg.type}</p>

                        {/* What's included */}
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {pkg.includes.map(inc => (
                            <span key={inc} className="flex items-center gap-1 text-[.62rem] font-bold text-green-700 bg-green-50 px-2 py-1 rounded-full">
                              <span className="text-green-500">✓</span> {inc}
                            </span>
                          ))}
                        </div>

                        {/* Highlights */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {pkg.highlights.map(hl => (
                            <span key={hl} className="text-[.62rem] font-bold text-[#5C6378] bg-[#F1F3F7] px-2.5 py-1 rounded-full">{hl}</span>
                          ))}
                        </div>
                      </div>

                      {/* Price + providers */}
                      <div className="border-t border-[#F1F3F7] pt-3 mt-1">
                        <div className="flex items-end justify-between mb-3">
                          <div>
                            <span className="text-[.62rem] text-[#8E95A9] font-semibold">from</span>
                            <div className="font-[Poppins] font-black text-[1.4rem] text-[#1A1D2B] leading-none">£{pkg.priceFrom.toLocaleString()}<span className="text-[.7rem] font-semibold text-[#8E95A9]">pp</span></div>
                            <span className="text-[.6rem] text-[#8E95A9] font-medium">per person · prices vary by provider & date</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {PROVIDERS.slice(0, 4).map(p => (
                            <a key={p.name} href={p.getUrl(dest, depDate, retDate, guests)} target="_blank" rel="noopener"
                              className="flex items-center gap-1.5 bg-[#F8FAFC] hover:bg-purple-50 border border-[#E8ECF4] hover:border-purple-200 rounded-lg px-3 py-2 transition-all group">
                              <span className="text-sm">{p.logo}</span>
                              <span className="text-[.7rem] font-bold text-[#1A1D2B] group-hover:text-purple-600">{p.name}</span>
                              <span className="text-[.65rem] text-purple-500 font-bold">→</span>
                            </a>
                          ))}
                          <a href={PROVIDERS[4].getUrl(dest, depDate, retDate, guests)} target="_blank" rel="noopener"
                            className="flex items-center gap-1.5 bg-[#F8FAFC] hover:bg-purple-50 border border-[#E8ECF4] hover:border-purple-200 rounded-lg px-3 py-2 transition-all group">
                            <span className="text-[.7rem] font-bold text-[#8E95A9] group-hover:text-purple-600">+2 more</span>
                            <span className="text-[.65rem] text-purple-500 font-bold">→</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-center text-[.68rem] text-[#8E95A9] font-semibold">
            Prices are estimated starting prices per person. Click any provider for live availability and final pricing.
          </p>
        </section>
      )}

      {/* Tips */}
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
  return (
    <Suspense>
      <PackagesContent />
    </Suspense>
  );
}
