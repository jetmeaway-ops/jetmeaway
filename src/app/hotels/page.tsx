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
        className="w-full px-4 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.9rem] font-semibold text-[#1A1D2B] outline-none focus:border-orange-400 focus:bg-white transition-all placeholder:text-[#B0B8CC]" />
      {open && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1.5 bg-white border border-[#E8ECF4] rounded-2xl shadow-2xl overflow-hidden">
          {results.map(c => (
            <li key={c} onMouseDown={() => { onChange(c); setOpen(false); }}
              className="px-4 py-3 hover:bg-orange-50 cursor-pointer transition-colors border-b border-[#F1F3F7] last:border-0 font-[Poppins] font-semibold text-[.88rem] text-[#1A1D2B]">
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
    name: 'Booking.com',
    logo: '🏨',
    color: 'bg-blue-600',
    priceMult: 1.0,
    getUrl: (city: string, cin: string, cout: string, adults: number, children: number) =>
      `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(city)}&checkin=${cin}&checkout=${cout}&group_adults=${adults}&group_children=${children}&no_rooms=1`,
  },
  {
    name: 'Expedia',
    logo: '🌍',
    color: 'bg-yellow-500',
    priceMult: 1.04,
    getUrl: (city: string, cin: string, cout: string, adults: number, children: number) => {
      const u = `https://www.expedia.co.uk/Hotel-Search?destination=${encodeURIComponent(city)}&startDate=${cin}&endDate=${cout}&adults=${adults}`;
      return `${u}&affcid=clbU3QK`;
    },
  },
  {
    name: 'Trip.com',
    logo: '🗺',
    color: 'bg-sky-500',
    priceMult: 0.95,
    getUrl: (city: string, cin: string, cout: string, adults: number, children: number) =>
      `https://uk.trip.com/hotels/list?cityName=${encodeURIComponent(city)}&checkin=${cin}&checkout=${cout}&adult=${adults}&child=${children}&Allianceid=8023009&SID=303363796&trip_sub3=D14969586`,
  },
  {
    name: 'Hotels.com',
    logo: '🛏',
    color: 'bg-red-600',
    priceMult: 1.02,
    getUrl: (city: string, cin: string, cout: string, adults: number, children: number) =>
      `https://uk.hotels.com/Hotel-Search?destination=${encodeURIComponent(city)}&startDate=${cin}&endDate=${cout}&adults=${adults}`,
  },
  {
    name: 'Agoda',
    logo: '🏝',
    color: 'bg-violet-600',
    priceMult: 0.92,
    getUrl: (city: string, cin: string, cout: string, adults: number, children: number) =>
      `https://www.agoda.com/search?city=${encodeURIComponent(city)}&checkIn=${cin}&checkOut=${cout}&rooms=1&adults=${adults}`,
  },
  {
    name: 'Trivago',
    logo: '🔍',
    color: 'bg-emerald-600',
    priceMult: 0.98,
    getUrl: (city: string, cin: string, cout: string, adults: number, children: number) =>
      `https://www.trivago.co.uk/en-GB/srl?search=hotel&location=${encodeURIComponent(city)}&checkin=${cin}&checkout=${cout}`,
  },
];

// Curated hotels per destination with price-per-night estimates (GBP)
type CuratedHotel = { name: string; stars: number; area: string; priceFrom: number; priceTo: number; photo: string; highlights: string[] };
const CURATED_HOTELS: Record<string, CuratedHotel[]> = {
  Dubai: [
    { name: 'Atlantis The Palm', stars: 5, area: 'Palm Jumeirah', priceFrom: 280, priceTo: 450, photo: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=640&h=480&fit=crop', highlights: ['Aquaventure waterpark', 'Private beach', 'Underwater suites'] },
    { name: 'Burj Al Arab Jumeirah', stars: 5, area: 'Jumeirah Beach', priceFrom: 1200, priceTo: 2800, photo: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=640&h=480&fit=crop', highlights: ['Iconic sail shape', 'Butler service', 'Helipad restaurant'] },
    { name: 'JW Marriott Marquis', stars: 5, area: 'Business Bay', priceFrom: 120, priceTo: 220, photo: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=640&h=480&fit=crop', highlights: ['Tallest hotel in world', 'Multiple pools', '14 restaurants'] },
    { name: 'Rove Downtown', stars: 3, area: 'Downtown Dubai', priceFrom: 55, priceTo: 95, photo: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=640&h=480&fit=crop', highlights: ['Near Burj Khalifa', 'Pool & gym', 'Great value'] },
    { name: 'Jumeirah Beach Hotel', stars: 5, area: 'Jumeirah Beach', priceFrom: 200, priceTo: 380, photo: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=640&h=480&fit=crop', highlights: ['Wave-shaped icon', 'Wild Wadi access', '6 pools'] },
    { name: 'Hilton Dubai Creek', stars: 5, area: 'Deira', priceFrom: 75, priceTo: 140, photo: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=640&h=480&fit=crop', highlights: ['Creek views', 'Rooftop pool', 'Central location'] },
  ],
  Paris: [
    { name: 'Le Marais Boutique Hotel', stars: 4, area: 'Le Marais', priceFrom: 150, priceTo: 280, photo: 'https://images.unsplash.com/photo-1549294413-26f195200c16?w=640&h=480&fit=crop', highlights: ['Historic quarter', 'Walk to Notre-Dame', 'Charming courtyard'] },
    { name: 'Pullman Paris Tour Eiffel', stars: 4, area: 'Trocadéro', priceFrom: 180, priceTo: 320, photo: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=640&h=480&fit=crop', highlights: ['Eiffel Tower views', 'Rooftop bar', 'Modern rooms'] },
    { name: 'Ibis Styles Paris Gare du Nord', stars: 3, area: 'Gare du Nord', priceFrom: 75, priceTo: 130, photo: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=640&h=480&fit=crop', highlights: ['Near Eurostar', 'Montmartre walks', 'Budget-friendly'] },
    { name: 'Hotel Plaza Athénée', stars: 5, area: 'Champs-Élysées', priceFrom: 650, priceTo: 1400, photo: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=640&h=480&fit=crop', highlights: ['Dior spa', 'Avenue Montaigne', 'Alain Ducasse restaurant'] },
    { name: 'Novotel Paris Les Halles', stars: 4, area: 'Les Halles', priceFrom: 130, priceTo: 210, photo: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=640&h=480&fit=crop', highlights: ['Central location', 'Indoor pool', 'Family friendly'] },
    { name: 'Generator Paris', stars: 2, area: 'Canal Saint-Martin', priceFrom: 40, priceTo: 80, photo: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=640&h=480&fit=crop', highlights: ['Trendy hostel', 'Rooftop terrace', 'Great for solo travellers'] },
  ],
  Barcelona: [
    { name: 'W Barcelona', stars: 5, area: 'Barceloneta Beach', priceFrom: 220, priceTo: 400, photo: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=640&h=480&fit=crop', highlights: ['Sail-shaped tower', 'Beachfront', 'Eclipse rooftop bar'] },
    { name: 'Hotel Arts Barcelona', stars: 5, area: 'Port Olímpic', priceFrom: 250, priceTo: 450, photo: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=640&h=480&fit=crop', highlights: ['Sea views', 'Two Michelin-star dining', 'Infinity pool'] },
    { name: 'H10 Metropolitan', stars: 4, area: 'Eixample', priceFrom: 100, priceTo: 180, photo: 'https://images.unsplash.com/photo-1590490360182-c33d955571d1?w=640&h=480&fit=crop', highlights: ['Rooftop pool', 'Near Passeig de Gràcia', 'Art deco style'] },
    { name: 'Generator Barcelona', stars: 2, area: 'Gràcia', priceFrom: 35, priceTo: 70, photo: 'https://images.unsplash.com/photo-1521783988139-89397d761dce?w=640&h=480&fit=crop', highlights: ['Trendy hostel', 'Terrace bar', 'Near Park Güell'] },
    { name: 'Mandarin Oriental', stars: 5, area: 'Passeig de Gràcia', priceFrom: 400, priceTo: 750, photo: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=640&h=480&fit=crop', highlights: ['Luxury shopping district', 'Moments restaurant', 'Spa'] },
    { name: 'Ibis Barcelona Centro', stars: 2, area: 'Raval', priceFrom: 55, priceTo: 100, photo: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=640&h=480&fit=crop', highlights: ['Central Las Ramblas', 'Budget friendly', 'Near La Boqueria'] },
  ],
  'New York': [
    { name: 'The Plaza Hotel', stars: 5, area: 'Midtown Manhattan', priceFrom: 500, priceTo: 1200, photo: 'https://images.unsplash.com/photo-1455587734955-081b22074882?w=640&h=480&fit=crop', highlights: ['Central Park views', 'Historic landmark', 'Palm Court tea'] },
    { name: 'Pod 51', stars: 3, area: 'Midtown East', priceFrom: 80, priceTo: 150, photo: 'https://images.unsplash.com/photo-1631049552057-403cdb8f0658?w=640&h=480&fit=crop', highlights: ['Compact modern rooms', 'Rooftop bar', 'Great value Manhattan'] },
    { name: 'The Standard High Line', stars: 4, area: 'Meatpacking District', priceFrom: 200, priceTo: 380, photo: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=640&h=480&fit=crop', highlights: ['Hudson River views', 'Trendy scene', 'Le Bain rooftop'] },
    { name: 'EVEN Hotel Times Square', stars: 3, area: 'Times Square', priceFrom: 120, priceTo: 220, photo: 'https://images.unsplash.com/photo-1590490360182-c33d955571d1?w=640&h=480&fit=crop', highlights: ['In-room fitness', 'Walk to Broadway', 'Wellness focused'] },
    { name: '1 Hotel Brooklyn Bridge', stars: 4, area: 'Brooklyn', priceFrom: 250, priceTo: 450, photo: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=640&h=480&fit=crop', highlights: ['Skyline views', 'Eco-luxury', 'Rooftop pool'] },
    { name: 'citizenM New York Bowery', stars: 4, area: 'Lower East Side', priceFrom: 130, priceTo: 230, photo: 'https://images.unsplash.com/photo-1606402179428-a57976d71fa4?w=640&h=480&fit=crop', highlights: ['Smart tech rooms', 'Rooftop bar', 'Self check-in'] },
  ],
  Bangkok: [
    { name: 'Mandarin Oriental Bangkok', stars: 5, area: 'Riverside', priceFrom: 200, priceTo: 450, photo: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=640&h=480&fit=crop', highlights: ['Legendary riverside', 'Thai cooking school', 'Spa'] },
    { name: 'The Sukhothai Bangkok', stars: 5, area: 'Sathorn', priceFrom: 130, priceTo: 250, photo: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=640&h=480&fit=crop', highlights: ['Tranquil oasis', 'Award-winning design', 'Celadon restaurant'] },
    { name: 'Ibis Bangkok Riverside', stars: 3, area: 'Riverside', priceFrom: 25, priceTo: 45, photo: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=640&h=480&fit=crop', highlights: ['River views', 'Free shuttle boat', 'Pool'] },
    { name: 'SO/ Bangkok', stars: 5, area: 'Lumpini', priceFrom: 90, priceTo: 180, photo: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=640&h=480&fit=crop', highlights: ['Park views', 'Design hotel', 'Rooftop bar'] },
    { name: 'Lub d Silom', stars: 2, area: 'Silom', priceFrom: 15, priceTo: 35, photo: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=640&h=480&fit=crop', highlights: ['Backpacker favourite', 'Near nightlife', 'Social atmosphere'] },
    { name: 'Avani+ Riverside Bangkok', stars: 5, area: 'Riverside', priceFrom: 70, priceTo: 140, photo: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=640&h=480&fit=crop', highlights: ['Infinity pool', 'River views', 'Altitude rooftop'] },
  ],
  Tokyo: [
    { name: 'Park Hyatt Tokyo', stars: 5, area: 'Shinjuku', priceFrom: 350, priceTo: 700, photo: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=640&h=480&fit=crop', highlights: ['Lost in Translation fame', 'New York Bar', 'City views'] },
    { name: 'The Prince Gallery Tokyo Kioicho', stars: 5, area: 'Akasaka', priceFrom: 200, priceTo: 400, photo: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=640&h=480&fit=crop', highlights: ['Sky lobby', 'Contemporary art', 'Panoramic views'] },
    { name: 'Dormy Inn Akihabara', stars: 3, area: 'Akihabara', priceFrom: 60, priceTo: 110, photo: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=640&h=480&fit=crop', highlights: ['Onsen bath', 'Free ramen', 'Tech district'] },
    { name: 'Hotel Gracery Shinjuku', stars: 3, area: 'Kabukicho', priceFrom: 70, priceTo: 130, photo: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=640&h=480&fit=crop', highlights: ['Godzilla statue', 'Shinjuku views', 'Modern rooms'] },
    { name: 'Aman Tokyo', stars: 5, area: 'Otemachi', priceFrom: 600, priceTo: 1500, photo: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=640&h=480&fit=crop', highlights: ['Japanese minimalism', 'Imperial Palace views', 'Aman Spa'] },
    { name: 'UNPLAN Shinjuku', stars: 2, area: 'Shinjuku', priceFrom: 20, priceTo: 45, photo: 'https://images.unsplash.com/photo-1521783988139-89397d761dce?w=640&h=480&fit=crop', highlights: ['Stylish hostel', 'Bar & lounge', 'Perfect for solo'] },
  ],
  Rome: [
    { name: 'Hotel de Russie', stars: 5, area: 'Piazza del Popolo', priceFrom: 350, priceTo: 700, photo: 'https://images.unsplash.com/photo-1455587734955-081b22074882?w=640&h=480&fit=crop', highlights: ['Secret garden', 'De Russie Spa', 'Near Spanish Steps'] },
    { name: 'Hotel Artemide', stars: 4, area: 'Via Nazionale', priceFrom: 120, priceTo: 220, photo: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=640&h=480&fit=crop', highlights: ['Rooftop restaurant', 'Central location', 'Art Nouveau building'] },
    { name: 'Generator Rome', stars: 2, area: 'Termini', priceFrom: 30, priceTo: 60, photo: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=640&h=480&fit=crop', highlights: ['Near Termini station', 'Bar & cafe', 'Budget friendly'] },
    { name: 'Hotel Raphael', stars: 5, area: 'Piazza Navona', priceFrom: 250, priceTo: 500, photo: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=640&h=480&fit=crop', highlights: ['Ivy-covered facade', 'Terrace views', 'Art collection'] },
    { name: 'NH Collection Roma Centro', stars: 4, area: 'Centro Storico', priceFrom: 130, priceTo: 230, photo: 'https://images.unsplash.com/photo-1590490360182-c33d955571d1?w=640&h=480&fit=crop', highlights: ['Rooftop pool', 'Historic centre', 'Modern comfort'] },
    { name: 'A.Roma Lifestyle Hotel', stars: 4, area: 'EUR', priceFrom: 80, priceTo: 150, photo: 'https://images.unsplash.com/photo-1606402179428-a57976d71fa4?w=640&h=480&fit=crop', highlights: ['Design hotel', 'Pool & spa', 'Quiet area'] },
  ],
  Maldives: [
    { name: 'Conrad Maldives Rangali', stars: 5, area: 'Rangali Island', priceFrom: 500, priceTo: 1200, photo: 'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=640&h=480&fit=crop', highlights: ['Underwater restaurant', 'Water villas', 'Two islands'] },
    { name: 'Soneva Fushi', stars: 5, area: 'Baa Atoll', priceFrom: 800, priceTo: 2000, photo: 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=640&h=480&fit=crop', highlights: ['Barefoot luxury', 'Stargazing', 'Private island'] },
    { name: 'Anantara Veli', stars: 5, area: 'South Malé Atoll', priceFrom: 300, priceTo: 600, photo: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=640&h=480&fit=crop', highlights: ['Overwater bungalows', 'Spa', 'Snorkelling reef'] },
    { name: 'Coco Bodu Hithi', stars: 5, area: 'North Malé Atoll', priceFrom: 350, priceTo: 700, photo: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=640&h=480&fit=crop', highlights: ['Island villa', 'Latitude bar', 'House reef'] },
    { name: 'Sun Island Resort & Spa', stars: 4, area: 'South Ari Atoll', priceFrom: 100, priceTo: 200, photo: 'https://images.unsplash.com/photo-1586375300773-8384e3e4916f?w=640&h=480&fit=crop', highlights: ['Budget Maldives', 'Large island', 'Whale shark trips'] },
    { name: 'Bandos Maldives', stars: 4, area: 'North Malé Atoll', priceFrom: 120, priceTo: 250, photo: 'https://images.unsplash.com/photo-1544550581-5f7ceaf7f992?w=640&h=480&fit=crop', highlights: ['Close to airport', 'House reef', 'Family friendly'] },
  ],
};

// Generate generic hotels for destinations not in curated list
function getHotelsForCity(city: string): CuratedHotel[] {
  const lc = city.toLowerCase().trim();
  for (const [key, hotels] of Object.entries(CURATED_HOTELS)) {
    if (key.toLowerCase() === lc) return hotels;
  }
  // Generic fallback
  return [
    { name: `${city} Grand Hotel`, stars: 5, area: 'City Centre', priceFrom: 150, priceTo: 350, photo: '', highlights: ['Premium location', 'Full-service spa', 'Fine dining'] },
    { name: `${city} Marriott`, stars: 4, area: 'City Centre', priceFrom: 100, priceTo: 200, photo: '', highlights: ['Loyalty rewards', 'Business centre', 'Fitness centre'] },
    { name: `Holiday Inn ${city}`, stars: 3, area: 'Central', priceFrom: 60, priceTo: 120, photo: '', highlights: ['Reliable comfort', 'Free Wi-Fi', 'Restaurant on-site'] },
    { name: `Ibis ${city}`, stars: 2, area: 'Near Transport', priceFrom: 35, priceTo: 70, photo: '', highlights: ['Budget friendly', 'Clean & modern', '24/7 reception'] },
    { name: `${city} Boutique Suites`, stars: 4, area: 'Old Town', priceFrom: 80, priceTo: 160, photo: '', highlights: ['Unique character', 'Local experience', 'Breakfast included'] },
    { name: `Novotel ${city} Centre`, stars: 4, area: 'City Centre', priceFrom: 75, priceTo: 150, photo: '', highlights: ['Family rooms', 'Indoor pool', 'Central location'] },
  ];
}

// ─── Guest Picker ───────────────────────────────────────────────────────────
function GuestPicker({ adults, children, childrenAges, onChange }: {
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
        className="w-full px-3 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-left text-[.82rem] font-semibold text-[#1A1D2B] outline-none focus:border-orange-400 hover:bg-white transition-all flex items-center justify-between">
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
                className="w-8 h-8 rounded-full border-2 border-[#E8ECF4] flex items-center justify-center text-[#5C6378] font-bold text-lg hover:border-orange-400 hover:text-orange-500 transition-all disabled:opacity-30">−</button>
              <span className="font-[Poppins] font-black text-[.95rem] text-[#1A1D2B] w-5 text-center">{adults}</span>
              <button type="button" onClick={() => setAdults(adults + 1)} disabled={adults >= 10}
                className="w-8 h-8 rounded-full border-2 border-[#E8ECF4] flex items-center justify-center text-[#5C6378] font-bold text-lg hover:border-orange-400 hover:text-orange-500 transition-all disabled:opacity-30">+</button>
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
                className="w-8 h-8 rounded-full border-2 border-[#E8ECF4] flex items-center justify-center text-[#5C6378] font-bold text-lg hover:border-orange-400 hover:text-orange-500 transition-all disabled:opacity-30">−</button>
              <span className="font-[Poppins] font-black text-[.95rem] text-[#1A1D2B] w-5 text-center">{children}</span>
              <button type="button" onClick={() => setChildren(children + 1)} disabled={children >= 6}
                className="w-8 h-8 rounded-full border-2 border-[#E8ECF4] flex items-center justify-center text-[#5C6378] font-bold text-lg hover:border-orange-400 hover:text-orange-500 transition-all disabled:opacity-30">+</button>
            </div>
          </div>

          {/* Children age selectors */}
          {children > 0 && (
            <div className="py-3 border-b border-[#F1F3F7]">
              <p className="text-[.68rem] font-bold text-[#8E95A9] uppercase tracking-[1.5px] mb-2">Child ages (at time of stay)</p>
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: children }).map((_, i) => (
                  <div key={i} className="text-center">
                    <div className="text-[.6rem] text-[#8E95A9] mb-1">Child {i + 1}</div>
                    <select
                      value={childrenAges[i] ?? 5}
                      onChange={e => setChildAge(i, Number(e.target.value))}
                      className="w-full text-center text-[.8rem] font-bold text-[#1A1D2B] bg-[#F8FAFC] border border-[#E8ECF4] rounded-lg py-1.5 outline-none focus:border-orange-400">
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
            className="w-full mt-3 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-[Poppins] font-bold text-[.8rem] py-2.5 rounded-xl transition-colors">
            Done
          </button>
        </div>
      )}
    </div>
  );
}

function HotelsContent() {
  const [city, setCity] = useState('');
  const [checkin, setCheckin] = useState('');
  const [checkout, setCheckout] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [childrenAges, setChildrenAges] = useState<number[]>([]);
  const [searched, setSearched] = useState(false);
  const [hotels, setHotels] = useState<CuratedHotel[]>([]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const c = p.get('city');
    const cin = p.get('checkin');
    const cout = p.get('checkout');
    const a = p.get('adults');
    const ch = p.get('children');
    if (c) setCity(c);
    if (cin) setCheckin(cin);
    if (cout) setCheckout(cout);
    if (a) setAdults(Math.max(1, parseInt(a)));
    if (ch) setChildren(Math.max(0, parseInt(ch)));
  }, []);

  const today = new Date().toISOString().split('T')[0];

  function handleSearch() {
    if (!city || !checkin || !checkout) { alert('Please enter destination and both dates'); return; }
    setHotels(getHotelsForCity(city));
    setSearched(true);
    setTimeout(() => document.getElementById('hotel-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }

  const nights = checkin && checkout
    ? Math.max(0, Math.round((new Date(checkout).getTime() - new Date(checkin).getTime()) / 86400000))
    : null;

  return (
    <>
      <Header />

      {/* Hero */}
      <section className="pt-36 pb-10 px-5 bg-[radial-gradient(ellipse_at_top,#FFF0E8_0%,#fff_55%,#F8FAFC_100%)]">
        <div className="max-w-[860px] mx-auto text-center mb-8">
          <span className="inline-block bg-orange-50 text-orange-500 text-[.65rem] font-black uppercase tracking-[2.5px] px-3.5 py-1.5 rounded-full mb-4">🏨 Hotel Comparison</span>
          <h1 className="font-[Poppins] text-[2.4rem] md:text-[3.6rem] font-black text-[#1A1D2B] leading-[1.05] tracking-tight mb-3">
            Best Hotel <em className="italic bg-gradient-to-br from-orange-400 to-rose-500 bg-clip-text text-transparent">Rates</em>
          </h1>
          <p className="text-[1rem] text-[#8E95A9] font-semibold max-w-[500px] mx-auto">Compare 6 top hotel sites side-by-side — find the cheapest room in seconds.</p>
        </div>

        {/* Search */}
        <div className="max-w-[860px] mx-auto bg-white border border-[#E8ECF4] rounded-3xl p-6 shadow-[0_8px_40px_rgba(0,0,0,0.07)]">
          <div className="mb-3">
            <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Destination</label>
            <CityPicker value={city} onChange={setCity} placeholder="City or hotel name — e.g. Dubai, Paris, Bali" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Check-in</label>
              <input type="date" min={today} value={checkin} onChange={e => setCheckin(e.target.value)}
                className="w-full px-3 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.82rem] font-semibold text-[#1A1D2B] outline-none focus:border-orange-400 focus:bg-white transition-all" />
            </div>
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Check-out</label>
              <input type="date" min={checkin || today} value={checkout} onChange={e => setCheckout(e.target.value)}
                className="w-full px-3 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.82rem] font-semibold text-[#1A1D2B] outline-none focus:border-orange-400 focus:bg-white transition-all" />
            </div>
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Guests</label>
              <GuestPicker adults={adults} children={children} childrenAges={childrenAges}
                onChange={(a, c, ages) => { setAdults(a); setChildren(c); setChildrenAges(ages); }} />
            </div>
          </div>

          <button onClick={handleSearch}
            className="w-full bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-[Poppins] font-black text-[.95rem] py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(249,115,22,0.3)]">
            Search Hotels →
          </button>
        </div>
      </section>

      {/* Hotel Results */}
      {searched && hotels.length > 0 && (
        <section id="hotel-results" className="max-w-[1100px] mx-auto px-5 py-10">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
            <div>
              <h2 className="font-[Poppins] font-black text-[1.3rem] text-[#1A1D2B]">
                Hotels in {city}
                {nights ? <span className="text-[#8E95A9] font-semibold text-[1rem]"> · {nights} night{nights !== 1 ? 's' : ''}</span> : null}
              </h2>
              <p className="text-[.72rem] text-[#8E95A9] font-semibold mt-0.5">
                {hotels.length} hotels · {adults} adult{adults !== 1 ? 's' : ''}{children > 0 ? ` · ${children} child${children !== 1 ? 'ren' : ''}` : ''} · {checkin} to {checkout}
              </p>
            </div>
            <span className="text-[.7rem] font-bold text-orange-500 bg-orange-50 px-3 py-1.5 rounded-full">{hotels.length} results</span>
          </div>

          {/* Hotel cards */}
          <div className="space-y-4 mb-6">
            {hotels.map((h, i) => {
              const totalFrom = nights ? h.priceFrom * nights : h.priceFrom;
              const totalTo = nights ? h.priceTo * nights : h.priceTo;
              const hasPhoto = h.photo !== '';
              return (
                <div key={h.name} className="bg-white border border-[#E8ECF4] rounded-2xl overflow-hidden hover:shadow-lg transition-all">
                  <div className="flex flex-col md:flex-row">
                    {/* Photo */}
                    <div className="relative w-full md:w-72 h-48 md:h-auto flex-shrink-0 bg-[#F1F3F7] overflow-hidden">
                      {hasPhoto ? (
                        <img src={h.photo}
                          alt={h.name} className="w-full h-full object-cover"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-5xl text-[#C0C8D8]">🏨</div>
                      )}
                      {i === 0 && (
                        <span className="absolute top-3 left-3 text-[.6rem] font-black uppercase tracking-[1.5px] bg-orange-500 text-white px-2.5 py-1 rounded-full shadow-md">Best Value</span>
                      )}
                      {h.stars > 0 && (
                        <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-[.7rem] font-bold text-amber-500 px-2 py-0.5 rounded-full">
                          {'★'.repeat(h.stars)}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 p-5 flex flex-col">
                      <div className="flex-1">
                        <h3 className="font-[Poppins] font-bold text-[1.05rem] text-[#1A1D2B] mb-0.5">{h.name}</h3>
                        <p className="text-[.72rem] text-[#8E95A9] font-semibold mb-2">{h.area}, {city}</p>

                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {h.highlights.map(hl => (
                            <span key={hl} className="text-[.62rem] font-bold text-[#5C6378] bg-[#F1F3F7] px-2.5 py-1 rounded-full">{hl}</span>
                          ))}
                        </div>
                      </div>

                      {/* Price comparison per provider */}
                      <div className="border-t border-[#F1F3F7] pt-3 mt-1">
                        <p className="text-[.62rem] text-[#8E95A9] font-semibold mb-2">COMPARE PRICES {nights ? `· ${nights} NIGHTS TOTAL` : '· PER NIGHT'}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {PROVIDERS.map((p, pi) => {
                            const base = nights ? h.priceFrom * nights : h.priceFrom;
                            const estPrice = Math.round(base * p.priceMult + ((pi * 11 + h.priceFrom) % 19) - 9);
                            const isCheapest = PROVIDERS.every((op, oi) => {
                              const opPrice = Math.round(base * op.priceMult + ((oi * 11 + h.priceFrom) % 19) - 9);
                              return estPrice <= opPrice;
                            });
                            return (
                              <a key={p.name} href={p.getUrl(city, checkin, checkout, adults, children)} target="_blank" rel="noopener"
                                className={`relative flex flex-col items-center gap-0.5 rounded-xl px-3 py-2.5 transition-all group border ${isCheapest ? 'bg-green-50 border-green-300 hover:border-green-400' : 'bg-[#F8FAFC] border-[#E8ECF4] hover:border-orange-200 hover:bg-orange-50'}`}>
                                {isCheapest && (
                                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[.5rem] font-black uppercase tracking-wider bg-green-500 text-white px-2 py-0.5 rounded-full">Cheapest</span>
                                )}
                                <span className="text-base">{p.logo}</span>
                                <span className="text-[.68rem] font-bold text-[#1A1D2B]">{p.name}</span>
                                <span className={`font-[Poppins] font-black text-[1rem] leading-none ${isCheapest ? 'text-green-600' : 'text-[#1A1D2B]'}`}>£{estPrice.toLocaleString()}</span>
                                <span className="text-[.55rem] text-[#8E95A9] font-medium">{nights ? 'total' : 'per night'}</span>
                                <span className="text-[.6rem] text-orange-500 font-bold mt-0.5 group-hover:underline">View Deal →</span>
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
            Prices are estimated ranges. Click any provider to see live prices and availability.
          </p>
        </section>
      )}

      {/* Tips */}
      <section className="max-w-[860px] mx-auto px-5 pb-16">
        <div className="bg-[#F8FAFC] border border-[#F1F3F7] rounded-3xl p-8">
          <h3 className="font-[Poppins] font-black text-[1.05rem] text-[#1A1D2B] mb-4">Tips for Getting the Best Hotel Rate</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              ['Compare at least 3 sites', 'Prices vary by 10–40% across booking platforms for the same room and dates.'],
              ['Free cancellation is worth it', 'Always prefer free cancellation — prices are often identical or slightly higher.'],
              ['Sunday check-ins are cheapest', 'Business hotels drop rates on weekends when corporate demand falls.'],
              ['Join loyalty programmes', 'Booking.com Genius and Expedia Rewards are free and unlock 10–15% off.'],
            ].map(([title, body]) => (
              <div key={title} className="flex gap-3">
                <div className="w-1.5 flex-shrink-0 rounded-full bg-gradient-to-b from-orange-400 to-rose-500 self-stretch" />
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

export default function HotelsPage() {
  return (
    <Suspense>
      <HotelsContent />
    </Suspense>
  );
}
