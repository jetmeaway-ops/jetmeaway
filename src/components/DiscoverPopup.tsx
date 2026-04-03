'use client';
import { useState, useEffect, useRef } from 'react';

// ─── Destination data ─────────────────────────────────────────────────────────
const DESTINATIONS: Record<string, DestData> = {
  AYT: {
    code: 'AYT', city: 'Antalya', country: 'Turkey', flag: '🇹🇷',
    reaction: "Incredible choice! 🌊", message: "300+ sunny days, the most turquoise water you've ever seen, and ancient ruins right on the beach.",
    season: 'Perfect in summer ☀️',
    highlights: ['Konyaaltı & Lara Beach', 'Old City (Kaleiçi)', 'Düden Waterfalls', 'Antalya Museum'],
    food: ['Fresh seafood', 'Pide & Lahmacun', 'Turkish breakfast', 'Baklava'],
    transport: ['Tram line through city', 'Dolmuş (shared minibus)', 'Taxis widely available'],
    kids: ["Antalya Aquarium (world's largest!)", 'Land of Legends Theme Park', 'Sandland Festival', 'Boat tours'],
  },
  DXB: {
    code: 'DXB', city: 'Dubai', country: 'UAE', flag: '🇦🇪',
    reaction: "Ooh la la! 🏙️", message: "Dubai turned a desert into a dream. The tallest tower, the biggest mall, the wildest skyline — it's unreal.",
    season: 'Best Oct–Apr 🌙',
    highlights: ['Burj Khalifa & Dubai Mall', 'Palm Jumeirah', 'Desert Safari', 'Dubai Creek & Gold Souk'],
    food: ['Shawarma & Falafel', 'Arabic mezze', 'Camel milk ice cream', 'Legendary brunch culture'],
    transport: ['Metro Red & Green Lines', 'Dubai Tram', 'Water Taxi (Abra)', 'Uber everywhere'],
    kids: ['Dubai Aquarium', 'IMG Worlds of Adventure', 'Legoland Dubai', 'Ski Dubai (indoor snow!)'],
  },
  BCN: {
    code: 'BCN', city: 'Barcelona', country: 'Spain', flag: '🇪🇸',
    reaction: "¡Fantástico! 🥂", message: "Gaudí, tapas, sunsets on Barceloneta. There is no city on earth with more energy than Barcelona.",
    season: 'Gorgeous in spring & summer 🌸',
    highlights: ['Sagrada Família', 'Park Güell', 'Las Ramblas', 'Gothic Quarter'],
    food: ['Patatas bravas', 'Pan con tomate', 'Jamón ibérico', 'Sangría at sunset'],
    transport: ['Metro L1–L12', 'Bus network', 'Bicing bike share', '15 min walk beach to city'],
    kids: ['CosmoCaixa Science Museum', 'Barcelona Zoo', 'Magic Fountain show', 'Tibidabo Amusement Park'],
  },
  MLE: {
    code: 'MLE', city: 'Maldives', country: 'Maldives', flag: '🇲🇻',
    reaction: "You absolute legend! 🏝️", message: "Crystal water, overwater bungalows, bioluminescent nights. The Maldives isn't a holiday — it's a dream you get to live.",
    season: 'Nov–Apr is paradise 🌊',
    highlights: ['Overwater villas', 'Coral reef snorkelling', 'Bioluminescent beach', 'Male Fish Market'],
    food: ['Mas huni (tuna coconut)', 'Garudhiya fish soup', 'Fresh lobster', 'Coconut everything'],
    transport: ['Seaplane transfers (iconic!)', 'Speedboats between islands', 'Local ferry (budget)'],
    kids: ['Turtle spotting', 'Glass-bottom boat tours', "Kids' snorkelling lessons", 'Beach treasure hunts'],
  },
  NRT: {
    code: 'NRT', city: 'Tokyo', country: 'Japan', flag: '🇯🇵',
    reaction: "Sugoi! 🍜✨", message: "The future and the past living side by side. Ramen at midnight, cherry blossoms at dawn — Tokyo is unlike anywhere.",
    season: 'Spring (Mar–May) for cherry blossom 🌸',
    highlights: ['Shibuya Crossing', 'Senso-ji Temple', 'Shinjuku Gyoen', 'Akihabara'],
    food: ['Ramen & Sushi', 'Takoyaki', 'Wagyu beef', 'Matcha everything'],
    transport: ['JR Pass (bullet trains!)', 'Tokyo Metro', 'IC Card for all transport', 'Cycling-friendly'],
    kids: ['DisneySea & Disneyland', 'teamLab Borderless digital art', 'Pokémon Center', 'Ueno Zoo'],
  },
  CDG: {
    code: 'CDG', city: 'Paris', country: 'France', flag: '🇫🇷',
    reaction: "Ooh là là! 🗼", message: "The Eiffel Tower sparkling at night. Croissants in the morning. Paris never, ever gets old.",
    season: 'April in Paris is a song for a reason 🌹',
    highlights: ['Eiffel Tower', 'The Louvre', 'Montmartre & Sacré-Cœur', 'Seine River cruise'],
    food: ['Croissants & café au lait', 'Crêpes on the street', 'French onion soup', 'Macarons'],
    transport: ['Paris Métro (14 lines)', 'RER trains', "Vélib' bike share", 'Walking is magic here'],
    kids: ['Disneyland Paris (30 min away!)', 'Cité des Sciences museum', "Jardin d'Acclimatation", 'Bateaux Mouches boat tour'],
  },
  JFK: {
    code: 'JFK', city: 'New York', country: 'USA', flag: '🇺🇸',
    reaction: "New York, New York! 🗽", message: "The city that never sleeps. Every corner is a movie scene. You are going to love every single second.",
    season: 'Fall foliage in October is magical 🍂',
    highlights: ['Central Park', 'Times Square', 'Brooklyn Bridge', 'The High Line'],
    food: ['NYC pizza slice', 'Bagel with lox', 'Pastrami sandwich', 'New York cheesecake'],
    transport: ['NYC Subway (24/7!)', 'Yellow cabs', 'Citi Bike', 'Staten Island Ferry (free!)'],
    kids: ['American Museum of Natural History', 'Central Park Zoo', 'Intrepid Sea Air & Space Museum', 'LEGOLAND Discovery Center'],
  },
  BKK: {
    code: 'BKK', city: 'Bangkok', country: 'Thailand', flag: '🇹🇭',
    reaction: "Sawadee kha! 🙏✨", message: "Golden temples, floating markets, street food that will change your life. Bangkok is pure, electric magic.",
    season: 'Nov–Feb is cool & dry 🌴',
    highlights: ['Grand Palace & Wat Pho', 'Chatuchak Weekend Market', 'Floating Markets', 'Khao San Road'],
    food: ['Pad Thai', 'Tom Yum soup', 'Mango sticky rice', 'Street satay'],
    transport: ['BTS Skytrain', 'MRT Metro', 'Chao Phraya river boats', 'Tuk-tuks (bargain first!)'],
    kids: ['Dream World theme park', 'SEA LIFE Bangkok Ocean World', 'Safari World', 'Dusit Zoo'],
  },
  PMI: {
    code: 'PMI', city: 'Palma', country: 'Spain', flag: '🇪🇸',
    reaction: "Oh yes! ☀️🌊", message: "Mallorca has everything — golden beaches, hidden coves, mountain villages, and the best sunsets in the Med.",
    season: 'May–Oct for beach life 🏖️',
    highlights: ['Palma Cathedral (La Seu)', "Cala d'Or & Cala Millor beaches", 'Deià village', 'Palma Old Town'],
    food: ['Ensaïmada pastry', 'Sobrassada sausage', 'Tumbet (local veg dish)', 'Hierbas liqueur'],
    transport: ['Rental car recommended', 'Bus network EMT', 'Train to Sóller (historic!)', 'Bikes in Palma'],
    kids: ['Western Water Park', 'Palma Aquarium', 'Caves of Drach', 'Karting Magaluf'],
  },
  LIS: {
    code: 'LIS', city: 'Lisbon', country: 'Portugal', flag: '🇵🇹',
    reaction: "Que maravilha! 🎵", message: "Cobblestone hills, pastel buildings, Fado music drifting from a doorway. Lisbon quietly steals hearts.",
    season: 'Spring & early summer is perfect 🌿',
    highlights: ['Alfama & São Jorge Castle', 'Belém Tower', 'Time Out Market', 'Sintra day trip'],
    food: ['Pastéis de Nata (custard tarts!)', 'Bacalhau (salt cod)', 'Bifanas sandwich', 'Ginjinha cherry liqueur'],
    transport: ['Tram 28 (iconic but crowded!)', 'Metro 4 lines', 'Ferries across the Tagus', 'Walking the hills'],
    kids: ['Oceanário de Lisboa', 'Parque das Nações', 'Museu do Oriente', 'Lisbon Zoo'],
  },
  ATH: {
    code: 'ATH', city: 'Athens', country: 'Greece', flag: '🇬🇷',
    reaction: "Opa! 🏛️", message: "Birthplace of democracy, philosophy, and the most breathtaking ancient ruins on earth. Athens is timeless.",
    season: 'Spring (Apr–May) — before the crowds 🌺',
    highlights: ['The Acropolis & Parthenon', 'Monastiraki Flea Market', 'Plaka neighbourhood', 'Cape Sounion'],
    food: ['Souvlaki & Gyros', 'Moussaka', 'Spanakopita', 'Loukoumades (honey doughnuts)'],
    transport: ['Metro Line 1–3', 'Tram to coast', 'KTEL buses', 'Walking Plaka is unmissable'],
    kids: ["Hellenic Children's Museum", 'Attica Zoological Park', 'Archaeological Museum', 'Beach at Vouliagmeni Lake'],
  },
  TFS: {
    code: 'TFS', city: 'Tenerife', country: 'Spain', flag: '🇪🇸',
    reaction: "The eternal summer! ☀️🌋", message: "A volcanic island with black sand beaches, Europe's highest peak, and sunshine 365 days a year. Unbeatable.",
    season: 'Year-round sunshine — any time is perfect! 🌞',
    highlights: ['Mount Teide (volcano)', 'Siam Park water park', 'Los Gigantes cliffs', 'Masca village'],
    food: ['Papas arrugadas with mojo', 'Fresh fish at Puerto de la Cruz', 'Bienmesabe almond dessert', 'Local banana smoothies'],
    transport: ['TITSA bus network', 'Tram in Santa Cruz', 'Rental car for exploring', 'Taxis reliable'],
    kids: ["Siam Park (world's best water park!)", 'Loro Parque', 'Jungle Park', 'Whale & dolphin watching'],
  },
};

