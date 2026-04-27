'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import DateRangePicker from '@/components/DateRangePicker';
import DateMatrixStrip, { type MatrixOption, type ScoutTip } from '@/components/DateMatrixStrip';
import { redirectUrl } from '@/lib/redirect';
import { saveSticky, loadSticky, type StickyFlights } from '@/lib/sticky-search';

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
  { code: 'SCQ', city: 'Santiago de Compostela', country: 'Spain', flag: '🇪🇸' },
  { code: 'GRX', city: 'Granada', country: 'Spain', flag: '🇪🇸' },
  { code: 'MAH', city: 'Menorca', country: 'Spain', flag: '🇪🇸' },
  { code: 'MJV', city: 'Murcia', country: 'Spain', flag: '🇪🇸' },
  // Portugal
  { code: 'FAO', city: 'Faro', country: 'Portugal', flag: '🇵🇹' },
  { code: 'LIS', city: 'Lisbon', country: 'Portugal', flag: '🇵🇹' },
  { code: 'OPO', city: 'Porto', country: 'Portugal', flag: '🇵🇹' },
  { code: 'FNC', city: 'Madeira', country: 'Portugal', flag: '🇵🇹' },
  { code: 'PDL', city: 'Azores', country: 'Portugal', flag: '🇵🇹' },
  // Ireland
  { code: 'DUB', city: 'Dublin', country: 'Ireland', flag: '🇮🇪' },
  { code: 'ORK', city: 'Cork', country: 'Ireland', flag: '🇮🇪' },
  { code: 'SNN', city: 'Shannon', country: 'Ireland', flag: '🇮🇪' },
  { code: 'NOC', city: 'Knock', country: 'Ireland', flag: '🇮🇪' },
  // France
  { code: 'CDG', city: 'Paris', country: 'France', flag: '🇫🇷' },
  { code: 'ORY', city: 'Paris Orly', country: 'France', flag: '🇫🇷' },
  { code: 'NCE', city: 'Nice', country: 'France', flag: '🇫🇷' },
  { code: 'LYS', city: 'Lyon', country: 'France', flag: '🇫🇷' },
  { code: 'MRS', city: 'Marseille', country: 'France', flag: '🇫🇷' },
  { code: 'BOD', city: 'Bordeaux', country: 'France', flag: '🇫🇷' },
  { code: 'TLS', city: 'Toulouse', country: 'France', flag: '🇫🇷' },
  { code: 'NTE', city: 'Nantes', country: 'France', flag: '🇫🇷' },
  { code: 'SXB', city: 'Strasbourg', country: 'France', flag: '🇫🇷' },
  { code: 'BIQ', city: 'Biarritz', country: 'France', flag: '🇫🇷' },
  // Netherlands & Belgium & Luxembourg
  { code: 'AMS', city: 'Amsterdam', country: 'Netherlands', flag: '🇳🇱' },
  { code: 'EIN', city: 'Eindhoven', country: 'Netherlands', flag: '🇳🇱' },
  { code: 'RTM', city: 'Rotterdam', country: 'Netherlands', flag: '🇳🇱' },
  { code: 'BRU', city: 'Brussels', country: 'Belgium', flag: '🇧🇪' },
  { code: 'CRL', city: 'Brussels Charleroi', country: 'Belgium', flag: '🇧🇪' },
  { code: 'LUX', city: 'Luxembourg', country: 'Luxembourg', flag: '🇱🇺' },
  // Germany
  { code: 'BER', city: 'Berlin', country: 'Germany', flag: '🇩🇪' },
  { code: 'MUC', city: 'Munich', country: 'Germany', flag: '🇩🇪' },
  { code: 'FRA', city: 'Frankfurt', country: 'Germany', flag: '🇩🇪' },
  { code: 'HAM', city: 'Hamburg', country: 'Germany', flag: '🇩🇪' },
  { code: 'DUS', city: 'Dusseldorf', country: 'Germany', flag: '🇩🇪' },
  { code: 'CGN', city: 'Cologne', country: 'Germany', flag: '🇩🇪' },
  { code: 'STR', city: 'Stuttgart', country: 'Germany', flag: '🇩🇪' },
  { code: 'NUE', city: 'Nuremberg', country: 'Germany', flag: '🇩🇪' },
  { code: 'HAJ', city: 'Hannover', country: 'Germany', flag: '🇩🇪' },
  { code: 'BRE', city: 'Bremen', country: 'Germany', flag: '🇩🇪' },
  // Austria & Switzerland
  { code: 'VIE', city: 'Vienna', country: 'Austria', flag: '🇦🇹' },
  { code: 'SZG', city: 'Salzburg', country: 'Austria', flag: '🇦🇹' },
  { code: 'INN', city: 'Innsbruck', country: 'Austria', flag: '🇦🇹' },
  { code: 'GRZ', city: 'Graz', country: 'Austria', flag: '🇦🇹' },
  { code: 'ZRH', city: 'Zurich', country: 'Switzerland', flag: '🇨🇭' },
  { code: 'GVA', city: 'Geneva', country: 'Switzerland', flag: '🇨🇭' },
  { code: 'BSL', city: 'Basel', country: 'Switzerland', flag: '🇨🇭' },
  { code: 'BRN', city: 'Bern', country: 'Switzerland', flag: '🇨🇭' },
  // Italy
  { code: 'FCO', city: 'Rome', country: 'Italy', flag: '🇮🇹' },
  { code: 'CIA', city: 'Rome Ciampino', country: 'Italy', flag: '🇮🇹' },
  { code: 'MXP', city: 'Milan Malpensa', country: 'Italy', flag: '🇮🇹' },
  { code: 'LIN', city: 'Milan Linate', country: 'Italy', flag: '🇮🇹' },
  { code: 'BGY', city: 'Milan Bergamo', country: 'Italy', flag: '🇮🇹' },
  { code: 'VCE', city: 'Venice', country: 'Italy', flag: '🇮🇹' },
  { code: 'TSF', city: 'Treviso', country: 'Italy', flag: '🇮🇹' },
  { code: 'FLR', city: 'Florence', country: 'Italy', flag: '🇮🇹' },
  { code: 'PSA', city: 'Pisa', country: 'Italy', flag: '🇮🇹' },
  { code: 'NAP', city: 'Naples', country: 'Italy', flag: '🇮🇹' },
  { code: 'BLQ', city: 'Bologna', country: 'Italy', flag: '🇮🇹' },
  { code: 'TRN', city: 'Turin', country: 'Italy', flag: '🇮🇹' },
  { code: 'VRN', city: 'Verona', country: 'Italy', flag: '🇮🇹' },
  { code: 'BRI', city: 'Bari', country: 'Italy', flag: '🇮🇹' },
  { code: 'BDS', city: 'Brindisi', country: 'Italy', flag: '🇮🇹' },
  { code: 'CTA', city: 'Catania (Sicily)', country: 'Italy', flag: '🇮🇹' },
  { code: 'PMO', city: 'Palermo (Sicily)', country: 'Italy', flag: '🇮🇹' },
  { code: 'CAG', city: 'Cagliari (Sardinia)', country: 'Italy', flag: '🇮🇹' },
  { code: 'OLB', city: 'Olbia (Sardinia)', country: 'Italy', flag: '🇮🇹' },
  { code: 'GOA', city: 'Genoa', country: 'Italy', flag: '🇮🇹' },
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
  { code: 'GOT', city: 'Gothenburg', country: 'Sweden', flag: '🇸🇪' },
  { code: 'MMX', city: 'Malmo', country: 'Sweden', flag: '🇸🇪' },
  { code: 'BGO', city: 'Bergen', country: 'Norway', flag: '🇳🇴' },
  { code: 'SVG', city: 'Stavanger', country: 'Norway', flag: '🇳🇴' },
  { code: 'TRD', city: 'Trondheim', country: 'Norway', flag: '🇳🇴' },
  { code: 'BLL', city: 'Billund', country: 'Denmark', flag: '🇩🇰' },
  { code: 'AAL', city: 'Aalborg', country: 'Denmark', flag: '🇩🇰' },
  { code: 'TMP', city: 'Tampere', country: 'Finland', flag: '🇫🇮' },
  // Balkans
  { code: 'TIA', city: 'Tirana', country: 'Albania', flag: '🇦🇱' },
  { code: 'BEG', city: 'Belgrade', country: 'Serbia', flag: '🇷🇸' },
  { code: 'SJJ', city: 'Sarajevo', country: 'Bosnia', flag: '🇧🇦' },
  { code: 'SKP', city: 'Skopje', country: 'North Macedonia', flag: '🇲🇰' },
  { code: 'TGD', city: 'Podgorica', country: 'Montenegro', flag: '🇲🇪' },
  { code: 'TIV', city: 'Tivat', country: 'Montenegro', flag: '🇲🇪' },
  { code: 'PRN', city: 'Pristina', country: 'Kosovo', flag: '🇽🇰' },
  { code: 'LJU', city: 'Ljubljana', country: 'Slovenia', flag: '🇸🇮' },
  // Eastern Europe
  { code: 'PRG', city: 'Prague', country: 'Czechia', flag: '🇨🇿' },
  { code: 'BUD', city: 'Budapest', country: 'Hungary', flag: '🇭🇺' },
  { code: 'WAW', city: 'Warsaw', country: 'Poland', flag: '🇵🇱' },
  { code: 'KRK', city: 'Krakow', country: 'Poland', flag: '🇵🇱' },
  { code: 'GDN', city: 'Gdansk', country: 'Poland', flag: '🇵🇱' },
  { code: 'WRO', city: 'Wroclaw', country: 'Poland', flag: '🇵🇱' },
  { code: 'POZ', city: 'Poznan', country: 'Poland', flag: '🇵🇱' },
  { code: 'KTW', city: 'Katowice', country: 'Poland', flag: '🇵🇱' },
  { code: 'OTP', city: 'Bucharest', country: 'Romania', flag: '🇷🇴' },
  { code: 'SOF', city: 'Sofia', country: 'Bulgaria', flag: '🇧🇬' },
  { code: 'TLL', city: 'Tallinn', country: 'Estonia', flag: '🇪🇪' },
  { code: 'RIX', city: 'Riga', country: 'Latvia', flag: '🇱🇻' },
  { code: 'VNO', city: 'Vilnius', country: 'Lithuania', flag: '🇱🇹' },
  { code: 'KUN', city: 'Kaunas', country: 'Lithuania', flag: '🇱🇹' },
  { code: 'BTS', city: 'Bratislava', country: 'Slovakia', flag: '🇸🇰' },
  { code: 'BRQ', city: 'Brno', country: 'Czechia', flag: '🇨🇿' },
  { code: 'CLJ', city: 'Cluj-Napoca', country: 'Romania', flag: '🇷🇴' },
  { code: 'VAR', city: 'Varna', country: 'Bulgaria', flag: '🇧🇬' },
  { code: 'BOJ', city: 'Burgas', country: 'Bulgaria', flag: '🇧🇬' },
  { code: 'TBS', city: 'Tbilisi', country: 'Georgia', flag: '🇬🇪' },
  { code: 'EVN', city: 'Yerevan', country: 'Armenia', flag: '🇦🇲' },
  { code: 'GYD', city: 'Baku', country: 'Azerbaijan', flag: '🇦🇿' },
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
  { code: 'SID', city: 'Sal', country: 'Cabo Verde', flag: '🇨🇻' },
  { code: 'BVC', city: 'Boa Vista', country: 'Cabo Verde', flag: '🇨🇻' },
  { code: 'RAI', city: 'Praia', country: 'Cabo Verde', flag: '🇨🇻' },
  { code: 'VXE', city: 'Mindelo', country: 'Cabo Verde', flag: '🇨🇻' },
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

