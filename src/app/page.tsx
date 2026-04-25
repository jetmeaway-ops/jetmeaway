import Header from '@/components/Header';
import Footer from '@/components/Footer';
import RotatingReviews from '@/components/RotatingReviews';
import { LazyFlightSearch, LazyPopularDestinations, LazyTestimonials } from './homepage-client';

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': ['TravelAgency', 'Organization'],
    name: 'JetMeAway',
    legalName: 'JETMEAWAY LTD',
    url: 'https://jetmeaway.co.uk',
    logo: 'https://jetmeaway.co.uk/jetmeaway-logo.png',
    email: 'contact@jetmeaway.co.uk',
    telephone: '+44-117-463-0606',
    description:
      'JetMeAway is a UK-registered travel comparison and booking platform. Prices are locked at booking — we never call or email to demand additional payment.',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '66 Paul Street',
      addressLocality: 'London',
      postalCode: 'EC2A 4NA',
      addressCountry: 'GB',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'contact@jetmeaway.co.uk',
      telephone: '+44-117-463-0606',
      contactType: 'customer support',
      areaServed: 'GB',
      availableLanguage: ['English'],
    },
    identifier: '17140522',
    sameAs: [
      'https://find-and-update.company-information.service.gov.uk/company/17140522',
    ],
    areaServed: 'GB',
    priceRange: '££',
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

const PROVIDERS = ['Expedia', 'Trip.com', 'Aviasales', 'GetYourGuide', 'Viator', 'Klook', 'Airalo', 'Yesim'];

