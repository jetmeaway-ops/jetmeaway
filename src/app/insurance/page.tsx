'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const PROVIDERS = [
  {
    name: 'Ekta Traveling',
    logo: '🛡',
    desc: 'Comprehensive cover from £3/day. Medical, cancellation & luggage.',
    badge: 'Best Value',
    url: 'https://tp.media/r?campaign_id=225&marker=714449&p=5869&trs=512633&u=https%3A%2F%2Fektatraveling.com',
  },
  {
    name: 'AirHelp',
    logo: '✈',
    desc: 'Claim flight compensation up to €600 for delays & cancellations.',
    badge: 'Compensation',
    url: 'https://tp.media/r?campaign_id=365&marker=714449&trs=512633&p=6910&u=https%3A%2F%2Fwww.airhelp.com%2Fen-gb',
  },
  {
    name: 'Compensair',
    logo: '💶',
    desc: 'No-win no-fee flight compensation. Covers EU261 & more.',
    badge: 'No Win No Fee',
    url: 'https://tp.media/r?campaign_id=374&marker=714449&trs=512633&p=7063&u=https%3A%2F%2Fcompensair.com%2Fen',
  },
  {
    name: 'World Nomads',
    logo: '🌏',
    desc: 'Adventure & backpacker specialist — cover for 150+ activities.',
    badge: 'Adventure Cover',
    url: 'https://www.worldnomads.com/travel-insurance',
  },
  {
    name: 'InsureMyTrip',
    logo: '🗺',
    desc: 'Compare 30+ insurance plans side by side in minutes.',
    badge: 'Compare Plans',
    url: 'https://www.insuremytrip.com/',
  },
  {
    name: 'Staysure',
    logo: '🏥',
    desc: 'Pre-existing medical conditions covered. No upper age limit.',
    badge: 'Medical Cover',
    url: 'https://www.staysure.co.uk/',
  },
];

const COVER_TYPES = [
  { id: 'single', label: 'Single Trip', icon: '🎫', desc: 'One trip, best value' },
  { id: 'annual', label: 'Annual Multi-Trip', icon: '📅', desc: 'Frequent travellers' },
  { id: 'backpacker', label: 'Backpacker', icon: '🎒', desc: 'Long-stay travel' },
  { id: 'winter', label: 'Winter Sports', icon: '⛷', desc: 'Ski & snowboard' },
];

