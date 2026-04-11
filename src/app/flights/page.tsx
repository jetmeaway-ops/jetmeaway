'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { redirectUrl } from '@/lib/redirect';

/* ═══════════════════════════════════════════════════════════════════════════
   AIRPORTS — 20 UK departures + 250+ worldwide destinations
   ═══════════════════════════════════════════════════════════════════════════ */

const UK_AIRPORTS = [
  { code: 'LHR', name: 'London Heathrow', city: 'London' },
  { code: 'LGW', name: 'London Gatwick', city: 'London' },
  { code: 'STN', name: 'London Stansted', city: 'London' },
  { code: 'LTN', name: 'London Luton', city: 'London' },
  { code: 'SEN', name: 'London Southend', city: 'London' },
  { code: 'LCY', name: 'London City', city: 'London' },
  { code: 'MAN', name: 'Manchester', city: 'Manchester' },
  { code: 'BHX', name: 'Birmingham', city: 'Birmingham' },
  { code: 'EDI', name: 'Edinburgh', city: 'Edinburgh' },
  { code: 'GLA', name: 'Glasgow', city: 'Glasgow' },
  { code: 'BRS', name: 'Bristol', city: 'Bristol' },
  { code: 'LPL', name: 'Liverpool', city: 'Liverpool' },
  { code: 'NCL', name: 'Newcastle', city: 'Newcastle' },
  { code: 'LBA', name: 'Leeds Bradford', city: 'Leeds' },
  { code: 'EMA', name: 'East Midlands', city: 'Nottingham' },
  { code: 'BFS', name: 'Belfast International', city: 'Belfast' },
  { code: 'CWL', name: 'Cardiff', city: 'Cardiff' },
  { code: 'ABZ', name: 'Aberdeen', city: 'Aberdeen' },
  { code: 'SOU', name: 'Southampton', city: 'Southampton' },
  { code: 'EXT', name: 'Exeter', city: 'Exeter' },
];