/* ═══════════════════════════════════════════════════════════════════════════
   CITY GROUPS — metro codes covering multiple airports
   ═══════════════════════════════════════════════════════════════════════════ */

const CITY_GROUPS = [
  { code: 'LON', name: 'London (Any)', country: 'United Kingdom', flag: '🇬🇧', airports: ['LHR','LGW','STN','LTN','LCY','SEN'] },
  { code: 'NYC', name: 'New York (Any)', country: 'United States', flag: '🇺🇸', airports: ['JFK','EWR','LGA'] },
  { code: 'PAR', name: 'Paris (Any)', country: 'France', flag: '🇫🇷', airports: ['CDG','ORY','BVA'] },
  { code: 'MIL', name: 'Milan (Any)', country: 'Italy', flag: '🇮🇹', airports: ['MXP','LIN','BGY'] },
  { code: 'TYO', name: 'Tokyo (Any)', country: 'Japan', flag: '🇯🇵', airports: ['HND','NRT'] },
  { code: 'BUE', name: 'Buenos Aires (Any)', country: 'Argentina', flag: '🇦🇷', airports: ['EZE','AEP'] },
  { code: 'STO', name: 'Stockholm (Any)', country: 'Sweden', flag: '🇸🇪', airports: ['ARN','BMA','NYO'] },
  { code: 'DXB', name: 'Dubai (Any)', country: 'UAE', flag: '🇦🇪', airports: ['DXB','DWC'] },
  { code: 'SYD', name: 'Sydney (Any)', country: 'Australia', flag: '🇦🇺', airports: ['SYD'] },
  { code: 'MOW', name: 'Moscow (Any)', country: 'Russia', flag: '🇷🇺', airports: ['SVO','DME','VKO'] },
  { code: 'SAO', name: 'São Paulo (Any)', country: 'Brazil', flag: '🇧🇷', airports: ['GRU','CGH','VCP'] },
  { code: 'JKT', name: 'Jakarta (Any)', country: 'Indonesia', flag: '🇮🇩', airports: ['CGK','HLP'] },
  { code: 'WAS', name: 'Washington (Any)', country: 'United States', flag: '🇺🇸', airports: ['IAD','DCA','BWI'] },
];
type CityGroup = typeof CITY_GROUPS[number];

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
  // Trip.com flights URL contract (verified live 2026-04-19):
  //   - `/flights/<o>-to-<d>/tickets-<O>-<D>` is the ONE-WAY canonical path.
  //     Passing `&rdate=...` to that path is silently ignored — the page
  //     stays in one-way mode with the return date dropped.
  //   - `/flights/showfarefirst?triptype=RT&ddate=...&rdate=...` is the
  //     documented round-trip search entry. Round-trip radio selects
  //     correctly and both legs are recognised.
  //   - For one-way we keep the pretty canonical path (it's SEO-friendly and
  //     works).
  const oL = o.toLowerCase();
  const dL = d.toLowerCase();
  const common = `dcity=${o}&acity=${d}&ddate=${dep}&adult=${adults}&class=y&Allianceid=8023009&SID=303363796&trip_sub3=D15021113`;
  if (ret) {
    return `https://www.trip.com/flights/showfarefirst?triptype=RT&${common}&rdate=${ret}&quantity=${adults}`;
  }
  return `https://www.trip.com/flights/${oL}-to-${dL}/tickets-${o}-${d}?${common}`;
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

