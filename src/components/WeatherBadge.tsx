'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchWeather, type WeatherNow } from '@/lib/weather';

/** localStorage key for the last successful reading (instant paint on revisit). */
const CACHE_KEY = 'jma_weather_cache_v1';
/** Re-fetch if the cached reading is older than this. */
const STALE_MS = 15 * 60 * 1000;

/** localStorage key for the visitor's dragged position (persists across visits). */
const POS_KEY = 'jma_weather_pos_v1';
/** Keep the pill at least this far from every edge. */
const MIN_EDGE = 12;
/** Approx pill footprint, used to clamp + to centre vertically by default. */
const EST_W = 76;
const EST_H = 34;

type Pos = { leftPx: number; topPx: number };

/** Default: middle of the left edge. */
function defaultPos(): Pos {
  const h = typeof window === 'undefined' ? 800 : window.innerHeight;
  return { leftPx: MIN_EDGE, topPx: Math.round(h / 2 - EST_H / 2) };
}

/** Read a saved position, or null if none/corrupt. */
function readPos(): Pos | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(POS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<Pos>;
    return typeof p.leftPx === 'number' && typeof p.topPx === 'number' &&
      Number.isFinite(p.leftPx) && Number.isFinite(p.topPx)
      ? { leftPx: p.leftPx, topPx: p.topPx }
      : null;
  } catch {
    return null;
  }
}

/** Keep a position inside the viewport. */
function clampPos(next: Pos): Pos {
  if (typeof window === 'undefined') return next;
  const maxLeft = Math.max(MIN_EDGE, window.innerWidth - EST_W - MIN_EDGE);
  const maxTop = Math.max(MIN_EDGE, window.innerHeight - EST_H - MIN_EDGE);
  return {
    leftPx: Math.min(maxLeft, Math.max(MIN_EDGE, next.leftPx)),
    topPx: Math.min(maxTop, Math.max(MIN_EDGE, next.topPx)),
  };
}

type Cached = { lat: number; lng: number; weather: WeatherNow; at: number };

/** Read the last cached reading. Returns null on SSR or corrupt/empty cache. */
function readCache(): Cached | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Cached;
    return c?.weather && typeof c.at === 'number' ? c : null;
  } catch {
    return null;
  }
}

/**
 * Small floating weather pill, modelled on the Apple Maps corner widget:
 * condition glyph + current-location temperature. Defaults to the middle of
 * the left edge and is draggable anywhere (like Scout) — the chosen spot
 * persists across visits.
 *
 * Location is never requested unsolicited: we only auto-fetch when the
 * browser reports geolocation permission is already granted. Otherwise a
 * compact "Weather" chip requests it on an explicit tap.
 *
 * Also serves the mobile app, which is a WebView shell over this site.
 */
export default function WeatherBadge() {
  const [weather, setWeather] = useState<WeatherNow | null>(() => readCache()?.weather ?? null);
  const [state, setState] = useState<'idle' | 'locating' | 'ready' | 'error'>(
    () => (readCache() ? 'ready' : 'idle'),
  );
  const abortRef = useRef<AbortController | null>(null);

  // 2D draggable position — restored from localStorage on mount, defaults to
  // the middle of the left edge. Drag handlers update live; saved on pointer-up.
  const [pos, setPos] = useState<Pos>(() => clampPos(readPos() ?? defaultPos()));
  const draggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, leftPx: 0, topPx: 0 });
  // Suppress the click that fires on pointer-up so a drag doesn't also
  // trigger the tap-to-locate action on the idle chip.
  const justDraggedRef = useRef(false);

  function onPointerDown(e: React.PointerEvent<HTMLElement>) {
    draggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY, leftPx: pos.leftPx, topPx: pos.topPx };
    justDraggedRef.current = false;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  }
  function onPointerMove(e: React.PointerEvent<HTMLElement>) {
    if (!draggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) justDraggedRef.current = true;
    setPos(clampPos({ leftPx: dragStartRef.current.leftPx + dx, topPx: dragStartRef.current.topPx + dy }));
  }
  function onPointerUp(e: React.PointerEvent<HTMLElement>) {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    if (justDraggedRef.current && typeof window !== 'undefined') {
      try { window.localStorage.setItem(POS_KEY, JSON.stringify(pos)); } catch { /* ignore */ }
    }
  }

  const load = useCallback((lat: number, lng: number) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    fetchWeather(lat, lng, ctrl.signal)
      .then((w) => {
        setWeather(w);
        setState('ready');
        try {
          window.localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ lat, lng, weather: w, at: Date.now() } satisfies Cached),
          );
        } catch {
          // localStorage may be unavailable (private mode) — non-fatal.
        }
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setState((s) => (s === 'ready' ? s : 'error'));
      });
  }, []);

  const locate = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setState('error');
      return;
    }
    setState('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => load(pos.coords.latitude, pos.coords.longitude),
      () => setState((s) => (s === 'ready' ? s : 'error')),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 10 * 60 * 1000 },
    );
  }, [load]);

  // On mount: a fresh cached reading (painted via the lazy initialisers
  // above) is enough — skip the refresh. Otherwise refresh only when the
  // browser already has geolocation permission (no unsolicited prompt).
  useEffect(() => {
    const cached = readCache();
    if (cached && Date.now() - cached.at < STALE_MS) return;

    if (!navigator.permissions?.query) return;
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((status) => {
        if (status.state === 'granted') locate();
      })
      .catch(() => {
        // Permissions API unsupported — leave the tap chip in place.
      });

    return () => abortRef.current?.abort();
  }, [locate]);

  // Keep the pill on-screen if the viewport changes (rotate / resize).
  useEffect(() => {
    const onResize = () => setPos((p) => clampPos(p));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Draggable: positioned by inline left/top px. touch-none so a drag on
  // mobile moves the pill instead of scrolling the page; grab cursor on desktop.
  const wrapperClass =
    'fixed z-[90] select-none touch-none cursor-grab active:cursor-grabbing';
  const dragProps = {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    style: { left: pos.leftPx, top: pos.topPx },
  } as const;

  if (state === 'idle' || state === 'error') {
    return (
      <button
        type="button"
        {...dragProps}
        onClick={() => {
          if (justDraggedRef.current) {
            justDraggedRef.current = false;
            return;
          }
          locate();
        }}
        aria-label="Show local weather"
        className={`${wrapperClass} inline-flex items-center gap-1.5 rounded-2xl border border-white/10 bg-[#0F1119]/85 px-2.5 py-1.5 text-[11px] font-medium text-white/90 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)] backdrop-blur-md`}
      >
        <span aria-hidden>📍</span>
        Weather
      </button>
    );
  }

  return (
    <div
      {...dragProps}
      className={`${wrapperClass} inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#0F1119]/85 px-3 py-1.5 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)] backdrop-blur-md`}
    >
      {state === 'locating' && !weather ? (
        <span className="text-[12px] font-medium text-white/70">Locating…</span>
      ) : weather ? (
        <>
          {/* Condition glyph + current temperature — clean single-line pill. */}
          <span className="text-[15px] leading-none" aria-hidden>
            {weather.emoji}
          </span>
          <span className="text-[15px] font-semibold leading-none text-white" title={weather.condition}>
            {weather.tempC}°
          </span>
        </>
      ) : null}
    </div>
  );
}
