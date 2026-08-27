'use client';

import { useEffect, useState } from 'react';
import { curatedCityImage, fetchCityImage, neutralCityImage } from '@/lib/cityHero';

/**
 * Full-page destination backdrop for hotel + flight RESULTS.
 *
 * Renders a single fixed, viewport-covering layer that fades in the searched
 * city's image once `active` is true. It sits at z-index -10 — above the
 * always-dark anti-flash base painted server-side in the page (z-index -20)
 * and BEHIND every in-flow content block — so the white result cards stay on
 * top and fully readable. The image is loaded lazily (only after a search
 * fires) so it never affects initial-paint performance.
 *
 * Image resolution (see src/lib/cityHero.ts):
 *   curated override/heroImage (sync) → Wikipedia lead photo (async) → neutral
 * fallback. So every destination — Antalya beaches, Leukerbad alps, Santorini
 * caldera — gets a real place photo, not a generic hotel room.
 *
 * The scrim is a light theme-tinted gradient; the white result cards are
 * opaque so card legibility never depends on it.
 */
export default function DestinationBackdrop({
  city,
  active,
  theme = 'hotels',
}: {
  city: string;
  active: boolean;
  theme?: 'hotels' | 'flights';
}) {
  const [img, setImg] = useState<string | null>(null);

  useEffect(() => {
    if (!active || !city) {
      setImg(null);
      return;
    }
    let cancelled = false;
    setImg(null);

    // Preload before revealing so a failed CDN load (404 / transient 429)
    // degrades to the neutral photo instead of a blank/dark backdrop — and we
    // never show a half-painted image.
    const reveal = (url: string, allowFallback: boolean) => {
      const pre = new Image();
      pre.onload = () => {
        if (!cancelled) setImg(url);
      };
      pre.onerror = () => {
        if (cancelled || !allowFallback) return;
        const fallback = neutralCityImage(city);
        if (fallback === url) return;
        reveal(fallback, false);
      };
      pre.src = url;
      if (pre.complete && pre.naturalWidth > 0 && !cancelled) setImg(url);
    };

    const curated = curatedCityImage(city);
    if (curated) {
      reveal(curated, true);
    } else {
      // Resolve the real place photo from Wikipedia; neutral only on miss.
      fetchCityImage(city).then((url) => {
        if (!cancelled) reveal(url || neutralCityImage(city), true);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [city, active]);

  if (!active || !city || !img) return null;

  // Theme-matched scrim — warm for hotels, cool/navy for flights. Kept light
  // so the photo reads bright/daytime; just enough darkening toward the bottom
  // to seat the long results list.
  const scrim =
    theme === 'flights'
      ? 'linear-gradient(180deg, rgba(5,19,39,0.34) 0%, rgba(3,16,31,0.42) 55%, rgba(3,16,31,0.58) 100%)'
      : 'linear-gradient(180deg, rgba(31,20,16,0.32) 0%, rgba(22,10,8,0.40) 55%, rgba(16,6,4,0.56) 100%)';

  return (
    <div
      key={img}
      aria-hidden
      data-decor-backdrop
      className="fixed inset-0 pointer-events-none animate-[backdropFade_0.7s_ease-out]"
      style={{
        zIndex: -10,
        backgroundImage: `${scrim}, url("${img}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        filter: 'saturate(1.06)',
      }}
    >
      <style>{`@keyframes backdropFade{from{opacity:0}to{opacity:1}}`}</style>
    </div>
  );
}
