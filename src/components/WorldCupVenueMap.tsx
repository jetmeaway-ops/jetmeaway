'use client';

import dynamic from 'next/dynamic';

/**
 * Client wrapper that loads the Leaflet venue map with ssr:false (Leaflet
 * touches `window` at import time). Rendered directly from the server page —
 * mirrors how /hotels loads HotelMap.
 */
const Inner = dynamic(() => import('./WorldCupVenueMapInner'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] w-full items-center justify-center rounded-2xl border border-[#E8ECF4] bg-[#F8FAFC] md:h-[520px]">
      <p className="text-[.85rem] font-semibold text-[#8E95A9]">Loading venue map…</p>
    </div>
  ),
});

export default function WorldCupVenueMap({ citySlugs }: { citySlugs: string[] }) {
  return <Inner citySlugs={citySlugs} />;
}