/* ───────────────────────────────────────────────────────────────────────────
   mergeFlightsKeepAllDuffel — chronic regression guard.

   Every TP row is an affiliate redirect (we lose the customer + margin).
   Every Duffel row is direct-bookable on jetmeaway.co.uk (we earn margin).
   So Duffel rows MUST always appear on top of the search results, regardless
   of price. The previous `sort(byPrice).slice(0, 30)` repeatedly buried Duffel
   offers behind cheaper TP "indicative" decoys — fixed many times, regressed
   many times.

   Rule: keep every Duffel row (offer_id present), cap only the TP/redirect
   rows to the top-N cheapest. Final order = Duffel-cheapest-first, then
   TP-cheapest-first.

   Read memory project_duffel_top_of_search.md before changing this.
   ─────────────────────────────────────────────────────────────────────────── */
const TP_ROW_CAP = 30;
function mergeFlightsKeepAllDuffel(rows: FlightResult[]): FlightResult[] {
  const direct: FlightResult[] = [];
  const redirect: FlightResult[] = [];
  for (const f of rows) {
    if (f.source === 'duffel' && f.offer_id) direct.push(f);
    else redirect.push(f);
  }
  direct.sort((a, b) => a.price - b.price);
  redirect.sort((a, b) => a.price - b.price);
  return [...direct, ...redirect.slice(0, TP_ROW_CAP)];
}

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

type AnyAirport = { code: string; name: string; city?: string; country?: string; flag?: string; isGroup?: boolean };

