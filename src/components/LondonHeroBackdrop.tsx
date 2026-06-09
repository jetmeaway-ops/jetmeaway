'use client';

import { useEffect, useState } from 'react';

/**
 * LondonHeroBackdrop — rotating London photo behind the homepage hero.
 *
 * Replaces the old Three.js globe. On every visit it picks a RANDOM image
 * from a small pool of verified, lively, daytime London shots, so returning
 * visitors see a fresh view of the city each time.
 *
 * Performance: like the globe loader it replaced, this is client-only and
 * paints AFTER hydration. The hero's solid navy background (set on the
 * <section> in page.tsx) is the instant LCP surface; the photo preloads and
 * fades in on top, so the homepage's mobile Perf-90 / LCP budget is untouched.
 * Removing Three.js also drops ~250KB gzip off the desktop bundle entirely.
 *
 * Every photo ID below was visually confirmed to (a) load from the Unsplash
 * CDN and (b) be a bright daytime London scene before being added.
 */

// Verified daytime London Unsplash photo IDs (bright, iconic, lively).
const LONDON_POOL: readonly string[] = [
  'photo-1488747279002-c8523379faaa', // red double-deckers + Big Ben, blue sky
  'photo-1611078214787-8095d414314e', // London Eye + Thames reflection, blue sky
  'photo-1513635269975-59663e0ac1ad', // aerial Tower Bridge + Thames + skyline
  'photo-1561196995-60deda157766',    // Tower Bridge framed by autumn leaves
];

function buildUrl(id: string): string {
  // webp + width cap keeps it light; the hero is ~620px tall so 1920 covers
  // retina desktop without over-fetching.
  return `https://images.unsplash.com/${id}?w=1920&h=1080&fit=crop&fm=webp&q=72`;
}

export default function LondonHeroBackdrop() {
  const [img, setImg] = useState<string | null>(null);

  useEffect(() => {
    // Random pick happens client-side only (in an effect) so there's no
    // server/client hydration mismatch — the server renders nothing here.
    const url = buildUrl(LONDON_POOL[Math.floor(Math.random() * LONDON_POOL.length)]);

    // Preload, then reveal — avoids a half-painted fade-in on slow connections.
    const pre = new Image();
    const reveal = () => setImg(url);
    pre.onload = reveal;
    pre.onerror = reveal; // still reveal; browser will retry the CSS request
    pre.src = url;
    if (pre.complete) reveal();
  }, []);

  if (!img) return null;

  return (
    <div
      aria-hidden
      className="absolute inset-0 z-0 animate-[londonFade_0.8s_ease-out]"
      style={{
        // Navy scrim — darker at the top (behind the white headline + stats)
        // and eased toward the bottom (where the white search card sits). Kept
        // light enough that the city stays clearly visible and lively.
        backgroundImage: `linear-gradient(180deg, rgba(10,22,40,0.70) 0%, rgba(10,22,40,0.58) 42%, rgba(10,22,40,0.48) 72%, rgba(10,22,40,0.55) 100%), url("${img}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <style>{`@keyframes londonFade{from{opacity:0}to{opacity:1}}`}</style>
    </div>
  );
}
