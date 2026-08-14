'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTranslations } from 'next-intl';

/**
 * A single-hotel location map shown in a popup, opened from a "Show on map"
 * button on the results card and on the hotel detail page.
 *
 * Purpose: a visitor who likes a hotel wants to see WHERE it is and how far it
 * sits from the place they searched (a landmark like Big Ben, or the city
 * centre). This drops the hotel as a red pin, the searched reference as a gold
 * pin, a dashed line between them, and prints the straight-line miles + a rough
 * walk time.
 *
 * Leaflet notes:
 * - Rendered only while open (the parent gates on state), so the map mounts
 *   into a container that already has its final size — but modal paint can
 *   still race the first tile layout, so `Fit` calls `invalidateSize()` on a
 *   few frames. Without it the tiles render as a grey half-drawn box.
 * - Custom `divIcon` pins avoid Leaflet's default marker PNGs, which 404 under
 *   the bundler (same pattern as HotelMap.tsx).
 */

export interface MapReference {
  label: string;
  lat: number;
  lng: number;
}

function haversineMi(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Escape supplier/user text before it goes into a divIcon's innerHTML. */
function esc(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  );
}

/**
 * Pin + a name label, so the map is readable without cross-referencing the
 * legend. Two bare coloured teardrops told the visitor nothing about which was
 * which — the hotel name only appeared in the modal's title bar.
 *
 * The label is placed BELOW the hotel pin and ABOVE the reference pin so the
 * two don't collide when the hotel sits close to the landmark. It's clipped to
 * a sane width (long supplier names run to 60+ characters) and is
 * `pointer-events:none` so it never swallows a drag on the map.
 */
function teardropPin(color: string, label?: string, placement: 'below' | 'above' = 'below'): L.DivIcon {
  const chip = label
    ? `<div style="position:absolute;left:13px;${placement === 'below' ? 'top:37px' : 'bottom:37px'};transform:translateX(-50%);pointer-events:none;
         max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
         background:rgba(255,255,255,.96);color:#1A1D2B;border:1px solid ${color};
         border-radius:999px;padding:2px 8px;font-family:Poppins,sans-serif;font-weight:700;
         font-size:11px;line-height:15px;box-shadow:0 1px 5px rgba(0,0,0,.22)">${esc(label)}</div>`
    : '';
  return L.divIcon({
    className: 'jma-loc-pin',
    html: `<div style="position:relative;width:26px;height:34px">
      <div style="position:absolute;left:1px;top:0;width:24px;height:24px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>
      <div style="position:absolute;left:8px;top:7px;width:10px;height:10px;border-radius:50%;background:#fff"></div>
      ${chip}
    </div>`,
    iconSize: [26, 34],
    iconAnchor: [13, 32],
    popupAnchor: [0, -30],
  });
}

/** Fit the viewport to the pins, then keep the tiles sized to the modal. */
function Fit({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 1) {
      map.setView(points[0], 15);
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 15 });
    }
    const invalidate = () => map.invalidateSize();
    const raf = requestAnimationFrame(invalidate);
    const t1 = setTimeout(invalidate, 140);
    const t2 = setTimeout(invalidate, 360);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // points identity changes only when the hotel/reference changes, which is
    // the same lifetime as the modal itself — safe to run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  return null;
}

/**
 * Re-measures the map whenever `trigger` changes. Leaflet caches its container
 * size; when the modal grows to fullscreen (or shrinks back) the tiles must be
 * told to re-layout or half the map stays grey. A couple of frames covers the
 * CSS size transition.
 */
