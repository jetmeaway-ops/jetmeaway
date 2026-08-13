'use client';

import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// Clustering is driven imperatively (see ClusteredPins). The published
// react-leaflet-cluster wrapper targets react-leaflet ^4 and this app is on
// ^5 / React 19, so we talk to the plugin directly instead.
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

/**
 * Leaflet + OpenStreetMap hotel map. Rendered as a dynamic import on /hotels
 * with ssr:false so Leaflet's `window` references don't break SSR.
 *
 * Accepts an optional `activeHotelId` so the parent list can highlight the
 * matching pin on hover, and an `onPinHover` callback so a pin hover can
 * highlight its matching card.
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
  const scale = highlight ? 1.15 : 1;
  return L.divIcon({
    className: 'jma-price-pin',
    html: `<div style="background:${bg};color:${color};border:2px solid ${border};padding:4px 10px;border-radius:999px;font-family:Poppins,sans-serif;font-weight:900;font-size:12px;box-shadow:0 2px 10px rgba(0,0,0,${highlight ? 0.24 : 0.12});white-space:nowrap;transform:scale(${scale});transform-origin:center;transition:transform .15s ease;">${label}</div>`,
    iconSize: [50, 26],
    iconAnchor: [25, 13],
  });
}

/** Escape user/supplier text before it goes into a Leaflet popup's innerHTML. */
function esc(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  );
}

/**
 * Cluster bubble showing how many hotels are hidden inside and the cheapest
 * price among them — "7 from £199" tells you far more than a bare "7".
 */
function clusterIcon(cluster: L.MarkerCluster): L.DivIcon {
  const markers = cluster.getAllChildMarkers() as Array<L.Marker & { _jmaPrice?: number; _jmaSymbol?: string }>;
  const count = markers.length;
  let min = Infinity;
  let symbol = '£';
  for (const m of markers) {
    const p = m._jmaPrice;
    if (typeof p === 'number' && p < min) { min = p; symbol = m._jmaSymbol || '£'; }
  }
  const price = Number.isFinite(min) ? `${symbol}${Math.round(min)}` : '';
  const label = price ? `${count} from ${price}` : `${count}`;
  return L.divIcon({
    className: 'jma-cluster-pin',
    html: `<div style="background:#1A1D2B;color:#fff;border:2px solid #fff;padding:5px 11px;border-radius:999px;font-family:Poppins,sans-serif;font-weight:900;font-size:12px;box-shadow:0 3px 12px rgba(0,0,0,.28);white-space:nowrap;">${esc(label)}</div>`,
    iconSize: [72, 28],
    iconAnchor: [36, 14],
  });
}

/** Popup markup for a hotel pin (imperative Leaflet — no JSX available here). */
function popupHtml(h: HotelMapItem): string {
  const stars = h.stars > 0
    ? `<div style="color:#F59E0B;font-size:12px;margin-bottom:4px;">${'★'.repeat(Math.min(5, Math.round(h.stars)))}</div>`
    : '';
  const price = `${h.currency === 'GBP' ? '£' : `${esc(h.currency)} `}${Math.round(h.pricePerNight)}`;
  return `<div style="min-width:180px">
    <div style="font-family:Poppins,sans-serif;font-weight:900;font-size:14px;color:#1A1D2B;margin-bottom:4px;">${esc(h.name)}</div>
    ${stars}
    <div style="font-family:Poppins,sans-serif;font-weight:800;font-size:13px;color:#F97316;margin-bottom:8px;">${price}/night</div>
    <a href="${esc(h.href)}" style="display:inline-block;background:#F97316;color:#fff;padding:6px 12px;border-radius:8px;font-family:Poppins,sans-serif;font-weight:800;font-size:12px;text-decoration:none;">View hotel →</a>
  </div>`;
}

/**
 * Price pins inside a clustering group.
 *
 * Previously every hotel was a plain <Marker>, so in dense city centres the
 * pills stacked on top of each other and rendered as an unreadable white
 * smear. markercluster merges nearby pins into a single "N from £X" bubble
 * that splits apart as you zoom.
 *
 * Markers are rebuilt only when the hotel list changes; hover highlighting
 * swaps the icon on the one affected marker instead of rebuilding the layer.
 */
