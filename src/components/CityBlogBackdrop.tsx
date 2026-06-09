'use client';

import { useEffect, useState } from 'react';
import { fetchCityImages } from '@/lib/cityHero';

/**
 * CityBlogBackdrop — a slow cross-fading slideshow of the blog post's CITY
 * photos, fixed behind the article. The article itself is a frosted-white
 * sheet (bg-white/… + backdrop-blur in page.tsx), so the city imagery glows
 * softly through it while the long-form text stays fully readable.
 *
 * Images come from src/lib/cityHero.ts fetchCityImages(): the post's own hero
 * (seed) + the curated/Wikipedia city photo + a few scenic shots off the
 * city's Wikipedia media-list. Every URL is preloaded; any that fail to load
 * are dropped so a broken CDN image never shows. Client-only, loads after
 * hydration → no impact on article initial paint.
 */
export default function CityBlogBackdrop({
  city,
  seed,
}: {
  city: string;
  seed?: string | null;
}) {
  const [pics, setPics] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!city) {
      setPics([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const urls = await fetchCityImages(city, seed, 5);
      if (cancelled || urls.length === 0) return;
      // Preload all; keep only those that actually load.
      const results = await Promise.all(
        urls.map(
          (u) =>
            new Promise<string | null>((resolve) => {
              const im = new Image();
              im.onload = () => resolve(u);
              im.onerror = () => resolve(null);
              im.src = u;
            }),
        ),
      );
      if (cancelled) return;
      setPics(results.filter((u): u is string => !!u));
    })();
    return () => {
      cancelled = true;
    };
  }, [city, seed]);

  useEffect(() => {
    if (pics.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % pics.length), 6000);
    return () => clearInterval(t);
  }, [pics.length]);

  if (pics.length === 0) return null;

  return (
    <div
      aria-hidden
      className="fixed inset-0 pointer-events-none animate-[cityFade_0.9s_ease-out]"
      style={{ zIndex: -1 }}
    >
      {pics.map((src, i) => (
        <div
          key={src}
          className="absolute inset-0 transition-opacity duration-[1500ms] ease-in-out"
          style={{
            backgroundImage: `url("${src}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: i === idx ? 1 : 0,
          }}
        />
      ))}
      {/* Faint wash — the frosted article does most of the readability work. */}
      <div className="absolute inset-0" style={{ background: 'rgba(248,250,252,0.15)' }} />
      <style>{`@keyframes cityFade{from{opacity:0}to{opacity:1}}`}</style>
    </div>
  );
}