export default function InsurancePage() {
  const [coverType, setCoverType] = useState('single');
  const [destination, setDestination] = useState('');
  const [depDate, setDepDate] = useState('');
  const [retDate, setRetDate] = useState('');
  const [travellers, setTravellers] = useState('1');

  const today = new Date().toISOString().split('T')[0];

  function openAll() {
    if (!destination) { alert('Please select a destination region'); return; }
    PROVIDERS.forEach((p, i) => {
      setTimeout(() => window.open(p.url, '_blank', 'noopener'), i * 200);
    });
  }

  return (
    <>
      <Header />

      <section className="pt-36 pb-16 px-5 bg-[radial-gradient(ellipse_at_top,#E8F8EE_0%,#fff_55%,#F8FAFC_100%)] relative">
        <div className="max-w-[860px] mx-auto text-center mb-10">
          <span className="inline-block bg-green-50 text-green-600 text-[.65rem] font-black uppercase tracking-[2.5px] px-3.5 py-1.5 rounded-full mb-4">🛡 Travel Insurance</span>
          <h1 className="font-[Poppins] text-[2.6rem] md:text-[3.8rem] font-black text-[#1A1D2B] leading-[1.05] tracking-tight mb-3">
            Travel <em className="italic bg-gradient-to-br from-green-500 to-teal-600 bg-clip-text text-transparent">Protected</em>
          </h1>
          <p className="text-[1rem] text-[#8E95A9] font-semibold max-w-[520px] mx-auto">Medical cover, cancellation, luggage & flight compensation — compare the right policy for your trip.</p>
        </div>

        <div className="max-w-[860px] mx-auto bg-white border border-[#E8ECF4] rounded-3xl p-6 shadow-[0_8px_40px_rgba(0,0,0,0.07)]">
          {/* Cover type selector */}
          <div className="mb-5">
            <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-2.5">Cover Type</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {COVER_TYPES.map(ct => (
                <button key={ct.id} onClick={() => setCoverType(ct.id)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${coverType === ct.id ? 'border-green-500 bg-green-50' : 'border-[#E8ECF4] bg-[#F8FAFC] hover:border-green-200'}`}>
                  <div className="text-lg mb-1">{ct.icon}</div>
                  <div className={`font-[Poppins] font-bold text-[.78rem] ${coverType === ct.id ? 'text-green-700' : 'text-[#1A1D2B]'}`}>{ct.label}</div>
                  <div className="text-[.65rem] text-[#8E95A9] font-semibold">{ct.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Destination Region</label>
            <select value={destination} onChange={e => setDestination(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.9rem] font-semibold text-[#1A1D2B] outline-none focus:border-green-500 focus:bg-white transition-all">
              <option value="">Select destination...</option>
              <option value="europe">Europe</option>
              <option value="worldwide">Worldwide (excl. USA)</option>
              <option value="worldwide-usa">Worldwide (incl. USA)</option>
              <option value="uk">UK Only</option>
            </select>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Departure Date</label>
              <input type="date" min={today} value={depDate} onChange={e => setDepDate(e.target.value)}
                className="w-full px-3 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.82rem] font-semibold text-[#1A1D2B] outline-none focus:border-green-500 focus:bg-white transition-all" />
            </div>
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Return Date</label>
              <input type="date" min={depDate || today} value={retDate} onChange={e => setRetDate(e.target.value)}
                className="w-full px-3 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.82rem] font-semibold text-[#1A1D2B] outline-none focus:border-green-500 focus:bg-white transition-all" />
            </div>
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5">Travellers</label>
              <select value={travellers} onChange={e => setTravellers(e.target.value)}
                className="w-full px-3 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.82rem] font-semibold text-[#1A1D2B] outline-none focus:border-green-500 focus:bg-white transition-all">
                <option value="1">1 traveller</option>
                <option value="2">2 travellers</option>
                <option value="family">Family (2+2)</option>
                <option value="group">Group (5+)</option>
              </select>
            </div>
          </div>
          <button onClick={openAll}
            className="w-full bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white font-[Poppins] font-black text-[.95rem] py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(16,185,129,0.3)]">
            Compare {PROVIDERS.length} Insurance Providers →
          </button>
          <p className="text-center text-[.68rem] text-[#8E95A9] font-semibold mt-2.5">Prices from £3/day. Opens all providers so you can compare quotes.</p>
        </div>
      </section>

      <section className="max-w-[1100px] mx-auto px-5 pb-16">
        <p className="text-[.65rem] font-extrabold uppercase tracking-[3px] text-[#8E95A9] mb-1.5">All Providers</p>
        <h2 className="font-[Poppins] text-[1.4rem] font-black text-[#1A1D2B] mb-6">6 Travel Insurance & Compensation Providers</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PROVIDERS.map(p => (
            <a key={p.name} href={p.url} target="_blank" rel="noopener"
              className="block p-5 bg-white border border-[#F1F3F7] rounded-2xl hover:border-green-200 hover:shadow-md transition-all group">
              <div className="text-2xl mb-3">{p.logo}</div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="font-[Poppins] font-extrabold text-[.92rem] text-[#1A1D2B]">{p.name}</span>
                <span className="text-[.58rem] font-black uppercase tracking-[1.5px] px-2 py-0.5 rounded-full bg-green-50 text-green-600">{p.badge}</span>
              </div>
              <p className="text-[.75rem] text-[#5C6378] font-semibold leading-relaxed mb-3">{p.desc}</p>
              <span className="text-[.72rem] font-black text-green-600 group-hover:underline">Get a Quote →</span>
            </a>
          ))}
        </div>
      </section>

      {/* What's covered */}
      <section className="max-w-[860px] mx-auto px-5 pb-16">
        <div className="bg-[#F8FAFC] border border-[#F1F3F7] rounded-3xl p-8">
          <h3 className="font-[Poppins] font-black text-[1.05rem] text-[#1A1D2B] mb-5">What Good Travel Insurance Covers</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              ['Emergency Medical', 'Hospital stays, treatment & medical repatriation — essential for USA/Caribbean.'],
              ['Trip Cancellation', 'Get your money back if you must cancel due to illness, bereavement or redundancy.'],
              ['Delayed & Missed Flights', 'Compensation for delays over 2+ hours plus missed connections.'],
              ['Baggage Loss & Delay', 'Reimbursement for lost, stolen or delayed luggage and contents.'],
              ['Flight Compensation', 'EU261 claims up to €600 for delays, cancellations & denied boarding.'],
              ['24/7 Emergency Assistance', 'Round-the-clock support line — critical if something goes wrong abroad.'],
            ].map(([title, body]) => (
              <div key={title} className="flex gap-3 bg-white border border-[#F1F3F7] rounded-xl p-3.5">
                <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 mt-1.5" />
                <div>
                  <div className="font-[Poppins] font-bold text-[.82rem] text-[#1A1D2B] mb-0.5">{title}</div>
                  <p className="text-[.72rem] text-[#5C6378] font-semibold leading-relaxed">{body}</p>
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
