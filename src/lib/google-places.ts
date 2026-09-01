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

export type GoogleNearbyPlace = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  types: string[];
};

const AUTOCOMPLETE_ENDPOINT = 'https://places.googleapis.com/v1/places:autocomplete';
const NEARBY_ENDPOINT = 'https://places.googleapis.com/v1/places:searchNearby';

// ── Daily spend gate ────────────────────────────────────────────────────────
// August 2026's bill (£73/30d, £217 forecast) was this file with no ceiling:
// crawler traffic re-buying the same photos every cache expiry. Every paid
// call now charges an approximate cost (tenths of a penny, Places API (New)
// SKU prices × USD→GBP) against a per-day KV counter. Once the day's budget
// is spent, paid helpers return their empty value and callers fall back —
// degraded enrichment, never a broken page. The meter FAILS OPEN on KV
// errors: a KV blip must not take out destination search to save 2p.
// 55p/day ≈ £16.50/month ceiling, under the owner's £20/month target.
import { kv } from '@vercel/kv';

const DAILY_BUDGET_TENTHS = Math.round(
  Number(process.env.GOOGLE_PLACES_DAILY_BUDGET_PENCE || '55') * 10,
);

const COST_TENTHS = {
  autocomplete: 3, // $2.83/1k ≈ 0.22p
  details: 14,     // Pro fieldmask ≈ 1.4p
  textSearch: 26,  // ≈ 2.6p
  photo: 6,        // $7/1k ≈ 0.55p
  nearby: 26,      // ≈ 2.6p
} as const;

