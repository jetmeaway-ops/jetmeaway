'use client';

import { useState, useRef, useEffect } from 'react';
import { handleSaveSearch } from './actions';

const AIRPORTS = [
  { code: 'LHR', name: 'London Heathrow', city: 'London', country: 'GB' },
  { code: 'LGW', name: 'London Gatwick', city: 'London', country: 'GB' },
  { code: 'STN', name: 'London Stansted', city: 'London', country: 'GB' },
  { code: 'LTN', name: 'London Luton', city: 'London', country: 'GB' },
  { code: 'LCY', name: 'London City', city: 'London', country: 'GB' },
  { code: 'MAN', name: 'Manchester Airport', city: 'Manchester', country: 'GB' },
  { code: 'BHX', name: 'Birmingham Airport', city: 'Birmingham', country: 'GB' },
  { code: 'EDI', name: 'Edinburgh Airport', city: 'Edinburgh', country: 'GB' },
  { code: 'GLA', name: 'Glasgow Airport', city: 'Glasgow', country: 'GB' },
  { code: 'BRS', name: 'Bristol Airport', city: 'Bristol', country: 'GB' },
  { code: 'NCL', name: 'Newcastle Airport', city: 'Newcastle', country: 'GB' },
  { code: 'LPL', name: 'Liverpool John Lennon', city: 'Liverpool', country: 'GB' },
  { code: 'JFK', name: 'John F. Kennedy International', city: 'New York', country: 'US' },
  { code: 'EWR', name: 'Newark Liberty International', city: 'New York', country: 'US' },
  { code: 'LGA', name: 'LaGuardia Airport', city: 'New York', country: 'US' },
  { code: 'LAX', name: 'Los Angeles International', city: 'Los Angeles', country: 'US' },
  { code: 'ORD', name: "O'Hare International", city: 'Chicago', country: 'US' },
  { code: 'MDW', name: 'Midway International', city: 'Chicago', country: 'US' },
  { code: 'ATL', name: 'Hartsfield-Jackson Atlanta', city: 'Atlanta', country: 'US' },
  { code: 'DFW', name: 'Dallas/Fort Worth International', city: 'Dallas', country: 'US' },
  { code: 'MIA', name: 'Miami International', city: 'Miami', country: 'US' },
  { code: 'SFO', name: 'San Francisco International', city: 'San Francisco', country: 'US' },
  { code: 'SEA', name: 'Seattle-Tacoma International', city: 'Seattle', country: 'US' },
  { code: 'BOS', name: 'Boston Logan International', city: 'Boston', country: 'US' },
  { code: 'DEN', name: 'Denver International', city: 'Denver', country: 'US' },
  { code: 'LAS', name: 'Harry Reid International', city: 'Las Vegas', country: 'US' },
  { code: 'MCO', name: 'Orlando International', city: 'Orlando', country: 'US' },
  { code: 'PHX', name: 'Phoenix Sky Harbor', city: 'Phoenix', country: 'US' },
  { code: 'IAD', name: 'Dulles International', city: 'Washington D.C.', country: 'US' },
  { code: 'DCA', name: 'Ronald Reagan Washington National', city: 'Washington D.C.', country: 'US' },
  { code: 'YYZ', name: 'Toronto Pearson International', city: 'Toronto', country: 'CA' },
  { code: 'YVR', name: 'Vancouver International', city: 'Vancouver', country: 'CA' },
  { code: 'YUL', name: 'Montreal-Trudeau International', city: 'Montreal', country: 'CA' },
  { code: 'CDG', name: 'Charles de Gaulle', city: 'Paris', country: 'FR' },
  { code: 'ORY', name: 'Paris Orly', city: 'Paris', country: 'FR' },
  { code: 'AMS', name: 'Amsterdam Schiphol', city: 'Amsterdam', country: 'NL' },
  { code: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'DE' },
  { code: 'MUC', name: 'Munich Airport', city: 'Munich', country: 'DE' },
  { code: 'BER', name: 'Berlin Brandenburg', city: 'Berlin', country: 'DE' },
  { code: 'MAD', name: 'Adolfo Suárez Madrid-Barajas', city: 'Madrid', country: 'ES' },
  { code: 'BCN', name: 'Barcelona-El Prat', city: 'Barcelona', country: 'ES' },
  { code: 'FCO', name: 'Leonardo da Vinci–Fiumicino', city: 'Rome', country: 'IT' },
  { code: 'MXP', name: 'Milan Malpensa', city: 'Milan', country: 'IT' },
  { code: 'ZUR', name: 'Zürich Airport', city: 'Zürich', country: 'CH' },
  { code: 'ZRH', name: 'Zürich Airport', city: 'Zürich', country: 'CH' },
  { code: 'VIE', name: 'Vienna International', city: 'Vienna', country: 'AT' },
  { code: 'BRU', name: 'Brussels Airport', city: 'Brussels', country: 'BE' },
  { code: 'CPH', name: 'Copenhagen Airport', city: 'Copenhagen', country: 'DK' },
  { code: 'ARN', name: 'Stockholm Arlanda', city: 'Stockholm', country: 'SE' },
  { code: 'OSL', name: 'Oslo Gardermoen', city: 'Oslo', country: 'NO' },
  { code: 'HEL', name: 'Helsinki-Vantaa', city: 'Helsinki', country: 'FI' },
  { code: 'WAW', name: 'Warsaw Chopin', city: 'Warsaw', country: 'PL' },
  { code: 'PRG', name: 'Václav Havel Airport Prague', city: 'Prague', country: 'CZ' },
  { code: 'BUD', name: 'Budapest Ferenc Liszt', city: 'Budapest', country: 'HU' },
  { code: 'ATH', name: 'Athens International', city: 'Athens', country: 'GR' },
  { code: 'IST', name: 'Istanbul Airport', city: 'Istanbul', country: 'TR' },
  { code: 'SAW', name: 'Istanbul Sabiha Gökçen', city: 'Istanbul', country: 'TR' },
  { code: 'DXB', name: 'Dubai International', city: 'Dubai', country: 'AE' },
  { code: 'AUH', name: 'Abu Dhabi International', city: 'Abu Dhabi', country: 'AE' },
  { code: 'DOH', name: 'Hamad International', city: 'Doha', country: 'QA' },
  { code: 'RUH', name: 'King Khalid International', city: 'Riyadh', country: 'SA' },
  { code: 'KWI', name: 'Kuwait International', city: 'Kuwait City', country: 'KW' },
  { code: 'BOM', name: 'Chhatrapati Shivaji Maharaj International', city: 'Mumbai', country: 'IN' },
  { code: 'DEL', name: 'Indira Gandhi International', city: 'New Delhi', country: 'IN' },
  { code: 'BLR', name: 'Kempegowda International', city: 'Bangalore', country: 'IN' },
  { code: 'MAA', name: 'Chennai International', city: 'Chennai', country: 'IN' },
  { code: 'HYD', name: 'Rajiv Gandhi International', city: 'Hyderabad', country: 'IN' },
  { code: 'CCU', name: 'Netaji Subhas Chandra Bose International', city: 'Kolkata', country: 'IN' },
  { code: 'SIN', name: 'Singapore Changi', city: 'Singapore', country: 'SG' },
  { code: 'KUL', name: 'Kuala Lumpur International', city: 'Kuala Lumpur', country: 'MY' },
  { code: 'BKK', name: 'Suvarnabhumi Airport', city: 'Bangkok', country: 'TH' },
  { code: 'DMK', name: 'Don Mueang International', city: 'Bangkok', country: 'TH' },
  { code: 'CGK', name: 'Soekarno-Hatta International', city: 'Jakarta', country: 'ID' },
  { code: 'MNL', name: 'Ninoy Aquino International', city: 'Manila', country: 'PH' },
  { code: 'SGN', name: 'Tan Son Nhat International', city: 'Ho Chi Minh City', country: 'VN' },
  { code: 'HAN', name: 'Noi Bai International', city: 'Hanoi', country: 'VN' },
  { code: 'HKG', name: 'Hong Kong International', city: 'Hong Kong', country: 'HK' },
  { code: 'PVG', name: 'Shanghai Pudong International', city: 'Shanghai', country: 'CN' },
  { code: 'SHA', name: 'Shanghai Hongqiao International', city: 'Shanghai', country: 'CN' },
  { code: 'PEK', name: 'Beijing Capital International', city: 'Beijing', country: 'CN' },
  { code: 'PKX', name: 'Beijing Daxing International', city: 'Beijing', country: 'CN' },
  { code: 'CAN', name: 'Guangzhou Baiyun International', city: 'Guangzhou', country: 'CN' },
  { code: 'NRT', name: 'Tokyo Narita International', city: 'Tokyo', country: 'JP' },
  { code: 'HND', name: 'Tokyo Haneda', city: 'Tokyo', country: 'JP' },
  { code: 'KIX', name: 'Kansai International', city: 'Osaka', country: 'JP' },
  { code: 'ICN', name: 'Incheon International', city: 'Seoul', country: 'KR' },
  { code: 'GMP', name: 'Gimpo International', city: 'Seoul', country: 'KR' },
  { code: 'SYD', name: 'Sydney Kingsford Smith', city: 'Sydney', country: 'AU' },
  { code: 'MEL', name: 'Melbourne Airport', city: 'Melbourne', country: 'AU' },
  { code: 'BNE', name: 'Brisbane Airport', city: 'Brisbane', country: 'AU' },
  { code: 'PER', name: 'Perth Airport', city: 'Perth', country: 'AU' },
  { code: 'AKL', name: 'Auckland Airport', city: 'Auckland', country: 'NZ' },
  { code: 'JNB', name: 'OR Tambo International', city: 'Johannesburg', country: 'ZA' },
  { code: 'CPT', name: 'Cape Town International', city: 'Cape Town', country: 'ZA' },
  { code: 'NBO', name: 'Jomo Kenyatta International', city: 'Nairobi', country: 'KE' },
  { code: 'CAI', name: 'Cairo International', city: 'Cairo', country: 'EG' },
  { code: 'CMN', name: 'Mohammed V International', city: 'Casablanca', country: 'MA' },
  { code: 'LOS', name: 'Murtala Muhammed International', city: 'Lagos', country: 'NG' },
  { code: 'GRU', name: 'São Paulo/Guarulhos International', city: 'São Paulo', country: 'BR' },
  { code: 'GIG', name: 'Rio de Janeiro/Galeão International', city: 'Rio de Janeiro', country: 'BR' },
  { code: 'EZE', name: 'Ministro Pistarini International', city: 'Buenos Aires', country: 'AR' },
  { code: 'BOG', name: 'El Dorado International', city: 'Bogotá', country: 'CO' },
  { code: 'LIM', name: 'Jorge Chávez International', city: 'Lima', country: 'PE' },
  { code: 'MEX', name: 'Benito Juárez International', city: 'Mexico City', country: 'MX' },
  { code: 'CUN', name: 'Cancún International', city: 'Cancún', country: 'MX' },
  { code: 'PMI', name: 'Palma de Mallorca Airport', city: 'Palma', country: 'ES' },
  { code: 'AGP', name: 'Málaga-Costa del Sol', city: 'Málaga', country: 'ES' },
  { code: 'TFS', name: 'Tenerife South Airport', city: 'Tenerife', country: 'ES' },
  { code: 'LPA', name: 'Gran Canaria Airport', city: 'Las Palmas', country: 'ES' },
  { code: 'FAO', name: 'Faro Airport', city: 'Faro', country: 'PT' },
  { code: 'LIS', name: 'Humberto Delgado Airport', city: 'Lisbon', country: 'PT' },
  { code: 'OPO', name: 'Francisco Sá Carneiro Airport', city: 'Porto', country: 'PT' },
  { code: 'DUB', name: 'Dublin Airport', city: 'Dublin', country: 'IE' },
  { code: 'ORK', name: 'Cork Airport', city: 'Cork', country: 'IE' },
  { code: 'KEF', name: 'Keflavík International', city: 'Reykjavik', country: 'IS' },
  { code: 'HER', name: 'Heraklion International', city: 'Heraklion', country: 'GR' },
  { code: 'RHO', name: 'Rhodes International', city: 'Rhodes', country: 'GR' },
  { code: 'CFU', name: 'Corfu International', city: 'Corfu', country: 'GR' },
  { code: 'SKG', name: 'Thessaloniki Airport', city: 'Thessaloniki', country: 'GR' },
  { code: 'TLV', name: 'Ben Gurion International', city: 'Tel Aviv', country: 'IL' },
  { code: 'AMM', name: 'Queen Alia International', city: 'Amman', country: 'JO' },
  { code: 'BEY', name: 'Rafic Hariri International', city: 'Beirut', country: 'LB' },
  { code: 'KTM', name: 'Tribhuvan International', city: 'Kathmandu', country: 'NP' },
  { code: 'CMB', name: 'Bandaranaike International', city: 'Colombo', country: 'LK' },
  { code: 'MLE', name: 'Velana International', city: 'Malé', country: 'MV' },
  { code: 'PPT', name: 'Faa\'a International', city: 'Papeete', country: 'PF' },
  { code: 'NAN', name: 'Nadi International', city: 'Nadi', country: 'FJ' },
];

