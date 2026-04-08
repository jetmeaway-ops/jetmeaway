'use client';

import { useState, useEffect } from 'react';
import FlightSearch from './search';

/* ═══════════════════════════════════════════════════════════════════════════
   PROVIDER LOGOS — infinite horizontal scroll
   ═══════════════════════════════════════════════════════════════════════════ */

const PROVIDERS = ['Expedia', 'Trip.com', 'GetYourGuide', 'Viator', 'Klook', 'Airalo', 'Aviasales', 'Tiqets'];

function LogoScroll() {
  return (
    <section className="py-6 bg-white border-y border-[#e8ecf4] overflow-hidden">
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
   HOW IT WORKS
   ═══════════════════════════════════════════════════════════════════════════ */

const STEPS = [
  { num: '01', icon: 'fa-magnifying-glass', title: 'Search', desc: 'Enter your destination, dates, and preferences. We instantly scan 20+ trusted travel providers.' },
  { num: '02', icon: 'fa-chart-bar', title: 'Compare', desc: 'See real prices side-by-side from Expedia, Trip.com, Booking.com and more. No hidden fees.' },
  { num: '03', icon: 'fa-circle-check', title: 'Book', desc: 'Choose the best deal and book directly with the provider. We never charge booking fees.' },
];

function HowItWorks() {
  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-[1100px] mx-auto">
        <p className="text-center text-[.65rem] font-black uppercase tracking-[3px] text-orange-500 mb-2 font-[var(--font-dm-sans)]">Simple Process</p>
        <h2 className="text-center font-[var(--font-playfair)] text-[2rem] md:text-[2.6rem] font-black text-[#0a1628] mb-12">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((s) => (
            <div key={s.num} className="relative bg-[#F8FAFC] border border-[#E8ECF4] rounded-2xl p-8 text-center hover:shadow-lg hover:border-orange-200 transition-all group">
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[.7rem] font-black px-3 py-1 rounded-full font-[var(--font-dm-sans)]">{s.num}</span>
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <i className={`fa-solid ${s.icon} text-2xl text-orange-500`} />
              </div>
              <h3 className="font-[var(--font-playfair)] font-black text-[1.3rem] text-[#0a1628] mb-2">{s.title}</h3>
              <p className="font-[var(--font-dm-sans)] text-[.85rem] text-[#5C6378] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   WHAT WE COMPARE — 6 category cards
   ═══════════════════════════════════════════════════════════════════════════ */

const CATEGORIES = [
  { icon: 'fa-hotel', name: 'Hotels', desc: 'Compare 2M+ properties from top providers', href: '/hotels', live: true },
  { icon: 'fa-plane', name: 'Flights', desc: '250+ airports with real-time pricing', href: '/flights', live: false },
  { icon: 'fa-suitcase-rolling', name: 'Packages', desc: 'All-inclusive holiday bundles', href: '/packages', live: false },
  { icon: 'fa-car', name: 'Car Hire', desc: '7 providers, best rates guaranteed', href: '/cars', live: false },
  { icon: 'fa-sim-card', name: 'eSIM', desc: 'Data plans for 150+ countries', href: '/esim', live: false },
  { icon: 'fa-compass', name: 'Explore', desc: 'Tours, activities & experiences', href: '/explore', live: false },
];

function WhatWeCompare() {
  return (
    <section className="py-20 px-6 bg-[#F8FAFC]">
      <div className="max-w-[1100px] mx-auto">
        <p className="text-center text-[.65rem] font-black uppercase tracking-[3px] text-orange-500 mb-2 font-[var(--font-dm-sans)]">All In One Place</p>
        <h2 className="text-center font-[var(--font-playfair)] text-[2rem] md:text-[2.6rem] font-black text-[#0a1628] mb-12">What We Compare</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {CATEGORIES.map((c) => (
            <a key={c.name} href={c.href}
              className="relative bg-white border border-[#E8ECF4] rounded-2xl p-6 hover:shadow-lg hover:border-orange-200 transition-all group">
              {c.live && (
                <span className="absolute top-3 right-3 flex items-center gap-1 bg-green-50 border border-green-200 text-green-700 text-[.6rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  Live
                </span>
              )}
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0a1628] to-[#1a2744] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <i className={`fa-solid ${c.icon} text-white text-lg`} />
              </div>
              <h3 className="font-poppins font-black text-[1rem] text-[#0a1628] mb-1">{c.name}</h3>
              <p className="font-[var(--font-dm-sans)] text-[.78rem] text-[#5C6378]">{c.desc}</p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   POPULAR DESTINATIONS
   ═══════════════════════════════════════════════════════════════════════════ */

const DESTINATIONS = [
  { name: 'Dubai', country: 'UAE', img: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=640&h=480&fit=crop' },
  { name: 'Barcelona', country: 'Spain', img: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=640&h=480&fit=crop' },
  { name: 'Bali', country: 'Indonesia', img: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=640&h=480&fit=crop' },
  { name: 'Paris', country: 'France', img: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=640&h=480&fit=crop' },
  { name: 'Istanbul', country: 'Turkey', img: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=640&h=480&fit=crop' },
  { name: 'Maldives', country: 'Maldives', img: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=640&h=480&fit=crop' },
];

function PopularDestinations() {
  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-[1100px] mx-auto">
        <p className="text-center text-[.65rem] font-black uppercase tracking-[3px] text-orange-500 mb-2 font-[var(--font-dm-sans)]">Trending Now</p>
        <h2 className="text-center font-[var(--font-playfair)] text-[2rem] md:text-[2.6rem] font-black text-[#0a1628] mb-12">Popular Destinations</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {DESTINATIONS.map((d) => (
            <a key={d.name} href={`/hotels?city=${encodeURIComponent(d.name)}`}
              className="relative rounded-2xl overflow-hidden h-56 md:h-64 group">
              <img src={d.img} alt={d.name} loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <h3 className="font-[var(--font-playfair)] font-black text-white text-[1.3rem] leading-tight">{d.name}</h3>
                <p className="font-[var(--font-dm-sans)] text-white/70 text-[.78rem] font-medium">{d.country}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TESTIMONIALS — auto-rotating
   ═══════════════════════════════════════════════════════════════════════════ */

const TESTIMONIALS = [
  { quote: 'Saved over 200 on our family trip to Dubai. The price comparison made it so easy to find the best deal.', name: 'Sarah M.', location: 'Manchester' },
  { quote: 'I love that there are no booking fees. Found a 4-star hotel in Barcelona for half the price I expected.', name: 'James R.', location: 'London' },
  { quote: 'The AI assistant helped me plan our honeymoon to the Maldives. Everything was perfectly organised.', name: 'Emma T.', location: 'Bristol' },
];

function Testimonials() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive(i => (i + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="py-20 px-6 bg-[#0a1628]">
      <div className="max-w-[700px] mx-auto text-center">
        <p className="text-[.65rem] font-black uppercase tracking-[3px] text-orange-400 mb-2 font-[var(--font-dm-sans)]">Testimonials</p>
        <h2 className="font-[var(--font-playfair)] text-[2rem] md:text-[2.4rem] font-black text-white mb-10">What Travellers Say</h2>

        <div className="relative min-h-[160px]">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className={`absolute inset-0 transition-all duration-500 ${i === active ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
              <i className="fa-solid fa-quote-left text-orange-500/30 text-3xl mb-4 block" />
              <p className="font-[var(--font-dm-sans)] text-white/90 text-[1.05rem] leading-relaxed mb-6">&ldquo;{t.quote}&rdquo;</p>
              <p className="font-poppins font-bold text-white text-[.85rem]">{t.name}</p>
              <p className="font-[var(--font-dm-sans)] text-white/50 text-[.75rem]">{t.location}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-2 mt-6">
          {TESTIMONIALS.map((_, i) => (
            <button key={i} onClick={() => setActive(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${i === active ? 'bg-orange-500 w-6' : 'bg-white/20 hover:bg-white/40'}`} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CTA
   ═══════════════════════════════════════════════════════════════════════════ */

function CtaSection() {
  return (
    <section className="py-20 px-6 bg-gradient-to-br from-orange-50 to-amber-50">
      <div className="max-w-[700px] mx-auto text-center">
        <h2 className="font-[var(--font-playfair)] text-[2rem] md:text-[2.6rem] font-black text-[#0a1628] mb-4">
          Ready to Find Your <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">Best Deal?</span>
        </h2>
        <p className="font-[var(--font-dm-sans)] text-[1rem] text-[#5C6378] mb-8">Compare 20+ providers in seconds. No fees, no markups, just the best prices.</p>
        <a href="#hero-search"
          className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-poppins font-black text-[1rem] px-10 py-4 rounded-xl shadow-[0_4px_20px_rgba(249,115,22,0.3)] transition-all hover:-translate-y-0.5">
          Start Searching
        </a>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════════════════════════════════════ */

function HomepageFooter() {
  return (
    <footer className="bg-[#0a1628] border-t border-white/5 pt-16 pb-8 px-6">
      <div className="max-w-[1100px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <a href="/" className="flex items-center gap-2 mb-4">
              <img src="/jetmeaway-logo.png" alt="JetMeAway" className="w-8 h-8" />
              <span className="font-poppins font-black text-white text-[1.1rem]">JetMeAway</span>
            </a>
            <p className="font-[var(--font-dm-sans)] text-white/50 text-[.78rem] leading-relaxed">
              UK's smart travel comparison engine. Real prices from 20+ providers, zero booking fees.
            </p>
          </div>

          {/* Compare */}
          <div>
            <p className="font-poppins font-bold text-white/30 text-[.65rem] uppercase tracking-[2px] mb-4">Compare</p>
            <ul className="space-y-2.5">
              {[
                { label: 'Flights', href: '/flights' },
                { label: 'Hotels', href: '/hotels' },
                { label: 'Packages', href: '/packages' },
                { label: 'Car Hire', href: '/cars' },
                { label: 'eSIM', href: '/esim' },
                { label: 'Explore', href: '/explore' },
              ].map(l => (
                <li key={l.href}><a href={l.href} className="font-[var(--font-dm-sans)] text-white/60 hover:text-orange-400 text-[.82rem] transition-colors">{l.label}</a></li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <p className="font-poppins font-bold text-white/30 text-[.65rem] uppercase tracking-[2px] mb-4">Company</p>
            <ul className="space-y-2.5">
              {[
                { label: 'About', href: '/about' },
                { label: 'Contact', href: '/contact' },
                { label: 'Privacy Policy', href: '/privacy' },
                { label: 'Terms of Service', href: '/terms' },
              ].map(l => (
                <li key={l.href}><a href={l.href} className="font-[var(--font-dm-sans)] text-white/60 hover:text-orange-400 text-[.82rem] transition-colors">{l.label}</a></li>
              ))}
            </ul>
          </div>

          {/* Providers */}
          <div>
            <p className="font-poppins font-bold text-white/30 text-[.65rem] uppercase tracking-[2px] mb-4">Providers</p>
            <ul className="space-y-2.5">
              {['Expedia', 'Trip.com', 'Booking.com', 'Aviasales', 'Klook', 'Airalo'].map(p => (
                <li key={p}><span className="font-[var(--font-dm-sans)] text-white/40 text-[.82rem]">{p}</span></li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="font-[var(--font-dm-sans)] text-white/30 text-[.72rem]">&copy; {new Date().getFullYear()} JetMeAway. All rights reserved.</p>
          <p className="font-[var(--font-dm-sans)] text-white/20 text-[.68rem]">
            JetMeAway is a comparison engine. We earn affiliate commissions at no cost to you.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN HOMEPAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function HomepageClient() {
  return (
    <>
      {/* ── HERO ── */}
      <section className="relative pt-32 md:pt-40 pb-16 px-6 overflow-hidden" style={{ background: 'linear-gradient(160deg, #0a1628 0%, #1a2744 50%, #0f1e36 100%)' }}>
        {/* Floating glassmorphic decorations */}
        <div className="absolute top-20 left-[10%] w-64 h-64 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute bottom-10 right-[5%] w-80 h-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute top-32 right-[15%] w-48 h-48 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-sm rotate-12 hidden md:block" />
        <div className="absolute bottom-20 left-[8%] w-36 h-36 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-sm -rotate-6 hidden md:block" />

        <div className="max-w-[800px] mx-auto text-center relative z-[1]">
          <p className="font-[var(--font-dm-sans)] text-orange-400 text-[.72rem] font-bold uppercase tracking-[3px] mb-4">UK's Smartest Travel Comparison</p>
          <h1 className="font-[var(--font-playfair)] text-[2.6rem] md:text-[4.2rem] font-black text-white leading-[1.08] tracking-tight mb-5">
            Find Your Perfect Trip for{' '}
            <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">Less</span>
          </h1>
          <p className="font-[var(--font-dm-sans)] text-white/60 text-[1.05rem] mb-10 max-w-[550px] mx-auto">
            Compare flights, hotels, car hire and more from 20+ trusted providers. Zero fees, real prices.
          </p>

          {/* Stats bar */}
          <div className="flex flex-wrap justify-center gap-6 md:gap-10 mb-10">
            {[
              { val: '20+', label: 'Providers' },
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

          {/* Search form */}
          <div id="hero-search">
            <FlightSearch />
          </div>
        </div>
      </section>

      <LogoScroll />
      <HowItWorks />
      <WhatWeCompare />
      <PopularDestinations />
      <Testimonials />
      <CtaSection />
      <HomepageFooter />
    </>
  );
}
