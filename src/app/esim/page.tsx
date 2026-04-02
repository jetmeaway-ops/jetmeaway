'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const PROVIDERS = [
  {
    name: 'Airalo',
    logo: '📡',
    desc: 'World\'s first eSIM store. 200+ countries from $4.50. Instant activation.',
    badge: 'Most Popular',
    plans: 'From $4.50',
    url: 'https://tp.media/r?campaign_id=541&marker=714449&p=8310&trs=512633&u=https%3A%2F%2Fwww.airalo.com%2F',
  },
  {
    name: 'Yesim',
    logo: '✅',
    desc: 'Unlimited data plans for 100+ countries. Best for long stays.',
    badge: 'Unlimited Plans',
    plans: 'From £4.99',
    url: 'https://tp.media/r?campaign_id=455&marker=714449&trs=512633&p=8205&u=https%3A%2F%2Fyesim.app%2F',
  },
  {
    name: 'Holafly',
    logo: '🌊',
    desc: 'Unlimited data in 170+ destinations. No speed throttling.',
    badge: 'No Throttling',
    plans: 'From €9',
    url: 'https://esim.holafly.com/?ref=jetmeaway',
  },
  {
    name: 'Nomad',
    logo: '🏕',
    desc: 'Reliable eSIMs with top-up flexibility. Great coverage in Asia.',
    badge: 'Asia Coverage',
    plans: 'From $2.50',
    url: 'https://www.getnomad.app/',
  },
  {
    name: 'eSIM.net',
    logo: '🌐',
    desc: 'Competitive regional plans. Connect before you land.',
    badge: 'Regional Plans',
    plans: 'From €4',
    url: 'https://esim.net/',
  },
  {
    name: 'Maya Mobile',
    logo: '📱',
    desc: 'Global eSIM with data rollover. Great for multi-destination trips.',
    badge: 'Data Rollover',
    plans: 'From £5',
    url: 'https://www.mayamobile.io/',
  },
];

const REGIONS = [
  { id: 'europe', label: 'Europe', flag: '🇪🇺', countries: '45+ countries' },
  { id: 'usa', label: 'USA & Canada', flag: '🇺🇸', countries: '2 countries' },
  { id: 'asia', label: 'Asia Pacific', flag: '🌏', countries: '30+ countries' },
  { id: 'middle-east', label: 'Middle East', flag: '🕌', countries: '15+ countries' },
  { id: 'americas', label: 'Americas', flag: '🌎', countries: '20+ countries' },
  { id: 'africa', label: 'Africa', flag: '🌍', countries: '25+ countries' },
  { id: 'global', label: 'Global', flag: '🌐', countries: '100+ countries' },
];