function AutocompleteFrom({ value, onChange, initialCode }: {
  value: string;
  onChange: (code: string, name: string) => void;
  initialCode: string;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<AnyAirport | null>(null);
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
    const code = initialCode.toUpperCase();
    const grp = CITY_GROUPS.find(g => g.code === code);
    if (grp) { setQ(`${grp.name} (${grp.code})`); setChosen({ ...grp, isGroup: true }); onChangeRef.current(grp.code, grp.name); return; }
    const uk = UK_AIRPORTS.find(a => a.code === code);
    if (uk) { setQ(`${uk.name} (${uk.code})`); setChosen(uk); onChangeRef.current(uk.code, uk.city); return; }
    const dest = DESTINATIONS.find(d => d.code === code);
    if (dest) { setQ(`${dest.city} (${dest.code})`); setChosen({ code: dest.code, name: dest.city, country: dest.country, flag: dest.flag }); onChangeRef.current(dest.code, dest.city); }
  }, [initialCode]);

  const lq = q.toLowerCase();
  let filtered: AnyAirport[];
  if (q.length >= 1) {
    const groups: AnyAirport[] = CITY_GROUPS
      .filter(g => g.code.toLowerCase().includes(lq) || g.name.toLowerCase().includes(lq) || g.country.toLowerCase().includes(lq))
      .map(g => ({ ...g, isGroup: true }));
    const ukAps: AnyAirport[] = UK_AIRPORTS
      .filter(a => a.code.toLowerCase().includes(lq) || a.name.toLowerCase().includes(lq) || a.city.toLowerCase().includes(lq));
    const globalAps: AnyAirport[] = DESTINATIONS
      .filter(d => d.code.toLowerCase().startsWith(lq) || d.city.toLowerCase().includes(lq) || d.country.toLowerCase().includes(lq))
      .map(d => ({ code: d.code, name: d.city, country: d.country, flag: d.flag }));
    filtered = [...groups, ...ukAps, ...globalAps].slice(0, 10);
  } else {
    filtered = [
      ...CITY_GROUPS.map(g => ({ ...g, isGroup: true })),
      ...UK_AIRPORTS.slice(0, 6),
    ];
  }

  return (
    <div ref={ref} className="relative">
      <input type="text" placeholder="City or airport — e.g. London, DXB, MAN" value={q} autoComplete="off"
        onChange={e => { setQ(e.target.value); setChosen(null); onChange('', ''); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className="w-full px-4 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.9rem] font-semibold text-[#1A1D2B] outline-none focus:border-[#0066FF] focus:bg-white transition-all placeholder:text-[#B0B8CC]" />
      {chosen && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <span className="text-[.7rem] font-black text-[#0066FF] bg-blue-50 px-2 py-0.5 rounded-md">{chosen.code}</span>
        </div>
      )}
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 w-full mt-1.5 bg-white border border-[#E8ECF4] rounded-2xl shadow-2xl overflow-auto max-h-64">
          {filtered.map(a => (
            <li key={a.code}
              onMouseDown={() => { setQ(`${a.name} (${a.code})`); setChosen(a); onChange(a.code, a.name ?? ''); setOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors border-b border-[#F1F3F7] last:border-0 ${chosen?.code === a.code ? 'bg-blue-50' : ''}`}>
              {a.isGroup ? (
                <>
                  <span className="text-xl flex-shrink-0">{a.flag ?? '🌍'}</span>
                  <div className="flex-1 min-w-0">
                    <span className="font-poppins font-bold text-[.85rem] text-[#1A1D2B]">{a.name}</span>
                    <span className="text-[.7rem] text-[#8E95A9] ml-1.5">All airports</span>
                  </div>
                  <span className="font-mono text-[.68rem] font-bold text-[#8E95A9]">{a.code}</span>
                </>
              ) : a.flag ? (
                <>
                  <span className="text-xl flex-shrink-0">{a.flag}</span>
                  <div className="flex-1 min-w-0">
                    <span className="font-poppins font-bold text-[.85rem] text-[#1A1D2B]">{a.name}</span>
                    {a.country && <span className="text-[.72rem] text-[#8E95A9] ml-1.5">{a.country}</span>}
                  </div>
                  <span className="font-mono text-[.68rem] font-bold text-[#8E95A9]">{a.code}</span>
                </>
              ) : (
                <>
                  <span className="font-black text-[.75rem] text-[#0066FF] w-10 flex-shrink-0 bg-blue-50 px-1.5 py-0.5 rounded text-center">{a.code}</span>
                  <span className="font-poppins font-bold text-[.83rem] text-[#1A1D2B]">{a.name}</span>
                </>
              )}
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
  type ToItem = { code: string; city: string; country: string; flag: string; isGroup?: boolean };
  let toFiltered: ToItem[];
  if (q.length >= 1) {
    const groups: ToItem[] = CITY_GROUPS
      .filter(g => g.code.toLowerCase().includes(lq) || g.name.toLowerCase().includes(lq) || g.country.toLowerCase().includes(lq))
      .map(g => ({ code: g.code, city: g.name, country: g.country, flag: g.flag, isGroup: true }));
    const dests: ToItem[] = DESTINATIONS
      .filter(d => d.city.toLowerCase().includes(lq) || d.country.toLowerCase().includes(lq) || d.code.toLowerCase().startsWith(lq));
    toFiltered = [...groups, ...dests].slice(0, 10);
  } else {
    toFiltered = [
      ...CITY_GROUPS.map(g => ({ code: g.code, city: g.name, country: g.country, flag: g.flag, isGroup: true as const })),
      ...DESTINATIONS.slice(0, 3),
    ];
  }

  return (
    <div ref={ref} className="relative">
      <input type="text" placeholder="City or airport — e.g. Barcelona, BCN, DXB" value={q} autoComplete="off"
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
          {toFiltered.map(d => (
            <li key={d.code}
              onMouseDown={() => { setQ(`${d.city} (${d.code})`); setChosen(DESTINATIONS.find(x => x.code === d.code) ?? null); onChange(d.code, d.city); setOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors border-b border-[#F1F3F7] last:border-0 ${chosen?.code === d.code ? 'bg-blue-50' : ''}`}>
              <span className="text-xl">{d.flag}</span>
              <div className="flex-1">
                <span className="font-poppins font-bold text-[.85rem] text-[#1A1D2B]">{d.city}</span>
                <span className="text-[.72rem] text-[#8E95A9] ml-1.5">{d.isGroup ? 'All airports' : d.country}</span>
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
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/flights/deals')
      .then(r => r.json())
      .then(d => {
        setDeals(d.deals || []);
        setFetchedAt(typeof d.fetchedAt === 'string' ? d.fetchedAt : null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  /** "2h ago" / "just now" — honest replacement for the old "Updated every 6 hours" claim. */
  const relativeUpdated = (() => {
    if (!fetchedAt) return null;
    const ts = Date.parse(fetchedAt);
    if (!Number.isFinite(ts)) return null;
    const mins = Math.max(0, Math.round((Date.now() - ts) / 60000));
    if (mins < 2) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.round(hrs / 24);
    return `${days}d ago`;
  })();

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
        <span className="text-[.68rem] text-[#8E95A9] font-semibold">
          Indicative prices{relativeUpdated ? ` · Updated ${relativeUpdated}` : ''} · Click to search live
        </span>
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
                <img src={logo} alt={deal.airline} className="w-5 h-5 object-contain opacity-70" loading="lazy"
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
  'Scanning Expedia...',
  'Checking Kiwi.com...',
  'Finding you the best deal...',
];

function FlightSkeletonCard() {
  return (
    <div className="bg-white border border-[#E8ECF4] rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-[200px]">
          <div className="w-10 h-10 rounded-full bg-[#F1F3F7] animate-pulse" />
          <div className="space-y-2">
            <div className="h-3 w-24 bg-[#F1F3F7] rounded animate-pulse" />
            <div className="h-2.5 w-16 bg-[#F1F3F7] rounded animate-pulse" />
          </div>
        </div>
        <div className="flex items-center gap-4 flex-1 min-w-[220px]">
          <div className="text-center space-y-1.5">
            <div className="h-4 w-14 bg-[#F1F3F7] rounded animate-pulse" />
            <div className="h-2.5 w-10 bg-[#F1F3F7] rounded animate-pulse" />
          </div>
          <div className="flex-1 h-px bg-[#F1F3F7] relative">
            <div className="absolute left-1/2 -top-1.5 w-3 h-3 rounded-full bg-[#F1F3F7] animate-pulse" style={{ transform: 'translateX(-50%)' }} />
          </div>
          <div className="text-center space-y-1.5">
            <div className="h-4 w-14 bg-[#F1F3F7] rounded animate-pulse" />
            <div className="h-2.5 w-10 bg-[#F1F3F7] rounded animate-pulse" />
          </div>
        </div>
        <div className="text-right space-y-2">
          <div className="h-5 w-20 bg-[#F1F3F7] rounded animate-pulse ml-auto" />
          <div className="h-8 w-24 bg-[#F1F3F7] rounded-full animate-pulse ml-auto" />
        </div>
      </div>
    </div>
  );
}

function LoadingState({ origin, dest }: { origin: string; dest: string }) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const msgTimer = setInterval(() => setMsgIdx(i => (i + 1) % LOADING_MSGS.length), 500);
    const progTimer = setInterval(() => setProgress(p => Math.min(p + 1.2, 95)), 50);
    return () => { clearInterval(msgTimer); clearInterval(progTimer); };
  }, []);

  return (
    <section className="max-w-[1000px] mx-auto px-5 py-8">
      {/* Status banner — progress bar + rotating provider message, no spinner */}
      <div className="bg-white border border-[#E8ECF4] rounded-2xl p-5 shadow-sm mb-5">
        <div className="w-full bg-[#F1F3F7] rounded-full h-1.5 mb-3 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#0066FF] to-[#4F46E5] rounded-full transition-all duration-100" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="text-[.85rem] font-bold text-[#1A1D2B]">{LOADING_MSGS[msgIdx]}</span>
          <p className="text-[.72rem] text-[#8E95A9] font-semibold">Building results for <strong className="text-[#1A1D2B]">{origin} → {dest}</strong></p>
        </div>
      </div>
      {/* Skeleton result cards — shape-of-content placeholders */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => <FlightSkeletonCard key={i} />)}
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
  // Scout poll state — shown while the v1 flight_search is still running.
  // `scoutActive` flips true when we kick off a poll and false once either
  // TP reports search_finished or we hit the time ceiling. `scoutAirlineCount`
  // updates every poll so the user sees results growing live.
  const [scoutActive, setScoutActive] = useState(false);
  const [scoutAirlineCount, setScoutAirlineCount] = useState(0);

  // Date-matrix strip (D−3 … D+3) — populated after every successful search.
  // Cached server-side in KV for 1h, so shifting dates and coming back is
  // instant for the duration of a user's session.
  const [dateStrip, setDateStrip] = useState<MatrixOption[]>([]);
  const [dateStripLoading, setDateStripLoading] = useState(false);
  const [dateScoutTip, setDateScoutTip] = useState<ScoutTip | null>(null);
  // How many nights the user intended — used by handleDateStripSelect
  // and handleScoutTip to reconstruct the round-trip return date for
  // a new departure (we lock the trip length on shift, per spec).
  const [intendedNights, setIntendedNights] = useState<number | null>(null);
  // Bumped whenever a strip click shifts the dates. The useEffect below
  // waits for state to flush and then re-runs handleSearch with fresh
  // depDate/retDate — we can't call handleSearch from the click handler
  // directly because its closure still holds the old dates at click time.
  const [dateShiftTrigger, setDateShiftTrigger] = useState(0);

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

    // Sticky search — used to fill ANY field the URL doesn't supply. URL
    // always wins so shareable links stay honest. We read once on mount.
    const sticky = loadSticky<StickyFlights>('flights');

    // Origin priority: URL param → sticky search → saved-airport preference
    // → London (LON). London is the house default; no geolocation guessing.
    if (!o) {
      const saved = localStorage.getItem('jma_departure_airport');
      setInitOrigin(sticky?.origin || saved || 'LON');
    } else {
      setInitOrigin(o);
    }

    if (d) {
      setInitDest(d);
    } else if (sticky?.dest) {
      setInitDest(sticky.dest);
      if (sticky.destCity) setDestCity(sticky.destCity);
    }
    if (destCityParam && d) setDestCity(destCityParam);
    if (dep) {
      setDepDate(dep);
    } else if (sticky?.departure) {
      // Don't restore stale dates — past departures get dropped silently.
      const today = new Date().toISOString().split('T')[0];
      if (sticky.departure >= today) setDepDate(sticky.departure);
    }
    if (ret) {
      setRetDate(ret);
      setTripType('return');
    } else if (sticky?.return) {
      const today = new Date().toISOString().split('T')[0];
      if (sticky.return >= today) {
        setRetDate(sticky.return);
        setTripType(sticky.tripType === 'one-way' ? 'one-way' : 'return');
      }
    } else if (sticky?.tripType === 'one-way') {
      setTripType('one-way');
    }
    // Pax — only restore if the URL doesn't include them at all.
    const urlAdults = p.get('adults');
    if (!urlAdults && sticky?.adults) setAdults(Math.min(9, Math.max(1, sticky.adults)));
    const urlChildren = p.get('children');
    if (!urlChildren && sticky?.children) setChildren(Math.min(8, Math.max(0, sticky.children)));
    const urlInfants = p.get('infants');
    if (!urlInfants && sticky?.infants) setInfants(Math.min(8, Math.max(0, sticky.infants)));

    const cab = (p.get('cabin') || '').toLowerCase();
    if (cab === 'premium_economy' || cab === 'business' || cab === 'first') {
      setCabinClass(cab);
    } else if (!cab && sticky?.cabin) {
      const sc = sticky.cabin.toLowerCase();
      if (sc === 'premium_economy' || sc === 'business' || sc === 'first' || sc === 'economy') {
        setCabinClass(sc as typeof cabinClass);
      }
    }
  }, []);

  /**
   * Back / forward button support. The DateMatrixStrip uses pushState to
   * update `?departure=…&return=…` without a navigation — so the browser
   * history entry exists but React state doesn't auto-rehydrate. This
   * listener syncs state to URL on popstate and re-fires the search so
   * the results match what the URL says.
   */
  useEffect(() => {
    const onPop = () => {
      const p = new URLSearchParams(window.location.search);
      const dep = p.get('departure') || '';
      const ret = p.get('return') || '';
      if (dep) setDepDate(dep);
      if (ret) {
        setRetDate(ret);
        setTripType('return');
      } else {
        setRetDate('');
        setTripType('one-way');
      }
      // Defer the re-search to the next tick so state commits first —
      // same pattern as handleDateStripChange. Any truthy bump works.
      setDateShiftTrigger(t => t + 1);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const today = new Date().toISOString().split('T')[0];

  const handleSearch = useCallback(async () => {
    if (!originCode) { alert('Please select a departure airport'); return; }
    if (!destCode) { alert('Please select a destination'); return; }
    if (!depDate) { alert('Please select a departure date'); return; }
    if (tripType === 'return' && !retDate) {
      alert('Please select a return date — or switch to one-way.');
      return;
    }

    setFlights(null);
    setApiError('');
    setLoading(true);
    setSearched(true);
    setScoutActive(false);
    setScoutAirlineCount(0);

    // Scroll the results section into view IMMEDIATELY so mobile users
    // see the loading state instead of staring at the search form. Real
    // Clarity recording (2026-04-27) caught a visitor clicking the
    // Search button THREE times in 35s because the loader was rendering
    // below the fold on their phone — they never knew the search fired.
    // setTimeout 50ms gives React a tick to mount the loading section
    // before we try to scroll to its ref.
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);

    // Persist this search so the user comes back to a pre-filled form.
    saveSticky<StickyFlights>('flights', {
      origin: originCode,
      originCity,
      dest: destCode,
      destCity,
      departure: depDate,
      return: tripType === 'return' ? retDate : '',
      adults,
      children,
      infants,
      cabin: cabinClass,
      tripType,
    });

    // Shared across the v1 poll + the Duffel parallel arm so Duffel
    // offers (which carry offer_id for direct booking) always win for
    // the same flight key — v1 GDS entries never overwrite them.
    const mergedByKey = new Map<string, FlightResult>();

    // ── Fire Duffel + v3 cached in parallel via the original endpoint.
    // Duffel direct-bookable offers must still appear alongside the new
    // v1 GDS coverage. Non-awaited — merges into results as soon as it
    // resolves.
    const duffelParams = new URLSearchParams({
      origin: originCode,
      destination: destCode,
      departure: depDate,
      adults: String(adults),
    });
    if (children > 0) duffelParams.set('children', String(children));
    if (infants > 0) duffelParams.set('infants', String(infants));
    if (cabinClass !== 'economy') duffelParams.set('cabin', cabinClass);
    if (retDate && tripType === 'return') duffelParams.set('return', retDate);

    const duffelPromise = fetch(`/api/flights?${duffelParams}`)
      .then(r => r.json())
      .then((data: { flights?: FlightResult[]; error?: string }) => {
        if (!data || data.error || !data.flights) return;
        for (const f of data.flights) {
          const depDay = (f.departure_at || '').slice(0, 10);
          const key = f.flight_number
            ? `${f.flight_number}-${depDay}`
            : `${f.airlineCode}-${depDay}-${f.duration_to}`;
          const existing = mergedByKey.get(key);
          // Direct-bookable wins. Previously we did cheapest-wins which
          // hid every Duffel offer behind cheaper TP-cached "indicative"
          // prices that aren't actually bookable on-site. That stripped
          // every "Book Direct" button from the UI even though we had
          // live bookable inventory.
          //
          // New rule:
          //  • Duffel offer (source='duffel' && offer_id) always wins
          //    over a non-Duffel row — price be damned, it's the only
          //    one the user can actually book here.
          //  • Among two Duffel rows, cheaper wins.
          //  • Among two non-Duffel rows, cheaper wins.
          const incomingDuffel = f.source === 'duffel' && !!f.offer_id;
          const existingDuffel = existing && existing.source === 'duffel' && !!existing.offer_id;
          if (!existing) { mergedByKey.set(key, f); continue; }
          if (incomingDuffel && !existingDuffel) { mergedByKey.set(key, f); continue; }
          if (!incomingDuffel && existingDuffel) continue;
          if (f.price < existing.price) { mergedByKey.set(key, f); continue; }
        }
        // Render immediately if v1 hasn't surfaced anything yet.
        // Slicing preserves ALL Duffel direct-bookable rows (any price) and
        // caps only the affiliate-redirect rows, so the Book Now CTA never
        // disappears just because TP returned 30 cheap-looking decoys.
        const merged = mergeFlightsKeepAllDuffel(Array.from(mergedByKey.values()));
        setFlights(merged);
        setScoutAirlineCount(new Set(merged.map(f => f.airlineCode)).size);
      })
      .catch(() => { /* v1 will carry the search on its own */ });

    try {
      // ── Kick off a TP v1 async search. This actively queries GDS agents
      // (Amadeus, Sabre…) — unlike v3's cached-only endpoint — so carriers
      // like PIA which only list through GDS finally surface.
      const initRes = await fetch('/api/flights/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: originCode,
          destination: destCode,
          departure: depDate,
          return: retDate && tripType === 'return' ? retDate : null,
          adults,
          children,
          infants,
          cabin: cabinClass === 'premium_economy' ? 'economy' : cabinClass,
        }),
      });
      const initData = await initRes.json();

      if (!initRes.ok || !initData.searchId) {
        // v1 init misfired — wait for Duffel to land, then fall back to
        // v3 only if Duffel also came up empty.
        await duffelPromise;
        if (mergedByKey.size === 0) {
          await searchV3Fallback();
          return;
        }
        setLoading(false);
        setScoutActive(false);
        return;
      }

      setLoading(false);
      setScoutActive(true);
      setFlights([]); // render empty list so the Scout strip attaches to the results area

      // ── Polling loop. Poll on a rising cadence (0.8s → 1.5s) to catch
      // fast NDC results early without hammering the edge function for
      // slower GDS stragglers. Cap at 20s total.
      const pollDelays = [800, 1200, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500];
      const startedAt = Date.now();
      let consecutiveEmptyDeltas = 0;
      let isComplete = false;

      for (const delay of pollDelays) {
        await new Promise(r => setTimeout(r, delay));
        if (Date.now() - startedAt > 20000) break;

        const pollRes = await fetch(`/api/flights/results?searchId=${encodeURIComponent(initData.searchId)}`);
        const pollData = await pollRes.json();
        if (!pollRes.ok) continue;

        const before = mergedByKey.size;
        for (const f of (pollData.flights || []) as FlightResult[]) {
          const depDay = (f.departure_at || '').slice(0, 10);
          const key = f.flight_number
            ? `${f.flight_number}-${depDay}`
            : `${f.airlineCode}-${depDay}-${f.duration_to}`;
          const existing = mergedByKey.get(key);
          // Direct-bookable wins. A v1 GDS row (no offer_id) must NOT
          // displace a Duffel row even if cheaper — we'd lose the
          // Book Direct button and strand the customer on an affiliate
          // redirect. Among v1/v1 collisions, cheaper still wins.
          const existingDuffel = existing && existing.source === 'duffel' && !!existing.offer_id;
          if (!existing) { mergedByKey.set(key, f); continue; }
          if (existingDuffel) continue;
          if (f.price < existing.price) mergedByKey.set(key, f);
        }

        // ⚠ DO NOT replace with a flat sort+slice — Duffel rows must
        // always show on top regardless of price. See mergeFlightsKeepAllDuffel.
        const merged = mergeFlightsKeepAllDuffel(Array.from(mergedByKey.values()));
        setFlights(merged);
        setScoutAirlineCount(new Set(merged.map(f => f.airlineCode)).size);

        if (pollData.complete) { isComplete = true; break; }
        // Two consecutive empty deltas → agents are done reporting;
        // stop polling early rather than grinding to the 20s cap.
        if (mergedByKey.size === before) {
          consecutiveEmptyDeltas++;
          if (consecutiveEmptyDeltas >= 2) break;
        } else {
          consecutiveEmptyDeltas = 0;
        }
      }

      setScoutActive(false);

      // Give Duffel a final moment to land before deciding whether to
      // fall back — its offers should be merged into the same results
      // list when they arrive late.
      await duffelPromise;

      // If TP v1 AND Duffel both returned nothing (rare on niche
      // routes), fall back to the v3 cached path so we still show
      // SOMETHING useful.
      if (mergedByKey.size === 0) {
        await searchV3Fallback();
        return;
      }

      // Re-render once after the final Duffel merge so late-arriving
      // bookable offers appear in the list.
      // ⚠ DO NOT replace with a flat sort+slice — Duffel rows must
      // always show on top regardless of price. See mergeFlightsKeepAllDuffel.
      const finalMerged = mergeFlightsKeepAllDuffel(Array.from(mergedByKey.values()));
      setFlights(finalMerged);
      setScoutAirlineCount(new Set(finalMerged.map(f => f.airlineCode)).size);

      // Fire the date-strip now that the main results have landed.
      void loadDateStrip(Array.from(mergedByKey.values())[0]?.price ?? null);
      void isComplete; // reserved for future telemetry

      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      return;
    } catch {
      // v1 failed entirely — wait on Duffel and fall back to v3 cached
      // only if Duffel also came up empty. This ensures the ONE thing
      // a user never sees is a blank results page due to a transient
      // TP hiccup.
      await duffelPromise;
      if (mergedByKey.size === 0) {
        await searchV3Fallback();
        return;
      }
      setLoading(false);
      setScoutActive(false);
      return;
    }

    async function searchV3Fallback() {
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
        setScoutActive(false);
        return;
      }

      setFlights(data.flights || []);
      setLoading(false);
      setScoutActive(false);
      void loadDateStrip((data.flights && data.flights.length > 0) ? data.flights[0].price : null);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }

    async function loadDateStrip(baseHint: number | null) {
      // Fire-and-forget: load the D−3…D+3 price strip. Travelpayouts-only
      // + KV-cached so this never blocks the main results render. If it
      // fails we silently render nothing — the page stays fully usable.
      setDateStripLoading(true);
      setDateStrip([]);
      setDateScoutTip(null);
      try {
        const stripParams = new URLSearchParams({
          origin: originCode,
          destination: destCode,
          departure: depDate,
          mode: 'datestrip',
        });
        if (retDate && tripType === 'return') stripParams.set('return', retDate);
        if (baseHint !== null) stripParams.set('basePrice', String(Math.round(baseHint)));
        const sRes = await fetch(`/api/flights?${stripParams}`);
        const sData = await sRes.json();
        if (sData.success && Array.isArray(sData.dates)) {
          const effectiveRet = tripType === 'return' ? retDate : null;
          const userNights = typeof sData.intendedNights === 'number' ? sData.intendedNights : null;
          setIntendedNights(userNights);
          type StripCell = {
            dep: string;
            ret: string | null;
            cheapest_price_gbp: number | null;
            actual_nights?: number | null;
            actual_return?: string | null;
          };
          const mapped: MatrixOption[] = sData.dates.map((c: StripCell) => {
            const d = new Date(c.dep + 'T00:00:00Z');
            const r = c.ret ? new Date(c.ret + 'T00:00:00Z') : null;
            const label = r
              ? `${d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })} – ${r.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })}`
              : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
            let subLabel: string | undefined;
            if (
              userNights !== null &&
              typeof c.actual_nights === 'number' &&
              c.actual_nights > 0 &&
              c.actual_nights !== userNights
            ) {
              subLabel = `${c.actual_nights}n trip`;
            }
            const clickRet =
              subLabel && c.actual_return ? c.actual_return : c.ret;
            return {
              id: c.dep,
              label,
              price: c.cheapest_price_gbp,
              isSelected: c.dep === depDate && (c.ret || null) === (effectiveRet || null),
              metadata: { dep: c.dep, ret: clickRet },
              subLabel,
            };
          });
          setDateStrip(mapped);
          if (sData.scoutTip && typeof sData.scoutTip.price === 'number') {
            setDateScoutTip(sData.scoutTip as ScoutTip);
          }
        }
      } catch {
        // Silent fail — strip is a nice-to-have, not a hard requirement.
      } finally {
        setDateStripLoading(false);
      }
    }
  }, [originCode, destCode, depDate, retDate, adults, children, infants, tripType, cabinClass]);

  /**
   * Handler for a cell click in <DateMatrixStrip />. Reads dep/ret from
   * option.metadata, shifts state, pushes URL, triggers re-search.
   */
  const handleDateStripSelect = useCallback((option: MatrixOption) => {
    const meta = option.metadata as { dep: string; ret: string | null } | undefined;
    if (!meta) return;
    const { dep: newDep, ret: newRet } = meta;
    // Scroll results into view immediately. handleSearch only scrolls
    // AFTER the Duffel response lands, which on a slow network looks
    // like the click did nothing. Getting the spinner into view now
    // gives the user instant feedback that something is happening.
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setDepDate(newDep);
    if (newRet) {
      setRetDate(newRet);
      setTripType('return');
    } else {
      setRetDate('');
      setTripType('one-way');
    }
    // URL sync — keeps back/forward navigation intact. We only touch our
    // own keys and preserve anything else (sid, utm_*, etc.).
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('origin', originCode);
      url.searchParams.set('dest', destCode);
      url.searchParams.set('departure', newDep);
      if (newRet) url.searchParams.set('return', newRet);
      else url.searchParams.delete('return');
      window.history.pushState({}, '', url.toString());
    } catch {}
    setDateShiftTrigger(t => t + 1);
  }, [originCode, destCode]);

  /**
   * Scout Tip click — shift to a cheaper date found outside the ±3
   * strip. Locks the trip length at what the user originally asked
   * for so the new price stays apples-to-apples.
   */
  const handleScoutTip = useCallback((tip: ScoutTip) => {
    const newDep = tip.dep;
    let newRet: string | null = null;
    if (intendedNights && intendedNights > 0) {
      const d = new Date(newDep + 'T00:00:00Z');
      d.setUTCDate(d.getUTCDate() + intendedNights);
      newRet = d.toISOString().slice(0, 10);
    }
    // Scroll results into view immediately (same UX reason as the
    // cell-click handler above).
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setDepDate(newDep);
    if (newRet) {
      setRetDate(newRet);
      setTripType('return');
    } else {
      setRetDate('');
      setTripType('one-way');
    }
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('origin', originCode);
      url.searchParams.set('dest', destCode);
      url.searchParams.set('departure', newDep);
      if (newRet) url.searchParams.set('return', newRet);
      else url.searchParams.delete('return');
      window.history.pushState({}, '', url.toString());
    } catch {}
    setDateShiftTrigger(t => t + 1);
  }, [originCode, destCode, intendedNights]);

  // Re-run the search after a date-strip click. Bumping dateShiftTrigger
  // fires this effect only once per click, after setDepDate/setRetDate
  // have committed — so handleSearch sees the fresh dates.
  useEffect(() => {
    if (dateShiftTrigger === 0) return;
    handleSearch();
    // We intentionally depend only on the trigger (not handleSearch itself)
    // so re-mounting handleSearch for unrelated reasons doesn't loop-search.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateShiftTrigger]);

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

    // Sort within each bookability tier
    const cmp = (a: FlightResult, b: FlightResult) => {
      switch (sortBy) {
        case 'price-asc': return a.price - b.price;
        case 'price-desc': return b.price - a.price;
        case 'duration-asc': return a.duration_to - b.duration_to;
        case 'duration-desc': return b.duration_to - a.duration_to;
      }
    };

    // Partition: direct-bookable (Duffel, has offer_id) first, redirect providers second.
    // Keeps commission-earning bookings at the top of the page regardless of price.
    const direct = list.filter(f => f.source === 'duffel' && f.offer_id).sort(cmp);
    const redirect = list.filter(f => !(f.source === 'duffel' && f.offer_id)).sort(cmp);
    return [...direct, ...redirect];
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
        <div className="max-w-[860px] mx-auto bg-white border border-white/20 rounded-3xl p-6 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.6),0_8px_24px_-8px_rgba(34,211,238,0.3),0_0_0_1px_rgba(165,243,252,0.08)] relative z-[1]">

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
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5 text-center">From</label>
              <AutocompleteFrom value={originCode} onChange={(code, city) => { setOriginCode(code); setOriginCity(city); }} initialCode={initOrigin} />
            </div>
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5 text-center">To</label>
              <AutocompleteTo value={destCode} onChange={(code, city) => { setDestCode(code); setDestCity(city); }} initialCode={initDest} />
            </div>
          </div>

          {/* Dates + Passengers */}
          <div className="grid gap-3 mb-4 grid-cols-1 sm:grid-cols-2">
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5 text-center">Calendar</label>
              <DateRangePicker
                start={depDate}
                end={retDate}
                minDate={today}
                accent="blue"
                oneWay={tripType !== 'return'}
                startWord="departure"
                endWord="return"
                onChange={({ start: s, end: e }) => { setDepDate(s); setRetDate(e); }}
              />
            </div>
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5 text-center">Passengers</label>
              <PassengerPicker adults={adults} children={children} infants={infants}
                onChange={(a, c, i) => { setAdults(a); setChildren(c); setInfants(i); }} />
            </div>
          </div>

          {(() => {
            const returnMissing = tripType === 'return' && !retDate;
            return (
              <>
                <button
                  onClick={handleSearch}
                  disabled={loading || returnMissing}
                  className="w-full bg-[#0066FF] hover:bg-[#0052CC] disabled:opacity-60 disabled:cursor-not-allowed text-white font-poppins font-black text-[.95rem] py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(0,102,255,0.3)]"
                >
                  {loading
                    ? 'Searching…'
                    : returnMissing
                    ? 'Pick a return date to search'
                    : 'Search 5 Providers →'}
                </button>
                {returnMissing ? (
                  <p className="text-center text-[.68rem] text-amber-700 font-bold mt-2.5">
                    Return trip selected — add a return date, or switch to One-way above.
                  </p>
                ) : (
                  <p className="text-center text-[.68rem] text-[#8E95A9] font-semibold mt-2.5">
                    Free comparison · Results shown here · Click any deal to book on the provider site
                  </p>
                )}
              </>
            );
          })()}
        </div>

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

      {/* ── Loading State ──
          Ref attached so handleSearch can scroll the user down to the
          loader the instant they tap Search. Without this, mobile users
          stare at the form, don't notice the button text changed to
          "Searching…", and tap Search again 2-3 times. Real Clarity
          recording 2026-04-27 caught this exact pattern. */}
      {loading && (
        <div ref={resultsRef}>
          <LoadingState origin={originCode} dest={destCode} />
        </div>
      )}

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
          {/* Scout live-poll chip: rendered while the v1 GDS poll is
              active so the user sees progress instead of a silent wait. */}
          {scoutActive && (
            <section className="max-w-[1000px] mx-auto px-5 pt-6">
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#0066FF] animate-pulse" />
                <span className="font-poppins font-semibold text-[.85rem] text-[#1A1D2B]">
                  Scout is checking airlines…
                  {scoutAirlineCount > 0 && (
                    <span className="text-[#5C6378] font-semibold"> {scoutAirlineCount} found so far</span>
                  )}
                </span>
              </div>
            </section>
          )}

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

          {/* Date Matrix Strip — D−3 … D+3 cheapest-per-date. Lets users
              shift the search without retyping dates. Fetched separately
              from /api/flights?mode=datestrip (Travelpayouts-only, KV-cached
              for 1h) so it never slows down the main Duffel results. */}
          {(dateStripLoading || dateStrip.length > 0) && (
            <DateMatrixStrip
              type="flights"
              options={dateStrip}
              loading={dateStripLoading}
              onSelect={handleDateStripSelect}
              scoutTip={dateScoutTip}
              onScoutTip={handleScoutTip}
            />
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
                            <img src={airlineLogo} alt={f.airline} className="w-8 h-8 object-contain" loading="lazy"
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
    </>
  );
}

export default FlightsContent;
