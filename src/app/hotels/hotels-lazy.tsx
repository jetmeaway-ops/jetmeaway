'use client';

import dynamic from 'next/dynamic';

// Warm the heavy hotels-client chunk ahead of the tap. Because the /hotels
// route is dynamic (root layout reads headers) and hotels-client sits behind
// a loading.tsx Suspense boundary, neither automatic prefetch nor
// router.prefetch fetches this chunk — it only downloads on click, which is
// the cold first-tap freeze (owner report 2026-09-09). Calling the SAME
// import() specifier the lazy loader uses means webpack dedupes to one chunk,
// so this pre-download lands exactly what the navigation later needs.
// Fire it on idle from the homepage (see RoutePrewarmer).
export const prewarmHotelsContent = () => import('./hotels-client');

export const LazyHotelsContent = dynamic(() => import('./hotels-client'), {
  ssr: false,
  loading: () => (
    <div className="max-w-[860px] mx-auto bg-white/10 backdrop-blur-sm rounded-3xl p-6 animate-pulse relative z-[1]">
      <div className="h-12 bg-white/10 rounded-xl mb-3" />
      <div className="h-12 bg-white/10 rounded-xl mb-3" />
      <div className="h-14 bg-white/10 rounded-xl" />
    </div>
  ),
});
