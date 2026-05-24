/**
 * Current-conditions lookup backed by Open-Meteo.
 *
 * Two free, key-less endpoints are combined: the forecast API for
 * temperature + WMO weather code, and the air-quality API for the European
 * AQI. Both accept a bare lat/lng and need no auth, so this runs client-side
 * with no server proxy or secret to manage.
 */

export type WeatherNow = {
  /** Rounded temperature in whole degrees Celsius. */
  tempC: number;
  /** WMO weather interpretation code (0 = clear, 95 = thunderstorm, …). */
  code: number;
  /** Short human label for the condition, e.g. "Clear", "Light rain". */
  condition: string;
  /** Emoji glyph matching the condition. */
  emoji: string;
  /** Air-quality band 1 (good) … 6 (extremely poor), or null if unavailable. */
  aqiBand: number | null;
  /** Word label for the AQI band, e.g. "Good". */
  aqiLabel: string | null;
  /** Hex colour for the AQI status dot. */
  aqiColor: string | null;
};

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';

/** Map a WMO weather code to a label + emoji. */
function describeCode(code: number): { condition: string; emoji: string } {
  if (code === 0) return { condition: 'Clear', emoji: '☀️' };
  if (code === 1) return { condition: 'Mainly clear', emoji: '🌤️' };
  if (code === 2) return { condition: 'Partly cloudy', emoji: '⛅' };
  if (code === 3) return { condition: 'Overcast', emoji: '☁️' };
  if (code === 45 || code === 48) return { condition: 'Fog', emoji: '🌫️' };
  if (code >= 51 && code <= 57) return { condition: 'Drizzle', emoji: '🌦️' };
  if (code >= 61 && code <= 67) return { condition: 'Rain', emoji: '🌧️' };
  if (code >= 71 && code <= 77) return { condition: 'Snow', emoji: '🌨️' };
  if (code >= 80 && code <= 82) return { condition: 'Showers', emoji: '🌦️' };
  if (code === 85 || code === 86) return { condition: 'Snow showers', emoji: '🌨️' };
  if (code >= 95) return { condition: 'Thunderstorm', emoji: '⛈️' };
  return { condition: '—', emoji: '🌡️' };
}

/** Map a European AQI value to a 1–6 band with label + status colour. */
function describeAqi(aqi: number | null | undefined): {
  aqiBand: number | null;
  aqiLabel: string | null;
  aqiColor: string | null;
} {
  if (aqi == null || Number.isNaN(aqi)) {
    return { aqiBand: null, aqiLabel: null, aqiColor: null };
  }
  if (aqi <= 20) return { aqiBand: 1, aqiLabel: 'Good', aqiColor: '#16A34A' };
  if (aqi <= 40) return { aqiBand: 2, aqiLabel: 'Fair', aqiColor: '#84CC16' };
  if (aqi <= 60) return { aqiBand: 3, aqiLabel: 'Moderate', aqiColor: '#EAB308' };
  if (aqi <= 80) return { aqiBand: 4, aqiLabel: 'Poor', aqiColor: '#F97316' };
  if (aqi <= 100) return { aqiBand: 5, aqiLabel: 'Very poor', aqiColor: '#DC2626' };
  return { aqiBand: 6, aqiLabel: 'Extremely poor', aqiColor: '#7F1D1D' };
}

/**
 * Fetch current weather + air quality for a coordinate. The air-quality call
 * is best-effort: if it fails the badge still renders with temperature alone.
 */
export async function fetchWeather(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<WeatherNow> {
  const forecastUrl = `${FORECAST_URL}?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code`;
  const aqiUrl = `${AIR_QUALITY_URL}?latitude=${lat}&longitude=${lng}&current=european_aqi`;

  const [forecastRes, aqiRes] = await Promise.allSettled([
    fetch(forecastUrl, { signal }),
    fetch(aqiUrl, { signal }),
  ]);

  if (forecastRes.status !== 'fulfilled' || !forecastRes.value.ok) {
    throw new Error('weather lookup failed');
  }
  const forecast = (await forecastRes.value.json()) as {
    current?: { temperature_2m?: number; weather_code?: number };
  };
  const tempRaw = forecast.current?.temperature_2m;
  const code = forecast.current?.weather_code ?? 0;
  if (typeof tempRaw !== 'number') {
    throw new Error('weather lookup returned no temperature');
  }

  let aqi: number | null = null;
  if (aqiRes.status === 'fulfilled' && aqiRes.value.ok) {
    const air = (await aqiRes.value.json()) as {
      current?: { european_aqi?: number };
    };
    aqi = air.current?.european_aqi ?? null;
  }

  return {
    tempC: Math.round(tempRaw),
    code,
    ...describeCode(code),
    ...describeAqi(aqi),
  };
}
