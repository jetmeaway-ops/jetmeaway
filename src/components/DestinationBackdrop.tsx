'use client';

import { cityHeroImage } from '@/lib/cityHero';

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
 * The scrim is a heavy dark gradient tinted to the page theme; it keeps text
 * legible and renders the neutral-fallback imagery (for non-curated cities)
 * as ambient texture rather than a literal place claim.
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
  if (!active || !city) return null;

  const img = cityHeroImage(city);

  // Theme-matched scrim — warm for hotels, cool/navy for flights — echoing
  // each hero's existing gradient so the swap reads as intentional. Kept light
  // so the photo reads bright/daytime; just enough darkening toward the bottom
  // to seat the long results list. The white result cards are opaque, so card
  // legibility never depends on the scrim.
  const scrim =
    theme === 'flights'
      ? 'linear-gradient(180deg, rgba(5,19,39,0.34) 0%, rgba(3,16,31,0.42) 55%, rgba(3,16,31,0.58) 100%)'
      : 'linear-gradient(180deg, rgba(31,20,16,0.32) 0%, rgba(22,10,8,0.40) 55%, rgba(16,6,4,0.56) 100%)';

  return (
    <div
      aria-hidden
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
