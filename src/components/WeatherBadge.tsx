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

  const wrapperClass = 'fixed right-4 top-20 z-[90] select-none';

  if (state === 'idle' || state === 'error') {
    return (
      <button
        type="button"
        onClick={locate}
        aria-label="Show local weather"
        className={`${wrapperClass} inline-flex items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-white/95 px-3 py-2 text-xs font-medium text-[#1A1D2B] shadow-[0_10px_30px_-12px_rgba(15,17,25,0.35)] backdrop-blur transition-transform hover:scale-[1.04]`}
      >
        <span aria-hidden>📍</span>
        Local weather
      </button>
    );
  }

  return (
    <div
      className={`${wrapperClass} inline-flex items-center gap-2 rounded-2xl border border-[#E2E8F0] bg-white/95 px-3 py-2 shadow-[0_10px_30px_-12px_rgba(15,17,25,0.35)] backdrop-blur`}
    >
      {state === 'locating' && !weather ? (
        <span className="text-xs font-medium text-[#5C6378]">Locating…</span>
      ) : weather ? (
        <>
          <span className="text-base leading-none" aria-hidden>
            {weather.emoji}
          </span>
          <span className="text-sm font-semibold text-[#1A1D2B]" title={weather.condition}>
            {weather.tempC}°
          </span>
          {weather.aqiBand != null ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#F1F5F9] px-1.5 py-0.5 text-[10px] font-semibold text-[#5C6378]">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: weather.aqiColor ?? '#16A34A' }}
                aria-hidden
              />
              AQI {weather.aqiBand}
            </span>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
