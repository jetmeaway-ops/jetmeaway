'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchWeather, type WeatherNow } from '@/lib/weather';

/** localStorage key for the last successful reading (instant paint on revisit). */
const CACHE_KEY = 'jma_weather_cache_v1';
/** Re-fetch if the cached reading is older than this. */
const STALE_MS = 15 * 60 * 1000;

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
 * Small floating weather + air-quality pill, modelled on the Apple Maps
 * corner widget: condition glyph, current-location temperature, and an AQI
 * band dot. Floats top-right — clear of Scout (bottom-left) and the
 * Back-to-top button (bottom-right).
 *
 * Location is never requested unsolicited: we only auto-fetch when the
 * browser reports geolocation permission is already granted. Otherwise a
 * compact "local weather" chip requests it on an explicit tap.
 *
 * Also serves the mobile app, which is a WebView shell over this site.
 */
export default function WeatherBadge() {
  const [weather, setWeather] = useState<WeatherNow | null>(() => readCache()?.weather ?? null);
  const [state, setState] = useState<'idle' | 'locating' | 'ready' | 'error'>(
    () => (readCache() ? 'ready' : 'idle'),
  );
  const abortRef = useRef<AbortController | null>(null);

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

  // Floats at the vertical middle of the left edge — clear of the header and
  // mobile category bar (top), Scout (bottom-left) and Back-to-top (bottom-right).
  const wrapperClass = 'fixed left-3 top-1/2 -translate-y-1/2 z-[90] select-none';

  if (state === 'idle' || state === 'error') {
    return (
      <button
        type="button"
        onClick={locate}
        aria-label="Show local weather"
        className={`${wrapperClass} inline-flex items-center gap-1.5 rounded-2xl border border-white/10 bg-[#0F1119]/85 px-2.5 py-1.5 text-[11px] font-medium text-white/90 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)] backdrop-blur-md transition-transform hover:scale-[1.04]`}
      >
        <span aria-hidden>📍</span>
        Weather
      </button>
    );
  }

  return (
    <div
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
