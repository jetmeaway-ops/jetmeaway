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
  // Pakistan
  'Lahore', 'Karachi', 'Islamabad', 'Peshawar', 'Faisalabad', 'Rawalpindi', 'Multan',
  // India expanded
  'Delhi', 'Goa', 'Jaipur', 'Udaipur', 'Kolkata', 'Chennai', 'Bangalore', 'Hyderabad',
  // Middle East expanded
  'Abu Dhabi', 'Muscat', 'Riyadh', 'Jeddah', 'Kuwait City', 'Bahrain', 'Amman', 'Beirut',
  // Southeast Asia expanded
  'Hanoi', 'Ho Chi Minh City', 'Siem Reap', 'Colombo', 'Langkawi', 'Penang', 'Manila', 'Cebu',
  // East Asia expanded
  'Osaka', 'Kyoto', 'Taipei', 'Beijing', 'Macau', 'Busan',
  // Europe expanded
  'Berlin', 'Munich', 'Madrid', 'Seville', 'Malaga', 'Santorini', 'Mykonos', 'Corfu',
  'Florence', 'Amalfi', 'Bruges', 'Salzburg', 'Zurich', 'Interlaken', 'Monaco', 'Malta',
  'Tallinn', 'Riga', 'Vilnius', 'Sofia', 'Belgrade', 'Tbilisi', 'Batumi',
  // Africa expanded
  'Zanzibar', 'Dar es Salaam', 'Accra', 'Lagos', 'Casablanca', 'Tunis', 'Sharm El Sheikh', 'Hurghada',
  // Americas expanded
  'Bogotá', 'Medellín', 'Cartagena', 'Santiago', 'Cusco', 'Mexico City', 'Playa del Carmen',
  'Montego Bay', 'Barbados', 'Aruba', 'Nassau', 'Bermuda',
  // Oceania expanded
  'Gold Coast', 'Fiji', 'Queenstown', 'Perth', 'Cairns',
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
      `https://www.trip.com/hotels/list?cityName=${encodeURIComponent(city)}&checkin=${cin}&checkout=${cout}&adult=${adults}&child=${children}&Allianceid=8023009&SID=303363796&trip_sub1=&trip_sub3=D15021113`,
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

const U = (id: string) => `https://images.unsplash.com/photo-${id}?w=640&h=480&fit=crop`;

