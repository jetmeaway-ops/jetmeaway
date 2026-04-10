'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  { num: '01', icon: 'fa-magnifying-glass', title: 'Search', desc: 'Enter your destination, dates, and preferences. We instantly scan 15+ trusted travel providers.' },
  { num: '02', icon: 'fa-chart-bar', title: 'Compare', desc: 'See real prices side-by-side from Expedia, Trip.com, Aviasales and more. No hidden fees.' },
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
   POPULAR DESTINATIONS — auto-scrolling carousel with drag/swipe
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, scrollLeft: 0 });

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf: number;
    const speed = 0.5; // px per frame
    const tick = () => {
      if (!paused && !dragging && el) {
        el.scrollLeft += speed;
        // Loop: when we've scrolled past the first set, jump back
        if (el.scrollLeft >= el.scrollWidth / 2) {
          el.scrollLeft = 0;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, dragging]);

  // Drag handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    setDragging(true);
    dragStart.current = { x: e.clientX, scrollLeft: scrollRef.current?.scrollLeft || 0 };
  }, []);
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !scrollRef.current) return;
    const dx = e.clientX - dragStart.current.x;
    scrollRef.current.scrollLeft = dragStart.current.scrollLeft - dx;
  }, [dragging]);
  const onMouseUp = useCallback(() => setDragging(false), []);

  // Touch handlers
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    setDragging(true);
    dragStart.current = { x: e.touches[0].clientX, scrollLeft: scrollRef.current?.scrollLeft || 0 };
  }, []);
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging || !scrollRef.current) return;
    const dx = e.touches[0].clientX - dragStart.current.x;
    scrollRef.current.scrollLeft = dragStart.current.scrollLeft - dx;
  }, [dragging]);
  const onTouchEnd = useCallback(() => setDragging(false), []);

  const cards = [...DESTINATIONS, ...DESTINATIONS]; // duplicate for infinite loop

  return (
    <section className="py-14 bg-white overflow-hidden">
      <div className="max-w-[1100px] mx-auto px-6 mb-10">
        <div className="flex items-center justify-center gap-2 mb-2">
          <p className="text-[.65rem] font-black uppercase tracking-[3px] text-orange-500 font-[var(--font-dm-sans)]">Trending Now</p>
          <span className="flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 text-[.58rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            Live prices
          </span>
        </div>
        <h2 className="text-center font-[var(--font-playfair)] text-[2rem] md:text-[2.6rem] font-black text-[#0a1628]">Popular Destinations</h2>
      </div>

      <div
        ref={scrollRef}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => { setPaused(false); setDragging(false); }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="flex gap-5 overflow-x-hidden px-6 select-none"
        style={{ cursor: dragging ? 'grabbing' : 'grab', scrollbarWidth: 'none' }}
      >
        {cards.map((d, i) => (
          <a key={`${d.name}-${i}`} href={`/hotels?city=${encodeURIComponent(d.name)}`}
            className="relative flex-shrink-0 w-[280px] md:w-[320px] rounded-2xl overflow-hidden group"
            style={{ height: '380px' }}
            onClick={(e) => { if (dragging) e.preventDefault(); }}
          >
            {/* Background image */}
            <img src={d.img} alt={d.name} loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />

            {/* Gradient overlay — darker on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent group-hover:from-black/90 group-hover:via-black/40 transition-all duration-500" />

            {/* Tag */}
            <span className="absolute top-3 left-3 bg-orange-500 text-white text-[.58rem] font-black uppercase tracking-wider px-2.5 py-1 rounded-full z-[2]">{d.tag}</span>

            {/* Floating price badge — glassmorphic, bobbing */}
            <div className="absolute top-3 right-3 z-[2] animate-bob">
              <div className="backdrop-blur-md bg-white/20 border border-white/30 rounded-xl px-3 py-1.5 shadow-lg">
                <p className="font-poppins font-black text-white text-[.72rem] leading-none">From &pound;{d.price}</p>
                <p className="font-[var(--font-dm-sans)] text-white/70 text-[.55rem] font-medium">/night</p>
              </div>
            </div>

            {/* Bottom info */}
            <div className="absolute bottom-0 left-0 right-0 p-5 z-[2]">
              <h3 className="font-[var(--font-playfair)] font-black text-white text-[1.5rem] leading-tight mb-0.5">{d.name}</h3>
              <p className="font-[var(--font-dm-sans)] text-white/60 text-[.75rem] font-medium mb-2">{d.country}</p>
              <p className="font-poppins font-bold text-orange-400 text-[.82rem] mb-3">Hotels from &pound;{d.price}/night</p>

              {/* Hover button */}
              <span className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-poppins font-bold text-[.78rem] px-5 py-2.5 rounded-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 shadow-[0_4px_20px_rgba(249,115,22,0.4)]">
                Search Hotels &rarr;
              </span>
            </div>
          </a>
        ))}
      </div>

      <style>{`
        @keyframes bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        .animate-bob { animation: bob 3s ease-in-out infinite; }
      `}</style>
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
              <img src="/jetmeaway-logo.png" alt="JetMeAway" className="w-8 h-8" style={{ borderRadius: 0 }} />
              <span className="font-poppins font-black text-white text-[1.1rem]">JetMeAway</span>
            </a>
            <p className="font-[var(--font-dm-sans)] text-white/50 text-[.78rem] leading-relaxed mb-3">
              UK&apos;s smart travel comparison engine. Real prices from 15+ providers, zero booking fees.
            </p>
            <a href="/contact" className="font-[var(--font-dm-sans)] text-orange-400 hover:text-orange-300 text-[.78rem] font-medium transition-colors">
              Contact Us &rarr;
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
              {['Expedia', 'Trip.com', 'Nuitee', 'Aviasales', 'Klook', 'Airalo'].map(p => (
                <li key={p}><span className="font-[var(--font-dm-sans)] text-white/40 text-[.82rem]">{p}</span></li>
              ))}
            </ul>
          </div>
        </div>

        {/* Financial Protection Notice */}
        <div className="border-t border-white/10 pt-6 mb-5 max-w-[900px]">
          <p className="font-poppins text-white/30 text-[.55rem] uppercase tracking-[2.5px] font-extrabold mb-2">Financial Protection Notice</p>
          <p className="font-[var(--font-dm-sans)] text-white/30 text-[.68rem] leading-relaxed mb-1.5">JETMEAWAY LTD acts as a technology platform and an agent for various travel providers.</p>
          <p className="font-[var(--font-dm-sans)] text-white/30 text-[.68rem] leading-relaxed mb-1.5"><span className="text-white/50">Hotels &amp; eSIMs:</span> Standalone accommodation and eSIM services are provided directly by JETMEAWAY LTD and are not subject to ATOL protection.</p>
          <p className="font-[var(--font-dm-sans)] text-white/30 text-[.68rem] leading-relaxed"><span className="text-white/50">Flights &amp; Packages:</span> Flight-inclusive packages shown on this website are fulfilled by our ATOL-protected partners, including Expedia (ATOL 5788) and Trip.com (ATOL 11572). JetMeAway Ltd does not create its own packages; we connect you to fully licensed and bonded ATOL holders. Your air travel and package holidays are financially protected under the ATOL scheme administered by the UK Civil Aviation Authority.</p>
        </div>

        {/* Bottom */}
        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="font-[var(--font-dm-sans)] text-white/30 text-[.72rem]">&copy; 2026 JETMEAWAY LTD (Company No: 17140522). All rights reserved.</p>
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
