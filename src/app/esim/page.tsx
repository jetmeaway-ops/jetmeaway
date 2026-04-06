'use client';

import { useState, useEffect, useRef } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { redirectUrl } from '@/lib/redirect';

// ─── Country list ───────────────────────────────────────────────────────────
const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan',
  'Bahrain', 'Bangladesh', 'Belgium', 'Bolivia', 'Bosnia', 'Brazil', 'Brunei', 'Bulgaria',
  'Cambodia', 'Cameroon', 'Canada', 'Chile', 'China', 'Colombia', 'Costa Rica', 'Croatia', 'Cuba',
  'Cyprus', 'Czech Republic', 'Denmark', 'Dominican Republic', 'Ecuador', 'Egypt', 'Estonia',
  'Ethiopia', 'Fiji', 'Finland', 'France', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Guatemala',
  'Honduras', 'Hong Kong', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland',
  'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kuwait', 'Laos',
  'Latvia', 'Lebanon', 'Lithuania', 'Luxembourg', 'Macau', 'Madagascar', 'Malaysia', 'Maldives',
  'Malta', 'Mauritius', 'Mexico', 'Moldova', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique',
  'Myanmar', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Nigeria', 'North Macedonia',
  'Norway', 'Oman', 'Pakistan', 'Panama', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal',
  'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saudi Arabia', 'Senegal', 'Serbia', 'Singapore',
  'Slovakia', 'Slovenia', 'South Africa', 'South Korea', 'Spain', 'Sri Lanka', 'Sweden',
  'Switzerland', 'Taiwan', 'Tanzania', 'Thailand', 'Tunisia', 'Turkey', 'UAE', 'Uganda', 'Ukraine',
  'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vietnam', 'Zambia', 'Zimbabwe',
];

