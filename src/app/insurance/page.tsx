'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import DateRangePicker from '@/components/DateRangePicker';
import { redirectUrl } from '@/lib/redirect';
import { PageSchema } from '@/lib/page-schema';
import { INSURANCE_FAQS } from '@/lib/page-faqs';
import AppStoreBadges from '@/components/AppStoreBadges';

// Live-affiliate providers — only providers with a confirmed affiliate
// relationship appear with a working CTA. Ekta is a marketplace itself, so
// a single affiliate gives the customer 30+ underlying insurers to choose
// from.
const PROVIDERS = [
  {
    name: 'Ekta Traveling',
    logo: '🛡',
    k: 'ekta',
    url: 'https://tp.media/r?campaign_id=225&marker=714449&p=5869&trs=512633&u=https%3A%2F%2Fektatraveling.com',
  },
];

// Comparison shortlist — direct partner-website links so customers can
// quote elsewhere. We don't earn on these clicks (affiliates pending
// approval — see the project memory file). Listed so /insurance feels
// like an actual comparison, not a one-provider redirect. Each link is
// the public homepage; do NOT add referral params we haven't earned.
const COMPARE_LINKS = [
  { name: 'Staysure', k: 'staysure', url: 'https://www.staysure.co.uk/' },
  { name: 'SafetyWing', k: 'safetywing', url: 'https://safetywing.com/nomad-insurance' },
  { name: 'AXA', k: 'axa', url: 'https://www.axa.co.uk/insurance/personal/travel/' },
  { name: 'World Nomads', k: 'worldNomads', url: 'https://www.worldnomads.com/' },
  { name: 'Allianz Travel', k: 'allianz', url: 'https://www.allianz-assistance.co.uk/' },
] as const;

const COVER_TYPES = [
  { id: 'single', k: 'single', icon: '🎫' },
  { id: 'annual', k: 'annual', icon: '📅' },
  { id: 'backpacker', k: 'backpacker', icon: '🎒' },
  { id: 'winter', k: 'winter', icon: '⛷' },
] as const;

