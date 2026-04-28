'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import DateRangePicker from '@/components/DateRangePicker';
import DateMatrixStrip, { type MatrixOption } from '@/components/DateMatrixStrip';
import { redirectUrl } from '@/lib/redirect';
import { chooseDefaultTab } from '@/lib/silentScout';
import { vibeTagsForSearchedCity } from '@/data/destinations';
import { saveSticky, loadSticky, type StickyHotels } from '@/lib/sticky-search';

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
  'Sal', 'Boa Vista', 'Praia', 'Mindelo',
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
   AIRPORT COORDS — multi-airport metro groups used for the "X mi from IATA"
   chip on hotel cards. Every candidate in a matched group is passed to the
   card; the card picks the closest to each individual hotel so a Crawley
   hotel shows "3 mi from LGW" while a Hounslow hotel shows "4 mi from LHR".
   ═══════════════════════════════════════════════════════════════════════════ */

type Airport = { iata: string; lat: number; lng: number };
type AirportGroup = { keywords: string[]; airports: Airport[] };

const AIRPORT_GROUPS: AirportGroup[] = [
  // UK — include the airport-adjacent towns so reverse-geocoded locations
  // (e.g. "Crawley" near Gatwick, "Hounslow" near LHR) still trigger the
  // candidate set and produce a correct IATA chip on each card.
  { keywords: ['london', 'heathrow', 'hounslow', 'staines', 'gatwick', 'crawley', 'horley', 'stansted', 'bishops stortford', 'luton', 'dunstable', 'city airport', 'greater london'], airports: [
    { iata: 'LHR', lat: 51.4700, lng: -0.4543 },
    { iata: 'LGW', lat: 51.1537, lng: -0.1821 },
    { iata: 'STN', lat: 51.8850, lng: 0.2350 },
    { iata: 'LTN', lat: 51.8747, lng: -0.3683 },
    { iata: 'LCY', lat: 51.5053, lng: 0.0553 },
  ] },
  { keywords: ['manchester'], airports: [{ iata: 'MAN', lat: 53.3537, lng: -2.2750 }] },
  { keywords: ['edinburgh'], airports: [{ iata: 'EDI', lat: 55.9500, lng: -3.3725 }] },
  { keywords: ['glasgow', 'prestwick'], airports: [
    { iata: 'GLA', lat: 55.8719, lng: -4.4331 },
    { iata: 'PIK', lat: 55.5094, lng: -4.5867 },
  ] },
  { keywords: ['birmingham'], airports: [{ iata: 'BHX', lat: 52.4539, lng: -1.7480 }] },
  { keywords: ['bristol'], airports: [{ iata: 'BRS', lat: 51.3827, lng: -2.7191 }] },
  { keywords: ['belfast'], airports: [{ iata: 'BFS', lat: 54.6575, lng: -6.2158 }] },
  { keywords: ['liverpool'], airports: [{ iata: 'LPL', lat: 53.3336, lng: -2.8497 }] },
  { keywords: ['newcastle'], airports: [{ iata: 'NCL', lat: 55.0375, lng: -1.6917 }] },
  // France
  { keywords: ['paris', 'charles de gaulle', 'orly', 'beauvais'], airports: [
    { iata: 'CDG', lat: 49.0097, lng: 2.5479 },
    { iata: 'ORY', lat: 48.7233, lng: 2.3794 },
    { iata: 'BVA', lat: 49.4544, lng: 2.1128 },
  ] },
  { keywords: ['nice'], airports: [{ iata: 'NCE', lat: 43.6584, lng: 7.2159 }] },
  { keywords: ['lyon'], airports: [{ iata: 'LYS', lat: 45.7256, lng: 5.0811 }] },
  { keywords: ['marseille'], airports: [{ iata: 'MRS', lat: 43.4393, lng: 5.2214 }] },
  // Benelux
  { keywords: ['amsterdam', 'schiphol'], airports: [{ iata: 'AMS', lat: 52.3086, lng: 4.7639 }] },
  { keywords: ['brussels', 'charleroi'], airports: [
    { iata: 'BRU', lat: 50.9014, lng: 4.4844 },
    { iata: 'CRL', lat: 50.4592, lng: 4.4538 },
  ] },
  // Germany / Austria
  { keywords: ['berlin'], airports: [{ iata: 'BER', lat: 52.3667, lng: 13.5033 }] },
  { keywords: ['munich'], airports: [{ iata: 'MUC', lat: 48.3538, lng: 11.7861 }] },
  { keywords: ['frankfurt'], airports: [{ iata: 'FRA', lat: 50.0333, lng: 8.5706 }] },
  { keywords: ['hamburg'], airports: [{ iata: 'HAM', lat: 53.6303, lng: 9.9883 }] },
  { keywords: ['vienna'], airports: [{ iata: 'VIE', lat: 48.1103, lng: 16.5697 }] },
  { keywords: ['salzburg'], airports: [{ iata: 'SZG', lat: 47.7933, lng: 13.0043 }] },
  // Switzerland
  { keywords: ['zurich'], airports: [{ iata: 'ZRH', lat: 47.4647, lng: 8.5492 }] },
  { keywords: ['geneva'], airports: [{ iata: 'GVA', lat: 46.2381, lng: 6.1090 }] },
  // Italy
  { keywords: ['rome', 'fiumicino', 'ciampino'], airports: [
    { iata: 'FCO', lat: 41.8003, lng: 12.2389 },
    { iata: 'CIA', lat: 41.7994, lng: 12.5949 },
  ] },
  { keywords: ['milan', 'malpensa', 'linate', 'bergamo'], airports: [
    { iata: 'MXP', lat: 45.6306, lng: 8.7231 },
    { iata: 'LIN', lat: 45.4450, lng: 9.2767 },
    { iata: 'BGY', lat: 45.6739, lng: 9.7042 },
  ] },
  { keywords: ['venice'], airports: [{ iata: 'VCE', lat: 45.5053, lng: 12.3519 }] },
  { keywords: ['naples'], airports: [{ iata: 'NAP', lat: 40.8860, lng: 14.2908 }] },
  { keywords: ['florence', 'pisa'], airports: [
    { iata: 'FLR', lat: 43.8100, lng: 11.2051 },
    { iata: 'PSA', lat: 43.6839, lng: 10.3927 },
  ] },
  // Spain
  { keywords: ['barcelona'], airports: [{ iata: 'BCN', lat: 41.2974, lng: 2.0833 }] },
  { keywords: ['madrid'], airports: [{ iata: 'MAD', lat: 40.4983, lng: -3.5676 }] },
  { keywords: ['malaga'], airports: [{ iata: 'AGP', lat: 36.6749, lng: -4.4991 }] },
  { keywords: ['palma', 'mallorca', 'majorca'], airports: [{ iata: 'PMI', lat: 39.5517, lng: 2.7388 }] },
  { keywords: ['alicante'], airports: [{ iata: 'ALC', lat: 38.2822, lng: -0.5582 }] },
  { keywords: ['valencia'], airports: [{ iata: 'VLC', lat: 39.4893, lng: -0.4816 }] },
  { keywords: ['ibiza'], airports: [{ iata: 'IBZ', lat: 38.8729, lng: 1.3731 }] },
  { keywords: ['seville'], airports: [{ iata: 'SVQ', lat: 37.4180, lng: -5.8931 }] },
  { keywords: ['tenerife'], airports: [
    { iata: 'TFS', lat: 28.0445, lng: -16.5725 },
    { iata: 'TFN', lat: 28.4827, lng: -16.3415 },
  ] },
  { keywords: ['gran canaria'], airports: [{ iata: 'LPA', lat: 27.9319, lng: -15.3866 }] },
  { keywords: ['lanzarote'], airports: [{ iata: 'ACE', lat: 28.9455, lng: -13.6052 }] },
  { keywords: ['fuerteventura'], airports: [{ iata: 'FUE', lat: 28.4527, lng: -13.8638 }] },
  // Portugal
  { keywords: ['lisbon'], airports: [{ iata: 'LIS', lat: 38.7742, lng: -9.1342 }] },
  { keywords: ['porto'], airports: [{ iata: 'OPO', lat: 41.2482, lng: -8.6813 }] },
  { keywords: ['faro'], airports: [{ iata: 'FAO', lat: 37.0144, lng: -7.9659 }] },
  { keywords: ['madeira'], airports: [{ iata: 'FNC', lat: 32.6979, lng: -16.7745 }] },
  // Greece
  { keywords: ['athens'], airports: [{ iata: 'ATH', lat: 37.9364, lng: 23.9475 }] },
  { keywords: ['santorini'], airports: [{ iata: 'JTR', lat: 36.3992, lng: 25.4793 }] },
  { keywords: ['mykonos'], airports: [{ iata: 'JMK', lat: 37.4351, lng: 25.3481 }] },
  { keywords: ['crete', 'heraklion'], airports: [
    { iata: 'HER', lat: 35.3397, lng: 25.1802 },
    { iata: 'CHQ', lat: 35.5317, lng: 24.1497 },
  ] },
  { keywords: ['rhodes'], airports: [{ iata: 'RHO', lat: 36.4054, lng: 28.0862 }] },
  { keywords: ['corfu'], airports: [{ iata: 'CFU', lat: 39.6019, lng: 19.9117 }] },
  { keywords: ['zakynthos'], airports: [{ iata: 'ZTH', lat: 37.7509, lng: 20.8843 }] },
  // Scandinavia
  { keywords: ['copenhagen'], airports: [{ iata: 'CPH', lat: 55.6180, lng: 12.6561 }] },
  { keywords: ['stockholm', 'arlanda', 'bromma', 'skavsta'], airports: [
    { iata: 'ARN', lat: 59.6519, lng: 17.9186 },
    { iata: 'BMA', lat: 59.3544, lng: 17.9417 },
    { iata: 'NYO', lat: 58.7886, lng: 16.9122 },
  ] },
  { keywords: ['oslo'], airports: [{ iata: 'OSL', lat: 60.1939, lng: 11.1004 }] },
  { keywords: ['helsinki'], airports: [{ iata: 'HEL', lat: 60.3172, lng: 24.9633 }] },
  { keywords: ['reykjavik', 'keflavik'], airports: [{ iata: 'KEF', lat: 63.9850, lng: -22.6056 }] },
  // Eastern Europe
  { keywords: ['prague'], airports: [{ iata: 'PRG', lat: 50.1008, lng: 14.2600 }] },
  { keywords: ['budapest'], airports: [{ iata: 'BUD', lat: 47.4394, lng: 19.2617 }] },
  { keywords: ['warsaw', 'modlin'], airports: [
    { iata: 'WAW', lat: 52.1657, lng: 20.9671 },
    { iata: 'WMI', lat: 52.4511, lng: 20.6517 },
  ] },
  { keywords: ['krakow'], airports: [{ iata: 'KRK', lat: 50.0777, lng: 19.7848 }] },
  // Croatia
  { keywords: ['dubrovnik'], airports: [{ iata: 'DBV', lat: 42.5614, lng: 18.2683 }] },
  { keywords: ['split'], airports: [{ iata: 'SPU', lat: 43.5389, lng: 16.2980 }] },
  // Turkey
  { keywords: ['istanbul', 'sabiha'], airports: [
    { iata: 'IST', lat: 41.2753, lng: 28.7519 },
    { iata: 'SAW', lat: 40.8983, lng: 29.3092 },
  ] },
  { keywords: ['antalya'], airports: [{ iata: 'AYT', lat: 36.8987, lng: 30.8005 }] },
  { keywords: ['bodrum'], airports: [{ iata: 'BJV', lat: 37.2506, lng: 27.6643 }] },
  { keywords: ['dalaman'], airports: [{ iata: 'DLM', lat: 36.7131, lng: 28.7925 }] },
  // Middle East
  { keywords: ['dubai'], airports: [
    { iata: 'DXB', lat: 25.2532, lng: 55.3657 },
    { iata: 'DWC', lat: 24.8967, lng: 55.1614 },
  ] },
  { keywords: ['abu dhabi'], airports: [{ iata: 'AUH', lat: 24.4331, lng: 54.6511 }] },
  { keywords: ['doha'], airports: [{ iata: 'DOH', lat: 25.2731, lng: 51.6080 }] },
  // North Africa
  { keywords: ['marrakech'], airports: [{ iata: 'RAK', lat: 31.6069, lng: -8.0363 }] },
  { keywords: ['sharm'], airports: [{ iata: 'SSH', lat: 27.9773, lng: 34.3950 }] },
  { keywords: ['hurghada'], airports: [{ iata: 'HRG', lat: 27.1783, lng: 33.7994 }] },
  { keywords: ['cairo'], airports: [{ iata: 'CAI', lat: 30.1219, lng: 31.4056 }] },
  // Indian Ocean
  { keywords: ['maldives'], airports: [{ iata: 'MLE', lat: 4.1919, lng: 73.5291 }] },
  { keywords: ['mauritius'], airports: [{ iata: 'MRU', lat: -20.4302, lng: 57.6836 }] },
  // Asia
  { keywords: ['bangkok', 'don mueang'], airports: [
    { iata: 'BKK', lat: 13.6900, lng: 100.7501 },
    { iata: 'DMK', lat: 13.9126, lng: 100.6072 },
  ] },
  { keywords: ['phuket'], airports: [{ iata: 'HKT', lat: 8.1132, lng: 98.3169 }] },
  { keywords: ['bali', 'denpasar'], airports: [{ iata: 'DPS', lat: -8.7482, lng: 115.1671 }] },
  { keywords: ['singapore'], airports: [{ iata: 'SIN', lat: 1.3644, lng: 103.9915 }] },
  { keywords: ['kuala lumpur'], airports: [{ iata: 'KUL', lat: 2.7456, lng: 101.7099 }] },
  { keywords: ['tokyo', 'haneda', 'narita'], airports: [
    { iata: 'HND', lat: 35.5494, lng: 139.7798 },
    { iata: 'NRT', lat: 35.7720, lng: 140.3929 },
  ] },
  { keywords: ['hong kong'], airports: [{ iata: 'HKG', lat: 22.3080, lng: 113.9185 }] },
  { keywords: ['shanghai', 'pudong', 'hongqiao'], airports: [
    { iata: 'PVG', lat: 31.1443, lng: 121.8083 },
    { iata: 'SHA', lat: 31.1979, lng: 121.3363 },
  ] },
  { keywords: ['beijing', 'daxing'], airports: [
    { iata: 'PEK', lat: 40.0801, lng: 116.5846 },
    { iata: 'PKX', lat: 39.5098, lng: 116.4105 },
  ] },
  { keywords: ['seoul', 'incheon', 'gimpo'], airports: [
    { iata: 'ICN', lat: 37.4602, lng: 126.4407 },
    { iata: 'GMP', lat: 37.5585, lng: 126.7942 },
  ] },
  // South Asia
  { keywords: ['mumbai'], airports: [{ iata: 'BOM', lat: 19.0896, lng: 72.8656 }] },
  { keywords: ['delhi'], airports: [{ iata: 'DEL', lat: 28.5562, lng: 77.1000 }] },
  { keywords: ['goa'], airports: [{ iata: 'GOI', lat: 15.3808, lng: 73.8314 }] },
  // Americas
  { keywords: ['new york', 'newark', 'laguardia', 'kennedy'], airports: [
    { iata: 'JFK', lat: 40.6413, lng: -73.7781 },
    { iata: 'LGA', lat: 40.7769, lng: -73.8740 },
    { iata: 'EWR', lat: 40.6895, lng: -74.1745 },
  ] },
  { keywords: ['los angeles', 'burbank'], airports: [
    { iata: 'LAX', lat: 33.9416, lng: -118.4085 },
    { iata: 'BUR', lat: 34.2007, lng: -118.3587 },
  ] },
  { keywords: ['orlando'], airports: [{ iata: 'MCO', lat: 28.4312, lng: -81.3081 }] },
  { keywords: ['miami', 'fort lauderdale'], airports: [
    { iata: 'MIA', lat: 25.7933, lng: -80.2906 },
    { iata: 'FLL', lat: 26.0742, lng: -80.1506 },
  ] },
  { keywords: ['cancun'], airports: [{ iata: 'CUN', lat: 21.0365, lng: -86.8771 }] },
  { keywords: ['toronto'], airports: [{ iata: 'YYZ', lat: 43.6777, lng: -79.6248 }] },
  { keywords: ['las vegas'], airports: [{ iata: 'LAS', lat: 36.0840, lng: -115.1537 }] },
  { keywords: ['chicago'], airports: [
    { iata: 'ORD', lat: 41.9742, lng: -87.9073 },
    { iata: 'MDW', lat: 41.7868, lng: -87.7522 },
  ] },
  { keywords: ['washington'], airports: [
    { iata: 'DCA', lat: 38.8512, lng: -77.0402 },
    { iata: 'IAD', lat: 38.9531, lng: -77.4565 },
  ] },
  { keywords: ['san francisco', 'oakland'], airports: [
    { iata: 'SFO', lat: 37.6213, lng: -122.3790 },
    { iata: 'OAK', lat: 37.7213, lng: -122.2207 },
  ] },
  { keywords: ['boston'], airports: [{ iata: 'BOS', lat: 42.3656, lng: -71.0096 }] },
  // Oceania
  { keywords: ['sydney'], airports: [{ iata: 'SYD', lat: -33.9399, lng: 151.1753 }] },
  { keywords: ['melbourne'], airports: [
    { iata: 'MEL', lat: -37.6690, lng: 144.8410 },
    { iata: 'AVV', lat: -38.0394, lng: 144.4692 },
  ] },
  // Africa
  { keywords: ['cape town'], airports: [{ iata: 'CPT', lat: -33.9648, lng: 18.6017 }] },
  { keywords: ['johannesburg'], airports: [{ iata: 'JNB', lat: -26.1392, lng: 28.2460 }] },
];

