/**
 * Google Places API (New) — server-side helper.
 *
 * Used as a coverage-gap fallback when LiteAPI's /data/places returns
 * very few results for a destination autocomplete query. Server-side
 * only — the API key MUST stay in process.env, never exposed to the
 * browser.
 *
 * The key lives in Vercel as `GOOGLE_PLACES_API_KEY`. It's restricted
 * to the Places API (New) only, no application restrictions (because
 * Edge runtime requests don't carry a browser referrer).
 *
 * Cost (2026-04): ~$2.83 per 1k autocomplete sessions. Free $200/mo
 * Google Cloud credit covers ~70k sessions before any charge.
 */

export type GooglePlacePrediction = {
  placeId: string;
  mainText: string;       // e.g. "Paris"
  secondaryText: string;  // e.g. "France"
  fullText: string;       // e.g. "Paris, France"
  types: string[];        // e.g. ["locality","political"]
};

const ENDPOINT = 'https://places.googleapis.com/v1/places:autocomplete';

/**
 * Fetch city-level autocomplete suggestions from Google.
 * Returns [] on any error / missing key — never throws, so callers
 * can use it inside a Promise.all without breaking the primary flow.
 */
export async function googlePlacesAutocomplete(
  query: string,
  signal?: AbortSignal,
): Promise<GooglePlacePrediction[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return [];
  if (!query || query.trim().length < 2) return [];

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify({
        input: query.trim(),
        // (cities) = locality + administrative_area_level_3.
        // Keeps results focused on places a user would actually book a hotel.
        includedPrimaryTypes: ['(cities)'],
        languageCode: 'en',
      }),
      signal,
      // Server-side; no caching layer here — caller (api/hotels/places) handles KV.
    });

    if (!res.ok) {
      console.error('[google-places] HTTP', res.status, await res.text().catch(() => ''));
      return [];
    }

    const data = await res.json() as {
      suggestions?: Array<{
        placePrediction?: {
          placeId: string;
          text?: { text: string };
          structuredFormat?: {
            mainText?: { text: string };
            secondaryText?: { text: string };
          };
          types?: string[];
        };
      }>;
    };

    const out: GooglePlacePrediction[] = [];
    for (const s of data.suggestions ?? []) {
      const p = s.placePrediction;
      if (!p?.placeId) continue;
      const main = p.structuredFormat?.mainText?.text ?? p.text?.text ?? '';
      const secondary = p.structuredFormat?.secondaryText?.text ?? '';
      if (!main) continue;
      out.push({
        placeId: p.placeId,
        mainText: main,
        secondaryText: secondary,
        fullText: p.text?.text ?? [main, secondary].filter(Boolean).join(', '),
        types: p.types ?? [],
      });
    }
    return out;
  } catch (err) {
    console.error('[google-places]', err instanceof Error ? err.message : err);
    return [];
  }
}