const DESTINATIONS = [
  // Spain & Canaries
  { code: 'BCN', city: 'Barcelona', country: 'Spain', flag: '🇪🇸' },
  { code: 'AGP', city: 'Malaga', country: 'Spain', flag: '🇪🇸' },
  { code: 'TFS', city: 'Tenerife', country: 'Spain', flag: '🇪🇸' },
  { code: 'PMI', city: 'Palma', country: 'Spain', flag: '🇪🇸' },
  { code: 'ALC', city: 'Alicante', country: 'Spain', flag: '🇪🇸' },
  { code: 'ACE', city: 'Lanzarote', country: 'Spain', flag: '🇪🇸' },
  { code: 'FUE', city: 'Fuerteventura', country: 'Spain', flag: '🇪🇸' },
  { code: 'LPA', city: 'Gran Canaria', country: 'Spain', flag: '🇪🇸' },
  { code: 'MAD', city: 'Madrid', country: 'Spain', flag: '🇪🇸' },
  { code: 'SVQ', city: 'Seville', country: 'Spain', flag: '🇪🇸' },
  { code: 'VLC', city: 'Valencia', country: 'Spain', flag: '🇪🇸' },
  { code: 'IBZ', city: 'Ibiza', country: 'Spain', flag: '🇪🇸' },
  { code: 'BIO', city: 'Bilbao', country: 'Spain', flag: '🇪🇸' },
  // Portugal
  { code: 'FAO', city: 'Faro', country: 'Portugal', flag: '🇵🇹' },
  { code: 'LIS', city: 'Lisbon', country: 'Portugal', flag: '🇵🇹' },
  { code: 'OPO', city: 'Porto', country: 'Portugal', flag: '🇵🇹' },
  { code: 'FNC', city: 'Madeira', country: 'Portugal', flag: '🇵🇹' },
  // France
  { code: 'CDG', city: 'Paris', country: 'France', flag: '🇫🇷' },
  { code: 'NCE', city: 'Nice', country: 'France', flag: '🇫🇷' },
  { code: 'LYS', city: 'Lyon', country: 'France', flag: '🇫🇷' },
  { code: 'MRS', city: 'Marseille', country: 'France', flag: '🇫🇷' },
  { code: 'BOD', city: 'Bordeaux', country: 'France', flag: '🇫🇷' },
  { code: 'TLS', city: 'Toulouse', country: 'France', flag: '🇫🇷' },
  // Netherlands & Belgium
  { code: 'AMS', city: 'Amsterdam', country: 'Netherlands', flag: '🇳🇱' },
  { code: 'BRU', city: 'Brussels', country: 'Belgium', flag: '🇧🇪' },
  // Germany
  { code: 'BER', city: 'Berlin', country: 'Germany', flag: '🇩🇪' },
  { code: 'MUC', city: 'Munich', country: 'Germany', flag: '🇩🇪' },
  { code: 'FRA', city: 'Frankfurt', country: 'Germany', flag: '🇩🇪' },
  { code: 'HAM', city: 'Hamburg', country: 'Germany', flag: '🇩🇪' },
  { code: 'DUS', city: 'Dusseldorf', country: 'Germany', flag: '🇩🇪' },
  // Austria & Switzerland
  { code: 'VIE', city: 'Vienna', country: 'Austria', flag: '🇦🇹' },
  { code: 'SZG', city: 'Salzburg', country: 'Austria', flag: '🇦🇹' },
  { code: 'ZRH', city: 'Zurich', country: 'Switzerland', flag: '🇨🇭' },
  { code: 'GVA', city: 'Geneva', country: 'Switzerland', flag: '🇨🇭' },
  // Italy
  { code: 'FCO', city: 'Rome', country: 'Italy', flag: '🇮🇹' },
  { code: 'MXP', city: 'Milan', country: 'Italy', flag: '🇮🇹' },
  { code: 'VCE', city: 'Venice', country: 'Italy', flag: '🇮🇹' },
  { code: 'FLR', city: 'Florence', country: 'Italy', flag: '🇮🇹' },
  { code: 'NAP', city: 'Naples', country: 'Italy', flag: '🇮🇹' },
  { code: 'BLQ', city: 'Bologna', country: 'Italy', flag: '🇮🇹' },
  { code: 'CTA', city: 'Sicily', country: 'Italy', flag: '🇮🇹' },
  { code: 'CAG', city: 'Sardinia', country: 'Italy', flag: '🇮🇹' },
  // Greece
  { code: 'ATH', city: 'Athens', country: 'Greece', flag: '🇬🇷' },
  { code: 'HER', city: 'Crete', country: 'Greece', flag: '🇬🇷' },
  { code: 'CFU', city: 'Corfu', country: 'Greece', flag: '🇬🇷' },
  { code: 'RHO', city: 'Rhodes', country: 'Greece', flag: '🇬🇷' },
  { code: 'JTR', city: 'Santorini', country: 'Greece', flag: '🇬🇷' },
  { code: 'JMK', city: 'Mykonos', country: 'Greece', flag: '🇬🇷' },
  { code: 'ZTH', city: 'Zakynthos', country: 'Greece', flag: '🇬🇷' },
  { code: 'KGS', city: 'Kos', country: 'Greece', flag: '🇬🇷' },
  { code: 'EFL', city: 'Kefalonia', country: 'Greece', flag: '🇬🇷' },
  { code: 'SKG', city: 'Thessaloniki', country: 'Greece', flag: '🇬🇷' },
  // Croatia
  { code: 'DBV', city: 'Dubrovnik', country: 'Croatia', flag: '🇭🇷' },
  { code: 'SPU', city: 'Split', country: 'Croatia', flag: '🇭🇷' },
  { code: 'ZAG', city: 'Zagreb', country: 'Croatia', flag: '🇭🇷' },
  { code: 'ZAD', city: 'Zadar', country: 'Croatia', flag: '🇭🇷' },
  // Turkey
  { code: 'AYT', city: 'Antalya', country: 'Turkey', flag: '🇹🇷' },
  { code: 'DLM', city: 'Dalaman', country: 'Turkey', flag: '🇹🇷' },
  { code: 'BJV', city: 'Bodrum', country: 'Turkey', flag: '🇹🇷' },
  { code: 'IST', city: 'Istanbul', country: 'Turkey', flag: '🇹🇷' },
  { code: 'ADB', city: 'Izmir', country: 'Turkey', flag: '🇹🇷' },
  // Scandinavia & Nordics
  { code: 'CPH', city: 'Copenhagen', country: 'Denmark', flag: '🇩🇰' },
  { code: 'ARN', city: 'Stockholm', country: 'Sweden', flag: '🇸🇪' },
  { code: 'OSL', city: 'Oslo', country: 'Norway', flag: '🇳🇴' },
  { code: 'HEL', city: 'Helsinki', country: 'Finland', flag: '🇫🇮' },
  { code: 'KEF', city: 'Reykjavik', country: 'Iceland', flag: '🇮🇸' },
  // Eastern Europe
  { code: 'PRG', city: 'Prague', country: 'Czechia', flag: '🇨🇿' },
  { code: 'BUD', city: 'Budapest', country: 'Hungary', flag: '🇭🇺' },
  { code: 'WAW', city: 'Warsaw', country: 'Poland', flag: '🇵🇱' },
  { code: 'KRK', city: 'Krakow', country: 'Poland', flag: '🇵🇱' },
  { code: 'OTP', city: 'Bucharest', country: 'Romania', flag: '🇷🇴' },
  { code: 'SOF', city: 'Sofia', country: 'Bulgaria', flag: '🇧🇬' },
  { code: 'TLL', city: 'Tallinn', country: 'Estonia', flag: '🇪🇪' },
  { code: 'RIX', city: 'Riga', country: 'Latvia', flag: '🇱🇻' },
  // Cyprus & Malta
  { code: 'LCA', city: 'Larnaca', country: 'Cyprus', flag: '🇨🇾' },
  { code: 'PFO', city: 'Paphos', country: 'Cyprus', flag: '🇨🇾' },
  { code: 'MLA', city: 'Malta', country: 'Malta', flag: '🇲🇹' },
  // Morocco & North Africa
  { code: 'RAK', city: 'Marrakech', country: 'Morocco', flag: '🇲🇦' },
  { code: 'AGA', city: 'Agadir', country: 'Morocco', flag: '🇲🇦' },
  { code: 'TNG', city: 'Tangier', country: 'Morocco', flag: '🇲🇦' },
  { code: 'TUN', city: 'Tunis', country: 'Tunisia', flag: '🇹🇳' },
  // Egypt
  { code: 'SSH', city: 'Sharm El Sheikh', country: 'Egypt', flag: '🇪🇬' },
  { code: 'HRG', city: 'Hurghada', country: 'Egypt', flag: '🇪🇬' },
  { code: 'CAI', city: 'Cairo', country: 'Egypt', flag: '🇪🇬' },
  { code: 'LXR', city: 'Luxor', country: 'Egypt', flag: '🇪🇬' },
  // Middle East
  { code: 'DXB', city: 'Dubai', country: 'UAE', flag: '🇦🇪' },
  { code: 'AUH', city: 'Abu Dhabi', country: 'UAE', flag: '🇦🇪' },
  { code: 'DOH', city: 'Doha', country: 'Qatar', flag: '🇶🇦' },
  { code: 'AMM', city: 'Amman', country: 'Jordan', flag: '🇯🇴' },
  { code: 'AQJ', city: 'Aqaba', country: 'Jordan', flag: '🇯🇴' },
  { code: 'BEY', city: 'Beirut', country: 'Lebanon', flag: '🇱🇧' },
  { code: 'RUH', city: 'Riyadh', country: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'JED', city: 'Jeddah', country: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'MED', city: 'Medina', country: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'MCT', city: 'Muscat', country: 'Oman', flag: '🇴🇲' },
  { code: 'BAH', city: 'Bahrain', country: 'Bahrain', flag: '🇧🇭' },
  { code: 'KWI', city: 'Kuwait City', country: 'Kuwait', flag: '🇰🇼' },
  // Pakistan
  { code: 'LHE', city: 'Lahore', country: 'Pakistan', flag: '🇵🇰' },
  { code: 'ISB', city: 'Islamabad', country: 'Pakistan', flag: '🇵🇰' },
  { code: 'KHI', city: 'Karachi', country: 'Pakistan', flag: '🇵🇰' },
  { code: 'PEW', city: 'Peshawar', country: 'Pakistan', flag: '🇵🇰' },
  { code: 'LYP', city: 'Faisalabad', country: 'Pakistan', flag: '🇵🇰' },
  { code: 'MUX', city: 'Multan', country: 'Pakistan', flag: '🇵🇰' },
  // India & Sri Lanka
  { code: 'DEL', city: 'Delhi', country: 'India', flag: '🇮🇳' },
  { code: 'BOM', city: 'Mumbai', country: 'India', flag: '🇮🇳' },
  { code: 'GOI', city: 'Goa', country: 'India', flag: '🇮🇳' },
  { code: 'JAI', city: 'Jaipur', country: 'India', flag: '🇮🇳' },
  { code: 'BLR', city: 'Bangalore', country: 'India', flag: '🇮🇳' },
  { code: 'MAA', city: 'Chennai', country: 'India', flag: '🇮🇳' },
  { code: 'HYD', city: 'Hyderabad', country: 'India', flag: '🇮🇳' },
  { code: 'CMB', city: 'Colombo', country: 'Sri Lanka', flag: '🇱🇰' },
  // Southeast Asia
  { code: 'BKK', city: 'Bangkok', country: 'Thailand', flag: '🇹🇭' },
  { code: 'HKT', city: 'Phuket', country: 'Thailand', flag: '🇹🇭' },
  { code: 'CNX', city: 'Chiang Mai', country: 'Thailand', flag: '🇹🇭' },
  { code: 'USM', city: 'Koh Samui', country: 'Thailand', flag: '🇹🇭' },
  { code: 'DPS', city: 'Bali', country: 'Indonesia', flag: '🇮🇩' },
  { code: 'SIN', city: 'Singapore', country: 'Singapore', flag: '🇸🇬' },
  { code: 'KUL', city: 'Kuala Lumpur', country: 'Malaysia', flag: '🇲🇾' },
  { code: 'LGK', city: 'Langkawi', country: 'Malaysia', flag: '🇲🇾' },
  { code: 'HAN', city: 'Hanoi', country: 'Vietnam', flag: '🇻🇳' },
  { code: 'SGN', city: 'Ho Chi Minh City', country: 'Vietnam', flag: '🇻🇳' },
  { code: 'MNL', city: 'Manila', country: 'Philippines', flag: '🇵🇭' },
  { code: 'REP', city: 'Siem Reap', country: 'Cambodia', flag: '🇰🇭' },
  // East Asia
  { code: 'NRT', city: 'Tokyo', country: 'Japan', flag: '🇯🇵' },
  { code: 'KIX', city: 'Osaka', country: 'Japan', flag: '🇯🇵' },
  { code: 'HKG', city: 'Hong Kong', country: 'Hong Kong', flag: '🇭🇰' },
  { code: 'PVG', city: 'Shanghai', country: 'China', flag: '🇨🇳' },
  { code: 'PEK', city: 'Beijing', country: 'China', flag: '🇨🇳' },
  { code: 'ICN', city: 'Seoul', country: 'South Korea', flag: '🇰🇷' },
  { code: 'TPE', city: 'Taipei', country: 'Taiwan', flag: '🇹🇼' },
  // Indian Ocean
  { code: 'MLE', city: 'Maldives', country: 'Maldives', flag: '🇲🇻' },
  { code: 'MRU', city: 'Mauritius', country: 'Mauritius', flag: '🇲🇺' },
  { code: 'SEZ', city: 'Seychelles', country: 'Seychelles', flag: '🇸🇨' },
  { code: 'ZNZ', city: 'Zanzibar', country: 'Tanzania', flag: '🇹🇿' },
  // Oceania
  { code: 'SYD', city: 'Sydney', country: 'Australia', flag: '🇦🇺' },
  { code: 'MEL', city: 'Melbourne', country: 'Australia', flag: '🇦🇺' },
  { code: 'PER', city: 'Perth', country: 'Australia', flag: '🇦🇺' },
  { code: 'AKL', city: 'Auckland', country: 'New Zealand', flag: '🇳🇿' },
  // Africa
  { code: 'CPT', city: 'Cape Town', country: 'South Africa', flag: '🇿🇦' },
  { code: 'JNB', city: 'Johannesburg', country: 'South Africa', flag: '🇿🇦' },
  { code: 'NBO', city: 'Nairobi', country: 'Kenya', flag: '🇰🇪' },
  { code: 'LOS', city: 'Lagos', country: 'Nigeria', flag: '🇳🇬' },
  { code: 'ACC', city: 'Accra', country: 'Ghana', flag: '🇬🇭' },
  { code: 'ADD', city: 'Addis Ababa', country: 'Ethiopia', flag: '🇪🇹' },
  { code: 'DAR', city: 'Dar es Salaam', country: 'Tanzania', flag: '🇹🇿' },
  // Caribbean
  { code: 'BGI', city: 'Barbados', country: 'Barbados', flag: '🇧🇧' },
  { code: 'MBJ', city: 'Jamaica', country: 'Jamaica', flag: '🇯🇲' },
  { code: 'UVF', city: 'St Lucia', country: 'St Lucia', flag: '🇱🇨' },
  { code: 'PUJ', city: 'Punta Cana', country: 'Dominican Republic', flag: '🇩🇴' },
  { code: 'ANU', city: 'Antigua', country: 'Antigua', flag: '🇦🇬' },
  { code: 'HAV', city: 'Havana', country: 'Cuba', flag: '🇨🇺' },
  // Americas
  { code: 'JFK', city: 'New York', country: 'USA', flag: '🇺🇸' },
  { code: 'LAX', city: 'Los Angeles', country: 'USA', flag: '🇺🇸' },
  { code: 'MCO', city: 'Orlando', country: 'USA', flag: '🇺🇸' },
  { code: 'MIA', city: 'Miami', country: 'USA', flag: '🇺🇸' },
  { code: 'LAS', city: 'Las Vegas', country: 'USA', flag: '🇺🇸' },
  { code: 'SFO', city: 'San Francisco', country: 'USA', flag: '🇺🇸' },
  { code: 'ORD', city: 'Chicago', country: 'USA', flag: '🇺🇸' },
  { code: 'BOS', city: 'Boston', country: 'USA', flag: '🇺🇸' },
  { code: 'IAD', city: 'Washington DC', country: 'USA', flag: '🇺🇸' },
  { code: 'CUN', city: 'Cancun', country: 'Mexico', flag: '🇲🇽' },
  { code: 'MEX', city: 'Mexico City', country: 'Mexico', flag: '🇲🇽' },
  { code: 'YYZ', city: 'Toronto', country: 'Canada', flag: '🇨🇦' },
  { code: 'YVR', city: 'Vancouver', country: 'Canada', flag: '🇨🇦' },
  { code: 'YUL', city: 'Montreal', country: 'Canada', flag: '🇨🇦' },
  { code: 'GIG', city: 'Rio de Janeiro', country: 'Brazil', flag: '🇧🇷' },
  { code: 'GRU', city: 'Sao Paulo', country: 'Brazil', flag: '🇧🇷' },
  { code: 'EZE', city: 'Buenos Aires', country: 'Argentina', flag: '🇦🇷' },
  { code: 'LIM', city: 'Lima', country: 'Peru', flag: '🇵🇪' },
  { code: 'BOG', city: 'Bogota', country: 'Colombia', flag: '🇨🇴' },
  { code: 'CTG', city: 'Cartagena', country: 'Colombia', flag: '🇨🇴' },
  // Caucasus & Central Asia
  { code: 'GYD', city: 'Baku', country: 'Azerbaijan', flag: '🇦🇿' },
  { code: 'EVN', city: 'Yerevan', country: 'Armenia', flag: '🇦🇲' },
  { code: 'TBS', city: 'Tbilisi', country: 'Georgia', flag: '🇬🇪' },
  { code: 'ASB', city: 'Ashgabat', country: 'Turkmenistan', flag: '🇹🇲' },
  { code: 'TAS', city: 'Tashkent', country: 'Uzbekistan', flag: '🇺🇿' },
  { code: 'ALA', city: 'Almaty', country: 'Kazakhstan', flag: '🇰🇿' },
  { code: 'NQZ', city: 'Astana', country: 'Kazakhstan', flag: '🇰🇿' },
  { code: 'FRU', city: 'Bishkek', country: 'Kyrgyzstan', flag: '🇰🇬' },
  { code: 'DYU', city: 'Dushanbe', country: 'Tajikistan', flag: '🇹🇯' },
];

