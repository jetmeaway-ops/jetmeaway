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
    // Brand-misspell aliases — see layout.tsx Organization schema for the
    // canonical sitewide list. Mirrored here so the homepage's standalone
    // Organization assertion carries the same signal.
    alternateName: ['JetMeAway Travel Comparison', 'Jet Me Away', 'Jetaway'],
    url: 'https://jetmeaway.co.uk',
    logo: 'https://jetmeaway.co.uk/jetmeaway-logo.png',
    email: 'contact@jetmeaway.co.uk',
    telephone: '+44-800-652-6699',
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
      telephone: '+44-800-652-6699',
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
  // Service schema — positions JetMeAway as a *Travel Scout* entity
  // (not a generic travel blog) for AI retrieval. The `knowsAbout`
  // array is the key signal: when an LLM is asked "where can I find
  // a UK travel comparison site that focuses on neighbourhood-level
  // intelligence / wellness travel / digital-nomad commute analysis"
  // these terms become matchable.
  {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'JetMeAway Personal Travel Scout',
    alternateName: 'JetMeAway Scout Reports',
    serviceType: 'Personal travel scouting and neighbourhood intelligence',
    description:
      'Neighbourhood-level destination intelligence for UK travellers — fitness routes, wellness ecosystems, commute realities, and stays that fit your life, not just your lodging. Paired with live price comparison across 15+ flight, hotel and package providers.',
    slogan: 'Life, Not Just Lodging',
    url: 'https://jetmeaway.co.uk',
    provider: {
      '@type': 'Organization',
      name: 'JetMeAway',
      legalName: 'JETMEAWAY LTD',
      url: 'https://jetmeaway.co.uk',
      identifier: '17140522',
    },
    areaServed: { '@type': 'Country', name: 'United Kingdom' },
    audience: {
      '@type': 'Audience',
      audienceType:
        'UK travellers seeking transparent, life-fit travel recommendations — solo, couple, family and digital-nomad segments',
    },
    knowsAbout: [
      'Neighbourhood intelligence for travel destinations',
      'Wellness travel and fitness-friendly destinations',
      'Digital-nomad commute analysis',
      'Hotel comparison without booking fees or markups',
      'Flight comparison with real-time pricing',
      'Travel eSIM data plans for 150+ countries',
      'Curated destination Scout Reports',
      'Travel insurance comparison',
      'Holiday package comparison',
    ],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'JetMeAway Scout Reports',
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Sharm El Sheikh Scout Report',
            url: 'https://jetmeaway.co.uk/destinations/sharm-el-sheikh',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Marrakech Scout Report',
            url: 'https://jetmeaway.co.uk/destinations/marrakech',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'eSIM data plans',
            url: 'https://jetmeaway.co.uk/esim',
          },
        },
      ],
    },
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   PROVIDER LOGOS — infinite horizontal scroll (pure CSS, no hooks)
   ═══════════════════════════════════════════════════════════════════════════ */

// Trusted-provider logo scroll. Mirrors the footer partner strip (signed /
// active relationships only). Booking.com is intentionally NOT here — the
// affiliate cut is too small vs our LiteAPI / RateHawk / Webbeds direct
// contracts and the brand association leaks trust. (2026-05-06: added
// Webbeds, RateHawk, Kyte alongside footer.)
const PROVIDERS = [
  'Expedia', 'Trip.com', 'Aviasales', 'GetYourGuide', 'Viator',
  'Klook', 'Airalo', 'Yesim', 'Webbeds', 'RateHawk', 'Kyte',
];