async function chargeBudget(tenths: number): Promise<boolean> {
  try {
    const key = `google-places:spend:${new Date().toISOString().slice(0, 10)}`;
    const total = await kv.incrby(key, tenths);
    // First charge of the day sets the expiry; 50h covers timezone skew.
    if (total === tenths) {
      try { await kv.expire(key, 60 * 60 * 50); } catch { /* best-effort */ }
    }
    return total <= DAILY_BUDGET_TENTHS;
  } catch {
    return true;
  }
}

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
  if (!(await chargeBudget(COST_TENTHS.autocomplete))) return [];

  try {
    const res = await fetch(AUTOCOMPLETE_ENDPOINT, {
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

const DETAILS_ENDPOINT = 'https://places.googleapis.com/v1/places';

/**
 * Place Details — return WGS84 lat/lng for a Google placeId. Used by
 * /api/hotels when the searched city has no CITY_COORDS entry so the
 * geo-proximity filter can still trim LiteAPI's broad regional results
 * back to actual proximity. Returns null on any error / missing key.
 *
 * Field mask is `id,location` only — keeps us on the cheapest SKU.
 * Caller is responsible for caching (the route layer KV-caches results).
 */
export async function googlePlaceDetails(
  placeId: string,
  signal?: AbortSignal,
): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;
  if (!placeId) return null;
  if (!(await chargeBudget(COST_TENTHS.details))) return null;

  try {
    const res = await fetch(`${DETAILS_ENDPOINT}/${encodeURIComponent(placeId)}`, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'id,location',
      },
      signal,
    });
    if (!res.ok) {
      console.error('[google-places:details] HTTP', res.status, await res.text().catch(() => ''));
      return null;
    }
    const data = await res.json() as { location?: { latitude?: number; longitude?: number } };
    const lat = data.location?.latitude;
    const lng = data.location?.longitude;
    if (typeof lat !== 'number' || typeof lng !== 'number') return null;
    return { lat, lng };
  } catch (err) {
    console.error('[google-places:details]', err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Nearby Search — POIs within `radiusM` metres of (lat, lng), filtered by
 * Google's primary place types. Used by Scout as a high-fidelity gap-filler
 * after Foursquare. Field mask is kept minimal to stay on the cheaper SKU
 * (~$32 per 1k requests as of 2026-04). Returns [] on any error / missing key.
 *
 * `includedTypes` are Google's "primary type" tokens — see
 * https://developers.google.com/maps/documentation/places/web-service/place-types
 */
// ---------------------------------------------------------------------------
// Hotel photos + reviews enrichment.
// ---------------------------------------------------------------------------
// Used to top up the gallery + reviews on the hotel detail page when LiteAPI
// is light on imagery. Two-call flow:
//   1. Text Search by hotel name + location bias to resolve a placeId.
//   2. Place Details with field mask `photos,reviews,rating,userRatingCount`.
// Then for each photo `name`, a media call resolves the short-lived CDN URI
// (`skipHttpRedirect=true` → JSON `photoUri`). Callers KV-cache the result
// (24h) so a hotel detail page only burns quota on the first visitor per day.
//
// Cost (2026-05): Text Search $32/1k, Place Details $25/1k Pro SKU,
// Photo Media $7/1k. Six photos per hotel ≈ $0.10 first-fetch then free
// for 24h. With our current KV-cached pattern this stays inside the
// $200/mo Google credit even at 50k hotel detail views/mo.

const TEXT_SEARCH_ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';

export type GoogleHotelReview = {
  authorName: string;
  authorPhoto: string | null;
  rating: number;
  text: string;
  relativeTime: string;
  publishTime: string | null;
};

export type GoogleHotelEnrichment = {
  placeId: string | null;
  rating: number | null;            // 1-5 Google rating
  ratingCount: number | null;       // total Google reviews
  photos: string[];                 // resolved photoUri CDN URLs (no API key in URL)
  reviews: GoogleHotelReview[];     // up to 5 most-relevant reviews
  editorialSummary: string | null;  // Google's short editorial blurb
  websiteUri: string | null;        // hotel's official site
  phone: string | null;             // international format
  priceLevel: string | null;        // PRICE_LEVEL_INEXPENSIVE | _MODERATE | _EXPENSIVE | _VERY_EXPENSIVE
  formattedAddress: string | null;  // multi-line postal address
  googleMapsUri: string | null;     // canonical Google Maps URL
  openingHours: string[] | null;    // weekly schedule, one entry per day
};

/**
 * Resolve a hotel to a Google placeId via Text Search.
 * Includes location bias when coords are supplied so we don't match a
 * different "Hotel X" on the wrong continent.
 */
export async function googleHotelPlaceId(
  name: string,
  lat?: number,
  lng?: number,
  signal?: AbortSignal,
): Promise<string | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey || !name) return null;
  if (!(await chargeBudget(COST_TENTHS.textSearch))) return null;

  const body: Record<string, unknown> = {
    textQuery: name,
    includedType: 'lodging',
    maxResultCount: 1,
  };
  if (typeof lat === 'number' && typeof lng === 'number' && isFinite(lat) && isFinite(lng)) {
    body.locationBias = {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: 5000,
      },
    };
  }

  try {
    const res = await fetch(TEXT_SEARCH_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id',
      },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) {
      console.error('[google-places:textSearch] HTTP', res.status, await res.text().catch(() => ''));
      return null;
    }
    const data = await res.json() as { places?: Array<{ id?: string }> };
    return data.places?.[0]?.id ?? null;
  } catch (err) {
    console.error('[google-places:textSearch]', err instanceof Error ? err.message : err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Build-time resilience for single-photo hotel resolution.
// ---------------------------------------------------------------------------
// Blog pages are statically generated (generateStaticParams, no revalidate),
// so every <HotelPhoto> resolves its image via a LIVE Google call AT BUILD
// TIME. A 40-50 hotel post fires that many Text Search + Photo Media pairs
// at once; Google rate-limits / times out under the burst, the hotels fall
// back to generic stock, and that stock is then frozen into the static HTML
// until the next rebuild (which bursts and fails the same way). Athens (46
// hotels) hit 0/46 real photos this way.
//
// Two guards make a build reliable without changing the caller contract:
//   1. a process-wide concurrency cap so we never burst Google, and
//   2. per-attempt timeout + bounded retry on TRANSIENT errors (429 / 5xx /
//      abort) — a clean "no photo for this hotel" result is NOT retried.
const PHOTO_MAX_CONCURRENT = 5;
const PHOTO_ATTEMPTS = 3;
const PHOTO_ATTEMPT_TIMEOUT_MS = 10_000;

let photoActive = 0;
const photoWaiters: Array<() => void> = [];

async function acquirePhotoSlot(): Promise<void> {
  if (photoActive < PHOTO_MAX_CONCURRENT) {
    photoActive++;
    return;
  }
  // Wait for release() to hand a slot over. The count is carried across the
  // handover (release neither ++ nor -- when a waiter exists) so we never
  // over-admit past PHOTO_MAX_CONCURRENT.
  await new Promise<void>((resolve) => photoWaiters.push(resolve));
}

function releasePhotoSlot(): void {
  const next = photoWaiters.shift();
  if (next) next();
  else photoActive--;
}

type PhotoOnce =
  | { kind: 'ok'; url: string }
  | { kind: 'miss' }        // hotel genuinely has no Google photo — do not retry
  | { kind: 'transient' };  // rate limit / server error — retry

/** True for HTTP statuses worth retrying (rate limit, server error). */
function isTransientStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

/** One Text Search → Photo Media pass. Never throws on HTTP status. */
async function resolveFirstPhotoOnce(
  query: string,
  apiKey: string,
  signal: AbortSignal,
): Promise<PhotoOnce> {
  // Text Search — first place's first photo name (saves a Place Details call).
  const res = await fetch(TEXT_SEARCH_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.photos.name',
    },
    body: JSON.stringify({ textQuery: query, includedType: 'lodging', maxResultCount: 1 }),
    signal,
  });
  if (!res.ok) {
    if (isTransientStatus(res.status)) return { kind: 'transient' };
    console.error('[google-places:firstPhoto] HTTP', res.status, await res.text().catch(() => ''));
    return { kind: 'miss' };
  }
  const data = await res.json() as {
    places?: Array<{ id?: string; photos?: Array<{ name?: string }> }>;
  };
  const photoName = data.places?.[0]?.photos?.[0]?.name;
  if (!photoName) return { kind: 'miss' };

  const mediaRes = await fetch(
    `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=1200&skipHttpRedirect=true`,
    { headers: { 'X-Goog-Api-Key': apiKey }, signal },
  );
  if (!mediaRes.ok) {
    if (isTransientStatus(mediaRes.status)) return { kind: 'transient' };
    return { kind: 'miss' };
  }
  const mediaData = await mediaRes.json() as { photoUri?: string };
  return mediaData.photoUri ? { kind: 'ok', url: mediaData.photoUri } : { kind: 'miss' };
}