function CountryPicker({ value, onChange, placeholder }: {
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
    ? COUNTRIES.filter(c => c.toLowerCase().startsWith(q) || c.toLowerCase().includes(q)).slice(0, 7)
    : [];

  return (
    <div ref={ref} className="relative">
      <input type="text" placeholder={placeholder} value={value} autoComplete="off"
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => { if (results.length > 0) setOpen(true); }}
        onKeyDown={e => { if (e.key === 'Enter') setOpen(false); }}
        className="w-full px-4 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.9rem] font-semibold text-[#1A1D2B] outline-none focus:border-indigo-500 focus:bg-white transition-all placeholder:text-[#B0B8CC] placeholder:font-medium" />
      {open && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1.5 bg-white border border-[#E8ECF4] rounded-2xl shadow-2xl overflow-hidden">
          {results.map(c => (
            <li key={c} onMouseDown={() => { onChange(c); setOpen(false); }}
              className="px-4 py-3 hover:bg-indigo-50 cursor-pointer transition-colors border-b border-[#F1F3F7] last:border-0 font-poppins font-semibold text-[.88rem] text-[#1A1D2B]">
              {c}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Providers with country-specific URLs ───────────────────────────────────
const PROVIDERS = [
  {
    name: 'Airalo',
    logo: '📡',
    badge: 'Most Popular',
    getUrl: () => `https://airalo.tpk.lu/MzK1zzie`,
  },
  {
    name: 'Yesim',
    logo: '✅',
    badge: 'Unlimited Plans',
    getUrl: () => `https://yesim.tpk.lu/jSzl98ZQ`,
  },
  {
    name: 'Holafly',
    logo: '🌊',
    badge: 'No Throttling',
    getUrl: (country: string) =>
      `https://esim.holafly.com/${country.toLowerCase().replace(/ /g, '-')}/?ref=jetmeaway`,
  },
  {
    name: 'Nomad',
    logo: '🏕',
    badge: 'Asia Coverage',
    getUrl: (country: string) =>
      `https://www.getnomad.app/esim/${country.toLowerCase().replace(/ /g, '-')}`,
  },
  {
    name: 'eSIM.net',
    logo: '🌐',
    badge: 'Regional Plans',
    getUrl: (country: string) =>
      `https://esim.net/${country.toLowerCase().replace(/ /g, '-')}`,
  },
  {
    name: 'Maya Mobile',
    logo: '📱',
    badge: 'Data Rollover',
    getUrl: (country: string) =>
      `https://www.mayamobile.io/esim/${country.toLowerCase().replace(/ /g, '-')}`,
  },
];

// ─── Curated eSIM plans per country ─────────────────────────────────────────
type CuratedPlan = {
  provider: string;
  logo: string;
  badge: string;
  data: string;
  validity: string;
  price: number;
  currency: string;
  calls: boolean;
  sms: boolean;
  speed: string;
  highlights: string[];
};

function getPlansForCountry(country: string, days: number): CuratedPlan[] {
  const c = country.toLowerCase();

  // Region detection for pricing
  let region: 'europe' | 'asia' | 'africa' | 'americas' | 'middleeast' | 'global' = 'global';
  if (['united kingdom', 'france', 'germany', 'spain', 'italy', 'portugal', 'netherlands', 'belgium', 'austria', 'switzerland', 'greece', 'turkey', 'croatia', 'czech republic', 'poland', 'hungary', 'romania', 'sweden', 'norway', 'denmark', 'finland', 'ireland', 'iceland', 'cyprus', 'malta', 'albania', 'bosnia', 'serbia', 'montenegro', 'north macedonia', 'slovakia', 'slovenia', 'bulgaria', 'latvia', 'lithuania', 'estonia', 'luxembourg', 'moldova', 'ukraine', 'georgia'].some(k => c.includes(k))) region = 'europe';
  else if (['japan', 'south korea', 'china', 'thailand', 'vietnam', 'indonesia', 'malaysia', 'philippines', 'singapore', 'cambodia', 'laos', 'myanmar', 'india', 'sri lanka', 'bangladesh', 'nepal', 'pakistan', 'taiwan', 'hong kong', 'macau', 'brunei', 'mongolia', 'australia', 'new zealand', 'fiji', 'maldives'].some(k => c.includes(k))) region = 'asia';
  else if (['morocco', 'egypt', 'south africa', 'kenya', 'tanzania', 'nigeria', 'ghana', 'senegal', 'ethiopia', 'uganda', 'rwanda', 'cameroon', 'mozambique', 'madagascar', 'tunisia', 'zambia', 'zimbabwe', 'mauritius'].some(k => c.includes(k))) region = 'africa';
  else if (['united states', 'canada', 'mexico', 'brazil', 'argentina', 'chile', 'colombia', 'peru', 'costa rica', 'panama', 'cuba', 'jamaica', 'dominican republic', 'ecuador', 'bolivia', 'paraguay', 'uruguay', 'guatemala', 'honduras', 'nicaragua'].some(k => c.includes(k))) region = 'americas';
  else if (['uae', 'saudi arabia', 'qatar', 'bahrain', 'oman', 'kuwait', 'jordan', 'lebanon', 'israel', 'iraq', 'iran'].some(k => c.includes(k))) region = 'middleeast';

  // Pricing by region (per GB rough estimate)
  const pricing: Record<string, { base1gb: number; base3gb: number; base5gb: number; base10gb: number; unlimited: number }> = {
    europe: { base1gb: 4.5, base3gb: 8, base5gb: 11, base10gb: 16, unlimited: 22 },
    asia: { base1gb: 4, base3gb: 7, base5gb: 10, base10gb: 14, unlimited: 20 },
    africa: { base1gb: 6, base3gb: 12, base5gb: 18, base10gb: 28, unlimited: 35 },
    americas: { base1gb: 5, base3gb: 9, base5gb: 13, base10gb: 19, unlimited: 25 },
    middleeast: { base1gb: 5, base3gb: 10, base5gb: 14, base10gb: 20, unlimited: 28 },
    global: { base1gb: 5, base3gb: 10, base5gb: 14, base10gb: 20, unlimited: 26 },
  };

  const p = pricing[region];

  // Scale price by duration
  const mult = days <= 3 ? 1 : days <= 7 ? 1.2 : days <= 14 ? 1.8 : days <= 30 ? 2.5 : 4;

  const plans: CuratedPlan[] = [
    {
      provider: 'Airalo', logo: '📡', badge: 'Most Popular',
      data: '1 GB', validity: `${days} days`, price: Math.round(p.base1gb * mult * 100) / 100,
      currency: '$', calls: false, sms: false, speed: '4G/LTE',
      highlights: ['Instant activation', 'QR code delivery', '200+ countries'],
    },
    {
      provider: 'Nomad', logo: '🏕', badge: 'Budget Pick',
      data: '3 GB', validity: `${days} days`, price: Math.round(p.base3gb * mult * 100) / 100,
      currency: '$', calls: false, sms: false, speed: '4G/LTE',
      highlights: ['Top-up anytime', 'Data sharing', 'Good Asia coverage'],
    },
    {
      provider: 'eSIM.net', logo: '🌐', badge: 'Great Value',
      data: '5 GB', validity: `${days} days`, price: Math.round(p.base5gb * mult * 100) / 100,
      currency: '€', calls: false, sms: false, speed: '4G/5G',
      highlights: ['Regional bundles', '5G where available', 'No registration'],
    },
    {
      provider: 'Yesim', logo: '✅', badge: 'Best for Calls',
      data: '5 GB', validity: `${days} days`, price: Math.round((p.base5gb + 3) * mult * 100) / 100,
      currency: '£', calls: true, sms: true, speed: '4G/LTE',
      highlights: ['Includes calls & SMS', 'Unlimited plans available', 'Easy app'],
    },
    {
      provider: 'Airalo', logo: '📡', badge: 'Most Data',
      data: '10 GB', validity: `${days} days`, price: Math.round(p.base10gb * mult * 100) / 100,
      currency: '$', calls: false, sms: false, speed: '4G/5G',
      highlights: ['Heavy usage', '5G in select areas', 'Hotspot enabled'],
    },
    {
      provider: 'Holafly', logo: '🌊', badge: 'Unlimited',
      data: 'Unlimited', validity: `${days} days`, price: Math.round(p.unlimited * mult * 100) / 100,
      currency: '€', calls: false, sms: false, speed: '4G/LTE',
      highlights: ['Truly unlimited', 'No speed throttle', '24/7 support'],
    },
    {
      provider: 'Maya Mobile', logo: '📱', badge: 'Multi-Country',
      data: '10 GB', validity: `${Math.max(days, 30)} days`, price: Math.round(p.base10gb * 2.2 * 100) / 100,
      currency: '£', calls: false, sms: false, speed: '4G/5G',
      highlights: ['Data rollover', 'Use in 100+ countries', 'Auto top-up'],
    },
  ];

  return plans.sort((a, b) => a.price - b.price);
}

export default function ESIMPage() {
  const [country, setCountry] = useState('');
  const [duration, setDuration] = useState('7');
  const [searched, setSearched] = useState(false);
  const [plans, setPlans] = useState<CuratedPlan[]>([]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const c = p.get('country');
    const d = p.get('duration');
    if (c) setCountry(c);
    if (d) setDuration(d);
  }, []);

  function handleSearch() {
    if (!country) { alert('Please enter a destination country'); return; }
    setPlans(getPlansForCountry(country, parseInt(duration)));
    setSearched(true);
    setTimeout(() => document.getElementById('esim-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }

  const days = parseInt(duration);

  return (
    <>
      <Header />

      <section className="pt-36 pb-16 px-5 bg-[radial-gradient(ellipse_at_top,#E8F0FE_0%,#fff_55%,#F8FAFC_100%)] relative">
        <div className="max-w-[860px] mx-auto text-center mb-10">
          <span className="inline-block bg-indigo-50 text-indigo-600 text-[.65rem] font-black uppercase tracking-[2.5px] px-3.5 py-1.5 rounded-full mb-4">📱 eSIM Data Plans</span>
          <h1 className="font-poppins text-[2.6rem] md:text-[3.8rem] font-black text-[#1A1D2B] leading-[1.05] tracking-tight mb-3">
            Stay Connected <em className="italic bg-gradient-to-br from-indigo-600 to-blue-600 bg-clip-text text-transparent">Anywhere</em>
          </h1>
          <p className="text-[1rem] text-[#8E95A9] font-semibold max-w-[520px] mx-auto">No roaming charges. No SIM swapping. Just scan a QR code and go — data from $4.50.</p>
        </div>

        {/* What is eSIM */}
        <div className="max-w-[860px] mx-auto mb-8 bg-indigo-50/50 border border-indigo-100/60 rounded-2xl p-5 flex gap-4 items-start">
          <div className="text-2xl">💡</div>
          <div>
            <div className="font-poppins font-black text-[.85rem] text-[#1A1D2B] mb-1">What is an eSIM?</div>
            <p className="text-[.78rem] text-[#5C6378] font-semibold leading-relaxed">An eSIM is a digital SIM you install on your phone without a physical card. Buy a local data plan online, scan the QR code, and you&apos;re connected — no queues at airport kiosks, no roaming bills.</p>
          </div>
        </div>

        {/* Search */}
        <div className="max-w-[860px] mx-auto bg-white border border-[#E8ECF4] rounded-3xl p-6 shadow-[0_8px_40px_rgba(0,0,0,0.07)]">
          <div className="mb-3">
            <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Destination Country</label>
            <CountryPicker value={country} onChange={setCountry} placeholder="Where are you travelling? — e.g. Morocco, Thailand, USA" />
          </div>
          <div className="mb-4">
            <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Trip Duration</label>
            <select value={duration} onChange={e => setDuration(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.9rem] font-semibold text-[#1A1D2B] outline-none focus:border-indigo-500 focus:bg-white transition-all">
              <option value="3">3 days (city break)</option>
              <option value="7">7 days (one week)</option>
              <option value="14">14 days (two weeks)</option>
              <option value="30">30 days (one month)</option>
              <option value="90">90 days (long stay)</option>
            </select>
          </div>
          <button onClick={handleSearch}
            className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-poppins font-black text-[.95rem] py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(79,70,229,0.3)]">
            Compare eSIM Plans →
          </button>
          <p className="text-center text-[.68rem] text-[#8E95A9] font-semibold mt-2.5">Instant activation. Works on all eSIM-compatible iPhones & Android devices.</p>
        </div>
      </section>

      {/* eSIM Results */}
      {searched && plans.length > 0 && (
        <section id="esim-results" className="max-w-[1100px] mx-auto px-5 py-10">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
            <div>
              <h2 className="font-poppins font-black text-[1.3rem] text-[#1A1D2B]">
                eSIM Plans for {country}
                <span className="text-[#8E95A9] font-semibold text-[1rem]"> · {days} day{days !== 1 ? 's' : ''}</span>
              </h2>
              <p className="text-[.72rem] text-[#8E95A9] font-semibold mt-0.5">
                {plans.length} plans from {PROVIDERS.length} providers · prices are estimated
              </p>
            </div>
            <span className="text-[.7rem] font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full">{plans.length} plans</span>
          </div>

          {/* Plan cards */}
          <div className="space-y-4 mb-6">
            {plans.map((plan, i) => (
              <div key={`${plan.provider}-${plan.data}`} className="bg-white border border-[#E8ECF4] rounded-2xl overflow-hidden hover:shadow-lg transition-all">
                <div className="flex flex-col md:flex-row">
                  {/* Icon area */}
                  <div className="relative w-full md:w-48 h-32 md:h-auto flex-shrink-0 bg-gradient-to-br from-[#EEF0FF] to-[#E8F0FE] flex flex-col items-center justify-center p-4">
                    <span className="text-4xl mb-1">{plan.logo}</span>
                    <span className="font-poppins font-black text-[.85rem] text-indigo-700">{plan.provider}</span>
                    {i === 0 && (
                      <span className="absolute top-3 left-3 text-[.6rem] font-black uppercase tracking-[1.5px] bg-indigo-600 text-white px-2.5 py-1 rounded-full shadow-md">Cheapest</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 p-5 flex flex-col">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-poppins font-bold text-[1.05rem] text-[#1A1D2B]">{plan.data}</h3>
                        <span className="text-[.6rem] font-black uppercase tracking-[1px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">{plan.badge}</span>
                        {plan.data === 'Unlimited' && (
                          <span className="text-[.6rem] font-black uppercase tracking-[1px] px-2 py-0.5 rounded-full bg-green-50 text-green-600">No Limits</span>
                        )}
                      </div>

                      {/* Specs */}
                      <div className="flex flex-wrap gap-2.5 mb-2.5 mt-1.5">
                        <span className="flex items-center gap-1 text-[.68rem] font-bold text-[#5C6378]">
                          <span className="text-sm">📅</span> {plan.validity}
                        </span>
                        <span className="flex items-center gap-1 text-[.68rem] font-bold text-[#5C6378]">
                          <span className="text-sm">📶</span> {plan.speed}
                        </span>
                        {plan.calls && (
                          <span className="flex items-center gap-1 text-[.68rem] font-bold text-green-600">
                            <span className="text-sm">📞</span> Calls included
                          </span>
                        )}
                        {plan.sms && (
                          <span className="flex items-center gap-1 text-[.68rem] font-bold text-green-600">
                            <span className="text-sm">💬</span> SMS included
                          </span>
                        )}
                      </div>

                      {/* Highlights */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {plan.highlights.map(h => (
                          <span key={h} className="flex items-center gap-1 text-[.62rem] font-bold text-green-700 bg-green-50 px-2 py-1 rounded-full">
                            <span className="text-green-500">✓</span> {h}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Price + buy button */}
                    <div className="border-t border-[#F1F3F7] pt-3 mt-1">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                          <span className="text-[.62rem] text-[#8E95A9] font-semibold">estimated from</span>
                          <div className="font-poppins font-black text-[1.4rem] text-[#1A1D2B] leading-none">
                            {plan.currency}{plan.price.toFixed(2)}
                          </div>
                          <span className="text-[.6rem] text-[#8E95A9] font-medium">{plan.data} · {plan.validity} · prices vary on provider site</span>
                        </div>
                        <a href={redirectUrl(PROVIDERS.find(p => p.name === plan.provider)?.getUrl(country) || '#', plan.provider, country, 'esim')}
                          target="_blank" rel="noopener"
                          className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-poppins font-bold text-[.8rem] px-5 py-2.5 rounded-xl transition-all shadow-[0_2px_10px_rgba(79,70,229,0.2)]">
                          Get on {plan.provider} <span>→</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* All providers quick links */}
          <div className="bg-[#F8FAFC] border border-[#F1F3F7] rounded-2xl p-5 mb-6">
            <p className="text-[.7rem] font-bold text-[#8E95A9] uppercase tracking-[2px] mb-3">Compare all providers for {country}</p>
            <div className="flex flex-wrap gap-2">
              {PROVIDERS.map(p => (
                <a key={p.name} href={redirectUrl(p.getUrl(country), p.name, country, 'esim')} target="_blank" rel="noopener"
                  className="flex items-center gap-1.5 bg-white hover:bg-indigo-50 border border-[#E8ECF4] hover:border-indigo-200 rounded-lg px-3 py-2 transition-all group">
                  <span className="text-sm">{p.logo}</span>
                  <span className="text-[.7rem] font-bold text-[#1A1D2B] group-hover:text-indigo-600">{p.name}</span>
                  <span className="text-[.65rem] text-indigo-500 font-bold">→</span>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Compatibility */}
      <section className="max-w-[860px] mx-auto px-5 pb-16">
        <div className="bg-[#F8FAFC] border border-[#F1F3F7] rounded-3xl p-8">
          <h3 className="font-poppins font-black text-[1.05rem] text-[#1A1D2B] mb-4">Is My Phone eSIM Compatible?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              ['iPhone', 'iPhone XS and newer (all models from 2018+). iPhone 14 onwards is eSIM-only in USA.'],
              ['Samsung', 'Galaxy S20 and newer, Galaxy Z Fold & Flip series, most 2020+ flagships.'],
              ['Google Pixel', 'Pixel 3a, 4, 5, 6, 7, 8 and newer all support eSIM.'],
              ['Check your phone', 'Go to Settings > General > About > look for "Available SIM" or "Digital SIM".'],
            ].map(([title, body]) => (
              <div key={title} className="flex gap-3">
                <div className="w-1.5 flex-shrink-0 rounded-full bg-gradient-to-b from-indigo-500 to-blue-600 self-stretch" />
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