function LogoScroll() {
  return (
    <section className="py-4 bg-[#C8D0E0] border-y border-[#b6c0d3] overflow-hidden">
      <div className="flex animate-scroll">
        {[...PROVIDERS, ...PROVIDERS].map((name, i) => (
          <span key={i} className="flex-shrink-0 mx-8 font-[var(--font-dm-sans)] font-bold text-[.85rem] tracking-wide text-[#5C6378] uppercase whitespace-nowrap">
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
        <p className="text-center text-[.65rem] font-black uppercase tracking-[3px] text-orange-700 mb-1.5 font-[var(--font-dm-sans)]">Simple Process</p>
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
        <p className="text-center text-[.65rem] font-black uppercase tracking-[3px] text-orange-700 mb-1.5 font-[var(--font-dm-sans)]">All In One Place</p>
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
   SCOUT DESTINATIONS — homepage card that passes link equity to /destinations
   ═══════════════════════════════════════════════════════════════════════════ */

function ScoutDestinations() {
  const highlights = [
    { slug: 'dubai',      city: 'Dubai',      country: 'UAE' },
    { slug: 'istanbul',   city: 'Istanbul',   country: 'Turkey' },
    { slug: 'islamabad',  city: 'Islamabad',  country: 'Pakistan' },
    { slug: 'lahore',     city: 'Lahore',     country: 'Pakistan' },
    { slug: 'budapest',   city: 'Budapest',   country: 'Hungary' },
    { slug: 'lisbon',     city: 'Lisbon',     country: 'Portugal' },
    { slug: 'rome',       city: 'Rome',       country: 'Italy' },
    { slug: 'marrakech',  city: 'Marrakech',  country: 'Morocco' },
  ];
  return (
    <section className="py-14 px-6 bg-gradient-to-br from-[#0a1628] via-[#0F1119] to-[#0a1628] text-white">
      <div className="max-w-[1100px] mx-auto">
        <div className="text-center mb-8">
          <span className="inline-block bg-[#FFD700]/15 text-[#FFD700] text-[.6rem] font-black uppercase tracking-[2.5px] px-3 py-1.5 rounded-full border border-[#FFD700]/30 mb-3">
            🔍 Scout Reports
          </span>
          <h2 className="font-[var(--font-playfair)] text-[2rem] md:text-[2.6rem] font-black leading-tight mb-3">
            Scout Your Next Destination
          </h2>
          <p className="font-[var(--font-dm-sans)] text-white/85 text-[.95rem] max-w-[620px] mx-auto">
            Deep neighbourhood intelligence for 19+ cities. Morning rituals, wellness ecosystems and private-stay picks, vetted by our scouts.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {highlights.map(h => (
            <a
              key={h.slug}
              href={`/destinations/${h.slug}`}
              className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#FFD700]/40 rounded-2xl p-4 transition-all"
            >
              <div className="text-[.58rem] font-black uppercase tracking-[2px] text-white/70 mb-1 group-hover:text-[#FFD700] transition-colors">
                {h.country}
              </div>
              <div className="font-poppins font-bold text-[1rem] text-white group-hover:text-[#FFD700] transition-colors">
                {h.city} →
              </div>
            </a>
          ))}
        </div>
        <div className="text-center">
          <a
            href="/destinations"
            className="inline-flex items-center gap-2 bg-[#FFD700] hover:bg-[#FFC700] text-[#0a1628] font-poppins font-black text-[.95rem] px-7 py-3.5 rounded-full transition-all shadow-[0_8px_30px_rgba(255,215,0,0.25)] hover:-translate-y-0.5"
          >
            Explore All Destinations →
          </a>
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
      <Header />

      <main>
      {/* ── HERO — server-rendered for instant LCP ──
          Solid navy background on mobile, gradient on desktop only.
          Mobile gradient was costing ~600ms LCP because the 600px-tall
          painted region had to interpolate three colour stops on every
          repaint. Solid #0a1628 paints in ~0ms.
          min-h dropped from 600/700 to 480/620 — content height is
          ~430px so we no longer reserve dead space below the wizard. */}
      <section className="relative pt-32 md:pt-40 pb-12 px-6 overflow-hidden bg-[#0a1628] md:bg-[linear-gradient(160deg,#0a1628_0%,#1a2744_50%,#0f1e36_100%)] min-h-[480px] md:min-h-[620px]">
        {/* Floating decorations — static geometric shapes only. md:block
            keeps them off mobile entirely (zero cost on the slow viewport). */}
        <div className="absolute top-32 right-[15%] w-48 h-48 rounded-2xl border border-white/5 bg-white/5 rotate-12 hidden md:block" aria-hidden="true" />
        <div className="absolute bottom-20 left-[8%] w-36 h-36 rounded-2xl border border-white/5 bg-white/5 -rotate-6 hidden md:block" aria-hidden="true" />

        <div className="max-w-[800px] mx-auto text-center relative z-[1]">
          <p className="font-[var(--font-dm-sans)] text-orange-300 text-[.72rem] font-bold uppercase tracking-[3px] mb-4">UK&apos;s Smartest Travel Comparison</p>
          <h1 className="font-[var(--font-playfair)] text-[2.6rem] md:text-[4.2rem] font-black text-white leading-[1.08] tracking-tight mb-5">
            Find Your Perfect Trip for{' '}
            <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">Less</span>
          </h1>
          <p className="font-[var(--font-dm-sans)] text-white/80 text-[1.05rem] mb-8 max-w-[550px] mx-auto">
            Compare flights, hotels, car hire and more from 15+ trusted providers. Real prices, in seconds.
          </p>

          {/* Stats bar */}
          <div className="flex flex-wrap justify-center gap-6 md:gap-10 mb-8" role="list" aria-label="Key statistics">
            {[
              { val: '15+', label: 'Providers' },
              { val: '2M+', label: 'Hotels' },
              { val: '90s', label: 'Avg. Checkout' },
              { val: '24/7', label: 'AI Assistant' },
            ].map(s => (
              <div key={s.label} className="text-center" role="listitem">
                <div className="font-poppins font-black text-[1.6rem] md:text-[2rem] text-white leading-none">{s.val}</div>
                <div className="font-[var(--font-dm-sans)] text-white/80 text-[.7rem] font-medium mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Search form — lazy-loaded to avoid blocking LCP */}
          <div id="hero-search">
            <LazyFlightSearch />
          </div>
        </div>
      </section>

      {/* ── TRUST STRIP — crushes scam-lookalike AI pattern matches ── */}
      <section className="bg-[#0a1628] text-white/95 border-y border-white/10">
        <div className="max-w-[1100px] mx-auto px-6 py-3 flex items-center justify-center gap-3 text-center">
          <span className="text-emerald-400 text-base" aria-hidden="true">🛡️</span>
          <p className="font-[var(--font-dm-sans)] text-[.78rem] md:text-[.85rem] font-semibold leading-snug">
            <span className="text-white font-bold">Prices locked at booking.</span>{' '}
            <span className="text-white/85">We never call or email you for extra payment. JETMEAWAY LTD · Company No. 17140522 · London, UK.</span>
          </p>
        </div>
      </section>

      {/* ── ROTATING TRUSTPILOT REVIEWS — turns "no markup" claim into proof ── */}
      <RotatingReviews />

      <LogoScroll />
      <LazyPopularDestinations />
      <ScoutDestinations />
      <WhatWeCompare />
      <HowItWorks />
      <LazyTestimonials />
      <CtaSection />
      </main>
      <Footer />
      {/* JSON-LD moved to end of body — crawlers parse it the same, but the
          ~3kB script no longer sits in the HTML stream above the LCP element. */}
      {jsonLd.map((ld, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      ))}
    </>
  );
}
