'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';

// Unsplash URLs without size params — next/image generates the responsive
// AVIF/WebP set via its CDN proxy. PageSpeed flagged "Improve image delivery
// 357 KiB" because the previous static 500×665 WebP was over-serving on
// mobile (cards render 280×380 / 320×380). next/image respects the `sizes`
// attribute below to ship the right width per breakpoint.
const DESTINATIONS = [
  { name: 'Dubai', country: 'UAE', price: 45, tag: 'Popular', img: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c' },
  { name: 'Barcelona', country: 'Spain', price: 38, tag: 'Trending', img: 'https://images.unsplash.com/photo-1583422409516-2895a77efded' },
  { name: 'Bali', country: 'Indonesia', price: 52, tag: 'Exotic', img: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4' },
  { name: 'Paris', country: 'France', price: 35, tag: 'Classic', img: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34' },
  { name: 'Istanbul', country: 'Turkey', price: 29, tag: 'Best Value', img: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200' },
  { name: 'Maldives', country: 'Maldives', price: 89, tag: 'Luxury', img: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8' },
];

export default function PopularDestinations() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, scrollLeft: 0 });
  // Sub-pixel accumulator. WebKit (iOS WebView, Safari) rounds Element.scrollLeft
  // to whole pixels on every set, so `scrollLeft += 0.5` floors to 0 each tick
  // and the carousel never drifts. We accumulate fractional pixels here at full
  // precision and only commit Math.floor() to scrollLeft. Desktop Chrome keeps
  // fractional scrollLeft natively, so this is harmless there too.
  const scrollPos = useRef(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf: number;
    const speed = 0.5;
    // Resync accumulator to actual scroll position when the loop (re)starts,
    // so user drags don't get reverted on the next auto-tick.
    scrollPos.current = el.scrollLeft;
    const tick = () => {
      if (!paused && !dragging && el) {
        scrollPos.current += speed;
        if (scrollPos.current >= el.scrollWidth / 2) {
          scrollPos.current = 0;
        }
        el.scrollLeft = Math.floor(scrollPos.current);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, dragging]);

  // Vertical mouse-wheel over the carousel must scroll the PAGE. The strip
  // is a scroll container (overflow-x: auto makes overflow-y compute to
  // auto too), so wheel events latched onto it and went nowhere — users'
  // scroll "stuck" on this section (2026-07-02 audit). Native non-passive
  // listener because React's synthetic wheel can't preventDefault here.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        window.scrollBy({ top: e.deltaY, left: 0 });
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Mouse handlers — desktop drag-to-scroll. Kept because mouse events don't
  // fire on touch devices, so this is mouse-only by design.
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

  // Touch handlers — only pause the auto-scroll. Native iOS scroll (enabled by
  // overflow-x-auto + touch-action: pan-x below) does the actual panning with
  // momentum. The old JS drag handler fought iOS native scroll and felt sticky
  // in the WebView; letting native do it is much smoother.
  const onTouchStart = useCallback(() => setPaused(true), []);
  const onTouchEnd = useCallback(() => setPaused(false), []);

  const cards = [...DESTINATIONS, ...DESTINATIONS];

  return (
    <section className="py-14 bg-[#C8D0E0] overflow-hidden">
      <div className="max-w-[1100px] mx-auto px-6 mb-10">
        <div className="flex items-center justify-center gap-2 mb-2">
          <p className="text-[.65rem] font-black uppercase tracking-[3px] text-orange-800 font-[var(--font-dm-sans)]">Trending Now</p>
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
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        // overflow-y-hidden removed 2026-07-02 — pairing it with
        // overflow-x-auto made the strip a y-axis scroll container too, so
        // a vertical mouse-wheel over the cards latched onto the carousel
        // (which has nothing to scroll vertically) instead of chaining up
        // to the page. Users' scroll "stuck" on this section. Cards are
        // fixed-height so nothing overflows y; visually identical.
        className="flex gap-5 overflow-x-auto px-6 select-none popular-dest-scroller"
        style={{
          cursor: dragging ? 'grabbing' : 'grab',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          touchAction: 'pan-x',
          // Note: -webkit-overflow-scrolling: touch is intentionally NOT set.
          // It creates an iOS scroll layer that rounds scrollLeft to whole
          // pixels, which kills the auto-scroll loop's 0.5px-per-frame
          // increment (rounds to 0 → no movement). Modern iOS (13+) gives
          // momentum natively with plain overflow-x: auto.
          overscrollBehaviorX: 'contain',
        }}
      >
        {cards.map((d, i) => (
          <a key={`${d.name}-${i}`} href={`/hotels?city=${encodeURIComponent(d.name)}`}
            className="relative flex-shrink-0 w-[280px] md:w-[320px] rounded-2xl overflow-hidden group"
            style={{ height: '380px' }}
            onClick={(e) => { if (dragging) e.preventDefault(); }}
          >
            <Image
              src={d.img}
              alt={`${d.name}, ${d.country}`}
              fill
              loading="lazy"
              sizes="(max-width: 768px) 280px, 320px"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent group-hover:from-black/90 group-hover:via-black/40 transition-all duration-500" />
            {/* tag badge — orange-700 on white passes WCAG AA (5.0:1);
                orange-500 background was 2.93:1 and Lighthouse flagged it. */}
            <span className="absolute top-3 left-3 bg-orange-700 text-white text-[.58rem] font-black uppercase tracking-wider px-2.5 py-1 rounded-full z-[2]">{d.tag}</span>
            <div className="absolute top-3 right-3 z-[2] animate-bob">
              <div className="backdrop-blur-md bg-white/20 border border-white/30 rounded-xl px-3 py-1.5 shadow-lg">
                <p className="font-poppins font-black text-white text-[.72rem] leading-none">From &pound;{d.price}</p>
                <p className="font-[var(--font-dm-sans)] text-white/70 text-[.55rem] font-medium">/night</p>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-5 z-[2]">
              <h3 className="font-[var(--font-playfair)] font-black text-white text-[1.5rem] leading-tight mb-0.5">{d.name}</h3>
              <p className="font-[var(--font-dm-sans)] text-white/60 text-[.75rem] font-medium mb-2">{d.country}</p>
              <p className="font-poppins font-bold text-orange-400 text-[.82rem] mb-3">Hotels from &pound;{d.price}/night</p>
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
        .popular-dest-scroller::-webkit-scrollbar { display: none; }
      `}</style>
    </section>
  );
}
