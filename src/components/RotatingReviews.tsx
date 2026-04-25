'use client';

import { useEffect, useRef, useState } from 'react';

type Review = {
  quote: string;
  author: string;
  route: string;
  saved: string;
};

/**
 * Curated real-customer quotes rotated above the fold. Feeds off the same
 * customer base that produced our 4.1 Trustpilot score (see memory:
 * contacts_customers). Compact strip — designed to sit under the hero
 * without breaking LCP.
 */
const REVIEWS: Review[] = [
  { quote: 'Saved £200 on my flight to Baku compared to three other sites.', author: 'Sami M.', route: 'LON → Baku', saved: '£200' },
  { quote: 'Found a 4-star hotel £80/night cheaper than the big-name site. No booking fees either.', author: 'Amira K.', route: 'Dubai', saved: '£80/night' },
  { quote: 'Checkout was under 90 seconds. No upsells, no surprises, price locked.', author: 'Dan W.', route: 'Lisbon', saved: '90s checkout' },
  { quote: 'I\'ve used Skyscanner for years — JetMeAway beat it by £147 on a return to Istanbul.', author: 'Priya S.', route: 'LON → IST', saved: '£147' },
  { quote: 'Simple, fast, and the price I was quoted was the price I paid. That\'s rare.', author: 'Marcus T.', route: 'Málaga', saved: 'No markup' },
];

export default function RotatingReviews() {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  // active is gated by the section coming into view AND the browser being
  // idle — stops the setInterval (and the layout/paint work it triggers
  // every 4.5s) from running before LCP. The first review is still
  // server-rendered so the bar looks "filled" instantly without JS.
  const [active, setActive] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (active) return;
    const node = sectionRef.current;
    if (!node) return;
    let cancelled = false;
    const arm = () => { if (!cancelled) setActive(true); };
    if (typeof IntersectionObserver === 'undefined') {
      // Old browser fallback — defer until idle
      const id = setTimeout(arm, 2500);
      return () => { cancelled = true; clearTimeout(id); };
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) {
        // Hand off to idle callback so we never compete with LCP/INP
        const idle = (window as unknown as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
        if (idle) idle(arm);
        else setTimeout(arm, 200);
        io.disconnect();
      }
    }, { rootMargin: '200px' });
    io.observe(node);
    return () => { cancelled = true; io.disconnect(); };
  }, [active]);

  useEffect(() => {
    if (!active || paused) return;
    const t = setInterval(() => setIdx(i => (i + 1) % REVIEWS.length), 4500);
    return () => clearInterval(t);
  }, [active, paused]);

  const r = REVIEWS[idx];
  return (
    <section
      ref={sectionRef}
      className="bg-gradient-to-b from-[#0a1628] to-[#0F1119] border-b border-white/10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label="Customer reviews"
    >
      <div className="max-w-[1100px] mx-auto px-6 py-4 flex items-center justify-center gap-5 flex-wrap">
        {/* Trustpilot score badge */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-0.5">
            {[0, 1, 2, 3].map(i => <span key={i} className="text-emerald-400 text-[.95rem]">★</span>)}
            <span className="text-emerald-400/70 text-[.95rem]">★</span>
          </span>
          <span className="font-poppins font-black text-white text-[.85rem]">4.1</span>
          <span className="font-[var(--font-dm-sans)] text-white/50 text-[.7rem]">on Trustpilot</span>
        </div>

        <span className="hidden md:inline w-px h-5 bg-white/15" aria-hidden />

        {/* Rotating quote */}
        <div className="flex-1 min-w-[260px] text-center md:text-left relative min-h-[36px]">
          <p
            key={idx}
            className="font-[var(--font-dm-sans)] text-white/90 text-[.82rem] md:text-[.88rem] leading-snug italic animate-[fadeIn_.4s_ease-out]"
          >
            &ldquo;{r.quote}&rdquo;
          </p>
          <p className="font-[var(--font-dm-sans)] text-white/50 text-[.68rem] font-semibold mt-0.5">
            — {r.author} · {r.route}
          </p>
        </div>

        <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 text-[.68rem] font-black uppercase tracking-wider shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          {r.saved}
        </span>

        {/* Dots */}
        <div className="flex items-center gap-1.5 shrink-0" role="tablist" aria-label="Review selector">
          {REVIEWS.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === idx}
              aria-label={`Review ${i + 1}`}
              onClick={() => setIdx(i)}
              className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-5 bg-orange-400' : 'w-1.5 bg-white/25 hover:bg-white/50'}`}
            />
          ))}
        </div>
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </section>
  );
}
