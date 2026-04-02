'use client';

import { useState, useRef, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

// ─── 250+ worldwide airports ───────────────────────────────────────────────
const AIRPORTS = [
  // UK & Ireland
  { code: 'LHR', name: 'Heathrow', city: 'London', country: 'GB' },
  { code: 'LGW', name: 'Gatwick', city: 'London', country: 'GB' },
  { code: 'STN', name: 'Stansted', city: 'London', country: 'GB' },
  { code: 'LTN', name: 'Luton', city: 'London', country: 'GB' },
  { code: 'LCY', name: 'London City', city: 'London', country: 'GB' },
  { code: 'MAN', name: 'Manchester Airport', city: 'Manchester', country: 'GB' },
  { code: 'BHX', name: 'Birmingham Airport', city: 'Birmingham', country: 'GB' },
  { code: 'EDI', name: 'Edinburgh Airport', city: 'Edinburgh', country: 'GB' },
  { code: 'GLA', name: 'Glasgow Airport', city: 'Glasgow', country: 'GB' },
  { code: 'BRS', name: 'Bristol Airport', city: 'Bristol', country: 'GB' },
  { code: 'NCL', name: 'Newcastle Airport', city: 'Newcastle', country: 'GB' },
  { code: 'LBA', name: 'Leeds Bradford Airport', city: 'Leeds', country: 'GB' },
  { code: 'LPL', name: 'John Lennon Airport', city: 'Liverpool', country: 'GB' },
  { code: 'ABZ', name: 'Aberdeen Airport', city: 'Aberdeen', country: 'GB' },
  { code: 'BFS', name: 'Belfast International', city: 'Belfast', country: 'GB' },
  { code: 'BHD', name: 'Belfast City Airport', city: 'Belfast', country: 'GB' },
  { code: 'CWL', name: 'Cardiff Airport', city: 'Cardiff', country: 'GB' },
  { code: 'INV', name: 'Inverness Airport', city: 'Inverness', country: 'GB' },
  { code: 'SOU', name: 'Southampton Airport', city: 'Southampton', country: 'GB' },
  { code: 'EXT', name: 'Exeter Airport', city: 'Exeter', country: 'GB' },
  { code: 'DUB', name: 'Dublin Airport', city: 'Dublin', country: 'IE' },
  { code: 'ORK', name: 'Cork Airport', city: 'Cork', country: 'IE' },
  { code: 'SNN', name: 'Shannon Airport', city: 'Shannon', country: 'IE' },
  // Europe
  { code: 'CDG', name: 'Charles de Gaulle', city: 'Paris', country: 'FR' },
  { code: 'ORY', name: 'Paris Orly', city: 'Paris', country: 'FR' },
  { code: 'NCE', name: 'Nice Côte d\'Azur', city: 'Nice', country: 'FR' },
  { code: 'MRS', name: 'Marseille Provence', city: 'Marseille', country: 'FR' },
  { code: 'LYS', name: 'Lyon Saint-Exupéry', city: 'Lyon', country: 'FR' },
  { code: 'BOD', name: 'Bordeaux–Mérignac', city: 'Bordeaux', country: 'FR' },
  { code: 'TLS', name: 'Toulouse-Blagnac', city: 'Toulouse', country: 'FR' },
  { code: 'AMS', name: 'Amsterdam Schiphol', city: 'Amsterdam', country: 'NL' },
  { code: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'DE' },
  { code: 'MUC', name: 'Munich Airport', city: 'Munich', country: 'DE' },
  { code: 'BER', name: 'Berlin Brandenburg', city: 'Berlin', country: 'DE' },
  { code: 'DUS', name: 'Düsseldorf Airport', city: 'Düsseldorf', country: 'DE' },
  { code: 'HAM', name: 'Hamburg Airport', city: 'Hamburg', country: 'DE' },
  { code: 'STR', name: 'Stuttgart Airport', city: 'Stuttgart', country: 'DE' },
  { code: 'CGN', name: 'Cologne Bonn Airport', city: 'Cologne', country: 'DE' },
  { code: 'MAD', name: 'Adolfo Suárez Barajas', city: 'Madrid', country: 'ES' },
  { code: 'BCN', name: 'Barcelona El Prat', city: 'Barcelona', country: 'ES' },
  { code: 'PMI', name: 'Palma de Mallorca', city: 'Palma', country: 'ES' },
  { code: 'AGP', name: 'Málaga Costa del Sol', city: 'Málaga', country: 'ES' },
  { code: 'TFS', name: 'Tenerife South', city: 'Tenerife', country: 'ES' },
  { code: 'TFN', name: 'Tenerife North', city: 'Tenerife', country: 'ES' },
  { code: 'LPA', name: 'Gran Canaria Airport', city: 'Las Palmas', country: 'ES' },
  { code: 'ALC', name: 'Alicante-Elche Airport', city: 'Alicante', country: 'ES' },
  { code: 'VLC', name: 'Valencia Airport', city: 'Valencia', country: 'ES' },
  { code: 'IBZ', name: 'Ibiza Airport', city: 'Ibiza', country: 'ES' },
  { code: 'FCO', name: 'Leonardo da Vinci', city: 'Rome', country: 'IT' },
  { code: 'CIA', name: 'Rome Ciampino', city: 'Rome', country: 'IT' },
  { code: 'MXP', name: 'Milan Malpensa', city: 'Milan', country: 'IT' },
  { code: 'LIN', name: 'Milan Linate', city: 'Milan', country: 'IT' },
  { code: 'VCE', name: 'Venice Marco Polo', city: 'Venice', country: 'IT' },
  { code: 'NAP', name: 'Naples International', city: 'Naples', country: 'IT' },
  { code: 'CTA', name: 'Catania Fontanarossa', city: 'Catania', country: 'IT' },
  { code: 'BLQ', name: 'Bologna Guglielmo Marconi', city: 'Bologna', country: 'IT' },
  { code: 'PMO', name: 'Palermo Falcone-Borsellino', city: 'Palermo', country: 'IT' },
  { code: 'LIS', name: 'Humberto Delgado Airport', city: 'Lisbon', country: 'PT' },
  { code: 'OPO', name: 'Francisco Sá Carneiro', city: 'Porto', country: 'PT' },
  { code: 'FAO', name: 'Faro Airport', city: 'Faro', country: 'PT' },
  { code: 'FNC', name: 'Madeira Airport', city: 'Funchal', country: 'PT' },
  { code: 'ZRH', name: 'Zürich Airport', city: 'Zürich', country: 'CH' },
  { code: 'GVA', name: 'Geneva Airport', city: 'Geneva', country: 'CH' },
  { code: 'VIE', name: 'Vienna International', city: 'Vienna', country: 'AT' },
  { code: 'BRU', name: 'Brussels Airport', city: 'Brussels', country: 'BE' },
  { code: 'CPH', name: 'Copenhagen Airport', city: 'Copenhagen', country: 'DK' },
  { code: 'ARN', name: 'Stockholm Arlanda', city: 'Stockholm', country: 'SE' },
  { code: 'GOT', name: 'Gothenburg Landvetter', city: 'Gothenburg', country: 'SE' },
  { code: 'OSL', name: 'Oslo Gardermoen', city: 'Oslo', country: 'NO' },
  { code: 'BGO', name: 'Bergen Flesland', city: 'Bergen', country: 'NO' },
  { code: 'HEL', name: 'Helsinki-Vantaa', city: 'Helsinki', country: 'FI' },
  { code: 'WAW', name: 'Warsaw Chopin', city: 'Warsaw', country: 'PL' },
  { code: 'KRK', name: 'Kraków John Paul II', city: 'Kraków', country: 'PL' },
  { code: 'GDN', name: 'Gdańsk Lech Wałęsa', city: 'Gdańsk', country: 'PL' },
  { code: 'PRG', name: 'Václav Havel Airport', city: 'Prague', country: 'CZ' },
  { code: 'BUD', name: 'Budapest Ferenc Liszt', city: 'Budapest', country: 'HU' },
  { code: 'OTP', name: 'Henri Coandă International', city: 'Bucharest', country: 'RO' },
  { code: 'SOF', name: 'Sofia Airport', city: 'Sofia', country: 'BG' },
  { code: 'ATH', name: 'Athens Eleftherios Venizelos', city: 'Athens', country: 'GR' },
  { code: 'HER', name: 'Heraklion International', city: 'Heraklion', country: 'GR' },
  { code: 'RHO', name: 'Rhodes Diagoras', city: 'Rhodes', country: 'GR' },
  { code: 'CFU', name: 'Corfu Ioannis Kapodistrias', city: 'Corfu', country: 'GR' },
  { code: 'SKG', name: 'Thessaloniki Makedonia', city: 'Thessaloniki', country: 'GR' },
  { code: 'ZTH', name: 'Zakynthos Airport', city: 'Zakynthos', country: 'GR' },
  { code: 'CHQ', name: 'Chania International', city: 'Chania', country: 'GR' },
  { code: 'IST', name: 'Istanbul Airport', city: 'Istanbul', country: 'TR' },
  { code: 'SAW', name: 'Istanbul Sabiha Gökçen', city: 'Istanbul', country: 'TR' },
  { code: 'AYT', name: 'Antalya Airport', city: 'Antalya', country: 'TR' },
  { code: 'ADB', name: 'Adnan Menderes Airport', city: 'Izmir', country: 'TR' },
  { code: 'ESB', name: 'Ankara Esenboğa', city: 'Ankara', country: 'TR' },
  { code: 'DLM', name: 'Dalaman Airport', city: 'Dalaman', country: 'TR' },
  { code: 'KEF', name: 'Keflavík International', city: 'Reykjavik', country: 'IS' },
  { code: 'TLL', name: 'Tallinn Airport', city: 'Tallinn', country: 'EE' },
  { code: 'RIX', name: 'Riga International', city: 'Riga', country: 'LV' },
  { code: 'VNO', name: 'Vilnius Airport', city: 'Vilnius', country: 'LT' },
  { code: 'KIV', name: 'Chișinău International', city: 'Chișinău', country: 'MD' },
  { code: 'TBS', name: 'Tbilisi International', city: 'Tbilisi', country: 'GE' },
  { code: 'EVN', name: 'Zvartnots International', city: 'Yerevan', country: 'AM' },
  { code: 'GYD', name: 'Heydar Aliyev International', city: 'Baku', country: 'AZ' },
  { code: 'SKP', name: 'Skopje International', city: 'Skopje', country: 'MK' },
  { code: 'TGD', name: 'Podgorica Airport', city: 'Podgorica', country: 'ME' },
  { code: 'SPU', name: 'Split Airport', city: 'Split', country: 'HR' },
  { code: 'DBV', name: 'Dubrovnik Airport', city: 'Dubrovnik', country: 'HR' },
  { code: 'ZAG', name: 'Zagreb Airport', city: 'Zagreb', country: 'HR' },
  { code: 'BEG', name: 'Belgrade Nikola Tesla', city: 'Belgrade', country: 'RS' },
  { code: 'LJU', name: 'Ljubljana Jože Pučnik', city: 'Ljubljana', country: 'SI' },
  { code: 'SJJ', name: 'Sarajevo International', city: 'Sarajevo', country: 'BA' },
  { code: 'TIA', name: 'Tirana International', city: 'Tirana', country: 'AL' },
  { code: 'MLT', name: 'Malta International', city: 'Valletta', country: 'MT' },
  // USA & Canada
  { code: 'JFK', name: 'John F. Kennedy International', city: 'New York', country: 'US' },
  { code: 'EWR', name: 'Newark Liberty International', city: 'New York', country: 'US' },
  { code: 'LGA', name: 'LaGuardia Airport', city: 'New York', country: 'US' },
  { code: 'BOS', name: 'Logan International', city: 'Boston', country: 'US' },
  { code: 'ORD', name: "O'Hare International", city: 'Chicago', country: 'US' },
  { code: 'MDW', name: 'Midway International', city: 'Chicago', country: 'US' },
  { code: 'ATL', name: 'Hartsfield-Jackson Atlanta', city: 'Atlanta', country: 'US' },
  { code: 'MIA', name: 'Miami International', city: 'Miami', country: 'US' },
  { code: 'FLL', name: 'Fort Lauderdale-Hollywood', city: 'Fort Lauderdale', country: 'US' },
  { code: 'LAX', name: 'Los Angeles International', city: 'Los Angeles', country: 'US' },
  { code: 'SFO', name: 'San Francisco International', city: 'San Francisco', country: 'US' },
  { code: 'SJC', name: 'Norman Y. Mineta San José', city: 'San Jose', country: 'US' },
  { code: 'SEA', name: 'Seattle-Tacoma International', city: 'Seattle', country: 'US' },
  { code: 'DFW', name: 'Dallas/Fort Worth International', city: 'Dallas', country: 'US' },
  { code: 'IAH', name: 'George Bush Intercontinental', city: 'Houston', country: 'US' },
  { code: 'DEN', name: 'Denver International', city: 'Denver', country: 'US' },
  { code: 'LAS', name: 'Harry Reid International', city: 'Las Vegas', country: 'US' },
  { code: 'PHX', name: 'Phoenix Sky Harbor', city: 'Phoenix', country: 'US' },
  { code: 'MCO', name: 'Orlando International', city: 'Orlando', country: 'US' },
  { code: 'TPA', name: 'Tampa International', city: 'Tampa', country: 'US' },
  { code: 'IAD', name: 'Dulles International', city: 'Washington D.C.', country: 'US' },
  { code: 'DCA', name: 'Ronald Reagan National', city: 'Washington D.C.', country: 'US' },
  { code: 'BWI', name: 'Baltimore/Washington International', city: 'Baltimore', country: 'US' },
  { code: 'DTW', name: 'Detroit Metropolitan', city: 'Detroit', country: 'US' },
  { code: 'MSP', name: 'Minneapolis-Saint Paul International', city: 'Minneapolis', country: 'US' },
  { code: 'PHL', name: 'Philadelphia International', city: 'Philadelphia', country: 'US' },
  { code: 'CLT', name: 'Charlotte Douglas International', city: 'Charlotte', country: 'US' },
  { code: 'SLC', name: 'Salt Lake City International', city: 'Salt Lake City', country: 'US' },
  { code: 'PDX', name: 'Portland International', city: 'Portland', country: 'US' },
  { code: 'HNL', name: 'Daniel K. Inouye International', city: 'Honolulu', country: 'US' },
  { code: 'ANC', name: 'Ted Stevens Anchorage', city: 'Anchorage', country: 'US' },
  { code: 'YYZ', name: 'Toronto Pearson International', city: 'Toronto', country: 'CA' },
  { code: 'YUL', name: 'Montreal-Trudeau International', city: 'Montreal', country: 'CA' },
  { code: 'YVR', name: 'Vancouver International', city: 'Vancouver', country: 'CA' },
  { code: 'YYC', name: 'Calgary International', city: 'Calgary', country: 'CA' },
  { code: 'YEG', name: 'Edmonton International', city: 'Edmonton', country: 'CA' },
  { code: 'YOW', name: 'Ottawa Macdonald-Cartier', city: 'Ottawa', country: 'CA' },
  { code: 'YHZ', name: 'Halifax Stanfield International', city: 'Halifax', country: 'CA' },
  // Caribbean & Mexico
  { code: 'CUN', name: 'Cancún International', city: 'Cancún', country: 'MX' },
  { code: 'MEX', name: 'Benito Juárez International', city: 'Mexico City', country: 'MX' },
  { code: 'GDL', name: 'Miguel Hidalgo International', city: 'Guadalajara', country: 'MX' },
  { code: 'MTY', name: 'General Mariano Escobedo', city: 'Monterrey', country: 'MX' },
  { code: 'PUJ', name: 'Punta Cana International', city: 'Punta Cana', country: 'DO' },
  { code: 'SDQ', name: 'Las Américas International', city: 'Santo Domingo', country: 'DO' },
  { code: 'SJU', name: 'Luis Muñoz Marín International', city: 'San Juan', country: 'PR' },
  { code: 'MBJ', name: 'Sangster International', city: 'Montego Bay', country: 'JM' },
  { code: 'NAS', name: 'Lynden Pindling International', city: 'Nassau', country: 'BS' },
  { code: 'BGI', name: 'Grantley Adams International', city: 'Bridgetown', country: 'BB' },
  { code: 'HAV', name: 'José Martí International', city: 'Havana', country: 'CU' },
  { code: 'AUA', name: 'Queen Beatrix International', city: 'Oranjestad', country: 'AW' },
  // Middle East
  { code: 'DXB', name: 'Dubai International', city: 'Dubai', country: 'AE' },
  { code: 'AUH', name: 'Abu Dhabi International', city: 'Abu Dhabi', country: 'AE' },
  { code: 'SHJ', name: 'Sharjah International', city: 'Sharjah', country: 'AE' },
  { code: 'DOH', name: 'Hamad International', city: 'Doha', country: 'QA' },
  { code: 'RUH', name: 'King Khalid International', city: 'Riyadh', country: 'SA' },
  { code: 'JED', name: 'King Abdulaziz International', city: 'Jeddah', country: 'SA' },
  { code: 'MCT', name: 'Muscat International', city: 'Muscat', country: 'OM' },
  { code: 'KWI', name: 'Kuwait International', city: 'Kuwait City', country: 'KW' },
  { code: 'BAH', name: 'Bahrain International', city: 'Manama', country: 'BH' },
  { code: 'AMM', name: 'Queen Alia International', city: 'Amman', country: 'JO' },
  { code: 'BEY', name: 'Rafic Hariri International', city: 'Beirut', country: 'LB' },
  { code: 'TLV', name: 'Ben Gurion International', city: 'Tel Aviv', country: 'IL' },
  // Africa
  { code: 'CAI', name: 'Cairo International', city: 'Cairo', country: 'EG' },
  { code: 'HRG', name: 'Hurghada International', city: 'Hurghada', country: 'EG' },
  { code: 'SSH', name: 'Sharm el-Sheikh International', city: 'Sharm el-Sheikh', country: 'EG' },
  { code: 'CMN', name: 'Mohammed V International', city: 'Casablanca', country: 'MA' },
  { code: 'RAK', name: 'Marrakesh Menara Airport', city: 'Marrakesh', country: 'MA' },
  { code: 'TUN', name: 'Tunis-Carthage International', city: 'Tunis', country: 'TN' },
  { code: 'DJE', name: 'Djerba-Zarzis International', city: 'Djerba', country: 'TN' },
  { code: 'ALG', name: 'Houari Boumediene Airport', city: 'Algiers', country: 'DZ' },
  { code: 'NBO', name: 'Jomo Kenyatta International', city: 'Nairobi', country: 'KE' },
  { code: 'MBA', name: 'Mombasa Moi International', city: 'Mombasa', country: 'KE' },
  { code: 'ADD', name: 'Addis Ababa Bole International', city: 'Addis Ababa', country: 'ET' },
  { code: 'JNB', name: 'O.R. Tambo International', city: 'Johannesburg', country: 'ZA' },
  { code: 'CPT', name: 'Cape Town International', city: 'Cape Town', country: 'ZA' },
  { code: 'DUR', name: 'King Shaka International', city: 'Durban', country: 'ZA' },
  { code: 'LOS', name: 'Murtala Muhammed International', city: 'Lagos', country: 'NG' },
  { code: 'ABV', name: 'Nnamdi Azikiwe International', city: 'Abuja', country: 'NG' },
  { code: 'ACC', name: 'Kotoka International', city: 'Accra', country: 'GH' },
  { code: 'DAK', name: 'Blaise Diagne International', city: 'Dakar', country: 'SN' },
  { code: 'ABJ', name: 'Félix-Houphouët-Boigny', city: 'Abidjan', country: 'CI' },
  // South Asia
  { code: 'DEL', name: 'Indira Gandhi International', city: 'New Delhi', country: 'IN' },
  { code: 'BOM', name: 'Chhatrapati Shivaji International', city: 'Mumbai', country: 'IN' },
  { code: 'BLR', name: 'Kempegowda International', city: 'Bangalore', country: 'IN' },
  { code: 'MAA', name: 'Chennai International', city: 'Chennai', country: 'IN' },
  { code: 'HYD', name: 'Rajiv Gandhi International', city: 'Hyderabad', country: 'IN' },
  { code: 'CCU', name: 'Netaji Subhas Chandra Bose', city: 'Kolkata', country: 'IN' },
  { code: 'COK', name: 'Cochin International', city: 'Kochi', country: 'IN' },
  { code: 'AMD', name: 'Sardar Vallabhbhai Patel', city: 'Ahmedabad', country: 'IN' },
  { code: 'PNQ', name: 'Pune Airport', city: 'Pune', country: 'IN' },
  { code: 'GAU', name: 'Lokpriya Gopinath Bordoloi', city: 'Guwahati', country: 'IN' },
  { code: 'KTM', name: 'Tribhuvan International', city: 'Kathmandu', country: 'NP' },
  { code: 'CMB', name: 'Bandaranaike International', city: 'Colombo', country: 'LK' },
  { code: 'DAC', name: 'Hazrat Shahjalal International', city: 'Dhaka', country: 'BD' },
  { code: 'KHI', name: 'Jinnah International', city: 'Karachi', country: 'PK' },
  { code: 'LHE', name: 'Allama Iqbal International', city: 'Lahore', country: 'PK' },
  { code: 'ISB', name: 'New Islamabad International', city: 'Islamabad', country: 'PK' },
  // Southeast & East Asia
  { code: 'SIN', name: 'Singapore Changi', city: 'Singapore', country: 'SG' },
  { code: 'KUL', name: 'Kuala Lumpur International', city: 'Kuala Lumpur', country: 'MY' },
  { code: 'LGK', name: 'Langkawi International', city: 'Langkawi', country: 'MY' },
  { code: 'PEN', name: 'Penang International', city: 'Penang', country: 'MY' },
  { code: 'BKK', name: 'Suvarnabhumi Airport', city: 'Bangkok', country: 'TH' },
  { code: 'DMK', name: 'Don Mueang International', city: 'Bangkok', country: 'TH' },
  { code: 'HKT', name: 'Phuket International', city: 'Phuket', country: 'TH' },
  { code: 'CNX', name: 'Chiang Mai International', city: 'Chiang Mai', country: 'TH' },
  { code: 'CGK', name: 'Soekarno-Hatta International', city: 'Jakarta', country: 'ID' },
  { code: 'DPS', name: 'Ngurah Rai International', city: 'Bali', country: 'ID' },
  { code: 'SUB', name: 'Juanda International', city: 'Surabaya', country: 'ID' },
  { code: 'MNL', name: 'Ninoy Aquino International', city: 'Manila', country: 'PH' },
  { code: 'CEB', name: 'Mactan-Cebu International', city: 'Cebu', country: 'PH' },
  { code: 'SGN', name: 'Tan Son Nhat International', city: 'Ho Chi Minh City', country: 'VN' },
  { code: 'HAN', name: 'Noi Bai International', city: 'Hanoi', country: 'VN' },
  { code: 'DAD', name: 'Da Nang International', city: 'Da Nang', country: 'VN' },
  { code: 'REP', name: 'Siem Reap International', city: 'Siem Reap', country: 'KH' },
  { code: 'PNH', name: 'Phnom Penh International', city: 'Phnom Penh', country: 'KH' },
  { code: 'RGN', name: 'Yangon International', city: 'Yangon', country: 'MM' },
  { code: 'VTE', name: 'Wattay International', city: 'Vientiane', country: 'LA' },
  { code: 'MLE', name: 'Velana International', city: 'Malé', country: 'MV' },
  { code: 'HKG', name: 'Hong Kong International', city: 'Hong Kong', country: 'HK' },
  { code: 'MFM', name: 'Macau International', city: 'Macau', country: 'MO' },
  { code: 'PVG', name: 'Shanghai Pudong International', city: 'Shanghai', country: 'CN' },
  { code: 'SHA', name: 'Shanghai Hongqiao International', city: 'Shanghai', country: 'CN' },
  { code: 'PEK', name: 'Beijing Capital International', city: 'Beijing', country: 'CN' },
  { code: 'PKX', name: 'Beijing Daxing International', city: 'Beijing', country: 'CN' },
  { code: 'CAN', name: 'Guangzhou Baiyun International', city: 'Guangzhou', country: 'CN' },
  { code: 'SZX', name: 'Shenzhen Bao\'an International', city: 'Shenzhen', country: 'CN' },
  { code: 'CTU', name: 'Chengdu Tianfu International', city: 'Chengdu', country: 'CN' },
  { code: 'KMG', name: 'Kunming Changshui International', city: 'Kunming', country: 'CN' },
  { code: 'XIY', name: "Xi'an Xianyang International", city: "Xi'an", country: 'CN' },
  { code: 'HGH', name: 'Hangzhou Xiaoshan International', city: 'Hangzhou', country: 'CN' },
  { code: 'NKG', name: 'Nanjing Lukou International', city: 'Nanjing', country: 'CN' },
  { code: 'WUH', name: 'Wuhan Tianhe International', city: 'Wuhan', country: 'CN' },
  { code: 'NRT', name: 'Tokyo Narita International', city: 'Tokyo', country: 'JP' },
  { code: 'HND', name: 'Tokyo Haneda International', city: 'Tokyo', country: 'JP' },
  { code: 'KIX', name: 'Kansai International', city: 'Osaka', country: 'JP' },
  { code: 'ITM', name: 'Osaka Itami Airport', city: 'Osaka', country: 'JP' },
  { code: 'NGO', name: 'Chubu Centrair International', city: 'Nagoya', country: 'JP' },
  { code: 'FUK', name: 'Fukuoka Airport', city: 'Fukuoka', country: 'JP' },
  { code: 'CTS', name: 'New Chitose Airport', city: 'Sapporo', country: 'JP' },
  { code: 'OKA', name: 'Naha Airport', city: 'Okinawa', country: 'JP' },
  { code: 'ICN', name: 'Incheon International', city: 'Seoul', country: 'KR' },
  { code: 'GMP', name: 'Gimpo International', city: 'Seoul', country: 'KR' },
  { code: 'PUS', name: 'Gimhae International', city: 'Busan', country: 'KR' },
  { code: 'CJU', name: 'Jeju International', city: 'Jeju', country: 'KR' },
  { code: 'TPE', name: 'Taiwan Taoyuan International', city: 'Taipei', country: 'TW' },
  { code: 'KHH', name: 'Kaohsiung International', city: 'Kaohsiung', country: 'TW' },
  // Oceania
  { code: 'SYD', name: 'Sydney Kingsford Smith', city: 'Sydney', country: 'AU' },
  { code: 'MEL', name: 'Melbourne Airport', city: 'Melbourne', country: 'AU' },
  { code: 'BNE', name: 'Brisbane Airport', city: 'Brisbane', country: 'AU' },
  { code: 'PER', name: 'Perth Airport', city: 'Perth', country: 'AU' },
  { code: 'ADL', name: 'Adelaide Airport', city: 'Adelaide', country: 'AU' },
  { code: 'CBR', name: 'Canberra Airport', city: 'Canberra', country: 'AU' },
  { code: 'OOL', name: 'Gold Coast Airport', city: 'Gold Coast', country: 'AU' },
  { code: 'CNS', name: 'Cairns Airport', city: 'Cairns', country: 'AU' },
  { code: 'AKL', name: 'Auckland International', city: 'Auckland', country: 'NZ' },
  { code: 'WLG', name: 'Wellington International', city: 'Wellington', country: 'NZ' },
  { code: 'CHC', name: 'Christchurch International', city: 'Christchurch', country: 'NZ' },
  { code: 'ZQN', name: 'Queenstown Airport', city: 'Queenstown', country: 'NZ' },
  { code: 'NAN', name: 'Nadi International', city: 'Nadi', country: 'FJ' },
  { code: 'PPT', name: "Faa'a International", city: 'Papeete', country: 'PF' },
  // South America
  { code: 'GRU', name: 'São Paulo Guarulhos', city: 'São Paulo', country: 'BR' },
  { code: 'GIG', name: 'Rio Galeão International', city: 'Rio de Janeiro', country: 'BR' },
  { code: 'SDU', name: 'Santos Dumont Airport', city: 'Rio de Janeiro', country: 'BR' },
  { code: 'BSB', name: 'Brasília International', city: 'Brasília', country: 'BR' },
  { code: 'CNF', name: 'Tancredo Neves International', city: 'Belo Horizonte', country: 'BR' },
  { code: 'FOR', name: 'Fortaleza International', city: 'Fortaleza', country: 'BR' },
  { code: 'REC', name: 'Recife/Guararapes International', city: 'Recife', country: 'BR' },
  { code: 'EZE', name: 'Ministro Pistarini International', city: 'Buenos Aires', country: 'AR' },
  { code: 'AEP', name: 'Jorge Newbery Airfield', city: 'Buenos Aires', country: 'AR' },
  { code: 'COR', name: 'Córdoba International', city: 'Córdoba', country: 'AR' },
  { code: 'SCL', name: 'Comodoro Arturo Merino Benítez', city: 'Santiago', country: 'CL' },
  { code: 'BOG', name: 'El Dorado International', city: 'Bogotá', country: 'CO' },
  { code: 'MDE', name: 'José María Córdova International', city: 'Medellín', country: 'CO' },
  { code: 'LIM', name: 'Jorge Chávez International', city: 'Lima', country: 'PE' },
  { code: 'CUZ', name: 'Alejandro Velasco Astete', city: 'Cusco', country: 'PE' },
  { code: 'UIO', name: 'Quito Mariscal Sucre', city: 'Quito', country: 'EC' },
  { code: 'GYE', name: 'José Joaquín de Olmedo', city: 'Guayaquil', country: 'EC' },
  { code: 'CCS', name: 'Simón Bolívar International', city: 'Caracas', country: 'VE' },
  { code: 'MVD', name: 'Carrasco International', city: 'Montevideo', country: 'UY' },
  { code: 'ASU', name: 'Silvio Pettirossi International', city: 'Asunción', country: 'PY' },
  { code: 'VVI', name: 'Viru Viru International', city: 'Santa Cruz', country: 'BO' },
];

type Airport = typeof AIRPORTS[0];

function searchAirports(q: string): Airport[] {
  if (!q || q.length < 2) return [];
  const lq = q.toLowerCase().trim();
  const exact: Airport[] = [];
  const starts: Airport[] = [];
  const contains: Airport[] = [];
  for (const a of AIRPORTS) {
    if (a.code.toLowerCase() === lq) { exact.push(a); continue; }
    if (
      a.code.toLowerCase().startsWith(lq) ||
      a.city.toLowerCase().startsWith(lq) ||
      a.name.toLowerCase().startsWith(lq)
    ) { starts.push(a); continue; }
    if (a.city.toLowerCase().includes(lq) || a.name.toLowerCase().includes(lq)) {
      contains.push(a);
    }
  }
  return [...exact, ...starts, ...contains].slice(0, 7);
}

// ─── Airport autocomplete ────────────────────────────────────────────────────
function AirportPicker({ placeholder, onSelect }: { placeholder: string; onSelect: (code: string) => void }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<Airport | null>(null);
  const results = searchAirports(q);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input type="text" placeholder={placeholder} value={q} autoComplete="off"
        onChange={e => { setQ(e.target.value); setChosen(null); onSelect(''); setOpen(true); }}
        onFocus={() => { if (results.length > 0) setOpen(true); }}
        className="w-full px-4 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.9rem] font-semibold text-[#1A1D2B] outline-none focus:border-[#0066FF] focus:bg-white transition-all placeholder:text-[#B0B8CC]" />
      {chosen && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
          <span className="text-[.7rem] font-black text-[#0066FF] bg-blue-50 px-2 py-0.5 rounded-md">{chosen.code}</span>
        </div>
      )}
      {open && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1.5 bg-white border border-[#E8ECF4] rounded-2xl shadow-2xl overflow-hidden">
          {results.map(a => (
            <li key={a.code}
              onMouseDown={() => { setQ(`${a.city} (${a.code})`); setChosen(a); onSelect(a.code); setOpen(false); }}
              className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors border-b border-[#F1F3F7] last:border-0">
              <span className="font-black text-[.75rem] text-[#0066FF] w-10 flex-shrink-0 bg-blue-50 px-1.5 py-0.5 rounded text-center">{a.code}</span>
              <span className="min-w-0">
                <span className="block text-[.83rem] text-[#1A1D2B] font-bold truncate">{a.name}</span>
                <span className="block text-[.7rem] text-[#8E95A9] font-medium">{a.city}, {a.country}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Passenger picker ────────────────────────────────────────────────────────
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

  const Row = ({ label: lbl, sub, val, onDec, onInc }: { label: string; sub: string; val: number; onDec: () => void; onInc: () => void }) => (
    <div className="flex items-center justify-between py-3 border-b border-[#F1F3F7] last:border-0">
      <div>
        <div className="font-[Poppins] font-bold text-[.85rem] text-[#1A1D2B]">{lbl}</div>
        <div className="text-[.7rem] text-[#8E95A9] font-medium">{sub}</div>
      </div>
      <div className="flex items-center gap-3">
        <button onMouseDown={onDec}
          className="w-8 h-8 rounded-full border-2 border-[#E8ECF4] flex items-center justify-center text-[#5C6378] font-bold text-lg hover:border-[#0066FF] hover:text-[#0066FF] transition-all disabled:opacity-30"
          disabled={val <= 0}>−</button>
        <span className="font-[Poppins] font-black text-[.95rem] text-[#1A1D2B] w-5 text-center">{val}</span>
        <button onMouseDown={onInc}
          className="w-8 h-8 rounded-full border-2 border-[#E8ECF4] flex items-center justify-center text-[#5C6378] font-bold text-lg hover:border-[#0066FF] hover:text-[#0066FF] transition-all">+</button>
      </div>
    </div>
  );

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full px-4 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-left text-[.85rem] font-semibold text-[#1A1D2B] outline-none focus:border-[#0066FF] hover:bg-white transition-all flex items-center justify-between">
        <span>{label}</span>
        <span className="text-[#B0B8CC] text-xs">▾</span>
      </button>
      {open && (
        <div className="absolute z-50 w-72 mt-1.5 right-0 bg-white border border-[#E8ECF4] rounded-2xl shadow-2xl p-4">
          <Row label="Adults" sub="Age 12+" val={adults}
            onDec={() => onChange(Math.max(1, adults - 1), children, infants)}
            onInc={() => onChange(Math.min(9, adults + 1), children, infants)} />
          <Row label="Children" sub="Age 2–11" val={children}
            onDec={() => onChange(adults, Math.max(0, children - 1), infants)}
            onInc={() => onChange(adults, Math.min(8, children + 1), infants)} />
          <Row label="Infants" sub="Under 2 (lap)" val={infants}
            onDec={() => onChange(adults, children, Math.max(0, infants - 1))}
            onInc={() => onChange(adults, children, Math.min(adults, infants + 1))} />
          <button onMouseDown={() => setOpen(false)}
            className="w-full mt-3 bg-[#0066FF] text-white font-[Poppins] font-bold text-[.8rem] py-2.5 rounded-xl">Done</button>
        </div>
      )}
    </div>
  );
}

// ─── Providers (affiliated partners only — tracked via Travelpayouts marker=714449) ──
const PROVIDERS = [
  {
    name: 'Aviasales',
    logo: '✈',
    badge: 'Best Value',
    highlight: 'Lowest fares across 750+ airlines worldwide',
    getUrl: (o: string, d: string, dep: string) => {
      // Aviasales date format: DDMM
      const parts = dep.split('-'); // YYYY-MM-DD
      const ddmm = parts[2] + parts[1];
      return `https://tp.media/r?campaign_id=121&marker=714449&trs=512633&p=4114&u=https%3A%2F%2Fwww.aviasales.com%2Fsearch%2F${o}${ddmm}${d}1`;
    },
  },
  {
    name: 'Kiwi.com',
    logo: '🥝',
    badge: 'Flexible Routes',
    highlight: 'Unique combo routes + missed-flight guarantee',
    getUrl: (o: string, d: string, dep: string, ret: string) =>
      ret
        ? `https://tp.media/r?campaign_id=105&marker=714449&trs=512633&p=3956&u=https%3A%2F%2Fwww.kiwi.com%2Fen%2Fsearch%2Fresults%2F${o}%2F${d}%2F${dep}%2F${ret}`
        : `https://tp.media/r?campaign_id=105&marker=714449&trs=512633&p=3956&u=https%3A%2F%2Fwww.kiwi.com%2Fen%2Fsearch%2Fresults%2F${o}%2F${d}%2F${dep}`,
  },
  {
    name: 'Expedia',
    logo: '🌍',
    badge: 'Bundle & Save',
    highlight: 'Add a hotel to your flight and save up to 30%',
    getUrl: (o: string, d: string, dep: string, ret: string) => {
      const base = `https%3A%2F%2Fwww.expedia.co.uk%2FFlights-Search%3Ftrip%3D${ret ? 'roundtrip' : 'oneway'}%26leg1%3Dfrom%253A${o}%252Cto%253A${d}%252Cdeparture%253A${dep}TANYT`;
      return `https://tp.media/r?campaign_id=8&marker=714449&trs=512633&p=590&u=${base}`;
    },
  },
  {
    name: 'Trip.com',
    logo: '🗺',
    badge: 'Asia & Middle East',
    highlight: 'Best fares on routes to Asia & Middle East',
    getUrl: (o: string, d: string) =>
      `https://tp.media/r?campaign_id=336&marker=714449&trs=512633&p=6589&u=https%3A%2F%2Fuk.trip.com%2Fflights%2F${o.toLowerCase()}-to-${d.toLowerCase()}%2Ftickets`,
  },
  {
    name: 'Booking.com',
    logo: '🏷',
    badge: 'Trusted Worldwide',
    highlight: 'Flights from the world\'s most trusted travel brand',
    getUrl: (o: string, d: string, dep: string) =>
      `https://www.booking.com/flights/search.html?from_iata=${o}&to_iata=${d}&depart_date=${dep}&adults=1`,
  },
];

// ─── Page ────────────────────────────────────────────────────────────────────
export default function FlightsPage() {
  const [origin, setOrigin] = useState('');
  const [dest, setDest] = useState('');
  const [depDate, setDepDate] = useState('');
  const [retDate, setRetDate] = useState('');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [tripType, setTripType] = useState<'one-way' | 'return'>('return');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  function handleSearch() {
    if (!origin) { alert('Please select a departure airport'); return; }
    if (!dest) { alert('Please select a destination airport'); return; }
    if (!depDate) { alert('Please select a departure date'); return; }
    setResults(false);
    setLoading(true);
    setTimeout(() => { setLoading(false); setResults(true); }, 1500);
  }

  return (
    <>
      <Header />

      {/* Hero */}
      <section className="pt-36 pb-10 px-5 bg-[radial-gradient(ellipse_at_top,#E8F0FE_0%,#fff_55%,#F8FAFC_100%)]">
        <div className="max-w-[860px] mx-auto text-center mb-8">
          <span className="inline-block bg-blue-50 text-[#0066FF] text-[.65rem] font-black uppercase tracking-[2.5px] px-3.5 py-1.5 rounded-full mb-4">✈ Flight Comparison</span>
          <h1 className="font-[Poppins] text-[2.4rem] md:text-[3.6rem] font-black text-[#1A1D2B] leading-[1.05] tracking-tight mb-3">
            Find the <em className="italic bg-gradient-to-br from-[#0066FF] to-[#4F46E5] bg-clip-text text-transparent">Cheapest</em> Flights
          </h1>
          <p className="text-[1rem] text-[#8E95A9] font-semibold max-w-[520px] mx-auto">Compare 5 affiliated providers — results shown right here, no tab-hopping.</p>
        </div>

        {/* Search card */}
        <div className="max-w-[860px] mx-auto bg-white border border-[#E8ECF4] rounded-3xl p-6 shadow-[0_8px_40px_rgba(0,102,255,0.08)]">

          {/* Trip type toggle */}
          <div className="flex gap-1.5 mb-5 bg-[#F8FAFC] p-1 rounded-xl w-fit">
            {(['return', 'one-way'] as const).map(t => (
              <button key={t} onClick={() => { setTripType(t); if (t === 'one-way') setRetDate(''); }}
                className={`px-4 py-2 rounded-lg text-[.75rem] font-extrabold uppercase tracking-[1.5px] transition-all ${tripType === t ? 'bg-white text-[#0066FF] shadow-sm' : 'text-[#8E95A9] hover:text-[#1A1D2B]'}`}>
                {t === 'return' ? '↔ Return' : '→ One-way'}
              </button>
            ))}
          </div>

          {/* Airport row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">From</label>
              <AirportPicker placeholder="City or airport code — e.g. London, LHR" onSelect={setOrigin} />
            </div>
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">To</label>
              <AirportPicker placeholder="City or airport code — e.g. Dubai, DXB" onSelect={setDest} />
            </div>
          </div>

          {/* Dates + passengers row */}
          <div className={`grid gap-3 mb-4 ${tripType === 'return' ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2'}`}>
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Departure</label>
              <input type="date" min={today} value={depDate} onChange={e => setDepDate(e.target.value)}
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
            className="w-full bg-[#0066FF] hover:bg-[#0052CC] disabled:opacity-60 text-white font-[Poppins] font-black text-[.95rem] py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(0,102,255,0.3)]">
            {loading ? 'Searching…' : `Search ${PROVIDERS.length} Providers →`}
          </button>
          <p className="text-center text-[.68rem] text-[#8E95A9] font-semibold mt-2.5">Free comparison. Results shown here — click any provider to book.</p>
        </div>
      </section>

      {/* Loading */}
      {loading && (
        <section className="max-w-[860px] mx-auto px-5 py-10 text-center">
          <div className="inline-flex items-center gap-3 bg-white border border-[#F1F3F7] rounded-2xl px-6 py-4 shadow-sm">
            <div className="w-5 h-5 border-2 border-[#0066FF] border-t-transparent rounded-full animate-spin" />
            <span className="text-[.85rem] font-bold text-[#5C6378]">Checking prices on <strong className="text-[#1A1D2B]">{PROVIDERS.length} providers</strong>…</span>
          </div>
        </section>
      )}

      {/* Results */}
      {results && (
        <section className="max-w-[1000px] mx-auto px-5 pb-8">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
            <div>
              <h2 className="font-[Poppins] font-black text-[1.3rem] text-[#1A1D2B]">
                {origin} → {dest}
                <span className="text-[#8E95A9] font-semibold text-[1rem]"> · {depDate}{retDate ? ` – ${retDate}` : ''}</span>
              </h2>
              <p className="text-[.75rem] text-[#8E95A9] font-semibold mt-0.5">
                {adults} adult{adults !== 1 ? 's' : ''}
                {children > 0 ? `, ${children} child${children !== 1 ? 'ren' : ''}` : ''}
                {infants > 0 ? `, ${infants} infant${infants !== 1 ? 's' : ''}` : ''}
                {' · Click any provider for live prices'}
              </p>
            </div>
            <span className="text-[.7rem] font-bold text-[#0066FF] bg-blue-50 px-3 py-1.5 rounded-full">{PROVIDERS.length} providers found</span>
          </div>
          <div className="flex flex-col gap-3">
            {PROVIDERS.map(p => (
              <div key={p.name} className="bg-white border border-[#F1F3F7] rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4 hover:border-blue-200 hover:shadow-md transition-all">
                <div className="text-3xl flex-shrink-0">{p.logo}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-[Poppins] font-extrabold text-[1rem] text-[#1A1D2B]">{p.name}</span>
                    <span className="text-[.6rem] font-black uppercase tracking-[1.5px] px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0066FF]">{p.badge}</span>
                  </div>
                  <p className="text-[.78rem] text-[#5C6378] font-semibold">{p.highlight}</p>
                </div>
                <div className="flex-shrink-0">
                  <a href={p.getUrl(origin, dest, depDate, retDate)} target="_blank" rel="noopener"
                    className="inline-flex items-center gap-2 bg-[#0066FF] hover:bg-[#0052CC] text-white font-[Poppins] font-bold text-[.78rem] px-5 py-2.5 rounded-xl transition-all whitespace-nowrap">
                    Check Price →
                  </a>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-[.68rem] text-[#8E95A9] font-semibold mt-4">Prices are live on each provider's site. Jetmeaway does not add any booking fees.</p>
        </section>
      )}

      {/* Tips */}
      <section className="max-w-[860px] mx-auto px-5 pb-16">
        <div className="bg-[#F8FAFC] border border-[#F1F3F7] rounded-3xl p-8">
          <h3 className="font-[Poppins] font-black text-[1.05rem] text-[#1A1D2B] mb-4">Tips for Finding Cheaper Flights</h3>
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
