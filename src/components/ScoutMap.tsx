'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type Place = { lat: number; lng: number; name: string };
type Category = 'wellness' | 'family' | 'food' | 'daily';

type Props = {
  hotelName: string;
  lat: number;
  lng: number;
  places: { wellness: Place[]; family: Place[]; food: Place[]; daily: Place[] };
  height: number;
  /**
   * Active Scout tab — pins in this category are rendered full-opacity with
   * a numbered badge matching the list below. Pins in other categories are
   * dimmed to ~25% opacity so the neighbourhood context stays visible without
   * competing with the active lens.
   *
   * Omit for the legacy "all pins equal" rendering used on thin-data layouts.
   */
  activeTab?: Category;
};

const CAT_COLORS: Record<string, string> = {
  wellness: '#10b981',
  family: '#f59e0b',
  food: '#ef4444',
  daily: '#3b82f6',
};

/**
 * Numbered, coloured pin for the active tab. White text on category colour,
 * bigger than inactive pins so it catches the eye.
 */
function activePinHtml(color: string, n: number): string {
  return (
    `<div style="width:22px;height:22px;background:${color};border:2px solid #fff;` +
    `border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.25);display:flex;align-items:center;` +
    `justify-content:center;color:#fff;font:700 11px/1 system-ui,sans-serif;">${n}</div>`
  );
}

/**
 * Small, dimmed pin for non-active tabs. Keeps spatial context without
 * competing with the active-tab numbered circles.
 */
function inactivePinHtml(color: string): string {
  return (
    `<div style="width:9px;height:9px;background:${color};opacity:0.25;` +
    `border:1.5px solid rgba(255,255,255,0.6);border-radius:50%;"></div>`
  );
}

export default function ScoutMap({ hotelName, lat, lng, places, height, activeTab }: Props) {
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

    // Hotel marker — dark navy, always on top
    const hotelIcon = L.divIcon({
      className: '',
      html: `<div style="width:14px;height:14px;background:#0B1D51;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
    L.marker([lat, lng], { icon: hotelIcon, zIndexOffset: 1000 })
      .bindTooltip(hotelName, { permanent: false, direction: 'top' })
      .addTo(map);

    // Amenity markers — render non-active first so active pins layer on top
    const categories: Category[] = ['wellness', 'family', 'food', 'daily'];
    const renderOrder = activeTab
      ? [...categories.filter(c => c !== activeTab), activeTab]
      : categories;

    for (const cat of renderOrder) {
      const items = places[cat];
      const color = CAT_COLORS[cat] || '#6b7280';
      const isActive = activeTab === cat;

      items.forEach((p, idx) => {
        const html = isActive
          ? activePinHtml(color, idx + 1)
          : activeTab
            ? inactivePinHtml(color)
            // No activeTab supplied — legacy rendering (small coloured dot, full opacity)
            : `<div style="width:8px;height:8px;background:${color};border:1.5px solid #fff;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,.2)"></div>`;

        const size: [number, number] = isActive ? [22, 22] : activeTab ? [9, 9] : [8, 8];
        const anchor: [number, number] = isActive ? [11, 11] : activeTab ? [4, 4] : [4, 4];

        const icon = L.divIcon({
          className: '',
          html,
          iconSize: size,
          iconAnchor: anchor,
        });

        L.marker([p.lat, p.lng], { icon, zIndexOffset: isActive ? 500 : 0 })
          .bindTooltip(isActive ? `${idx + 1}. ${p.name}` : p.name, { permanent: false, direction: 'top' })
          .addTo(map);
      });
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lng, hotelName, places, activeTab]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: `${height}px` }}
      role="img"
      aria-label={`Map showing nearby amenities around ${hotelName}`}
    />
  );
}