const DEST_LIST = Object.values(DESTINATIONS);

type DestData = {
  code: string; city: string; country: string; flag: string;
  reaction: string; message: string; season: string;
  highlights: string[]; food: string[]; transport: string[]; kids: string[];
};

type Step = 'welcome' | 'destination' | 'dates' | 'passengers' | 'results';

export default function DiscoverPopup() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<Step>('welcome');
  const [dest, setDest] = useState<DestData | null>(null);
  const [destQuery, setDestQuery] = useState('');
  const [suggestions, setSuggestions] = useState<DestData[]>([]);
  const [showSugg, setShowSugg] = useState(false);
  const [depDate, setDepDate] = useState('');
  const [retDate, setRetDate] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [panel, setPanel] = useState(0);
  const [showEsim, setShowEsim] = useState(false);
  const [showCar, setShowCar] = useState(false);
  const [animating, setAnimating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const seen = sessionStorage.getItem('jma_discover');
    if (!seen) setTimeout(() => setVisible(true), 800);
  }, []);

  useEffect(() => {
    if (step === 'destination') setTimeout(() => inputRef.current?.focus(), 300);
  }, [step]);

  useEffect(() => {
    if (step === 'results') {
      setTimeout(() => setShowEsim(true), 1500);
      setTimeout(() => { setShowEsim(false); setShowCar(true); }, 5500);
      setTimeout(() => setShowCar(false), 9000);
    }
  }, [step]);

  function close() {
    sessionStorage.setItem('jma_discover', '1');
    setVisible(false);
  }

  function goStep(s: Step) {
    setAnimating(true);
    setTimeout(() => { setStep(s); setAnimating(false); }, 180);
  }

  function handleDestInput(val: string) {
    setDestQuery(val);
    setDest(null);
    if (!val.trim()) { setSuggestions([]); setShowSugg(false); return; }
    const q = val.toLowerCase();
    const matches = DEST_LIST.filter(d =>
      d.city.toLowerCase().startsWith(q) ||
      d.country.toLowerCase().startsWith(q) ||
      d.code.toLowerCase().startsWith(q)
    ).slice(0, 6);
    setSuggestions(matches.length ? matches : DEST_LIST.slice(0, 5));
    setShowSugg(true);
  }

  function selectDest(d: DestData) {
    setDest(d);
    setDestQuery(`${d.city}, ${d.country}`);
    setShowSugg(false);
  }

  function surpriseMe() {
    selectDest(DEST_LIST[Math.floor(Math.random() * DEST_LIST.length)]);
  }

  const countdown = depDate
    ? Math.ceil((new Date(depDate).getTime() - Date.now()) / 86400000)
    : null;

  const today = new Date().toISOString().split('T')[0];

  const flightsUrl = dest
    ? `/flights?dest=${dest.code}&destCity=${encodeURIComponent(dest.city)}${depDate ? `&departure=${depDate}` : ''}${retDate ? `&return=${retDate}` : ''}&adults=${adults}&children=${children}`
    : '/flights';
  const hotelsUrl = dest
    ? `/hotels?city=${encodeURIComponent(dest.city)}${depDate ? `&checkin=${depDate}` : ''}${retDate ? `&checkout=${retDate}` : ''}&adults=${adults}&children=${children}`
    : '/hotels';
  const carsUrl = dest
    ? `/cars?location=${encodeURIComponent(dest.city)}${depDate ? `&pickup=${depDate}` : ''}${retDate ? `&dropoff=${retDate}` : ''}`
    : '/cars';
  const packagesUrl = dest
    ? `/packages?dest=${encodeURIComponent(dest.city)}${depDate ? `&departure=${depDate}` : ''}${retDate ? `&return=${retDate}` : ''}&guests=${adults}`
    : '/packages';

  const stepIndex = ['welcome', 'destination', 'dates', 'passengers', 'results'].indexOf(step);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(10,12,26,0.8)', backdropFilter: 'blur(10px)' }}
    >
      {/* Popup card — full screen bottom sheet on mobile, centered card on desktop */}
      <div
        className={`relative w-full sm:max-w-[480px] bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden transition-all duration-300 ${animating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}
        style={{ maxHeight: '94vh', overflowY: 'auto' }}
      >
        {/* Progress bar */}
        {step !== 'welcome' && (
          <div className="sticky top-0 left-0 right-0 h-1 bg-[#F1F3F7] z-10">
            <div
              className="h-full bg-gradient-to-r from-[#0066FF] to-[#4F46E5] transition-all duration-500"
              style={{ width: `${(stepIndex / 4) * 100}%` }}
            />
          </div>
        )}

        {/* Close pill */}
        <button
          onClick={close}
          className="absolute top-4 right-4 z-20 h-8 px-3 rounded-full bg-[#F1F3F7] hover:bg-[#E8ECF4] flex items-center gap-1.5 text-[#8E95A9] hover:text-[#1A1D2B] transition-all text-[.72rem] font-bold"
        >
          ✕ <span className="hidden sm:inline">Close</span>
        </button>

        {/* ── WELCOME ── */}
        {step === 'welcome' && (
          <div className="p-8 pb-10 text-center">
            <div className="text-6xl mb-5 animate-bounce">✈️</div>
            <div className="inline-block bg-blue-50 text-[#0066FF] text-[.6rem] font-black uppercase tracking-[2.5px] px-3 py-1.5 rounded-full mb-4">
              Your personal trip planner
            </div>
            <h2 className="font-[Poppins] font-black text-[2rem] sm:text-[2.2rem] text-[#1A1D2B] leading-tight mb-3">
              Where shall we<br />
              <em className="italic bg-gradient-to-br from-[#0066FF] to-[#4F46E5] bg-clip-text text-transparent">take you?</em>
            </h2>
            <p className="text-[.92rem] text-[#8E95A9] font-semibold mb-8 max-w-[300px] mx-auto leading-relaxed">
              Tell us your dream destination and we'll find you the best flights, hotels, and local tips.
            </p>

            <button
              onClick={() => goStep('destination')}
              className="w-full bg-gradient-to-r from-[#0066FF] to-[#4F46E5] hover:brightness-110 text-white font-[Poppins] font-black text-[1.05rem] py-4 rounded-2xl transition-all shadow-[0_8px_28px_rgba(0,102,255,0.35)] mb-4"
            >
              Let's go! 🚀
            </button>
            <button onClick={close} className="text-[.78rem] text-[#B0B8CC] hover:text-[#8E95A9] font-semibold transition-colors">
              Skip for now
            </button>
          </div>
        )}

        {/* ── DESTINATION ── */}
        {step === 'destination' && (
          <div className="p-6 pt-8 pb-8">
            <p className="text-[.62rem] font-black uppercase tracking-[2.5px] text-[#0066FF] mb-1">Step 1 of 3</p>
            <h2 className="font-[Poppins] font-black text-[1.6rem] text-[#1A1D2B] mb-1">Where to? 🌍</h2>
            <p className="text-[.82rem] text-[#8E95A9] font-semibold mb-5">Type a city, country, or let us surprise you</p>

            <div className="relative mb-4">
              <input
                ref={inputRef}
                type="text"
                value={destQuery}
                onChange={e => handleDestInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && dest && goStep('dates')}
                onBlur={() => setTimeout(() => setShowSugg(false), 150)}
                placeholder="e.g. Dubai, Antalya, Barcelona..."
                className="w-full px-5 py-4 rounded-2xl border-2 border-[#E8ECF4] focus:border-[#0066FF] outline-none font-[Poppins] font-semibold text-[1rem] text-[#1A1D2B] placeholder:text-[#C0C8D8] transition-colors"
              />
              {showSugg && suggestions.length > 0 && (
                <ul className="absolute z-50 w-full mt-2 bg-white border border-[#E8ECF4] rounded-2xl shadow-2xl overflow-hidden">
                  {suggestions.map(d => (
                    <li
                      key={d.code}
                      onMouseDown={e => { e.preventDefault(); selectDest(d); }}
                      onClick={() => selectDest(d)}
                      className="flex items-center gap-3 px-4 py-3.5 hover:bg-blue-50 cursor-pointer transition-colors border-b border-[#F8FAFC] last:border-0"
                    >
                      <span className="text-2xl">{d.flag}</span>
                      <div>
                        <div className="font-[Poppins] font-bold text-[.92rem] text-[#1A1D2B]">{d.city}</div>
                        <div className="text-[.72rem] text-[#8E95A9]">{d.country} · {d.season}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Reaction card */}
            {dest && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-100 rounded-2xl p-5 mb-5">
                <div className="text-3xl mb-2">{dest.flag}</div>
                <div className="font-[Poppins] font-black text-[1.15rem] text-[#1A1D2B] mb-1.5">{dest.reaction}</div>
                <p className="text-[.84rem] text-[#5C6378] font-semibold leading-relaxed mb-3">{dest.message}</p>
                <span className="inline-block text-[.65rem] font-black uppercase tracking-[1.5px] bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">{dest.season}</span>
              </div>
            )}

            {/* Popular chips — only shown when dropdown is NOT open */}
            {!dest && !showSugg && (
              <div className="mb-5">
                <p className="text-[.62rem] font-bold uppercase tracking-[2px] text-[#B0B8CC] mb-2.5">Popular right now</p>
                <div className="flex flex-wrap gap-2">
                  {DEST_LIST.slice(0, 6).map(d => (
                    <button
                      key={d.code}
                      onClick={() => selectDest(d)}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-[#F8FAFC] hover:bg-blue-50 border border-[#E8ECF4] hover:border-blue-200 rounded-full text-[.8rem] font-semibold text-[#5C6378] hover:text-[#0066FF] transition-all"
                    >
                      <span>{d.flag}</span>{d.city}
                    </button>
                  ))}
                  <button
                    onClick={surpriseMe}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 hover:border-purple-300 rounded-full text-[.8rem] font-bold text-purple-600 hover:text-purple-800 transition-all"
                  >
                    🎲 Surprise me!
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => dest && goStep('dates')}
              disabled={!dest}
              className="w-full bg-gradient-to-r from-[#0066FF] to-[#4F46E5] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-white font-[Poppins] font-black text-[1rem] py-4 rounded-2xl transition-all shadow-[0_4px_20px_rgba(0,102,255,0.25)]"
            >
              Next — Pick your dates →
            </button>
          </div>
        )}

        {/* ── DATES ── */}
        {step === 'dates' && dest && (
          <div className="p-6 pt-8 pb-8">
            <p className="text-[.62rem] font-black uppercase tracking-[2.5px] text-[#0066FF] mb-1">Step 2 of 3</p>
            <h2 className="font-[Poppins] font-black text-[1.6rem] text-[#1A1D2B] mb-0.5">
              {dest.flag} When are you going?
            </h2>
            <p className="text-[.82rem] text-[#8E95A9] font-semibold mb-5">Pick your travel dates</p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-[.62rem] font-black uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Departure</label>
                <input
                  type="date"
                  value={depDate}
                  min={today}
                  onChange={e => setDepDate(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-[#E8ECF4] focus:border-[#0066FF] outline-none font-[Poppins] font-semibold text-[.88rem] text-[#1A1D2B] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[.62rem] font-black uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Return</label>
                <input
                  type="date"
                  value={retDate}
                  min={depDate || today}
                  onChange={e => setRetDate(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-[#E8ECF4] focus:border-[#0066FF] outline-none font-[Poppins] font-semibold text-[.88rem] text-[#1A1D2B] transition-colors"
                />
              </div>
            </div>

            {/* Countdown card */}
            {countdown && countdown > 0 && (
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-100 rounded-2xl p-5 mb-5 text-center">
                <div className="font-[Poppins] font-black text-[3rem] leading-none text-[#1A1D2B] mb-1">{countdown}</div>
                <div className="text-[.85rem] font-black text-emerald-700 mb-1">days until {dest.city}!</div>
                <p className="text-[.75rem] text-[#8E95A9] font-semibold">
                  {countdown < 14 ? '🎒 Almost time! Get packing!' :
                   countdown < 60 ? '🎉 The excitement is building!' :
                   countdown < 120 ? '💰 Booking early = best prices!' :
                   '🧠 Smart planning ahead — love to see it!'}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => goStep('destination')}
                className="px-5 py-3.5 rounded-2xl border-2 border-[#E8ECF4] hover:border-[#0066FF] text-[#5C6378] font-[Poppins] font-bold text-[.9rem] transition-all"
              >
                ← Back
              </button>
              <button
                onClick={() => depDate && goStep('passengers')}
                disabled={!depDate}
                className="flex-1 bg-gradient-to-r from-[#0066FF] to-[#4F46E5] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-white font-[Poppins] font-black text-[1rem] py-3.5 rounded-2xl transition-all shadow-[0_4px_20px_rgba(0,102,255,0.25)]"
              >
                Next — Who's coming? →
              </button>
            </div>
          </div>
        )}

        {/* ── PASSENGERS ── */}
        {step === 'passengers' && dest && (
          <div className="p-6 pt-8 pb-8">
            <p className="text-[.62rem] font-black uppercase tracking-[2.5px] text-[#0066FF] mb-1">Step 3 of 3</p>
            <h2 className="font-[Poppins] font-black text-[1.6rem] text-[#1A1D2B] mb-0.5">
              Who's joining you? 👥
            </h2>
            <p className="text-[.82rem] text-[#8E95A9] font-semibold mb-6">
              {children > 0
                ? '👨‍👩‍👧 A family adventure! The best memories are made together.'
                : adults > 1 ? '🥂 Even better with company!' : '💪 Solo trip — the bravest kind!'}
            </p>

            {[
              { label: 'Adults', sub: 'Age 12+', val: adults, min: 1, set: setAdults },
              { label: 'Children', sub: 'Age 2–11', val: children, min: 0, set: setChildren },
            ].map(({ label, sub, val, min, set }) => (
              <div key={label} className="flex items-center justify-between py-4 border-b border-[#F8FAFC] last:border-0">
                <div>
                  <div className="font-[Poppins] font-bold text-[.95rem] text-[#1A1D2B]">{label}</div>
                  <div className="text-[.72rem] text-[#8E95A9] font-medium">{sub}</div>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => set(Math.max(min, val - 1))}
                    disabled={val <= min}
                    className="w-11 h-11 rounded-full border-2 border-[#E8ECF4] hover:border-[#0066FF] hover:text-[#0066FF] flex items-center justify-center font-bold text-xl text-[#5C6378] transition-all disabled:opacity-30"
                  >−</button>
                  <span className="font-[Poppins] font-black text-[1.1rem] text-[#1A1D2B] w-6 text-center">{val}</span>
                  <button
                    type="button"
                    onClick={() => set(val + 1)}
                    className="w-11 h-11 rounded-full border-2 border-[#E8ECF4] hover:border-[#0066FF] hover:text-[#0066FF] flex items-center justify-center font-bold text-xl text-[#5C6378] transition-all"
                  >+</button>
                </div>
              </div>
            ))}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => goStep('dates')}
                className="px-5 py-3.5 rounded-2xl border-2 border-[#E8ECF4] hover:border-[#0066FF] text-[#5C6378] font-[Poppins] font-bold text-[.9rem] transition-all"
              >
                ← Back
              </button>
              <button
                onClick={() => goStep('results')}
                className="flex-1 bg-gradient-to-r from-orange-500 to-rose-500 hover:brightness-110 text-white font-[Poppins] font-black text-[1rem] py-3.5 rounded-2xl transition-all shadow-[0_4px_20px_rgba(249,115,22,0.3)]"
              >
                Find me the best deals! 🔍
              </button>
            </div>
          </div>
        )}

        {/* ── RESULTS ── */}
        {step === 'results' && dest && (
          <div className="pb-6">
            {/* Hero banner */}
            <div className="bg-gradient-to-br from-[#0066FF] to-[#4F46E5] px-6 pt-8 pb-6 text-white">
              <div className="text-4xl mb-2">{dest.flag}</div>
              <h2 className="font-[Poppins] font-black text-[1.5rem] sm:text-[1.7rem] leading-tight mb-1">
                Your {dest.city} trip!
              </h2>
              <p className="text-[.8rem] text-white/70 font-semibold">
                {depDate && `${depDate}${retDate ? ` → ${retDate}` : ''} · `}
                {adults} adult{adults !== 1 ? 's' : ''}
                {children > 0 ? `, ${children} child${children !== 1 ? 'ren' : ''}` : ''}
              </p>
            </div>

            {/* Tab switcher */}
            <div className="flex border-b border-[#F1F3F7] px-2 overflow-x-auto">
              {['✈ Flights', '🏨 Hotels', '🗺 Discover'].map((t, i) => (
                <button
                  key={t}
                  onClick={() => setPanel(i)}
                  className={`flex-shrink-0 pb-3 pt-4 px-4 text-[.82rem] font-[Poppins] font-extrabold border-b-2 transition-all whitespace-nowrap ${panel === i ? 'border-[#0066FF] text-[#0066FF]' : 'border-transparent text-[#8E95A9] hover:text-[#1A1D2B]'}`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="p-6">
              {/* Flights panel */}
              {panel === 0 && (
                <div>
                  <p className="text-[.8rem] text-[#5C6378] font-semibold mb-4">Compare live prices across 4 providers — all pre-filled with your details</p>
                  <div className="space-y-3 mb-5">
                    {[
                      { name: 'Aviasales', icon: '✈', desc: 'Best price from 750+ airlines', color: 'bg-blue-50 text-blue-600' },
                      { name: 'Expedia', icon: '🌍', desc: 'Bundle flight + hotel & save 30%', color: 'bg-orange-50 text-orange-600' },
                      { name: 'Trip.com', icon: '🗺', desc: 'Great for Asia & Middle East deals', color: 'bg-purple-50 text-purple-600' },
                      { name: 'Booking.com', icon: '🏷', desc: 'Huge selection, no booking fees', color: 'bg-sky-50 text-sky-600' },
                    ].map(p => (
                      <button
                        key={p.name}
                        onClick={() => { close(); window.location.href = flightsUrl; }}
                        className="flex items-center gap-3 p-4 bg-[#F8FAFC] hover:bg-white border border-[#F1F3F7] hover:border-blue-200 hover:shadow-md rounded-xl transition-all group w-full text-left"
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${p.color}`}>{p.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-[Poppins] font-bold text-[.88rem] text-[#1A1D2B]">{p.name}</div>
                          <div className="text-[.7rem] text-[#8E95A9] truncate">{p.desc}</div>
                        </div>
                        <span className="text-[#0066FF] font-bold text-[.8rem] group-hover:translate-x-0.5 transition-transform flex-shrink-0">→</span>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => { close(); window.location.href = flightsUrl; }}
                    className="block w-full text-center bg-gradient-to-r from-[#0066FF] to-[#4F46E5] hover:brightness-110 text-white font-[Poppins] font-black text-[.95rem] py-4 rounded-2xl transition-all shadow-[0_4px_16px_rgba(0,102,255,0.25)]"
                  >
                    See all flights to {dest.city} →
                  </button>
                </div>
              )}

              {/* Hotels panel */}
              {panel === 1 && (
                <div>
                  <p className="text-[.8rem] text-[#5C6378] font-semibold mb-4">Find the best hotel rates in {dest.city} — pre-filled with your stay dates</p>
                  <div className="space-y-3 mb-5">
                    {[
                      { name: 'Booking.com', icon: '🏨', desc: '28M+ listings · free cancellation', color: 'bg-blue-50 text-blue-700' },
                      { name: 'Expedia', icon: '🌍', desc: 'Bundle with flight & save up to 30%', color: 'bg-orange-50 text-orange-600' },
                      { name: 'Trip.com', icon: '🗺', desc: 'Flash sales & exclusive member prices', color: 'bg-purple-50 text-purple-600' },
                    ].map(p => (
                      <button
                        key={p.name}
                        onClick={() => { close(); window.location.href = hotelsUrl; }}
                        className="flex items-center gap-3 p-4 bg-[#F8FAFC] hover:bg-white border border-[#F1F3F7] hover:border-orange-200 hover:shadow-md rounded-xl transition-all group w-full text-left"
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${p.color}`}>{p.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-[Poppins] font-bold text-[.88rem] text-[#1A1D2B]">{p.name}</div>
                          <div className="text-[.7rem] text-[#8E95A9] truncate">{p.desc}</div>
                        </div>
                        <span className="text-orange-500 font-bold text-[.8rem] group-hover:translate-x-0.5 transition-transform flex-shrink-0">→</span>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => { close(); window.location.href = hotelsUrl; }}
                    className="block w-full text-center bg-gradient-to-r from-orange-500 to-rose-500 hover:brightness-110 text-white font-[Poppins] font-black text-[.95rem] py-4 rounded-2xl transition-all shadow-[0_4px_16px_rgba(249,115,22,0.25)]"
                  >
                    Find hotels in {dest.city} →
                  </button>
                </div>
              )}

              {/* Discover panel */}
              {panel === 2 && (
                <div className="space-y-4">
                  <LocalSection title="🏖 Top Highlights" items={dest.highlights} />
                  <LocalSection title="🍽 Local Food" items={dest.food} />
                  <LocalSection title="🚌 Getting Around" items={dest.transport} />
                  {children > 0 && <LocalSection title="👧 Kids Activities" items={dest.kids} accent />}
                </div>
              )}
            </div>

            <div className="px-6">
              <button
                onClick={close}
                className="w-full text-[.78rem] text-[#B0B8CC] hover:text-[#8E95A9] font-semibold transition-colors py-1"
              >
                Close and explore jetmeaway.co.uk
              </button>
            </div>
          </div>
        )}
      </div>

      {/* eSIM toast */}
      {showEsim && dest && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000] w-[calc(100%-2rem)] max-w-sm">
          <div className="bg-[#0F1119] text-white rounded-2xl px-5 py-4 flex items-center gap-3 shadow-2xl animate-slide-up">
            <span className="text-2xl">📱</span>
            <div className="flex-1">
              <div className="font-[Poppins] font-bold text-[.9rem]">Don't pay roaming in {dest.country}!</div>
              <div className="text-[.7rem] text-white/60">eSIM plans from £3 — stay connected anywhere</div>
            </div>
            <button onClick={() => { close(); window.location.href = '/esim'; }} className="bg-[#0066FF] text-white font-bold text-[.72rem] px-3.5 py-1.5 rounded-lg whitespace-nowrap flex-shrink-0">
              View →
            </button>
          </div>
        </div>
      )}

      {/* Car rental toast */}
      {showCar && dest && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000] w-[calc(100%-2rem)] max-w-sm">
          <div className="bg-[#0F1119] text-white rounded-2xl px-5 py-4 flex items-center gap-3 shadow-2xl animate-slide-up">
            <span className="text-2xl">🚗</span>
            <div className="flex-1">
              <div className="font-[Poppins] font-bold text-[.9rem]">Explore {dest.city} your way</div>
              <div className="text-[.7rem] text-white/60">Car hire from £15/day — compare top providers</div>
            </div>
            <button onClick={() => { close(); window.location.href = carsUrl; }} className="bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold text-[.72rem] px-3.5 py-1.5 rounded-lg whitespace-nowrap flex-shrink-0">
              View →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LocalSection({ title, items, accent }: { title: string; items: string[]; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 ${accent ? 'bg-amber-50 border border-amber-100' : 'bg-[#F8FAFC] border border-[#F1F3F7]'}`}>
      <h4 className="font-[Poppins] font-black text-[.85rem] text-[#1A1D2B] mb-3">{title}</h4>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 text-[.8rem] text-[#5C6378] font-semibold">
            <span className={`mt-0.5 flex-shrink-0 font-black ${accent ? 'text-amber-500' : 'text-[#0066FF]'}`}>·</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