// Curated hotels per destination with price-per-night estimates (GBP)
type CuratedHotel = { name: string; stars: number; area: string; priceFrom: number; priceTo: number; photos: string[]; highlights: string[] };
const CURATED_HOTELS: Record<string, CuratedHotel[]> = {
  Dubai: [
    { name: 'Atlantis The Palm', stars: 5, area: 'Palm Jumeirah', priceFrom: 280, priceTo: 450, photos: [U('1582719478250-c89cae4dc85b'), U('1566073771259-6a8506099945'), U('1520250497591-112f2f40a3f4')], highlights: ['Aquaventure waterpark', 'Private beach', 'Underwater suites'] },
    { name: 'Burj Al Arab Jumeirah', stars: 5, area: 'Jumeirah Beach', priceFrom: 1200, priceTo: 2800, photos: [U('1512453979798-5ea266f8880c'), U('1582719508461-905c673771fd'), U('1551882547-ff40c63fe5fa')], highlights: ['Iconic sail shape', 'Butler service', 'Helipad restaurant'] },
    { name: 'JW Marriott Marquis', stars: 5, area: 'Business Bay', priceFrom: 120, priceTo: 220, photos: [U('1566073771259-6a8506099945'), U('1571003123894-1f0594d2b5d9'), U('1590490360182-c33d955571d1')], highlights: ['Tallest hotel in world', 'Multiple pools', '14 restaurants'] },
    { name: 'Rove Downtown', stars: 3, area: 'Downtown Dubai', priceFrom: 55, priceTo: 95, photos: [U('1618773928121-c32242e63f39'), U('1631049307264-da0ec9d70304'), U('1596394516093-501ba68a0ba6')], highlights: ['Near Burj Khalifa', 'Pool & gym', 'Great value'] },
    { name: 'Jumeirah Beach Hotel', stars: 5, area: 'Jumeirah Beach', priceFrom: 200, priceTo: 380, photos: [U('1520250497591-112f2f40a3f4'), U('1566073771259-6a8506099945'), U('1582719478250-c89cae4dc85b')], highlights: ['Wave-shaped icon', 'Wild Wadi access', '6 pools'] },
    { name: 'Hilton Dubai Creek', stars: 5, area: 'Deira', priceFrom: 75, priceTo: 140, photos: [U('1551882547-ff40c63fe5fa'), U('1564501049412-61c2a3083791'), U('1590490360182-c33d955571d1')], highlights: ['Creek views', 'Rooftop pool', 'Central location'] },
  ],
  Paris: [
    { name: 'Le Marais Boutique Hotel', stars: 4, area: 'Le Marais', priceFrom: 150, priceTo: 280, photos: [U('1549294413-26f195200c16'), U('1445019980597-93fa8acb246c'), U('1564501049412-61c2a3083791')], highlights: ['Historic quarter', 'Walk to Notre-Dame', 'Charming courtyard'] },
    { name: 'Pullman Paris Tour Eiffel', stars: 4, area: 'Trocadéro', priceFrom: 180, priceTo: 320, photos: [U('1502602898657-3e91760cbb34'), U('1549294413-26f195200c16'), U('1611892440504-42a792e24d32')], highlights: ['Eiffel Tower views', 'Rooftop bar', 'Modern rooms'] },
    { name: 'Ibis Styles Paris Gare du Nord', stars: 3, area: 'Gare du Nord', priceFrom: 75, priceTo: 130, photos: [U('1596394516093-501ba68a0ba6'), U('1631049307264-da0ec9d70304'), U('1555854877-bab0e564b8d5')], highlights: ['Near Eurostar', 'Montmartre walks', 'Budget-friendly'] },
    { name: 'Hotel Plaza Athénée', stars: 5, area: 'Champs-Élysées', priceFrom: 650, priceTo: 1400, photos: [U('1445019980597-93fa8acb246c'), U('1542314831-068cd1dbfeeb'), U('1578683010236-d716f9a3f461')], highlights: ['Dior spa', 'Avenue Montaigne', 'Alain Ducasse restaurant'] },
    { name: 'Novotel Paris Les Halles', stars: 4, area: 'Les Halles', priceFrom: 130, priceTo: 210, photos: [U('1564501049412-61c2a3083791'), U('1611892440504-42a792e24d32'), U('1590490360182-c33d955571d1')], highlights: ['Central location', 'Indoor pool', 'Family friendly'] },
    { name: 'Generator Paris', stars: 2, area: 'Canal Saint-Martin', priceFrom: 40, priceTo: 80, photos: [U('1555854877-bab0e564b8d5'), U('1521783988139-89397d761dce'), U('1596394516093-501ba68a0ba6')], highlights: ['Trendy hostel', 'Rooftop terrace', 'Great for solo travellers'] },
  ],
  Barcelona: [
    { name: 'W Barcelona', stars: 5, area: 'Barceloneta Beach', priceFrom: 220, priceTo: 400, photos: [U('1571003123894-1f0594d2b5d9'), U('1590490360182-c33d955571d1'), U('1566073771259-6a8506099945')], highlights: ['Sail-shaped tower', 'Beachfront', 'Eclipse rooftop bar'] },
    { name: 'Hotel Arts Barcelona', stars: 5, area: 'Port Olímpic', priceFrom: 250, priceTo: 450, photos: [U('1542314831-068cd1dbfeeb'), U('1582719508461-905c673771fd'), U('1520250497591-112f2f40a3f4')], highlights: ['Sea views', 'Two Michelin-star dining', 'Infinity pool'] },
    { name: 'H10 Metropolitan', stars: 4, area: 'Eixample', priceFrom: 100, priceTo: 180, photos: [U('1590490360182-c33d955571d1'), U('1564501049412-61c2a3083791'), U('1611892440504-42a792e24d32')], highlights: ['Rooftop pool', 'Near Passeig de Gràcia', 'Art deco style'] },
    { name: 'Generator Barcelona', stars: 2, area: 'Gràcia', priceFrom: 35, priceTo: 70, photos: [U('1521783988139-89397d761dce'), U('1555854877-bab0e564b8d5'), U('1596394516093-501ba68a0ba6')], highlights: ['Trendy hostel', 'Terrace bar', 'Near Park Güell'] },
    { name: 'Mandarin Oriental', stars: 5, area: 'Passeig de Gràcia', priceFrom: 400, priceTo: 750, photos: [U('1611892440504-42a792e24d32'), U('1578683010236-d716f9a3f461'), U('1542314831-068cd1dbfeeb')], highlights: ['Luxury shopping district', 'Moments restaurant', 'Spa'] },
    { name: 'Ibis Barcelona Centro', stars: 2, area: 'Raval', priceFrom: 55, priceTo: 100, photos: [U('1631049307264-da0ec9d70304'), U('1596394516093-501ba68a0ba6'), U('1618773928121-c32242e63f39')], highlights: ['Central Las Ramblas', 'Budget friendly', 'Near La Boqueria'] },
  ],
  'New York': [
    { name: 'The Plaza Hotel', stars: 5, area: 'Midtown Manhattan', priceFrom: 500, priceTo: 1200, photos: [U('1455587734955-081b22074882'), U('1542314831-068cd1dbfeeb'), U('1578683010236-d716f9a3f461')], highlights: ['Central Park views', 'Historic landmark', 'Palm Court tea'] },
    { name: 'Pod 51', stars: 3, area: 'Midtown East', priceFrom: 80, priceTo: 150, photos: [U('1631049307264-da0ec9d70304'), U('1596394516093-501ba68a0ba6'), U('1618773928121-c32242e63f39')], highlights: ['Compact modern rooms', 'Rooftop bar', 'Great value Manhattan'] },
    { name: 'The Standard High Line', stars: 4, area: 'Meatpacking District', priceFrom: 200, priceTo: 380, photos: [U('1578683010236-d716f9a3f461'), U('1606402179428-a57976d71fa4'), U('1582719508461-905c673771fd')], highlights: ['Hudson River views', 'Trendy scene', 'Le Bain rooftop'] },
    { name: 'EVEN Hotel Times Square', stars: 3, area: 'Times Square', priceFrom: 120, priceTo: 220, photos: [U('1590490360182-c33d955571d1'), U('1611892440504-42a792e24d32'), U('1631049307264-da0ec9d70304')], highlights: ['In-room fitness', 'Walk to Broadway', 'Wellness focused'] },
    { name: '1 Hotel Brooklyn Bridge', stars: 4, area: 'Brooklyn', priceFrom: 250, priceTo: 450, photos: [U('1582719508461-905c673771fd'), U('1583422409516-2895a77efded'), U('1566073771259-6a8506099945')], highlights: ['Skyline views', 'Eco-luxury', 'Rooftop pool'] },
    { name: 'citizenM New York Bowery', stars: 4, area: 'Lower East Side', priceFrom: 130, priceTo: 230, photos: [U('1606402179428-a57976d71fa4'), U('1611892440504-42a792e24d32'), U('1618773928121-c32242e63f39')], highlights: ['Smart tech rooms', 'Rooftop bar', 'Self check-in'] },
  ],
  Bangkok: [
    { name: 'Mandarin Oriental Bangkok', stars: 5, area: 'Riverside', priceFrom: 200, priceTo: 450, photos: [U('1520250497591-112f2f40a3f4'), U('1542314831-068cd1dbfeeb'), U('1578683010236-d716f9a3f461')], highlights: ['Legendary riverside', 'Thai cooking school', 'Spa'] },
    { name: 'The Sukhothai Bangkok', stars: 5, area: 'Sathorn', priceFrom: 130, priceTo: 250, photos: [U('1551882547-ff40c63fe5fa'), U('1445019980597-93fa8acb246c'), U('1566073771259-6a8506099945')], highlights: ['Tranquil oasis', 'Award-winning design', 'Celadon restaurant'] },
    { name: 'Ibis Bangkok Riverside', stars: 3, area: 'Riverside', priceFrom: 25, priceTo: 45, photos: [U('1596394516093-501ba68a0ba6'), U('1631049307264-da0ec9d70304'), U('1555854877-bab0e564b8d5')], highlights: ['River views', 'Free shuttle boat', 'Pool'] },
    { name: 'SO/ Bangkok', stars: 5, area: 'Lumpini', priceFrom: 90, priceTo: 180, photos: [U('1566073771259-6a8506099945'), U('1590490360182-c33d955571d1'), U('1606402179428-a57976d71fa4')], highlights: ['Park views', 'Design hotel', 'Rooftop bar'] },
    { name: 'Lub d Silom', stars: 2, area: 'Silom', priceFrom: 15, priceTo: 35, photos: [U('1555854877-bab0e564b8d5'), U('1521783988139-89397d761dce'), U('1596394516093-501ba68a0ba6')], highlights: ['Backpacker favourite', 'Near nightlife', 'Social atmosphere'] },
    { name: 'Avani+ Riverside Bangkok', stars: 5, area: 'Riverside', priceFrom: 70, priceTo: 140, photos: [U('1445019980597-93fa8acb246c'), U('1590490360182-c33d955571d1'), U('1520250497591-112f2f40a3f4')], highlights: ['Infinity pool', 'River views', 'Altitude rooftop'] },
  ],
  Tokyo: [
    { name: 'Park Hyatt Tokyo', stars: 5, area: 'Shinjuku', priceFrom: 350, priceTo: 700, photos: [U('1542314831-068cd1dbfeeb'), U('1578683010236-d716f9a3f461'), U('1611892440504-42a792e24d32')], highlights: ['Lost in Translation fame', 'New York Bar', 'City views'] },
    { name: 'The Prince Gallery Tokyo Kioicho', stars: 5, area: 'Akasaka', priceFrom: 200, priceTo: 400, photos: [U('1611892440504-42a792e24d32'), U('1582719508461-905c673771fd'), U('1564501049412-61c2a3083791')], highlights: ['Sky lobby', 'Contemporary art', 'Panoramic views'] },
    { name: 'Dormy Inn Akihabara', stars: 3, area: 'Akihabara', priceFrom: 60, priceTo: 110, photos: [U('1618773928121-c32242e63f39'), U('1631049307264-da0ec9d70304'), U('1596394516093-501ba68a0ba6')], highlights: ['Onsen bath', 'Free ramen', 'Tech district'] },
    { name: 'Hotel Gracery Shinjuku', stars: 3, area: 'Kabukicho', priceFrom: 70, priceTo: 130, photos: [U('1631049307264-da0ec9d70304'), U('1618773928121-c32242e63f39'), U('1583422409516-2895a77efded')], highlights: ['Godzilla statue', 'Shinjuku views', 'Modern rooms'] },
    { name: 'Aman Tokyo', stars: 5, area: 'Otemachi', priceFrom: 600, priceTo: 1500, photos: [U('1578683010236-d716f9a3f461'), U('1542314831-068cd1dbfeeb'), U('1445019980597-93fa8acb246c')], highlights: ['Japanese minimalism', 'Imperial Palace views', 'Aman Spa'] },
    { name: 'UNPLAN Shinjuku', stars: 2, area: 'Shinjuku', priceFrom: 20, priceTo: 45, photos: [U('1521783988139-89397d761dce'), U('1555854877-bab0e564b8d5'), U('1596394516093-501ba68a0ba6')], highlights: ['Stylish hostel', 'Bar & lounge', 'Perfect for solo'] },
  ],
  Rome: [
    { name: 'Hotel de Russie', stars: 5, area: 'Piazza del Popolo', priceFrom: 350, priceTo: 700, photos: [U('1455587734955-081b22074882'), U('1542314831-068cd1dbfeeb'), U('1445019980597-93fa8acb246c')], highlights: ['Secret garden', 'De Russie Spa', 'Near Spanish Steps'] },
    { name: 'Hotel Artemide', stars: 4, area: 'Via Nazionale', priceFrom: 120, priceTo: 220, photos: [U('1564501049412-61c2a3083791'), U('1611892440504-42a792e24d32'), U('1590490360182-c33d955571d1')], highlights: ['Rooftop restaurant', 'Central location', 'Art Nouveau building'] },
    { name: 'Generator Rome', stars: 2, area: 'Termini', priceFrom: 30, priceTo: 60, photos: [U('1555854877-bab0e564b8d5'), U('1521783988139-89397d761dce'), U('1596394516093-501ba68a0ba6')], highlights: ['Near Termini station', 'Bar & cafe', 'Budget friendly'] },
    { name: 'Hotel Raphael', stars: 5, area: 'Piazza Navona', priceFrom: 250, priceTo: 500, photos: [U('1582719478250-c89cae4dc85b'), U('1578683010236-d716f9a3f461'), U('1455587734955-081b22074882')], highlights: ['Ivy-covered facade', 'Terrace views', 'Art collection'] },
    { name: 'NH Collection Roma Centro', stars: 4, area: 'Centro Storico', priceFrom: 130, priceTo: 230, photos: [U('1590490360182-c33d955571d1'), U('1611892440504-42a792e24d32'), U('1564501049412-61c2a3083791')], highlights: ['Rooftop pool', 'Historic centre', 'Modern comfort'] },
    { name: 'A.Roma Lifestyle Hotel', stars: 4, area: 'EUR', priceFrom: 80, priceTo: 150, photos: [U('1606402179428-a57976d71fa4'), U('1618773928121-c32242e63f39'), U('1631049307264-da0ec9d70304')], highlights: ['Design hotel', 'Pool & spa', 'Quiet area'] },
  ],
  Maldives: [
    { name: 'Conrad Maldives Rangali', stars: 5, area: 'Rangali Island', priceFrom: 500, priceTo: 1200, photos: [U('1573843981267-be1999ff37cd'), U('1514282401047-d79a71a590e8'), U('1439066615861-d1af74d74000')], highlights: ['Underwater restaurant', 'Water villas', 'Two islands'] },
    { name: 'Soneva Fushi', stars: 5, area: 'Baa Atoll', priceFrom: 800, priceTo: 2000, photos: [U('1439066615861-d1af74d74000'), U('1540541338287-41700207dee6'), U('1544550581-5f7ceaf7f992')], highlights: ['Barefoot luxury', 'Stargazing', 'Private island'] },
    { name: 'Anantara Veli', stars: 5, area: 'South Malé Atoll', priceFrom: 300, priceTo: 600, photos: [U('1514282401047-d79a71a590e8'), U('1573843981267-be1999ff37cd'), U('1586375300773-8384e3e4916f')], highlights: ['Overwater bungalows', 'Spa', 'Snorkelling reef'] },
    { name: 'Coco Bodu Hithi', stars: 5, area: 'North Malé Atoll', priceFrom: 350, priceTo: 700, photos: [U('1540541338287-41700207dee6'), U('1544550581-5f7ceaf7f992'), U('1562883676-8c7feb83f09b')], highlights: ['Island villa', 'Latitude bar', 'House reef'] },
    { name: 'Sun Island Resort & Spa', stars: 4, area: 'South Ari Atoll', priceFrom: 100, priceTo: 200, photos: [U('1586375300773-8384e3e4916f'), U('1562883676-8c7feb83f09b'), U('1439066615861-d1af74d74000')], highlights: ['Budget Maldives', 'Large island', 'Whale shark trips'] },
    { name: 'Bandos Maldives', stars: 4, area: 'North Malé Atoll', priceFrom: 120, priceTo: 250, photos: [U('1544550581-5f7ceaf7f992'), U('1540541338287-41700207dee6'), U('1573843981267-be1999ff37cd')], highlights: ['Close to airport', 'House reef', 'Family friendly'] },
  ],
  Antalya: [
    { name: 'Rixos Premium Belek', stars: 5, area: 'Belek', priceFrom: 180, priceTo: 350, photos: [U('1566073771259-6a8506099945'), U('1520250497591-112f2f40a3f4'), U('1590490360182-c33d955571d1')], highlights: ['Ultra all-inclusive', 'Private beach', 'Waterpark'] },
    { name: 'Akra Hotel', stars: 5, area: 'Konyaalti', priceFrom: 120, priceTo: 220, photos: [U('1582719508461-905c673771fd'), U('1583422409516-2895a77efded'), U('1571003123894-1f0594d2b5d9')], highlights: ['Sea views', 'Infinity pool', 'City centre'] },
    { name: 'Titanic Mardan Palace', stars: 5, area: 'Lara Beach', priceFrom: 200, priceTo: 400, photos: [U('1542314831-068cd1dbfeeb'), U('1455587734955-081b22074882'), U('1566073771259-6a8506099945')], highlights: ['Opulent design', 'Huge pool complex', 'All-inclusive'] },
    { name: 'Adalya Elite Lara', stars: 5, area: 'Lara', priceFrom: 80, priceTo: 160, photos: [U('1520250497591-112f2f40a3f4'), U('1562883676-8c7feb83f09b'), U('1586375300773-8384e3e4916f')], highlights: ['Family all-inclusive', 'Slides & pools', 'Animation team'] },
    { name: 'Ibis Antalya Konyaalti', stars: 2, area: 'Konyaalti', priceFrom: 30, priceTo: 55, photos: [U('1596394516093-501ba68a0ba6'), U('1631049307264-da0ec9d70304'), U('1555854877-bab0e564b8d5')], highlights: ['Budget friendly', 'Near beach', 'Clean & modern'] },
    { name: 'TUI BLUE Sarigerme Park', stars: 4, area: 'Sarigerme', priceFrom: 90, priceTo: 170, photos: [U('1439066615861-d1af74d74000'), U('1540541338287-41700207dee6'), U('1566073771259-6a8506099945')], highlights: ['All-inclusive', 'Nature reserve', 'Quiet beach'] },
  ],
  Istanbul: [
    { name: 'Four Seasons Sultanahmet', stars: 5, area: 'Sultanahmet', priceFrom: 300, priceTo: 600, photos: [U('1455587734955-081b22074882'), U('1542314831-068cd1dbfeeb'), U('1564501049412-61c2a3083791')], highlights: ['Former prison', 'Blue Mosque views', 'Historic quarter'] },
    { name: 'Raffles Istanbul', stars: 5, area: 'Zorlu Center', priceFrom: 250, priceTo: 500, photos: [U('1582719508461-905c673771fd'), U('1578683010236-d716f9a3f461'), U('1611892440504-42a792e24d32')], highlights: ['Bosphorus views', 'Luxury shopping', 'Lavish spa'] },
    { name: 'The Marmara Taksim', stars: 5, area: 'Taksim', priceFrom: 90, priceTo: 170, photos: [U('1583422409516-2895a77efded'), U('1571003123894-1f0594d2b5d9'), U('1590490360182-c33d955571d1')], highlights: ['City panorama', 'Rooftop restaurant', 'Istiklal Avenue'] },
    { name: 'Ibis Istanbul Taksim', stars: 2, area: 'Taksim', priceFrom: 35, priceTo: 65, photos: [U('1596394516093-501ba68a0ba6'), U('1631049307264-da0ec9d70304'), U('1618773928121-c32242e63f39')], highlights: ['Budget central', 'Near metro', 'Clean rooms'] },
    { name: 'Hotel Amira Istanbul', stars: 4, area: 'Sultanahmet', priceFrom: 70, priceTo: 130, photos: [U('1445019980597-93fa8acb246c'), U('1564501049412-61c2a3083791'), U('1606402179428-a57976d71fa4')], highlights: ['Ottoman style', 'Rooftop terrace', 'Sea of Marmara view'] },
    { name: 'Novotel Istanbul Bosphorus', stars: 4, area: 'Karaköy', priceFrom: 80, priceTo: 150, photos: [U('1551882547-ff40c63fe5fa'), U('1583422409516-2895a77efded'), U('1590490360182-c33d955571d1')], highlights: ['Waterfront', 'Indoor pool', 'Galata Tower nearby'] },
  ],
  Tenerife: [
    { name: 'The Ritz-Carlton Abama', stars: 5, area: 'Guía de Isora', priceFrom: 250, priceTo: 500, photos: [U('1566073771259-6a8506099945'), U('1439066615861-d1af74d74000'), U('1520250497591-112f2f40a3f4')], highlights: ['Cliff-top resort', 'Two Michelin stars', 'Private beach'] },
    { name: 'Hard Rock Hotel Tenerife', stars: 5, area: 'Adeje', priceFrom: 150, priceTo: 280, photos: [U('1590490360182-c33d955571d1'), U('1562883676-8c7feb83f09b'), U('1571003123894-1f0594d2b5d9')], highlights: ['Rock-themed', 'Lagoon pool', 'Live music'] },
    { name: 'H10 Costa Adeje Palace', stars: 4, area: 'Costa Adeje', priceFrom: 90, priceTo: 160, photos: [U('1520250497591-112f2f40a3f4'), U('1586375300773-8384e3e4916f'), U('1544550581-5f7ceaf7f992')], highlights: ['All-inclusive option', 'Multiple pools', 'Near Siam Park'] },
    { name: 'Iberostar Heritage Grand Mencey', stars: 5, area: 'Santa Cruz', priceFrom: 110, priceTo: 200, photos: [U('1455587734955-081b22074882'), U('1542314831-068cd1dbfeeb'), U('1445019980597-93fa8acb246c')], highlights: ['Colonial style', 'Garden pool', 'City centre'] },
    { name: 'Labranda Suites Costa Adeje', stars: 3, area: 'Costa Adeje', priceFrom: 55, priceTo: 100, photos: [U('1618773928121-c32242e63f39'), U('1631049307264-da0ec9d70304'), U('1596394516093-501ba68a0ba6')], highlights: ['Self-catering', 'Heated pool', 'Near beach'] },
    { name: 'Hostel Tenerife Central', stars: 2, area: 'Santa Cruz', priceFrom: 25, priceTo: 45, photos: [U('1521783988139-89397d761dce'), U('1555854877-bab0e564b8d5'), U('1596394516093-501ba68a0ba6')], highlights: ['Backpacker vibe', 'Shared kitchen', 'Social terrace'] },
  ],
  Amsterdam: [
    { name: 'Waldorf Astoria Amsterdam', stars: 5, area: 'Herengracht', priceFrom: 350, priceTo: 700, photos: [U('1455587734955-081b22074882'), U('1542314831-068cd1dbfeeb'), U('1578683010236-d716f9a3f461')], highlights: ['Six canal palaces', 'Guerlain Spa', 'Michelin dining'] },
    { name: 'Pulitzer Amsterdam', stars: 5, area: 'Jordaan', priceFrom: 220, priceTo: 400, photos: [U('1445019980597-93fa8acb246c'), U('1564501049412-61c2a3083791'), U('1611892440504-42a792e24d32')], highlights: ['25 canal houses', 'Garden courtyard', 'Art collection'] },
    { name: 'DoubleTree by Hilton Amsterdam', stars: 4, area: 'Centraal Station', priceFrom: 120, priceTo: 220, photos: [U('1551882547-ff40c63fe5fa'), U('1590490360182-c33d955571d1'), U('1571003123894-1f0594d2b5d9')], highlights: ['Waterfront', 'SkyLounge bar', 'Central location'] },
    { name: 'Motel One Amsterdam', stars: 3, area: 'Waterlooplein', priceFrom: 80, priceTo: 140, photos: [U('1631049307264-da0ec9d70304'), U('1618773928121-c32242e63f39'), U('1606402179428-a57976d71fa4')], highlights: ['Design budget', 'Great location', 'Trendy lounge'] },
    { name: 'The Flying Pig Downtown', stars: 2, area: 'Nieuwendijk', priceFrom: 30, priceTo: 60, photos: [U('1521783988139-89397d761dce'), U('1555854877-bab0e564b8d5'), U('1596394516093-501ba68a0ba6')], highlights: ['Famous hostel', 'Bar & kitchen', 'Central Dam Square'] },
    { name: 'NH Collection Flower Market', stars: 4, area: 'Muntplein', priceFrom: 140, priceTo: 250, photos: [U('1564501049412-61c2a3083791'), U('1445019980597-93fa8acb246c'), U('1582719478250-c89cae4dc85b')], highlights: ['Canal views', 'Near museums', 'Modern comfort'] },
  ],
  Lisbon: [
    { name: 'Four Seasons Ritz Lisbon', stars: 5, area: 'Marquês de Pombal', priceFrom: 300, priceTo: 600, photos: [U('1542314831-068cd1dbfeeb'), U('1455587734955-081b22074882'), U('1578683010236-d716f9a3f461')], highlights: ['Park views', 'Rooftop restaurant', 'Art collection'] },
    { name: 'Memmo Alfama', stars: 4, area: 'Alfama', priceFrom: 150, priceTo: 280, photos: [U('1583422409516-2895a77efded'), U('1564501049412-61c2a3083791'), U('1590490360182-c33d955571d1')], highlights: ['Terrace pool', 'River views', 'Historic quarter'] },
    { name: 'Lisbon Destination Hostel', stars: 2, area: 'Rossio', priceFrom: 20, priceTo: 45, photos: [U('1521783988139-89397d761dce'), U('1555854877-bab0e564b8d5'), U('1596394516093-501ba68a0ba6')], highlights: ['Award-winning hostel', 'In train station', 'Social events'] },
    { name: 'Hotel Avenida Palace', stars: 5, area: 'Restauradores', priceFrom: 180, priceTo: 350, photos: [U('1445019980597-93fa8acb246c'), U('1455587734955-081b22074882'), U('1542314831-068cd1dbfeeb')], highlights: ['Belle Époque palace', 'Grand lobby', 'Central location'] },
    { name: 'Ibis Lisboa Centro', stars: 2, area: 'Saldanha', priceFrom: 45, priceTo: 80, photos: [U('1596394516093-501ba68a0ba6'), U('1631049307264-da0ec9d70304'), U('1618773928121-c32242e63f39')], highlights: ['Budget reliable', 'Near metro', 'Clean rooms'] },
    { name: 'Martinhal Lisbon Chiado', stars: 4, area: 'Chiado', priceFrom: 200, priceTo: 380, photos: [U('1611892440504-42a792e24d32'), U('1606402179428-a57976d71fa4'), U('1582719478250-c89cae4dc85b')], highlights: ['Family luxury', 'Kids club', 'Apartments available'] },
  ],
  Athens: [
    { name: 'Hotel Grande Bretagne', stars: 5, area: 'Syntagma Square', priceFrom: 250, priceTo: 500, photos: [U('1455587734955-081b22074882'), U('1542314831-068cd1dbfeeb'), U('1590490360182-c33d955571d1')], highlights: ['Acropolis views', 'Rooftop pool', 'Historic landmark'] },
    { name: 'Electra Metropolis', stars: 5, area: 'Plaka', priceFrom: 130, priceTo: 240, photos: [U('1583422409516-2895a77efded'), U('1564501049412-61c2a3083791'), U('1611892440504-42a792e24d32')], highlights: ['Rooftop bar', 'Acropolis terrace', 'Modern rooms'] },
    { name: 'Novotel Athens', stars: 4, area: 'Omonoia', priceFrom: 80, priceTo: 140, photos: [U('1551882547-ff40c63fe5fa'), U('1590490360182-c33d955571d1'), U('1618773928121-c32242e63f39')], highlights: ['Rooftop pool', 'Central location', 'Family friendly'] },
    { name: 'AthenStyle', stars: 2, area: 'Monastiraki', priceFrom: 25, priceTo: 50, photos: [U('1521783988139-89397d761dce'), U('1555854877-bab0e564b8d5'), U('1596394516093-501ba68a0ba6')], highlights: ['Rooftop terrace', 'Flea market views', 'Social hostel'] },
    { name: 'Coco-Mat Athens BC', stars: 4, area: 'Kolonaki', priceFrom: 120, priceTo: 220, photos: [U('1606402179428-a57976d71fa4'), U('1611892440504-42a792e24d32'), U('1578683010236-d716f9a3f461')], highlights: ['Eco mattresses', 'Chic design', 'Quiet neighbourhood'] },
    { name: 'Hilton Athens', stars: 5, area: 'Ilissia', priceFrom: 140, priceTo: 260, photos: [U('1571003123894-1f0594d2b5d9'), U('1582719508461-905c673771fd'), U('1566073771259-6a8506099945')], highlights: ['Galaxy Bar rooftop', 'Outdoor pool', 'Shopping nearby'] },
  ],
  Bali: [
    { name: 'Four Seasons Jimbaran Bay', stars: 5, area: 'Jimbaran', priceFrom: 350, priceTo: 700, photos: [U('1540541338287-41700207dee6'), U('1573843981267-be1999ff37cd'), U('1439066615861-d1af74d74000')], highlights: ['Hillside villas', 'Private pools', 'Sunset beach'] },
    { name: 'Alila Seminyak', stars: 5, area: 'Seminyak', priceFrom: 180, priceTo: 350, photos: [U('1566073771259-6a8506099945'), U('1520250497591-112f2f40a3f4'), U('1562883676-8c7feb83f09b')], highlights: ['Beach club', 'Infinity pool', 'Trendy area'] },
    { name: 'Ubud Village Hotel', stars: 4, area: 'Ubud', priceFrom: 60, priceTo: 120, photos: [U('1586375300773-8384e3e4916f'), U('1544550581-5f7ceaf7f992'), U('1540541338287-41700207dee6')], highlights: ['Rice terrace views', 'Yoga classes', 'Peaceful retreat'] },
    { name: 'The Mulia Nusa Dua', stars: 5, area: 'Nusa Dua', priceFrom: 250, priceTo: 500, photos: [U('1520250497591-112f2f40a3f4'), U('1566073771259-6a8506099945'), U('1542314831-068cd1dbfeeb')], highlights: ['Beachfront luxury', 'Six pools', 'Spa village'] },
    { name: 'Kosta Hostel Seminyak', stars: 2, area: 'Seminyak', priceFrom: 10, priceTo: 25, photos: [U('1521783988139-89397d761dce'), U('1555854877-bab0e564b8d5'), U('1596394516093-501ba68a0ba6')], highlights: ['Backpacker hub', 'Pool', 'Near beach bars'] },
    { name: 'Novotel Bali Nusa Dua', stars: 4, area: 'Nusa Dua', priceFrom: 70, priceTo: 130, photos: [U('1562883676-8c7feb83f09b'), U('1586375300773-8384e3e4916f'), U('1439066615861-d1af74d74000')], highlights: ['Lagoon pool', 'Family rooms', 'Beach access'] },
  ],
  Phuket: [
    { name: 'Trisara', stars: 5, area: 'Nai Thon', priceFrom: 400, priceTo: 800, photos: [U('1573843981267-be1999ff37cd'), U('1439066615861-d1af74d74000'), U('1540541338287-41700207dee6')], highlights: ['Private pool villas', 'Secluded beach', 'Fine dining'] },
    { name: 'Kata Rocks', stars: 5, area: 'Kata', priceFrom: 200, priceTo: 400, photos: [U('1520250497591-112f2f40a3f4'), U('1590490360182-c33d955571d1'), U('1566073771259-6a8506099945')], highlights: ['Sky villas', 'Infinite pool', 'Sunset lounge'] },
    { name: 'Holiday Inn Resort Phuket', stars: 4, area: 'Patong', priceFrom: 60, priceTo: 120, photos: [U('1562883676-8c7feb83f09b'), U('1586375300773-8384e3e4916f'), U('1544550581-5f7ceaf7f992')], highlights: ['Beachfront', 'Kids club', 'Four pools'] },
    { name: 'Ibis Phuket Patong', stars: 3, area: 'Patong', priceFrom: 25, priceTo: 50, photos: [U('1596394516093-501ba68a0ba6'), U('1631049307264-da0ec9d70304'), U('1618773928121-c32242e63f39')], highlights: ['Near Bangla Road', 'Pool', 'Budget friendly'] },
    { name: 'Novotel Phuket Kamala Beach', stars: 4, area: 'Kamala', priceFrom: 70, priceTo: 140, photos: [U('1439066615861-d1af74d74000'), U('1562883676-8c7feb83f09b'), U('1520250497591-112f2f40a3f4')], highlights: ['Quiet beach', 'Two pools', 'Family rooms'] },
    { name: 'Slumber Party Hostel', stars: 2, area: 'Patong', priceFrom: 8, priceTo: 20, photos: [U('1521783988139-89397d761dce'), U('1555854877-bab0e564b8d5'), U('1596394516093-501ba68a0ba6')], highlights: ['Party hostel', 'Pool & bar', 'Social events'] },
  ],
  Singapore: [
    { name: 'Marina Bay Sands', stars: 5, area: 'Marina Bay', priceFrom: 350, priceTo: 700, photos: [U('1582719508461-905c673771fd'), U('1571003123894-1f0594d2b5d9'), U('1590490360182-c33d955571d1')], highlights: ['Rooftop infinity pool', 'Iconic skyline', 'Casino & mall'] },
    { name: 'Raffles Hotel', stars: 5, area: 'City Hall', priceFrom: 500, priceTo: 1000, photos: [U('1455587734955-081b22074882'), U('1542314831-068cd1dbfeeb'), U('1445019980597-93fa8acb246c')], highlights: ['Colonial icon', 'Singapore Sling', 'Butler service'] },
    { name: 'Parkroyal Collection Pickering', stars: 5, area: 'Chinatown', priceFrom: 180, priceTo: 320, photos: [U('1606402179428-a57976d71fa4'), U('1583422409516-2895a77efded'), U('1566073771259-6a8506099945')], highlights: ['Sky gardens', 'Eco design', 'Infinity pool'] },
    { name: 'Ibis Singapore Bencoolen', stars: 2, area: 'Bugis', priceFrom: 60, priceTo: 100, photos: [U('1596394516093-501ba68a0ba6'), U('1631049307264-da0ec9d70304'), U('1618773928121-c32242e63f39')], highlights: ['Budget central', 'Near MRT', 'Clean & modern'] },
    { name: 'Hilton Singapore Orchard', stars: 5, area: 'Orchard Road', priceFrom: 200, priceTo: 380, photos: [U('1571003123894-1f0594d2b5d9'), U('1582719508461-905c673771fd'), U('1551882547-ff40c63fe5fa')], highlights: ['Shopping belt', 'Rooftop pool', 'Five restaurants'] },
    { name: 'Hotel G Singapore', stars: 3, area: 'Middle Road', priceFrom: 80, priceTo: 140, photos: [U('1631049307264-da0ec9d70304'), U('1606402179428-a57976d71fa4'), U('1611892440504-42a792e24d32')], highlights: ['Boutique style', 'Great café', 'Hip location'] },
  ],
  'Cancún': [
    { name: 'Hyatt Zilara Cancún', stars: 5, area: 'Hotel Zone', priceFrom: 250, priceTo: 450, photos: [U('1562883676-8c7feb83f09b'), U('1439066615861-d1af74d74000'), U('1520250497591-112f2f40a3f4')], highlights: ['Adults-only all-inclusive', 'Beachfront', 'Infinity pools'] },
    { name: 'JW Marriott Cancún', stars: 5, area: 'Hotel Zone', priceFrom: 200, priceTo: 380, photos: [U('1566073771259-6a8506099945'), U('1542314831-068cd1dbfeeb'), U('1590490360182-c33d955571d1')], highlights: ['Luxury beachfront', 'Spa & golf', 'Five restaurants'] },
    { name: 'Fiesta Americana Condesa', stars: 4, area: 'Hotel Zone', priceFrom: 100, priceTo: 180, photos: [U('1520250497591-112f2f40a3f4'), U('1562883676-8c7feb83f09b'), U('1586375300773-8384e3e4916f')], highlights: ['All-inclusive', 'Beach volleyball', 'Pool complex'] },
    { name: 'Hostel Mundo Joven Cancún', stars: 2, area: 'Downtown', priceFrom: 15, priceTo: 30, photos: [U('1521783988139-89397d761dce'), U('1555854877-bab0e564b8d5'), U('1596394516093-501ba68a0ba6')], highlights: ['Budget backpacker', 'Pool', 'Near bus station'] },
    { name: 'Iberostar Selection Cancún', stars: 5, area: 'Hotel Zone', priceFrom: 180, priceTo: 340, photos: [U('1586375300773-8384e3e4916f'), U('1544550581-5f7ceaf7f992'), U('1439066615861-d1af74d74000')], highlights: ['Star Prestige upgrade', 'All-inclusive', 'Coral reef'] },
    { name: 'Aloft Cancún', stars: 3, area: 'Hotel Zone', priceFrom: 70, priceTo: 130, photos: [U('1606402179428-a57976d71fa4'), U('1611892440504-42a792e24d32'), U('1618773928121-c32242e63f39')], highlights: ['W XYZ bar', 'Lagoon views', 'Modern rooms'] },
  ],
  London: [
    { name: 'The Savoy', stars: 5, area: 'Strand', priceFrom: 400, priceTo: 900, photos: [U('1455587734955-081b22074882'), U('1542314831-068cd1dbfeeb'), U('1445019980597-93fa8acb246c')], highlights: ['Thames views', 'Art deco icon', 'Kaspar\'s restaurant'] },
    { name: 'The Ned', stars: 5, area: 'City of London', priceFrom: 250, priceTo: 500, photos: [U('1564501049412-61c2a3083791'), U('1578683010236-d716f9a3f461'), U('1582719508461-905c673771fd')], highlights: ['Former bank HQ', 'Rooftop pool', 'Nine restaurants'] },
    { name: 'Premier Inn London County Hall', stars: 3, area: 'South Bank', priceFrom: 80, priceTo: 150, photos: [U('1583422409516-2895a77efded'), U('1631049307264-da0ec9d70304'), U('1590490360182-c33d955571d1')], highlights: ['London Eye views', 'Budget reliable', 'Great location'] },
    { name: 'citizenM Tower of London', stars: 4, area: 'Tower Hill', priceFrom: 120, priceTo: 220, photos: [U('1606402179428-a57976d71fa4'), U('1611892440504-42a792e24d32'), U('1618773928121-c32242e63f39')], highlights: ['Smart tech rooms', 'Tower views', 'Self check-in'] },
    { name: 'Generator London', stars: 2, area: 'Russell Square', priceFrom: 25, priceTo: 55, photos: [U('1521783988139-89397d761dce'), U('1555854877-bab0e564b8d5'), U('1596394516093-501ba68a0ba6')], highlights: ['Iconic hostel', 'Bar & events', 'Central Bloomsbury'] },
    { name: 'Shangri-La The Shard', stars: 5, area: 'London Bridge', priceFrom: 350, priceTo: 700, photos: [U('1582719508461-905c673771fd'), U('1571003123894-1f0594d2b5d9'), U('1583422409516-2895a77efded')], highlights: ['Highest hotel in UK', 'Skyline pool', 'Panoramic views'] },
  ],
  Miami: [
    { name: 'Faena Hotel Miami Beach', stars: 5, area: 'Mid-Beach', priceFrom: 400, priceTo: 800, photos: [U('1562883676-8c7feb83f09b'), U('1520250497591-112f2f40a3f4'), U('1566073771259-6a8506099945')], highlights: ['Baz Luhrmann design', 'Gold-leaf interiors', 'Beach butler'] },
    { name: 'The Setai', stars: 5, area: 'South Beach', priceFrom: 350, priceTo: 700, photos: [U('1590490360182-c33d955571d1'), U('1582719508461-905c673771fd'), U('1571003123894-1f0594d2b5d9')], highlights: ['Asian-inspired', 'Three infinity pools', 'Ocean Drive'] },
    { name: 'Marriott Stanton South Beach', stars: 4, area: 'South Beach', priceFrom: 180, priceTo: 320, photos: [U('1551882547-ff40c63fe5fa'), U('1562883676-8c7feb83f09b'), U('1586375300773-8384e3e4916f')], highlights: ['Beachfront', 'Ocean views', 'Art Deco District'] },
    { name: 'Generator Miami', stars: 2, area: 'South Beach', priceFrom: 35, priceTo: 70, photos: [U('1521783988139-89397d761dce'), U('1555854877-bab0e564b8d5'), U('1596394516093-501ba68a0ba6')], highlights: ['Trendy hostel', 'Pool & garden', 'Near Lincoln Road'] },
    { name: 'Hyatt Regency Miami', stars: 4, area: 'Downtown', priceFrom: 120, priceTo: 220, photos: [U('1583422409516-2895a77efded'), U('1571003123894-1f0594d2b5d9'), U('1590490360182-c33d955571d1')], highlights: ['Bayfront views', 'Rooftop pool', 'Near Brickell'] },
    { name: 'Ibis Styles Miami', stars: 3, area: 'Brickell', priceFrom: 70, priceTo: 130, photos: [U('1631049307264-da0ec9d70304'), U('1618773928121-c32242e63f39'), U('1606402179428-a57976d71fa4')], highlights: ['Budget friendly', 'Modern design', 'Near metro'] },
  ],
  Marrakesh: [
    { name: 'Royal Mansour', stars: 5, area: 'Medina', priceFrom: 500, priceTo: 1200, photos: [U('1455587734955-081b22074882'), U('1542314831-068cd1dbfeeb'), U('1445019980597-93fa8acb246c')], highlights: ['Private riads', 'Moroccan palace', 'Three restaurants'] },
    { name: 'La Mamounia', stars: 5, area: 'Medina', priceFrom: 350, priceTo: 700, photos: [U('1566073771259-6a8506099945'), U('1520250497591-112f2f40a3f4'), U('1564501049412-61c2a3083791')], highlights: ['Legendary gardens', 'Churchill favourite', 'Grand pool'] },
    { name: 'Riad Kniza', stars: 4, area: 'Medina', priceFrom: 80, priceTo: 160, photos: [U('1445019980597-93fa8acb246c'), U('1606402179428-a57976d71fa4'), U('1578683010236-d716f9a3f461')], highlights: ['Boutique riad', 'Courtyard pool', 'Traditional hammam'] },
    { name: 'Ibis Marrakech Centre Gare', stars: 2, area: 'Gueliz', priceFrom: 25, priceTo: 45, photos: [U('1596394516093-501ba68a0ba6'), U('1631049307264-da0ec9d70304'), U('1618773928121-c32242e63f39')], highlights: ['Near station', 'Budget reliable', 'Modern rooms'] },
    { name: 'Fairmont Royal Palm Marrakech', stars: 5, area: 'Route d\'Amizmiz', priceFrom: 200, priceTo: 400, photos: [U('1566073771259-6a8506099945'), U('1562883676-8c7feb83f09b'), U('1520250497591-112f2f40a3f4')], highlights: ['Golf course', 'Atlas views', 'Pool complex'] },
    { name: 'Hostel Marrakech Rouge', stars: 2, area: 'Medina', priceFrom: 10, priceTo: 25, photos: [U('1521783988139-89397d761dce'), U('1555854877-bab0e564b8d5'), U('1596394516093-501ba68a0ba6')], highlights: ['Rooftop terrace', 'Budget social', 'Near Jemaa el-Fna'] },
  ],
  'Cape Town': [
    { name: 'One&Only Cape Town', stars: 5, area: 'V&A Waterfront', priceFrom: 300, priceTo: 600, photos: [U('1582719508461-905c673771fd'), U('1566073771259-6a8506099945'), U('1590490360182-c33d955571d1')], highlights: ['Table Mountain views', 'Island spa', 'Nobu restaurant'] },
    { name: 'Belmond Mount Nelson', stars: 5, area: 'Gardens', priceFrom: 250, priceTo: 500, photos: [U('1455587734955-081b22074882'), U('1542314831-068cd1dbfeeb'), U('1445019980597-93fa8acb246c')], highlights: ['Pink palace', 'Afternoon tea', 'Garden oasis'] },
    { name: 'Hilton Cape Town City Centre', stars: 4, area: 'City Centre', priceFrom: 80, priceTo: 150, photos: [U('1571003123894-1f0594d2b5d9'), U('1551882547-ff40c63fe5fa'), U('1583422409516-2895a77efded')], highlights: ['Central location', 'Pool', 'Near attractions'] },
    { name: 'Once in Cape Town', stars: 2, area: 'Gardens', priceFrom: 15, priceTo: 35, photos: [U('1521783988139-89397d761dce'), U('1555854877-bab0e564b8d5'), U('1596394516093-501ba68a0ba6')], highlights: ['Best hostel in Africa', 'Pool & bar', 'Social atmosphere'] },
    { name: 'Radisson Red V&A Waterfront', stars: 4, area: 'V&A Waterfront', priceFrom: 90, priceTo: 170, photos: [U('1606402179428-a57976d71fa4'), U('1611892440504-42a792e24d32'), U('1618773928121-c32242e63f39')], highlights: ['Modern design', 'Rooftop bar', 'Marina views'] },
    { name: 'The Silo Hotel', stars: 5, area: 'V&A Waterfront', priceFrom: 400, priceTo: 900, photos: [U('1582719508461-905c673771fd'), U('1578683010236-d716f9a3f461'), U('1571003123894-1f0594d2b5d9')], highlights: ['Above Zeitz MOCAA', 'Glass windows', 'Rooftop pool'] },
  ],
  Sydney: [
    { name: 'Park Hyatt Sydney', stars: 5, area: 'The Rocks', priceFrom: 450, priceTo: 900, photos: [U('1582719508461-905c673771fd'), U('1583422409516-2895a77efded'), U('1566073771259-6a8506099945')], highlights: ['Opera House views', 'Harbour Bridge', 'Rooftop pool'] },
    { name: 'QT Sydney', stars: 5, area: 'CBD', priceFrom: 200, priceTo: 380, photos: [U('1606402179428-a57976d71fa4'), U('1578683010236-d716f9a3f461'), U('1611892440504-42a792e24d32')], highlights: ['Gothic revival', 'Design hotel', 'Gowings Bar'] },
    { name: 'Ovolo Woolloomooloo', stars: 4, area: 'Woolloomooloo', priceFrom: 150, priceTo: 280, photos: [U('1564501049412-61c2a3083791'), U('1551882547-ff40c63fe5fa'), U('1590490360182-c33d955571d1')], highlights: ['Wharf location', 'Harbour views', 'Free minibar'] },
    { name: 'Ibis Sydney Darling Harbour', stars: 3, area: 'Darling Harbour', priceFrom: 80, priceTo: 140, photos: [U('1631049307264-da0ec9d70304'), U('1618773928121-c32242e63f39'), U('1596394516093-501ba68a0ba6')], highlights: ['Harbour precinct', 'Budget option', 'Near ICC'] },
    { name: 'Wake Up! Sydney', stars: 2, area: 'Central Station', priceFrom: 25, priceTo: 50, photos: [U('1521783988139-89397d761dce'), U('1555854877-bab0e564b8d5'), U('1596394516093-501ba68a0ba6')], highlights: ['Huge hostel', 'Rooftop views', 'Near Surry Hills'] },
    { name: 'Shangri-La Hotel Sydney', stars: 5, area: 'The Rocks', priceFrom: 250, priceTo: 450, photos: [U('1571003123894-1f0594d2b5d9'), U('1582719508461-905c673771fd'), U('1542314831-068cd1dbfeeb')], highlights: ['Harbour views', 'Altitude restaurant', 'Day spa'] },
  ],
  Lahore: [
    { name: 'Pearl Continental Lahore', stars: 5, area: 'The Mall', priceFrom: 60, priceTo: 120, photos: [U('1566073771259-6a8506099945'), U('1542314831-068cd1dbfeeb'), U('1564501049412-61c2a3083791')], highlights: ['Iconic 5-star', 'Pool & spa', 'Near Badshahi Mosque'] },
    { name: 'Avari Hotel Lahore', stars: 5, area: 'Shahrah-e-Quaid-e-Azam', priceFrom: 50, priceTo: 100, photos: [U('1551882547-ff40c63fe5fa'), U('1445019980597-93fa8acb246c'), U('1578683010236-d716f9a3f461')], highlights: ['Heritage hotel', 'Fine dining', 'Business centre'] },
    { name: 'Nishat Hotel Lahore', stars: 5, area: 'Gulberg', priceFrom: 55, priceTo: 95, photos: [U('1520250497591-112f2f40a3f4'), U('1611892440504-42a792e24d32'), U('1590490360182-c33d955571d1')], highlights: ['Modern luxury', 'Rooftop pool', 'Near MM Alam Road'] },
    { name: 'Luxus Grand Hotel', stars: 4, area: 'Main Boulevard', priceFrom: 35, priceTo: 65, photos: [U('1618773928121-c32242e63f39'), U('1631049307264-da0ec9d70304'), U('1606402179428-a57976d71fa4')], highlights: ['Central location', 'Great value', 'Modern rooms'] },
    { name: 'Faletti\'s Hotel', stars: 4, area: 'Egerton Road', priceFrom: 40, priceTo: 75, photos: [U('1455587734955-081b22074882'), U('1549294413-26f195200c16'), U('1582719478250-c89cae4dc85b')], highlights: ['Colonial heritage', 'Historic charm', 'Lush gardens'] },
    { name: 'Hotel One Mall Road', stars: 3, area: 'The Mall', priceFrom: 20, priceTo: 40, photos: [U('1596394516093-501ba68a0ba6'), U('1555854877-bab0e564b8d5'), U('1521783988139-89397d761dce')], highlights: ['Budget-friendly', 'Central location', 'Clean & modern'] },
  ],
  Karachi: [
    { name: 'Movenpick Hotel Karachi', stars: 5, area: 'Club Road', priceFrom: 65, priceTo: 130, photos: [U('1542314831-068cd1dbfeeb'), U('1566073771259-6a8506099945'), U('1578683010236-d716f9a3f461')], highlights: ['Swiss hospitality', 'Pool & gym', 'Multiple restaurants'] },
    { name: 'Pearl Continental Karachi', stars: 5, area: 'Club Road', priceFrom: 55, priceTo: 110, photos: [U('1551882547-ff40c63fe5fa'), U('1520250497591-112f2f40a3f4'), U('1564501049412-61c2a3083791')], highlights: ['Iconic landmark', 'Sea views', 'Business hub'] },
    { name: 'Avari Towers', stars: 5, area: 'Fatima Jinnah Road', priceFrom: 50, priceTo: 100, photos: [U('1445019980597-93fa8acb246c'), U('1611892440504-42a792e24d32'), U('1590490360182-c33d955571d1')], highlights: ['Twin towers', 'Rooftop restaurant', 'City views'] },
    { name: 'Marriott Karachi', stars: 4, area: 'Abdullah Haroon Road', priceFrom: 45, priceTo: 85, photos: [U('1582719478250-c89cae4dc85b'), U('1618773928121-c32242e63f39'), U('1455587734955-081b22074882')], highlights: ['International chain', 'Pool', 'Near Clifton Beach'] },
    { name: 'Beach Luxury Hotel', stars: 4, area: 'M.T. Khan Road', priceFrom: 35, priceTo: 60, photos: [U('1606402179428-a57976d71fa4'), U('1631049307264-da0ec9d70304'), U('1549294413-26f195200c16')], highlights: ['Seafront location', 'Heritage style', 'Harbour views'] },
    { name: 'Hotel One Clifton', stars: 3, area: 'Clifton', priceFrom: 18, priceTo: 35, photos: [U('1596394516093-501ba68a0ba6'), U('1555854877-bab0e564b8d5'), U('1521783988139-89397d761dce')], highlights: ['Near beach', 'Budget-friendly', 'Modern rooms'] },
  ],
  Islamabad: [
    { name: 'Islamabad Serena Hotel', stars: 5, area: 'Faisal Avenue', priceFrom: 80, priceTo: 160, photos: [U('1566073771259-6a8506099945'), U('1542314831-068cd1dbfeeb'), U('1520250497591-112f2f40a3f4')], highlights: ['Aga Khan property', 'Margalla Hills views', 'Award-winning spa'] },
    { name: 'Islamabad Marriott', stars: 5, area: 'Aga Khan Road', priceFrom: 70, priceTo: 140, photos: [U('1551882547-ff40c63fe5fa'), U('1578683010236-d716f9a3f461'), U('1564501049412-61c2a3083791')], highlights: ['Near diplomatic enclave', 'Pool & tennis', 'Dynasty restaurant'] },
    { name: 'Pearl Continental Islamabad', stars: 5, area: 'Blue Area', priceFrom: 55, priceTo: 100, photos: [U('1445019980597-93fa8acb246c'), U('1611892440504-42a792e24d32'), U('1590490360182-c33d955571d1')], highlights: ['Central business area', 'Mountain views', 'Multiple dining'] },
    { name: 'Ramada by Wyndham', stars: 4, area: 'Jinnah Avenue', priceFrom: 40, priceTo: 70, photos: [U('1618773928121-c32242e63f39'), U('1606402179428-a57976d71fa4'), U('1631049307264-da0ec9d70304')], highlights: ['Modern hotel', 'Near Faisal Mosque', 'Good value'] },
    { name: 'Envoy Continental', stars: 4, area: 'F-6', priceFrom: 30, priceTo: 55, photos: [U('1582719478250-c89cae4dc85b'), U('1455587734955-081b22074882'), U('1549294413-26f195200c16')], highlights: ['Supermarket area', 'Near hiking trails', 'Business centre'] },
    { name: 'Hotel One F-7', stars: 3, area: 'F-7 Markaz', priceFrom: 15, priceTo: 30, photos: [U('1596394516093-501ba68a0ba6'), U('1555854877-bab0e564b8d5'), U('1521783988139-89397d761dce')], highlights: ['Budget chain', 'Shopping area', 'Clean & reliable'] },
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
    { name: `${city} Grand Hotel`, stars: 5, area: 'City Centre', priceFrom: 150, priceTo: 350, photos: [], highlights: ['Premium location', 'Full-service spa', 'Fine dining'] },
    { name: `${city} Marriott`, stars: 4, area: 'City Centre', priceFrom: 100, priceTo: 200, photos: [], highlights: ['Loyalty rewards', 'Business centre', 'Fitness centre'] },
    { name: `Holiday Inn ${city}`, stars: 3, area: 'Central', priceFrom: 60, priceTo: 120, photos: [], highlights: ['Reliable comfort', 'Free Wi-Fi', 'Restaurant on-site'] },
    { name: `Ibis ${city}`, stars: 2, area: 'Near Transport', priceFrom: 35, priceTo: 70, photos: [], highlights: ['Budget friendly', 'Clean & modern', '24/7 reception'] },
    { name: `${city} Boutique Suites`, stars: 4, area: 'Old Town', priceFrom: 80, priceTo: 160, photos: [], highlights: ['Unique character', 'Local experience', 'Breakfast included'] },
    { name: `Novotel ${city} Centre`, stars: 4, area: 'City Centre', priceFrom: 75, priceTo: 150, photos: [], highlights: ['Family rooms', 'Indoor pool', 'Central location'] },
  ];
}

