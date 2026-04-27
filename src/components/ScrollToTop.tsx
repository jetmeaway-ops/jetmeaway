'use client';

import { useEffect, useState } from 'react';

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollUp = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <button
      type="button"
      onClick={scrollUp}
      aria-label="Scroll to top"
      className="md:hidden fixed bottom-24 z-[150] h-11 w-11 rounded-full bg-[#0066FF] text-white ring-2 ring-white flex items-center justify-center transition-opacity duration-200"
      style={{
        left: '50%',
        transform: 'translateX(-50%)',
        boxShadow: '0 8px 24px rgba(0,102,255,0.45)',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <i className="fa-solid fa-arrow-up text-base" aria-hidden="true" />
    </button>
  );
}
