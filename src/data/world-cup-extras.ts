/**
 * Supplementary data for the /world-cup-2026 campaign page — geography for the
 * interactive venue map (stadium ↔ airport ↔ city-centre), keyed by the same
 * city `slug` used in world-cup-cities.ts. Stadium coords live in
 * STADIUM_COORDS (world-cup-cities.ts); here we add the primary airport and the
 * downtown centroid so the map can show each stadium relative to both.
 *
 * The richer editorial blocks (budget tiers, fan checklist, commute guides,
 * squad analytics, group-stage scenarios) are generated separately and added
 * below as they land.
 */

export type WcGeo = { lat: number; lng: number };
export type WcAirport = { iata: string; name: string; lat: number; lng: number };

/** Primary international airport per host city (matches iata[0] in WC_CITIES). */
export const WC_AIRPORTS: Record<string, WcAirport> = {
  dallas: { iata: 'DFW', name: 'Dallas/Fort Worth Intl', lat: 32.8998, lng: -97.0403 },
  boston: { iata: 'BOS', name: 'Boston Logan Intl', lat: 42.3656, lng: -71.0096 },
  'new-york': { iata: 'EWR', name: 'Newark Liberty Intl', lat: 40.6895, lng: -74.1745 },
  'los-angeles': { iata: 'LAX', name: 'Los Angeles Intl', lat: 33.9416, lng: -118.4085 },
  miami: { iata: 'MIA', name: 'Miami Intl', lat: 25.7959, lng: -80.287 },
  atlanta: { iata: 'ATL', name: 'Hartsfield–Jackson Atlanta Intl', lat: 33.6407, lng: -84.4277 },
  seattle: { iata: 'SEA', name: 'Seattle–Tacoma Intl', lat: 47.4502, lng: -122.3088 },
  'san-francisco': { iata: 'SFO', name: 'San Francisco Intl', lat: 37.6213, lng: -122.379 },
  toronto: { iata: 'YYZ', name: 'Toronto Pearson Intl', lat: 43.6777, lng: -79.6248 },
  vancouver: { iata: 'YVR', name: 'Vancouver Intl', lat: 49.1939, lng: -123.1844 },
  'mexico-city': { iata: 'MEX', name: 'Mexico City Intl (Benito Juárez)', lat: 19.4361, lng: -99.0719 },
};

/** Downtown centroid per host city. */
export const WC_CITY_CENTRES: Record<string, WcGeo> = {
  dallas: { lat: 32.7767, lng: -96.797 },
  boston: { lat: 42.3601, lng: -71.0589 },
  'new-york': { lat: 40.7128, lng: -74.006 },
  'los-angeles': { lat: 34.0522, lng: -118.2437 },
  miami: { lat: 25.7617, lng: -80.1918 },
  atlanta: { lat: 33.749, lng: -84.388 },
  seattle: { lat: 47.6062, lng: -122.3321 },
  'san-francisco': { lat: 37.7749, lng: -122.4194 },
  toronto: { lat: 43.6532, lng: -79.3832 },
  vancouver: { lat: 49.2827, lng: -123.1207 },
  'mexico-city': { lat: 19.4326, lng: -99.1332 },
};
