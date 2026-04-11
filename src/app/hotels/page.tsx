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
  // Nepal
  'Kathmandu', 'Pokhara', 'Chitwan', 'Lumbini',
  // Pakistan
  'Lahore', 'Islamabad', 'Karachi', 'Peshawar', 'Faisalabad', 'Multan', 'Rahim Yar Khan',
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
   AIRPORT COORDS — used to show "X mi from airport" on each hotel card
   Keyed by lowercase city substring; first match wins.
   ═══════════════════════════════════════════════════════════════════════════ */

const AIRPORT_COORDS: Array<{ match: string; iata: string; lat: number; lng: number }> = [
  // UK
  { match: 'london', iata: 'LHR', lat: 51.4700, lng: -0.4543 },
  { match: 'manchester', iata: 'MAN', lat: 53.3537, lng: -2.2750 },
  { match: 'edinburgh', iata: 'EDI', lat: 55.9500, lng: -3.3725 },
  { match: 'glasgow', iata: 'GLA', lat: 55.8719, lng: -4.4331 },
  { match: 'birmingham', iata: 'BHX', lat: 52.4539, lng: -1.7480 },
  { match: 'bristol', iata: 'BRS', lat: 51.3827, lng: -2.7191 },
  { match: 'belfast', iata: 'BFS', lat: 54.6575, lng: -6.2158 },
  // France
  { match: 'paris', iata: 'CDG', lat: 49.0097, lng: 2.5479 },
  { match: 'nice', iata: 'NCE', lat: 43.6584, lng: 7.2159 },
  { match: 'lyon', iata: 'LYS', lat: 45.7256, lng: 5.0811 },
  { match: 'marseille', iata: 'MRS', lat: 43.4393, lng: 5.2214 },
  // Benelux
  { match: 'amsterdam', iata: 'AMS', lat: 52.3086, lng: 4.7639 },
  { match: 'brussels', iata: 'BRU', lat: 50.9014, lng: 4.4844 },
  // Germany / Austria
  { match: 'berlin', iata: 'BER', lat: 52.3667, lng: 13.5033 },
  { match: 'munich', iata: 'MUC', lat: 48.3538, lng: 11.7861 },
  { match: 'frankfurt', iata: 'FRA', lat: 50.0333, lng: 8.5706 },
  { match: 'hamburg', iata: 'HAM', lat: 53.6303, lng: 9.9883 },
  { match: 'vienna', iata: 'VIE', lat: 48.1103, lng: 16.5697 },
  { match: 'salzburg', iata: 'SZG', lat: 47.7933, lng: 13.0043 },
  // Switzerland
  { match: 'zurich', iata: 'ZRH', lat: 47.4647, lng: 8.5492 },
  { match: 'geneva', iata: 'GVA', lat: 46.2381, lng: 6.1090 },
  // Italy
  { match: 'rome', iata: 'FCO', lat: 41.8003, lng: 12.2389 },
  { match: 'milan', iata: 'MXP', lat: 45.6306, lng: 8.7231 },
  { match: 'venice', iata: 'VCE', lat: 45.5053, lng: 12.3519 },
  { match: 'naples', iata: 'NAP', lat: 40.8860, lng: 14.2908 },
  { match: 'florence', iata: 'FLR', lat: 43.8100, lng: 11.2051 },
  // Spain
  { match: 'barcelona', iata: 'BCN', lat: 41.2974, lng: 2.0833 },
  { match: 'madrid', iata: 'MAD', lat: 40.4983, lng: -3.5676 },
  { match: 'malaga', iata: 'AGP', lat: 36.6749, lng: -4.4991 },
  { match: 'palma', iata: 'PMI', lat: 39.5517, lng: 2.7388 },
  { match: 'alicante', iata: 'ALC', lat: 38.2822, lng: -0.5582 },
  { match: 'valencia', iata: 'VLC', lat: 39.4893, lng: -0.4816 },
  { match: 'ibiza', iata: 'IBZ', lat: 38.8729, lng: 1.3731 },
  { match: 'seville', iata: 'SVQ', lat: 37.4180, lng: -5.8931 },
  { match: 'tenerife', iata: 'TFS', lat: 28.0445, lng: -16.5725 },
  { match: 'gran canaria', iata: 'LPA', lat: 27.9319, lng: -15.3866 },
  { match: 'lanzarote', iata: 'ACE', lat: 28.9455, lng: -13.6052 },
  { match: 'fuerteventura', iata: 'FUE', lat: 28.4527, lng: -13.8638 },
  // Portugal
  { match: 'lisbon', iata: 'LIS', lat: 38.7742, lng: -9.1342 },
  { match: 'porto', iata: 'OPO', lat: 41.2482, lng: -8.6813 },
  { match: 'faro', iata: 'FAO', lat: 37.0144, lng: -7.9659 },
  { match: 'madeira', iata: 'FNC', lat: 32.6979, lng: -16.7745 },
  // Greece
  { match: 'athens', iata: 'ATH', lat: 37.9364, lng: 23.9475 },
  { match: 'santorini', iata: 'JTR', lat: 36.3992, lng: 25.4793 },
  { match: 'mykonos', iata: 'JMK', lat: 37.4351, lng: 25.3481 },
  { match: 'crete', iata: 'HER', lat: 35.3397, lng: 25.1802 },
  { match: 'rhodes', iata: 'RHO', lat: 36.4054, lng: 28.0862 },
  { match: 'corfu', iata: 'CFU', lat: 39.6019, lng: 19.9117 },
  { match: 'zakynthos', iata: 'ZTH', lat: 37.7509, lng: 20.8843 },
  // Scandinavia
  { match: 'copenhagen', iata: 'CPH', lat: 55.6180, lng: 12.6561 },
  { match: 'stockholm', iata: 'ARN', lat: 59.6519, lng: 17.9186 },
  { match: 'oslo', iata: 'OSL', lat: 60.1939, lng: 11.1004 },
  { match: 'helsinki', iata: 'HEL', lat: 60.3172, lng: 24.9633 },
  { match: 'reykjavik', iata: 'KEF', lat: 63.9850, lng: -22.6056 },
  // Eastern Europe
  { match: 'prague', iata: 'PRG', lat: 50.1008, lng: 14.2600 },
  { match: 'budapest', iata: 'BUD', lat: 47.4394, lng: 19.2617 },
  { match: 'warsaw', iata: 'WAW', lat: 52.1657, lng: 20.9671 },
  { match: 'krakow', iata: 'KRK', lat: 50.0777, lng: 19.7848 },
  // Croatia
  { match: 'dubrovnik', iata: 'DBV', lat: 42.5614, lng: 18.2683 },
  { match: 'split', iata: 'SPU', lat: 43.5389, lng: 16.2980 },
  // Turkey
  { match: 'istanbul', iata: 'IST', lat: 41.2753, lng: 28.7519 },
  { match: 'antalya', iata: 'AYT', lat: 36.8987, lng: 30.8005 },
  { match: 'bodrum', iata: 'BJV', lat: 37.2506, lng: 27.6643 },
  { match: 'dalaman', iata: 'DLM', lat: 36.7131, lng: 28.7925 },
  // Middle East
  { match: 'dubai', iata: 'DXB', lat: 25.2532, lng: 55.3657 },
  { match: 'abu dhabi', iata: 'AUH', lat: 24.4331, lng: 54.6511 },
  { match: 'doha', iata: 'DOH', lat: 25.2731, lng: 51.6080 },
  // North Africa
  { match: 'marrakech', iata: 'RAK', lat: 31.6069, lng: -8.0363 },
  { match: 'sharm', iata: 'SSH', lat: 27.9773, lng: 34.3950 },
  { match: 'hurghada', iata: 'HRG', lat: 27.1783, lng: 33.7994 },
  { match: 'cairo', iata: 'CAI', lat: 30.1219, lng: 31.4056 },
  // Indian Ocean
  { match: 'maldives', iata: 'MLE', lat: 4.1919, lng: 73.5291 },
  { match: 'mauritius', iata: 'MRU', lat: -20.4302, lng: 57.6836 },
  // Asia
  { match: 'bangkok', iata: 'BKK', lat: 13.6900, lng: 100.7501 },
  { match: 'phuket', iata: 'HKT', lat: 8.1132, lng: 98.3169 },
  { match: 'bali', iata: 'DPS', lat: -8.7482, lng: 115.1671 },
  { match: 'singapore', iata: 'SIN', lat: 1.3644, lng: 103.9915 },
  { match: 'kuala lumpur', iata: 'KUL', lat: 2.7456, lng: 101.7099 },
  { match: 'tokyo', iata: 'NRT', lat: 35.7720, lng: 140.3929 },
  { match: 'hong kong', iata: 'HKG', lat: 22.3080, lng: 113.9185 },
  { match: 'shanghai', iata: 'PVG', lat: 31.1443, lng: 121.8083 },
  { match: 'beijing', iata: 'PEK', lat: 40.0801, lng: 116.5846 },
  { match: 'seoul', iata: 'ICN', lat: 37.4602, lng: 126.4407 },
  // South Asia
  { match: 'mumbai', iata: 'BOM', lat: 19.0896, lng: 72.8656 },
  { match: 'delhi', iata: 'DEL', lat: 28.5562, lng: 77.1000 },
  { match: 'goa', iata: 'GOI', lat: 15.3808, lng: 73.8314 },
  // Americas
  { match: 'new york', iata: 'JFK', lat: 40.6413, lng: -73.7781 },
  { match: 'los angeles', iata: 'LAX', lat: 33.9416, lng: -118.4085 },
  { match: 'orlando', iata: 'MCO', lat: 28.4312, lng: -81.3081 },
  { match: 'miami', iata: 'MIA', lat: 25.7933, lng: -80.2906 },
  { match: 'cancun', iata: 'CUN', lat: 21.0365, lng: -86.8771 },
  { match: 'toronto', iata: 'YYZ', lat: 43.6777, lng: -79.6248 },
  { match: 'las vegas', iata: 'LAS', lat: 36.0840, lng: -115.1537 },
  // Oceania
  { match: 'sydney', iata: 'SYD', lat: -33.9399, lng: 151.1753 },
  { match: 'melbourne', iata: 'MEL', lat: -37.6690, lng: 144.8410 },
  // Africa
  { match: 'cape town', iata: 'CPT', lat: -33.9648, lng: 18.6017 },
  { match: 'johannesburg', iata: 'JNB', lat: -26.1392, lng: 28.2460 },
];

