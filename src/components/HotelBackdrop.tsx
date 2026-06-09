'use client';

import { useEffect, useState } from 'react';

/**
 * HotelBackdrop — the hotel's own photos as a soft full-page backdrop behind
 * the booking flow (hotel detail page → checkout), so the chosen hotel stays
 * present visually all the way to payment.
 *
 * Design notes
 * - Unlike the dark destination heroes, these pages are LIGHT-themed with dark
 *   text sitting directly on the background (breadcrumb, H1) plus opaque white
 *   cards. So the scrim is a LIGHT frosted gradient: strong white at the very
 *   top (protects the heading text) easing to a lighter wash lower down, where
 *   the hotel photo reads clearly in the side margins. Every existing text
 *   colour and card stays readable — no page restyling required.
 * - Sits at z-index -1: above the white <body> background, behind all in-flow
 *   content. The fixed header (z-100) and footer stay on top.
 * - Loads after the page's own data (the detail gallery is already fetched for
 *   the on-page carousel, so the backdrop reuses cached images — no extra
 *   bandwidth). On checkout it's just the single booking thumbnail.
 * - With multiple photos it slow-cross-fades through them (7s) so "the hotel
 *   pics" (plural) are shown; with one it's static.
 */
export default function HotelBackdrop({ photos }: { photos: (string | null | undefined)[] }) {
  const pics = (photos || []).filter((p): p is string => !!p).slice(0, 6);
  const [idx, setIdx] = useState(0);
  const [show, setShow] = useState(false);

  const first = pics[0];
  useEffect(() => {
    if (!first) return;
    // Preload the first image, then reveal — avoids a half-painted fade.
    const pre = new Image();
    const reveal = () => setShow(true);
    pre.onload = reveal;
    pre.onerror = reveal;
    pre.src = first;
    if (pre.complete) reveal();
  }, [first]);

  const count = pics.length;
  useEffect(() => {
    if (count < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % count), 7000);
    return () => clearInterval(t);
  }, [count]);

  if (!count || !show) return null;

  return (
    <div
      aria-hidden
      className="fixed inset-0 pointer-events-none animate-[hbFade_0.9s_ease-out]"
      style={{ zIndex: -1 }}
    >
      {pics.map((src, i) => (
        <div
          key={src}
          className="absolute inset-0 transition-opacity duration-[1200ms] ease-in-out"
          style={{
            backgroundImage: `url("${src}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: i === idx ? 1 : 0,
          }}
        />
      ))}
      {/* Light frosted scrim — strong at top (protects heading text), lighter
          lower down so the hotel photo stays visible in the page margins. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.93) 0%, rgba(255,255,255,0.83) 16%, rgba(248,250,252,0.62) 52%, rgba(248,250,252,0.58) 100%)',
        }}
      />
      <style>{`@keyframes hbFade{from{opacity:0}to{opacity:1}}`}</style>
    </div>
  );
}