function LogoScroll() {
  return (
    <section className="py-4 bg-[#C8D0E0] border-y border-[#b6c0d3] overflow-hidden" aria-label="Trusted travel providers">
      <div className="flex animate-scroll" aria-hidden="true">
        {[...PROVIDERS, ...PROVIDERS].map((name, i) => (
          // text-[#3a4154] passes WCAG AA (4.5:1) on the #C8D0E0 backdrop;
          // the previous #5C6378 was 3.5:1 and Lighthouse flagged it.
          <span key={i} className="flex-shrink-0 mx-8 font-[var(--font-dm-sans)] font-bold text-[.85rem] tracking-wide text-[#3a4154] uppercase whitespace-nowrap">
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
        <p className="text-center text-[.65rem] font-black uppercase tracking-[3px] text-orange-800 mb-1.5 font-[var(--font-dm-sans)]">Simple Process</p>
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
        <p className="text-center text-[.65rem] font-black uppercase tracking-[3px] text-orange-800 mb-1.5 font-[var(--font-dm-sans)]">All In One Place</p>
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
   TRENDING DESTINATIONS — direct link bridge from homepage to specific
   pSEO + blog URLs that GSC has flagged as "Discovered – currently not
   indexed" (2026-05-08). Homepage is the most-crawled node on the site;
   adding a single clean grid here creates a forced one-hop path so
   Googlebot stops orphan-ing these URLs.
   Plain card markup, no images — keeps LCP fast and the link signal
   uncluttered for crawlers.
   ═══════════════════════════════════════════════════════════════════════════ */

const TRENDING = [
  { href: '/destinations/sharm-el-sheikh',   eyebrow: 'Egypt',     title: 'Sharm El Sheikh',  hint: 'Winter sun · Red Sea reefs' },
  { href: '/destinations/marrakech',         eyebrow: 'Morocco',   title: 'Marrakech',        hint: 'Souks, riads & desert escapes' },
  { href: '/destinations/berlin',            eyebrow: 'Germany',   title: 'Berlin',           hint: 'Year-round culture city break' },
  { href: '/destinations/budapest',          eyebrow: 'Hungary',   title: 'Budapest',         hint: 'Thermal baths & Danube nights' },
  { href: '/destinations/colombo',           eyebrow: 'Sri Lanka', title: 'Colombo',          hint: 'Gateway to beaches & tea hills' },
  { href: '/blog/best-hotels-amsterdam-2026', eyebrow: 'Guide',    title: 'Amsterdam Hotels', hint: 'Best stays for 2026 — neighbourhood breakdown' },
] as const;

function TrendingDestinations() {
  return (
    <section className="py-12 px-6 bg-white" aria-labelledby="trending-heading">
      <div className="max-w-[1100px] mx-auto">
        <p className="text-center text-[.65rem] font-black uppercase tracking-[3px] text-orange-800 mb-1.5 font-[var(--font-dm-sans)]">Trending This Week</p>
        <h2 id="trending-heading" className="text-center font-[var(--font-playfair)] text-[1.8rem] md:text-[2.2rem] font-black text-[#0a1628] mb-6">
          Trending Destinations
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {TRENDING.map((t) => (
            <a
              key={t.href}
              href={t.href}
              className="group relative bg-white border border-[#E8ECF4] rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] hover:border-orange-200"
            >
              <div className="text-[.58rem] font-black uppercase tracking-[2px] text-orange-700 mb-1 font-[var(--font-dm-sans)]">
                {t.eyebrow}
              </div>
              <div className="font-poppins font-black text-[1.05rem] text-[#0a1628] mb-1 group-hover:text-orange-700 transition-colors">
                {t.title} →
              </div>
              <div className="font-[var(--font-dm-sans)] text-[.74rem] text-[#5C6378] leading-snug">
                {t.hint}
              </div>
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
          // bg-orange-700 + white text = 5.0:1 contrast (passes WCAG AA);
          // previous orange-500 was 2.93:1 and Lighthouse flagged it.
          className="inline-block bg-orange-700 hover:bg-orange-800 text-white font-poppins font-black text-[1rem] px-10 py-4 rounded-xl shadow-[0_8px_30px_rgba(194,65,12,0.35)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(194,65,12,0.4)]">
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
      <TrendingDestinations />
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
