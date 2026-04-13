'use client';

import dynamic from 'next/dynamic';

export const LazyExploreContent = dynamic(() => import('./explore-client'), {
  ssr: false,
  loading: () => (
    <div className="max-w-[860px] mx-auto bg-white border border-[#E8ECF4] rounded-3xl p-6 animate-pulse">
      <div className="h-12 bg-gray-100 rounded-xl mb-3" />
      <div className="h-12 bg-gray-100 rounded-xl mb-3" />
      <div className="h-14 bg-gray-100 rounded-xl" />
    </div>
  ),
});