function ClusteredPins({
  hotels,
  activeHotelId,
  onPinHover,
  onPinClick,
}: {
  hotels: HotelMapItem[];
  activeHotelId: string | number | null;
  onPinHover?: (id: string | number | null) => void;
  onPinClick?: (id: string | number) => void;
}) {
  const map = useMap();
  const groupRef = useRef<L.MarkerClusterGroup | null>(null);
  const markersRef = useRef(new Map<string, L.Marker>());
  // Keep callbacks in refs so the marker layer isn't rebuilt when the parent
  // re-renders with new function identities.
  const hoverRef = useRef(onPinHover);
  const clickRef = useRef(onPinClick);
  hoverRef.current = onPinHover;
  clickRef.current = onPinClick;

  useEffect(() => {
    const group = L.markerClusterGroup({
      iconCreateFunction: clusterIcon,
      // Price pills are wide, so cluster a little tighter than the 80px
      // default or neighbouring pills still visually collide.
      maxClusterRadius: 55,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      chunkedLoading: true,
    });
    const byId = new Map<string, L.Marker>();

    hotels.forEach((h, i) => {
      const marker = L.marker([h.lat, h.lng], {
        icon: priceIcon(h.pricePerNight, h.currency || 'GBP', i === 0),
        zIndexOffset: 0,
      }) as L.Marker & { _jmaPrice?: number; _jmaSymbol?: string };
      // Stashed for clusterIcon, which only sees child markers.
      marker._jmaPrice = h.pricePerNight;
      marker._jmaSymbol = h.currency === 'GBP' ? '£' : h.currency === 'USD' ? '$' : h.currency === 'EUR' ? '€' : '';
      marker.bindPopup(popupHtml(h));
      marker.on('mouseover', () => hoverRef.current?.(h.id));
      marker.on('mouseout', () => hoverRef.current?.(null));
      marker.on('click', () => clickRef.current?.(h.id));
      group.addLayer(marker);
      byId.set(String(h.id), marker);
    });

    map.addLayer(group);
    groupRef.current = group;
    markersRef.current = byId;

    return () => {
      map.removeLayer(group);
      group.clearLayers();
      groupRef.current = null;
      markersRef.current = new Map();
    };
  }, [hotels, map]);

  // Highlight only the marker that changed, so hovering the list doesn't
  // rebuild every pin on the map.
  const prevActiveRef = useRef<string | null>(null);
  useEffect(() => {
    const nextId = activeHotelId == null ? null : String(activeHotelId);
    const prevId = prevActiveRef.current;
    if (prevId === nextId) return;

    const restore = (id: string | null, highlight: boolean) => {
      if (!id) return;
      const marker = markersRef.current.get(id);
      const hotel = hotels.find((h) => String(h.id) === id);
      if (!marker || !hotel) return;
      const isFirst = hotels[0] && String(hotels[0].id) === id;
      marker.setIcon(priceIcon(hotel.pricePerNight, hotel.currency || 'GBP', highlight || Boolean(isFirst)));
      marker.setZIndexOffset(highlight ? 1000 : 0);
    };

    restore(prevId, false);
    restore(nextId, true);
    prevActiveRef.current = nextId;
  }, [activeHotelId, hotels]);

  return null;
}

/** Keeps the map viewport fit to whatever hotels are currently in the list. */
function FitBounds({ hotels }: { hotels: HotelMapItem[] }) {
  const map = useMap();
  useEffect(() => {
    if (!hotels.length) return;
    const bounds = L.latLngBounds(hotels.map((h) => [h.lat, h.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [hotels, map]);
  return null;
}

/** Pans to the active hotel when the list hovers/clicks one. */
function PanToActive({ hotels, activeId }: { hotels: HotelMapItem[]; activeId: string | number | null }) {
  const map = useMap();
  useEffect(() => {
    if (activeId == null) return;
    const h = hotels.find((x) => String(x.id) === String(activeId));
    if (!h) return;
    map.panTo([h.lat, h.lng], { animate: true, duration: 0.3 });
  }, [activeId, hotels, map]);
  return null;
}

export default function HotelMap({
  hotels,
  centerLat,
  centerLng,
  activeHotelId = null,
  onPinHover,
  onPinClick,
  height,
}: {
  hotels: HotelMapItem[];
  centerLat: number;
  centerLng: number;
  activeHotelId?: string | number | null;
  onPinHover?: (id: string | number | null) => void;
  onPinClick?: (id: string | number) => void;
  /** Override the default height. Accepts any Tailwind class or inline value. */
  height?: string;
}) {
  const containerHeight = height || 'h-[500px] md:h-[600px]';

  // Stable `hotels` identity for FitBounds — prevents a jitter loop when the
  // parent re-renders with the same underlying list.
  const hotelsKey = useMemo(() => hotels.map((h) => `${h.id}:${h.lat},${h.lng}`).join('|'), [hotels]);
  const stableHotels = useRef(hotels);
  useEffect(() => { stableHotels.current = hotels; }, [hotelsKey, hotels]);

  if (!hotels.length) {
    return (
      <div className={`w-full ${containerHeight} rounded-2xl border border-[#E8ECF4] bg-[#F8FAFC] flex items-center justify-center`}>
        <p className="text-[.85rem] text-[#8E95A9] font-semibold">No mappable hotels in this search.</p>
      </div>
    );
  }

  return (
    <div className={`w-full ${containerHeight} rounded-2xl overflow-hidden border border-[#E8ECF4]`}>
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
        <FitBounds hotels={hotels} />
        <PanToActive hotels={hotels} activeId={activeHotelId} />
        <ClusteredPins
          hotels={hotels}
          activeHotelId={activeHotelId}
          onPinHover={onPinHover}
          onPinClick={onPinClick}
        />
      </MapContainer>
    </div>
  );
}