type UKAirport = typeof UK_AIRPORTS[number];
type Dest = typeof DESTINATIONS[number];

/* ═══════════════════════════════════════════════════════════════════════════
   AIRLINE NAMES (for display)
   ═══════════════════════════════════════════════════════════════════════════ */

const AIRLINE_NAMES: Record<string, string> = {
  FR: 'Ryanair', U2: 'easyJet', BA: 'British Airways', W6: 'Wizz Air',
  BY: 'TUI', LS: 'Jet2', LH: 'Lufthansa', EW: 'Eurowings',
  VY: 'Vueling', EI: 'Aer Lingus', KL: 'KLM', AF: 'Air France',
  TK: 'Turkish Airlines', EK: 'Emirates', QR: 'Qatar Airways',
  WN: 'Southwest', AA: 'American Airlines', UA: 'United Airlines',
  DL: 'Delta', W9: 'Wizz Air UK', D8: 'Norwegian', DY: 'Norwegian',
  PC: 'Pegasus', SQ: 'Singapore Airlines', VS: 'Virgin Atlantic',
  IB: 'Iberia', TP: 'TAP Portugal', SK: 'SAS', AY: 'Finnair',
  OS: 'Austrian', LX: 'Swiss', SN: 'Brussels Airlines',
};

/* ═══════════════════════════════════════════════════════════════════════════
   PROVIDER DEEP LINK BUILDERS
   ═══════════════════════════════════════════════════════════════════════════ */

function buildAviasalesUrl(o: string, d: string, dep: string, ret: string | null, adults: number): string {
  const p = dep.split('-');
  const ddmm = p[2] + p[1];
  let path = `${o}${ddmm}${d}`;
  if (ret) { const rp = ret.split('-'); path += rp[2] + rp[1]; }
  path += String(adults);
  return `https://tp.media/r?marker=714449&trs=512633&p=4114&u=${encodeURIComponent(`https://www.aviasales.com/search/${path}`)}`;
}

function buildTripUrl(o: string, d: string, dep: string, ret: string | null, adults: number): string {
  const oL = o.toLowerCase();
  const dL = d.toLowerCase();
  let u = `https://www.trip.com/flights/${oL}-to-${dL}/tickets-${o}-${d}?dcity=${o}&acity=${d}&ddate=${dep}&adult=${adults}&Allianceid=8023009&SID=303363796&trip_sub3=D15021113`;
  if (ret) u += `&rdate=${ret}`;
  return u;
}

function buildSkyscannerUrl(o: string, d: string, dep: string, ret: string | null, adults: number): string {
  const fmt = (date: string) => date.slice(2).replace(/-/g, ''); // YYMMDD
  let u = `https://www.skyscanner.net/transport/flights/${o}/${d}/${fmt(dep)}/`;
  if (ret) u += `${fmt(ret)}/`;
  u += `?adultsv2=${adults}&cabinclass=economy&rtn=${ret ? '1' : '0'}`;
  return u;
}

function buildExpediaUrl(o: string, d: string, dep: string, ret: string | null, adults: number): string {
  // Expedia /Flights-Search expects dates as MM/DD/YYYY (not ISO) and the
  // mode=search + full passengers struct, otherwise it lands on a "wrong turn"
  // error page. Verified working in real browser 2026-04-11.
  const toUS = (iso: string) => {
    const [y, m, d2] = iso.split('-');
    return `${m}/${d2}/${y}`;
  };
  const trip = ret ? 'roundtrip' : 'oneway';
  const passengers = `adults:${adults},children:0,seniors:0,infantinlap:Y`;
  let u = `https://www.expedia.co.uk/Flights-Search?mode=search&trip=${trip}&leg1=from:${o},to:${d},departure:${toUS(dep)}TANYT`;
  if (ret) u += `&leg2=from:${d},to:${o},departure:${toUS(ret)}TANYT`;
  u += `&passengers=${passengers}&affcid=clbU3QK`;
  return u;
}


type ProviderInfo = {
  name: string;
  logo: string;
  getUrl: (o: string, d: string, dep: string, ret: string | null, adults: number, fromCity: string, toCity: string) => string;
};

const PROVIDERS: ProviderInfo[] = [
  { name: 'Aviasales', logo: '✈', getUrl: (o, d, dep, ret, a) => buildAviasalesUrl(o, d, dep, ret, a) },
  { name: 'Trip.com', logo: '🗺', getUrl: (o, d, dep, ret, a) => buildTripUrl(o, d, dep, ret, a) },
  { name: 'Skyscanner', logo: '🔍', getUrl: (o, d, dep, ret, a) => buildSkyscannerUrl(o, d, dep, ret, a) },
  { name: 'Expedia', logo: '🌍', getUrl: (o, d, dep, ret, a) => buildExpediaUrl(o, d, dep, ret, a) },
];

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

type FlightResult = {
  airline: string;
  airlineCode: string;
  price: number;
  basePrice?: number;
  currency: string;
  stops: string;
  transfers: number;
  duration_to: number;
  duration_back: number;
  departure_at: string | null;
  arrival_at?: string | null;
  return_at: string | null;
  flight_number: string | null;
  offer_id?: string | null;
  source?: 'duffel' | 'travelpayouts';
  link: string | null;
};

type CalendarDay = {
  depart_date: string;
  return_date?: string;
  value: number;
  number_of_changes: number;
  duration: number;
  origin: string;
  destination: string;
};

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

