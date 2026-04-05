'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * Leaflet + OpenStreetMap hotel map. Rendered as a dynamic import on /hotels
 * with ssr:false so Leaflet's `window` references don't break SSR.
 */

export interface HotelMapItem {
  id: string | number;
  name: string;
  stars: number;
  pricePerNight: number;
  currency: string;
  lat: number;
  lng: number;
  href: string;
}

// Price-pill divIcon — shows the nightly rate on the map
function priceIcon(price: number, currency: string, highlight: boolean) {
  const symbol = currency === 'GBP' ? '£' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '';
  const label = `${symbol}${Math.round(price)}`;
  const bg = highlight ? '#F97316' : '#FFFFFF';
  const color = highlight ? '#FFFFFF' : '#1A1D2B';
  const border = highlight ? '#EA580C' : '#E8ECF4';
  return L.divIcon({
    className: 'jma-price-pin',
    html: `<div style="background:${bg};color:${color};border:2px solid ${border};padding:4px 10px;border-radius:999px;font-family:Poppins,sans-serif;font-weight:900;font-size:12px;box-shadow:0 2px 10px rgba(0,0,0,0.12);white-space:nowrap;">${label}</div>`,
    iconSize: [50, 26],
    iconAnchor: [25, 13],
  });
}

export default function HotelMap({
  hotels,
  centerLat,
  centerLng,
}: {
  hotels: HotelMapItem[];
  centerLat: number;
  centerLng: number;
}) {
  if (!hotels.length) {
    return (
      <div className="w-full h-[500px] rounded-2xl border border-[#E8ECF4] bg-[#F8FAFC] flex items-center justify-center">
        <p className="text-[.85rem] text-[#8E95A9] font-semibold">No mappable hotels in this search.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[500px] md:h-[600px] rounded-2xl overflow-hidden border border-[#E8ECF4]">
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={13}
        scrollWheelZoom
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {hotels.map((h, i) => (
          <Marker
            key={h.id}
            position={[h.lat, h.lng]}
            icon={priceIcon(h.pricePerNight, h.currency || 'GBP', i === 0)}
          >
            <Popup>
              <div style={{ minWidth: 180 }}>
                <div style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 900, fontSize: 14, color: '#1A1D2B', marginBottom: 4 }}>
                  {h.name}
                </div>
                {h.stars > 0 && (
                  <div style={{ color: '#F59E0B', fontSize: 12, marginBottom: 4 }}>
                    {'★'.repeat(Math.min(5, Math.round(h.stars)))}
                  </div>
                )}
                <div style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: 13, color: '#F97316', marginBottom: 8 }}>
                  {h.currency === 'GBP' ? '£' : `${h.currency} `}{h.pricePerNight}/night
                </div>
                <a
                  href={h.href}
                  style={{
                    display: 'inline-block',
                    background: '#F97316',
                    color: '#fff',
                    padding: '6px 12px',
                    borderRadius: 8,
                    fontFamily: 'Poppins, sans-serif',
                    fontWeight: 800,
                    fontSize: 12,
                    textDecoration: 'none',
                  }}
                >
                  View hotel →
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