/** All airports in the groups matched by the destination string. Empty if no metro matches. */
function findCandidateAirports(dest: string): Airport[] {
  if (!dest) return [];
  const d = dest.toLowerCase();
  // Sort keywords by length (desc) so "gran canaria" beats "canaria".
  const hits: Airport[] = [];
  const sorted = [...AIRPORT_GROUPS].sort(
    (a, b) => Math.max(...b.keywords.map((k) => k.length)) - Math.max(...a.keywords.map((k) => k.length)),
  );
  for (const g of sorted) {
    if (g.keywords.some((k) => d.includes(k))) {
      for (const a of g.airports) hits.push(a);
      break; // first metro match wins
    }
  }
  return hits;
}

/** Shared Haversine — miles. Extracted so card + map can agree on distances. */
function haversineMi(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Pick the closest airport to a hotel from the candidate list. */
function nearestAirport(hotelLat: number, hotelLng: number, candidates: Airport[]): Airport | null {
  if (!candidates.length) return null;
  let best: Airport | null = null;
  let bestDist = Infinity;
  for (const a of candidates) {
    const d = haversineMi(hotelLat, hotelLng, a.lat, a.lng);
    if (d < bestDist) {
      bestDist = d;
      best = a;
    }
  }
  return best;
}

/* ═══════════════════════════════════════════════════════════════════════════
   PROVIDER DEEP LINKS (only affiliated providers)
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Trip.com UK cityId map — empirically verified by navigating the live Trip.com
 * UK search bar and capturing the cityId it settles to.
 *
 * Why hardcode? Trip.com won't auto-load results unless `city=<numericId>` is a
 * real, matched ID. Passing `city=-1&cityName=Dubai` resolves the destination
 * box but shows "0 properties found" — the user has to manually click Search.
 * That breaks the Scout handoff. Wrong IDs silently land users in the wrong
 * city (e.g. `city=2` = Shanghai, not Dubai; `city=178` = Anshan, not London).
 *
 * When a destination isn't in this map we fall back to `city=-1` keyword mode —
 * still lands on Trip.com UK with Dubai/UK-locale/GBP + tracking intact, just
 * requires one manual click on Search.
 *
 * TODO: replace with dynamic resolver via /api/resolve-trip-city that hits
 * Trip.com's getKeyWordSearch endpoint and caches in KV for 24h.
 */
const TRIP_UK_CITY_IDS: Record<string, number> = {
  // Verified live 2026-04-19 by navigating uk.trip.com and confirming page title
  dubai: 220,
  // Add more here as they're verified. Key = destination lowercased, no accents.
};

function tripCityIdFor(dest: string): number | null {
  const key = dest.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return TRIP_UK_CITY_IDS[key] ?? null;
}

function buildTripcomUrl(
  dest: string,
  cin: string,
  cout: string,
  adults: number,
  resolvedCityId?: number | null,
  children: number = 0,
  childrenAges: number[] = [],
): string {
  // Trip.com hotel URL contract (verified live 2026-04-19):
  //   - `uk.trip.com/hotels/list` is the UK-localised endpoint (GBP + en-GB).
  //   - `city=<realId>` auto-loads results instantly. Fallback to `city=-1`
  //     keyword mode lands on the correct destination but the user has to
  //     click Search once (no good way around this without the real ID).
  //   - Dates are `/`-separated.
  //   - The old `${slug}-hotels-list/` path 302s to the Trip.com homepage
  //     and was silently losing every click.
  //   - Children: Trip.com accepts `children=N` plus per-child `&age1=X&age2=Y`
  //     indexed params. If ages aren't supplied we default each child to 8
  //     (common mid-range child age) so the search is still valid.
  //
  // cityId resolution order:
  //   1. resolvedCityId (from /api/resolve-trip-city → Trip.com getSuggest, KV-cached)
  //   2. Static verified map (TRIP_UK_CITY_IDS)
  //   3. Keyword-mode fallback (city=-1)
  const cinSlash = cin.replace(/-/g, '/');
  const coutSlash = cout.replace(/-/g, '/');
  const keyword = encodeURIComponent(dest);
  const cityId = resolvedCityId ?? tripCityIdFor(dest);
  const childCount = Math.max(0, children | 0);
  const base = [
    `city=${cityId ?? -1}`,
    `cityName=${keyword}`,
    `checkin=${cinSlash}`,
    `checkout=${coutSlash}`,
    `adult=${adults}`,
    'crn=1',
    `children=${childCount}`,
    'barCurr=GBP',
    'curr=GBP',
    'locale=en-GB',
    'Allianceid=8023009',
    'SID=303363796',
    'trip_sub3=D15021113',
  ];
  // Per-child ages — Trip.com reads age1, age2, … for room occupancy.
  for (let i = 0; i < childCount; i++) {
    const age = childrenAges[i];
    const safeAge = typeof age === 'number' && age >= 0 && age <= 17 ? age : 8;
    base.push(`age${i + 1}=${safeAge}`);
  }
  // Keyword-mode fallback — add the sentinels Trip.com expects for a partial match.
  if (cityId == null) {
    base.push(
      'provinceId=0',
      'countryId=0',
      'districtId=0',
      `searchValue=${keyword}***`,
      'searchBoxArg=t',
      'travelPurpose=0',
      'ctm_ref=ix_sb_dl',
    );
  }
  return `https://uk.trip.com/hotels/list?${base.join('&')}`;
}

function buildExpediaUrl(
  dest: string,
  cin: string,
  cout: string,
  adults: number,
  children: number = 0,
  childrenAges: number[] = [],
): string {
  // Expedia Hotel-Search children format (verified live 2026-04-19):
  //   &children=<count>_<age1>_<age2>...
  // e.g. `children=1_8` = one child aged 8; `children=2_8_5` = two children
  // aged 8 and 5. Tested CSV (`&children=8,5`), `rm1=a2:c8`, and
  // `&children=N&childrenAges=...` — all silently dropped by Expedia UK.
  // The underscore-joined count_age format is the only one that survives
  // into the traveller summary ("3 travellers, 1 room"). If we have a
  // count but no ages, default each to 8.
  let u = `https://www.expedia.co.uk/Hotel-Search?destination=${encodeURIComponent(dest)}&startDate=${cin}&endDate=${cout}&adults=${adults}`;
  const childCount = Math.max(0, children | 0);
  if (childCount > 0) {
    const ages: number[] = [];
    for (let i = 0; i < childCount; i++) {
      const a = childrenAges[i];
      ages.push(typeof a === 'number' && a >= 0 && a <= 17 ? a : 8);
    }
    u += `&children=${childCount}_${ages.join('_')}`;
  }
  u += `&affcid=clbU3QK`;
  return u;
}

type Provider = {
  name: string;
  logo: string;
  getUrl: (dest: string, cin: string, cout: string, adults: number, children: number, childrenAges: number[]) => string;
};

const PROVIDERS: Provider[] = [
  { name: 'Trip.com', logo: '🗺', getUrl: (d, ci, co, a, c, ages) => buildTripcomUrl(d, ci, co, a, null, c, ages) },
  { name: 'Expedia', logo: '🌍', getUrl: (d, ci, co, a, c, ages) => buildExpediaUrl(d, ci, co, a, c, ages) },
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
  /** Room name from LiteAPI, e.g. "Deluxe King". Used to count
   *  distinct room types for the search-card chip. May be null when
   *  the supplier didn't surface a specific name for the rate. */
  roomName?: string | null;
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
  /** Aggregate review count from LiteAPI directory listing — populated
   *  only when supplier surfaces it. Used to show "4,834 reviews" chip. */
  reviewCount?: number | null;
  /** 0-10 aggregate review score — pairs with reviewCount on the chip. */
  reviewScore?: number | null;
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

type PlaceResult = {
  id: string;
  name: string;
  description: string;
  type: string;
  // Optional — curated neighbourhoods include coordinates + the query string
  // to feed back to LiteAPI hotel search (e.g. "Paddington, London, UK").
  lat?: number;
  lng?: number;
  query?: string;
};

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
    if (t === 'neighborhood' || t === 'sublocality' || t === 'sublocality_level_1') return 'fa-map-pin';
    return 'fa-location-dot';
  };
  const typeLabel = (t: string) => {
    if (t === 'airport' || t === 'aerodrome') return 'Airport';
    if (t === 'hotel' || t === 'lodging') return 'Hotel';
    if (t === 'neighborhood' || t === 'sublocality' || t === 'sublocality_level_1') return 'Area';
    return 'City';
  };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input type="text" placeholder="Any city or town worldwide" value={value} autoComplete="off"
          onChange={e => handleInput(e.target.value)}
          onFocus={() => setOpen(true)}
          className="w-full px-4 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.9rem] font-semibold text-[#1A1D2B] outline-none focus:border-orange-400 focus:bg-white transition-all placeholder:text-[#B0B8CC] pr-10" />
        {open && searching && (
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
                if (debounceRef.current) clearTimeout(debounceRef.current);
                onChange(l.searchAs);
                onPlaceSelect({ id: l.placeId, name: l.searchAs, description: l.sublabel, type: 'locality' });
                setOpen(false);
                setApiResults([]);
                setSearching(false);
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
              {apiResults.slice(0, 12).map(p => (
                <li key={p.id} onMouseDown={() => {
                  // Curated neighbourhoods come with a pre-formatted `query`
                  // string ("Paddington, London, UK") — feed that back to the
                  // search so LiteAPI resolves the right area. Everything else
                  // just uses the displayName.
                  if (debounceRef.current) clearTimeout(debounceRef.current);
                  onChange(p.query || p.name);
                  onPlaceSelect(p);
                  setOpen(false);
                  setApiResults([]);
                  setSearching(false);
                }}
                  className="px-4 py-2.5 hover:bg-orange-50 cursor-pointer transition-colors border-b border-[#F1F3F7] last:border-0 flex items-center gap-3">
                  <i className={`fa-solid ${typeIcon(p.type)} text-[.8rem] text-orange-400 w-5 text-center flex-shrink-0`} />
                  <div className="min-w-0">
                    <span className="font-poppins font-bold text-[.85rem] text-[#1A1D2B] block truncate">{p.name}</span>
                    {p.description && <span className="text-[.68rem] text-[#8E95A9] font-semibold block truncate">{p.description}</span>}
                  </div>
                  <span className="text-[.55rem] font-bold text-[#B0B8CC] uppercase tracking-wider ml-auto flex-shrink-0">
                    {typeLabel(p.type)}
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
                <li key={c} onMouseDown={() => {
                  if (debounceRef.current) clearTimeout(debounceRef.current);
                  onChange(c);
                  onPlaceSelect(null);
                  setOpen(false);
                  setSearching(false);
                }}
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

function HotelCardWrapper({ hotel, index, isCheapest, nights, adults, children, childrenAges, checkin, checkout, searchedDest, tripCityId, buildDetailHref, setScoutHotel, priceView, cityCentre, airports, isCompared, compareFull, onToggleCompare, isActive, onHover }: {
  hotel: HotelResult;
  index: number;
  isCheapest: boolean;
  nights: number;
  adults: number;
  children: number;
  childrenAges: number[];
  checkin: string;
  checkout: string;
  searchedDest: string;
  tripCityId: number | null;
  buildDetailHref: (h: HotelResult) => string;
  setScoutHotel: (s: { name: string; lat: number; lng: number } | null) => void;
  priceView: 'total' | 'perPerson';
  cityCentre: { lat: number; lng: number } | null;
  airports: Airport[];
  isCompared: boolean;
  compareFull: boolean;
  onToggleCompare: () => void;
  /** Highlighted because the matching map pin is hovered/clicked. */
  isActive?: boolean;
  /** Hovering this card notifies the map so it can emphasise the pin. */
  onHover?: (hovered: boolean) => void;
}) {
  // Distance (miles) from city centre + the *nearest* candidate airport —
  // picked per-hotel, so a Crawley hotel labels LGW while a Hounslow hotel
  // labels LHR even when both were returned by the same "London" search.
  const hasCoords = typeof hotel.lat === 'number' && typeof hotel.lng === 'number';
  const milesFromCentre = hasCoords && cityCentre
    ? haversineMi(hotel.lat!, hotel.lng!, cityCentre.lat, cityCentre.lng)
    : null;
  const airport = hasCoords ? nearestAirport(hotel.lat!, hotel.lng!, airports) : null;
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
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=640&h=480&fit=crop&fm=webp&q=75',
    'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=640&h=480&fit=crop&fm=webp&q=75',
    'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=640&h=480&fit=crop&fm=webp&q=75',
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=640&h=480&fit=crop&fm=webp&q=75',
    'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=640&h=480&fit=crop&fm=webp&q=75',
    'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=640&h=480&fit=crop&fm=webp&q=75',
    'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=640&h=480&fit=crop&fm=webp&q=75',
    'https://images.unsplash.com/photo-1455587734955-081b22074882?w=640&h=480&fit=crop&fm=webp&q=75',
    'https://images.unsplash.com/photo-1587213811864-46e59f6873b1?w=640&h=480&fit=crop&fm=webp&q=75',
    'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=640&h=480&fit=crop&fm=webp&q=75',
  ];
  const photoUrl = h.thumbnail || HOTEL_PHOTOS[index % HOTEL_PHOTOS.length];
  const tripUrl = buildTripcomUrl(searchedDest, checkin, checkout, adults, tripCityId, children, childrenAges);
  const expediaUrl = buildExpediaUrl(searchedDest, checkin, checkout, adults, children, childrenAges);
  const detailHref = buildDetailHref(h);

  // Build a modified hotel object with the selected board's offerId for BookDirect
  const bookHotel = { ...h, offerId: displayOfferId, totalPrice: displayTotal, pricePerNight: displayPrice };

  return (
    <div
      id={`hotel-card-${hotel.id}`}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      className={`bg-white border rounded-2xl overflow-hidden transition-all hover:shadow-md relative ${isCheapest ? 'border-[#E8D8A8] ring-1 ring-[#E8D8A8]/60' : 'border-[#E8ECF4]'} ${isCompared ? 'ring-2 ring-orange-400 border-orange-300' : ''} ${isActive ? 'ring-2 ring-[#287DFA] shadow-[0_8px_32px_rgba(40,125,250,0.15)]' : ''}`}
    >
      {/* Compare toggle — card top-right. Price column gets extra top padding
          (md:pt-12 below) so the price never slides under this pill. */}
      <button
        type="button"
        onClick={onToggleCompare}
        disabled={!isCompared && compareFull}
        aria-pressed={isCompared}
        title={isCompared ? 'Remove from compare' : compareFull ? 'Compare limit reached (3)' : 'Add to compare'}
        className={`absolute z-10 top-2.5 right-2.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[.66rem] font-bold shadow-sm transition-all ${
          isCompared
            ? 'bg-orange-500 text-white hover:bg-orange-600'
            : compareFull
            ? 'bg-white/90 text-[#8E95A9] cursor-not-allowed border border-[#E8ECF4]'
            : 'bg-white/95 text-[#1A1D2B] hover:bg-orange-50 hover:text-orange-600 border border-[#E8ECF4]'
        }`}
      >
        <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${isCompared ? 'bg-white border-white' : 'border-[#C5CBD9]'}`}>
          {isCompared && <i className="fa-solid fa-check text-[.55rem] text-orange-500" />}
        </span>
        Compare
      </button>
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
          {/* Scout "recommendation" pill — champagne + gold ring, not clearance-sale orange */}
          {isCheapest && (
            <span className="absolute top-3 left-3 text-[.55rem] font-black uppercase tracking-[1.5px] bg-[#FAF3E6] text-[#8a6d00] ring-1 ring-[#E8D8A8] px-2.5 py-1 rounded-full shadow-sm">
              Scout Pick
            </span>
          )}
        </a>

        {/* Info */}
        <div className="p-5 flex flex-col justify-center">
          <a href={detailHref} className="hover:bg-[#F8FAFC] transition-colors">
            <div className="mb-1 flex items-center gap-2 flex-wrap">
              <Stars count={h.stars} />
              {typeof h.reviewCount === 'number' && h.reviewCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[.68rem] font-bold text-[#5C6378]">
                  {typeof h.reviewScore === 'number' && h.reviewScore > 0 && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <i className="fa-solid fa-thumbs-up text-[.55rem]" aria-hidden />
                      {h.reviewScore.toFixed(1)}
                    </span>
                  )}
                  <span>{h.reviewCount.toLocaleString()} reviews</span>
                </span>
              )}
            </div>
            <h3 className="font-[var(--font-playfair)] font-black text-[1.2rem] text-[#0a1628] tracking-tight mb-1 leading-tight">{h.name}</h3>
            {h.district && <p className="text-[.75rem] text-[#8E95A9] font-semibold mb-1">📍 {h.district}</p>}
            {(milesFromCentre != null || milesFromAirport != null) && (
              <p className="text-[.72rem] text-[#287DFA] font-semibold mb-2 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                {milesFromCentre != null && (
                  <span className="inline-flex items-center gap-1">
                    <i className="fa-solid fa-location-dot text-[.62rem] text-[#287DFA]" />
                    {fmtMi(milesFromCentre)} mi from centre
                  </span>
                )}
                {milesFromCentre != null && milesFromAirport != null && <span className="text-[#287DFA]/40">·</span>}
                {milesFromAirport != null && airport && (
                  <span className="inline-flex items-center gap-1">
                    <i className="fa-solid fa-plane text-[.62rem] text-[#287DFA]" />
                    {fmtMi(milesFromAirport)} mi from {airport.iata}
                  </span>
                )}
              </p>
            )}
            {nights > 0 && <p className="text-[.72rem] text-[#5C6378] font-semibold">{nights} night{nights !== 1 ? 's' : ''} · {adults} guest{adults !== 1 ? 's' : ''}</p>}
            {/* Scout voice: emerald solid for positive, slate outline for
                neutral — stated, not scolded. No red. */}
            {h.bookable && typeof displayRefundable === 'boolean' && (
              displayRefundable ? (
                <span className="inline-flex items-center gap-1.5 mt-1.5 text-[.7rem] font-bold text-emerald-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden />
                  Free cancellation
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 mt-1.5 text-[.7rem] font-semibold text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full border border-slate-300" aria-hidden />
                  Non-refundable
                </span>
              )
            )}
            {displayBoard && !opts && (
              <span className="text-[.66rem] text-[#8E95A9] font-semibold mt-0.5 block">{displayBoard}</span>
            )}
          </a>
          {/* Scout Summary — single-line teaser instead of the rate dump.
              Click flows to the detail page where the Scout Rooms Table
              does the real work. */}
          {/* Room-type chip — counts DISTINCT room names, not the
              flattened (room × board) combinations. boardOptions can
              carry up to 50 (roomName, boardType) entries from LiteAPI,
              so the old `opts.length` was producing "12 room types
              available" on every well-stocked hotel — wrong (it was
              counting rate combos, capped at 12) and looked hardcoded.
              (2026-04-28). Now: hotel with 4 rooms × 3 boards = "4 room
              types available". Hotels with no roomName at all hide
              the chip rather than show a meaningless "0". */}
          {(() => {
            if (!opts || opts.length === 0) return null;
            const roomNames = new Set(
              opts
                .map(o => (o.roomName || '').trim().toLowerCase())
                .filter(n => n.length > 0)
            );
            const roomCount = roomNames.size;
            // Hide chip when there's nothing to compare. A "1 room type
            // available" pill adds no value — there's no choice to make
            // and nothing to click through to. Sell variety only.
            if (roomCount <= 1) return null;
            return (
              <a
                href={detailHref}
                className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FAF3E6] ring-1 ring-[#E8D8A8] text-[#6b5500] text-[.7rem] font-bold hover:bg-[#F5E9C8] transition-colors w-fit"
              >
                <i className="fa-solid fa-sparkles text-[.6rem]" />
                {roomCount} room type{roomCount !== 1 ? 's' : ''} available
                <span className="opacity-70">→</span>
              </a>
            );
          })()}
          <a href={detailHref} className="text-[.7rem] text-orange-600 font-bold mt-2 inline-block">View details →</a>
        </div>

        {/* Price + Actions — extra top padding on desktop so price sits below
            the Compare pill pinned at card top-right. */}
        <div className="p-5 md:pt-14 flex flex-col items-end justify-center gap-2 border-t md:border-t-0 md:border-l border-[#F1F3F7]">
          <div className="text-right">
            {/* Scout Deal badge — negotiated rate is lower than market */}
            {h.marketPerNight != null && h.negotiatedPerNight != null && h.negotiatedPerNight < h.marketPerNight && (
              <span className="inline-block text-[.55rem] font-black uppercase tracking-[1.2px] bg-gradient-to-r from-orange-500 to-amber-500 text-white px-2 py-0.5 rounded-full mb-1.5">Scout Deal</span>
            )}
            {priceView === 'perPerson' ? (
              <>
                {/* Per-person divides by total guests (adults + children) so a 2A+2C
                    booking shows the correct quarter-of-total figure. Previously
                    divided by adults only, overstating per-person cost when kids
                    were included (2026-04-28 fix). */}
                {(() => {
                  const guests = Math.max(1, adults + (children || 0));
                  return (
                    <>
                      {h.marketPrice != null && h.negotiatedPrice != null && h.negotiatedPrice < h.marketPrice && (
                        <div className="text-[.72rem] text-[#8E95A9] font-bold line-through mb-0.5">£{Math.round(h.marketPrice / guests)}/person</div>
                      )}
                      <div className="font-[var(--font-playfair)] font-black text-[1.65rem] text-[#0a1628] tracking-tight leading-none">£{Math.round(displayTotal / guests)}<span className="text-[.7rem] font-semibold text-[#8E95A9] tracking-normal">/person</span></div>
                      {nights > 0 && (
                        <div className="text-[.68rem] text-[#8E95A9] font-semibold mt-0.5">£{displayTotal} total · {nights} night{nights !== 1 ? 's' : ''} · {guests} guest{guests !== 1 ? 's' : ''}</div>
                      )}
                    </>
                  );
                })()}
              </>
            ) : (
              <>
                {h.marketPerNight != null && h.negotiatedPerNight != null && h.negotiatedPerNight < h.marketPerNight && (
                  <div className="text-[.72rem] text-[#8E95A9] font-bold line-through mb-0.5">£{h.marketPerNight}/night</div>
                )}
                <div className="font-[var(--font-playfair)] font-black text-[1.65rem] text-[#0a1628] tracking-tight leading-none">£{displayPrice}<span className="text-[.7rem] font-semibold text-[#8E95A9] tracking-normal">/night</span></div>
                {nights > 0 && (
                  <div className="text-[.68rem] text-[#8E95A9] font-semibold mt-0.5">£{displayTotal} total for {nights} night{nights !== 1 ? 's' : ''}</div>
                )}
                {/* Trust chip — the "why us vs Booking" proof. Booking.com shows
                    pre-tax headline prices; our displayed price is all-in. Loud,
                    green, never missed. */}
                <span className="inline-flex items-center gap-1 mt-1.5 text-[.68rem] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <i className="fa-solid fa-circle-check text-[.62rem]" aria-hidden />
                  Total Price (Inc. All Taxes &amp; Fees)
                </span>
              </>
            )}
            {/* Wholesale-rate signal — always visible (both per-night
                and per-person views). Honest framing: we surface the
                live wholesale rate from LiteAPI/RateHawk and never add
                booking fees on top. No comparative claims against
                named competitors. */}
            <span className="inline-flex items-center gap-1 mt-1.5 text-[.68rem] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
              <i className="fa-solid fa-circle-check text-[.62rem]" aria-hidden />
              Live wholesale rate · No booking fees
            </span>
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
          <div className="flex flex-col items-end gap-1.5 w-full mt-1">
            <BookDirectButton hotel={bookHotel} checkIn={checkin} checkOut={checkout} adults={adults} nights={nights} city={searchedDest} detailHref={detailHref} />
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 justify-end text-[10px] text-[#9CA3AF] font-medium">
              <span>✅ No hidden fees</span>
              <span>✅ Free cancellation</span>
              <span>✅ Secure payment</span>
            </div>
          </div>
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

/* Book Direct — Scout Shield routing.
   The prior implementation POSTed the SEARCH card's cached offerId straight
   to /api/hotels/start-booking. Those offerIds are up to 15 minutes stale
   (KV cache), so the hotel often sold the rate before LiteAPI's prebook ran,
   producing 5000 / "ghost inventory" errors at checkout.

   New flow: Book Direct now deep-links to the hotel detail page which
   re-fetches live rates from LiteAPI. The user picks the freshly-locked
   rate from the Rooms Table and "Secure this rate" there starts the
   booking with an offerId that was alive seconds ago.

   We also skip the round-trip if the detail page URL is already known by
   passing the full query string through. */
function BookDirectButton({
  hotel,
  detailHref,
}: {
  hotel: HotelResult;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  city: string;
  detailHref: string;
}) {
  if (!hotel.offerId) return null;
  return (
    <a
      href={detailHref}
      className="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-full bg-[#0a0f2e] hover:bg-[#111827] text-[#f5a623] font-poppins font-semibold text-[.72rem] whitespace-nowrap transition-all duration-200 hover:scale-[1.02] shadow-sm"
    >
      <i className="fa-solid fa-lock mr-1.5" /> Book Direct — Best Price →
    </a>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   LOADING
   ═══════════════════════════════════════════════════════════════════════════ */

const LOADING_MSGS = [
  'Searching live rates...',
  'Comparing wholesale prices...',
  'Finding the best rates...',
  'Checking direct availability...',
];

function HotelSkeletonCard() {
  return (
    <div className="bg-white border border-[#E8ECF4] rounded-2xl overflow-hidden shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-[260px_1fr] gap-0">
        <div className="aspect-[4/3] sm:aspect-auto bg-[#F1F3F7] animate-pulse" />
        <div className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-[#F1F3F7] rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-[#F1F3F7] rounded animate-pulse" />
              <div className="h-3 w-20 bg-[#F1F3F7] rounded animate-pulse" />
            </div>
            <div className="w-16 h-8 bg-[#F1F3F7] rounded-lg animate-pulse" />
          </div>
          <div className="flex gap-2 flex-wrap pt-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-6 w-16 bg-[#F1F3F7] rounded-full animate-pulse" />
            ))}
          </div>
          <div className="flex items-end justify-between gap-3 pt-2">
            <div className="space-y-1.5">
              <div className="h-2.5 w-20 bg-[#F1F3F7] rounded animate-pulse" />
              <div className="h-5 w-24 bg-[#F1F3F7] rounded animate-pulse" />
            </div>
            <div className="h-9 w-28 bg-[#F1F3F7] rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingState({ dest }: { dest: string }) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const msgTimer = setInterval(() => setMsgIdx(i => (i + 1) % LOADING_MSGS.length), 600);
    const progTimer = setInterval(() => setProgress(p => Math.min(p + 1.2, 95)), 50);
    return () => { clearInterval(msgTimer); clearInterval(progTimer); };
  }, []);

  return (
    <section className="max-w-[1000px] mx-auto px-5 py-8">
      <div className="bg-white border border-[#E8ECF4] rounded-2xl p-5 shadow-sm mb-5">
        <div className="w-full bg-[#F1F3F7] rounded-full h-1.5 mb-3 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-orange-400 to-amber-500 rounded-full transition-all duration-100" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="text-[.85rem] font-bold text-[#1A1D2B]">{LOADING_MSGS[msgIdx]}</span>
          <p className="text-[.72rem] text-[#8E95A9] font-semibold">Building stays in <strong className="text-[#1A1D2B]">{dest}</strong></p>
        </div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => <HotelSkeletonCard key={i} />)}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPARE — sticky tray + side-by-side modal
   ═══════════════════════════════════════════════════════════════════════════ */

function CompareTray({ hotels, nights, priceView, adults, childCount, onRemove, onClear, onOpen }: {
  hotels: HotelResult[];
  nights: number;
  priceView: 'total' | 'perPerson';
  adults: number;
  childCount: number;
  onRemove: (id: number | string) => void;
  onClear: () => void;
  onOpen: () => void;
}) {
  const guests = Math.max(1, adults + childCount);
  const priceLabel = (h: HotelResult) => {
    const total = h.totalPrice ?? h.pricePerNight * Math.max(1, nights);
    if (priceView === 'total') return `£${Math.round(total)}`;
    return `£${Math.round(total / guests)}`;
  };
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 px-3 pb-3 pointer-events-none">
      <div className="max-w-[1000px] mx-auto pointer-events-auto">
        <div className="bg-white/95 backdrop-blur border border-orange-200 shadow-2xl rounded-2xl px-4 py-3 flex items-center gap-3 flex-wrap">
          <span className="text-[.7rem] font-black uppercase tracking-wider text-orange-600">Compare</span>
          <span className="text-[.72rem] font-bold text-[#8E95A9]">{hotels.length} of 3 selected</span>
          <div className="flex items-center gap-2 flex-1 min-w-0 overflow-x-auto">
            {hotels.map(h => (
              <span key={h.id} className="inline-flex items-center gap-1.5 bg-[#FAF3E6] ring-1 ring-[#E8D8A8] text-[#6b5500] text-[.7rem] font-bold px-2.5 py-1 rounded-full shrink-0">
                <span className="truncate max-w-[140px]">{h.name}</span>
                <span className="text-[#8a6d00]/70">·</span>
                <span>{priceLabel(h)}</span>
                <button
                  type="button"
                  onClick={() => onRemove(h.id)}
                  aria-label={`Remove ${h.name}`}
                  className="ml-0.5 w-4 h-4 rounded-full hover:bg-[#E8D8A8]/40 flex items-center justify-center"
                >
                  <i className="fa-solid fa-xmark text-[.55rem]" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClear}
              className="text-[.7rem] font-bold text-[#8E95A9] hover:text-[#1A1D2B] px-2 py-1"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={onOpen}
              disabled={hotels.length < 2}
              className={`text-[.78rem] font-black px-4 py-2 rounded-full transition-all ${hotels.length < 2 ? 'bg-[#F1F3F7] text-[#8E95A9] cursor-not-allowed' : 'bg-orange-500 text-white hover:bg-orange-600 shadow-sm'}`}
            >
              Compare {hotels.length >= 2 ? `${hotels.length} hotels` : '(pick 2+)'} →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompareModal({ hotels, nights, priceView, adults, childCount, buildDetailHref, onClose, onRemove }: {
  hotels: HotelResult[];
  nights: number;
  priceView: 'total' | 'perPerson';
  adults: number;
  childCount: number;
  buildDetailHref: (h: HotelResult) => string;
  onClose: () => void;
  onRemove: (id: number | string) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const guests = Math.max(1, adults + childCount);
  const priceCell = (h: HotelResult) => {
    const total = h.totalPrice ?? h.pricePerNight * Math.max(1, nights);
    const main = priceView === 'total' ? `£${Math.round(total)}` : `£${Math.round(total / guests)}`;
    const sub = priceView === 'total' ? `total · ${nights || 1}n · ${guests}g` : `per person · total ${nights || 1}n`;
    return { main, sub };
  };
  const cheapestTotal = hotels.reduce((min, h) => {
    const t = h.totalPrice ?? h.pricePerNight * Math.max(1, nights);
    return t < min ? t : min;
  }, Infinity);

  return (
    <div className="fixed inset-0 z-[120] bg-[#0a1628]/60 backdrop-blur-sm flex items-start md:items-center justify-center p-3 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-[1100px] w-full my-6 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F1F3F7]">
          <div>
            <h2 className="font-[var(--font-playfair)] font-black text-[1.25rem] text-[#0a1628]">Side-by-side comparison</h2>
            <p className="text-[.72rem] text-[#8E95A9] font-semibold">{hotels.length} hotels · cheapest total highlighted</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close comparison"
            className="w-9 h-9 rounded-full hover:bg-[#F1F3F7] flex items-center justify-center text-[#5C6378]"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div className="p-5 overflow-x-auto">
          <div className="grid gap-4 min-w-[640px]" style={{ gridTemplateColumns: `repeat(${hotels.length}, minmax(0, 1fr))` }}>
            {hotels.map(h => {
              const total = h.totalPrice ?? h.pricePerNight * Math.max(1, nights);
              const isCheapest = total === cheapestTotal;
              const pc = priceCell(h);
              const photo = h.thumbnail || '';
              return (
                <div key={h.id} className={`border rounded-2xl overflow-hidden flex flex-col ${isCheapest ? 'border-[#E8D8A8] ring-2 ring-[#E8D8A8]/70 bg-[#FFFCF5]' : 'border-[#E8ECF4] bg-white'}`}>
                  <div className="relative aspect-[4/3] bg-[#F1F3F7]">
                    {photo ? <img src={photo} alt={h.name} className="w-full h-full object-cover" loading="lazy"
                      onError={(e) => {
                        const el = e.currentTarget;
                        el.style.display = 'none';
                        if (el.parentElement && !el.parentElement.querySelector('[data-img-fallback]')) {
                          const ph = document.createElement('div');
                          ph.setAttribute('data-img-fallback', '');
                          ph.className = 'w-full h-full flex items-center justify-center text-3xl';
                          ph.textContent = '🛏';
                          el.parentElement.appendChild(ph);
                        }
                      }} /> : <div className="w-full h-full flex items-center justify-center text-3xl">🛏</div>}
                    {isCheapest && (
                      <span className="absolute top-2 left-2 text-[.55rem] font-black uppercase tracking-[1.5px] bg-[#FAF3E6] text-[#8a6d00] ring-1 ring-[#E8D8A8] px-2 py-0.5 rounded-full">
                        Cheapest total
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemove(h.id)}
                      aria-label={`Remove ${h.name}`}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/95 hover:bg-white text-[#5C6378] flex items-center justify-center shadow"
                    >
                      <i className="fa-solid fa-xmark text-[.7rem]" />
                    </button>
                  </div>
                  <div className="p-4 flex flex-col gap-2 flex-1">
                    <Stars count={h.stars} />
                    <h3 className="font-[var(--font-playfair)] font-black text-[1rem] text-[#0a1628] leading-tight">{h.name}</h3>
                    {h.district && <p className="text-[.7rem] text-[#8E95A9] font-semibold">📍 {h.district}</p>}
                    <dl className="mt-1 space-y-1.5 text-[.72rem]">
                      <Row label="Price" value={<><span className="font-black text-[.95rem] text-[#0a1628]">{pc.main}</span><span className="block text-[.65rem] text-[#8E95A9] font-semibold">{pc.sub}</span></>} />
                      <Row label="Per night" value={<span className="font-bold text-[#1A1D2B]">£{Math.round(h.pricePerNight)}</span>} />
                      <Row label="Board" value={<span className="text-[#1A1D2B] font-semibold">{h.boardType || '—'}</span>} />
                      <Row label="Cancellation" value={
                        typeof h.refundable === 'boolean'
                          ? (h.refundable
                            ? <span className="text-emerald-700 font-bold">Free</span>
                            : <span className="text-slate-500 font-semibold">Non-refundable</span>)
                          : <span className="text-[#8E95A9]">—</span>
                      } />
                      <Row label="Bookable" value={h.bookable ? <span className="text-emerald-700 font-bold">Direct</span> : <span className="text-slate-500 font-semibold">Via partner</span>} />
                    </dl>
                    <a
                      href={buildDetailHref(h)}
                      className="mt-auto inline-flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white font-poppins font-bold text-[.75rem] px-3 py-2 rounded-full transition-all"
                    >
                      View rooms →
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1 border-b border-[#F1F3F7] last:border-b-0">
      <dt className="text-[#8E95A9] font-semibold uppercase tracking-wide text-[.62rem]">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
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
  // Trip.com numeric cityId for the current search. Resolved server-side via
  // /api/resolve-trip-city (KV-cached, 24h). Threaded into buildTripcomUrl so
  // `uk.trip.com/hotels/list?city=<id>` auto-loads results instead of
  // requiring the user to click Search.
  const [tripCityId, setTripCityId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('recommended');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [priceView, setPriceView] = useState<'total' | 'perPerson'>('total');
  // Bidirectional highlight between map pins and list cards. Hovering either
  // side sets this id; the other side reads it to emphasise the match.
  const [activeHotelId, setActiveHotelId] = useState<string | number | null>(null);

  // Scout sidebar state
  const [scoutHotel, setScoutHotel] = useState<{ name: string; lat: number; lng: number } | null>(null);

  // Hot deals state
  const [deals, setDeals] = useState<DealDestination[] | null>(null);
  const [dealsLoading, setDealsLoading] = useState(true);
  const [dealBookingId, setDealBookingId] = useState<string | null>(null);

  // Date-matrix strip (D−3 … D+3 check-in, stay-length locked). Loaded
  // after the main LiteAPI search resolves so it never blocks results.
  // Powered by Hotellook `cache.json` (free, cached) — not LiteAPI.
  const [dateStrip, setDateStrip] = useState<MatrixOption[]>([]);
  const [dateStripLoading, setDateStripLoading] = useState(false);
  // Bumped whenever a strip click shifts check-in/out. The useEffect
  // below waits for state to flush then re-fires handleSearch.
  const [dateShiftTrigger, setDateShiftTrigger] = useState(0);

  // Compare tray — up to 3 hotels side-by-side. Persists across sort/filter
  // changes so users don't lose selections while narrowing results.
  const [compareIds, setCompareIds] = useState<Array<number | string>>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const toggleCompare = (id: number | string) => {
    setCompareIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 3) return prev; // cap at 3
      return [...prev, id];
    });
  };

  useEffect(() => {
    fetch('/api/hotels/deals')
      .then(r => r.json())
      .then(d => { setDeals(d.deals || []); setDealsLoading(false); })
      .catch(() => setDealsLoading(false));
  }, []);

  // Click a deal card → start booking and jump straight to checkout
  // (instead of opening the detail page). Falls back to detail-page
  // navigation when we don't have an offerId or start-booking fails.
  const handleDealClick = async (
    e: React.MouseEvent,
    deal: DealDestination,
    hotel: DealHotel,
    fallbackHref: string,
  ) => {
    if (!hotel.offerId) return; // let the link navigate normally
    e.preventDefault();
    if (dealBookingId) return;
    setDealBookingId(hotel.id);
    try {
      const nights = Math.max(
        1,
        Math.round(
          (new Date(deal.checkout).getTime() - new Date(deal.checkin).getTime()) /
            86400000,
        ),
      );
      const res = await fetch('/api/hotels/start-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId: hotel.offerId,
          hotelName: hotel.name,
          stars: hotel.stars ?? 0,
          totalPrice: hotel.totalPrice,
          currency: 'GBP',
          checkIn: deal.checkin,
          checkOut: deal.checkout,
          city: deal.city,
          adults: 2,
          nights,
          thumbnail: hotel.thumbnail || null,
          refundable: hotel.refundable,
        }),
      });
      const data = await res.json();
      if (!data.success || !data.ref) throw new Error(data.error || 'Could not start booking');
      window.location.assign(`/hotels/checkout/${encodeURIComponent(data.ref)}`);
    } catch {
      // Network/API failure — fall back to the detail page so the user
      // still gets somewhere useful.
      window.location.assign(fallbackHref);
    }
  };

  const resultsRef = useRef<HTMLDivElement>(null);

  // Read URL params (URL wins) — fall back to sticky search for any field
  // the URL doesn't supply. Stale dates are silently dropped.
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

    const sticky = loadSticky<StickyHotels>('hotels');
    const today = new Date().toISOString().split('T')[0];

    if (dest) setDestination(dest);
    else if (sticky?.destination) setDestination(sticky.destination);

    if (cin) setCheckin(cin);
    else if (sticky?.checkin && sticky.checkin >= today) setCheckin(sticky.checkin);

    if (cout) setCheckout(cout);
    else if (sticky?.checkout && sticky.checkout >= today) setCheckout(sticky.checkout);

    if (a) setAdults(Math.min(10, Math.max(1, parseInt(a))));
    else if (sticky?.adults) setAdults(Math.min(10, Math.max(1, sticky.adults)));

    if (c) setChildCount(Math.min(5, Math.max(0, parseInt(c))));
    else if (typeof sticky?.children === 'number') setChildCount(Math.min(5, Math.max(0, sticky.children)));

    if (r) setRooms(Math.min(5, Math.max(1, parseInt(r))));
    else if (sticky?.rooms) setRooms(Math.min(5, Math.max(1, sticky.rooms)));

    if (s) setMinStars(Math.min(5, Math.max(0, parseInt(s))));

    if (pid) setSelectedPlaceId(pid);
    else if (sticky?.placeId && !dest) setSelectedPlaceId(sticky.placeId);
  }, []);

  // Geolocation auto-fill removed 2026-04-27 — real Clarity recording
  // showed a mobile visitor land on /hotels with the form pre-filled to
  // "Greater London" + future dates and an auto-fired search underneath.
  // Owner's call: "no pre filled and keep asking again and again for
  // location". Visitors should always start with a clean form and pick
  // their own destination. URL-shared links (?destination=...) still
  // pre-fill via the param effect above; sticky search restores their
  // own previous search but does NOT trigger an auto-search any more
  // (see the tightened auto-search effect below).

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

    // Scroll to results container as soon as search fires. Same pattern
    // as flights — without it, mobile users tap Search, see no change
    // (loader is below the fold), and tap repeatedly thinking it's
    // broken. setTimeout 50ms gives React a tick to render the loader
    // before we scroll.
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);

    // Persist this search so the next visit pre-fills the form.
    saveSticky<StickyHotels>('hotels', {
      destination,
      placeId: selectedPlaceId || undefined,
      checkin,
      checkout,
      adults,
      children: childCount,
      rooms,
    });

    // Prefetch Trip.com cityId in the background so "Trip.com →" buttons
    // land on a results page with inventory already loaded. Non-blocking —
    // if it fails or resolves late, the builder falls back to `city=-1`
    // keyword mode (works, just needs one manual Search click).
    setTripCityId(null);
    fetch(`/api/resolve-trip-city?q=${encodeURIComponent(destination)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { id: number } | null) => {
        // Resolver returns -1 for misses; treat only positive IDs as resolved.
        if (data && typeof data.id === 'number' && data.id > 0) setTripCityId(data.id);
      })
      .catch(() => {
        /* silent — buildTripcomUrl falls back to keyword mode */
      });

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

      // Fire-and-forget: load the D−3…D+3 check-in strip. Hotellook-only
      // (free, cached) so this never multiplies LiteAPI cost per visit.
      // Pass basePrice = cheapest total-stay price from the LiteAPI
      // result so the selected strip cell is never empty.
      const hotelsArr = Array.isArray(data.hotels) ? data.hotels : [];
      const baseTotal = hotelsArr.length > 0
        ? Math.min(...hotelsArr.map((h: { totalPrice?: number }) => typeof h.totalPrice === 'number' ? h.totalPrice : Infinity).filter((n: number) => Number.isFinite(n)))
        : null;
      (async () => {
        setDateStripLoading(true);
        setDateStrip([]);
        try {
          const stripParams = new URLSearchParams({
            city: destination,
            checkin,
            checkout,
            adults: String(adults),
            mode: 'datestrip',
          });
          if (selectedPlaceId) stripParams.set('placeId', selectedPlaceId);
          if (baseTotal !== null && Number.isFinite(baseTotal)) {
            stripParams.set('basePrice', String(Math.round(baseTotal as number)));
          }
          const sRes = await fetch(`/api/hotels?${stripParams}`);
          const sData = await sRes.json();
          if (sData.success && Array.isArray(sData.dates)) {
            const stripNights = sData.nights || 1;
            const mapped: MatrixOption[] = sData.dates.map((c: { checkin: string; checkout: string; total_price_gbp: number | null }) => {
              const ci = new Date(c.checkin + 'T00:00:00Z');
              const label = `${ci.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })} · ${stripNights}n`;
              return {
                id: c.checkin,
                label,
                price: c.total_price_gbp,
                isSelected: c.checkin === checkin,
                metadata: { checkin: c.checkin, checkout: c.checkout },
              };
            });
            setDateStrip(mapped);
          }
        } catch {
          // Silent fail — strip is a nice-to-have.
        } finally {
          setDateStripLoading(false);
        }
      })();

      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch {
      setApiError('Could not load hotel prices. Please try again.');
      setLoading(false);
    }
  }, [destination, selectedPlaceId, checkin, checkout, adults, childCount, rooms, minStars, childrenAges]);

  /**
   * Strip cell click: shift check-in / check-out (stay-length preserved
   * by the API) and re-run the LiteAPI search. Pushes the new dates to
   * the URL so back/forward navigation is intact.
   */
  const handleDateStripSelect = useCallback((option: MatrixOption) => {
    const meta = option.metadata as { checkin: string; checkout: string } | undefined;
    if (!meta) return;
    setCheckin(meta.checkin);
    setCheckout(meta.checkout);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('checkin', meta.checkin);
      url.searchParams.set('checkout', meta.checkout);
      window.history.pushState({}, '', url.toString());
    } catch {}
    setDateShiftTrigger(t => t + 1);
  }, []);

  // Re-run the hotel search after a strip click once state has committed.
  useEffect(() => {
    if (dateShiftTrigger === 0) return;
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateShiftTrigger]);

  // Back / forward button support. The strip uses pushState so React
  // state doesn't auto-rehydrate — this listener reads the URL on
  // popstate and re-runs the search.
  useEffect(() => {
    const onPop = () => {
      const p = new URLSearchParams(window.location.search);
      const cin = p.get('checkin') || '';
      const cout = p.get('checkout') || '';
      if (cin) setCheckin(cin);
      if (cout) setCheckout(cout);
      setDateShiftTrigger(t => t + 1);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Auto-search ONLY when the URL itself carries the search params (i.e.
  // a shareable link like /hotels?destination=Belek&checkin=...&checkout=...).
  // Sticky-restored values must NOT trigger an auto-search — the visitor
  // should be the one to tap Search, otherwise we get the "page loads,
  // results appear unbidden, user feels things are happening to them"
  // problem the 2026-04-27 Clarity recording exposed.
  const autoSearched = useRef(false);
  useEffect(() => {
    if (autoSearched.current) return;
    if (!destination || !checkin || !checkout) return;
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams(window.location.search);
    const urlHasFullSearch =
      (p.get('destination') || p.get('city')) && p.get('checkin') && p.get('checkout');
    if (!urlHasFullSearch) return;
    autoSearched.current = true;
    handleSearch();
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

  // Candidate airports for the searched metro. Each card picks its own
  // nearest from this set — so London results mix LHR/LGW/STN/LTN labels.
  const airports = findCandidateAirports(searchedDest);

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
    // Direct-bookable only (2026-04-28). LiteAPI rows have an offerId we
    // can take through our own checkout — those earn us full commission.
    // Curated/non-bookable rows used to fall back to Trip.com but the
    // multi-CTA was confusing trust and diluting the "Book Now" message.
    if (!h.bookable || !h.offerId) return false;
    if (refundableOnly && h.refundable !== true) return false;
    if (boardFilter === 'any') return true;
    // Check top-level boardType AND all boardOptions
    const allBoards: string[] = [];
    if (h.boardType) allBoards.push(h.boardType.toLowerCase());
    if (h.boardOptions) h.boardOptions.forEach((o: any) => { if (o.boardType) allBoards.push(o.boardType.toLowerCase()); });
    if (allBoards.length === 0) return false;
    if (boardFilter === 'breakfast') return allBoards.some(b => b.includes('breakfast'));
    return allBoards.some(b => b.includes(boardFilter));
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

  // Build the href for a hotel's detail page, carrying search context.
  // Curated (non-LiteAPI) cards have no internal detail page — route them to
  // Trip.com instead so the click still lands on a working partner page.
  const buildDetailHref = (h: HotelResult) => {
    const idStr = String(h.id);
    const isInternal = idStr.startsWith('la_');
    if (!isInternal) {
      // Non-LiteAPI (curated / unquarantined legacy) → send to Trip.com via
      // the interstitial redirect so affiliate tracking + UX stays consistent.
      return redirectUrl(
        buildTripcomUrl(searchedDest, checkin, checkout, adults, tripCityId, childCount, childrenAges),
        'Trip.com',
        searchedDest,
        'hotels',
      );
    }
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
    return `/hotels/${encodeURIComponent(idStr)}?${qp.toString()}`;
  };

  return (
    <>
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
            <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5 text-center">Destination</label>
            <DestinationPicker value={destination} onChange={setDestination} onPlaceSelect={(p) => setSelectedPlaceId(p?.id || null)} />
          </div>

          {/* Dates + Guests */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5 text-center">Calendar</label>
              <DateRangePicker
                start={checkin}
                end={checkout}
                minDate={today}
                accent="orange"
                startWord="check-in"
                endWord="check-out"
                onChange={({ start: ci, end: co }) => { setCheckin(ci); setCheckout(co); }}
              />
            </div>
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5 text-center">Guests &amp; Rooms</label>
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
          <p className="text-center text-[11px] leading-snug text-[#8E95A9] font-semibold mt-1.5">Book directly — no redirects, no hidden fees, best price guaranteed</p>
        </div>

      {/* ── Hot Deals ── */}
      {!searched && !loading && (
        <section
          className="pt-4 md:pt-10 pb-6 px-5"
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
                const isBooking = hotel ? dealBookingId === hotel.id : false;
                return (
                  <a
                    key={deal.city}
                    href={dealHref}
                    onClick={hotel ? (e) => handleDealClick(e, deal, hotel, dealHref) : undefined}
                    aria-busy={isBooking}
                    className="group bg-white border border-[#E8ECF4] rounded-2xl overflow-hidden hover:shadow-[0_8px_30px_rgba(245,158,11,0.12)] hover:border-orange-200 transition-all text-left relative"
                  >
                    {isBooking && (
                      <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-sm flex items-center justify-center">
                        <span className="inline-flex items-center gap-2 text-[.72rem] font-black text-orange-600">
                          <span className="inline-block w-3.5 h-3.5 border-2 border-orange-300 border-t-orange-600 rounded-full animate-spin" />
                          Starting booking…
                        </span>
                      </div>
                    )}
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
                  onClick={(e) => handleDealClick(
                    e,
                    bestDeal,
                    h,
                    `/hotels/${encodeURIComponent(h.id)}?checkin=${bestDeal.checkin}&checkout=${bestDeal.checkout}&adults=2&children=0&rooms=1&city=${encodeURIComponent(bestDeal.city)}&price=${h.totalPrice}&currency=GBP${h.offerId ? `&offerId=${encodeURIComponent(h.offerId)}` : ''}${h.boardType ? `&board=${encodeURIComponent(h.boardType)}` : ''}${h.refundable ? '&refundable=1' : '&refundable=0'}`,
                  )}
                  className="flex-shrink-0 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-poppins font-black text-[.85rem] px-6 py-3 rounded-xl transition-all shadow-[0_4px_20px_rgba(245,158,11,0.3)]"
                >
                  {dealBookingId === h.id ? 'Starting…' : 'View Deal →'}
                </a>
              </div>
            );
          })()}
          </div>
        </section>
      )}

      {/* ── Loading ──
          Wrapped with the resultsRef so the handleSearch scrollIntoView
          lands on the loader the moment the search fires. Mirror of the
          fix on /flights. */}
      {loading && (
        <div ref={resultsRef}>
          <LoadingState dest={destination} />
        </div>
      )}

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

          {/* Date Matrix Strip — D−3 … D+3 check-in, same-number-of-nights.
              Powered by /api/hotels?mode=datestrip → Hotellook cache.json
              (free, cached 24h in KV). Does NOT touch LiteAPI — 7 extra
              availability calls per search would be prohibitive on cost.

              Fill-or-kill coverage gate (BACKLOG B1, 2026-04-21): Hotellook's
              cache is sparse for a lot of queries — sometimes only the
              selected cell has a price and the other six render as "—".
              Half-filled strips look worse than no strip (user sentiment),
              so we hide the component unless at least 6 of the 7 cells
              have a real price. On cities where coverage is good the
              strip still shows; elsewhere it disappears silently. */}
          {(() => {
            if (dateStripLoading) {
              return (
                <DateMatrixStrip
                  type="hotels"
                  options={dateStrip}
                  loading={dateStripLoading}
                  onSelect={handleDateStripSelect}
                  nights={getNights()}
                />
              );
            }
            if (dateStrip.length === 0) return null;
            const filled = dateStrip.filter(c => c.price !== null).length;
            if (filled < 6) return null;
            return (
              <DateMatrixStrip
                type="hotels"
                options={dateStrip}
                loading={false}
                onSelect={handleDateStripSelect}
                nights={getNights()}
              />
            );
          })()}

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

          {/* ── Map + List ────────────────────────────────────────────────
              - viewMode === 'list'  → list only, any width (current behaviour)
              - viewMode === 'map'   → mobile/tablet: map only (toggle back for list)
                                     → desktop (lg+): side-by-side, sticky map
              We reuse a single card-render helper so both branches stay in sync. */}
          {hotels!.length > 0 && (() => {
            const mapHotels = sortedHotels!
              .filter((h) => typeof h.lat === 'number' && typeof h.lng === 'number')
              .map((h) => ({
                id: h.id,
                name: h.name,
                stars: h.stars,
                pricePerNight: h.pricePerNight,
                currency: h.currency || 'GBP',
                lat: h.lat as number,
                lng: h.lng as number,
                href: buildDetailHref(h),
              }));
            const renderCards = (compact: boolean) => (
              <div className={compact ? 'space-y-3' : 'space-y-3'}>
                {sortedHotels!.map((h, i) => (
                  <HotelCardWrapper
                    key={h.id || i}
                    hotel={h}
                    index={i}
                    isCheapest={i === 0}
                    nights={nights}
                    adults={adults}
                    children={childCount}
                    childrenAges={childrenAges}
                    checkin={checkin}
                    checkout={checkout}
                    searchedDest={searchedDest}
                    tripCityId={tripCityId}
                    buildDetailHref={buildDetailHref}
                    setScoutHotel={setScoutHotel}
                    priceView={priceView}
                    cityCentre={cityCentre}
                    airports={airports}
                    isCompared={compareIds.includes(h.id)}
                    compareFull={compareIds.length >= 3}
                    onToggleCompare={() => toggleCompare(h.id)}
                    isActive={activeHotelId != null && String(activeHotelId) === String(h.id)}
                    onHover={(hovered) => setActiveHotelId(hovered ? h.id : null)}
                  />
                ))}
              </div>
            );

            // List-only view — unchanged max-width
            if (viewMode === 'list') {
              return (
                <section className="max-w-[1000px] mx-auto px-5 pb-6">
                  {renderCards(false)}
                </section>
              );
            }

            // Map view — split on desktop, full-width map on mobile
            if (viewMode === 'map' && cityCentre && mapHotels.length > 0) {
              return (
                <section className="max-w-[1400px] mx-auto px-5 pb-6">
                  {/* Desktop split */}
                  <div className="hidden lg:grid lg:grid-cols-[minmax(0,1fr)_460px] gap-5">
                    <div className="min-w-0">
                      {renderCards(true)}
                    </div>
                    <div className="sticky top-28 self-start">
                      <HotelMap
                        centerLat={cityCentre.lat}
                        centerLng={cityCentre.lng}
                        hotels={mapHotels}
                        activeHotelId={activeHotelId}
                        onPinHover={(id) => setActiveHotelId(id)}
                        onPinClick={(id) => {
                          setActiveHotelId(id);
                          const el = document.getElementById(`hotel-card-${id}`);
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                        height="h-[calc(100vh-7rem)]"
                      />
                    </div>
                  </div>
                  {/* Mobile / tablet — full-width map (toggle back to list to see cards) */}
                  <div className="lg:hidden">
                    <HotelMap
                      centerLat={cityCentre.lat}
                      centerLng={cityCentre.lng}
                      hotels={mapHotels}
                      activeHotelId={activeHotelId}
                      onPinClick={(id) => {
                        setActiveHotelId(id);
                      }}
                    />
                  </div>
                </section>
              );
            }

            // Fallback — map requested but no coords; render list.
            return (
              <section className="max-w-[1000px] mx-auto px-5 pb-6">
                {renderCards(false)}
              </section>
            );
          })()}

          {/* Empty state — only renders inside the {searched && !loading
              && hotels !== null} branch above, so we know a search has run
              and the response is back. Covers two scenarios that look
              identical to the user:
              1. API returned 0 hotels at all
              2. API returned hotels but none were direct-bookable
              After dropping Trip.com/Expedia fallbacks (2026-04-28) we'd
              otherwise show a blank gap before the cross-sell tiles. */}
          {(hotels!.length === 0 || sortedHotels!.length === 0) && (
            <section className="max-w-[600px] mx-auto px-6 py-12">
              <div className="flex flex-col items-center justify-center text-center bg-white border border-[#E8ECF4] rounded-3xl px-6 py-10 shadow-[0_8px_30px_rgba(10,22,40,0.08)]">
                <div className="text-5xl mb-4" aria-hidden>🏨</div>
                <h3 className="font-poppins font-black text-[1.2rem] text-[#1A1D2B] mb-2">
                  No live rates right now
                </h3>
                <p className="text-[.85rem] text-[#5C6378] font-semibold max-w-sm mb-6 leading-relaxed">
                  We couldn&apos;t find bookable rooms for those dates. Try adjusting your dates or guests, or search a nearby destination.
                </p>
                <div className="flex flex-col gap-3 w-full max-w-xs">
                  <button
                    type="button"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="w-full py-3 rounded-2xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-poppins font-bold text-[.85rem] transition-all shadow-[0_4px_14px_rgba(0,102,255,0.25)]"
                  >
                    🔍 Adjust Search
                  </button>
                  <a
                    href="/packages"
                    className="w-full py-3 rounded-2xl border border-[#E8ECF4] hover:bg-[#F8FAFC] text-[#1A1D2B] font-poppins font-semibold text-[.85rem] text-center transition-all"
                  >
                    📦 Try Holiday Packages Instead
                  </a>
                </div>
              </div>
            </section>
          )}

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
          defaultTab={chooseDefaultTab({
            adults,
            children: childCount,
            vibeTags: vibeTagsForSearchedCity(searchedDest),
          })}
        />
      )}

      {/* Sticky Compare Tray */}
      {compareIds.length > 0 && (
        <CompareTray
          hotels={(hotels || []).filter(h => compareIds.includes(h.id))}
          nights={nights}
          priceView={priceView}
          adults={adults}
          childCount={childCount}
          onRemove={(id) => setCompareIds(prev => prev.filter(x => x !== id))}
          onClear={() => setCompareIds([])}
          onOpen={() => setCompareOpen(true)}
        />
      )}

      {/* Side-by-Side Compare Modal */}
      {compareOpen && (
        <CompareModal
          hotels={(hotels || []).filter(h => compareIds.includes(h.id))}
          nights={nights}
          priceView={priceView}
          adults={adults}
          childCount={childCount}
          buildDetailHref={buildDetailHref}
          onClose={() => setCompareOpen(false)}
          onRemove={(id) => {
            setCompareIds(prev => {
              const next = prev.filter(x => x !== id);
              if (next.length === 0) setCompareOpen(false);
              return next;
            });
          }}
        />
      )}

    </>
  );
}

export default HotelsContent;