export default function ESIMPage() {
  const [region, setRegion] = useState('');
  const [duration, setDuration] = useState('7');

  function openAll() {
    PROVIDERS.forEach((p, i) => {
      setTimeout(() => window.open(p.url, '_blank', 'noopener'), i * 200);
    });
  }

  return (
    <>
      <Header />

      <section className="pt-36 pb-16 px-5 bg-[radial-gradient(ellipse_at_top,#E8F0FE_0%,#fff_55%,#F8FAFC_100%)] relative">
        <div className="max-w-[860px] mx-auto text-center mb-10">
          <span className="inline-block bg-indigo-50 text-indigo-600 text-[.65rem] font-black uppercase tracking-[2.5px] px-3.5 py-1.5 rounded-full mb-4">📱 eSIM Data Plans</span>
          <h1 className="font-[Poppins] text-[2.6rem] md:text-[3.8rem] font-black text-[#1A1D2B] leading-[1.05] tracking-tight mb-3">
            Stay Connected <em className="italic bg-gradient-to-br from-indigo-600 to-blue-600 bg-clip-text text-transparent">Anywhere</em>
          </h1>
          <p className="text-[1rem] text-[#8E95A9] font-semibold max-w-[520px] mx-auto">No roaming charges. No SIM swapping. Just scan a QR code and go — data from $4.50.</p>
        </div>

        {/* What is eSIM */}
        <div className="max-w-[860px] mx-auto mb-8 bg-indigo-50/50 border border-indigo-100/60 rounded-2xl p-5 flex gap-4 items-start">
          <div className="text-2xl">💡</div>
          <div>
            <div className="font-[Poppins] font-black text-[.85rem] text-[#1A1D2B] mb-1">What is an eSIM?</div>
            <p className="text-[.78rem] text-[#5C6378] font-semibold leading-relaxed">An eSIM is a digital SIM you install on your phone without a physical card. Buy a local data plan online, scan the QR code, and you're connected — no queues at airport kiosks, no roaming bills.</p>
          </div>
        </div>

        <div className="max-w-[860px] mx-auto bg-white border border-[#E8ECF4] rounded-3xl p-6 shadow-[0_8px_40px_rgba(0,0,0,0.07)]">
          <div className="mb-4">
            <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-2.5">Select Your Destination Region</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {REGIONS.map(r => (
                <button key={r.id} onClick={() => setRegion(r.id)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${region === r.id ? 'border-indigo-500 bg-indigo-50' : 'border-[#E8ECF4] bg-[#F8FAFC] hover:border-indigo-200'}`}>
                  <div className="text-xl mb-1">{r.flag}</div>
                  <div className={`font-[Poppins] font-bold text-[.75rem] ${region === r.id ? 'text-indigo-700' : 'text-[#1A1D2B]'}`}>{r.label}</div>
                  <div className="text-[.62rem] text-[#8E95A9] font-semibold">{r.countries}</div>
                </button>
              ))}
            </div>
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
              <option value="365">365 days (annual / digital nomad)</option>
            </select>
          </div>
          <button onClick={openAll}
            className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-[Poppins] font-black text-[.95rem] py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(79,70,229,0.3)]">
            Compare {PROVIDERS.length} eSIM Providers →
          </button>
          <p className="text-center text-[.68rem] text-[#8E95A9] font-semibold mt-2.5">Instant activation. Works on all eSIM-compatible iPhones & Android devices.</p>
        </div>
      </section>

      <section className="max-w-[1100px] mx-auto px-5 pb-16">
        <p className="text-[.65rem] font-extrabold uppercase tracking-[3px] text-[#8E95A9] mb-1.5">All Providers</p>
        <h2 className="font-[Poppins] text-[1.4rem] font-black text-[#1A1D2B] mb-6">6 eSIM Data Providers</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PROVIDERS.map(p => (
            <a key={p.name} href={p.url} target="_blank" rel="noopener"
              className="block p-5 bg-white border border-[#F1F3F7] rounded-2xl hover:border-indigo-200 hover:shadow-md transition-all group">
              <div className="text-2xl mb-3">{p.logo}</div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-[Poppins] font-extrabold text-[.92rem] text-[#1A1D2B]">{p.name}</span>
                <span className="text-[.58rem] font-black uppercase tracking-[1.5px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">{p.badge}</span>
              </div>
              <div className="text-[.72rem] font-black text-[#0066FF] mb-2">{p.plans}</div>
              <p className="text-[.75rem] text-[#5C6378] font-semibold leading-relaxed mb-3">{p.desc}</p>
              <span className="text-[.72rem] font-black text-indigo-600 group-hover:underline">Get eSIM →</span>
            </a>
          ))}
        </div>
      </section>

      {/* Compatibility */}
      <section className="max-w-[860px] mx-auto px-5 pb-16">
        <div className="bg-[#F8FAFC] border border-[#F1F3F7] rounded-3xl p-8">
          <h3 className="font-[Poppins] font-black text-[1.05rem] text-[#1A1D2B] mb-4">Is My Phone eSIM Compatible?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              ['iPhone', 'iPhone XS and newer (all models from 2018+). iPhone 14 onwards is eSIM-only in USA.'],
              ['Samsung', 'Galaxy S20 and newer, Galaxy Z Fold & Flip series, most 2020+ flagships.'],
              ['Google Pixel', 'Pixel 3a, 4, 5, 6, 7, 8 and newer all support eSIM.'],
              ['Check your phone', 'Go to Settings → General → About → look for "Available SIM" or "Digital SIM".'],
            ].map(([title, body]) => (
              <div key={title} className="flex gap-3">
                <div className="w-1.5 flex-shrink-0 rounded-full bg-gradient-to-b from-indigo-500 to-blue-600 self-stretch" />
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
