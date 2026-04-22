'use client';

import dynamic from 'next/dynamic';

/* Lazy-load all interactive homepage sections — keeps them out of the
   initial JS bundle so the server-rendered hero h1 paints instantly */

/* Skeleton notes:
   - No backdrop-blur — blur is one of the most expensive Speed Index costs
     on the hero (re-composited every frame of the fade-in).
   - Reserved height matches the real search form within ~40px, so the
     hydrated form replaces the skeleton without triggering CLS. Earlier
     version (h-12 * 2) shifted the layout ~200px when search mounted. */
export const LazyFlightSearch = dynamic(() => import('./search'), {
  ssr: false,
  loading: () => (
    <div
      className="bg-white/10 rounded-2xl p-6 animate-pulse min-h-[360px] md:min-h-[380px]"
      aria-hidden
    >
      <div className="h-11 bg-white/10 rounded-xl mb-3" />
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="h-11 bg-white/10 rounded-xl" />
        <div className="h-11 bg-white/10 rounded-xl" />
      </div>
      <div className="h-11 bg-white/10 rounded-xl mb-3" />
      <div className="h-12 bg-white/20 rounded-xl" />
    </div>
  ),
});

export const LazyPopularDestinations = dynamic(() => import('./popular-destinations'), {
  ssr: false,
  loading: () => <div className="py-14 bg-[#C8D0E0] min-h-[500px]" />,
});

export const LazyTestimonials = dynamic(() => import('./testimonials'), {
  ssr: false,
  loading: () => <div className="py-16 bg-[#0a1628] min-h-[350px]" />,
});
