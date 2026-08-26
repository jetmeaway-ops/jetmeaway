'use client';

/**
 * ScoutSidebar + the heavy data it needs, in ONE lazily-loaded chunk.
 *
 * `vibeTagsForSearchedCity` reads the whole 117 KB DESTINATIONS array, and it
 * used to be statically imported by hotels-client.tsx — which put those 117 KB
 * inside the main hotels route chunk that every category tap must download and
 * parse before the search form responds (the owner's 12-16 s dead taps,
 * 2026-08-26). The sidebar is the ONLY consumer on the results page, and the
 * sidebar itself is already lazy, so the lookup belongs in the sidebar's chunk:
 * hotels-client loads this launcher via dynamic(ssr:false) and the city data
 * now downloads only when someone actually opens Scout.
 */
import ScoutSidebar from '@/components/ScoutSidebar';
import { chooseDefaultTab } from '@/lib/silentScout';
import { vibeTagsForSearchedCity } from '@/data/destinations';

export default function ScoutSidebarLauncher({
  hotelName,
  latitude,
  longitude,
  adults,
  childCount,
  searchedDest,
  onClose,
}: {
  hotelName: string;
  latitude: number;
  longitude: number;
  adults: number;
  childCount: number;
  searchedDest: string;
  onClose?: () => void;
}) {
  return (
    <ScoutSidebar
      hotelName={hotelName}
      latitude={latitude}
      longitude={longitude}
      onClose={onClose}
      defaultTab={chooseDefaultTab({
        adults,
        children: childCount,
        vibeTags: vibeTagsForSearchedCity(searchedDest),
      })}
    />
  );
}