/**
 * Cheaper variant — just one photo, used by blog posts where we only
 * need a single hero shot per recommended hotel. Two API calls:
 * Text Search → Photo Media (skipping the Place Details photos field
 * which is the expensive part of full enrichment).
 *
 * Returns the resolved CDN photo URL (lh3.googleusercontent.com/places/…)
 * or null (missing key, hotel has no Google photo, or every retry failed).
 * Never throws. Self-manages timeout, retry and concurrency (see above) so
 * a caller must NOT wrap it in its own short timeout — that would cut the
 * retries short during a static build. Caller is responsible for caching.
 *
 * Cost: Text Search $32/1k + Photo Media $7/1k ≈ $0.04 per hotel
 * first-fetch — half the cost of the full enrichment path.
 */
export async function googleHotelFirstPhoto(
  query: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey || !query) return null;
  // Text Search + Photo Media pair — the SKU combination behind the August bill.
  if (!(await chargeBudget(COST_TENTHS.textSearch + COST_TENTHS.photo))) return null;

  await acquirePhotoSlot();
  try {
    for (let attempt = 0; attempt < PHOTO_ATTEMPTS; attempt++) {
      if (signal?.aborted) return null;

      // Per-attempt timeout, chained to any outer cancellation signal.
      const ctrl = new AbortController();
      const onOuterAbort = () => ctrl.abort();
      signal?.addEventListener('abort', onOuterAbort, { once: true });
      const timer = setTimeout(() => ctrl.abort(), PHOTO_ATTEMPT_TIMEOUT_MS);
      try {
        const r = await resolveFirstPhotoOnce(query, apiKey, ctrl.signal);
        if (r.kind === 'ok') return r.url;
        if (r.kind === 'miss') return null;   // clean miss — do not retry
        // r.kind === 'transient' → fall through to backoff + retry
      } catch (err) {
        // Outer cancellation → stop. Otherwise (network error / attempt
        // timeout) treat as transient and retry.
        if (signal?.aborted) return null;
        console.error('[google-places:firstPhoto]', err instanceof Error ? err.message : err);
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onOuterAbort);
      }

      // Linear backoff before the next attempt (skip after the last).
      if (attempt < PHOTO_ATTEMPTS - 1) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }
    return null;   // exhausted retries — caller uses its fallback for this render
  } finally {
    releasePhotoSlot();
  }
}

/**
 * Fetch photos + reviews for a hotel by Google placeId.
 * Resolves up to 6 photo URLs (1200px max width) and returns the 5 reviews
 * Google ranks as most relevant. Returns null on any error.
 */