export default function InsurancePage() {
  const t = useTranslations('insurance');
  const [coverType, setCoverType] = useState('single');
  const [destination, setDestination] = useState('');
  const [depDate, setDepDate] = useState('');
  const [retDate, setRetDate] = useState('');
  const [travellers, setTravellers] = useState('1');

  const today = new Date().toISOString().split('T')[0];

  function openAll() {
    if (!destination) { alert(t('selectRegionAlert')); return; }
    PROVIDERS.forEach((p, i) => {
      setTimeout(() => window.open(redirectUrl(p.url, p.name, destination, 'insurance'), '_blank', 'noopener'), i * 200);
    });
  }

  return (
    <>
      <PageSchema crumbs={[{ name: 'Insurance', path: '/insurance' }]} faqs={INSURANCE_FAQS} />
      <Header />

      {/* Insurance identity: "safe haven" deep emerald forest with calm green glow */}
      <section
        className="relative pt-36 pb-16 px-5 min-h-[600px] md:min-h-[700px]"
        style={{ background: 'linear-gradient(160deg, #061a14 0%, #0b2820 50%, #03130c 100%)' }}
      >
        {/* Ambient decoration — clipped to hero so it doesn't bleed, but lets popups overflow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Ambient emerald + green safe-haven blobs */}
        <div className="absolute top-20 left-[10%] w-72 h-72 rounded-full bg-emerald-500/[.20] blur-3xl pointer-events-none animate-blob-drift-a" />
        <div className="absolute bottom-10 right-[5%] w-80 h-80 rounded-full bg-green-400/[.16] blur-3xl pointer-events-none animate-blob-drift-b" />
        <div className="absolute top-1/3 left-[42%] w-56 h-56 rounded-full bg-teal-400/[.14] blur-3xl pointer-events-none animate-blob-drift-c" />
        <div className="absolute top-1/2 right-[20%] w-40 h-40 rounded-full bg-emerald-400/[.10] blur-3xl pointer-events-none animate-blob-drift-a" />

        {/* Floating glass squares */}
        <div className="absolute top-32 right-[12%] w-48 h-48 rounded-2xl border border-emerald-300/20 bg-white/[.05] backdrop-blur-sm rotate-12 hidden md:block pointer-events-none shadow-[0_30px_60px_-25px_rgba(16,185,129,0.4)] animate-float-slow" />
        <div className="absolute bottom-20 left-[7%] w-36 h-36 rounded-2xl border border-green-300/20 bg-white/[.05] backdrop-blur-sm -rotate-6 hidden md:block pointer-events-none shadow-[0_30px_60px_-25px_rgba(74,222,128,0.35)] animate-float-slow-reverse" />
        <div className="absolute top-[60%] right-[6%] w-20 h-20 rounded-xl border border-teal-300/20 bg-white/[.05] backdrop-blur-sm rotate-[18deg] hidden lg:block pointer-events-none animate-float-slow-reverse" />
        <div className="absolute top-[24%] left-[6%] w-16 h-16 rounded-xl border border-emerald-300/25 bg-white/[.05] backdrop-blur-sm -rotate-12 hidden lg:block pointer-events-none animate-float-slow" />

        {/* Sparkle dots — fireflies in the forest */}
        <div className="absolute top-[28%] left-[28%] w-1.5 h-1.5 rounded-full bg-emerald-300/90 shadow-[0_0_12px_4px_rgba(110,231,183,0.6)] pointer-events-none animate-twinkle" />
        <div className="absolute top-[55%] right-[32%] w-1 h-1 rounded-full bg-green-300/90 shadow-[0_0_10px_3px_rgba(134,239,172,0.6)] pointer-events-none animate-twinkle-delay" />
        <div className="absolute top-[40%] right-[18%] w-1 h-1 rounded-full bg-teal-300/90 shadow-[0_0_10px_3px_rgba(94,234,212,0.5)] pointer-events-none animate-twinkle" />
        <div className="absolute bottom-[20%] left-[35%] w-1.5 h-1.5 rounded-full bg-emerald-200/90 shadow-[0_0_12px_4px_rgba(167,243,208,0.55)] pointer-events-none animate-twinkle-delay" />
        </div>

        <div className="max-w-[860px] mx-auto text-center mb-10 relative z-[1]">
          <span className="inline-flex items-center gap-1.5 backdrop-blur-md bg-gradient-to-r from-emerald-500/15 to-green-500/15 border border-emerald-300/30 text-emerald-300 text-[.65rem] font-black uppercase tracking-[2.5px] px-3.5 py-1.5 rounded-full mb-4 shadow-[0_4px_20px_rgba(16,185,129,0.25)]"><span className="text-base leading-none">🛡</span> {t('badge')}</span>
          <h1 className="font-poppins text-[2.6rem] md:text-[3.8rem] font-black text-white leading-[1.05] tracking-tight mb-3">
            {t('titlePre')} <em className="italic bg-gradient-to-br from-emerald-300 via-green-400 to-teal-500 bg-clip-text text-transparent">{t('titleHighlight')}</em>
          </h1>
          <p className="text-[1rem] text-white/60 font-semibold max-w-[520px] mx-auto">{t('heroSub')}</p>
        </div>

        <div className="max-w-[860px] mx-auto bg-white border border-white/20 rounded-3xl p-6 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.6),0_8px_24px_-8px_rgba(16,185,129,0.3),0_0_0_1px_rgba(110,231,183,0.08)] relative z-[1]">

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
          {/* Cover type selector */}
          <div className="mb-5">
            <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-2.5 text-center">{t('coverType')}</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {COVER_TYPES.map(ct => (
                <button key={ct.id} onClick={() => setCoverType(ct.id)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${coverType === ct.id ? 'border-green-500 bg-green-50' : 'border-[#E8ECF4] bg-[#F8FAFC] hover:border-green-200'}`}>
                  <div className="text-lg mb-1">{ct.icon}</div>
                  <div className={`font-poppins font-bold text-[.78rem] ${coverType === ct.id ? 'text-green-700' : 'text-[#1A1D2B]'}`}>{t(`cover.${ct.k}.label`)}</div>
                  <div className="text-[.65rem] text-[#8E95A9] font-semibold">{t(`cover.${ct.k}.desc`)}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <label htmlFor="ins-destination" className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5 text-center">{t('destinationRegion')}</label>
            <select id="ins-destination" value={destination} onChange={e => setDestination(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.9rem] font-semibold text-[#1A1D2B] outline-none focus:border-green-500 focus:bg-white transition-all">
              <option value="">{t('selectDestination')}</option>
              <option value="europe">{t('regionEurope')}</option>
              <option value="worldwide">{t('regionWorldwideExUsa')}</option>
              <option value="worldwide-usa">{t('regionWorldwideIncUsa')}</option>
              <option value="uk">{t('regionUkOnly')}</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5 text-center">{t('calendar')}</label>
              <DateRangePicker
                start={depDate}
                end={retDate}
                minDate={today}
                accent="green"
                startWord="departure"
                endWord="return"
                onChange={({ start: s, end: e }) => { setDepDate(s); setRetDate(e); }}
              />
            </div>
            <div>
              <label htmlFor="ins-travellers" className="block text-[.65rem] font-extrabold uppercase tracking-[2px] text-[#8E95A9] mb-1.5 text-center">{t('travellers')}</label>
              <select id="ins-travellers" value={travellers} onChange={e => setTravellers(e.target.value)}
                className="w-full px-3 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.82rem] font-semibold text-[#1A1D2B] outline-none focus:border-green-500 focus:bg-white transition-all">
                <option value="1">{t('travellers1')}</option>
                <option value="2">{t('travellers2')}</option>
                <option value="family">{t('travellersFamily')}</option>
                <option value="group">{t('travellersGroup')}</option>
              </select>
            </div>
          </div>
          <button onClick={openAll}
            className="w-full bg-[#0066FF] hover:bg-[#0052CC] text-white font-poppins font-bold text-[.95rem] py-4 rounded-xl transition-all shadow-[0_4px_16px_rgba(0,102,255,0.25)]">
            {t('getQuote')} →
          </button>
          <p className="text-center text-[.68rem] text-[#8E95A9] font-semibold mt-2.5">{t('quoteNote')}</p>
        </div>

        {/* App-store badge row — sits under the search form on the dark hero. */}
        <AppStoreBadges variant="dark" className="mt-7" />
      </section>

      <section className="max-w-[1100px] mx-auto px-5 pb-10">
        <p className="text-[.65rem] font-extrabold uppercase tracking-[3px] text-[#8E95A9] mb-1.5">{t('liveQuotePartner')}</p>
        <h2 className="font-poppins text-[1.4rem] font-black text-[#1A1D2B] mb-2">{t('getInstantQuote')}</h2>
        <p className="text-[.78rem] text-[#5C6378] font-semibold mb-6 max-w-[640px]">{t('ektaMarketplaceSub')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PROVIDERS.map(p => (
            <a key={p.name} href={redirectUrl(p.url, p.name, destination || 'your trip', 'insurance')} target="_blank" rel="noopener"
              className="block p-5 bg-white border border-[#F1F3F7] rounded-2xl hover:border-green-200 hover:shadow-md transition-all group">
              <div className="text-2xl mb-3">{p.logo}</div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="font-poppins font-extrabold text-[.92rem] text-[#1A1D2B]">{p.name}</span>
                <span className="text-[.58rem] font-black uppercase tracking-[1.5px] px-2 py-0.5 rounded-full bg-green-50 text-green-600">{t(`providers.${p.k}.badge`)}</span>
              </div>
              <p className="text-[.75rem] text-[#5C6378] font-semibold leading-relaxed mb-3">{t(`providers.${p.k}.desc`)}</p>
              <span className="text-[.72rem] font-black text-green-600 group-hover:underline">{t('getAQuote')} →</span>
            </a>
          ))}
        </div>
      </section>

      {/* Compare elsewhere — direct (unmonetised) links to other reputable
          UK insurers so customers can sanity-check Ekta's price. We're
          honest about the affiliate status; once approvals land we'll wire
          their tracking IDs and remove the "affiliate pending" badge. */}
      <section className="max-w-[1100px] mx-auto px-5 pb-16">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
          <p className="text-[.65rem] font-extrabold uppercase tracking-[3px] text-[#8E95A9]">{t('compareElsewhere')}</p>
          <span className="text-[.6rem] font-bold text-[#8E95A9] bg-[#F8FAFC] border border-[#F1F3F7] px-2.5 py-1 rounded-full">{t('noAffiliateCode')}</span>
        </div>
        <h2 className="font-poppins text-[1.4rem] font-black text-[#1A1D2B] mb-2">{t('otherInsurers')}</h2>
        <p className="text-[.78rem] text-[#5C6378] font-semibold mb-6 max-w-[640px]">{t('compareSub')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {COMPARE_LINKS.map(c => (
            <a key={c.name} href={c.url} target="_blank" rel="noopener nofollow sponsored"
              className="block p-5 bg-white border border-[#F1F3F7] rounded-2xl hover:border-emerald-200 hover:shadow-md transition-all group">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="font-poppins font-extrabold text-[.92rem] text-[#1A1D2B]">{c.name}</span>
                <span className="text-[.55rem] font-black uppercase tracking-[1.5px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">{t('affiliatePending')}</span>
              </div>
              <p className="text-[.75rem] text-[#5C6378] font-semibold leading-relaxed mb-3">{t(`compareLinks.${c.k}`)}</p>
              <span className="text-[.72rem] font-black text-emerald-600 group-hover:underline">{t('visit', {name: c.name})} →</span>
            </a>
          ))}
        </div>
      </section>

      {/* What's covered */}
      <section className="max-w-[860px] mx-auto px-5 pb-16">
        <div className="bg-[#F8FAFC] border border-[#F1F3F7] rounded-3xl p-8">
          <h3 className="font-poppins font-black text-[1.05rem] text-[#1A1D2B] mb-5">{t('whatCovers')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(['emergencyMedical','tripCancellation','delayedFlights','baggageLoss','personalLiability','emergencyAssistance'] as const).map((ck) => (
              <div key={ck} className="flex gap-3 bg-white border border-[#F1F3F7] rounded-xl p-3.5">
                <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 mt-1.5" />
                <div>
                  <div className="font-poppins font-bold text-[.82rem] text-[#1A1D2B] mb-0.5">{t(`covers.${ck}.title`)}</div>
                  <p className="text-[.72rem] text-[#5C6378] font-semibold leading-relaxed">{t(`covers.${ck}.body`)}</p>
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
