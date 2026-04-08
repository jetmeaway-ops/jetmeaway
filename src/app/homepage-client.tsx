'use client';

import { useState, useEffect } from 'react';
import FlightSearch from './search';

/* ═══════════════════════════════════════════════════════════════════════════
   PROVIDER LOGOS — infinite horizontal scroll
   ═══════════════════════════════════════════════════════════════════════════ */

const PROVIDERS = ['Expedia', 'Trip.com', 'GetYourGuide', 'Viator', 'Klook', 'Airalo', 'Aviasales', 'Tiqets'];

function LogoScroll() {
  return (
    <section className="py-4 bg-[#F1F3F7] border-y border-[#e8ecf4] overflow-hidden">
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
  { num: '01', icon: 'fa-magnifying-glass', title: 'Search', desc: 'Enter your destination, dates, and preferences. We instantly scan 20+ trusted travel providers.' },
  { num: '02', icon: 'fa-chart-bar', title: 'Compare', desc: 'See real prices side-by-side from Expedia, Trip.com, Booking.com and more. No hidden fees.' },
  { num: '03', icon: 'fa-circle-check', title: 'Book', desc: 'Choose the best deal and book directly with the provider. We never charge booking fees.' },
];

function HowItWorks() {
  return (
    <section className="py-14 px-6 bg-white">
      <div className="max-w-[1100px] mx-auto">
        <p className="text-center text-[.65rem] font-black uppercase tracking-[3px] text-orange-500 mb-2 font-[var(--font-dm-sans)]">Simple Process</p>
        <h2 className="text-center font-[var(--font-playfair)] text-[2rem] md:text-[2.6rem] font-black text-[#0a1628] mb-10">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((s) => (
            <div key={s.num}
              className="relative bg-white border border-[#E8ECF4] rounded-2xl p-8 pt-10 text-center overflow-hidden transition-all duration-300 group hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] hover:border-t-[3px] hover:border-t-orange-500">
              {/* Watermark number */}
              <span className="absolute top-2 right-4 font-[var(--font-playfair)] font-black text-[5rem] leading-none text-[#F1F3F7] group-hover:text-orange-50 transition-colors select-none pointer-events-none">{s.num}</span>
              <div className="relative z-[1]">
                <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <i className={`fa-solid ${s.icon} text-2xl text-orange-500`} />
                </div>
                <h3 className="font-[var(--font-playfair)] font-black text-[1.3rem] text-[#0a1628] mb-2">{s.title}</h3>
                <p className="font-[var(--font-dm-sans)] text-[.85rem] text-[#5C6378] leading-relaxed">{s.desc}</p>
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
    <section className="py-14 px-6 bg-[#F8FAFC]">
      <div className="max-w-[1100px] mx-auto">
        <p className="text-center text-[.65rem] font-black uppercase tracking-[3px] text-orange-500 mb-2 font-[var(--font-dm-sans)]">All In One Place</p>
        <h2 className="text-center font-[var(--font-playfair)] text-[2rem] md:text-[2.6rem] font-black text-[#0a1628] mb-10">What We Compare</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {CATEGORIES.map((c) => (
            <a key={c.name} href={c.href}
              className={`relative bg-white border rounded-2xl p-6 transition-all duration-300 group hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] ${c.live ? 'border-orange-200 bg-gradient-to-br from-white to-orange-50/50' : 'border-[#E8ECF4] hover:border-orange-200'}`}>
              {c.live && (
                <span className="absolute top-3 right-3 flex items-center gap-1 bg-green-50 border border-green-200 text-green-700 text-[.6rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  Live
                </span>
              )}
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">{c.emoji}</div>
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
   POPULAR DESTINATIONS — taller cards, prices, dramatic overlays
   ═══════════════════════════════════════════════════════════════════════════ */

const DESTINATIONS = [
  { name: 'Dubai', country: 'UAE', price: 45, tag: 'Popular', img: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=640&h=860&fit=crop' },
  { name: 'Barcelona', country: 'Spain', price: 38, tag: 'Trending', img: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=640&h=860&fit=crop' },
  { name: 'Bali', country: 'Indonesia', price: 52, tag: 'Exotic', img: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=640&h=860&fit=crop' },
  { name: 'Paris', country: 'France', price: 35, tag: 'Classic', img: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=640&h=860&fit=crop' },
  { name: 'Istanbul', country: 'Turkey', price: 29, tag: 'Best Value', img: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=640&h=860&fit=crop' },
  { name: 'Maldives', country: 'Maldives', price: 89, tag: 'Luxury', img: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=640&h=860&fit=crop' },
];

function PopularDestinations() {
  return (
    <section className="py-14 px-6 bg-white">
      <div className="max-w-[1100px] mx-auto">
        <p className="text-center text-[.65rem] font-black uppercase tracking-[3px] text-orange-500 mb-2 font-[var(--font-dm-sans)]">Trending Now</p>
        <h2 className="text-center font-[var(--font-playfair)] text-[2rem] md:text-[2.6rem] font-black text-[#0a1628] mb-10">Popular Destinations</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {DESTINATIONS.map((d) => (
            <a key={d.name} href={`/hotels?city=${encodeURIComponent(d.name)}`}
              className="relative rounded-2xl overflow-hidden group" style={{ aspectRatio: '3/4' }}>
              <img src={d.img} alt={d.name} loading="lazy"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              {/* Tag */}
              <span className="absolute top-3 left-3 bg-orange-500 text-white text-[.6rem] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">{d.tag}</span>
              <div className="absolute bottom-4 left-4 right-4">
                <h3 className="font-[var(--font-playfair)] font-black text-white text-[1.4rem] md:text-[1.6rem] leading-tight">{d.name}</h3>
                <p className="font-[var(--font-dm-sans)] text-white/60 text-[.75rem] font-medium mb-1">{d.country}</p>
                <p className="font-poppins font-bold text-orange-400 text-[.82rem]">Hotels from &pound;{d.price}/night</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TESTIMONIALS — premium, Playfair italic quotes, star ratings
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
    <section className="py-16 px-6 bg-[#0a1628]">
      <div className="max-w-[750px] mx-auto text-center">
        <p className="text-[.65rem] font-black uppercase tracking-[3px] text-orange-400 mb-2 font-[var(--font-dm-sans)]">Testimonials</p>
        <h2 className="font-[var(--font-playfair)] text-[2rem] md:text-[2.4rem] font-black text-white mb-10">What Travellers Say</h2>

        <div className="relative min-h-[200px]">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className={`absolute inset-0 transition-all duration-500 ${i === active ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
              {/* Stars */}
              <div className="flex justify-center gap-1 mb-5">
                {[1,2,3,4,5].map(s => (
                  <i key={s} className="fa-solid fa-star text-orange-400 text-[.9rem]" />
                ))}
              </div>
              <p className="font-[var(--font-playfair)] italic text-white/90 text-[1.25rem] md:text-[1.4rem] leading-relaxed mb-6">&ldquo;{t.quote}&rdquo;</p>
              <p className="font-poppins font-bold text-white text-[.9rem]">{t.name}</p>
              <p className="font-[var(--font-dm-sans)] text-white/50 text-[.78rem]">{t.location}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-3 mt-6">
          {TESTIMONIALS.map((_, i) => (
            <button key={i} onClick={() => setActive(i)}
              className={`rounded-full transition-all duration-300 ${i === active ? 'bg-orange-500 w-8 h-3' : 'bg-white/25 hover:bg-white/50 w-3 h-3'}`} />
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
        <p className="font-[var(--font-dm-sans)] text-[.95rem] text-[#5C6378] mb-8">Join thousands of UK travellers saving money across 20+ providers</p>
        <a href="/hotels"
          className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-poppins font-black text-[1rem] px-10 py-4 rounded-xl shadow-[0_8px_30px_rgba(249,115,22,0.35)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(249,115,22,0.4)]">
          Compare Hotel Prices Now
        </a>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   FOOTER — comprehensive, 4 columns, email
   ═══════════════════════════════════════════════════════════════════════════ */

function HomepageFooter() {
  return (
    <footer className="bg-[#0a1628] border-t border-white/5 pt-14 pb-8 px-6">
      <div className="max-w-[1100px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <a href="/" className="flex items-center gap-2 mb-4">
              <img src="/jetmeaway-logo.png" alt="JetMeAway" className="w-8 h-8" style={{ mixBlendMode: 'lighten', borderRadius: 0 }} />
              <span className="font-poppins font-black text-white text-[1.1rem]">JetMeAway</span>
            </a>
            <p className="font-[var(--font-dm-sans)] text-white/50 text-[.78rem] leading-relaxed mb-3">
              UK&apos;s smart travel comparison engine. Real prices from 20+ providers, zero booking fees.
            </p>
            <a href="mailto:waqar@jetmeaway.co.uk" className="font-[var(--font-dm-sans)] text-orange-400 hover:text-orange-300 text-[.78rem] font-medium transition-colors">
              waqar@jetmeaway.co.uk
            </a>
          </div>

          {/* Compare */}
          <div>
            <p className="font-poppins font-bold text-white/30 text-[.65rem] uppercase tracking-[2px] mb-4">Compare</p>
            <ul className="space-y-2.5">
              {[
                { label: 'Hotels', href: '/hotels' },
                { label: 'Flights', href: '/flights' },
                { label: 'Packages', href: '/packages' },
                { label: 'Car Hire', href: '/cars' },
                { label: 'eSIM', href: '/esim' },
                { label: 'Activities', href: '/explore' },
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
          <p className="font-[var(--font-dm-sans)] text-white/30 text-[.72rem]">&copy; 2026 Jetmeaway. All rights reserved.</p>
          <p className="font-[var(--font-dm-sans)] text-white/20 text-[.68rem]">
            Made with <span className="text-red-400">&hearts;</span> in the UK
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
      <section className="relative pt-32 md:pt-40 pb-12 px-6 overflow-hidden" style={{ background: 'linear-gradient(160deg, #0a1628 0%, #1a2744 50%, #0f1e36 100%)' }}>
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
            Compare flights, hotels, car hire and more from 20+ trusted providers. Zero fees, real prices.
          </p>

          {/* Stats bar */}
          <div className="flex flex-wrap justify-center gap-6 md:gap-10 mb-8">
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