// ─── Photo Gallery ──────────────────────────────────────────────────────────
function PhotoGallery({ photos, name }: { photos: string[]; name: string }) {
  const [idx, setIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const i = Math.round(el.scrollLeft / el.offsetWidth);
      setIdx(i);
    };
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={scrollRef} className="flex overflow-x-auto snap-x snap-mandatory w-full h-full" style={{ scrollbarWidth: 'none' }}>
        {photos.map((p, i) => (
          <img key={i} src={p} alt={`${name} photo ${i + 1}`}
            className="w-full h-full object-cover flex-shrink-0 snap-center"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ))}
      </div>
      {photos.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {photos.map((_, i) => (
            <span key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === idx ? 'bg-white w-3' : 'bg-white/50'}`} />
          ))}
        </div>
      )}
    </div>
  );
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
              const hasPhoto = h.photos.length > 0;
              return (
                <div key={h.name} className="bg-white border border-[#E8ECF4] rounded-2xl overflow-hidden hover:shadow-lg transition-all">
                  <div className="flex flex-col md:flex-row">
                    {/* Photo */}
                    <div className="relative w-full md:w-72 h-48 md:h-auto flex-shrink-0 bg-[#F1F3F7] overflow-hidden">
                      {hasPhoto ? (
                        <PhotoGallery photos={h.photos} name={h.name} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-5xl text-[#C0C8D8]">🏨</div>
                      )}
                      {i === 0 && (
                        <span className="absolute top-3 left-3 text-[.6rem] font-black uppercase tracking-[1.5px] bg-orange-500 text-white px-2.5 py-1 rounded-full shadow-md z-10">Best Value</span>
                      )}
                      {h.stars > 0 && (
                        <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-[.7rem] font-bold text-amber-500 px-2 py-0.5 rounded-full z-10">
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
