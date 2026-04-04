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
    priceMult: 1.0,
    getUrl: (dest: string, dep: string, ret: string, adults: number, children: number) =>
      `https://www.expedia.co.uk/Holidays?destination=${encodeURIComponent(dest)}&startDate=${dep}&endDate=${ret}&adults=${adults}${children > 0 ? `&children=${children}` : ''}&affcid=clbU3QK`,
  },
  {
    name: 'Trip.com',
    logo: '🗺',
    badge: 'City Breaks',
    priceMult: 0.94,
    getUrl: (dest: string, dep: string, ret: string, adults: number, children: number) =>
      `https://www.trip.com/hotels/list?cityName=${encodeURIComponent(dest)}&checkin=${dep}&checkout=${ret}&adult=${adults}&child=${children}&Allianceid=8023009&SID=303363796&trip_sub1=&trip_sub3=D15021113`,
  },
  {
    name: 'Booking.com',
    logo: '🏨',
    badge: 'Flight+Hotel',
    priceMult: 1.02,
    getUrl: (dest: string, dep: string, ret: string, adults: number, children: number) =>
      `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(dest)}&checkin=${dep}&checkout=${ret}&group_adults=${adults}${children > 0 ? `&group_children=${children}` : ''}&no_rooms=1`,
  },
];

