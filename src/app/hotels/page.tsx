'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { redirectUrl } from '@/lib/redirect';

const ScoutSidebar = dynamic(() => import('@/components/ScoutSidebar'), { ssr: false });
const HotelMap = dynamic(() => import('@/components/HotelMap'), { ssr: false });

type SortBy = 'recommended' | 'price-asc' | 'price-desc' | 'distance';
type ViewMode = 'list' | 'map';

/* ═══════════════════════════════════════════════════════════════════════════
   DESTINATIONS
   ═══════════════════════════════════════════════════════════════════════════ */

const DESTINATIONS = [
  // UK
  'London', 'Manchester', 'Birmingham', 'Edinburgh', 'Glasgow', 'Liverpool',
  'Bristol', 'Leeds', 'Newcastle', 'Belfast', 'Cardiff', 'Aberdeen', 'Inverness',
  'Bath', 'Oxford', 'Cambridge', 'Brighton', 'York',
  // Spain
  'Barcelona', 'Madrid', 'Malaga', 'Tenerife', 'Lanzarote', 'Fuerteventura',
  'Gran Canaria', 'Palma', 'Alicante', 'Seville', 'Valencia', 'Granada',
  'Ibiza', 'Marbella', 'San Sebastian', 'Bilbao', 'Cadiz',
  // Portugal
  'Faro', 'Lisbon', 'Porto', 'Madeira', 'Azores',
  // France
  'Paris', 'Nice', 'Lyon', 'Marseille', 'Bordeaux', 'Toulouse', 'Strasbourg',
  'Cannes', 'Monaco',
  // Netherlands
  'Amsterdam', 'Rotterdam', 'The Hague',
  // Belgium
  'Brussels', 'Bruges', 'Antwerp',
  // Germany
  'Berlin', 'Munich', 'Frankfurt', 'Hamburg', 'Cologne', 'Dusseldorf',
  // Austria
  'Vienna', 'Salzburg', 'Innsbruck',
  // Switzerland
  'Zurich', 'Geneva', 'Lucerne', 'Interlaken', 'Zermatt', 'Leukerbad', 'Basel',
  'Bern', 'Lausanne', 'St Moritz', 'Davos', 'Grindelwald', 'Montreux', 'Lugano',
  // Italy
  'Rome', 'Venice', 'Florence', 'Milan', 'Naples', 'Amalfi', 'Sorrento',
  'Turin', 'Bologna', 'Verona', 'Sardinia', 'Sicily', 'Lake Como',
  // Greece
  'Athens', 'Crete', 'Rhodes', 'Corfu', 'Santorini', 'Mykonos', 'Zakynthos',
  'Thessaloniki', 'Kos', 'Kefalonia',
  // Croatia
  'Dubrovnik', 'Split', 'Zagreb', 'Zadar', 'Pula',
  // Turkey
  'Antalya', 'Bodrum', 'Dalaman', 'Istanbul', 'Fethiye', 'Marmaris', 'Izmir', 'Cappadocia',
  // Scandinavia
  'Copenhagen', 'Stockholm', 'Oslo', 'Helsinki', 'Reykjavik',
  // Eastern Europe
  'Prague', 'Budapest', 'Warsaw', 'Krakow', 'Bucharest', 'Sofia', 'Tallinn',
  'Riga', 'Vilnius', 'Ljubljana',
  // Cyprus & Malta
  'Larnaca', 'Paphos', 'Limassol', 'Malta', 'Gozo',
  // Morocco
  'Marrakech', 'Casablanca', 'Fez', 'Tangier', 'Agadir',
  // Egypt
  'Sharm El Sheikh', 'Hurghada', 'Cairo', 'Luxor',
  // Tunisia
  'Tunis', 'Hammamet',
  // Indian Ocean
  'Maldives', 'Mauritius', 'Seychelles', 'Zanzibar', 'Madagascar',
  // Pakistan
  'Lahore', 'Islamabad', 'Karachi', 'Peshawar', 'Faisalabad', 'Multan',
  // India & Sri Lanka
  'Mumbai', 'Delhi', 'Goa', 'Colombo', 'Jaipur', 'Bangalore', 'Chennai',
  'Hyderabad', 'Kerala', 'Agra',
  // Middle East
  'Dubai', 'Abu Dhabi', 'Doha', 'Amman', 'Beirut', 'Riyadh', 'Jeddah',
  'Muscat', 'Kuwait City', 'Bahrain', 'Sharjah', 'Medina', 'Aqaba',
  // Southeast Asia
  'Bangkok', 'Phuket', 'Bali', 'Singapore', 'Kuala Lumpur', 'Jakarta',
  'Hanoi', 'Ho Chi Minh City', 'Chiang Mai', 'Manila', 'Koh Samui',
  'Langkawi', 'Siem Reap', 'Phnom Penh',
  // East Asia
  'Tokyo', 'Hong Kong', 'Shanghai', 'Beijing', 'Seoul', 'Kyoto', 'Osaka',
  'Taipei',
  // Oceania
  'Sydney', 'Melbourne', 'Auckland', 'Queenstown', 'Gold Coast', 'Perth',
  'Brisbane', 'Fiji',
  // Africa
  'Cape Town', 'Johannesburg', 'Nairobi', 'Lagos', 'Accra', 'Addis Ababa',
  'Dar es Salaam', 'Dakar', 'Kigali', 'Victoria Falls',
  // Caribbean
  'Barbados', 'Jamaica', 'St Lucia', 'Punta Cana', 'Turks and Caicos',
  'Antigua', 'Aruba', 'Trinidad',
  // Americas
  'New York', 'Los Angeles', 'Orlando', 'Cancun', 'Mexico City', 'Toronto',
  'Buenos Aires', 'Lima', 'Bogota', 'Havana', 'Miami', 'Las Vegas',
  'San Francisco', 'Chicago', 'Boston', 'Washington DC', 'Vancouver',
  'Montreal', 'Rio de Janeiro', 'Sao Paulo', 'Cartagena', 'Panama City',
  'Playa del Carmen',
  // Caucasus & Central Asia
  'Baku', 'Yerevan', 'Tbilisi', 'Ashgabat', 'Tashkent',
  'Almaty', 'Astana', 'Bishkek', 'Dushanbe',
];

/* ═══════════════════════════════════════════════════════════════════════════
   PROVIDER DEEP LINKS (only affiliated providers)
   ═══════════════════════════════════════════════════════════════════════════ */

function buildKlookUrl(dest: string): string {
  return `https://www.klook.com/en-GB/search/?query=${encodeURIComponent(dest + ' hotels')}&spm=SearchResult.SearchResult_LIST&clickFrom=HOME_SEARCH&aid=CByEYa65`;
}

function buildTripcomUrl(dest: string, cin: string, cout: string, adults: number): string {
  const slug = dest.toLowerCase().replace(/\s+/g, '-');
  return `https://www.trip.com/hotels/${slug}-hotels-list/?checkin=${cin}&checkout=${cout}&adult=${adults}&curr=GBP&Allianceid=8023009&SID=303363796&trip_sub3=D15021113`;
}

