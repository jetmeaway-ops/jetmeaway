'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { track } from '@vercel/analytics';
import DateRangePicker from '@/components/DateRangePicker';
import DateMatrixStrip, { type MatrixOption, type ScoutTip } from '@/components/DateMatrixStrip';
import { redirectUrl } from '@/lib/redirect';
import SaveSearchButton from '@/components/SaveSearchButton';
import { saveSticky, loadSticky, type StickyFlights } from '@/lib/sticky-search';
import AppStoreBadges from '@/components/AppStoreBadges';
import DestinationBackdrop from '@/components/DestinationBackdrop';
import { useTranslations } from 'next-intl';

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
  /** Real per-flight airport codes (e.g. SEN, LGW) — distinct from the
   *  searched metro code (LON). Fall back to the searched code when absent. */
  origin_airport?: string | null;
  destination_airport?: string | null;
  flight_number: string | null;
  offer_id?: string | null;
  source?: 'duffel' | 'travelpayouts' | 'kyte' | 'liteapi';
  link: string | null;
  /** Set on Kyte rows — needed for the booking flow which threads
   *  transactionId through Shop → Book → Commit → Payment. */
  kyteTransactionId?: string;
  /** Phase 0 baggage: what the fare INCLUDES, shown as read-only chips on the
   *  card. `cabin`/`checked` = a bag of that type is included; `checkedKg` =
   *  the checked allowance when known. Absent/undefined = unknown (no chip). */
  baggage?: { cabin?: boolean; checked?: boolean; checkedKg?: number | null };
  /** LiteAPI fare family name (e.g. "Light", "Inclusive") — display only in P0. */
  fareFamily?: string | null;
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
/** A flight row is "direct" (we earn margin, customer books on-site) if
 *  it's a Duffel offer, a Kyte offer, OR a LiteAPI (Nuitée) offer — all three
 *  are direct-bookable. Travelpayouts rows are always affiliate redirects. */
function isDirectBookable(f: FlightResult): boolean {
  return (
    (f.source === 'duffel' && !!f.offer_id) ||
    (f.source === 'kyte' && !!f.offer_id) ||
    (f.source === 'liteapi' && !!f.offer_id)
  );
}
function mergeFlightsKeepAllDuffel(rows: FlightResult[]): FlightResult[] {
  const direct: FlightResult[] = [];
  const redirect: FlightResult[] = [];
  for (const f of rows) {
    if (isDirectBookable(f)) direct.push(f);
    else redirect.push(f);
  }
  direct.sort((a, b) => a.price - b.price);
  redirect.sort((a, b) => a.price - b.price);
  return [...direct, ...redirect.slice(0, TP_ROW_CAP)];
}

/** Merge a single incoming flight row into the dedupe map.
 *
 *  Tier rules (do NOT regress — see project_duffel_top_of_search.md):
 *    1. A direct-bookable row (Duffel OR Kyte, source has offer_id)
 *       beats an affiliate-redirect row regardless of price.
 *    2. Within the same tier, cheaper wins.
 *
 *  This is the single source of truth for how rows collide. The Duffel,
 *  TP-polling, and Kyte search blocks all call into it. */
function mergeFlightRow(bag: Map<string, FlightResult>, incoming: FlightResult, key: string) {
  const existing = bag.get(key);
  if (!existing) {
    bag.set(key, incoming);
    return;
  }
  const incomingDirect = isDirectBookable(incoming);
  const existingDirect = isDirectBookable(existing);
  if (incomingDirect && !existingDirect) {
    bag.set(key, incoming);
    return;
  }
  if (!incomingDirect && existingDirect) return;
  if (incoming.price < existing.price) bag.set(key, incoming);
}

/** Convert Kyte's `POST /api/flights/kyte/search` response into our
 *  `FlightResult` row shape. Kyte's offer structure:
 *    offer.id, offer.totalPrice (minor units), offer.currency {code,decimals},
 *    offer.flightSolutions: [solutionId...]  (1 outbound, optional 1 return)
 *  Each solutionId resolves to `body.flightSolutions[solutionId]` which has
 *  `segments[]` with marketingCarrier, flightNumber, duration, departure,
 *  arrival — confirmed via scripts/kyte-offer-dump.mjs.
 *
 *  We set `link` to our own /flights/kyte/[offerId] detail page (carrying
 *  the transactionId so the booking flow can call Book → Commit → Payment). */
type KyteRawOffer = {
  id: string;
  flightSolutions?: string[];
  totalPrice?: number;
  currency?: { code: string; decimals: number };
  owner?: string;
  [k: string]: unknown;
};
type KyteRawSolution = {
  totalDuration?: number;
  segments?: Array<{
    flightNumber?: string;
    marketingCarrier?: { code?: string; name?: string };
    operatingCarrier?: { code?: string; name?: string };
    departure?: { airport?: { code?: string }; date?: string; time?: string };
    arrival?: { airport?: { code?: string }; date?: string; time?: string };
  }>;
};
type KyteRawSearchResponse = {
  offers?: Record<string, KyteRawOffer>;
  flightSolutions?: Record<string, KyteRawSolution>;
  transactionId?: string;
};

function currencyToSymbol(code: string): string {
  switch (code.toUpperCase()) {
    case 'GBP': return '£';
    case 'EUR': return '€';
    case 'USD': return '$';
    default: return code;
  }
}

/** Inverse of currencyToSymbol — recover an ISO-4217 code from the display
 *  symbol we store on a FlightResult, so the LiteAPI start-booking `trip`
 *  record carries a real currency code (GBP/EUR/USD) rather than a glyph.
 *  Falls back to a 3-letter passthrough (currencyToSymbol returns the code
 *  itself for unknown currencies) then to GBP. */
function symbolToCurrencyCode(sym: string): string {
  switch (sym) {
    case '£': return 'GBP';
    case '€': return 'EUR';
    case '$': return 'USD';
    default: return /^[A-Z]{3}$/.test(sym) ? sym : 'GBP';
  }
}

/**
 * Normalise a Kyte segment time to a strict HH:MM:SS shape so it can be
 * concatenated into an ISO `YYYY-MM-DDTHH:MM:SS` and parsed by `new Date()`.
 *
 * Kyte is inconsistent: Jet2 / easyJet / etc. return `HH:MM`; Ryanair
 * returns `HH:MM:SS`. Without this normaliser the converter built
 * "2026-07-15T06:15:00:00" (4 colons) for Ryanair rows → `new Date()`
 * returned Invalid Date → result rows rendered literal "Invalid Date"
 * text in place of the times. 2026-05-13.
 */
function normalizeKyteTime(t: string): string {
  if (!t) return t;
  const parts = t.split(':');
  if (parts.length === 3) return t;          // already HH:MM:SS — pass through
  if (parts.length === 2) return `${t}:00`;  // HH:MM → HH:MM:SS
  return t;                                   // unexpected — leave for caller to handle
}