function findAirport(dest: string): { iata: string; lat: number; lng: number } | null {
  if (!dest) return null;
  const d = dest.toLowerCase();
  // Sort by longest match first so "gran canaria" wins over "canaria"
  const sorted = [...AIRPORT_COORDS].sort((a, b) => b.match.length - a.match.length);
  for (const a of sorted) {
    if (d.includes(a.match)) return { iata: a.iata, lat: a.lat, lng: a.lng };
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════════════════════
   PROVIDER DEEP LINKS (only affiliated providers)
   ═══════════════════════════════════════════════════════════════════════════ */

function buildTripcomUrl(dest: string, cin: string, cout: string, adults: number): string {
  const slug = dest.toLowerCase().replace(/\s+/g, '-');
  return `https://www.trip.com/hotels/${slug}-hotels-list/?checkin=${cin}&checkout=${cout}&adult=${adults}&curr=GBP&Allianceid=8023009&SID=303363796&trip_sub3=D15021113`;
}

function buildExpediaUrl(dest: string, cin: string, cout: string, adults: number): string {
  return `https://www.expedia.co.uk/Hotel-Search?destination=${encodeURIComponent(dest)}&startDate=${cin}&endDate=${cout}&adults=${adults}&affcid=clbU3QK`;
}

type Provider = { name: string; logo: string; getUrl: (dest: string, cin: string, cout: string, adults: number) => string };

const PROVIDERS: Provider[] = [
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
  // v3.0 fields
  negotiatedPrice?: number | null;
  negotiatedPerNight?: number | null;
  marketPrice?: number | null;
  marketPerNight?: number | null;
  rateType?: string | null;
  perks?: string[];
  signalType?: string | null;
  excludedTaxes?: number | null;
};

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

type PlaceResult = { id: string; name: string; description: string; type: string };

/**
 * Curated UK landmark aliases. LiteAPI returns very few (or zero) hotels for
 * tiny villages like West Lulworth or Wareham, but customers still ask for
 * "hotels near Durdle Door". Each entry maps a landmark query to the nearest
 * town with reliable hotel supply, surfaced as a synthetic top suggestion in
 * the autocomplete dropdown. Add new landmarks here as customer requests come in.
 */
const LANDMARK_ALIASES: Array<{
  match: RegExp;
  label: string;
  sublabel: string;
  searchAs: string;
  placeId: string;
}> = [
  {
    match: /durdle|jurassic\s*coast|lulworth/i,
    label: 'Durdle Door (Jurassic Coast)',
    sublabel: 'Searches Bournemouth · nearest town with hotels (~30 min drive)',
    searchAs: 'Bournemouth',
    placeId: 'ChIJ_WegsaCYc0gRlCypaxXgLjs',
  },
];

function DestinationPicker({ value, onChange, onPlaceSelect }: {
  value: string;
  onChange: (v: string) => void;
  onPlaceSelect: (place: PlaceResult | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [apiResults, setApiResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  // Debounced API lookup
  const fetchPlaces = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) { setApiResults([]); setSearching(false); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/hotels/places?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setApiResults(data.places || []);
      } catch { setApiResults([]); }
      setSearching(false);
    }, 300);
  }, []);

  const handleInput = (v: string) => {
    onChange(v);
    onPlaceSelect(null); // Clear placeId when typing
    setOpen(true);
    fetchPlaces(v);
  };

  const q = value.toLowerCase().trim();
  // Static fallback — show while API results load or for short queries
  const staticFiltered = q.length >= 1
    ? DESTINATIONS.filter(d => d.toLowerCase().includes(q)).slice(0, 6)
    : DESTINATIONS.slice(0, 8);

  const typeIcon = (t: string) => {
    if (t === 'airport' || t === 'aerodrome') return 'fa-plane';
    if (t === 'hotel' || t === 'lodging') return 'fa-hotel';
    return 'fa-location-dot';
  };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input type="text" placeholder="Any city or town worldwide" value={value} autoComplete="off"
          onChange={e => handleInput(e.target.value)}
          onFocus={() => setOpen(true)}
          className="w-full px-4 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.9rem] font-semibold text-[#1A1D2B] outline-none focus:border-orange-400 focus:bg-white transition-all placeholder:text-[#B0B8CC] pr-10" />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      {open && (
        <ul className="absolute z-50 w-full mt-1.5 bg-white border border-[#E8ECF4] rounded-2xl shadow-2xl overflow-auto max-h-72">
          {/* Curated landmark aliases — surface synthetic suggestions for famous spots
              like Durdle Door that LiteAPI can't search directly */}
          {q.length >= 2 && LANDMARK_ALIASES.filter(l => l.match.test(q)).map(l => (
            <li key={`landmark-${l.label}`}
              onMouseDown={() => {
                onChange(l.searchAs);
                onPlaceSelect({ id: l.placeId, name: l.searchAs, description: l.sublabel, type: 'locality' });
                setOpen(false);
                setApiResults([]);
              }}
              className="px-4 py-3 hover:bg-orange-50 cursor-pointer transition-colors border-b border-[#F1F3F7] flex items-center gap-3 bg-orange-50/40">
              <i className="fa-solid fa-mountain-sun text-[.85rem] text-orange-500 w-5 text-center flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="font-poppins font-bold text-[.85rem] text-[#1A1D2B] block truncate">{l.label}</span>
                <span className="text-[.68rem] text-[#8E95A9] font-semibold block truncate">{l.sublabel}</span>
              </div>
              <span className="text-[.55rem] font-black text-orange-500 uppercase tracking-wider ml-auto flex-shrink-0">Landmark</span>
            </li>
          ))}
          {/* API results (live from LiteAPI) */}
          {apiResults.length > 0 && (
            <>
              <li className="px-4 py-1.5 text-[.58rem] font-black uppercase tracking-[2px] text-[#8E95A9] bg-[#F8FAFC] border-b border-[#F1F3F7]">
                Global Search
              </li>
              {apiResults.slice(0, 8).map(p => (
                <li key={p.id} onMouseDown={() => { onChange(p.name); onPlaceSelect(p); setOpen(false); setApiResults([]); }}
                  className="px-4 py-2.5 hover:bg-orange-50 cursor-pointer transition-colors border-b border-[#F1F3F7] last:border-0 flex items-center gap-3">
                  <i className={`fa-solid ${typeIcon(p.type)} text-[.8rem] text-orange-400 w-5 text-center flex-shrink-0`} />
                  <div className="min-w-0">
                    <span className="font-poppins font-bold text-[.85rem] text-[#1A1D2B] block truncate">{p.name}</span>
                    {p.description && <span className="text-[.68rem] text-[#8E95A9] font-semibold block truncate">{p.description}</span>}
                  </div>
                  <span className="text-[.55rem] font-bold text-[#B0B8CC] uppercase tracking-wider ml-auto flex-shrink-0">
                    {p.type === 'airport' || p.type === 'aerodrome' ? 'Airport' : p.type === 'hotel' || p.type === 'lodging' ? 'Hotel' : 'City'}
                  </span>
                </li>
              ))}
            </>
          )}
          {/* Static quick picks */}
          {apiResults.length === 0 && staticFiltered.length > 0 && (
            <>
              {q.length >= 2 && (
                <li className="px-4 py-1.5 text-[.58rem] font-black uppercase tracking-[2px] text-[#8E95A9] bg-[#F8FAFC] border-b border-[#F1F3F7]">
                  {searching ? 'Searching...' : 'Popular Destinations'}
                </li>
              )}
              {staticFiltered.map(c => (
                <li key={c} onMouseDown={() => { onChange(c); onPlaceSelect(null); setOpen(false); }}
                  className={`px-4 py-2.5 hover:bg-orange-50 cursor-pointer transition-colors border-b border-[#F1F3F7] last:border-0 flex items-center gap-3 ${value === c ? 'bg-orange-50' : ''}`}>
                  <i className="fa-solid fa-location-dot text-[.8rem] text-[#B0B8CC] w-5 text-center flex-shrink-0" />
                  <span className="font-poppins font-semibold text-[.85rem] text-[#1A1D2B]">{c}</span>
                </li>
              ))}
            </>
          )}
          {/* Free-text search hint when no results */}
          {apiResults.length === 0 && staticFiltered.length === 0 && q.length >= 2 && !searching && (
            <li onMouseDown={() => { setOpen(false); }}
              className="px-4 py-3 cursor-pointer hover:bg-orange-50 transition-colors font-poppins font-semibold text-[.85rem] text-[#1A1D2B]">
              <span className="text-orange-500">Search &quot;{value}&quot;</span>
              <span className="text-[#8E95A9] text-[.78rem] ml-2">-- we cover cities worldwide</span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

/**
 * OccupancyPicker — adults, children, rooms in a single dropdown.
 * Caps: 9 guests total (adults + children), 5 rooms.
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
          <Row label="Adults" value={adults} min={1} max={9 - children}
            onSet={(v) => onChange({ adults: v, children, rooms, childrenAges })} />
          <Row label="Children" sublabel="Age 0–17" value={children} min={0} max={9 - adults}
            onSet={(v) => setChildren(v)} />
          <p className="text-[.6rem] text-[#8E95A9] font-semibold">Max 9 guests total</p>
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

function HotelCardWrapper({ hotel, index, isCheapest, nights, adults, checkin, checkout, searchedDest, buildDetailHref, setScoutHotel, priceView, cityCentre, airport }: {
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
  cityCentre: { lat: number; lng: number } | null;
  airport: { iata: string; lat: number; lng: number } | null;
}) {
  // Distance (miles) from city centre and nearest airport
  const haversineMi = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 3958.8; // miles
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  };
  const hasCoords = typeof hotel.lat === 'number' && typeof hotel.lng === 'number';
  const milesFromCentre = hasCoords && cityCentre
    ? haversineMi(hotel.lat!, hotel.lng!, cityCentre.lat, cityCentre.lng)
    : null;
  const milesFromAirport = hasCoords && airport
    ? haversineMi(hotel.lat!, hotel.lng!, airport.lat, airport.lng)
    : null;
  const fmtMi = (mi: number) => (mi < 10 ? mi.toFixed(1) : Math.round(mi).toString());
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
            {h.district && <p className="text-[.75rem] text-[#8E95A9] font-semibold mb-1">📍 {h.district}</p>}
            {(milesFromCentre != null || milesFromAirport != null) && (
              <p className="text-[.72rem] text-[#5C6378] font-semibold mb-2 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                {milesFromCentre != null && (
                  <span className="inline-flex items-center gap-1">
                    <i className="fa-solid fa-location-dot text-[.62rem] text-orange-500" />
                    {fmtMi(milesFromCentre)} mi from centre
                  </span>
                )}
                {milesFromCentre != null && milesFromAirport != null && <span className="text-[#D1D5DB]">·</span>}
                {milesFromAirport != null && airport && (
                  <span className="inline-flex items-center gap-1">
                    <i className="fa-solid fa-plane text-[.62rem] text-orange-500" />
                    {fmtMi(milesFromAirport)} mi from {airport.iata}
                  </span>
                )}
              </p>
            )}
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
            {/* Scout Deal badge — negotiated rate is lower than market */}
            {h.marketPerNight != null && h.negotiatedPerNight != null && h.negotiatedPerNight < h.marketPerNight && (
              <span className="inline-block text-[.55rem] font-black uppercase tracking-[1.2px] bg-gradient-to-r from-orange-500 to-amber-500 text-white px-2 py-0.5 rounded-full mb-1.5">Scout Deal</span>
            )}
            {priceView === 'perPerson' ? (
              <>
                {h.marketPrice != null && h.negotiatedPrice != null && h.negotiatedPrice < h.marketPrice && (
                  <div className="text-[.72rem] text-[#8E95A9] font-bold line-through mb-0.5">£{Math.round(h.marketPrice / Math.max(1, adults))}/person</div>
                )}
                <div className="font-poppins font-black text-[1.5rem] text-[#1A1D2B] leading-none">£{Math.round(displayTotal / Math.max(1, adults))}<span className="text-[.7rem] font-semibold text-[#8E95A9]">/person</span></div>
                {nights > 0 && (
                  <div className="text-[.68rem] text-[#8E95A9] font-semibold mt-0.5">£{displayTotal} total · {nights} night{nights !== 1 ? 's' : ''} · {adults} guest{adults !== 1 ? 's' : ''}</div>
                )}
              </>
            ) : (
              <>
                {h.marketPerNight != null && h.negotiatedPerNight != null && h.negotiatedPerNight < h.marketPerNight && (
                  <div className="text-[.72rem] text-[#8E95A9] font-bold line-through mb-0.5">£{h.marketPerNight}/night</div>
                )}
                <div className="font-poppins font-black text-[1.5rem] text-[#1A1D2B] leading-none">£{displayPrice}<span className="text-[.7rem] font-semibold text-[#8E95A9]">/night</span></div>
                {nights > 0 && (
                  <div className="text-[.68rem] text-[#8E95A9] font-semibold mt-0.5">£{displayTotal} total for {nights} night{nights !== 1 ? 's' : ''}</div>
                )}
              </>
            )}
            {/* Signal type badge */}
            {h.signalType && (
              <span className={`inline-flex items-center gap-1 mt-1.5 text-[.6rem] font-bold uppercase tracking-[0.8px] px-2 py-0.5 rounded-full ${
                h.signalType === 'high_demand' ? 'bg-red-50 text-red-600 border border-red-200' :
                h.signalType === 'selling_fast' ? 'bg-orange-50 text-orange-600 border border-orange-200' :
                'bg-blue-50 text-blue-600 border border-blue-200'
              }`}>
                <i className={`fa-solid ${h.signalType === 'high_demand' ? 'fa-fire' : h.signalType === 'selling_fast' ? 'fa-bolt' : 'fa-circle-info'} text-[.55rem]`} />
                {h.signalType.replace(/_/g, ' ')}
              </span>
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
          ...(typeof hotel.refundable === 'boolean' ? { refundable: hotel.refundable } : {}),
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
  'Checking Trip.com...',
  'Comparing Expedia...',
  'Searching live rates...',
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
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [checkin, setCheckin] = useState('');
  const [checkout, setCheckout] = useState('');
  const [adults, setAdults] = useState(2);
  const [childCount, setChildCount] = useState(0);
  const [childrenAges, setChildrenAges] = useState<number[]>([]);
  const [rooms, setRooms] = useState(1);
  const [minStars, setMinStars] = useState(0);
  const [boardFilter, setBoardFilter] = useState('any');
  const [refundableOnly, setRefundableOnly] = useState(false);

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
    const pid = p.get('placeId');
    if (dest) setDestination(dest);
    if (cin) setCheckin(cin);
    if (cout) setCheckout(cout);
    if (a) setAdults(Math.min(10, Math.max(1, parseInt(a))));
    if (c) setChildCount(Math.min(5, Math.max(0, parseInt(c))));
    if (r) setRooms(Math.min(5, Math.max(1, parseInt(r))));
    if (s) setMinStars(Math.min(5, Math.max(0, parseInt(s))));
    if (pid) setSelectedPlaceId(pid);
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
      if (selectedPlaceId) {
        params.set('placeId', selectedPlaceId);
      }
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
  }, [destination, selectedPlaceId, checkin, checkout, adults, childCount, rooms, minStars, childrenAges]);

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

  // Nearest airport for the searched destination (for "X mi from airport" labels)
  const airport = findAirport(searchedDest);

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
    if (refundableOnly && h.refundable !== true) return false;
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
    if (childrenAges.length > 0) qp.set('childrenAges', childrenAges.join(','));
    if (h.offerId) qp.set('offerId', h.offerId);
    if (h.totalPrice) qp.set('price', String(h.totalPrice));
    else qp.set('price', String(h.pricePerNight * Math.max(1, nights)));
    if (h.currency) qp.set('currency', h.currency);
    if (typeof h.refundable === 'boolean') qp.set('refundable', h.refundable ? '1' : '0');
    if (h.boardType) qp.set('board', h.boardType);
    if (h.negotiatedPrice != null) qp.set('negPrice', String(h.negotiatedPrice));
    if (h.marketPrice != null) qp.set('mktPrice', String(h.marketPrice));
    if (h.perks && h.perks.length > 0) qp.set('perks', h.perks.join(','));
    if (h.signalType) qp.set('signal', h.signalType);
    if (h.excludedTaxes != null && h.excludedTaxes > 0) qp.set('localFees', String(h.excludedTaxes));
    return `/hotels/${encodeURIComponent(String(h.id))}?${qp.toString()}`;
  };

  return (
    <>
      <Header />

      {/* ── Hero + Search ── Hotels gets its own identity: warm "luxury hotel lobby at night" palette
          (deep plum/chocolate) — distinct from the homepage navy so each page has its own personality. */}
      <section
        className="relative pt-36 pb-12 px-5 overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #1f1410 0%, #2c1a18 50%, #160a08 100%)' }}
      >
        {/* Ambient amber + rose blobs — animated warm lobby light */}
        <div className="absolute top-20 left-[10%] w-72 h-72 rounded-full bg-amber-500/20 blur-3xl pointer-events-none animate-blob-drift-a" />
        <div className="absolute bottom-10 right-[5%] w-80 h-80 rounded-full bg-rose-500/[.16] blur-3xl pointer-events-none animate-blob-drift-b" />
        <div className="absolute top-1/3 left-[42%] w-56 h-56 rounded-full bg-orange-400/[.14] blur-3xl pointer-events-none animate-blob-drift-c" />
        <div className="absolute top-1/2 right-[20%] w-40 h-40 rounded-full bg-amber-300/[.10] blur-3xl pointer-events-none animate-blob-drift-a" />

        {/* Floating glass squares — drift gently for ambient motion */}
        <div className="absolute top-32 right-[12%] w-48 h-48 rounded-2xl border border-amber-300/20 bg-white/[.05] backdrop-blur-sm rotate-12 hidden md:block pointer-events-none shadow-[0_30px_60px_-25px_rgba(245,158,11,0.4)] animate-float-slow" />
        <div className="absolute bottom-20 left-[7%] w-36 h-36 rounded-2xl border border-rose-300/20 bg-white/[.05] backdrop-blur-sm -rotate-6 hidden md:block pointer-events-none shadow-[0_30px_60px_-25px_rgba(244,63,94,0.35)] animate-float-slow-reverse" />
        <div className="absolute top-[60%] right-[6%] w-20 h-20 rounded-xl border border-orange-300/20 bg-white/[.05] backdrop-blur-sm rotate-[18deg] hidden lg:block pointer-events-none animate-float-slow-reverse" />
        <div className="absolute top-[24%] left-[6%] w-16 h-16 rounded-xl border border-amber-300/25 bg-white/[.05] backdrop-blur-sm -rotate-12 hidden lg:block pointer-events-none animate-float-slow" />

        {/* Sparkle dots — tiny ember-style particles */}
        <div className="absolute top-[28%] left-[28%] w-1.5 h-1.5 rounded-full bg-amber-300/80 shadow-[0_0_12px_4px_rgba(252,211,77,0.6)] pointer-events-none animate-twinkle" />
        <div className="absolute top-[55%] right-[32%] w-1 h-1 rounded-full bg-orange-300/80 shadow-[0_0_10px_3px_rgba(253,186,116,0.6)] pointer-events-none animate-twinkle-delay" />
        <div className="absolute top-[40%] right-[18%] w-1 h-1 rounded-full bg-rose-300/80 shadow-[0_0_10px_3px_rgba(253,164,175,0.5)] pointer-events-none animate-twinkle" />
        <div className="absolute bottom-[20%] left-[35%] w-1.5 h-1.5 rounded-full bg-amber-200/80 shadow-[0_0_12px_4px_rgba(254,243,199,0.55)] pointer-events-none animate-twinkle-delay" />

        <div className="max-w-[860px] mx-auto text-center mb-8 relative z-[1]">
          <span className="inline-flex items-center gap-1.5 backdrop-blur-md bg-gradient-to-r from-amber-500/15 to-rose-500/15 border border-amber-300/30 text-amber-300 text-[.65rem] font-black uppercase tracking-[2.5px] px-3.5 py-1.5 rounded-full mb-4 shadow-[0_4px_20px_rgba(245,158,11,0.25)]"><span className="text-base leading-none">🏨</span> Hotel Comparison</span>
          <h1 className="font-poppins text-[2.4rem] md:text-[3.6rem] font-black text-white leading-[1.05] tracking-tight mb-3">
            Find the <em className="italic bg-gradient-to-br from-amber-300 via-orange-400 to-rose-500 bg-clip-text text-transparent">Best</em> Hotels
          </h1>
          <p className="text-[1rem] text-white/60 font-semibold max-w-[520px] mx-auto">Compare trusted hotel providers — real prices shown right here.</p>
        </div>

        <div className="max-w-[860px] mx-auto bg-white border border-white/20 rounded-3xl p-6 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.6),0_8px_24px_-8px_rgba(245,158,11,0.3),0_0_0_1px_rgba(252,211,77,0.08)] relative z-[1]">

        {/* Animations for ambient blobs, glass squares and sparkles */}
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
          {/* Destination */}
          <div className="mb-3">
            <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Destination</label>
            <DestinationPicker value={destination} onChange={setDestination} onPlaceSelect={(p) => setSelectedPlaceId(p?.id || null)} />
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

          {/* Free cancellation filter */}
          <label className="flex items-center gap-2.5 mb-4 cursor-pointer select-none group">
            <div className={`relative w-9 h-5 rounded-full transition-colors ${refundableOnly ? 'bg-green-500' : 'bg-[#D1D5DB]'}`}
              onClick={() => setRefundableOnly(v => !v)}>
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${refundableOnly ? 'translate-x-4' : ''}`} />
            </div>
            <span className="text-[.78rem] font-bold text-[#1A1D2B] group-hover:text-green-600 transition-colors">Free cancellation only</span>
          </label>

          <button onClick={handleSearch} disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-poppins font-black text-[.95rem] py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(245,158,11,0.3)]">
            {loading ? 'Searching…' : 'Search Hotels →'}
          </button>
          <p className="text-center text-[.68rem] text-[#8E95A9] font-semibold mt-2.5">Free comparison · Prices shown here · Click any hotel to book on the provider</p>
        </div>
      </section>

      {/* ── Hot Deals ── */}
      {!searched && !loading && (
        <section
          className="pt-10 pb-6 px-5"
          style={{ background: 'linear-gradient(180deg, #EAD9C2 0%, #DFC8A9 50%, #EAD9C2 100%)' }}
        >
          <div className="max-w-[1100px] mx-auto">
          {/* Section header */}
          <div className="text-center mb-8">
            <span className="inline-block bg-white/70 backdrop-blur-sm border border-orange-300/50 text-orange-700 text-[.62rem] font-black uppercase tracking-[2.5px] px-3.5 py-1.5 rounded-full mb-3 shadow-[0_4px_12px_rgba(120,60,20,0.12)]">Hot Hotel Deals</span>
            <h2 className="font-poppins font-black text-[1.8rem] md:text-[2.4rem] text-[#3a1f10] leading-tight mb-2">
              Trending Destinations
            </h2>
            <p className="text-[.88rem] text-[#6b4a32] font-semibold max-w-[480px] mx-auto">
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
                    {/* Photo — prefer real hotel thumbnail over destination photo */}
                    <div className="relative h-36 overflow-hidden">
                      <img
                        src={hotel?.thumbnail || deal.photo}
                        alt={hotel?.name || deal.city}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                        onError={e => { (e.target as HTMLImageElement).src = deal.photo; }}
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
          </div>
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
                      cityCentre={cityCentre}
                      airport={airport}
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
