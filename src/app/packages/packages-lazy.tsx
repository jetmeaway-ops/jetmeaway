'use client';

import dynamic from 'next/dynamic';

export const LazyPackagesContent = dynamic(() => import('./packages-client'), {
  ssr: false,
  loading: () => (
    <div className="max-w-[860px] mx-auto bg-white/10 backdrop-blur-sm rounded-3xl p-6 animate-pulse relative z-[1]">
      <div className="h-12 bg-white/10 rounded-xl mb-3" />
      <div className="h-12 bg-white/10 rounded-xl mb-3" />
      <div className="h-14 bg-white/10 rounded-xl" />
    </div>
  ),
});
