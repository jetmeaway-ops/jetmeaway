'use client';

import { Fragment, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { WC_CITIES, STADIUM_COORDS } from '@/data/world-cup-cities';
import { WC_AIRPORTS } from '@/data/world-cup-extras';

/**
 * Inner Leaflet map for the /world-cup-2026 venue overview. Loaded ONLY on the
 * client (via the ssr:false dynamic wrapper in WorldCupVenueMap.tsx) so
 * Leaflet's `window` access never runs during SSR. Mirrors the HotelMap setup.
 *
 * Shows each host city's STADIUM (red ⚽) and primary AIRPORT (blue ✈) so fans
 * can see the ground relative to where they fly in.
 */

function pin(emoji: string, bg: string, border: string) {
  return L.divIcon({
    className: 'wc-venue-pin',
    html: `<div style="width:30px;height:30px;border-radius:999px;background:${bg};border:2px solid ${border};display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 3px 10px rgba(0,0,0,0.25);">${emoji}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}
const stadiumIcon = pin('⚽', '#ffffff', '#0a1628');
const airportIcon = pin('✈️', '#EAF2FF', '#0066FF');

function FitAll({ points }: { points: Array<[number, number]> }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    map.fitBounds(L.latLngBounds(points), { padding: [44, 44], maxZoom: 6 });
  }, [points, map]);
  return null;
}

export default function WorldCupVenueMapInner({ citySlugs }: { citySlugs: string[] }) {
  const cities = WC_CITIES.filter((c) => citySlugs.includes(c.slug));
  const points: Array<[number, number]> = [];
  for (const c of cities) {
    const s = STADIUM_COORDS[c.slug];
    const a = WC_AIRPORTS[c.slug];
    if (s) points.push([s.lat, s.lng]);
    if (a) points.push([a.lat, a.lng]);
  }

  return (
    <div className="h-[420px] w-full overflow-hidden rounded-2xl border border-[#E8ECF4] md:h-[520px]">
      <MapContainer center={[40, -98]} zoom={4} scrollWheelZoom style={{ width: '100%', height: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitAll points={points} />
        {cities.map((c) => {
          const s = STADIUM_COORDS[c.slug];
          const a = WC_AIRPORTS[c.slug];
          return (
            <Fragment key={c.slug}>
              {s && (
                <Marker position={[s.lat, s.lng]} icon={stadiumIcon}>
                  <Popup>
                    <div style={{ fontFamily: 'Poppins, sans-serif', minWidth: 170 }}>
                      <div style={{ fontWeight: 900, fontSize: 13, color: '#1A1D2B' }}>{c.flag} {c.name}</div>
                      <div style={{ fontWeight: 800, fontSize: 12, color: '#0066FF', marginTop: 2 }}>{c.stadiumCommercial}</div>
                      {a && <div style={{ fontSize: 11, color: '#5C6378', marginTop: 4 }}>✈️ {a.iata} · {a.name}</div>}
                    </div>
                  </Popup>
                </Marker>
              )}
              {a && (
                <Marker position={[a.lat, a.lng]} icon={airportIcon}>
                  <Popup>
                    <div style={{ fontFamily: 'Poppins, sans-serif', minWidth: 150 }}>
                      <div style={{ fontWeight: 900, fontSize: 13, color: '#1A1D2B' }}>✈️ {a.iata}</div>
                      <div style={{ fontSize: 12, color: '#5C6378', marginTop: 2 }}>{a.name}</div>
                      <div style={{ fontSize: 11, color: '#8E95A9', marginTop: 4 }}>Fly in for {c.shortName}</div>
                    </div>
                  </Popup>
                </Marker>
              )}
            </Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}
