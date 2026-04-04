'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type Place = { lat: number; lng: number; name: string };
type Props = {
  hotelName: string;
  lat: number;
  lng: number;
  places: { wellness: Place[]; family: Place[]; food: Place[]; daily: Place[] };
  height: number;
};

const CAT_COLORS: Record<string, string> = {
  wellness: '#10b981',
  family: '#f59e0b',
  food: '#ef4444',
  daily: '#3b82f6',
};

export default function ScoutMap({ hotelName, lat, lng, places, height }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: 15,
      scrollWheelZoom: false,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    // Hotel marker — dark navy
    const hotelIcon = L.divIcon({
      className: '',
      html: `<div style="width:14px;height:14px;background:#0B1D51;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
    L.marker([lat, lng], { icon: hotelIcon })
      .bindTooltip(hotelName, { permanent: false, direction: 'top' })
      .addTo(map);

    // Amenity markers
    for (const [cat, items] of Object.entries(places)) {
      const color = CAT_COLORS[cat] || '#6b7280';
      for (const p of items) {
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:8px;height:8px;background:${color};border:1.5px solid #fff;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,.2)"></div>`,
          iconSize: [8, 8],
          iconAnchor: [4, 4],
        });
        L.marker([p.lat, p.lng], { icon })
          .bindTooltip(p.name, { permanent: false, direction: 'top' })
          .addTo(map);
      }
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lng, hotelName, places]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: `${height}px` }}
      role="img"
      aria-label={`Map showing nearby amenities around ${hotelName}`}
    />
  );
}