type Airport = typeof AIRPORTS[number];

function searchAirports(query: string): Airport[] {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  return AIRPORTS.filter(a =>
    a.code.toLowerCase().startsWith(q) ||
    a.city.toLowerCase().startsWith(q) ||
    a.name.toLowerCase().includes(q)
  ).slice(0, 6);
}

function AirportInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (code: string, label: string) => void;
  placeholder: string;
}) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Airport[]>([]);
  const [selected, setSelected] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleInput = (val: string) => {
    setQuery(val);
    setSelected('');
    onChange('', '');
    const results = searchAirports(val);
    setSuggestions(results);
    setOpen(results.length > 0);
  };

  const handleSelect = (airport: Airport) => {
    const label = `${airport.city} (${airport.code})`;
    setQuery(label);
    setSelected(airport.code);
    onChange(airport.code, label);
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        placeholder={placeholder}
        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-black"
        value={query}
        onChange={e => handleInput(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        autoComplete="off"
      />
      {open && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {suggestions.map(airport => (
            <li
              key={airport.code}
              className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors"
              onMouseDown={() => handleSelect(airport)}
            >
              <span className="font-black text-[.8rem] text-blue-600 w-10 flex-shrink-0">{airport.code}</span>
              <span className="text-[.82rem] text-slate-700 font-semibold leading-tight">
                {airport.name}
                <span className="block text-[.72rem] text-slate-400 font-medium">{airport.city}, {airport.country}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function FlightSearch() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const userId = 'user_123';

  const handleSearch = async () => {
    if (!origin || !destination) return alert('Please select both airports!');

    setIsLoading(true);
    setResults([]);

    try {
      await handleSaveSearch(userId, {
        origin,
        destination,
        date: new Date().toISOString().split('T')[0],
      });

      const mockResults = [
        {
          id: 1,
          name: 'The Luxury Scout Plaza',
          price: '£140/night',
          image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
        },
        {
          id: 2,
          name: 'Grand JetMeAway Suites',
          price: '£210/night',
          image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
        },
      ];

      setResults(mockResults);
    } catch (error) {
      console.error(error);
      alert('Something went wrong with the connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-8">
        <h2 className="text-xl font-semibold text-slate-800 mb-4 text-black">Where to next?</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AirportInput
            value={origin}
            onChange={(code) => setOrigin(code)}
            placeholder="From (e.g. London, LHR)"
          />
          <AirportInput
            value={destination}
            onChange={(code) => setDestination(code)}
            placeholder="To (e.g. New York, JFK)"
          />
        </div>

        <button
          className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50"
          onClick={handleSearch}
          disabled={isLoading}
        >
          {isLoading ? 'Scout is Searching...' : 'Search & Save to Scout'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {results.map((item) => (
          <div key={item.id} className="bg-white rounded-xl overflow-hidden border border-slate-100 shadow-sm">
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-48 object-cover"
              onError={(e) => {
                e.currentTarget.src = 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80';
              }}
            />
            <div className="p-4">
              <h3 className="font-bold text-slate-900">{item.name}</h3>
              <p className="text-blue-600 font-semibold">{item.price}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
