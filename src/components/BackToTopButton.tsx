'use client';

import { useEffect, useState } from 'react';

/**
 * Floating "back to top" button — appears bottom-right when the user
 * scrolls below the fold, smooth-scrolls to top on click.
 *
 * Drops in anywhere as `<BackToTopButton />` — self-contained, no props.
 * Uses a passive scroll listener so it doesn't fight the page's main
 * scroll. Threshold = 600px (about one viewport on mobile, less on
 * desktop). Mirrors the "Ask Scout" bottom-left button's z-index tier.
 */
export default function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll(); // initial state
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      type="button"
      aria-label="Back to top of page"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={`fixed bottom-6 right-6 z-[50] w-12 h-12 rounded-full bg-[#0066FF] hover:bg-[#0052CC] text-white shadow-lg shadow-[rgba(0,102,255,0.35)] flex items-center justify-center transition-all duration-200 ${
        visible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-2 pointer-events-none'
      }`}
    >
      <i className="fa-solid fa-arrow-up text-base" />
    </button>
  );
}