function AutocompleteFrom({ value, onChange, initialCode }: {
  value: string;
  onChange: (code: string, name: string) => void;
  initialCode: string;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<UKAirport | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  useEffect(() => {
    if (!initialCode) return;
    const ap = UK_AIRPORTS.find(a => a.code === initialCode.toUpperCase());
    if (ap && (!chosen || chosen.code !== ap.code)) {
      setQ(`${ap.name} (${ap.code})`);
      setChosen(ap);
      onChangeRef.current(ap.code, ap.city);
    }
  }, [initialCode]);

  const filtered = q.length >= 1
    ? UK_AIRPORTS.filter(a =>
      a.code.toLowerCase().includes(q.toLowerCase()) ||
      a.name.toLowerCase().includes(q.toLowerCase()) ||
      a.city.toLowerCase().includes(q.toLowerCase())
    ).slice(0, 8)
    : UK_AIRPORTS;

  return (
    <div ref={ref} className="relative">
      <input type="text" placeholder="City or airport — e.g. Manchester, MAN" value={q} autoComplete="off"
        onChange={e => { setQ(e.target.value); setChosen(null); onChange('', ''); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className="w-full px-4 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.9rem] font-semibold text-[#1A1D2B] outline-none focus:border-[#0066FF] focus:bg-white transition-all placeholder:text-[#B0B8CC]" />
      {chosen && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <span className="text-[.7rem] font-black text-[#0066FF] bg-blue-50 px-2 py-0.5 rounded-md">{chosen.code}</span>
        </div>
      )}
      {open && (
        <ul className="absolute z-50 w-full mt-1.5 bg-white border border-[#E8ECF4] rounded-2xl shadow-2xl overflow-auto max-h-64">
          {filtered.map(a => (
            <li key={a.code}
              onMouseDown={() => { setQ(`${a.name} (${a.code})`); setChosen(a); onChange(a.code, a.city); setOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors border-b border-[#F1F3F7] last:border-0 ${chosen?.code === a.code ? 'bg-blue-50' : ''}`}>
              <span className="font-black text-[.75rem] text-[#0066FF] w-10 flex-shrink-0 bg-blue-50 px-1.5 py-0.5 rounded text-center">{a.code}</span>
              <span className="font-poppins font-bold text-[.83rem] text-[#1A1D2B]">{a.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AutocompleteTo({ value, onChange, initialCode }: {
  value: string;
  onChange: (code: string, city: string) => void;
  initialCode: string;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<Dest | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  useEffect(() => {
    if (!initialCode) return;
    const d = DESTINATIONS.find(d => d.code === initialCode.toUpperCase());
    if (d && (!chosen || chosen.code !== d.code)) {
      setQ(`${d.city} (${d.code})`);
      setChosen(d);
      onChangeRef.current(d.code, d.city);
    }
  }, [initialCode]);

  // Sync when value changes externally (e.g. from Hot Deals click)
  useEffect(() => {
    if (!value) return;
    const d = DESTINATIONS.find(d => d.code === value.toUpperCase());
    if (d && (!chosen || chosen.code !== d.code)) {
      setQ(`${d.city} (${d.code})`);
      setChosen(d);
    }
  }, [value]);

  const lq = q.toLowerCase();
  const filtered = q.length >= 1
    ? DESTINATIONS.filter(d =>
      d.city.toLowerCase().includes(lq) ||
      d.country.toLowerCase().includes(lq) ||
      d.code.toLowerCase().startsWith(lq)
    ).slice(0, 8)
    : DESTINATIONS.slice(0, 10);

  return (
    <div ref={ref} className="relative">
      <input type="text" placeholder="City or airport — e.g. Barcelona, BCN" value={q} autoComplete="off"
        onChange={e => { setQ(e.target.value); setChosen(null); onChange('', ''); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className="w-full px-4 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.9rem] font-semibold text-[#1A1D2B] outline-none focus:border-[#0066FF] focus:bg-white transition-all placeholder:text-[#B0B8CC]" />
      {chosen && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <span className="text-[.7rem] font-black text-[#0066FF] bg-blue-50 px-2 py-0.5 rounded-md">{chosen.code}</span>
        </div>
      )}
      {open && (
        <ul className="absolute z-50 w-full mt-1.5 bg-white border border-[#E8ECF4] rounded-2xl shadow-2xl overflow-auto max-h-64">
          {filtered.map(d => (
            <li key={d.code}
              onMouseDown={() => { setQ(`${d.city} (${d.code})`); setChosen(d); onChange(d.code, d.city); setOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors border-b border-[#F1F3F7] last:border-0 ${chosen?.code === d.code ? 'bg-blue-50' : ''}`}>
              <span className="text-xl">{d.flag}</span>
              <div className="flex-1">
                <span className="font-poppins font-bold text-[.85rem] text-[#1A1D2B]">{d.city}</span>
                <span className="text-[.72rem] text-[#8E95A9] ml-1.5">{d.country}</span>
              </div>
              <span className="font-mono text-[.68rem] font-bold text-[#8E95A9]">{d.code}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PaxRow({ label: lbl, sub, val, min, max, onDec, onInc }: {
  label: string; sub: string; val: number; min: number; max: number;
  onDec: () => void; onInc: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#F1F3F7] last:border-0">
      <div>
        <div className="font-poppins font-bold text-[.85rem] text-[#1A1D2B]">{lbl}</div>
        <div className="text-[.7rem] text-[#8E95A9] font-medium">{sub}</div>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={onDec} disabled={val <= min}
          className="w-8 h-8 rounded-full border-2 border-[#E8ECF4] flex items-center justify-center text-[#5C6378] font-bold text-lg hover:border-[#0066FF] hover:text-[#0066FF] transition-all disabled:opacity-30">−</button>
        <span className="font-poppins font-black text-[.95rem] text-[#1A1D2B] w-5 text-center">{val}</span>
        <button type="button" onClick={onInc} disabled={val >= max}
          className="w-8 h-8 rounded-full border-2 border-[#E8ECF4] flex items-center justify-center text-[#5C6378] font-bold text-lg hover:border-[#0066FF] hover:text-[#0066FF] transition-all disabled:opacity-30">+</button>
      </div>
    </div>
  );
}

function PassengerPicker({ adults, children, infants, onChange }: {
  adults: number; children: number; infants: number;
  onChange: (a: number, c: number, i: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const label = [
    `${adults} Adult${adults !== 1 ? 's' : ''}`,
    children > 0 ? `${children} Child${children !== 1 ? 'ren' : ''}` : null,
    infants > 0 ? `${infants} Infant${infants !== 1 ? 's' : ''}` : null,
  ].filter(Boolean).join(', ');

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full px-4 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-left text-[.85rem] font-semibold text-[#1A1D2B] outline-none focus:border-[#0066FF] hover:bg-white transition-all flex items-center justify-between">
        <span>{label}</span>
        <span className="text-[#B0B8CC] text-xs">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div className="absolute z-50 w-72 mt-1.5 right-0 bg-white border border-[#E8ECF4] rounded-2xl shadow-2xl p-4">
          <PaxRow label="Adults" sub="Age 12+" val={adults} min={1} max={9 - children - infants}
            onDec={() => onChange(adults - 1, children, infants)} onInc={() => onChange(adults + 1, children, infants)} />
          <PaxRow label="Children" sub="Age 2–11" val={children} min={0} max={9 - adults - infants}
            onDec={() => onChange(adults, children - 1, infants)} onInc={() => onChange(adults, children + 1, infants)} />
          <PaxRow label="Infants" sub="Under 2" val={infants} min={0} max={Math.min(adults, 9 - adults - children)}
            onDec={() => onChange(adults, children, infants - 1)} onInc={() => onChange(adults, children, infants + 1)} />
          <p className="text-[.6rem] text-[#8E95A9] font-semibold mt-1">Max 9 passengers total</p>
          <button type="button" onClick={() => setOpen(false)}
            className="w-full mt-3 bg-[#0066FF] hover:bg-[#0052CC] text-white font-poppins font-bold text-[.8rem] py-2.5 rounded-xl transition-colors">
            Done
          </button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   HOT FLIGHT DEALS
   ═══════════════════════════════════════════════════════════════════════════ */

type HotDeal = {
  dest: string; city: string; country: string; flag: string;
  price: number; airline: string; airlineCode: string;
  departureDate: string; transfers: number; duration: number;
};

function HotDeals({ onSelect }: { onSelect: (destCode: string, destCity: string) => void }) {
  const [deals, setDeals] = useState<HotDeal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/flights/deals')
      .then(r => r.json())
      .then(d => { setDeals(d.deals || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="max-w-[1100px] mx-auto px-5 py-8">
        <h2 className="font-poppins font-black text-[1.2rem] text-[#1A1D2B] mb-4">
          <span className="text-[#0066FF]">🔥</span> Hot Flight Deals from London
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white border border-[#E8ECF4] rounded-xl p-4 animate-pulse">
              <div className="h-4 w-24 bg-[#F1F3F7] rounded mb-3" />
              <div className="h-6 w-16 bg-[#F1F3F7] rounded mb-2" />
              <div className="h-3 w-32 bg-[#F1F3F7] rounded" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (deals.length === 0) return null;

  return (
    <section className="max-w-[1100px] mx-auto px-5 py-8">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="font-poppins font-black text-[1.2rem] text-[#1A1D2B]">
          <span className="text-[#0066FF]">🔥</span> Hot Flight Deals from London
        </h2>
        <span className="text-[.68rem] text-[#8E95A9] font-semibold">Live prices · Updated every 6 hours · Click to search</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {deals.map(deal => {
          const depDate = deal.departureDate ? new Date(deal.departureDate) : null;
          const dateStr = depDate ? depDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
          const stops = deal.transfers === 0 ? 'Direct' : deal.transfers === 1 ? '1 stop' : `${deal.transfers} stops`;
          const durH = Math.floor((deal.duration || 0) / 60);
          const durM = (deal.duration || 0) % 60;
          const durStr = deal.duration ? `${durH}h${durM > 0 ? ` ${durM}m` : ''}` : '';
          const logo = `https://pics.avs.io/60/60/${deal.airlineCode}.png`;

          return (
            <button key={deal.dest} onClick={() => onSelect(deal.dest, deal.city)}
              className="bg-white border border-[#E8ECF4] rounded-xl p-4 text-left hover:border-[#0066FF] hover:shadow-md transition-all group cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[.78rem] font-poppins font-black text-[#1A1D2B] group-hover:text-[#0066FF] transition-colors">
                  {deal.flag} {deal.city}
                </span>
                <img src={logo} alt={deal.airline} className="w-5 h-5 object-contain opacity-70"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
              <div className="font-poppins font-black text-[1.4rem] text-[#0066FF] leading-none mb-1.5">
                £{deal.price}
              </div>
              <div className="text-[.62rem] text-[#8E95A9] font-semibold space-y-0.5">
                <div>{deal.airline} · {stops}{durStr ? ` · ${durStr}` : ''}</div>
                {dateStr && <div>from {dateStr} · one-way pp</div>}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   LOADING ANIMATION
   ═══════════════════════════════════════════════════════════════════════════ */

const LOADING_MSGS = [
  'Searching Aviasales...',
  'Checking Trip.com...',
  'Comparing Skyscanner...',
  'Scanning Expedia...',
  'Checking Kiwi.com...',
  'Finding you the best deal...',
];

function LoadingState({ origin, dest }: { origin: string; dest: string }) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const msgTimer = setInterval(() => setMsgIdx(i => (i + 1) % LOADING_MSGS.length), 500);
    const progTimer = setInterval(() => setProgress(p => Math.min(p + 1.2, 95)), 50);
    return () => { clearInterval(msgTimer); clearInterval(progTimer); };
  }, []);

  return (
    <section className="max-w-[860px] mx-auto px-5 py-10">
      <div className="bg-white border border-[#E8ECF4] rounded-2xl p-8 text-center shadow-sm">
        <div className="w-full bg-[#F1F3F7] rounded-full h-2 mb-5 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#0066FF] to-[#4F46E5] rounded-full transition-all duration-100" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-5 h-5 border-2 border-[#0066FF] border-t-transparent rounded-full animate-spin" />
          <span className="text-[.9rem] font-bold text-[#5C6378]">{LOADING_MSGS[msgIdx]}</span>
        </div>
        <p className="text-[.78rem] text-[#8E95A9] font-semibold">Comparing prices for <strong className="text-[#1A1D2B]">{origin} → {dest}</strong></p>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PRICE HISTORY BAR CHART
   ═══════════════════════════════════════════════════════════════════════════ */

function PriceCalendar({ origin, dest, depDate }: { origin: string; dest: string; depDate: string }) {
  const [data, setData] = useState<CalendarDay[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const month = depDate.slice(0, 7);
    setLoading(true);
    fetch(`/api/flights?origin=${origin}&destination=${dest}&mode=calendar&month=${month}`)
      .then(r => r.json())
      .then(d => { setData(d.data || []); setLoading(false); })
      .catch(() => { setData([]); setLoading(false); });
  }, [origin, dest, depDate]);

  if (loading) {
    return (
      <div className="bg-white border border-[#E8ECF4] rounded-2xl p-6">
        <div className="h-4 w-48 bg-[#F1F3F7] rounded animate-pulse mb-4" />
        <div className="flex gap-1 items-end h-32">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="flex-1 bg-[#F1F3F7] rounded-t animate-pulse" style={{ height: `${30 + Math.random() * 70}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) return null;

  const sorted = [...data].sort((a, b) => new Date(a.depart_date).getTime() - new Date(b.depart_date).getTime());
  const prices = sorted.map(d => d.value);
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  const range = maxPrice - minPrice || 1;

  function getColor(price: number): string {
    const ratio = (price - minPrice) / range;
    if (ratio < 0.33) return '#10b981'; // green
    if (ratio < 0.66) return '#f59e0b'; // amber
    return '#ef4444'; // red
  }

  return (
    <div className="bg-white border border-[#E8ECF4] rounded-2xl p-6">
      <h3 className="font-poppins font-black text-[1rem] text-[#1A1D2B] mb-1">Best Days to Fly {origin} → {dest}</h3>
      <p className="text-[.72rem] text-[#8E95A9] font-semibold mb-4">
        <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#10b981] mr-1 align-middle" /> Cheap
        <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#f59e0b] mx-1 ml-3 align-middle" /> Medium
        <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#ef4444] mx-1 ml-3 align-middle" /> Expensive
      </p>
      <div className="flex gap-[3px] items-end h-36 overflow-x-auto pb-1">
        {sorted.map((d, i) => {
          const h = 15 + ((d.value - minPrice) / range) * 85;
          const day = new Date(d.depart_date).getDate();
          const mon = new Date(d.depart_date).toLocaleString('en-GB', { month: 'short' });
          return (
            <div key={i} className="flex flex-col items-center flex-1 min-w-[22px] group relative">
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#1A1D2B] text-white text-[.6rem] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                £{d.value} · {day} {mon}
              </div>
              <div className="w-full rounded-t-sm transition-all hover:opacity-80 cursor-default"
                style={{ height: `${h}%`, backgroundColor: getColor(d.value) }} />
              <span className="text-[.55rem] text-[#8E95A9] font-semibold mt-1">{day}</span>
            </div>
          );
        })}
      </div>
      <p className="text-[.65rem] text-[#8E95A9] font-semibold mt-3 text-center">Hover over bars to see prices · Based on recent searches</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═��═════════════════════════════════════════════════════════════════════════ */

function FlightsContent() {
  const [originCode, setOriginCode] = useState('');
  const [originCity, setOriginCity] = useState('');
  const [destCode, setDestCode] = useState('');
  const [destCity, setDestCity] = useState('');
  const [depDate, setDepDate] = useState('');
  const [retDate, setRetDate] = useState('');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [tripType, setTripType] = useState<'one-way' | 'return'>('return');
  const [cabinClass, setCabinClass] = useState<'economy' | 'premium_economy' | 'business' | 'first'>('economy');

  const [loading, setLoading] = useState(false);
  const [flights, setFlights] = useState<FlightResult[] | null>(null);
  const [apiError, setApiError] = useState('');
  const [searched, setSearched] = useState(false);

  // Filter + sort state
  type SortBy = 'price-asc' | 'price-desc' | 'duration-asc' | 'duration-desc';
  type StopsFilter = 'any' | 'direct' | 'max1' | 'max2';
  const [sortBy, setSortBy] = useState<SortBy>('price-asc');
  const [stopsFilter, setStopsFilter] = useState<StopsFilter>('any');
  const [selectedAirlines, setSelectedAirlines] = useState<string[]>([]);
  const [flightNumFilter, setFlightNumFilter] = useState('');
  const [takeoffMin, setTakeoffMin] = useState(0);      // minutes since 00:00
  const [takeoffMax, setTakeoffMax] = useState(1439);
  const [landingMin, setLandingMin] = useState(0);
  const [landingMax, setLandingMax] = useState(1439);
  const [filtersOpenMobile, setFiltersOpenMobile] = useState(false);
  const [priceView, setPriceView] = useState<'perPerson' | 'total'>('perPerson');

  // URL param initialisation
  const [initOrigin, setInitOrigin] = useState('');
  const [initDest, setInitDest] = useState('');

  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const o = p.get('origin') || p.get('from') || '';
    const d = p.get('dest') || p.get('to') || '';
    const destCityParam = p.get('destCity') || '';
    const dep = p.get('departure') || '';
    const ret = p.get('return') || '';

    // Read from localStorage as fallback for origin
    if (!o) {
      const saved = localStorage.getItem('jma_departure_airport');
      if (saved) setInitOrigin(saved);
    } else {
      setInitOrigin(o);
    }

    if (d) setInitDest(d);
    if (destCityParam && d) setDestCity(destCityParam);
    if (dep) setDepDate(dep);
    if (ret) { setRetDate(ret); setTripType('return'); }
    const cab = (p.get('cabin') || '').toLowerCase();
    if (cab === 'premium_economy' || cab === 'business' || cab === 'first') setCabinClass(cab);
  }, []);

  const today = new Date().toISOString().split('T')[0];

  const handleSearch = useCallback(async () => {
    if (!originCode) { alert('Please select a departure airport'); return; }
    if (!destCode) { alert('Please select a destination'); return; }
    if (!depDate) { alert('Please select a departure date'); return; }

    setFlights(null);
    setApiError('');
    setLoading(true);
    setSearched(true);

    try {
      const params = new URLSearchParams({
        origin: originCode,
        destination: destCode,
        departure: depDate,
        adults: String(adults),
      });
      if (children > 0) params.set('children', String(children));
      if (infants > 0) params.set('infants', String(infants));
      if (cabinClass !== 'economy') params.set('cabin', cabinClass);
      if (retDate && tripType === 'return') params.set('return', retDate);

      const res = await fetch(`/api/flights?${params}`);
      const data = await res.json();

      if (data.error) {
        setApiError(data.error);
        setLoading(false);
        return;
      }

      setFlights(data.flights || []);
      setLoading(false);

      // Scroll to results
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch {
      setApiError('Could not load flight prices. Please try again.');
      setLoading(false);
    }
  }, [originCode, destCode, depDate, retDate, adults, children, infants, tripType, cabinClass]);

  // Helper: format departure/arrival times from ISO string
  function fmtTime(iso: string | null): string {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    } catch { return '—'; }
  }

  function fmtDate(iso: string | null): string {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch { return ''; }
  }

  function fmtDuration(mins: number): string {
    if (!mins || mins <= 0) return '';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  // Compute arrival time by adding duration to departure
  function arrivalTime(depIso: string | null, durationMins: number): string {
    if (!depIso || !durationMins) return '—';
    try {
      const d = new Date(depIso);
      d.setMinutes(d.getMinutes() + durationMins);
      return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    } catch { return '—'; }
  }

  const cheapest = flights && flights.length > 0 ? flights[0] : null;
  const effectiveRet = tripType === 'return' ? retDate : null;

  // Available airlines (from unfiltered results)
  const availableAirlines = useMemo(() => {
    if (!flights) return [] as string[];
    return Array.from(new Set(flights.map(f => f.airline))).sort();
  }, [flights]);

  // Apply filters + sort
  const visibleFlights = useMemo(() => {
    if (!flights) return [] as FlightResult[];
    let list = flights.slice();

    // Stops
    if (stopsFilter === 'direct') list = list.filter(f => f.transfers === 0);
    else if (stopsFilter === 'max1') list = list.filter(f => f.transfers <= 1);
    else if (stopsFilter === 'max2') list = list.filter(f => f.transfers <= 2);

    // Airlines
    if (selectedAirlines.length > 0) {
      list = list.filter(f => selectedAirlines.includes(f.airline));
    }

    // Flight number (matches "BA117", "ba 117", "117", etc.)
    const fn = flightNumFilter.trim().toUpperCase().replace(/\s+/g, '');
    if (fn) {
      list = list.filter(f => {
        const combined = `${(f.airlineCode || '').toUpperCase()}${(f.flight_number || '').toUpperCase()}`;
        return combined.includes(fn);
      });
    }

    // Take-off time
    if (takeoffMin > 0 || takeoffMax < 1439) {
      list = list.filter(f => {
        if (!f.departure_at) return true;
        const d = new Date(f.departure_at);
        const mins = d.getHours() * 60 + d.getMinutes();
        return mins >= takeoffMin && mins <= takeoffMax;
      });
    }

    // Landing time
    if (landingMin > 0 || landingMax < 1439) {
      list = list.filter(f => {
        if (!f.departure_at || !f.duration_to) return true;
        const d = new Date(f.departure_at);
        d.setMinutes(d.getMinutes() + f.duration_to);
        const mins = d.getHours() * 60 + d.getMinutes();
        return mins >= landingMin && mins <= landingMax;
      });
    }

    // Sort
    list.sort((a, b) => {
      switch (sortBy) {
        case 'price-asc': return a.price - b.price;
        case 'price-desc': return b.price - a.price;
        case 'duration-asc': return a.duration_to - b.duration_to;
        case 'duration-desc': return b.duration_to - a.duration_to;
      }
    });

    return list;
  }, [flights, sortBy, stopsFilter, selectedAirlines, flightNumFilter, takeoffMin, takeoffMax, landingMin, landingMax]);

  const filtersActive =
    sortBy !== 'price-asc' ||
    stopsFilter !== 'any' ||
    selectedAirlines.length > 0 ||
    flightNumFilter.trim() !== '' ||
    takeoffMin > 0 || takeoffMax < 1439 ||
    landingMin > 0 || landingMax < 1439;

  const clearAllFilters = () => {
    setSortBy('price-asc');
    setStopsFilter('any');
    setSelectedAirlines([]);
    setFlightNumFilter('');
    setTakeoffMin(0); setTakeoffMax(1439);
    setLandingMin(0); setLandingMax(1439);
  };

  const minsToLabel = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

  // Reset filters whenever a new search lands (avoid stale airline filter carrying over)
  useEffect(() => {
    if (flights) {
      setSelectedAirlines(prev => prev.filter(a => flights.some(f => f.airline === a)));
    }
  }, [flights]);

  return (
    <>
      <Header />

      {/* ── Hero + Search ── */}
      <section className="pt-36 pb-10 px-5 bg-[radial-gradient(ellipse_at_top,#E8F0FE_0%,#fff_55%,#F8FAFC_100%)]">
        <div className="max-w-[860px] mx-auto text-center mb-8">
          <span className="inline-flex items-center gap-1.5 bg-blue-50 text-[#0066FF] text-[.65rem] font-black uppercase tracking-[2.5px] px-3.5 py-1.5 rounded-full mb-4"><span className="text-base leading-none">✈</span> Flight Comparison</span>
          <h1 className="font-poppins text-[2.4rem] md:text-[3.6rem] font-black text-[#1A1D2B] leading-[1.05] tracking-tight mb-3">
            Find the <em className="italic bg-gradient-to-br from-[#0066FF] to-[#4F46E5] bg-clip-text text-transparent">Cheapest</em> Flights
          </h1>
          <p className="text-[1rem] text-[#8E95A9] font-semibold max-w-[520px] mx-auto">Compare 5 providers in seconds — real prices shown right here.</p>
        </div>

        <div className="max-w-[860px] mx-auto bg-white border border-[#E8ECF4] rounded-3xl p-6 shadow-[0_8px_40px_rgba(0,102,255,0.08)]">
          {/* Trip type + Cabin */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <div className="flex gap-1.5 bg-[#F8FAFC] p-1 rounded-xl w-fit">
              {(['return', 'one-way'] as const).map(t => (
                <button key={t} onClick={() => { setTripType(t); if (t === 'one-way') setRetDate(''); }}
                  className={`px-4 py-2 rounded-lg text-[.75rem] font-extrabold uppercase tracking-[1.5px] transition-all ${tripType === t ? 'bg-white text-[#0066FF] shadow-sm' : 'text-[#8E95A9] hover:text-[#1A1D2B]'}`}>
                  {t === 'return' ? '↔ Return' : '→ One-way'}
                </button>
              ))}
            </div>
            <select
              value={cabinClass}
              onChange={e => setCabinClass(e.target.value as typeof cabinClass)}
              className="bg-[#F8FAFC] border border-[#E8ECF4] rounded-xl px-3 py-2 text-[.75rem] font-extrabold uppercase tracking-[1.5px] text-[#1A1D2B] outline-none focus:border-[#0066FF] cursor-pointer"
              aria-label="Cabin class"
            >
              <option value="economy">Economy</option>
              <option value="premium_economy">Premium Economy</option>
              <option value="business">Business</option>
              <option value="first">First</option>
            </select>
          </div>

          {/* From / To */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">From</label>
              <AutocompleteFrom value={originCode} onChange={(code, city) => { setOriginCode(code); setOriginCity(city); }} initialCode={initOrigin} />
            </div>
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">To</label>
              <AutocompleteTo value={destCode} onChange={(code, city) => { setDestCode(code); setDestCity(city); }} initialCode={initDest} />
            </div>
          </div>

          {/* Dates + Passengers */}
          <div className={`grid gap-3 mb-4 ${tripType === 'return' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Departure</label>
              <input type="date" min={today} value={depDate} onChange={e => {
                const newDep = e.target.value;
                setDepDate(newDep);
                // Auto-adjust return date: if return is before new departure, move it forward
                if (tripType === 'return') {
                  if (!retDate || retDate <= newDep) {
                    const r = new Date(newDep);
                    r.setDate(r.getDate() + 7);
                    setRetDate(r.toISOString().split('T')[0]);
                  }
                }
              }}
                className="w-full px-3 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.85rem] font-semibold text-[#1A1D2B] outline-none focus:border-[#0066FF] focus:bg-white transition-all" />
            </div>
            {tripType === 'return' && (
              <div>
                <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Return</label>
                <input type="date" min={depDate || today} value={retDate} onChange={e => setRetDate(e.target.value)}
                  className="w-full px-3 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.85rem] font-semibold text-[#1A1D2B] outline-none focus:border-[#0066FF] focus:bg-white transition-all" />
              </div>
            )}
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Passengers</label>
              <PassengerPicker adults={adults} children={children} infants={infants}
                onChange={(a, c, i) => { setAdults(a); setChildren(c); setInfants(i); }} />
            </div>
          </div>

          <button onClick={handleSearch} disabled={loading}
            className="w-full bg-[#0066FF] hover:bg-[#0052CC] disabled:opacity-60 text-white font-poppins font-black text-[.95rem] py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(0,102,255,0.3)]">
            {loading ? 'Searching…' : 'Search 5 Providers →'}
          </button>
          <p className="text-center text-[.68rem] text-[#8E95A9] font-semibold mt-2.5">Free comparison · Results shown here · Click any deal to book on the provider site</p>
        </div>
      </section>

      {/* ── Hot Flight Deals (shown before search) ── */}
      {!searched && !loading && (
        <HotDeals onSelect={(code, city) => {
          setDestCode(code);
          setDestCity(city);
          // Set a default departure date if not already set (next Saturday)
          if (!depDate) {
            const d = new Date();
            d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7)); // next Saturday
            const iso = d.toISOString().split('T')[0];
            setDepDate(iso);
            if (tripType === 'return' && !retDate) {
              const r = new Date(d);
              r.setDate(r.getDate() + 7);
              setRetDate(r.toISOString().split('T')[0]);
            }
          }
          // Scroll to search form so user can see destination is pre-filled
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }} />
      )}

      {/* ── Loading State ── */}
      {loading && <LoadingState origin={originCode} dest={destCode} />}

      {/* ── API Error ── */}
      {apiError && (
        <section className="max-w-[860px] mx-auto px-5 py-6">
          <div className="bg-red-50 border border-red-100 rounded-2xl p-5 text-center">
            <p className="text-[.85rem] font-bold text-red-600 mb-3">{apiError}</p>
            <button onClick={handleSearch}
              className="bg-[#0066FF] hover:bg-[#0052CC] text-white font-poppins font-bold text-[.82rem] px-6 py-2.5 rounded-xl transition-all">
              Try Again
            </button>
          </div>
        </section>
      )}

      {/* ── Results ── */}
      {searched && !loading && flights !== null && (
        <div ref={resultsRef}>
          {/* Section 1: Price Summary Bar */}
          {cheapest && (
            <section className="max-w-[1000px] mx-auto px-5 pt-8 pb-4">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🏷</span>
                  <span className="font-poppins font-black text-[1rem] text-[#1A1D2B]">
                    Cheapest found: <span className="text-green-600">£{priceView === 'total' ? Math.round(cheapest.price * (adults + children)) : cheapest.price}{priceView === 'total' ? ' total' : '/pp'}</span> with {cheapest.airline}
                    {cheapest.transfers === 0 && <span className="text-green-600"> (direct)</span>}
                  </span>
                </div>
                <p className="text-[.7rem] text-[#8E95A9] font-semibold">{cheapest.source === 'duffel' ? 'Live prices including all taxes & fees. Book directly.' : 'Prices are indicative based on recent searches. Click \'View Deal\' for live pricing from the provider.'}</p>
              </div>
            </section>
          )}

          {/* ATOL / flight-only notice */}
          <section className="max-w-[1000px] mx-auto px-5 pb-2">
            <p className="text-[.62rem] text-[#8E95A9] font-semibold leading-relaxed">
              <i className="fa-solid fa-circle-info text-[.55rem] mr-1" />
              Important: This flight-only booking is sold by JetMeAway as an agent for the airline. Your flight is not protected under the ATOL scheme. Many airlines provide their own financial protection; please check your airline&apos;s terms for details. We recommend comprehensive travel insurance.
            </p>
          </section>

          {/* Section 2: Sidebar filters + Result cards */}
          {flights.length > 0 ? (
            <section className="max-w-[1240px] mx-auto px-5 pb-6">
              {/* Mobile filters toggle */}
              <div className="md:hidden mb-4 flex items-center justify-between gap-3">
                <button
                  onClick={() => setFiltersOpenMobile(v => !v)}
                  className="flex items-center gap-2 bg-white border border-[#E8ECF4] hover:border-[#0066FF] text-[#1A1D2B] font-poppins font-bold text-[.78rem] px-4 py-2 rounded-full shadow-sm transition-all"
                >
                  <span>⚙</span> Filters & Sort
                  {filtersActive && <span className="w-1.5 h-1.5 rounded-full bg-[#0066FF]" />}
                </button>
                <div className="text-[.72rem] text-[#8E95A9] font-bold">
                  {visibleFlights.length} of {flights.length}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-5">
                {/* ─── Sidebar ─── */}
                <aside className={`${filtersOpenMobile ? 'block' : 'hidden'} md:block md:sticky md:top-24 self-start bg-white border border-[#E8ECF4] rounded-2xl p-5 h-fit`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-poppins font-black text-[.95rem] text-[#1A1D2B]">Filters</h3>
                    {filtersActive && (
                      <button onClick={clearAllFilters} className="text-[.7rem] font-bold text-[#0066FF] hover:underline">
                        Clear all
                      </button>
                    )}
                  </div>

                  {/* Sort by */}
                  <div className="mb-5">
                    <h4 className="font-poppins font-black text-[.78rem] text-[#1A1D2B] mb-2 uppercase tracking-wide">Sort by</h4>
                    <div className="space-y-1.5">
                      {([
                        { v: 'price-asc', l: 'Least expensive' },
                        { v: 'price-desc', l: 'Most expensive' },
                        { v: 'duration-asc', l: 'Shortest duration' },
                        { v: 'duration-desc', l: 'Longest duration' },
                      ] as { v: SortBy; l: string }[]).map(o => (
                        <label key={o.v} className="flex items-center gap-2 cursor-pointer text-[.78rem] text-[#5C6378] font-semibold">
                          <input type="radio" name="sortby" checked={sortBy === o.v} onChange={() => setSortBy(o.v)} className="accent-[#0066FF]" />
                          {o.l}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Price view */}
                  <div className="mb-5">
                    <h4 className="font-poppins font-black text-[.78rem] text-[#1A1D2B] mb-2 uppercase tracking-wide">Show price</h4>
                    <div className="inline-flex bg-[#F1F3F7] rounded-xl p-1 w-full">
                      <button
                        type="button"
                        onClick={() => setPriceView('perPerson')}
                        className={`flex-1 px-3 py-1.5 rounded-lg text-[.72rem] font-poppins font-bold transition-all ${priceView === 'perPerson' ? 'bg-white text-[#1A1D2B] shadow-sm' : 'text-[#5C6378]'}`}
                      >
                        Per person
                      </button>
                      <button
                        type="button"
                        onClick={() => setPriceView('total')}
                        className={`flex-1 px-3 py-1.5 rounded-lg text-[.72rem] font-poppins font-bold transition-all ${priceView === 'total' ? 'bg-white text-[#1A1D2B] shadow-sm' : 'text-[#5C6378]'}`}
                      >
                        Total
                      </button>
                    </div>
                  </div>

                  {/* Stops */}
                  <div className="mb-5">
                    <h4 className="font-poppins font-black text-[.78rem] text-[#1A1D2B] mb-2 uppercase tracking-wide">Stops</h4>
                    <div className="space-y-1.5">
                      {([
                        { v: 'direct', l: 'Direct only' },
                        { v: 'max1', l: '1 stop at most' },
                        { v: 'max2', l: '2 stops at most' },
                        { v: 'any', l: 'Any number of stops' },
                      ] as { v: StopsFilter; l: string }[]).map(o => (
                        <label key={o.v} className="flex items-center gap-2 cursor-pointer text-[.78rem] text-[#5C6378] font-semibold">
                          <input type="radio" name="stops" checked={stopsFilter === o.v} onChange={() => setStopsFilter(o.v)} className="accent-[#0066FF]" />
                          {o.l}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Airlines */}
                  {availableAirlines.length > 0 && (
                    <div className="mb-5">
                      <h4 className="font-poppins font-black text-[.78rem] text-[#1A1D2B] mb-2 uppercase tracking-wide">Airlines</h4>
                      <div className="space-y-1.5">
                        {availableAirlines.map(a => (
                          <label key={a} className="flex items-center gap-2 cursor-pointer text-[.78rem] text-[#5C6378] font-semibold">
                            <input
                              type="checkbox"
                              checked={selectedAirlines.includes(a)}
                              onChange={(e) => {
                                setSelectedAirlines(prev => e.target.checked ? [...prev, a] : prev.filter(x => x !== a));
                              }}
                              className="accent-[#0066FF]"
                            />
                            <span className="truncate">{a}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Flight number */}
                  <div className="mb-5">
                    <h4 className="font-poppins font-black text-[.78rem] text-[#1A1D2B] mb-2 uppercase tracking-wide">Flight number</h4>
                    <input
                      type="text"
                      value={flightNumFilter}
                      onChange={(e) => setFlightNumFilter(e.target.value)}
                      placeholder="e.g. BA117"
                      className="w-full border border-[#E8ECF4] rounded-lg px-3 py-2 text-[.8rem] focus:outline-none focus:border-[#0066FF]"
                    />
                  </div>

                  {/* Take-off time */}
                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-poppins font-black text-[.78rem] text-[#1A1D2B] uppercase tracking-wide">Take-off</h4>
                      <span className="text-[.65rem] text-[#8E95A9] font-bold">
                        {takeoffMin === 0 && takeoffMax === 1439 ? 'at any time' : `${minsToLabel(takeoffMin)} – ${minsToLabel(takeoffMax)}`}
                      </span>
                    </div>
                    <label className="text-[.65rem] text-[#8E95A9] font-semibold block mb-0.5">Earliest</label>
                    <input type="range" min={0} max={1439} step={15} value={takeoffMin}
                      onChange={e => { const v = Number(e.target.value); setTakeoffMin(Math.min(v, takeoffMax)); }}
                      className="w-full accent-[#0066FF]" />
                    <label className="text-[.65rem] text-[#8E95A9] font-semibold block mb-0.5 mt-1">Latest</label>
                    <input type="range" min={0} max={1439} step={15} value={takeoffMax}
                      onChange={e => { const v = Number(e.target.value); setTakeoffMax(Math.max(v, takeoffMin)); }}
                      className="w-full accent-[#0066FF]" />
                    <div className="flex justify-between text-[.58rem] text-[#B0B8CC] font-bold mt-1">
                      <span>00:00</span><span>08:00</span><span>16:00</span><span>23:59</span>
                    </div>
                  </div>

                  {/* Landing time */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-poppins font-black text-[.78rem] text-[#1A1D2B] uppercase tracking-wide">Landing</h4>
                      <span className="text-[.65rem] text-[#8E95A9] font-bold">
                        {landingMin === 0 && landingMax === 1439 ? 'at any time' : `${minsToLabel(landingMin)} – ${minsToLabel(landingMax)}`}
                      </span>
                    </div>
                    <label className="text-[.65rem] text-[#8E95A9] font-semibold block mb-0.5">Earliest</label>
                    <input type="range" min={0} max={1439} step={15} value={landingMin}
                      onChange={e => { const v = Number(e.target.value); setLandingMin(Math.min(v, landingMax)); }}
                      className="w-full accent-[#0066FF]" />
                    <label className="text-[.65rem] text-[#8E95A9] font-semibold block mb-0.5 mt-1">Latest</label>
                    <input type="range" min={0} max={1439} step={15} value={landingMax}
                      onChange={e => { const v = Number(e.target.value); setLandingMax(Math.max(v, landingMin)); }}
                      className="w-full accent-[#0066FF]" />
                    <div className="flex justify-between text-[.58rem] text-[#B0B8CC] font-bold mt-1">
                      <span>00:00</span><span>08:00</span><span>16:00</span><span>23:59</span>
                    </div>
                  </div>
                </aside>

                {/* ─── Results ─── */}
                <div>
                  <div className="hidden md:flex items-center justify-between mb-3">
                    <h3 className="font-poppins font-black text-[.9rem] text-[#1A1D2B]">
                      {visibleFlights.length} of {flights.length} flights
                    </h3>
                  </div>

                  {visibleFlights.length === 0 ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
                      <span className="text-3xl mb-3 block">🔎</span>
                      <p className="font-poppins font-bold text-[.95rem] text-[#1A1D2B] mb-2">No flights match your filters.</p>
                      <button onClick={clearAllFilters} className="text-[.78rem] text-[#0066FF] font-bold hover:underline">
                        Clear all filters
                      </button>
                    </div>
                  ) : (
                  <div className="space-y-3">
                {visibleFlights.map((f, i) => {
                  const isCheapest = cheapest !== null && f === cheapest;
                  const depTime = fmtTime(f.departure_at);
                  const arrTime = arrivalTime(f.departure_at, f.duration_to);
                  const duration = fmtDuration(f.duration_to);
                  const airlineLogo = `https://pics.avs.io/80/80/${f.airlineCode}.png`;
                  const isDuffel = f.source === 'duffel';
                  const viewDealUrl = isDuffel
                    ? '#' // Duffel flights — booking flow coming soon
                    : buildAviasalesUrl(originCode, destCode, depDate, effectiveRet, adults);

                  return (
                    <div key={i} className={`bg-white border rounded-2xl overflow-hidden transition-shadow hover:shadow-md ${isCheapest ? 'border-green-200 ring-1 ring-green-100' : 'border-[#E8ECF4]'}`}>
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-4 p-5 items-center">
                        {/* Airline */}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#F8FAFC] border border-[#E8ECF4] flex items-center justify-center flex-shrink-0 overflow-hidden">
                            <img src={airlineLogo} alt={f.airline} className="w-8 h-8 object-contain"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-lg">✈</span>'; }} />
                          </div>
                          <div>
                            <div className="font-poppins font-bold text-[.88rem] text-[#1A1D2B] flex items-center gap-2">
                              {f.airline}
                              {isCheapest && <span className="text-[.55rem] font-black uppercase tracking-[1.5px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Cheapest</span>}
                            </div>
                            {f.flight_number && <div className="text-[.65rem] text-[#8E95A9] font-semibold">{f.airlineCode} {f.flight_number}</div>}
                          </div>
                        </div>

                        {/* Flight info */}
                        <div className="flex items-center gap-3">
                          <div className="text-center min-w-[50px]">
                            <div className="font-poppins font-black text-[1.05rem] text-[#1A1D2B]">{depTime}</div>
                            <div className="text-[.62rem] text-[#8E95A9] font-semibold">{originCode}</div>
                          </div>
                          <div className="flex-1 flex flex-col items-center gap-0.5 min-w-[80px]">
                            <div className="text-[.65rem] text-[#8E95A9] font-semibold">{duration}</div>
                            <div className="w-full flex items-center gap-0.5">
                              <div className="flex-1 h-px bg-[#D1D5DB]" />
                              <span className="text-[#B0B8CC] text-[.7rem]">✈</span>
                              <div className="flex-1 h-px bg-[#D1D5DB]" />
                            </div>
                            <span className={`text-[.58rem] font-black uppercase tracking-[1px] ${f.transfers === 0 ? 'text-green-600' : 'text-orange-500'}`}>
                              {f.stops}
                            </span>
                          </div>
                          <div className="text-center min-w-[50px]">
                            <div className="font-poppins font-black text-[1.05rem] text-[#1A1D2B]">{arrTime}</div>
                            <div className="text-[.62rem] text-[#8E95A9] font-semibold">{destCode}</div>
                          </div>
                        </div>

                        {/* Price */}
                        <div className="flex items-center gap-4 md:flex-col md:items-end md:gap-2">
                          <div className="text-right">
                            {priceView === 'total' ? (
                              <>
                                <div className="font-poppins font-black text-[1.5rem] text-[#1A1D2B] leading-none">{f.currency}{Math.round(f.price * (adults + children))}</div>
                                <div className="text-[.6rem] text-[#8E95A9] font-semibold">
                                  total for {adults + children} passenger{adults + children !== 1 ? 's' : ''}{f.return_at ? ', return' : ', one-way'}
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="font-poppins font-black text-[1.5rem] text-[#1A1D2B] leading-none">{f.currency}{f.price}</div>
                                <div className="text-[.6rem] text-[#8E95A9] font-semibold">
                                  {isDuffel ? 'total price, per person' : `per person, ${f.return_at ? 'return' : 'one-way'}`}
                                </div>
                              </>
                            )}
                            {isDuffel && (
                              <div className="text-[.55rem] text-green-600 font-bold mt-0.5">✓ Live price incl. taxes</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Return flight info */}
                      {f.return_at && f.duration_back > 0 && (
                        <div className="border-t border-[#F1F3F7] px-5 py-2.5 bg-[#FAFBFD] flex items-center gap-3 text-[.72rem] text-[#8E95A9] font-semibold">
                          <span className="text-[#5C6378] font-bold">Return:</span>
                          <span>{fmtDate(f.return_at)}, {fmtTime(f.return_at)} → {arrivalTime(f.return_at, f.duration_back)}</span>
                          <span>({fmtDuration(f.duration_back)}, {f.transfers === 0 ? 'Direct' : f.stops})</span>
                        </div>
                      )}

                      {/* Provider comparison buttons */}
                      <div className="border-t border-[#F1F3F7] px-5 py-3 bg-[#FAFBFD]">
                        <div className="text-[.62rem] text-[#8E95A9] font-bold uppercase tracking-[1px] mb-2">Compare prices across providers</div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                          {isDuffel && f.offer_id ? (
                            <a href={`/checkout/${f.offer_id}`}
                              className="flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-poppins font-bold text-[.7rem] py-2 px-3 rounded-lg transition-all shadow-sm whitespace-nowrap col-span-2 sm:col-span-3 lg:col-span-5">
                              ✓ Book Now — {f.currency}{priceView === 'total' ? Math.round(f.price * (adults + children)) : f.price}{priceView === 'total' ? ' total' : '/pp'} →
                            </a>
                          ) : (
                            PROVIDERS.map((p, pi) => {
                              const provUrl = p.getUrl(originCode, destCode, depDate, effectiveRet, adults, originCity, destCity);
                              return (
                                <a key={p.name} href={redirectUrl(provUrl, p.name, destCity || destCode, 'flights')}
                                  target="_blank" rel="noopener noreferrer"
                                  className={`flex items-center justify-center gap-1.5 font-poppins font-bold text-[.7rem] py-2 px-3 rounded-lg transition-all shadow-sm whitespace-nowrap ${pi === 0 ? 'bg-[#0066FF] hover:bg-[#0052CC] text-white' : 'bg-white border border-[#E8ECF4] text-[#1A1D2B] hover:border-[#0066FF] hover:text-[#0066FF]'}`}>
                                  <span>{p.logo}</span>
                                  <span>{p.name} →</span>
                                </a>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                  </div>
                  )}
                </div>
              </div>
            </section>
          ) : (
            /* No results from API */
            <section className="max-w-[860px] mx-auto px-5 py-8">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
                <span className="text-3xl mb-3 block">🔎</span>
                <p className="font-poppins font-bold text-[.95rem] text-[#1A1D2B] mb-2">
                  No flights found for this route and date.
                </p>
                <p className="text-[.78rem] text-[#8E95A9] font-semibold">
                  Try different dates or compare directly across our providers below.
                </p>
              </div>
            </section>
          )}

          {/* Section 3: Provider Comparison Strip */}
          <section className="max-w-[1000px] mx-auto px-5 pb-8">
            <h3 className="font-poppins font-black text-[1.05rem] text-[#1A1D2B] mb-4">Compare This Route Across All Providers</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {PROVIDERS.map(p => {
                const url = p.getUrl(originCode, destCode, depDate, effectiveRet, adults, originCity, destCity);
                return (
                  <div key={p.name} className="bg-white border border-[#E8ECF4] rounded-xl p-4 flex flex-col items-center text-center hover:border-blue-300 hover:shadow-md transition-all">
                    <div className="w-10 h-10 rounded-lg bg-[#F8FAFC] border border-[#E8ECF4] flex items-center justify-center text-xl mb-2">{p.logo}</div>
                    <div className="font-poppins font-bold text-[.85rem] text-[#1A1D2B] mb-1">{p.name}</div>
                    {cheapest && (
                      <div className="text-[.75rem] font-bold text-green-600 mb-2">From £{cheapest.price}</div>
                    )}
                    {!cheapest && (
                      <div className="text-[.72rem] font-semibold text-[#8E95A9] mb-2">Check Price</div>
                    )}
                    <a href={redirectUrl(url, p.name, destCity || destCode, 'flights')}
                      className="w-full bg-[#0066FF] hover:bg-[#0052CC] text-white font-poppins font-bold text-[.72rem] py-2 rounded-lg transition-all">
                      Search {p.name} →
                    </a>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Section D: Cross-sell sections */}
          <section className="max-w-[1000px] mx-auto px-5 pb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Hotels */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5">
                <span className="text-2xl mb-2 block">🏨</span>
                <h4 className="font-poppins font-black text-[.9rem] text-[#1A1D2B] mb-1">Hotels in {destCity || destCode}</h4>
                <p className="text-[.75rem] text-[#5C6378] font-semibold mb-3">Found your flight? Now find your hotel.</p>
                <a href={`/hotels?destination=${encodeURIComponent(destCity || destCode)}${depDate ? `&checkin=${depDate}` : ''}${retDate ? `&checkout=${retDate}` : ''}`}
                  className="inline-block bg-white hover:bg-blue-50 text-[#0066FF] font-poppins font-bold text-[.75rem] px-4 py-2 rounded-lg border border-blue-200 transition-all">
                  Compare Hotels →
                </a>
              </div>

              {/* Car Hire */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-5">
                <span className="text-2xl mb-2 block">🚗</span>
                <h4 className="font-poppins font-black text-[.9rem] text-[#1A1D2B] mb-1">Car Hire at {destCity || destCode}</h4>
                <p className="text-[.75rem] text-[#5C6378] font-semibold mb-3">Need wheels when you land?</p>
                <a href={`/cars?location=${encodeURIComponent(destCity || destCode)}`}
                  className="inline-block bg-white hover:bg-amber-50 text-amber-600 font-poppins font-bold text-[.75rem] px-4 py-2 rounded-lg border border-amber-200 transition-all">
                  Compare Car Hire →
                </a>
              </div>

              {/* Packages */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 rounded-2xl p-5">
                <span className="text-2xl mb-2 block">📦</span>
                <h4 className="font-poppins font-black text-[.9rem] text-[#1A1D2B] mb-1">Complete Package Deal</h4>
                <p className="text-[.75rem] text-[#5C6378] font-semibold mb-3">Save up to 30% by booking flight + hotel together.</p>
                <a href={`/packages?from=${originCode}&to=${destCode}&depart=${depDate}&return=${retDate}`}
                  className="inline-block bg-white hover:bg-purple-50 text-purple-600 font-poppins font-bold text-[.75rem] px-4 py-2 rounded-lg border border-purple-200 transition-all">
                  View Packages →
                </a>
              </div>
            </div>
          </section>

          {/* Section E: Price History */}
          <section className="max-w-[1000px] mx-auto px-5 pb-8">
            <PriceCalendar origin={originCode} dest={destCode} depDate={depDate} />
          </section>
        </div>
      )}

      {/* ── Tips ── */}
      <section className="max-w-[860px] mx-auto px-5 pb-16">
        <div className="bg-[#F8FAFC] border border-[#F1F3F7] rounded-3xl p-8">
          <h3 className="font-poppins font-black text-[1.05rem] text-[#1A1D2B] mb-4">Tips for Finding Cheaper Flights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              ['Book 6–8 weeks ahead', 'The sweet spot for short-haul. Long-haul is best 3–6 months out.'],
              ['Fly mid-week', 'Tuesday & Wednesday departures are consistently cheaper than weekends.'],
              ['Compare nearby airports', 'LTN/STN can be £50–£200 cheaper than LHR for the same route.'],
              ['Use flexible dates', 'A ±3 day window can reveal huge price drops on every provider.'],
            ].map(([title, body]) => (
              <div key={title} className="flex gap-3">
                <div className="w-1.5 flex-shrink-0 rounded-full bg-gradient-to-b from-[#0066FF] to-[#4F46E5] self-stretch" />
                <div>
                  <div className="font-poppins font-bold text-[.85rem] text-[#1A1D2B] mb-0.5">{title}</div>
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

export default function FlightsPage() {
  return <FlightsContent />;
}