export async function googleHotelEnrichment(
  placeId: string,
  signal?: AbortSignal,
): Promise<Omit<GoogleHotelEnrichment, 'placeId'> | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey || !placeId) return null;
  // Details (Pro fieldmask) + up to 6 Photo Media resolutions.
  if (!(await chargeBudget(COST_TENTHS.details + 6 * COST_TENTHS.photo))) return null;

  type PlaceDetails = {
    rating?: number;
    userRatingCount?: number;
    photos?: Array<{ name?: string }>;
    reviews?: Array<{
      authorAttribution?: {
        displayName?: string;
        photoUri?: string;
      };
      rating?: number;
      text?: { text?: string };
      relativePublishTimeDescription?: string;
      publishTime?: string;
    }>;
    editorialSummary?: { text?: string };
    websiteUri?: string;
    internationalPhoneNumber?: string;
    nationalPhoneNumber?: string;
    priceLevel?: string;
    formattedAddress?: string;
    googleMapsUri?: string;
    regularOpeningHours?: { weekdayDescriptions?: string[] };
    currentOpeningHours?: { weekdayDescriptions?: string[] };
  };

  let details: PlaceDetails | null = null;
  try {
    const res = await fetch(`${DETAILS_ENDPOINT}/${encodeURIComponent(placeId)}`, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': [
          'rating',
          'userRatingCount',
          'photos',
          'reviews',
          'editorialSummary',
          'websiteUri',
          'internationalPhoneNumber',
          'nationalPhoneNumber',
          'priceLevel',
          'formattedAddress',
          'googleMapsUri',
          'regularOpeningHours.weekdayDescriptions',
          'currentOpeningHours.weekdayDescriptions',
        ].join(','),
      },
      signal,
    });
    if (!res.ok) {
      console.error('[google-places:enrich] HTTP', res.status, await res.text().catch(() => ''));
      return null;
    }
    details = await res.json();
  } catch (err) {
    console.error('[google-places:enrich]', err instanceof Error ? err.message : err);
    return null;
  }
  if (!details) return null;

  // Resolve up to 6 photos in parallel — each call hits the Photo Media SKU.
  const photoNames = (details.photos ?? []).slice(0, 6).map((p) => p.name).filter(Boolean) as string[];
  const photoUris = await Promise.all(
    photoNames.map(async (name): Promise<string | null> => {
      try {
        const url = `https://places.googleapis.com/v1/${name}/media?maxWidthPx=1200&skipHttpRedirect=true`;
        const r = await fetch(url, {
          headers: { 'X-Goog-Api-Key': apiKey },
          signal,
        });
        if (!r.ok) return null;
        const d = await r.json() as { photoUri?: string };
        return d.photoUri ?? null;
      } catch {
        return null;
      }
    }),
  );

  const reviews: GoogleHotelReview[] = (details.reviews ?? [])
    .slice(0, 5)
    .map((r) => ({
      authorName: r.authorAttribution?.displayName ?? 'Google reviewer',
      authorPhoto: r.authorAttribution?.photoUri ?? null,
      rating: typeof r.rating === 'number' ? r.rating : 0,
      text: r.text?.text ?? '',
      relativeTime: r.relativePublishTimeDescription ?? '',
      publishTime: r.publishTime ?? null,
    }))
    .filter((r) => r.text.length > 0);

  const openingHours =
    details.currentOpeningHours?.weekdayDescriptions ??
    details.regularOpeningHours?.weekdayDescriptions ??
    null;

  return {
    rating: typeof details.rating === 'number' ? details.rating : null,
    ratingCount: typeof details.userRatingCount === 'number' ? details.userRatingCount : null,
    photos: photoUris.filter((u): u is string => !!u),
    reviews,
    editorialSummary: details.editorialSummary?.text ?? null,
    websiteUri: details.websiteUri ?? null,
    phone: details.internationalPhoneNumber ?? details.nationalPhoneNumber ?? null,
    priceLevel: details.priceLevel ?? null,
    formattedAddress: details.formattedAddress ?? null,
    googleMapsUri: details.googleMapsUri ?? null,
    openingHours,
  };
}

export async function googlePlacesNearby(
  lat: number,
  lng: number,
  radiusM: number,
  includedTypes: string[],
  signal?: AbortSignal,
): Promise<GoogleNearbyPlace[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return [];
  if (!isFinite(lat) || !isFinite(lng)) return [];
  if (includedTypes.length === 0) return [];
  if (!(await chargeBudget(COST_TENTHS.nearby))) return [];

  try {
    const res = await fetch(NEARBY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.types',
      },
      body: JSON.stringify({
        includedTypes,
        maxResultCount: 20,
        // Google caps the searchNearby radius at 50,000m; clamp defensively.
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: Math.min(Math.max(radiusM, 1), 50_000),
          },
        },
      }),
      signal,
    });

    if (!res.ok) {
      console.error('[google-places:nearby] HTTP', res.status, await res.text().catch(() => ''));
      return [];
    }

    const data = await res.json() as {
      places?: Array<{
        id?: string;
        displayName?: { text?: string };
        location?: { latitude?: number; longitude?: number };
        types?: string[];
      }>;
    };

    const out: GoogleNearbyPlace[] = [];
    for (const p of data.places ?? []) {
      const name = p.displayName?.text;
      const pLat = p.location?.latitude;
      const pLng = p.location?.longitude;
      if (!p.id || !name || !isFinite(pLat ?? NaN) || !isFinite(pLng ?? NaN)) continue;
      out.push({
        id: p.id,
        name,
        lat: pLat as number,
        lng: pLng as number,
        types: p.types ?? [],
      });
    }
    return out;
  } catch (err) {
    console.error('[google-places:nearby]', err instanceof Error ? err.message : err);
    return [];
  }
}