// Curated packages per destination
type CuratedPackage = { name: string; type: string; stars: number; board: string; priceFrom: number; duration: string; includes: string[]; highlights: string[]; photo: string };
const CURATED_PACKAGES: Record<string, CuratedPackage[]> = {
  Dubai: [
    { name: 'Dubai Beach & City Break', type: 'Flight + Hotel', stars: 4, board: 'Room Only', priceFrom: 499, duration: '7 nights', includes: ['Return flights', '4★ hotel', 'Airport transfers'], highlights: ['JBR Beach', 'Dubai Mall', 'Burj Khalifa views'], photo: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=640&h=480&fit=crop' },
    { name: 'Dubai Luxury All-Inclusive', type: 'All-Inclusive', stars: 5, board: 'All Inclusive', priceFrom: 1299, duration: '7 nights', includes: ['Return flights', '5★ resort', 'All meals & drinks', 'Spa access'], highlights: ['Palm Jumeirah', 'Private beach', 'Fine dining'], photo: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=640&h=480&fit=crop' },
    { name: 'Dubai Desert Safari Package', type: 'Flight + Hotel + Tour', stars: 4, board: 'Half Board', priceFrom: 599, duration: '5 nights', includes: ['Return flights', '4★ hotel', 'Desert safari tour', 'Dhow cruise dinner'], highlights: ['Dune bashing', 'Camel riding', 'BBQ dinner under stars'], photo: 'https://images.unsplash.com/photo-1451337516015-6b6e9a44a8a3?w=640&h=480&fit=crop' },
    { name: 'Dubai Shopping Getaway', type: 'City Break', stars: 3, board: 'Room Only', priceFrom: 399, duration: '4 nights', includes: ['Return flights', '3★ hotel', 'Metro pass'], highlights: ['Dubai Mall', 'Gold Souk', 'Mall of the Emirates'], photo: 'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?w=640&h=480&fit=crop' },
    { name: 'Abu Dhabi & Dubai Combo', type: 'Multi-City', stars: 4, board: 'Half Board', priceFrom: 799, duration: '10 nights', includes: ['Return flights', '4★ hotels', 'Inter-city transfer'], highlights: ['Louvre Abu Dhabi', 'Sheikh Zayed Mosque', 'Both cities'], photo: 'https://images.unsplash.com/photo-1597659840241-37e2b9c2f55f?w=640&h=480&fit=crop' },
  ],
  Antalya: [
    { name: 'Antalya Beach All-Inclusive', type: 'All-Inclusive', stars: 5, board: 'All Inclusive', priceFrom: 399, duration: '7 nights', includes: ['Return flights', '5★ resort', 'All meals & drinks', 'Pool & waterslides'], highlights: ['Lara Beach', 'Aquapark', 'Animation team'], photo: 'https://images.unsplash.com/photo-1568322503122-d237a9968485?w=640&h=480&fit=crop' },
    { name: 'Antalya Family Resort', type: 'Family Package', stars: 4, board: 'All Inclusive', priceFrom: 549, duration: '7 nights', includes: ['Return flights', '4★ family resort', 'All meals & drinks', 'Kids club'], highlights: ['Kids pool', 'Mini disco', 'Beach activities'], photo: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=640&h=480&fit=crop' },
    { name: 'Antalya Old Town & Beach', type: 'Flight + Hotel', stars: 3, board: 'Half Board', priceFrom: 299, duration: '7 nights', includes: ['Return flights', '3★ hotel', 'Breakfast & dinner'], highlights: ['Kaleiçi Old Town', 'Konyaaltı Beach', 'Hadrian\'s Gate'], photo: 'https://images.unsplash.com/photo-1589561454226-796a8c56d120?w=640&h=480&fit=crop' },
    { name: 'Turkish Riviera Luxury', type: 'Luxury Package', stars: 5, board: 'Full Board', priceFrom: 899, duration: '7 nights', includes: ['Return flights', '5★ spa resort', 'Full board', 'Spa treatment'], highlights: ['Belek golf', 'Private beach', 'Turkish hammam'], photo: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=640&h=480&fit=crop' },
    { name: 'Antalya Budget Getaway', type: 'Budget Package', stars: 3, board: 'Room Only', priceFrom: 199, duration: '7 nights', includes: ['Return flights', '3★ hotel'], highlights: ['Great value', 'Pool access', 'Near beach'], photo: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=640&h=480&fit=crop' },
  ],
  Maldives: [
    { name: 'Maldives Overwater Villa', type: 'All-Inclusive', stars: 5, board: 'All Inclusive', priceFrom: 1899, duration: '7 nights', includes: ['Return flights', '5★ water villa', 'All meals & drinks', 'Snorkelling gear'], highlights: ['Overwater bungalow', 'House reef', 'Sunset views'], photo: 'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=640&h=480&fit=crop' },
    { name: 'Maldives Budget Paradise', type: 'Flight + Hotel', stars: 4, board: 'Half Board', priceFrom: 899, duration: '7 nights', includes: ['Return flights', '4★ island resort', 'Breakfast & dinner'], highlights: ['White sand beach', 'Diving available', 'Island hopping'], photo: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=640&h=480&fit=crop' },
    { name: 'Maldives Honeymoon Escape', type: 'Luxury Package', stars: 5, board: 'Full Board', priceFrom: 2499, duration: '10 nights', includes: ['Return flights', 'Private villa', 'All meals', 'Couples spa', 'Sunset cruise'], highlights: ['Private pool', 'Candlelit dinner', 'Dolphin cruise'], photo: 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=640&h=480&fit=crop' },
  ],
  Tenerife: [
    { name: 'Tenerife Beach All-Inclusive', type: 'All-Inclusive', stars: 4, board: 'All Inclusive', priceFrom: 449, duration: '7 nights', includes: ['Return flights', '4★ resort', 'All meals & drinks', 'Pool'], highlights: ['Playa de las Américas', 'Year-round sun', 'Water park nearby'], photo: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=640&h=480&fit=crop' },
    { name: 'Tenerife Family Fun', type: 'Family Package', stars: 4, board: 'Half Board', priceFrom: 1299, duration: '7 nights', includes: ['Return flights (2+2)', '4★ family room', 'Breakfast & dinner', 'Siam Park tickets'], highlights: ['Siam Park', 'Loro Parque', 'Kids club'], photo: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=640&h=480&fit=crop' },
    { name: 'Tenerife Hiking & Nature', type: 'Activity Holiday', stars: 3, board: 'Room Only', priceFrom: 399, duration: '5 nights', includes: ['Return flights', '3★ hotel', 'Teide guided hike'], highlights: ['Mount Teide', 'Anaga forest', 'Stargazing'], photo: 'https://images.unsplash.com/photo-1586375300773-8384e3e4916f?w=640&h=480&fit=crop' },
  ],
  Barcelona: [
    { name: 'Barcelona City Break', type: 'Flight + Hotel', stars: 3, board: 'Room Only', priceFrom: 299, duration: '4 nights', includes: ['Return flights', '3★ central hotel', 'Metro pass'], highlights: ['La Sagrada Familia', 'Gothic Quarter', 'La Rambla'], photo: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=640&h=480&fit=crop' },
    { name: 'Barcelona Beach & Culture', type: 'Flight + Hotel', stars: 4, board: 'Half Board', priceFrom: 449, duration: '7 nights', includes: ['Return flights', '4★ beachfront hotel', 'Sagrada Familia tickets'], highlights: ['Barceloneta Beach', 'Park Güell', 'Tapas tours'], photo: 'https://images.unsplash.com/photo-1562883676-8c7feb83f09b?w=640&h=480&fit=crop' },
    { name: 'Costa Brava All-Inclusive', type: 'All-Inclusive', stars: 4, board: 'All Inclusive', priceFrom: 549, duration: '7 nights', includes: ['Return flights', '4★ resort', 'All meals & drinks'], highlights: ['Pool & beach', 'Day trip to Barcelona', 'Water sports'], photo: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=640&h=480&fit=crop' },
  ],
  'New York': [
    { name: 'NYC City Explorer', type: 'City Break', stars: 3, board: 'Room Only', priceFrom: 599, duration: '5 nights', includes: ['Return flights', '3★ Manhattan hotel', 'CityPASS (6 attractions)'], highlights: ['Times Square', 'Statue of Liberty', 'Central Park'], photo: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=640&h=480&fit=crop' },
    { name: 'New York Shopping & Shows', type: 'Flight + Hotel', stars: 4, board: 'Room Only', priceFrom: 799, duration: '5 nights', includes: ['Return flights', '4★ Midtown hotel', 'Broadway show ticket'], highlights: ['5th Avenue shopping', 'Broadway', 'Top of the Rock'], photo: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=640&h=480&fit=crop' },
    { name: 'NYC Luxury Experience', type: 'Luxury Package', stars: 5, board: 'Full Board', priceFrom: 1499, duration: '7 nights', includes: ['Return flights', '5★ hotel', 'Helicopter tour', 'Private transfers'], highlights: ['Helicopter over Manhattan', 'Fine dining', 'VIP experience'], photo: 'https://images.unsplash.com/photo-1455587734955-081b22074882?w=640&h=480&fit=crop' },
  ],
  Bangkok: [
    { name: 'Bangkok City & Temples', type: 'City Break', stars: 4, board: 'Half Board', priceFrom: 449, duration: '7 nights', includes: ['Return flights', '4★ hotel', 'Temple tour', 'River cruise'], highlights: ['Grand Palace', 'Wat Arun', 'Chatuchak Market'], photo: 'https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=640&h=480&fit=crop' },
    { name: 'Thailand Beach & City Combo', type: 'Multi-City', stars: 4, board: 'Half Board', priceFrom: 699, duration: '10 nights', includes: ['Return flights', '4★ hotels', 'Internal flight to Phuket'], highlights: ['Bangkok temples', 'Phuket beaches', 'Thai cooking class'], photo: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=640&h=480&fit=crop' },
    { name: 'Bangkok Budget Backpacker', type: 'Budget Package', stars: 2, board: 'Room Only', priceFrom: 349, duration: '7 nights', includes: ['Return flights', 'Hostel/budget hotel', 'Airport pickup'], highlights: ['Khao San Road', 'Street food', 'Night markets'], photo: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=640&h=480&fit=crop' },
  ],
  Rome: [
    { name: 'Rome & Vatican City Break', type: 'City Break', stars: 3, board: 'Room Only', priceFrom: 299, duration: '4 nights', includes: ['Return flights', '3★ central hotel', 'Vatican skip-the-line'], highlights: ['Colosseum', 'Vatican Museums', 'Trevi Fountain'], photo: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=640&h=480&fit=crop' },
    { name: 'Italian Highlights Multi-City', type: 'Multi-City', stars: 3, board: 'Half Board', priceFrom: 799, duration: '10 nights', includes: ['Return flights', '3★ hotels', 'Train passes (Rome-Florence-Venice)'], highlights: ['Rome', 'Florence', 'Venice', 'All by train'], photo: 'https://images.unsplash.com/photo-1534113414509-0eec2bfb493f?w=640&h=480&fit=crop' },
    { name: 'Amalfi Coast & Rome', type: 'Flight + Hotel', stars: 4, board: 'Half Board', priceFrom: 599, duration: '7 nights', includes: ['Return flights', '4★ hotels', 'Amalfi day trip'], highlights: ['Positano', 'Amalfi Coast', 'Roman ruins'], photo: 'https://images.unsplash.com/photo-1455587734955-081b22074882?w=640&h=480&fit=crop' },
  ],
  Paris: [
    { name: 'Paris Romantic Getaway', type: 'City Break', stars: 4, board: 'Room Only', priceFrom: 299, duration: '3 nights', includes: ['Return Eurostar/flights', '4★ hotel', 'Seine river cruise'], highlights: ['Eiffel Tower', 'Louvre Museum', 'Montmartre'], photo: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=640&h=480&fit=crop' },
    { name: 'Disneyland Paris Family', type: 'Family Package', stars: 3, board: 'Half Board', priceFrom: 499, duration: '3 nights', includes: ['Return transport', 'Disney hotel', '2-day park tickets'], highlights: ['Both Disney parks', 'Character dining', 'Disney Village'], photo: 'https://images.unsplash.com/photo-1549294413-26f195200c16?w=640&h=480&fit=crop' },
    { name: 'Paris Food & Wine Tour', type: 'Experience Package', stars: 4, board: 'Room Only', priceFrom: 599, duration: '5 nights', includes: ['Return flights', '4★ hotel', 'Food walking tour', 'Wine tasting'], highlights: ['Le Marais food tour', 'Champagne day trip', 'Cooking class'], photo: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=640&h=480&fit=crop' },
  ],
};

const BOARD_TYPES = ['Any', 'Room Only', 'Half Board', 'Full Board', 'All Inclusive'] as const;
const STAR_OPTIONS = ['Any', '2★', '3★', '4★', '5★'] as const;

function getPackagesForCity(city: string): CuratedPackage[] {
  const lc = city.toLowerCase().trim();
  for (const [key, pkgs] of Object.entries(CURATED_PACKAGES)) {
    if (key.toLowerCase() === lc) return pkgs;
  }
  return [
    { name: `${city} City Break`, type: 'Flight + Hotel', stars: 3, board: 'Room Only', priceFrom: 399, duration: '5 nights', includes: ['Return flights', '3★ hotel', 'Airport transfers'], highlights: ['City centre location', 'Guided walking tour', 'Local experience'], photo: '' },
    { name: `${city} All-Inclusive`, type: 'All-Inclusive', stars: 4, board: 'All Inclusive', priceFrom: 699, duration: '7 nights', includes: ['Return flights', '4★ resort', 'All meals & drinks'], highlights: ['Pool & beach access', 'Entertainment', 'Full board'], photo: '' },
    { name: `${city} Budget Explorer`, type: 'Budget Package', stars: 2, board: 'Room Only', priceFrom: 249, duration: '4 nights', includes: ['Return flights', 'Budget hotel'], highlights: ['Self-guided', 'Flexible schedule', 'Great value'], photo: '' },
    { name: `${city} Luxury Escape`, type: 'Luxury Package', stars: 5, board: 'Full Board', priceFrom: 1199, duration: '7 nights', includes: ['Return flights', '5★ hotel', 'Private transfers', 'Spa treatment'], highlights: ['Premium experience', 'Fine dining', 'VIP service'], photo: '' },
  ];
}

// ─── Guest Picker ───────────────────────────────────────────────────────────
function PkgGuestPicker({ adults, children, childrenAges, onChange }: {
  adults: number; children: number; childrenAges: number[];
  onChange: (a: number, c: number, ages: number[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  function setAdults(n: number) { onChange(n, children, childrenAges); }
  function setChildren(n: number) {
    const ages = [...childrenAges];
    while (ages.length < n) ages.push(5);
    onChange(adults, n, ages.slice(0, n));
  }
  function setChildAge(idx: number, age: number) {
    const ages = [...childrenAges];
    ages[idx] = age;
    onChange(adults, children, ages);
  }

  const label = [
    `${adults} Adult${adults !== 1 ? 's' : ''}`,
    children > 0 ? `${children} Child${children !== 1 ? 'ren' : ''}` : null,
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
          {/* Adults */}
          <div className="flex items-center justify-between py-3 border-b border-[#F1F3F7]">
            <div>
              <div className="font-[Poppins] font-bold text-[.85rem] text-[#1A1D2B]">Adults</div>
              <div className="text-[.7rem] text-[#8E95A9] font-medium">Age 16+</div>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setAdults(adults - 1)} disabled={adults <= 1}
                className="w-8 h-8 rounded-full border-2 border-[#E8ECF4] flex items-center justify-center text-[#5C6378] font-bold text-lg hover:border-purple-500 hover:text-purple-500 transition-all disabled:opacity-30">−</button>
              <span className="font-[Poppins] font-black text-[.95rem] text-[#1A1D2B] w-5 text-center">{adults}</span>
              <button type="button" onClick={() => setAdults(adults + 1)} disabled={adults >= 10}
                className="w-8 h-8 rounded-full border-2 border-[#E8ECF4] flex items-center justify-center text-[#5C6378] font-bold text-lg hover:border-purple-500 hover:text-purple-500 transition-all disabled:opacity-30">+</button>
            </div>
          </div>

          {/* Children */}
          <div className="flex items-center justify-between py-3 border-b border-[#F1F3F7]">
            <div>
              <div className="font-[Poppins] font-bold text-[.85rem] text-[#1A1D2B]">Children</div>
              <div className="text-[.7rem] text-[#8E95A9] font-medium">Age 0–15</div>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setChildren(children - 1)} disabled={children <= 0}
                className="w-8 h-8 rounded-full border-2 border-[#E8ECF4] flex items-center justify-center text-[#5C6378] font-bold text-lg hover:border-purple-500 hover:text-purple-500 transition-all disabled:opacity-30">−</button>
              <span className="font-[Poppins] font-black text-[.95rem] text-[#1A1D2B] w-5 text-center">{children}</span>
              <button type="button" onClick={() => setChildren(children + 1)} disabled={children >= 6}
                className="w-8 h-8 rounded-full border-2 border-[#E8ECF4] flex items-center justify-center text-[#5C6378] font-bold text-lg hover:border-purple-500 hover:text-purple-500 transition-all disabled:opacity-30">+</button>
            </div>
          </div>

          {/* Children age selectors */}
          {children > 0 && (
            <div className="py-3 border-b border-[#F1F3F7]">
              <p className="text-[.68rem] font-bold text-[#8E95A9] uppercase tracking-[1.5px] mb-2">Child ages (at time of travel)</p>
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: children }).map((_, i) => (
                  <div key={i} className="text-center">
                    <div className="text-[.6rem] text-[#8E95A9] mb-1">Child {i + 1}</div>
                    <select
                      value={childrenAges[i] ?? 5}
                      onChange={e => setChildAge(i, Number(e.target.value))}
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
            className="w-full mt-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-[Poppins] font-bold text-[.8rem] py-2.5 rounded-xl transition-colors">
            Done
          </button>
        </div>
      )}
    </div>
  );
}

function PackagesContent() {
  const [dest, setDest] = useState('');
  const [depDate, setDepDate] = useState('');
  const [retDate, setRetDate] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [childrenAges, setChildrenAges] = useState<number[]>([]);
  const [duration, setDuration] = useState('7');
  const [starFilter, setStarFilter] = useState('Any');
  const [boardFilter, setBoardFilter] = useState('Any');
  const [searched, setSearched] = useState(false);
  const [packages, setPackages] = useState<CuratedPackage[]>([]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const d = p.get('dest');
    const dep = p.get('departure');
    const ret = p.get('return');
    const a = p.get('adults');
    const c = p.get('children');
    if (d) setDest(d);
    if (dep) setDepDate(dep);
    if (ret) setRetDate(ret);
    if (a) setAdults(Math.max(1, parseInt(a)));
    if (c) setChildren(Math.max(0, parseInt(c)));
  }, []);

  const today = new Date().toISOString().split('T')[0];

  function handleSearch() {
    if (!dest || !depDate) { alert('Please enter a destination and departure date'); return; }
    let results = getPackagesForCity(dest);
    if (starFilter !== 'Any') {
      const minStars = parseInt(starFilter);
      results = results.filter(p => p.stars >= minStars);
    }
    if (boardFilter !== 'Any') {
      results = results.filter(p => p.board === boardFilter);
    }
    setPackages(results.length > 0 ? results : getPackagesForCity(dest));
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
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
              <PkgGuestPicker adults={adults} children={children} childrenAges={childrenAges}
                onChange={(a, c, ages) => { setAdults(a); setChildren(c); setChildrenAges(ages); }} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Duration</label>
              <select value={duration} onChange={e => setDuration(e.target.value)}
                className="w-full px-3 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.82rem] font-semibold text-[#1A1D2B] outline-none focus:border-purple-500 focus:bg-white transition-all">
                {[3,4,5,6,7,10,14,21].map(n => <option key={n} value={n}>{n} nights</option>)}
              </select>
            </div>
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
                {packages.length} packages · {adults} adult{adults !== 1 ? 's' : ''}{children > 0 ? ` · ${children} child${children !== 1 ? 'ren' : ''}` : ''} · from {depDate}
              </p>
            </div>
            <span className="text-[.7rem] font-bold text-purple-600 bg-purple-50 px-3 py-1.5 rounded-full">{packages.length} results</span>
          </div>

          <div className="space-y-4 mb-6">
            {packages.map((pkg, i) => {
              const hasPhoto = pkg.photo !== '';
              return (
                <div key={pkg.name} className="bg-white border border-[#E8ECF4] rounded-2xl overflow-hidden hover:shadow-lg transition-all">
                  <div className="flex flex-col md:flex-row">
                    {/* Photo */}
                    <div className="relative w-full md:w-72 h-48 md:h-auto flex-shrink-0 bg-[#F1F3F7] overflow-hidden">
                      {hasPhoto ? (
                        <img src={pkg.photo}
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
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <h3 className="font-[Poppins] font-bold text-[1.05rem] text-[#1A1D2B]">{pkg.name}</h3>
                          {pkg.stars > 0 && (
                            <span className="text-[.7rem] font-bold text-amber-500">{'★'.repeat(pkg.stars)}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-[.72rem] text-[#8E95A9] font-semibold">{pkg.duration} · {pkg.type}</span>
                          <span className="text-[.6rem] font-black uppercase tracking-[1px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">{pkg.board}</span>
                        </div>

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

                      {/* Price comparison per provider */}
                      <div className="border-t border-[#F1F3F7] pt-3 mt-1">
                        <p className="text-[.62rem] text-[#8E95A9] font-semibold mb-2">COMPARE PRICES PER PERSON</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {PROVIDERS.map((p, pi) => {
                            const estPrice = Math.round(pkg.priceFrom * p.priceMult + ((pi * 7 + pkg.priceFrom) % 23) - 11);
                            const isCheapest = PROVIDERS.every((op, oi) => {
                              const opPrice = Math.round(pkg.priceFrom * op.priceMult + ((oi * 7 + pkg.priceFrom) % 23) - 11);
                              return estPrice <= opPrice;
                            });
                            return (
                              <a key={p.name} href={p.getUrl(dest, depDate, retDate, adults, children)} target="_blank" rel="noopener"
                                className={`relative flex flex-col items-center gap-0.5 rounded-xl px-3 py-2.5 transition-all group border ${isCheapest ? 'bg-green-50 border-green-300 hover:border-green-400' : 'bg-[#F8FAFC] border-[#E8ECF4] hover:border-purple-200 hover:bg-purple-50'}`}>
                                {isCheapest && (
                                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[.5rem] font-black uppercase tracking-wider bg-green-500 text-white px-2 py-0.5 rounded-full">Cheapest</span>
                                )}
                                <span className="text-base">{p.logo}</span>
                                <span className="text-[.68rem] font-bold text-[#1A1D2B]">{p.name}</span>
                                <span className={`font-[Poppins] font-black text-[1rem] leading-none ${isCheapest ? 'text-green-600' : 'text-[#1A1D2B]'}`}>£{estPrice.toLocaleString()}</span>
                                <span className="text-[.55rem] text-[#8E95A9] font-medium">per person</span>
                                <span className="text-[.6rem] text-purple-500 font-bold mt-0.5 group-hover:underline">View Deal →</span>
                              </a>
                            );
                          })}
                        </div>
                        <p className="text-[.55rem] text-[#8E95A9] font-medium mt-2 text-center">Estimated prices · click any provider for live availability & final pricing</p>
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
