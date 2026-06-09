import { DESTINATIONS } from '@/data/destinations';

/**
 * Resolve a wide (≈1600px) hero/background image for a searched city.
 *
 * Used as the full-page backdrop behind hotel + flight RESULTS so a search
 * for "Lahore" opens against a Lahore skyline, "Bangkok" against Bangkok,
 * etc. The image only loads AFTER a search fires, so it never touches the
 * initial-paint performance budget (mobile Perf 90 / LCP).
 *
 * Resolution order (mirrors the curated → fallback pattern already used by
 * src/components/blog/HotelPhoto.tsx):
 *   1. Curated `Destination.heroImage` — hand-picked, correct city photo.
 *      Covers ~41 cities (Lahore, Islamabad, Dubai, Bangkok, …). Matched
 *      case-insensitively against `city` / `slug`, with a startsWith pass so
 *      "London Heathrow" / "Paris CDG" still resolve.
 *   2. Neutral travel pool — a deterministic, city-seeded pick of premium
 *      travel imagery for the ~120 search cities / 250 airports that aren't
 *      curated yet. Deliberately city-NEUTRAL (no recognisable skyline) so we
 *      never show a wrong landmark; the heavy scrim renders it as ambient
 *      texture. Promote popular cities into DESTINATIONS over time.
 *
 * Safe to call with any string; empty/unknown input returns a stable
 * neutral image.
 */

// Daytime backdrop overrides — used ONLY for the full-page results backdrop,
// NOT for the destination-page hero (where a darker shot helps overlaid text
// contrast). Keyed by lowercase city name / slug. Add here whenever a curated
// heroImage is a dusk/night shot that reads too dark as a bright backdrop.
// Every URL is verified to load + confirmed daytime before being added.
const BACKDROP_OVERRIDES: Record<string, string> = {
  // Lahore's curated heroImage is a dusk aerial of Badshahi Mosque — too dark
  // as a backdrop. Bright daytime Lahore Fort (Alamgiri Gate), blue sky.
  lahore:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Lahore_Fort_view_from_Baradari.jpg/1280px-Lahore_Fort_view_from_Baradari.jpg',
};

// Verified Unsplash IDs (already in production use via HotelPhoto's pool) —
// premium, city-neutral travel/interior shots. Deterministic seeding keeps a
// given city on a stable image (good for browser caching + no flicker).
const NEUTRAL_POOL: string[] = [
  '1566073771259-6a8506099945', // luxury suite interior
  '1582719508461-905c673771fd', // pool deck at dusk
  '1551882547-ff40c63fe5fa',    // grand lobby
  '1564501049412-61c2a3083791', // suite with view
  '1571896349842-33c89424de2d', // bedroom
  '1590490360182-c33d57733427', // courtyard
  '1576675784201-0e142b423952', // rooftop terrace
  '1455587734955-081b22074882', // boutique façade
];

/** djb2 hash → stable index. No Math.random (edge-safe, reproducible). */
function hashIndex(input: string, mod: number): number {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % mod;
}

export function cityHeroImage(city?: string | null): string {
  const needle = (city || '').trim().toLowerCase();

  if (needle) {
    // 0. Daytime backdrop override by raw input (city name / slug / iata).
    if (BACKDROP_OVERRIDES[needle]) return BACKDROP_OVERRIDES[needle];

    // 1. Exact curated match on city name, slug, or IATA code (flights may
    //    pass just an airport code like "BKK" / "LHE").
    let match = DESTINATIONS.find(
      (d) =>
        d.city.toLowerCase() === needle ||
        d.slug === needle ||
        d.iata.toLowerCase() === needle,
    );
    // 2. startsWith pass — "London Heathrow" → London, "Paris CDG" → Paris.
    if (!match) {
      match = DESTINATIONS.find((d) => {
        const c = d.city.toLowerCase();
        return needle.startsWith(c) || c.startsWith(needle);
      });
    }
    if (match) {
      // A matched destination may still have a daytime override keyed by its
      // slug (e.g. an IATA / "London Heathrow" input that resolved to Lahore).
      if (BACKDROP_OVERRIDES[match.slug]) return BACKDROP_OVERRIDES[match.slug];
      if (match.heroImage) return match.heroImage;
    }
  }

  // 3. Neutral, deterministic fallback.
  const seed = needle || 'travel';
  const id = NEUTRAL_POOL[hashIndex(seed, NEUTRAL_POOL.length)];
  return `https://images.unsplash.com/photo-${id}?w=1600&h=1000&fit=crop&fm=webp&q=70`;
}
