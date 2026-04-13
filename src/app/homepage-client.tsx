'use client';

import dynamic from 'next/dynamic';

/* Lazy-load all interactive homepage sections — keeps them out of the
   initial JS bundle so the server-rendered hero h1 paints instantly */

export const LazyFlightSearch = dynamic(() => import('./search'), {
  ssr: false,
  loading: () => (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 animate-pulse">
      <div className="h-12 bg-white/10 rounded-xl mb-3" />
      <div className="h-12 bg-white/10 rounded-xl" />
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