function buildExpediaUrl(dest: string, cin: string, cout: string, adults: number): string {
  return `https://www.expedia.co.uk/Hotel-Search?destination=${encodeURIComponent(dest)}&startDate=${cin}&endDate=${cout}&adults=${adults}&affcid=clbU3QK`;
}

type Provider = { name: string; logo: string; getUrl: (dest: string, cin: string, cout: string, adults: number) => string };

const PROVIDERS: Provider[] = [
  { name: 'Klook', logo: '🎟', getUrl: (d) => buildKlookUrl(d) },
  { name: 'Trip.com', logo: '🗺', getUrl: (d, ci, co, a) => buildTripcomUrl(d, ci, co, a) },
  { name: 'Expedia', logo: '🌍', getUrl: (d, ci, co, a) => buildExpediaUrl(d, ci, co, a) },
];

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

type BoardOption = {
  offerId: string;
  boardType: string;
  totalPrice: number;
  pricePerNight: number;
  refundable: boolean;
};

type DealHotel = {
  id: string;
  offerId: string | null;
  name: string;
  stars: number;
  pricePerNight: number;
  totalPrice: number;
  thumbnail: string | null;
  boardType: string | null;
  refundable: boolean;
  district: string | null;
};

type DealDestination = {
  city: string;
  country: string;
  flag: string;
  photo: string;
  tag?: string;
  cheapestPrice: number | null;
  topHotel: DealHotel | null;
  budgetHotel: DealHotel | null;
  premiumHotel: DealHotel | null;
  hotelCount: number;
  checkin: string;
  checkout: string;
};

type HotelResult = {
  id: number | string;
  name: string;
  stars: number;
  pricePerNight: number;
  location: string;
  district: string | null;
  lat?: number;
  lng?: number;
  // LiteAPI-sourced bookable fields (present when source === 'liteapi')
  source?: 'liteapi' | 'curated';
  bookable?: boolean;
  offerId?: string;
  totalPrice?: number;
  currency?: string;
  thumbnail?: string | null;
  refundable?: boolean;
  boardType?: string | null;
  boardOptions?: BoardOption[];
};

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

function DestinationPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const q = value.toLowerCase().trim();
  const filtered = q.length >= 1
    ? DESTINATIONS.filter(d => d.toLowerCase().includes(q)).slice(0, 8)
    : DESTINATIONS.slice(0, 10);

  return (
    <div ref={ref} className="relative">
      <input type="text" placeholder="Any city or town worldwide" value={value} autoComplete="off"
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className="w-full px-4 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.9rem] font-semibold text-[#1A1D2B] outline-none focus:border-orange-400 focus:bg-white transition-all placeholder:text-[#B0B8CC]" />
      {open && (
        <ul className="absolute z-50 w-full mt-1.5 bg-white border border-[#E8ECF4] rounded-2xl shadow-2xl overflow-auto max-h-64">
          {filtered.length > 0 ? filtered.map(c => (
            <li key={c} onMouseDown={() => { onChange(c); setOpen(false); }}
              className={`px-4 py-3 hover:bg-orange-50 cursor-pointer transition-colors border-b border-[#F1F3F7] last:border-0 font-poppins font-semibold text-[.88rem] text-[#1A1D2B] ${value === c ? 'bg-orange-50' : ''}`}>
              {c}
            </li>
          )) : q.length >= 2 ? (
            <li onMouseDown={() => { setOpen(false); }}
              className="px-4 py-3 cursor-pointer hover:bg-orange-50 transition-colors font-poppins font-semibold text-[.88rem] text-[#1A1D2B]">
              <span className="text-orange-500">Search &quot;{value}&quot;</span>
              <span className="text-[#8E95A9] text-[.8rem] ml-2">— we cover cities worldwide</span>
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );
}

/**
 * OccupancyPicker — adults, children, rooms in a single dropdown.
 * Caps: 6 adults, 4 children, 3 rooms.
 */
function OccupancyPicker({
  adults, children, rooms, childrenAges, onChange,
}: {
  adults: number;
  children: number;
  rooms: number;
  childrenAges: number[];
  onChange: (next: { adults: number; children: number; rooms: number; childrenAges: number[] }) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  function setChildren(n: number) {
    const ages = [...childrenAges];
    while (ages.length < n) ages.push(5);
    onChange({ adults, children: n, rooms, childrenAges: ages.slice(0, n) });
  }
  function setChildAge(idx: number, age: number) {
    const ages = [...childrenAges];
    ages[idx] = age;
    onChange({ adults, children, rooms, childrenAges: ages });
  }

  const Row = ({ label, sublabel, value, min, max, onSet }: { label: string; sublabel?: string; value: number; min: number; max: number; onSet: (v: number) => void }) => (
    <div className="flex items-center justify-between py-2">
      <div>
        <span className="font-poppins font-bold text-[.85rem] text-[#1A1D2B]">{label}</span>
        {sublabel && <div className="text-[.7rem] text-[#8E95A9]">{sublabel}</div>}
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => onSet(Math.max(min, value - 1))}
          className="w-8 h-8 rounded-full border-2 border-[#E8ECF4] flex items-center justify-center text-[#5C6378] font-bold text-lg hover:border-orange-400 transition-all disabled:opacity-30" disabled={value <= min}>−</button>
        <span className="font-poppins font-black text-[.95rem] text-[#1A1D2B] w-5 text-center">{value}</span>
        <button type="button" onClick={() => onSet(Math.min(max, value + 1))}
          className="w-8 h-8 rounded-full border-2 border-[#E8ECF4] flex items-center justify-center text-[#5C6378] font-bold text-lg hover:border-orange-400 transition-all disabled:opacity-30" disabled={value >= max}>+</button>
      </div>
    </div>
  );

  const label = `${adults} Adult${adults !== 1 ? 's' : ''}${children > 0 ? ` · ${children} Child${children !== 1 ? 'ren' : ''}` : ''} · ${rooms} Room${rooms !== 1 ? 's' : ''}`;

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full px-4 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-left text-[.78rem] font-semibold text-[#1A1D2B] outline-none focus:border-orange-400 hover:bg-white transition-all flex items-center justify-between whitespace-nowrap">
        <span className="truncate">{label}</span>
        <span className="text-[#B0B8CC] text-xs ml-2">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div className="absolute z-50 w-64 mt-1.5 right-0 bg-white border border-[#E8ECF4] rounded-2xl shadow-2xl p-4">
          <Row label="Adults" value={adults} min={1} max={10}
            onSet={(v) => onChange({ adults: v, children, rooms, childrenAges })} />
          <Row label="Children" sublabel="Age 0–17" value={children} min={0} max={5}
            onSet={(v) => setChildren(v)} />
          {children > 0 && (
            <div className="py-2 border-t border-[#F1F3F7]">
              <p className="text-[.68rem] font-bold text-[#8E95A9] uppercase tracking-[1.5px] mb-2">Child ages</p>
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: children }).map((_, i) => (
                  <div key={i} className="text-center">
                    <div className="text-[.6rem] text-[#8E95A9] mb-1">Child {i + 1}</div>
                    <select value={childrenAges[i] ?? 5} onChange={e => setChildAge(i, Number(e.target.value))}
                      className="w-full text-center text-[.8rem] font-bold text-[#1A1D2B] bg-[#F8FAFC] border border-[#E8ECF4] rounded-lg py-1.5 outline-none focus:border-orange-400">
                      {Array.from({ length: 18 }, (_, a) => a).map(age => (
                        <option key={age} value={age}>{age < 1 ? 'Under 1' : age}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
          <Row label="Rooms" value={rooms} min={1} max={5}
            onSet={(v) => onChange({ adults, children, rooms: v, childrenAges })} />
          <button type="button" onClick={() => setOpen(false)}
            className="w-full mt-3 bg-orange-500 hover:bg-orange-600 text-white font-poppins font-bold text-[.8rem] py-2 rounded-xl transition-colors">
            Done
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * StarFilter — pill selector for hotel class (any / 3★+ / 4★+ / 5★).
 * "Any" is the default; picking a minimum filters search results server-side.
 */
function StarFilter({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const options: { label: string; value: number }[] = [
    { label: 'Any', value: 0 },
    { label: '3★+', value: 3 },
    { label: '4★+', value: 4 },
    { label: '5★', value: 5 },
  ];
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {options.map(o => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 rounded-full text-[.72rem] font-poppins font-bold border transition-all ${value === o.value ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-[#5C6378] border-[#E8ECF4] hover:border-orange-400'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   BOOK DIRECT (LiteAPI) — creates a pending booking then redirects to checkout
   ═══════════════════════════════════════════════════════════════════════════ */

function HotelCardWrapper({ hotel, index, isCheapest, nights, adults, checkin, checkout, searchedDest, buildDetailHref, setScoutHotel, priceView }: {
  hotel: HotelResult;
  index: number;
  isCheapest: boolean;
  nights: number;
  adults: number;
  checkin: string;
  checkout: string;
  searchedDest: string;
  buildDetailHref: (h: HotelResult) => string;
  setScoutHotel: (s: { name: string; lat: number; lng: number } | null) => void;
  priceView: 'total' | 'perPerson';
}) {
  const [selectedBoard, setSelectedBoard] = useState(0);
  const h = hotel;
  const opts = h.boardOptions;
  const active = opts && opts[selectedBoard] ? opts[selectedBoard] : null;

  // Use the selected board's price/offerId if available
  const displayPrice = active ? active.pricePerNight : h.pricePerNight;
  const displayTotal = active ? active.totalPrice : (h.totalPrice ?? Math.round(h.pricePerNight * (nights || 1) * 100) / 100);
  const displayOfferId = active ? active.offerId : h.offerId;
  const displayBoard = active ? active.boardType : h.boardType;
  const displayRefundable = active ? active.refundable : h.refundable;

  const HOTEL_PHOTOS = [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=640&h=480&fit=crop',
    'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=640&h=480&fit=crop',
    'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=640&h=480&fit=crop',
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=640&h=480&fit=crop',
    'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=640&h=480&fit=crop',
    'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=640&h=480&fit=crop',
    'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=640&h=480&fit=crop',
    'https://images.unsplash.com/photo-1455587734955-081b22074882?w=640&h=480&fit=crop',
    'https://images.unsplash.com/photo-1587213811864-46e59f6873b1?w=640&h=480&fit=crop',
    'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=640&h=480&fit=crop',
  ];
  const photoUrl = h.thumbnail || HOTEL_PHOTOS[index % HOTEL_PHOTOS.length];
  const klookUrl = buildKlookUrl(searchedDest);
  const tripUrl = buildTripcomUrl(searchedDest, checkin, checkout, adults);
  const expediaUrl = buildExpediaUrl(searchedDest, checkin, checkout, adults);
  const detailHref = buildDetailHref(h);

  // Build a modified hotel object with the selected board's offerId for BookDirect
  const bookHotel = { ...h, offerId: displayOfferId, totalPrice: displayTotal, pricePerNight: displayPrice };

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden transition-shadow hover:shadow-md ${isCheapest ? 'border-orange-200 ring-1 ring-orange-100' : 'border-[#E8ECF4]'}`}>
      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr_auto] gap-0">
        {/* Image */}
        <a href={detailHref} className="relative h-48 md:h-full min-h-[180px] block group">
          {photoUrl ? (
            <img src={photoUrl} alt={h.name} loading="lazy"
              className="w-full h-full object-cover group-hover:brightness-95 transition-all"
              onError={(e) => {
                const el = e.target as HTMLImageElement;
                el.style.display = 'none';
                el.parentElement!.classList.add('bg-gradient-to-br', 'from-orange-100', 'to-amber-50');
                el.parentElement!.innerHTML = '<div class="flex items-center justify-center h-full"><span class="text-4xl">🛏</span></div>';
              }} />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-100 to-amber-50 flex items-center justify-center">
              <span className="text-4xl">🛏</span>
            </div>
          )}
          {isCheapest && (
            <span className="absolute top-3 left-3 text-[.55rem] font-black uppercase tracking-[1.5px] bg-orange-500 text-white px-2 py-1 rounded-full">Cheapest</span>
          )}
        </a>

        {/* Info */}
        <div className="p-5 flex flex-col justify-center">
          <a href={detailHref} className="hover:bg-[#F8FAFC] transition-colors">
            <div className="mb-1"><Stars count={h.stars} /></div>
            <h3 className="font-poppins font-black text-[1.05rem] text-[#1A1D2B] mb-1">{h.name}</h3>
            {h.district && <p className="text-[.75rem] text-[#8E95A9] font-semibold mb-2">📍 {h.district}</p>}
            {nights > 0 && <p className="text-[.72rem] text-[#5C6378] font-semibold">{nights} night{nights !== 1 ? 's' : ''} · {adults} guest{adults !== 1 ? 's' : ''}</p>}
            {h.bookable && typeof displayRefundable === 'boolean' && (
              <span className={`inline-flex items-center gap-1 mt-1.5 text-[.68rem] font-bold ${displayRefundable ? 'text-green-600' : 'text-red-500'}`}>
                <i className={`fa-solid ${displayRefundable ? 'fa-circle-check' : 'fa-circle-xmark'} text-[.6rem]`} />
                {displayRefundable ? 'Free cancellation' : 'Non-refundable'}
              </span>
            )}
            {displayBoard && !opts && (
              <span className="text-[.66rem] text-[#8E95A9] font-semibold mt-0.5 block">{displayBoard}</span>
            )}
          </a>
          {opts && opts.length > 1 && (
            <BoardSelector options={opts} selected={selectedBoard} onSelect={setSelectedBoard} />
          )}
          <a href={detailHref} className="text-[.7rem] text-orange-600 font-bold mt-2 inline-block">View details →</a>
        </div>

        {/* Price + Actions */}
        <div className="p-5 flex flex-col items-end justify-center gap-2 border-t md:border-t-0 md:border-l border-[#F1F3F7]">
          <div className="text-right">
            {priceView === 'perPerson' ? (
              <>
                <div className="font-poppins font-black text-[1.5rem] text-[#1A1D2B] leading-none">£{Math.round(displayTotal / Math.max(1, adults))}<span className="text-[.7rem] font-semibold text-[#8E95A9]">/person</span></div>
                {nights > 0 && (
                  <div className="text-[.68rem] text-[#8E95A9] font-semibold mt-0.5">£{displayTotal} total · {nights} night{nights !== 1 ? 's' : ''} · {adults} guest{adults !== 1 ? 's' : ''}</div>
                )}
              </>
            ) : (
              <>
                <div className="font-poppins font-black text-[1.5rem] text-[#1A1D2B] leading-none">£{displayPrice}<span className="text-[.7rem] font-semibold text-[#8E95A9]">/night</span></div>
                {nights > 0 && (
                  <div className="text-[.68rem] text-[#8E95A9] font-semibold mt-0.5">£{displayTotal} total for {nights} night{nights !== 1 ? 's' : ''}</div>
                )}
              </>
            )}
          </div>
          <div className="flex flex-col gap-1.5 w-full">
            {h.bookable && displayOfferId && (
              <BookDirectButton hotel={bookHotel} checkIn={checkin} checkOut={checkout} adults={adults} nights={nights} city={searchedDest} />
            )}
            <a href={redirectUrl(tripUrl, 'Trip.com', searchedDest, 'hotels')}
              className="bg-[#287DFA] hover:bg-[#1A6AE0] text-white font-poppins font-bold text-[.72rem] px-4 py-2.5 rounded-lg transition-all text-center whitespace-nowrap">
              Trip.com →
            </a>
            <a href={redirectUrl(expediaUrl, 'Expedia', searchedDest, 'hotels')}
              className="bg-[#1B2B65] hover:bg-[#142050] text-white font-poppins font-bold text-[.72rem] px-4 py-2.5 rounded-lg transition-all text-center whitespace-nowrap">
              Expedia →
            </a>
            <a href={redirectUrl(klookUrl, 'Klook', searchedDest, 'hotels')}
              className="bg-orange-500 hover:bg-orange-600 text-white font-poppins font-bold text-[.72rem] px-4 py-2.5 rounded-lg transition-all text-center whitespace-nowrap">
              Klook →
            </a>
          </div>
          {h.lat && h.lng ? (
            <button type="button"
              onClick={() => setScoutHotel({ name: h.name, lat: h.lat!, lng: h.lng! })}
              className="text-[.68rem] font-bold text-teal-600 border border-teal-200 hover:bg-teal-50 px-3 py-1.5 rounded-lg transition-all cursor-pointer">
              Explore Neighbourhood 🧭
            </button>
          ) : (
            <button type="button" disabled
              className="text-[.68rem] font-bold text-gray-400 border border-gray-200 px-3 py-1.5 rounded-lg cursor-default opacity-50">
              Explore Neighbourhood 🧭
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function BoardSelector({ options, selected, onSelect }: {
  options: BoardOption[];
  selected: number;
  onSelect: (idx: number) => void;
}) {
  return (
    <div className="mt-1.5">
      <p className="text-[.6rem] font-bold text-[#8E95A9] uppercase tracking-[1px] mb-1">Board type</p>
      <div className="flex flex-col gap-1">
        {options.map((opt, idx) => (
          <button key={idx} type="button" onClick={() => onSelect(idx)}
            className={`text-left px-2.5 py-1.5 rounded-lg text-[.68rem] font-semibold transition-all border ${
              selected === idx
                ? 'border-orange-400 bg-orange-50 text-[#1A1D2B]'
                : 'border-[#E8ECF4] bg-white text-[#5C6378] hover:border-orange-200'
            }`}>
            <span className="font-bold">{opt.boardType}</span>
            <span className="ml-1.5 text-[#8E95A9]">£{opt.pricePerNight}/night</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function BookDirectButton({
  hotel,
  checkIn,
  checkOut,
  nights,
  adults,
  city,
}: {
  hotel: HotelResult;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  city: string;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onClick = async () => {
    if (!hotel.offerId) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/hotels/start-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId: hotel.offerId,
          hotelName: hotel.name,
          stars: hotel.stars ?? 0,
          totalPrice: hotel.totalPrice ?? hotel.pricePerNight * Math.max(1, nights),
          currency: hotel.currency || 'GBP',
          checkIn,
          checkOut,
          city,
          adults,
          nights: Math.max(1, nights),
          thumbnail: hotel.thumbnail || null,
          lat: hotel.lat,
          lng: hotel.lng,
        }),
      });
      const data = await res.json();
      if (!data.success || !data.ref) throw new Error(data.error || 'Could not start booking');
      window.location.assign(`/hotels/checkout/${encodeURIComponent(data.ref)}`);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Unexpected error');
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="bg-gradient-to-r from-[#0066FF] to-[#4C8BFF] hover:from-[#0052CC] hover:to-[#3B7AEE] disabled:opacity-60 disabled:cursor-not-allowed text-white font-poppins font-black text-[.72rem] px-4 py-2.5 rounded-lg transition-all text-center whitespace-nowrap shadow-[0_2px_10px_rgba(0,102,255,0.25)]"
      >
        {busy ? 'Loading…' : <><i className="fa-solid fa-lock mr-1" /> Book Direct →</>}
      </button>
      {err && <span className="text-[.62rem] text-red-600 font-bold mt-1">{err}</span>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   LOADING
   ═══════════════════════════════════════════════════════════════════════════ */

const LOADING_MSGS = [
  'Searching Klook...',
  'Checking Trip.com...',
  'Comparing Expedia...',
  'Finding the best rates...',
];

function LoadingState({ dest }: { dest: string }) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const msgTimer = setInterval(() => setMsgIdx(i => (i + 1) % LOADING_MSGS.length), 600);
    const progTimer = setInterval(() => setProgress(p => Math.min(p + 1.2, 95)), 50);
    return () => { clearInterval(msgTimer); clearInterval(progTimer); };
  }, []);

  return (
    <section className="max-w-[900px] mx-auto px-5 py-10">
      <div className="bg-white border border-[#E8ECF4] rounded-2xl p-8 text-center shadow-sm">
        <div className="w-full bg-[#F1F3F7] rounded-full h-2 mb-5 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-orange-400 to-amber-500 rounded-full transition-all duration-100" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-[.9rem] font-bold text-[#5C6378]">{LOADING_MSGS[msgIdx]}</span>
        </div>
        <p className="text-[.78rem] text-[#8E95A9] font-semibold">Comparing hotel prices in <strong className="text-[#1A1D2B]">{dest}</strong></p>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   STAR RATING
   ═══════════════════════════════════════════════════════════════════════════ */

function Stars({ count }: { count: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={`text-[.7rem] ${i < count ? 'text-amber-400' : 'text-[#E8ECF4]'}`}>★</span>
      ))}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

function HotelsContent() {
  const [destination, setDestination] = useState('');
  const [checkin, setCheckin] = useState('');
  const [checkout, setCheckout] = useState('');
  const [adults, setAdults] = useState(2);
  const [childCount, setChildCount] = useState(0);
  const [childrenAges, setChildrenAges] = useState<number[]>([]);
  const [rooms, setRooms] = useState(1);
  const [minStars, setMinStars] = useState(0);
  const [boardFilter, setBoardFilter] = useState('any');

  const [loading, setLoading] = useState(false);
  const [hotels, setHotels] = useState<HotelResult[] | null>(null);
  const [apiError, setApiError] = useState('');
  const [searched, setSearched] = useState(false);
  const [searchedDest, setSearchedDest] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('recommended');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [priceView, setPriceView] = useState<'total' | 'perPerson'>('total');

  // Scout sidebar state
  const [scoutHotel, setScoutHotel] = useState<{ name: string; lat: number; lng: number } | null>(null);

  // Hot deals state
  const [deals, setDeals] = useState<DealDestination[] | null>(null);
  const [dealsLoading, setDealsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/hotels/deals')
      .then(r => r.json())
      .then(d => { setDeals(d.deals || []); setDealsLoading(false); })
      .catch(() => setDealsLoading(false));
  }, []);

  const resultsRef = useRef<HTMLDivElement>(null);

  // Read URL params
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const dest = p.get('destination') || p.get('city') || '';
    const cin = p.get('checkin') || '';
    const cout = p.get('checkout') || '';
    const a = p.get('adults');
    const c = p.get('children');
    const r = p.get('rooms');
    const s = p.get('stars');
    if (dest) setDestination(dest);
    if (cin) setCheckin(cin);
    if (cout) setCheckout(cout);
    if (a) setAdults(Math.min(10, Math.max(1, parseInt(a))));
    if (c) setChildCount(Math.min(5, Math.max(0, parseInt(c))));
    if (r) setRooms(Math.min(5, Math.max(1, parseInt(r))));
    if (s) setMinStars(Math.min(5, Math.max(0, parseInt(s))));
  }, []);

  const today = new Date().toISOString().split('T')[0];

  // Calculate nights
  function getNights(): number {
    if (!checkin || !checkout) return 0;
    const d1 = new Date(checkin);
    const d2 = new Date(checkout);
    const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }

  const handleSearch = useCallback(async () => {
    if (!destination) { alert('Please enter a destination'); return; }
    if (!checkin) { alert('Please select a check-in date'); return; }
    if (!checkout) { alert('Please select a check-out date'); return; }

    setHotels(null);
    setApiError('');
    setLoading(true);
    setSearched(true);
    setSearchedDest(destination);

    try {
      const params = new URLSearchParams({
        city: destination,
        checkin,
        checkout,
        adults: String(adults),
        children: String(childCount),
        rooms: String(rooms),
        stars: String(minStars),
      });
      if (childrenAges.length > 0) {
        params.set('childrenAges', childrenAges.join(','));
      }

      const res = await fetch(`/api/hotels?${params}`);
      const data = await res.json();

      if (data.error) {
        setApiError(data.error);
        setLoading(false);
        return;
      }

      setHotels(data.hotels || []);
      setLoading(false);

      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch {
      setApiError('Could not load hotel prices. Please try again.');
      setLoading(false);
    }
  }, [destination, checkin, checkout, adults, childCount, rooms, minStars, childrenAges]);

  // Auto-search when URL params are present
  const autoSearched = useRef(false);
  useEffect(() => {
    if (!autoSearched.current && destination && checkin && checkout) {
      autoSearched.current = true;
      handleSearch();
    }
  }, [destination, checkin, checkout, handleSearch]);

  // Compute centre of hotels that have coordinates — used as "city centre"
  // reference for the distance sort and map default view.
  const geoHotels = (hotels || []).filter(h => typeof h.lat === 'number' && typeof h.lng === 'number');
  const cityCentre = geoHotels.length > 0
    ? {
        lat: geoHotels.reduce((s, h) => s + (h.lat || 0), 0) / geoHotels.length,
        lng: geoHotels.reduce((s, h) => s + (h.lng || 0), 0) / geoHotels.length,
      }
    : null;

  // Haversine distance in km
  const distanceKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  };

  const filteredHotels = hotels ? hotels.filter(h => {
    if (boardFilter === 'any') return true;
    if (!h.boardType) return false;
    const bt = h.boardType.toLowerCase();
    if (boardFilter === 'breakfast') return bt.includes('breakfast');
    return bt.includes(boardFilter);
  }) : null;

  const sortedHotels = filteredHotels ? [...filteredHotels].sort((a, b) => {
    if (sortBy === 'price-asc') return a.pricePerNight - b.pricePerNight;
    if (sortBy === 'price-desc') return b.pricePerNight - a.pricePerNight;
    if (sortBy === 'distance' && cityCentre) {
      const da = a.lat != null && a.lng != null ? distanceKm(a.lat, a.lng, cityCentre.lat, cityCentre.lng) : Infinity;
      const db = b.lat != null && b.lng != null ? distanceKm(b.lat, b.lng, cityCentre.lat, cityCentre.lng) : Infinity;
      return da - db;
    }
    // 'recommended' — keep server order (LiteAPI bookable first, then curated)
    return 0;
  }) : null;

  const cheapest = sortedHotels && sortedHotels.length > 0 ? sortedHotels[0] : null;
  const nights = getNights();

  // Build the href for a hotel's detail page, carrying search context
  const buildDetailHref = (h: HotelResult) => {
    const qp = new URLSearchParams({
      checkin,
      checkout,
      adults: String(adults),
      children: String(childCount),
      rooms: String(rooms),
      city: searchedDest,
    });
    if (h.offerId) qp.set('offerId', h.offerId);
    if (h.totalPrice) qp.set('price', String(h.totalPrice));
    else qp.set('price', String(h.pricePerNight * Math.max(1, nights)));
    if (h.currency) qp.set('currency', h.currency);
    if (typeof h.refundable === 'boolean') qp.set('refundable', h.refundable ? '1' : '0');
    if (h.boardType) qp.set('board', h.boardType);
    return `/hotels/${encodeURIComponent(String(h.id))}?${qp.toString()}`;
  };

  return (
    <>
      <Header />

      {/* ── Hero + Search ── */}
      <section className="pt-36 pb-10 px-5 bg-[radial-gradient(ellipse_at_top,#FFF7ED_0%,#fff_55%,#F8FAFC_100%)]">
        <div className="max-w-[860px] mx-auto text-center mb-8">
          <span className="inline-block bg-orange-50 text-orange-500 text-[.65rem] font-black uppercase tracking-[2.5px] px-3.5 py-1.5 rounded-full mb-4">🏨 Hotel Comparison</span>
          <h1 className="font-poppins text-[2.4rem] md:text-[3.6rem] font-black text-[#1A1D2B] leading-[1.05] tracking-tight mb-3">
            Find the <em className="italic bg-gradient-to-br from-orange-400 to-amber-600 bg-clip-text text-transparent">Best</em> Hotels
          </h1>
          <p className="text-[1rem] text-[#8E95A9] font-semibold max-w-[520px] mx-auto">Compare trusted hotel providers — real prices shown right here.</p>
        </div>

        <div className="max-w-[860px] mx-auto bg-white border border-[#E8ECF4] rounded-3xl p-6 shadow-[0_8px_40px_rgba(245,158,11,0.08)]">
          {/* Destination */}
          <div className="mb-3">
            <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Destination</label>
            <DestinationPicker value={destination} onChange={setDestination} />
          </div>

          {/* Dates + Guests */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Check-in</label>
              <input type="date" min={today} value={checkin} onChange={e => {
                const v = e.target.value;
                setCheckin(v);
                if (!checkout || checkout <= v) {
                  const r = new Date(v); r.setDate(r.getDate() + 3);
                  setCheckout(r.toISOString().split('T')[0]);
                }
              }}
                className="w-full px-3 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.85rem] font-semibold text-[#1A1D2B] outline-none focus:border-orange-400 focus:bg-white transition-all" />
            </div>
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Check-out</label>
              <input type="date" min={checkin || today} value={checkout} onChange={e => setCheckout(e.target.value)}
                className="w-full px-3 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.85rem] font-semibold text-[#1A1D2B] outline-none focus:border-orange-400 focus:bg-white transition-all" />
            </div>
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Guests &amp; Rooms</label>
              <OccupancyPicker
                adults={adults}
                children={childCount}
                rooms={rooms}
                childrenAges={childrenAges}
                onChange={({ adults: a, children: c, rooms: r, childrenAges: ages }) => {
                  setAdults(a); setChildCount(c); setRooms(r); setChildrenAges(ages);
                }}
              />
            </div>
          </div>

          {/* Star filter + Board type */}
          <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
            <label className="text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9]">Hotel class</label>
            <StarFilter value={minStars} onChange={setMinStars} />
          </div>
          <div className="mb-4">
            <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Board type</label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'Any', value: 'any' },
                { label: 'Room Only', value: 'room only' },
                { label: 'Breakfast', value: 'breakfast' },
                { label: 'Half Board', value: 'half board' },
                { label: 'Full Board', value: 'full board' },
                { label: 'All Inclusive', value: 'all inclusive' },
              ].map(opt => (
                <button key={opt.value} type="button" onClick={() => setBoardFilter(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-[.72rem] font-bold transition-all ${boardFilter === opt.value ? 'bg-orange-500 text-white shadow-sm' : 'bg-[#F1F3F7] text-[#5C6378] hover:bg-orange-50'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleSearch} disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-poppins font-black text-[.95rem] py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(245,158,11,0.3)]">
            {loading ? 'Searching…' : 'Search Hotels →'}
          </button>
          <p className="text-center text-[.68rem] text-[#8E95A9] font-semibold mt-2.5">Free comparison · Prices shown here · Click any hotel to book on the provider</p>
        </div>
      </section>

      {/* ── Hot Deals ── */}
      {!searched && !loading && (
        <section className="max-w-[1100px] mx-auto px-5 pt-10 pb-4">
          {/* Section header */}
          <div className="text-center mb-8">
            <span className="inline-block bg-red-50 text-red-500 text-[.62rem] font-black uppercase tracking-[2.5px] px-3.5 py-1.5 rounded-full mb-3">Hot Hotel Deals</span>
            <h2 className="font-poppins font-black text-[1.8rem] md:text-[2.4rem] text-[#1A1D2B] leading-tight mb-2">
              Trending Destinations
            </h2>
            <p className="text-[.88rem] text-[#8E95A9] font-semibold max-w-[480px] mx-auto">
              Real prices from top hotels — updated every few hours
            </p>
          </div>

          {/* Deals grid */}
          {dealsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white border border-[#E8ECF4] rounded-2xl overflow-hidden animate-pulse">
                  <div className="h-36 bg-[#F1F3F7]" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 w-2/3 bg-[#F1F3F7] rounded" />
                    <div className="h-3 w-1/2 bg-[#F1F3F7] rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : deals && deals.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {deals.filter(d => d.cheapestPrice !== null).map((deal) => {
                const hotel = deal.budgetHotel;
                const dealHref = hotel?.id
                  ? `/hotels/${encodeURIComponent(hotel.id)}?checkin=${deal.checkin}&checkout=${deal.checkout}&adults=2&children=0&rooms=1&city=${encodeURIComponent(deal.city)}&price=${hotel.totalPrice}&currency=GBP${hotel.offerId ? `&offerId=${encodeURIComponent(hotel.offerId)}` : ''}${hotel.boardType ? `&board=${encodeURIComponent(hotel.boardType)}` : ''}${hotel.refundable ? '&refundable=1' : '&refundable=0'}`
                  : `/hotels?destination=${encodeURIComponent(deal.city)}&checkin=${deal.checkin}&checkout=${deal.checkout}`;
                return (
                  <a
                    key={deal.city}
                    href={dealHref}
                    className="group bg-white border border-[#E8ECF4] rounded-2xl overflow-hidden hover:shadow-[0_8px_30px_rgba(245,158,11,0.12)] hover:border-orange-200 transition-all text-left"
                  >
                    {/* Photo */}
                    <div className="relative h-36 overflow-hidden">
                      <img
                        src={deal.photo}
                        alt={deal.city}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

                      {/* Tag badge */}
                      {deal.tag && (
                        <span className={`absolute top-2.5 left-2.5 text-[.58rem] font-black uppercase tracking-wider px-2 py-1 rounded-lg ${
                          deal.tag === 'Trending' ? 'bg-red-500 text-white' :
                          deal.tag === 'Budget Gem' ? 'bg-emerald-500 text-white' :
                          deal.tag === 'All Inclusive' ? 'bg-purple-500 text-white' :
                          deal.tag === 'Family Fav' ? 'bg-blue-500 text-white' :
                          deal.tag === 'City Break' ? 'bg-amber-500 text-white' :
                          deal.tag === 'Culture' ? 'bg-indigo-500 text-white' :
                          deal.tag === 'Paradise' ? 'bg-teal-500 text-white' :
                          'bg-orange-500 text-white'
                        }`}>
                          {deal.tag}
                        </span>
                      )}

                      {/* City name on photo */}
                      <div className="absolute bottom-2.5 left-3">
                        <span className="text-white font-poppins font-black text-[1.05rem] drop-shadow-lg">
                          {deal.flag} {deal.city}
                        </span>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="p-3.5">
                      {hotel ? (
                        <>
                          <p className="text-[.72rem] text-[#5C6378] font-semibold truncate mb-1">
                            {hotel.name}
                          </p>
                          <div className="flex items-center gap-1 mb-2">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span key={i} className={`text-[.6rem] ${i < hotel.stars ? 'text-amber-400' : 'text-[#E8ECF4]'}`}>★</span>
                            ))}
                            {hotel.boardType && (
                              <span className="text-[.58rem] text-purple-600 font-bold ml-1">{hotel.boardType}</span>
                            )}
                          </div>
                        </>
                      ) : (
                        <p className="text-[.72rem] text-[#8E95A9] font-semibold mb-2">{deal.hotelCount} hotels available</p>
                      )}

                      <div className="flex items-end justify-between">
                        <div>
                          <span className="text-[.6rem] text-[#8E95A9] font-semibold">from</span>
                          <span className="font-poppins font-black text-[1.3rem] text-[#1A1D2B] leading-none ml-1">
                            £{Math.round(deal.cheapestPrice!)}
                          </span>
                          <span className="text-[.65rem] text-[#8E95A9] font-semibold">/night</span>
                        </div>
                        <span className="text-orange-500 text-[.68rem] font-bold group-hover:translate-x-0.5 transition-transform">
                          View →
                        </span>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          ) : null}

          {/* Featured deal highlight */}
          {deals && deals.length > 0 && (() => {
            const bestDeal = deals.filter(d => d.cheapestPrice !== null).sort((a, b) => (a.cheapestPrice || Infinity) - (b.cheapestPrice || Infinity))[0];
            if (!bestDeal || !bestDeal.budgetHotel) return null;
            const h = bestDeal.budgetHotel;
            return (
              <div className="mt-8 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border border-orange-200 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center text-3xl shadow-lg">
                    🔥
                  </div>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="font-poppins font-black text-[1.1rem] text-[#1A1D2B] mb-1">
                    Deal of the Day — {bestDeal.flag} {bestDeal.city}
                  </h3>
                  <p className="text-[.82rem] text-[#5C6378] font-semibold">
                    {h.name} {h.stars > 0 && `· ${'★'.repeat(h.stars)}`} {h.boardType && `· ${h.boardType}`} — from <strong className="text-orange-600">£{Math.round(h.pricePerNight)}/night</strong> for 4 nights
                  </p>
                </div>
                <a
                  href={h.id
                    ? `/hotels/${encodeURIComponent(h.id)}?checkin=${bestDeal.checkin}&checkout=${bestDeal.checkout}&adults=2&children=0&rooms=1&city=${encodeURIComponent(bestDeal.city)}&price=${h.totalPrice}&currency=GBP${h.offerId ? `&offerId=${encodeURIComponent(h.offerId)}` : ''}${h.boardType ? `&board=${encodeURIComponent(h.boardType)}` : ''}${h.refundable ? '&refundable=1' : '&refundable=0'}`
                    : `/hotels?destination=${encodeURIComponent(bestDeal.city)}&checkin=${bestDeal.checkin}&checkout=${bestDeal.checkout}`}
                  className="flex-shrink-0 bg-orange-500 hover:bg-orange-600 text-white font-poppins font-black text-[.85rem] px-6 py-3 rounded-xl transition-all shadow-[0_4px_20px_rgba(245,158,11,0.3)]"
                >
                  View Deal →
                </a>
              </div>
            );
          })()}
        </section>
      )}

      {/* ── Loading ── */}
      {loading && <LoadingState dest={destination} />}

      {/* ── Error ── */}
      {apiError && (
        <section className="max-w-[860px] mx-auto px-5 py-6">
          <div className="bg-red-50 border border-red-100 rounded-2xl p-5 text-center">
            <p className="text-[.85rem] font-bold text-red-600 mb-3">{apiError}</p>
            <button onClick={handleSearch}
              className="bg-orange-500 hover:bg-orange-600 text-white font-poppins font-bold text-[.82rem] px-6 py-2.5 rounded-xl transition-all">
              Try Again
            </button>
          </div>
        </section>
      )}

      {/* ── Results ── */}
      {searched && !loading && hotels !== null && (
        <div ref={resultsRef}>
          {/* Section 1: Results Summary */}
          {cheapest && (
            <section className="max-w-[1000px] mx-auto px-5 pt-8 pb-4">
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🏷</span>
                  <span className="font-poppins font-black text-[1rem] text-[#1A1D2B]">
                    {hotels!.length} hotel{hotels!.length !== 1 ? 's' : ''} found in {searchedDest} from <span className="text-orange-600">£{cheapest.pricePerNight}/night</span>
                  </span>
                </div>
                <p className="text-[.7rem] text-[#8E95A9] font-semibold">Prices based on recent searches — click any hotel for live pricing</p>
              </div>
            </section>
          )}

          {/* Sort + View toolbar */}
          {hotels!.length > 0 && (
            <section className="max-w-[1000px] mx-auto px-5 pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                {/* View toggle */}
                <div className="inline-flex bg-[#F1F3F7] rounded-xl p-1 self-start">
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`px-4 py-2 rounded-lg text-[.78rem] font-poppins font-bold transition-all flex items-center gap-1.5 ${viewMode === 'list' ? 'bg-white text-[#1A1D2B] shadow-sm' : 'text-[#5C6378]'}`}
                  >
                    <i className="fa-solid fa-list text-[.72rem]" /> List
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('map')}
                    disabled={geoHotels.length === 0}
                    className={`px-4 py-2 rounded-lg text-[.78rem] font-poppins font-bold transition-all flex items-center gap-1.5 ${viewMode === 'map' ? 'bg-white text-[#1A1D2B] shadow-sm' : 'text-[#5C6378]'} disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <i className="fa-solid fa-map-location-dot text-[.72rem]" /> Map
                  </button>
                </div>

                {/* Price view toggle */}
                <div className="inline-flex bg-[#F1F3F7] rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => setPriceView('total')}
                    className={`px-3 py-1.5 rounded-lg text-[.72rem] font-poppins font-bold transition-all ${priceView === 'total' ? 'bg-white text-[#1A1D2B] shadow-sm' : 'text-[#5C6378]'}`}
                  >
                    Total price
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceView('perPerson')}
                    className={`px-3 py-1.5 rounded-lg text-[.72rem] font-poppins font-bold transition-all ${priceView === 'perPerson' ? 'bg-white text-[#1A1D2B] shadow-sm' : 'text-[#5C6378]'}`}
                  >
                    Per person
                  </button>
                </div>

                {/* Sort dropdown */}
                <div className="flex items-center gap-2">
                  <label htmlFor="hotel-sort" className="text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9]">Sort by</label>
                  <select
                    id="hotel-sort"
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as SortBy)}
                    className="px-3 py-2 rounded-xl border border-[#E8ECF4] bg-white text-[.8rem] font-bold text-[#1A1D2B] outline-none focus:border-orange-400 cursor-pointer"
                  >
                    <option value="recommended">Recommended</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="distance" disabled={!cityCentre}>Distance from centre</option>
                  </select>
                </div>
              </div>
            </section>
          )}

          {/* Section 2A: Map view */}
          {hotels!.length > 0 && viewMode === 'map' && cityCentre && (
            <section className="max-w-[1000px] mx-auto px-5 pb-6">
              <HotelMap
                centerLat={cityCentre.lat}
                centerLng={cityCentre.lng}
                hotels={sortedHotels!
                  .filter(h => typeof h.lat === 'number' && typeof h.lng === 'number')
                  .map(h => ({
                    id: h.id,
                    name: h.name,
                    stars: h.stars,
                    pricePerNight: h.pricePerNight,
                    currency: h.currency || 'GBP',
                    lat: h.lat as number,
                    lng: h.lng as number,
                    href: buildDetailHref(h),
                  }))}
              />
            </section>
          )}

          {/* Section 2: Hotel Result Cards */}
          {hotels!.length > 0 && viewMode === 'list' ? (
            <section className="max-w-[1000px] mx-auto px-5 pb-6">
              <div className="space-y-3">
                {sortedHotels!.map((h, i) => (
                    <HotelCardWrapper
                      key={h.id || i}
                      hotel={h}
                      index={i}
                      isCheapest={i === 0}
                      nights={nights}
                      adults={adults}
                      checkin={checkin}
                      checkout={checkout}
                      searchedDest={searchedDest}
                      buildDetailHref={buildDetailHref}
                      setScoutHotel={setScoutHotel}
                      priceView={priceView}
                    />
                ))}
              </div>
            </section>
          ) : null}

          {/* No results */}
          {hotels!.length === 0 && (
            <section className="max-w-[860px] mx-auto px-5 py-8">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
                <span className="text-3xl mb-3 block">🔎</span>
                <p className="font-poppins font-bold text-[.95rem] text-[#1A1D2B] mb-2">
                  We couldn&apos;t find cached hotel prices for {searchedDest}.
                </p>
                <p className="text-[.78rem] text-[#8E95A9] font-semibold">
                  Compare live prices directly across our providers below.
                </p>
              </div>
            </section>
          )}

          {/* Section 3: Provider Comparison Strip */}
          <section className="max-w-[1000px] mx-auto px-5 pb-8">
            <h3 className="font-poppins font-black text-[1.05rem] text-[#1A1D2B] mb-4">Also Compare on These Providers</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PROVIDERS.map(p => {
                const url = p.getUrl(searchedDest, checkin, checkout, adults);
                return (
                  <div key={p.name} className="bg-white border border-[#E8ECF4] rounded-xl p-4 flex flex-col items-center text-center hover:border-orange-300 hover:shadow-md transition-all">
                    <div className="w-10 h-10 rounded-lg bg-[#F8FAFC] border border-[#E8ECF4] flex items-center justify-center text-xl mb-2">{p.logo}</div>
                    <div className="font-poppins font-bold text-[.85rem] text-[#1A1D2B] mb-1">{p.name}</div>
                    {cheapest ? (
                      <div className="text-[.75rem] font-bold text-orange-600 mb-2">From £{cheapest.pricePerNight}/night</div>
                    ) : (
                      <div className="text-[.72rem] font-semibold text-[#8E95A9] mb-2">Check Price</div>
                    )}
                    <a href={redirectUrl(url, p.name, searchedDest, 'hotels')}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white font-poppins font-bold text-[.72rem] py-2 rounded-lg transition-all">
                      Search {p.name} →
                    </a>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Section D: Cross-sell */}
          <section className="max-w-[1000px] mx-auto px-5 pb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Flights */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5">
                <span className="text-2xl mb-2 block">✈</span>
                <h4 className="font-poppins font-black text-[.9rem] text-[#1A1D2B] mb-1">Flights to {searchedDest}</h4>
                <p className="text-[.75rem] text-[#5C6378] font-semibold mb-3">Need a flight too? Compare across our providers.</p>
                <a href={`/flights?to=${encodeURIComponent(searchedDest)}`}
                  className="inline-block bg-white hover:bg-blue-50 text-[#0066FF] font-poppins font-bold text-[.75rem] px-4 py-2 rounded-lg border border-blue-200 transition-all">
                  Compare Flights →
                </a>
              </div>

              {/* Car Hire */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-5">
                <span className="text-2xl mb-2 block">🚗</span>
                <h4 className="font-poppins font-black text-[.9rem] text-[#1A1D2B] mb-1">Car Hire in {searchedDest}</h4>
                <p className="text-[.75rem] text-[#5C6378] font-semibold mb-3">Explore {searchedDest} on your own terms.</p>
                <a href={`/cars?location=${encodeURIComponent(searchedDest)}`}
                  className="inline-block bg-white hover:bg-amber-50 text-amber-600 font-poppins font-bold text-[.75rem] px-4 py-2 rounded-lg border border-amber-200 transition-all">
                  Compare Car Hire →
                </a>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ── Tips ── */}
      <section className="max-w-[860px] mx-auto px-5 pb-16">
        <div className="bg-[#F8FAFC] border border-[#F1F3F7] rounded-3xl p-8">
          <h3 className="font-poppins font-black text-[1.05rem] text-[#1A1D2B] mb-4">Tips for Finding Cheaper Hotels</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              ['Book 2–3 weeks ahead', 'Last-minute deals exist, but the best prices are typically 2–3 weeks before travel.'],
              ['Compare across providers', 'The same hotel can vary by 20–40% across different booking sites.'],
              ['Check cancellation policies', 'Free cancellation rates let you book now and keep looking for better deals.'],
              ['Consider location carefully', 'A cheaper hotel in the right area can save on transport and give a better experience.'],
            ].map(([title, body]) => (
              <div key={title} className="flex gap-3">
                <div className="w-1.5 flex-shrink-0 rounded-full bg-gradient-to-b from-orange-400 to-amber-500 self-stretch" />
                <div>
                  <div className="font-poppins font-bold text-[.85rem] text-[#1A1D2B] mb-0.5">{title}</div>
                  <p className="text-[.75rem] text-[#5C6378] font-semibold leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Scout Sidebar */}
      {scoutHotel && (
        <ScoutSidebar
          hotelName={scoutHotel.name}
          latitude={scoutHotel.lat}
          longitude={scoutHotel.lng}
          onClose={() => setScoutHotel(null)}
        />
      )}

      <Footer />
    </>
  );
}

export default function HotelsPage() {
  return <HotelsContent />;
}
