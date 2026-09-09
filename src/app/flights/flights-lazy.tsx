'use client';

import dynamic from 'next/dynamic';

// Warm the heavy flights-client chunk ahead of the tap — see the matching
// note in hotels-lazy.tsx. Same import() specifier as the lazy loader, so
// webpack dedupes to one chunk. Fired on idle from the homepage.
export const prewarmFlightsContent = () => import('./flights-client');

export const LazyFlightsContent = dynamic(() => import('./flights-client'), {
  ssr: false,
  loading: () => (
    <div className="max-w-[860px] mx-auto bg-white/10 backdrop-blur-sm rounded-3xl p-6 animate-pulse relative z-[1]">
      <div className="h-12 bg-white/10 rounded-xl mb-3" />
      <div className="h-12 bg-white/10 rounded-xl mb-3" />
      <div className="h-14 bg-white/10 rounded-xl" />
    </div>
  ),
});
