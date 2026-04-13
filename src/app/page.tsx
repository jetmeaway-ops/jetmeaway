import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FlightSearch from './search';
import { PopularDestinations, Testimonials } from './homepage-client';

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'JetMeAway',
    url: 'https://jetmeaway.co.uk',
    logo: 'https://jetmeaway.co.uk/jetmeaway-logo.png',
    description: 'UK travel price comparison platform',
    sameAs: [],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'JetMeAway',
    url: 'https://jetmeaway.co.uk',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://jetmeaway.co.uk/flights?to={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   PROVIDER LOGOS — infinite horizontal scroll (pure CSS, no hooks)
   ═══════════════════════════════════════════════════════════════════════════ */

const PROVIDERS = ['Expedia', 'Trip.com', 'GetYourGuide', 'Viator', 'Klook', 'Airalo', 'Aviasales', 'Tiqets'];

function LogoScroll() {
  return (
    <section className="py-4 bg-[#C8D0E0] border-y border-[#b6c0d3] overflow-hidden">
      <div className="flex animate-scroll">
        {[...PROVIDERS, ...PROVIDERS].map((name, i) => (
          <span key={i} className="flex-shrink-0 mx-8 font-[var(--font-dm-sans)] font-bold text-[.85rem] tracking-wide text-[#8E95A9] uppercase whitespace-nowrap">
            {name}
          </span>
        ))}
      </div>
      <style>{`
        @keyframes scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-scroll { animation: scroll 20s linear infinite; width: max-content; }
      `}</style>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   HOW IT WORKS — premium cards with watermark numbers
   ═══════════════════════════════════════════════════════════════════════════ */

const STEPS = [
  { num: '01', icon: 'fa-magnifying-glass', title: 'Search', desc: 'Enter your destination, dates, and preferences. We instantly scan 15+ trusted travel providers.' },
  { num: '02', icon: 'fa-chart-bar', title: 'Compare', desc: 'See real prices side-by-side from Expedia, Trip.com, Aviasales and more. No hidden fees.' },
  { num: '03', icon: 'fa-circle-check', title: 'Book', desc: 'Choose the best deal and book directly with the provider. We never charge booking fees.' },
];

function HowItWorks() {
  return (
    <section className="py-10 px-6 bg-white">
      <div className="max-w-[1100px] mx-auto">
        <p className="text-center text-[.65rem] font-black uppercase tracking-[3px] text-orange-500 mb-1.5 font-[var(--font-dm-sans)]">Simple Process</p>
        <h2 className="text-center font-[var(--font-playfair)] text-[1.8rem] md:text-[2.2rem] font-black text-[#0a1628] mb-6">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STEPS.map((s) => (
            <div key={s.num}
              className="relative bg-white border border-[#E8ECF4] rounded-2xl p-5 text-center overflow-hidden transition-all duration-300 group hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] hover:border-t-[3px] hover:border-t-orange-500">
              {/* Watermark number */}
              <span className="absolute top-1 right-3 font-[var(--font-playfair)] font-black text-[3.2rem] leading-none text-[#F1F3F7] group-hover:text-orange-50 transition-colors select-none pointer-events-none">{s.num}</span>
              <div className="relative z-[1]">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <i className={`fa-solid ${s.icon} text-xl text-orange-500`} />
                </div>
                <h3 className="font-[var(--font-playfair)] font-black text-[1.1rem] text-[#0a1628] mb-1">{s.title}</h3>
                <p className="font-[var(--font-dm-sans)] text-[.78rem] text-[#5C6378] leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   WHAT WE COMPARE — coloured icons, hover lift, Hotels orange accent
   ═══════════════════════════════════════════════════════════════════════════ */

const CATEGORIES = [
  { emoji: '🏨', name: 'Hotels', desc: 'Compare 2M+ properties from top providers', href: '/hotels', live: true, color: 'from-orange-500 to-amber-500' },
  { emoji: '✈️', name: 'Flights', desc: '250+ airports with real-time pricing', href: '/flights', live: false, color: 'from-blue-500 to-indigo-500' },
  { emoji: '📦', name: 'Packages', desc: 'All-inclusive holiday bundles', href: '/packages', live: false, color: 'from-purple-500 to-pink-500' },
  { emoji: '🚗', name: 'Car Hire', desc: '7 providers, best rates guaranteed', href: '/cars', live: false, color: 'from-emerald-500 to-teal-500' },
  { emoji: '📱', name: 'eSIM', desc: 'Data plans for 150+ countries', href: '/esim', live: false, color: 'from-cyan-500 to-blue-500' },
  { emoji: '🧭', name: 'Explore', desc: 'Tours, activities & experiences', href: '/explore', live: false, color: 'from-rose-500 to-orange-500' },
];

function WhatWeCompare() {
  return (
    <section className="py-10 px-6 bg-[#C8D0E0]">
      <div className="max-w-[1100px] mx-auto">
        <p className="text-center text-[.65rem] font-black uppercase tracking-[3px] text-orange-500 mb-1.5 font-[var(--font-dm-sans)]">All In One Place</p>
        <h2 className="text-center font-[var(--font-playfair)] text-[1.8rem] md:text-[2.2rem] font-black text-[#0a1628] mb-6">What We Compare</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {CATEGORIES.map((c) => (
            <a key={c.name} href={c.href}
              className={`relative bg-white border rounded-2xl p-4 transition-all duration-300 group hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] ${c.live ? 'border-orange-200 bg-gradient-to-br from-white to-orange-50/50' : 'border-[#E8ECF4] hover:border-orange-200'}`}>
              {c.live && (
                <span className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-green-50 border border-green-200 text-green-700 text-[.58rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  Live
                </span>
              )}
              <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">{c.emoji}</div>
              <h3 className="font-poppins font-black text-[.95rem] text-[#0a1628] mb-0.5">{c.name}</h3>
              <p className="font-[var(--font-dm-sans)] text-[.74rem] text-[#5C6378]">{c.desc}</p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CTA — warm gradient, prominent button
   ═══════════════════════════════════════════════════════════════════════════ */

function CtaSection() {
  return (
    <section className="py-16 px-6 bg-gradient-to-br from-orange-50 via-amber-50 to-white">
      <div className="max-w-[700px] mx-auto text-center">
        <h2 className="font-[var(--font-playfair)] text-[2rem] md:text-[2.6rem] font-black text-[#0a1628] mb-3">
          Ready to Find Your <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">Best Deal?</span>
        </h2>
        <p className="font-[var(--font-dm-sans)] text-[.95rem] text-[#5C6378] mb-8">Join thousands of UK travellers saving money across 15+ providers</p>
        <a href="/hotels"
          className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-poppins font-black text-[1rem] px-10 py-4 rounded-xl shadow-[0_8px_30px_rgba(249,115,22,0.35)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(249,115,22,0.4)]">
          Compare Hotel Prices Now
        </a>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN HOMEPAGE — Server component: hero + static sections are SSR'd
   for fast LCP. Only interactive widgets (search, carousel, testimonials)
   are client components.
   ═══════════════════════════════════════════════════════════════════════════ */

export default function Home() {
  return (
    <>
      {jsonLd.map((ld, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      ))}
      <Header />

      {/* ── HERO — server-rendered for instant LCP ── */}
      <section className="relative pt-32 md:pt-40 pb-12 px-6 overflow-hidden min-h-[600px] md:min-h-[700px]" style={{ background: 'linear-gradient(160deg, #0a1628 0%, #1a2744 50%, #0f1e36 100%)' }}>
        {/* Floating glassmorphic decorations */}
        <div className="absolute top-20 left-[10%] w-64 h-64 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute bottom-10 right-[5%] w-80 h-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute top-32 right-[15%] w-48 h-48 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-sm rotate-12 hidden md:block" />
        <div className="absolute bottom-20 left-[8%] w-36 h-36 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-sm -rotate-6 hidden md:block" />

        <div className="max-w-[800px] mx-auto text-center relative z-[1]">
          <p className="font-[var(--font-dm-sans)] text-orange-400 text-[.72rem] font-bold uppercase tracking-[3px] mb-4">UK&apos;s Smartest Travel Comparison</p>
          <h1 className="font-[var(--font-playfair)] text-[2.6rem] md:text-[4.2rem] font-black text-white leading-[1.08] tracking-tight mb-5">
            Find Your Perfect Trip for{' '}
            <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">Less</span>
          </h1>
          <p className="font-[var(--font-dm-sans)] text-white/60 text-[1.05rem] mb-8 max-w-[550px] mx-auto">
            Compare flights, hotels, car hire and more from 15+ trusted providers. Zero fees, real prices.
          </p>

          {/* Stats bar */}
          <div className="flex flex-wrap justify-center gap-6 md:gap-10 mb-8">
            {[
              { val: '15+', label: 'Providers' },
              { val: '2M+', label: 'Hotels' },
              { val: '0', label: 'Booking Fees', prefix: '\u00A3' },
              { val: '24/7', label: 'AI Assistant' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="font-poppins font-black text-[1.6rem] md:text-[2rem] text-white leading-none">{s.prefix || ''}{s.val}</div>
                <div className="font-[var(--font-dm-sans)] text-white/40 text-[.7rem] font-medium mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Search form — client component */}
          <div id="hero-search">
            <FlightSearch />
          </div>
        </div>
      </section>

      <LogoScroll />
      <PopularDestinations />
      <WhatWeCompare />
      <HowItWorks />
      <Testimonials />
      <CtaSection />
      <Footer />
    </>
  );
}