function kyteOffersToFlightResults(
  data: KyteRawSearchResponse,
  transactionId: string,
): FlightResult[] {
  if (!data.offers) return [];
  const solutions = data.flightSolutions || {};
  const out: FlightResult[] = [];

  for (const [offerId, offer] of Object.entries(data.offers)) {
    const solIds = Array.isArray(offer.flightSolutions) ? offer.flightSolutions : [];
    if (solIds.length === 0) continue;
    const outboundSol = solutions[solIds[0]];
    if (!outboundSol?.segments?.length) continue;
    const segs = outboundSol.segments;
    const firstSeg = segs[0];
    const lastSeg = segs[segs.length - 1];
    if (!firstSeg.departure || !lastSeg.arrival) continue;

    const decimals = offer.currency?.decimals ?? 2;
    const major = (offer.totalPrice ?? 0) / Math.pow(10, decimals);
    if (major <= 0) continue;

    const returnSol = solIds.length > 1 ? solutions[solIds[1]] : null;
    const returnFirstSeg = returnSol?.segments?.[0];

    out.push({
      airline:
        firstSeg.marketingCarrier?.name ||
        firstSeg.operatingCarrier?.name ||
        firstSeg.marketingCarrier?.code ||
        'Direct LCC',
      airlineCode:
        firstSeg.marketingCarrier?.code ||
        firstSeg.operatingCarrier?.code ||
        offer.owner ||
        '??',
      price: major,
      currency: currencyToSymbol(offer.currency?.code || 'GBP'),
      stops: segs.length === 1 ? 'Non-stop' : `${segs.length - 1} stop${segs.length > 2 ? 's' : ''}`,
      transfers: segs.length - 1,
      duration_to: outboundSol.totalDuration || 0,
      duration_back: returnSol?.totalDuration || 0,
      departure_at:
        firstSeg.departure.date && firstSeg.departure.time
          ? `${firstSeg.departure.date}T${normalizeKyteTime(firstSeg.departure.time)}`
          : null,
      arrival_at:
        lastSeg.arrival.date && lastSeg.arrival.time
          ? `${lastSeg.arrival.date}T${normalizeKyteTime(lastSeg.arrival.time)}`
          : null,
      return_at:
        returnFirstSeg?.departure?.date && returnFirstSeg.departure.time
          ? `${returnFirstSeg.departure.date}T${normalizeKyteTime(returnFirstSeg.departure.time)}`
          : null,
      origin_airport: firstSeg.departure.airport?.code || null,
      destination_airport: lastSeg.arrival.airport?.code || null,
      flight_number: firstSeg.flightNumber || null,
      offer_id: offerId,
      source: 'kyte',
      link: `/flights/kyte/${encodeURIComponent(offerId)}?tx=${encodeURIComponent(transactionId)}`,
      kyteTransactionId: transactionId,
    });
  }
  return out;
}

/* ───────────────────────────────────────────────────────────────────────────
   LiteAPI (Nuitée) flights → FlightResult rows.

   Mirrors kyteOffersToFlightResults but for the LiteAPI direct-bookable
   product. Consumes the response of GET /api/flights/liteapi/search, which
   returns a trimmed `offers[]` (offerId, total, currency, fareFamily, …) plus
   the full LiteAPI payload in `raw`. We map each trimmed offer to a row and
   enrich it with segment detail (airline, times, stops) pulled from the raw
   cheapestOffer it correlates to by offerId.

   PARKED: while LITEAPI_FLIGHTS_ENABLED is unset on the server the search
   route returns an empty offers[] — so this yields zero rows in production.
   ─────────────────────────────────────────────────────────────────────────── */
type LiteapiSearchOffer = {
  offerId: string;
  expiration?: string;
  total?: number | null;
  currency?: string | null;
  base?: number | null;
  taxes?: number | null;
  fareFamily?: string | null;
  seatsRemaining?: number | null;
  baggage?: unknown;
};
/* Shape verified against the LIVE production payload 2026-07-15: segments sit
   on the JOURNEY (not the offer), with departureTime/arrivalTime ISO strings,
   originCode/destinationCode, carrier.marketingName/marketingCode, a
   flight.marketingNumber, and duration as { iso8601, minutes }. */
type LiteapiRawSegment = {
  departureTime?: string;      // "2026-08-12T20:35:00"
  arrivalTime?: string;
  originCode?: string;         // "LTN"
  destinationCode?: string;    // "MXP"
  direction?: string;          // "OUTBOUND" | "INBOUND"
  duration?: { minutes?: number };
  carrier?: { marketingCode?: string; marketingName?: string; operatingCode?: string; operatingName?: string };
  flight?: { marketingNumber?: string; operatingNumber?: string };
  [k: string]: unknown;
};
type LiteapiRawJourney = {
  cheapestOffer?: { offerId?: string; fare?: { family?: string } };
  offers?: Array<{ offerId?: string }>;
  segments?: LiteapiRawSegment[];
  totalDuration?: { minutes?: number };
  [k: string]: unknown;
};
type LiteapiSearchResponse = {
  query?: { from?: string; to?: string; date?: string; return?: string | null; adults?: number; children?: number; infants?: number; cabin?: string; currency?: string } | null;
  count?: number;
  offers?: LiteapiSearchOffer[];
  raw?: unknown[];
  error?: string;
};

function liteapiOffersToFlightResults(data: LiteapiSearchResponse): FlightResult[] {
  const offers = Array.isArray(data?.offers) ? data.offers : [];
  if (offers.length === 0) return [];

  // Correlate each trimmed offer back to its raw JOURNEY — segments (airline,
  // times, airports) live on the journey, NOT on the offer. Reading
  // cheapestOffer.segments (always absent) was why LiteAPI rows rendered with
  // no airline/times and the fare name ("Basic") as the title (2026-07-15).
  const journeyById = new Map<string, LiteapiRawJourney>();
  const rawResults = Array.isArray(data?.raw) ? data.raw : [];
  for (const r of rawResults as Array<{ journeys?: LiteapiRawJourney[] }>) {
    for (const j of r?.journeys || []) {
      if (j?.cheapestOffer?.offerId) journeyById.set(String(j.cheapestOffer.offerId), j);
      for (const o of j?.offers || []) {
        if (o?.offerId) journeyById.set(String(o.offerId), j);
      }
    }
  }

  const fromCode = data?.query?.from || null;
  const toCode = data?.query?.to || null;
  // LiteAPI `total` is the WHOLE-PARTY price; the rest of the app treats
  // FlightResult.price as PER-PERSON (labels "/pp", totals via price×pax, sorts
  // per-person against Duffel/TP). Divide by the party size so LiteAPI sorts and
  // labels correctly; the whole-party amount is reconstructed at booking time
  // (start-booking sends price × pax → matches the prebook drift guard).
  const paxCount = Math.max(
    1,
    (data?.query?.adults || 1) + (data?.query?.children || 0) + (data?.query?.infants || 0),
  );
  const out: FlightResult[] = [];

  for (const o of offers) {
    if (!o || !o.offerId) continue;
    const price =
      typeof o.total === 'number' ? Math.round((o.total / paxCount) * 100) / 100 : null;
    if (price === null || price <= 0) continue;

    const journey = journeyById.get(String(o.offerId));
    const allSegs: LiteapiRawSegment[] = Array.isArray(journey?.segments) ? journey!.segments! : [];
    // Round trips carry both directions in one segments array — split them so
    // outbound drives the main row and the first inbound leg fills return_at.
    const outSegs = allSegs.filter((s) => s?.direction !== 'INBOUND');
    const inSegs = allSegs.filter((s) => s?.direction === 'INBOUND');
    const firstSeg = outSegs[0];
    const lastSeg = outSegs[outSegs.length - 1];
    const carrier = firstSeg?.carrier;
    const transfers = outSegs.length > 1 ? outSegs.length - 1 : 0;
    const sumMinutes = (segs: LiteapiRawSegment[]) =>
      segs.reduce((s, seg) => s + (typeof seg?.duration?.minutes === 'number' ? seg.duration.minutes : 0), 0);
    const durationTo = inSegs.length === 0 && typeof journey?.totalDuration?.minutes === 'number'
      ? journey.totalDuration.minutes
      : sumMinutes(outSegs);

    out.push({
      airline: carrier?.marketingName || carrier?.operatingName || o.fareFamily || 'Flight',
      airlineCode: carrier?.marketingCode || carrier?.operatingCode || '??',
      price,
      basePrice: typeof o.base === 'number' ? o.base : undefined,
      currency: currencyToSymbol(o.currency || 'GBP'),
      stops: transfers === 0 ? 'Non-stop' : `${transfers} stop${transfers > 1 ? 's' : ''}`,
      transfers,
      duration_to: durationTo,
      duration_back: sumMinutes(inSegs),
      departure_at: firstSeg?.departureTime || null,
      arrival_at: lastSeg?.arrivalTime || null,
      return_at: inSegs[0]?.departureTime || null,
      origin_airport: firstSeg?.originCode || fromCode,
      destination_airport: lastSeg?.destinationCode || toCode,
      flight_number: firstSeg?.flight?.marketingNumber || firstSeg?.flight?.operatingNumber || null,
      offer_id: o.offerId,
      source: 'liteapi',
      // Direct-bookable — the card's emerald "Book direct" button POSTs to
      // start-booking and routes to /flights/liteapi/checkout/[ref]; no link.
      link: null,
      fareFamily: o.fareFamily ?? null,
      baggage: liteapiBaggage(o.baggage),
    });
  }
  return out;
}