function Resizer({ trigger }: { trigger: unknown }) {
  const map = useMap();
  useEffect(() => {
    const invalidate = () => map.invalidateSize();
    const raf = requestAnimationFrame(invalidate);
    const t = setTimeout(invalidate, 220);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [trigger, map]);
  return null;
}

export default function HotelLocationModal({
  hotelName,
  lat,
  lng,
  reference,
  onClose,
}: {
  hotelName: string;
  lat: number;
  lng: number;
  reference?: MapReference | null;
  onClose: () => void;
}) {
  const t = useTranslations('hotels');
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Escape to close + lock body scroll behind the overlay.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  if (!mounted) return null;

  const hasRef =
    reference != null &&
    Number.isFinite(reference.lat) &&
    Number.isFinite(reference.lng) &&
    !(reference.lat === lat && reference.lng === lng);

  const miles = hasRef ? haversineMi(lat, lng, reference!.lat, reference!.lng) : null;
  const milesStr = miles != null ? (miles < 10 ? miles.toFixed(1) : Math.round(miles).toString()) : null;
  const minutes = miles != null ? Math.max(1, Math.round(miles * 20)) : null;
  const points: [number, number][] = hasRef ? [[lat, lng], [reference!.lat, reference!.lng]] : [[lat, lng]];

  const overlay = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={hotelName}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        background: 'rgba(10,16,28,.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: expanded ? 0 : '16px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: expanded ? '100%' : 'min(560px, 100%)',
          height: expanded ? '100%' : undefined,
          maxWidth: expanded ? 'none' : undefined,
          maxHeight: expanded ? '100vh' : '90vh',
          background: '#fff',
          borderRadius: expanded ? 0 : '16px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 70px rgba(0,0,0,.4)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '13px 16px',
            borderBottom: '1px solid #E8ECF4',
          }}
        >
          <div
            style={{
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 800,
              fontSize: '15px',
              color: '#1A1D2B',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {hotelName}
          </div>
          <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? t('collapseMap') : t('expandMap')}
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                border: '1px solid #E8ECF4',
                background: '#fff',
                color: '#5C6378',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              {expanded ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 3v3a2 2 0 0 1-2 2H4M15 3v3a2 2 0 0 0 2 2h3M9 21v-3a2 2 0 0 0-2-2H4M15 21v-3a2 2 0 0 1 2-2h3" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 9V5a2 2 0 0 1 2-2h4M20 9V5a2 2 0 0 0-2-2h-4M4 15v4a2 2 0 0 0 2 2h4M20 15v4a2 2 0 0 1-2 2h-4" />
                </svg>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('closeMap')}
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                border: '1px solid #E8ECF4',
                background: '#fff',
                color: '#5C6378',
                fontSize: '17px',
                lineHeight: 1,
                cursor: 'pointer',
              }}
            >
              ×
            </button>
          </div>
        </div>

        <div
          style={{
            width: '100%',
            ...(expanded ? { flex: '1 1 auto', minHeight: 0 } : { height: 'clamp(280px, 55vh, 460px)' }),
          }}
        >
          <MapContainer center={[lat, lng]} zoom={15} scrollWheelZoom style={{ width: '100%', height: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {hasRef && (
              <Polyline
                positions={points}
                pathOptions={{ color: '#1A1D2B', weight: 2, dashArray: '5 6', opacity: 0.7 }}
              />
            )}
            <Marker position={[lat, lng]} icon={teardropPin('#E24B4A', hotelName, 'below')} />
            {hasRef && (
              <Marker
                position={[reference!.lat, reference!.lng]}
                icon={teardropPin('#C9A227', reference!.label, 'above')}
              />
            )}
            <Fit points={points} />
            <Resizer trigger={expanded} />
          </MapContainer>
        </div>

        {hasRef && milesStr != null && minutes != null && (
          <div
            style={{
              padding: '11px 16px',
              fontFamily: 'Poppins, sans-serif',
              fontSize: '12.5px',
              fontWeight: 600,
              color: '#5C6378',
              borderTop: '1px solid #E8ECF4',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#E24B4A' }} />
              {t('yourHotel')}
            </span>
            <span style={{ color: '#C8CEDA' }}>→</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#C9A227' }} />
              {reference!.label}
            </span>
            <span style={{ marginLeft: 'auto', fontWeight: 800, color: '#1A1D2B' }}>
              {t('mapDistance', { miles: milesStr, minutes })}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
