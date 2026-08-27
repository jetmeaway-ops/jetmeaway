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
import { newTabAttrs } from '@/lib/new-tab';

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
  /** Shown in the pin popup — the owner's ask was to see the hotel, not just
   *  a price, before deciding to open it. Optional: a pin without a photo
   *  still renders, just without the image. */
  thumbnail?: string | null;
  /** Guest score out of 10, when the supplier gave one. */
  reviewScore?: number | null;
}

/** What the map is currently looking at, handed to the parent so it can search
 *  that area. `radiusKm` is the centre-to-corner distance, i.e. a circle that
 *  covers the whole visible rectangle. */
export interface MapViewport {
  lat: number;
  lng: number;
  radiusKm: number;
  zoom: number;
}

/** Great-circle distance in km — used to turn the visible rectangle into the
 *  radius our search API takes. */
function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
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
 * Cluster bubble: a compact fixed-size disc with the hotel count.
 *
 * The previous pill rendered "7 from £199" and grew with its text —
 * ~90–110 px wide — while markercluster only guarantees ~maxClusterRadius
 * (55 px) between cluster centres. In dense city centres neighbouring pills
 * therefore drew on top of each other as an unreadable smear (measured on
 * production: two 72 px+ bubbles 59 px apart). A 36 px disc stays inside the
 * cluster spacing at every zoom, so bubbles can no longer collide. The
 * cheapest price still surfaces on the hover tooltip, and clicking a bubble
 * zooms into its hotels where the individual pins carry full price pills.
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
  const tooltip = price ? `${count} hotels from ${price}` : `${count} hotels`;
  return L.divIcon({
    className: 'jma-cluster-pin',
    html: `<div title="${esc(tooltip)}" style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;background:#1A1D2B;color:#fff;border:2px solid #fff;border-radius:50%;font-family:Poppins,sans-serif;font-weight:900;font-size:12.5px;box-shadow:0 3px 12px rgba(0,0,0,.28);">${count}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

/** Popup markup for a hotel pin (imperative Leaflet — no JSX available here).
 *  Carries the photo and the guest score as well as the price: tapping a pin
 *  should tell you enough to decide, not just repeat the number already on
 *  the pin. Only a whole 1-5 renders as stars — the same rule the rest of the
 *  site now uses, because LiteAPI's `rating` is a 0-10 guest score and showing
 *  it as stars invented five-star campsites. */
function popupHtml(h: HotelMapItem): string {
  const whole = Number.isInteger(h.stars) && h.stars >= 1 && h.stars <= 5;
  const stars = whole
    ? `<div style="color:#F59E0B;font-size:12px;margin-bottom:2px;">${'★'.repeat(h.stars)}</div>`
    : '';
  const score = typeof h.reviewScore === 'number' && h.reviewScore > 0
    ? `<div style="display:inline-block;background:#0C6E4C;color:#fff;font-family:Poppins,sans-serif;font-weight:800;font-size:11px;padding:2px 6px;border-radius:6px;margin-bottom:6px;">${h.reviewScore.toFixed(1)}</div>`
    : '';
  const photo = h.thumbnail
    ? `<img src="${esc(h.thumbnail)}" alt="" loading="lazy" style="width:100%;height:96px;object-fit:cover;border-radius:8px;margin-bottom:8px;display:block;" />`
    : '';
  const price = `${h.currency === 'GBP' ? '£' : `${esc(h.currency)} `}${Math.round(h.pricePerNight)}`;
  return `<div style="min-width:190px;max-width:220px">
    ${photo}
    <div style="font-family:Poppins,sans-serif;font-weight:900;font-size:14px;color:#1A1D2B;margin-bottom:4px;line-height:1.25;">${esc(h.name)}</div>
    ${stars}
    ${score}
    <div style="font-family:Poppins,sans-serif;font-weight:800;font-size:13px;color:#F97316;margin-bottom:8px;">${price}/night</div>
    <a href="${esc(h.href)}"${newTabAttrs()} style="display:inline-block;background:#F97316;color:#fff;padding:6px 12px;border-radius:8px;font-family:Poppins,sans-serif;font-weight:800;font-size:12px;text-decoration:none;">View hotel →</a>
  </div>`;
}

/**
 * Tells the parent what the map is looking at, so it can search that area.
 *
 * The owner's ask, comparing us with another site: "when you zoom out, if we
 * have inventory in the cities coming into view, show it". Our map only ever
 * plotted the hotels from the original city search, so zooming out revealed
 * nothing new.
 *
 * Fires on `moveend` (pan and zoom both end there), debounced — a pinch emits
 * a burst of moves and each search is a live supplier call. The parent decides
 * whether a given viewport is worth searching; this component only reports.
 */
function ViewportWatcher({
  onViewportChange,
  debounceMs = 700,
}: {
  onViewportChange: (v: MapViewport) => void;
  debounceMs?: number;
}) {
  const map = useMap();
  const cbRef = useRef(onViewportChange);
  cbRef.current = onViewportChange;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const report = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const c = map.getCenter();
        const b = map.getBounds();
        const ne = b.getNorthEast();
        // Centre-to-corner: a circle that covers the whole visible rectangle.
        const radiusKm = haversineKm(c.lat, c.lng, ne.lat, ne.lng);
        cbRef.current({ lat: c.lat, lng: c.lng, radiusKm, zoom: map.getZoom() });
      }, debounceMs);
    };
    map.on('moveend', report);
    return () => {
      map.off('moveend', report);
      if (timer) clearTimeout(timer);
    };
  }, [map, debounceMs]);

  return null;
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

/**
 * Keeps the map viewport fit to whatever hotels are currently in the list.
 *
 * 🔴 The fit MUST be recomputed whenever the container's size changes, not
 * only when the hotel list does. Leaflet derives zoom from the pixel size it
 * can see at the moment `fitBounds` runs, and this map lives inside a view
 * that is toggled on (and, on desktop, a `display:none` sibling that has no
 * size at all). Measured on the owner's phone 2026-08-27, Chambéry: seven
 * hotels all within a couple of miles rendered as ONE cluster bubble over a
 * 150 km span from Geneva to Grenoble — the bounds were right, the container
 * size Leaflet measured was not, so it chose a zoom about five levels too far
 * out and every pin merged into a single disc. Nothing was broken in the
 * data; the map was simply measured before it existed at full size.
 *
 * `invalidateSize()` makes Leaflet re-measure, and a ResizeObserver re-runs
 * both whenever the box actually changes — covering the toggle, an orientation
 * change, and the browser chrome collapsing on scroll.
 */
function FitBounds({ hotels, fitKey }: { hotels: HotelMapItem[]; fitKey: string }) {
  const map = useMap();
  // Once the visitor has moved the map themselves, the map belongs to them.
  // 🔴 This matters much more now that panning/zooming LOADS MORE HOTELS: an
  // auto-fit on every arrival would drag the view back to the original city
  // the instant new pins appeared, and the harder you explored the harder it
  // would fight you. Auto-fit therefore applies to the first paint, to a
  // genuine container resize, and to a NEW SEARCH (fitKey) — never to hotels
  // simply arriving.
  const userMoved = useRef(false);
  const programmatic = useRef(false);

  useEffect(() => {
    // A new search is a fresh start: the map is ours to frame again.
    userMoved.current = false;
  }, [fitKey]);

  useEffect(() => {
    const onMoveStart = () => {
      if (!programmatic.current) userMoved.current = true;
    };
    const onMoveEnd = () => {
      programmatic.current = false;
    };
    map.on('movestart', onMoveStart);
    map.on('moveend', onMoveEnd);
    return () => {
      map.off('movestart', onMoveStart);
      map.off('moveend', onMoveEnd);
    };
  }, [map]);

  useEffect(() => {
    if (!hotels.length) return;
    // Frame the ORIGINAL search, not everything discovered since — otherwise
    // one far-off hotel found while exploring would zoom the whole map out.
    const bounds = L.latLngBounds(hotels.map((h) => [h.lat, h.lng]));
    const apply = (force: boolean) => {
      if (userMoved.current && !force) return;
      programmatic.current = true;
      map.invalidateSize({ animate: false });
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    };

    // Once now, and once after the browser has painted a frame — the mount
    // pass frequently runs while the container is still 0-height.
    apply(true);
    const raf = requestAnimationFrame(() => apply(true));

    const el = map.getContainer();
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      let last = `${el.clientWidth}x${el.clientHeight}`;
      ro = new ResizeObserver(() => {
        const next = `${el.clientWidth}x${el.clientHeight}`;
        // Only refit on a REAL size change, and never over a view the visitor
        // chose for themselves.
        if (next === last || el.clientWidth === 0 || el.clientHeight === 0) return;
        last = next;
        apply(false);
      });
      ro.observe(el);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
    // Deliberately keyed on fitKey, NOT on `hotels`: pins arriving from an
    // area search must not re-frame the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, map]);
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
  onViewportChange,
  searching = false,
  notice = null,
  fitKey,
  height,
}: {
  hotels: HotelMapItem[];
  centerLat: number;
  centerLng: number;
  activeHotelId?: string | number | null;
  onPinHover?: (id: string | number | null) => void;
  onPinClick?: (id: string | number) => void;
  /** Called (debounced) whenever the visible area settles, so the parent can
   *  search it. Omit to keep the map purely a plot of what it was given. */
  onViewportChange?: (v: MapViewport) => void;
  /** True while the parent is fetching hotels for the current area. */
  searching?: boolean;
  /** Short status line shown over the map — e.g. "zoom in to search here". */
  notice?: string | null;
  /** Changes when a NEW SEARCH happens (city + dates + party). The map
   *  re-frames itself on a change and never on pins merely arriving. */
  fitKey?: string;
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
    <div className={`relative w-full ${containerHeight} rounded-2xl overflow-hidden border border-[#E8ECF4]`}>
      {/* Status over the map: what it is doing, or why it is not doing it.
          Above Leaflet's own panes (z-400 for popups) so it is never buried,
          and pointer-events-none so it can never eat a pin tap. */}
      {(searching || notice) && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[500] pointer-events-none">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#0a1628]/90 text-white px-3 py-1.5 text-[.72rem] font-bold shadow-lg backdrop-blur-sm">
            {searching && (
              <i className="fa-solid fa-circle-notch fa-spin text-[.66rem]" aria-hidden />
            )}
            {searching ? 'Searching this area…' : notice}
          </span>
        </div>
      )}
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
        <FitBounds hotels={hotels} fitKey={fitKey ?? ''} />
        <PanToActive hotels={hotels} activeId={activeHotelId} />
        {onViewportChange && <ViewportWatcher onViewportChange={onViewportChange} />}
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