/** Map a LiteAPI offer's `baggage` object to the card's chip shape.
 *  Shape: { hasCarryOnBag, hasCheckedBag, included:[{bagType:'cabin'|'checked', pieces, weightKg}] }. */
function liteapiBaggage(b: unknown): FlightResult['baggage'] {
  if (!b || typeof b !== 'object') return undefined;
  const o = b as {
    hasCarryOnBag?: boolean;
    hasCheckedBag?: boolean;
    included?: Array<{ bagType?: string; weightKg?: number | null }>;
  };
  const checked = Array.isArray(o.included) ? o.included.find((x) => x?.bagType === 'checked') : undefined;
  return {
    cabin: o.hasCarryOnBag === true,
    checked: o.hasCheckedBag === true,
    checkedKg: typeof checked?.weightKg === 'number' ? checked.weightKg : null,
  };
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
  const t = useTranslations('flights');
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
      <input type="text" placeholder={t('fromPlaceholder')} value={q} autoComplete="off"
        onChange={e => { setQ(e.target.value); setChosen(null); onChange('', ''); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className="w-full px-4 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-base md:text-[.9rem] font-semibold text-[#1A1D2B] outline-none focus:border-[#0066FF] focus:bg-white transition-all placeholder:text-[#B0B8CC]" />
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
                    <span className="text-[.7rem] text-[#8E95A9] ml-1.5">{t('allAirports')}</span>
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

function AutocompleteTo({ value, onChange, initialCode, initialCity }: {
  value: string;
  onChange: (code: string, city: string) => void;
  initialCode: string;
  initialCity?: string;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const t = useTranslations('flights');
  const [chosen, setChosen] = useState<Dest | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  // Tracks which carried-in code we've already applied, so the prefill effect
  // below runs once per distinct code instead of re-firing on every keystroke.
  const appliedInitialRef = useRef<string | null>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  useEffect(() => {
    if (!initialCode) return;
    // Apply a carried-in destination (URL param / sticky search / deep link)
    // ONCE per distinct code. `initialCity` is bound to the live `destCity`, so
    // without this guard the effect re-fired on every keystroke and overwrote
    // the user's edit — making the To field impossible to clear. (2026-05-21)
    if (appliedInitialRef.current === initialCode) return;
    appliedInitialRef.current = initialCode;
    const code = initialCode.toUpperCase();
    const d = DESTINATIONS.find(d => d.code === code);
    if (d) {
      setQ(`${d.city} (${d.code})`);
      setChosen(d);
      onChangeRef.current(d.code, d.city);
    } else {
      // Code isn't in the curated DESTINATIONS list — e.g. a deep-link or the
      // native app sending a destination we don't hard-code here. Accept it
      // anyway (with the city name when supplied via initialCity) so the
      // destination carries over instead of being silently dropped. (2026-05-20)
      const city = initialCity || code;
      setQ(initialCity ? `${initialCity} (${code})` : code);
      setChosen({ code, city, country: '', flag: '' } as Dest);
      onChangeRef.current(code, city);
    }
  }, [initialCode, initialCity]);

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
    // UK airports as DESTINATIONS too — customers fly TO Edinburgh/Glasgow/
    // Manchester… Typing "edin" used to suggest only Medina, Saudi Arabia,
    // because UK airports only existed in the From list (owner report 07-15).
    const ukDests: ToItem[] = UK_AIRPORTS
      .filter(a => a.code.toLowerCase().startsWith(lq) || a.name.toLowerCase().includes(lq) || a.city.toLowerCase().includes(lq))
      .map(a => ({ code: a.code, city: a.name, country: 'United Kingdom', flag: '🇬🇧' }));
    const dests: ToItem[] = DESTINATIONS
      .filter(d => d.city.toLowerCase().includes(lq) || d.country.toLowerCase().includes(lq) || d.code.toLowerCase().startsWith(lq));
    toFiltered = [...groups, ...ukDests, ...dests].slice(0, 10);
  } else {
    toFiltered = [
      ...CITY_GROUPS.map(g => ({ code: g.code, city: g.name, country: g.country, flag: g.flag, isGroup: true as const })),
      ...DESTINATIONS.slice(0, 3),
    ];
  }

  return (
    <div ref={ref} className="relative">
      <input type="text" placeholder={t('toPlaceholder')} value={q} autoComplete="off"
        onChange={e => { setQ(e.target.value); setChosen(null); onChange('', ''); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className="w-full px-4 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-base md:text-[.9rem] font-semibold text-[#1A1D2B] outline-none focus:border-[#0066FF] focus:bg-white transition-all placeholder:text-[#B0B8CC]" />
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
                <span className="text-[.72rem] text-[#8E95A9] ml-1.5">{d.isGroup ? t('allAirports') : d.country}</span>
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

  const t = useTranslations('flights');
  const label = [
    t('adultsCount', { count: adults }),
    children > 0 ? t('childrenCount', { count: children }) : null,
    infants > 0 ? t('infantsCount', { count: infants }) : null,
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
          <PaxRow label={t('adults')} sub={t('age12plus')} val={adults} min={1} max={9 - children - infants}
            onDec={() => onChange(adults - 1, children, infants)} onInc={() => onChange(adults + 1, children, infants)} />
          <PaxRow label={t('children')} sub={t('age2to11')} val={children} min={0} max={9 - adults - infants}
            onDec={() => onChange(adults, children - 1, infants)} onInc={() => onChange(adults, children + 1, infants)} />
          <PaxRow label={t('infants')} sub={t('under2')} val={infants} min={0} max={Math.min(adults, 9 - adults - children)}
            onDec={() => onChange(adults, children, infants - 1)} onInc={() => onChange(adults, children, infants + 1)} />
          <p className="text-[.6rem] text-[#8E95A9] font-semibold mt-1">{t('maxPassengers')}</p>
          <button type="button" onClick={() => setOpen(false)}
            className="w-full mt-3 bg-[#0066FF] hover:bg-[#0052CC] text-white font-poppins font-bold text-[.8rem] py-2.5 rounded-xl transition-colors">
            {t('done')}
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
  const t = useTranslations('flights');
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
    if (mins < 2) return t('justNow');
    if (mins < 60) return t('minAgo', { mins });
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return t('hAgo', { hrs });
    const days = Math.round(hrs / 24);
    return t('dAgo', { days });
  })();

  if (loading) {
    return (
      <section className="max-w-[1100px] mx-auto px-5 py-8">
        <h2 className="font-poppins font-black text-[1.2rem] text-[#1A1D2B] mb-4">
          <span className="text-[#0066FF]">🔥</span> {t('hotFlightDeals')}
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
          <span className="text-[#0066FF]">🔥</span> {t('hotFlightDeals')}
        </h2>
        <span className="text-[.68rem] text-[#8E95A9] font-semibold">
          {t('indicativePrices')}{relativeUpdated ? ` · ${t('updatedRel', { rel: relativeUpdated })}` : ''} · {t('clickToSearch')}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {deals.map(deal => {
          const depDate = deal.departureDate ? new Date(deal.departureDate) : null;
          const dateStr = depDate ? depDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
          const stops = deal.transfers === 0 ? t('stopsDirect') : deal.transfers === 1 ? t('stops1') : t('stopsN', { n: deal.transfers });
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
                {dateStr && <div>{t('fromWord')} {dateStr} · {t('oneWayPp')}</div>}
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
  'loadingFares',
  'loadingDirect',
  'loadingAirlines',
  'loadingDates',
  'loadingBest',
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
  const t = useTranslations('flights');
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
          <span className="text-[.85rem] font-bold text-[#1A1D2B]">{t(LOADING_MSGS[msgIdx])}</span>
          <p className="text-[.72rem] text-[#8E95A9] font-semibold">{t('buildingResultsFor')} <strong className="text-[#1A1D2B]">{origin} → {dest}</strong></p>
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
  const t = useTranslations('flights');
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
      <h3 className="font-poppins font-black text-[1rem] text-[#1A1D2B] mb-1">{t('bestDaysToFly')} {origin} → {dest}</h3>
      <p className="text-[.72rem] text-[#8E95A9] font-semibold mb-4">
        <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#10b981] mr-1 align-middle" /> {t('cheap')}
        <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#f59e0b] mx-1 ml-3 align-middle" /> {t('medium')}
        <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#ef4444] mx-1 ml-3 align-middle" /> {t('expensive')}
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
      <p className="text-[.65rem] text-[#8E95A9] font-semibold mt-3 text-center">{t('hoverBars')}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═��═════════════════════════════════════════════════════════════════════════ */

function FlightsContent() {
  const t = useTranslations('flights');
  const router = useRouter();
  const [originCode, setOriginCode] = useState('');
  const [originCity, setOriginCity] = useState('');
  const [destCode, setDestCode] = useState('');
  const [destCity, setDestCity] = useState('');
  const [depDate, setDepDate] = useState('');
  const [retDate, setRetDate] = useState('');
  // Inline form-validation message rendered under the Search button —
  // replaces the old blocking alert() dialogs. Cleared automatically as
  // soon as the user edits any of the fields the message complains about.
  const [formError, setFormError] = useState('');
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
    // destCity can arrive without an IATA `dest` code — e.g. when the
    // homepage couldn't resolve a typed city to one of its 50-city
    // short-list and handed off the raw text to /flights so this page's
    // wider autocomplete can resolve it. Fill the destCity field so the
    // user sees their query land + the autocomplete kicks in.
    if (destCityParam) setDestCity(destCityParam);
    if (dep) {
      setDepDate(dep);
    } else if (sticky?.departure) {
      // Don't restore stale dates — past departures get dropped silently.
      const today = new Date().toISOString().split('T')[0];
      if (sticky.departure >= today) setDepDate(sticky.departure);
    }
    // URL `?tripType=` is checked first — when the native mobile app or
    // a deep-link sends `tripType=oneway` we must honour it even when no
    // `return` param is present and there's no sticky-search state.
    // Earlier the code only flipped to one-way via sticky-search, so
    // a fresh native install with no sticky always landed on the return
    // form even after the user picked "One-way" on the native form.
    // Accept both `oneway` and `one-way` for forgiveness. (2026-05-06)
    const urlTripType = (p.get('tripType') || '').toLowerCase();
    if (ret) {
      setRetDate(ret);
      setTripType(urlTripType === 'oneway' || urlTripType === 'one-way' ? 'one-way' : 'return');
    } else if (urlTripType === 'oneway' || urlTripType === 'one-way') {
      setTripType('one-way');
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

    // Sensible default dates when neither URL nor sticky supplied any —
    // depart ~4 weeks out, 7-night return. An empty "Add dates" box was
    // the first dead-end on this form (2026-07-02 audit): the visitor had
    // to open the calendar before anything worked. Prefilled dates keep
    // the form one-click searchable; the calendar still lets them change.
    const todayIso = new Date().toISOString().split('T')[0];
    const stickyDepValid = !!(sticky?.departure && sticky.departure >= todayIso);
    if (!dep && !stickyDepValid) {
      const plus = (n: number) => {
        const dd = new Date();
        dd.setDate(dd.getDate() + n);
        return dd.toISOString().split('T')[0];
      };
      setDepDate(plus(28));
      const wantsOneWay =
        urlTripType === 'oneway' || urlTripType === 'one-way' ||
        (!ret && sticky?.tripType === 'one-way');
      if (!wantsOneWay) setRetDate(plus(35));
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

  // Clear the inline validation message as soon as the user touches any
  // field it could be complaining about — stale errors erode trust.
  useEffect(() => {
    setFormError('');
  }, [originCode, destCode, depDate, retDate, tripType]);

  const handleSearch = useCallback(async () => {
    // Inline validation — never alert(). A blocking alert() dialog reads
    // as a frozen page to some users (and to automation), and dismissing
    // it teaches nothing because the message vanishes (2026-07-02 audit).
    if (!originCode) { setFormError(t('errNoOrigin')); return; }
    if (!destCode) { setFormError(t('errNoDest')); return; }
    if (!depDate) { setFormError(t('errNoDepDate')); return; }
    if (tripType === 'return' && !retDate) {
      setFormError(t('errNoRetDate'));
      return;
    }
    setFormError('');

    // Track the search submission so we can see which routes get the
    // most demand, return vs one-way mix, and which searches actually
    // convert downstream to /redirect affiliate clicks. Best-effort
    // wrapped in try/catch — analytics failure must never block the
    // actual search.
    try {
      track('flight_search', {
        origin: originCode,
        destination: destCode,
        trip_type: tripType,
        dep_date: depDate,
        return_date: retDate || 'none',
      });
    } catch {
      /* swallow */
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
          const retDay = (f.return_at || '').slice(0, 10) || 'ow';
          const key = f.flight_number
            ? `${f.flight_number}-${depDay}-${retDay}`
            : `${f.airlineCode}-${depDay}-${f.duration_to}-${retDay}`;
          mergeFlightRow(mergedByKey, f, key);
        }
        // Render immediately if v1 hasn't surfaced anything yet.
        // mergeFlightsKeepAllDuffel preserves ALL direct-bookable rows
        // (Duffel + Kyte) and caps only the affiliate-redirect rows.
        const merged = mergeFlightsKeepAllDuffel(Array.from(mergedByKey.values()));
        setFlights(merged);
        setScoutAirlineCount(new Set(merged.map(f => f.airlineCode)).size);
      })
      .catch(() => { /* v1 will carry the search on its own */ });

    // ── Kyte direct-bookable LCC search. Fires in parallel with Duffel.
    // No `airlines` filter — Kyte returns whatever LCCs they have for
    // this route (Jet2/easyJet/IndiGo/Wizz/Transavia/Volotea/Ryanair).
    // Kyte rows are direct-bookable (we keep margin) — same tier as
    // Duffel, displayed on top above any TP affiliate redirect.
    //
    // Metro fan-out: Kyte rejects city codes like LON/NYC/PAR with
    // `MultiAirportCityRequestNotAllowed`. When origin or destination is
    // a metro code we fan out across all sub-airports in parallel so
    // Ryanair STN→DUB etc. surface for "London (Any)" searches.
    const originGroup = CITY_GROUPS.find(g => g.code === originCode);
    const destGroup = CITY_GROUPS.find(g => g.code === destCode);
    const kyteOriginAirports = originGroup ? originGroup.airports : [originCode];
    const kyteDestAirports = destGroup ? destGroup.airports : [destCode];
    const kyteOdPairs: Array<{ origin: string; destination: string }> = [];
    for (const o of kyteOriginAirports) {
      for (const d of kyteDestAirports) {
        kyteOdPairs.push({ origin: o, destination: d });
      }
    }

    const kytePromise = Promise.all(kyteOdPairs.map(({ origin, destination }) =>
      fetch('/api/flights/kyte/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin,
          destination,
          departure: depDate,
          adults,
          children,
          infants,
          cabin: cabinClass === 'premium_economy' ? 'economy' : cabinClass,
          return: retDate && tripType === 'return' ? retDate : null,
        }),
      })
        .then(r => r.json() as Promise<KyteRawSearchResponse & { error?: string }>)
        .catch(() => null)
    ))
      .then((responses) => {
        let any = false;
        for (const data of responses) {
          if (!data || data.error || !data.offers) continue;
          const txId = data.transactionId || '';
          if (!txId) continue;
          const rows = kyteOffersToFlightResults(data, txId);
          for (const f of rows) {
            const depDay = (f.departure_at || '').slice(0, 10);
            const retDay = (f.return_at || '').slice(0, 10) || 'ow';
            const key = f.flight_number
              ? `${f.flight_number}-${depDay}-${retDay}`
              : `${f.airlineCode}-${depDay}-${f.duration_to}-${retDay}`;
            mergeFlightRow(mergedByKey, f, key);
            any = true;
          }
        }
        if (!any) return;
        const merged = mergeFlightsKeepAllDuffel(Array.from(mergedByKey.values()));
        setFlights(merged);
        setScoutAirlineCount(new Set(merged.map(f => f.airlineCode)).size);
      })
      .catch(() => { /* Kyte is supplementary — failures don't break search */ });

    // ── LiteAPI (Nuitée) direct-bookable flight search. Fires in parallel with
    // Duffel + Kyte. PARKED behind LITEAPI_FLIGHTS_ENABLED on the server: while
    // the flag is unset the search route returns an empty offers[] so ZERO
    // LiteAPI rows render in production. When live, LiteAPI rows are
    // direct-bookable (we keep margin, customer books on-site) — same top tier
    // as Duffel + Kyte, above any TP affiliate redirect.
    const liteapiParams = new URLSearchParams({
      from: originCode,
      to: destCode,
      date: depDate,
      adults: String(adults),
      // children/infants MUST be sent so the offer is priced + inventoried for
      // the whole party — otherwise the downstream passenger list (built per
      // child/infant) mismatches an adults-only offer and every family prebook
      // fails the count check / drift guard.
      children: String(children),
      infants: String(infants),
      cabin: cabinClass.toUpperCase(),
    });
    if (retDate && tripType === 'return') liteapiParams.set('return', retDate);

    // Families enabled 2026-07-16: child/infant prebooks work now that
    // prebookFlight sends numeric `passengerType` (0/1/2) — LiteAPI silently
    // ignored our `type` strings, which made 53099 look like "children
    // unsupported" (Nuitée ticket LAS-1312). Adults-only guard + server
    // backstop removed together.
    // Merge one LiteAPI response's rows into the results; returns how many.
    const applyLiteapiData = (data: LiteapiSearchResponse | null): number => {
      if (!data || data.error || !Array.isArray(data.offers) || data.offers.length === 0) return 0;
      const rows = liteapiOffersToFlightResults(data);
      if (rows.length === 0) return 0;
      for (const f of rows) {
        const depDay = (f.departure_at || '').slice(0, 10);
        const retDay = (f.return_at || '').slice(0, 10) || 'ow';
        const key = f.flight_number
          ? `${f.flight_number}-${depDay}-${retDay}`
          : `${f.airlineCode}-${depDay}-${f.duration_to}-${retDay}`;
        mergeFlightRow(mergedByKey, f, key);
      }
      const merged = mergeFlightsKeepAllDuffel(Array.from(mergedByKey.values()));
      setFlights(merged);
      setScoutAirlineCount(new Set(merged.map(f => f.airlineCode)).size);
      return rows.length;
    };
    const liteapiPromise = fetch(`/api/flights/liteapi/search?${liteapiParams}`)
          .then(r => r.json() as Promise<LiteapiSearchResponse>)
          .then(async (data) => {
            if (applyLiteapiData(data) > 0) return;
            // Metro fallback (owner request 07-15): a specific airport can have
            // zero direct-bookable coverage while its sibling airports have
            // plenty (LTN→MLA is Ryanair-only = 0, but LON→MLA = 123 via
            // LGW/STN). Retry once with the metro code(s); every row shows its
            // TRUE airport from segment data, so nothing is misrepresented.
            const metroOf = (code: string) => CITY_GROUPS.find(g => g.airports.includes(code))?.code;
            const mFrom = metroOf(originCode) || originCode;
            const mTo = metroOf(destCode) || destCode;
            if (mFrom === originCode && mTo === destCode) return;
            const p2 = new URLSearchParams(liteapiParams);
            p2.set('from', mFrom);
            p2.set('to', mTo);
            const d2 = await fetch(`/api/flights/liteapi/search?${p2}`)
              .then(r => r.json() as Promise<LiteapiSearchResponse>)
              .catch(() => null);
            applyLiteapiData(d2);
          })
          .catch(() => { /* LiteAPI is supplementary — failures don't break search */ });

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
        // v1 init misfired — wait for Duffel + Kyte to land, then fall
        // back to v3 only if both came up empty.
        await Promise.all([duffelPromise, kytePromise, liteapiPromise]);
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
        if (!pollRes.ok) continue;
        let pollData: { flights?: FlightResult[]; complete?: boolean };
        try {
          pollData = await pollRes.json();
        } catch {
          // Transient non-JSON body (edge 502 page etc.) — skip this tick
          // rather than aborting the whole poll and losing GDS stragglers.
          continue;
        }

        const before = mergedByKey.size;
        for (const f of (pollData.flights || []) as FlightResult[]) {
          const depDay = (f.departure_at || '').slice(0, 10);
          const retDay = (f.return_at || '').slice(0, 10) || 'ow';
          const key = f.flight_number
            ? `${f.flight_number}-${depDay}-${retDay}`
            : `${f.airlineCode}-${depDay}-${f.duration_to}-${retDay}`;
          // Single source of truth — mergeFlightRow preserves the
          // direct-bookable-tier-wins rule (Duffel + Kyte beat TP
          // affiliate regardless of price). Among same-tier collisions,
          // cheaper wins.
          mergeFlightRow(mergedByKey, f, key);
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

      // Give Duffel + Kyte a final moment to land before deciding
      // whether to fall back — their offers should be merged into the
      // same results list when they arrive late.
      await Promise.all([duffelPromise, kytePromise, liteapiPromise]);

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
      // v1 failed entirely — wait on Duffel + Kyte and fall back to v3
      // cached only if both came up empty. This ensures the ONE thing
      // a user never sees is a blank results page due to a transient
      // TP hiccup.
      await Promise.all([duffelPromise, kytePromise, liteapiPromise]);
      if (mergedByKey.size === 0) {
        await searchV3Fallback();
        return;
      }
      setLoading(false);
      setScoutActive(false);
      return;
    }

    async function searchV3Fallback() {
      // Last line of defence — this runs from inside the v1 catch block, so
      // it must NEVER throw. An unhandled rejection here would leave
      // `loading` stuck true and the user on skeleton cards forever.
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

        if (!res.ok || data.error) {
          setApiError(data.error || t('apiErrLoad'));
          setLoading(false);
          setScoutActive(false);
          return;
        }

        setFlights(data.flights || []);
        setLoading(false);
        setScoutActive(false);
        void loadDateStrip((data.flights && data.flights.length > 0) ? data.flights[0].price : null);
        setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      } catch {
        setApiError(t('apiErrConnection'));
        setLoading(false);
        setScoutActive(false);
      }
    }

    async function loadDateStrip(baseHint: number | null) {
      // DISABLED for direct-book-only (2026-07-24): the D−3…D+3 strip + Scout
      // Tip surfaced indicative Travelpayouts (affiliate) prices, inconsistent
      // with direct-book results. Clear state so nothing renders and skip the
      // affiliate fetch. Wiring kept for easy re-enable.
      void baseHint;
      setDateStripLoading(false);
      setDateStrip([]);
      setDateScoutTip(null);
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
    // Direct-book only (owner decision 2026-07-24): affiliate redirect rows
    // (Aviasales/Trip.com/Expedia) are dropped — we sell our own checkout.
    let list = flights.filter(isDirectBookable);

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

    return list.sort(cmp);
  }, [flights, sortBy, stopsFilter, selectedAirlines, flightNumFilter, takeoffMin, takeoffMax, landingMin, landingMax]);

  const directCount = flights ? flights.filter(isDirectBookable).length : 0;

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
        {/* Full-page destination backdrop — the searched destination city's
            image fades in behind the results once a search runs. Lazy. */}
        <DestinationBackdrop city={destCity || destCode} active={searched} theme="flights" />
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
              {(['return', 'one-way'] as const).map(tt => (
                <button key={tt} onClick={() => { setTripType(tt); if (tt === 'one-way') setRetDate(''); }}
                  className={`px-4 py-2 rounded-lg text-[.75rem] font-extrabold uppercase tracking-[1.5px] transition-all ${tripType === tt ? 'bg-white text-[#0066FF] shadow-sm' : 'text-[#8E95A9] hover:text-[#1A1D2B]'}`}>
                  {tt === 'return' ? t('tReturn') : t('tOneWay')}
                </button>
              ))}
            </div>
            <select
              value={cabinClass}
              onChange={e => setCabinClass(e.target.value as typeof cabinClass)}
              className="bg-[#F8FAFC] border border-[#E8ECF4] rounded-xl px-3 py-2 text-[.75rem] font-extrabold uppercase tracking-[1.5px] text-[#1A1D2B] outline-none focus:border-[#0066FF] cursor-pointer"
              aria-label={t('cabinClassAria')}
            >
              <option value="economy">{t('cabinEconomy')}</option>
              <option value="premium_economy">{t('cabinPremium')}</option>
              <option value="business">{t('cabinBusiness')}</option>
              <option value="first">{t('cabinFirst')}</option>
            </select>
          </div>

          {/* From / To */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5 text-center">{t('fromLabel')}</label>
              <AutocompleteFrom value={originCode} onChange={(code, city) => { setOriginCode(code); setOriginCity(city); }} initialCode={initOrigin} />
            </div>
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5 text-center">{t('toLabel')}</label>
              <AutocompleteTo value={destCode} onChange={(code, city) => { setDestCode(code); setDestCity(city); }} initialCode={initDest} initialCity={destCity} />
            </div>
          </div>

          {/* Dates + Passengers */}
          <div className="grid gap-3 mb-4 grid-cols-1 sm:grid-cols-2">
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5 text-center">{t('calendar')}</label>
              <DateRangePicker
                start={depDate}
                end={retDate}
                minDate={today}
                accent="blue"
                oneWay={tripType !== 'return'}
                startWord={t('wordDeparture')}
                endWord={t('wordReturn')}
                onChange={({ start: s, end: e }) => { setDepDate(s); setRetDate(e); }}
              />
            </div>
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5 text-center">{t('passengers')}</label>
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
                    ? t('searchingBtn')
                    : returnMissing
                    ? t('pickReturnDate')
                    : t('search5Providers')}
                </button>
                {formError ? (
                  <p className="text-center text-[.72rem] text-red-600 font-bold mt-2.5" role="alert">
                    <i className="fa-solid fa-circle-exclamation mr-1.5" aria-hidden />
                    {formError}
                  </p>
                ) : returnMissing ? (
                  <p className="text-center text-[.68rem] text-amber-700 font-bold mt-2.5">
                    {t('returnMissingNote')}
                  </p>
                ) : (
                  <p className="text-center text-[.68rem] text-[#8E95A9] font-semibold mt-2.5">
                    {t('freeComparisonNote')}
                  </p>
                )}
              </>
            );
          })()}
        </div>

      {/* App-store badge row — sits under the search form on the dark hero. */}
      <AppStoreBadges variant="dark" className="mt-7 mb-1" />

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
              {t('tryAgain')}
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
                  {t('scoutChecking')}
                  {scoutAirlineCount > 0 && (
                    <span className="text-[#5C6378] font-semibold"> {t('foundSoFar', { count: scoutAirlineCount })}</span>
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
                    {t('cheapestFound')}: <span className="text-green-600">£{priceView === 'total' ? Math.round(cheapest.price * (adults + children)) : cheapest.price}{priceView === 'total' ? t('priceSuffixTotal') : t('priceSuffixPp')}</span> {t('withWord')} {cheapest.airline}
                    {cheapest.transfers === 0 && <span className="text-green-600"> ({t('directLower')})</span>}
                  </span>
                </div>
                <p className="text-[.7rem] text-[#8E95A9] font-semibold">{cheapest.source === 'duffel' ? t('livePricesNote') : t('indicativePricesNote')}</p>
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

          {/* Price-security value proposition. The flight-only / ATOL legal
              disclosure now lives on the checkout card step (FlightCheckoutLegal)
              as a tick-to-confirm — the consumer must be notified before they
              book, not before they search. */}
          <section className="max-w-[1000px] mx-auto px-5 pb-2">
            <div className="flex items-center gap-2.5 bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3">
              <i className="fa-solid fa-shield-halved text-[#0066FF] text-[.95rem]" />
              <p className="text-[.78rem] text-[#1A1D2B] font-semibold leading-snug">
                <strong className="font-black">{t('priceSecurity')}</strong> {t('priceSecurityBody')}
              </p>
            </div>
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
                  <span>⚙</span> {t('filtersSort')}
                  {filtersActive && <span className="w-1.5 h-1.5 rounded-full bg-[#0066FF]" />}
                </button>
                <div className="text-[.72rem] text-[#8E95A9] font-bold">
                  {visibleFlights.length} {t('ofWord')} {directCount}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-5">
                {/* ─── Sidebar ─── */}
                <aside className={`${filtersOpenMobile ? 'block' : 'hidden'} md:block md:sticky md:top-24 self-start bg-white border border-[#E8ECF4] rounded-2xl p-5 h-fit`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-poppins font-black text-[.95rem] text-[#1A1D2B]">{t('filters')}</h3>
                    {filtersActive && (
                      <button onClick={clearAllFilters} className="text-[.7rem] font-bold text-[#0066FF] hover:underline">
                        {t('clearAll')}
                      </button>
                    )}
                  </div>

                  {/* Sort by */}
                  <div className="mb-5">
                    <h4 className="font-poppins font-black text-[.78rem] text-[#1A1D2B] mb-2 uppercase tracking-wide">{t('sortBy')}</h4>
                    <div className="space-y-1.5">
                      {([
                        { v: 'price-asc', l: t('sortLeast') },
                        { v: 'price-desc', l: t('sortMost') },
                        { v: 'duration-asc', l: t('sortShortest') },
                        { v: 'duration-desc', l: t('sortLongest') },
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
                    <h4 className="font-poppins font-black text-[.78rem] text-[#1A1D2B] mb-2 uppercase tracking-wide">{t('showPrice')}</h4>
                    <div className="inline-flex bg-[#F1F3F7] rounded-xl p-1 w-full">
                      <button
                        type="button"
                        onClick={() => setPriceView('perPerson')}
                        className={`flex-1 px-3 py-1.5 rounded-lg text-[.72rem] font-poppins font-bold transition-all ${priceView === 'perPerson' ? 'bg-white text-[#1A1D2B] shadow-sm' : 'text-[#5C6378]'}`}
                      >
                        {t('perPerson')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPriceView('total')}
                        className={`flex-1 px-3 py-1.5 rounded-lg text-[.72rem] font-poppins font-bold transition-all ${priceView === 'total' ? 'bg-white text-[#1A1D2B] shadow-sm' : 'text-[#5C6378]'}`}
                      >
                        {t('totalWord')}
                      </button>
                    </div>
                  </div>

                  {/* Stops */}
                  <div className="mb-5">
                    <h4 className="font-poppins font-black text-[.78rem] text-[#1A1D2B] mb-2 uppercase tracking-wide">{t('stops')}</h4>
                    <div className="space-y-1.5">
                      {([
                        { v: 'direct', l: t('stopsDirectOnly') },
                        { v: 'max1', l: t('stopsMax1') },
                        { v: 'max2', l: t('stopsMax2') },
                        { v: 'any', l: t('stopsAny') },
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
                      <h4 className="font-poppins font-black text-[.78rem] text-[#1A1D2B] mb-2 uppercase tracking-wide">{t('airlines')}</h4>
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
                    <h4 className="font-poppins font-black text-[.78rem] text-[#1A1D2B] mb-2 uppercase tracking-wide">{t('flightNumber')}</h4>
                    <input
                      type="text"
                      value={flightNumFilter}
                      onChange={(e) => setFlightNumFilter(e.target.value)}
                      placeholder={t('flightNumberPlaceholder')}
                      className="w-full border border-[#E8ECF4] rounded-lg px-3 py-2 text-[.8rem] focus:outline-none focus:border-[#0066FF]"
                    />
                  </div>

                  {/* Take-off time */}
                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-poppins font-black text-[.78rem] text-[#1A1D2B] uppercase tracking-wide">{t('takeoff')}</h4>
                      <span className="text-[.65rem] text-[#8E95A9] font-bold">
                        {takeoffMin === 0 && takeoffMax === 1439 ? t('atAnyTime') : `${minsToLabel(takeoffMin)} – ${minsToLabel(takeoffMax)}`}
                      </span>
                    </div>
                    <label className="text-[.65rem] text-[#8E95A9] font-semibold block mb-0.5">{t('earliest')}</label>
                    <input type="range" min={0} max={1439} step={15} value={takeoffMin}
                      onChange={e => { const v = Number(e.target.value); setTakeoffMin(Math.min(v, takeoffMax)); }}
                      className="w-full accent-[#0066FF]" />
                    <label className="text-[.65rem] text-[#8E95A9] font-semibold block mb-0.5 mt-1">{t('latest')}</label>
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
                      <h4 className="font-poppins font-black text-[.78rem] text-[#1A1D2B] uppercase tracking-wide">{t('landing')}</h4>
                      <span className="text-[.65rem] text-[#8E95A9] font-bold">
                        {landingMin === 0 && landingMax === 1439 ? t('atAnyTime') : `${minsToLabel(landingMin)} – ${minsToLabel(landingMax)}`}
                      </span>
                    </div>
                    <label className="text-[.65rem] text-[#8E95A9] font-semibold block mb-0.5">{t('earliest')}</label>
                    <input type="range" min={0} max={1439} step={15} value={landingMin}
                      onChange={e => { const v = Number(e.target.value); setLandingMin(Math.min(v, landingMax)); }}
                      className="w-full accent-[#0066FF]" />
                    <label className="text-[.65rem] text-[#8E95A9] font-semibold block mb-0.5 mt-1">{t('latest')}</label>
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
                  <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                    <h3 className="font-poppins font-black text-[.9rem] text-[#1A1D2B]">
                      {visibleFlights.length} {t('ofWord')} {directCount} {t('flightsWord')}
                    </h3>
                    <SaveSearchButton
                      type="flight"
                      label={`${originCity || originCode} → ${destCity || destCode} · ${depDate}${tripType === 'return' && retDate ? ` → ${retDate}` : ''} · ${t('passengersCount', { count: adults + children + infants })}`}
                      criteria={{
                        origin: originCode,
                        destination: destCode,
                        depDate,
                        retDate: tripType === 'return' ? retDate : undefined,
                        adults,
                        children,
                        infants,
                        cabinClass,
                        tripType,
                      }}
                      url={typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/flights'}
                      savedPricePence={(() => {
                        const prices = visibleFlights
                          .map((f) => (typeof f.price === 'number' ? f.price : null))
                          .filter((n): n is number => n !== null);
                        return prices.length > 0 ? Math.round(Math.min(...prices) * 100) : undefined;
                      })()}
                      currency="GBP"
                      className="text-[.74rem] py-1.5 px-3"
                    />
                  </div>

                  {visibleFlights.length === 0 ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
                      <span className="text-3xl mb-3 block">🔎</span>
                      {filtersActive ? (
                        <>
                          <p className="font-poppins font-bold text-[.95rem] text-[#1A1D2B] mb-2">{t('noFlightsFilters')}</p>
                          <button onClick={clearAllFilters} className="text-[.78rem] text-[#0066FF] font-bold hover:underline">
                            {t('clearAllFilters')}
                          </button>
                        </>
                      ) : (
                        <p className="font-poppins font-bold text-[.95rem] text-[#1A1D2B] mb-2">{t('noDirectFlights')}</p>
                      )}
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
                  const isKyte = f.source === 'kyte';
                  const isLiteapi = f.source === 'liteapi';
                  const isDirect = isDuffel || isKyte || isLiteapi;
                  const viewDealUrl = isDirect
                    ? '#' // Direct-bookable — see provider-comparison row for the on-site book button
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
                              {isCheapest && <span className="text-[.55rem] font-black uppercase tracking-[1.5px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">{t('cheapest')}</span>}
                            </div>
                            {f.flight_number && <div className="text-[.65rem] text-[#8E95A9] font-semibold">{f.airlineCode} {f.flight_number}</div>}
                            {isKyte && (
                              <div
                                className="flex items-center gap-1 text-emerald-700 text-[.7rem] font-bold mt-1"
                                title={t('kyteTooltip')}
                              >
                                <ShieldCheck size={12} strokeWidth={2.5} />
                                {t('directVia', { airline: f.airline })} · {t('livePrice')}
                              </div>
                            )}
                            {isLiteapi && (
                              <div
                                className="flex items-center gap-1 text-emerald-700 text-[.7rem] font-bold mt-1"
                                title={t('liteapiTooltip')}
                              >
                                <ShieldCheck size={12} strokeWidth={2.5} />
                                {t('bookDirectGuaranteed')}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Flight info */}
                        <div className="flex items-center gap-3">
                          <div className="text-center min-w-[50px]">
                            <div className="font-poppins font-black text-[1.05rem] text-[#1A1D2B]">{depTime}</div>
                            <div className="text-[.62rem] text-[#8E95A9] font-semibold">{f.origin_airport || originCode}</div>
                          </div>
                          <div className="flex-1 flex flex-col items-center gap-0.5 min-w-[80px]">
                            <div className="text-[.65rem] text-[#8E95A9] font-semibold">{duration}</div>
                            <div className="w-full flex items-center gap-0.5">
                              <div className="flex-1 h-px bg-[#D1D5DB]" />
                              <span className="text-[#B0B8CC] text-[.7rem]">✈</span>
                              <div className="flex-1 h-px bg-[#D1D5DB]" />
                            </div>
                            <span className={`text-[.58rem] font-black uppercase tracking-[1px] ${f.transfers === 0 ? 'text-green-600' : 'text-orange-500'}`}>
                              {f.transfers === 0 ? t('stopsDirect') : f.transfers === 1 ? t('stops1') : t('stopsN', { n: f.transfers })}
                            </span>
                          </div>
                          <div className="text-center min-w-[50px]">
                            <div className="font-poppins font-black text-[1.05rem] text-[#1A1D2B]">{arrTime}</div>
                            <div className="text-[.62rem] text-[#8E95A9] font-semibold">{f.destination_airport || destCode}</div>
                          </div>
                        </div>

                        {/* Price */}
                        <div className="flex items-center gap-4 md:flex-col md:items-end md:gap-2">
                          <div className="text-right">
                            {priceView === 'total' ? (
                              <>
                                <div className="font-poppins font-black text-[1.5rem] text-[#1A1D2B] leading-none">{f.currency}{Math.round(f.price * (adults + children))}</div>
                                <div className="text-[.6rem] text-[#8E95A9] font-semibold">
                                  {t('totalForPassengers', { count: adults + children })}{f.return_at ? t('commaReturn') : t('commaOneWay')}
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="font-poppins font-black text-[1.5rem] text-[#1A1D2B] leading-none">{f.currency}{f.price}</div>
                                <div className="text-[.6rem] text-[#8E95A9] font-semibold">
                                  {isDirect ? t('totalPricePerPerson') : t('perPersonTrip', { trip: f.return_at ? t('returnWord') : t('oneWayWord') })}
                                </div>
                              </>
                            )}
                            {isDuffel && (
                              <div className="text-[.55rem] text-green-600 font-bold mt-0.5">✓ {t('livePriceInclTaxes')}</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Return flight info */}
                      {f.return_at && f.duration_back > 0 && (
                        <div className="border-t border-[#F1F3F7] px-5 py-2.5 bg-[#FAFBFD] flex items-center gap-3 text-[.72rem] text-[#8E95A9] font-semibold">
                          <span className="text-[#5C6378] font-bold">{t('returnLabel')}</span>
                          <span>{fmtDate(f.return_at)}, {fmtTime(f.return_at)} → {arrivalTime(f.return_at, f.duration_back)}</span>
                          <span>({fmtDuration(f.duration_back)}, {f.transfers === 0 ? t('stopsDirect') : f.transfers === 1 ? t('stops1') : t('stopsN', { n: f.transfers })})</span>
                        </div>
                      )}

                      {/* Baggage — what's included in this fare (Phase 0, read-only) */}
                      {f.baggage && (
                        <div className="border-t border-[#F1F3F7] px-5 py-2.5 bg-white flex items-center gap-2 flex-wrap text-[.72rem] font-bold">
                          {f.baggage.cabin && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#F1F5FF] text-[#0066FF]">🎒 {t('bagCabin')}</span>
                          )}
                          {f.baggage.checked ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700">🧳 {f.baggage.checkedKg ? t('bagCheckedKg', { kg: f.baggage.checkedKg }) : t('bagChecked')}</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-700">🧳 {t('bagNoChecked')}</span>
                          )}
                          {f.fareFamily && (
                            <span className="text-[#8E95A9] font-semibold">· {f.fareFamily}</span>
                          )}
                        </div>
                      )}

                      {/* Provider comparison buttons */}
                      <div className="border-t border-[#F1F3F7] px-5 py-3 bg-[#FAFBFD]">
                        <div className="text-[.62rem] text-[#8E95A9] font-bold uppercase tracking-[1px] mb-2">{t('bookDirectHeader')}</div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                          {isDuffel && f.offer_id ? (
                            <a href={`/checkout/${f.offer_id}`}
                              className="flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-poppins font-bold text-[.7rem] py-2 px-3 rounded-lg transition-all shadow-sm whitespace-nowrap col-span-2 sm:col-span-3 lg:col-span-5">
                              ✓ {t('bookDirectShort')} — {f.currency}{priceView === 'total' ? Math.round(f.price * (adults + children)) : f.price}{priceView === 'total' ? t('priceSuffixTotal') : t('priceSuffixPp')} →
                            </a>
                          ) : isKyte && f.offer_id && f.link ? (
                            <a href={f.link}
                              onClick={() => {
                                // Stash the full offer so the booking page has price + times + carrier
                                // without re-fetching from Kyte (which would burn Fixie quota and
                                // risk expired-offer errors). `destinationCode` / `destinationCity`
                                // power the Scout neighbourhood-intel section on the success page.
                                try {
                                  sessionStorage.setItem(
                                    `kyte-offer-${f.offer_id}`,
                                    JSON.stringify({
                                      ...f,
                                      _searchedAt: Date.now(),
                                      originCode,
                                      originCity,
                                      destinationCode: destCode,
                                      destinationCity: destCity,
                                    }),
                                  );
                                } catch { /* sessionStorage unavailable — page will refetch */ }
                              }}
                              title="Bypassing third-party agents. Booked directly with the airline via JetMeAway's secure scout engine — no markups, no booking fees."
                              className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-poppins font-bold text-[.7rem] py-2 px-3 rounded-lg transition-all shadow-sm whitespace-nowrap col-span-2 sm:col-span-3 lg:col-span-5">
                              <ShieldCheck size={14} strokeWidth={2.5} />
                              {t('bookDirectShort')} — {f.currency}{priceView === 'total' ? Math.round(f.price * (adults + children)) : f.price}{priceView === 'total' ? t('priceSuffixTotal') : t('priceSuffixPp')} →
                            </a>
                          ) : isLiteapi && f.offer_id ? (
                            <button type="button"
                              onClick={async (e) => {
                                // Mint a pending-flight ref server-side (stores offerId + trip
                                // summary in KV, never exposing offerId in a URL), then route to
                                // the LiteAPI checkout page. PARKED: while LITEAPI_FLIGHTS_ENABLED
                                // is unset the start-booking route 404s, so nothing happens in prod.
                                const btn = e.currentTarget;
                                if (btn.dataset.busy === '1') return;
                                btn.dataset.busy = '1';
                                try {
                                  const res = await fetch('/api/flights/liteapi/start-booking', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      offerId: f.offer_id,
                                      trip: {
                                        origin: f.origin_airport || originCode,
                                        destination: f.destination_airport || destCode,
                                        depDate,
                                        ...(effectiveRet ? { retDate: effectiveRet } : {}),
                                        adults,
                                        children,
                                        infants,
                                        cabin: cabinClass,
                                        currency: symbolToCurrencyCode(f.currency),
                                        // f.price is per-person; the trip total (used by the
                                        // prebook drift guard vs LiteAPI's whole-party price)
                                        // must be the whole-party amount.
                                        totalPrice: f.price * (adults + children + infants),
                                        airline: f.airlineCode,
                                        airlineName: f.airline,
                                      },
                                    }),
                                  });
                                  const data = await res.json().catch(() => null);
                                  if (res.ok && data?.ref) {
                                    router.push(`/flights/liteapi/checkout/${data.ref}`);
                                    return;
                                  }
                                } catch { /* network hiccup — allow retry below */ }
                                btn.dataset.busy = '';
                              }}
                              title={t('liteapiTooltip')}
                              className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-poppins font-bold text-[.7rem] py-2 px-3 rounded-lg transition-all shadow-sm whitespace-nowrap col-span-2 sm:col-span-3 lg:col-span-5 disabled:opacity-60">
                              <ShieldCheck size={14} strokeWidth={2.5} />
                              {t('bookDirectShort')} — {f.currency}{priceView === 'total' ? Math.round(f.price * (adults + children)) : f.price}{priceView === 'total' ? t('priceSuffixTotal') : t('priceSuffixPp')} →
                            </button>
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
                  {t('noFlightsFound')}
                </p>
                <p className="text-[.78rem] text-[#8E95A9] font-semibold">
                  {t('tryDifferentDates')}
                </p>
              </div>
            </section>
          )}

          {/* Section 3: Provider Comparison Strip */}
          <section className="max-w-[1000px] mx-auto px-5 pb-8">
            <h3 className="font-poppins font-black text-[1.05rem] text-[#1A1D2B] mb-4">{t('compareRoute')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {PROVIDERS.map(p => {
                const url = p.getUrl(originCode, destCode, depDate, effectiveRet, adults, originCity, destCity);
                return (
                  <div key={p.name} className="bg-white border border-[#E8ECF4] rounded-xl p-4 flex flex-col items-center text-center hover:border-blue-300 hover:shadow-md transition-all">
                    <div className="w-10 h-10 rounded-lg bg-[#F8FAFC] border border-[#E8ECF4] flex items-center justify-center text-xl mb-2">{p.logo}</div>
                    <div className="font-poppins font-bold text-[.85rem] text-[#1A1D2B] mb-1">{p.name}</div>
                    {cheapest && (
                      <div className="text-[.75rem] font-bold text-green-600 mb-2">{t('fromCap')} £{cheapest.price}</div>
                    )}
                    {!cheapest && (
                      <div className="text-[.72rem] font-semibold text-[#8E95A9] mb-2">{t('checkPrice')}</div>
                    )}
                    <a href={redirectUrl(url, p.name, destCity || destCode, 'flights')}
                      className="w-full bg-[#0066FF] hover:bg-[#0052CC] text-white font-poppins font-bold text-[.72rem] py-2 rounded-lg transition-all">
                      {t('searchProvider', { name: p.name })}
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
                <h4 className="font-poppins font-black text-[.9rem] text-[#1A1D2B] mb-1">{t('hotelsIn', { dest: destCity || destCode })}</h4>
                <p className="text-[.75rem] text-[#5C6378] font-semibold mb-3">{t('foundYourFlight')}</p>
                <a href={`/hotels?destination=${encodeURIComponent(destCity || destCode)}${depDate ? `&checkin=${depDate}` : ''}${retDate ? `&checkout=${retDate}` : ''}`}
                  className="inline-block bg-white hover:bg-blue-50 text-[#0066FF] font-poppins font-bold text-[.75rem] px-4 py-2 rounded-lg border border-blue-200 transition-all">
                  {t('compareHotels')}
                </a>
              </div>

              {/* Car Hire */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-5">
                <span className="text-2xl mb-2 block">🚗</span>
                <h4 className="font-poppins font-black text-[.9rem] text-[#1A1D2B] mb-1">{t('carHireAt', { dest: destCity || destCode })}</h4>
                <p className="text-[.75rem] text-[#5C6378] font-semibold mb-3">{t('needWheels')}</p>
                <a href={`/cars?location=${encodeURIComponent(destCity || destCode)}`}
                  className="inline-block bg-white hover:bg-amber-50 text-amber-600 font-poppins font-bold text-[.75rem] px-4 py-2 rounded-lg border border-amber-200 transition-all">
                  {t('compareCarHire')}
                </a>
              </div>

              {/* Packages */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 rounded-2xl p-5">
                <span className="text-2xl mb-2 block">📦</span>
                <h4 className="font-poppins font-black text-[.9rem] text-[#1A1D2B] mb-1">{t('completePackage')}</h4>
                <p className="text-[.75rem] text-[#5C6378] font-semibold mb-3">{t('savePackage')}</p>
                <a href={`/packages?from=${originCode}&to=${destCode}&depart=${depDate}&return=${retDate}`}
                  className="inline-block bg-white hover:bg-purple-50 text-purple-600 font-poppins font-bold text-[.75rem] px-4 py-2 rounded-lg border border-purple-200 transition-all">
                  {t('viewPackages')}
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
          <h3 className="font-poppins font-black text-[1.05rem] text-[#1A1D2B] mb-4">{t('tipsTitle')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              [t('tips.bookAhead.title'), t('tips.bookAhead.body')],
              [t('tips.midWeek.title'), t('tips.midWeek.body')],
              [t('tips.nearbyAirports.title'), t('tips.nearbyAirports.body')],
              [t('tips.flexDates.title'), t('tips.flexDates.body')],
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
