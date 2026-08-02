'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';

// Unsplash URLs without size params — next/image generates the responsive
// AVIF/WebP set via its CDN proxy.
const DESTINATIONS = [
  { name: 'Dubai', country: 'UAE', price: 45, tag: 'Popular', img: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c' },
  { name: 'Barcelona', country: 'Spain', price: 38, tag: 'Trending', img: 'https://images.unsplash.com/photo-1583422409516-2895a77efded' },
  { name: 'Bali', country: 'Indonesia', price: 52, tag: 'Exotic', img: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4' },
  { name: 'Paris', country: 'France', price: 35, tag: 'Classic', img: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34' },
  { name: 'Istanbul', country: 'Turkey', price: 29, tag: 'Best Value', img: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200' },
  { name: 'Maldives', country: 'Maldives', price: 89, tag: 'Luxury', img: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8' },
];

export default function PopularDestinations() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const pos = useRef(0);   // current translateX magnitude (px), applied as translateX(-pos)
  const half = useRef(0);  // width of one DESTINATIONS set (px) — the loop point

  // Auto-scroll via CSS TRANSFORM (not scrollLeft). This is the whole fix:
  // the strip is NO LONGER a scroll container, so it can't swallow the page's
  // vertical scroll — a vertical swipe / wheel / drag over the cards scrolls the
  // PAGE natively (with momentum). The old scrollLeft version used overflow-x:
  // auto, which forces overflow-y to auto too, making the strip an x- AND y-axis
  // scroll container that trapped vertical gestures — "you can't scroll the page
  // when your finger starts on a card", worst on mobile/app. (2026-08-02)
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const measure = () => { half.current = track.scrollWidth / 2; };
    measure();
    window.addEventListener('resize', measure);
    let raf = 0;
    const speed = 0.5; // px per frame
    const tick = () => {
      if (!paused && half.current) {
        pos.current += speed;
        // Seamless loop: the second half of `cards` is an exact copy of the
        // first, so subtracting one set's width is invisible.
        if (pos.current >= half.current) pos.current -= half.current;
        track.style.transform = `translateX(${-pos.current}px)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', measure); };
  }, [paused]);

  const pause = useCallback(() => setPaused(true), []);
  const resume = useCallback(() => setPaused(false), []);

  const cards = [...DESTINATIONS, ...DESTINATIONS];

  return (
    <section className="py-14 bg-[#C8D0E0]">
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

      {/* overflow-x: CLIP clips the marquee WITHOUT creating a scroll container
          (unlike auto/hidden), so vertical page scroll passes straight through. */}
      <div className="overflow-x-clip">
        <div
          ref={trackRef}
          onPointerEnter={pause}
          onPointerLeave={resume}
          onPointerDown={pause}
          onPointerUp={resume}
          onPointerCancel={resume}
          className="flex gap-5 px-6 select-none"
          // touch-action: pan-y keeps a vertical swipe as native page scroll and
          // disables pinch-zoom on the cards. The strip isn't a scroll container,
          // so there is nothing to trap it.
          style={{ touchAction: 'pan-y', willChange: 'transform' }}
        >
          {cards.map((d, i) => (
            <a
              key={`${d.name}-${i}`}
              href={`/hotels?city=${encodeURIComponent(d.name)}`}
              className="relative flex-shrink-0 w-[280px] md:w-[320px] rounded-2xl overflow-hidden group"
              style={{ height: '380px' }}
              draggable={false}
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
              <span className="absolute top-3 left-3 bg-orange-700 text-white text-[.58rem] font-black uppercase tracking-wider px-2.5 py-1 rounded-full z-[2]">{d.tag}</span>
              <div className="absolute top-3 right-3 z-[2] animate-bob">
                <div className="backdrop-blur-md bg-black/45 border border-white/25 rounded-xl px-3 py-1.5 shadow-lg">
                  <p className="font-poppins font-black text-white text-[.72rem] leading-none">From &pound;{d.price}</p>
                  <p className="font-[var(--font-dm-sans)] text-white/80 text-[.55rem] font-medium">/night</p>
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
      </div>

      <style>{`
        @keyframes bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        .animate-bob { animation: bob 3s ease-in-out infinite; }
      `}</style>
    </section>
  );
}
