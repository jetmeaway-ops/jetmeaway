import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { googlePlacesNearby, type GoogleNearbyPlace } from '@/lib/google-places';

export const runtime = 'edge';

// ── Foursquare category → Scout category mapping ─────────────────────────────
const FSQ_CATEGORY_MAP: Record<string, { category: string; type: string }> = {
  // wellness
  '18021': { category: 'wellness', type: 'gym' },
  '18023': { category: 'wellness', type: 'yoga' },
  '18024': { category: 'wellness', type: 'swimming_pool' },
  '11072': { category: 'wellness', type: 'spa' },
  '18020': { category: 'wellness', type: 'fitness_centre' },
  // family
  '16032': { category: 'family', type: 'park' },
  '16028': { category: 'family', type: 'playground' },
  '10027': { category: 'family', type: 'zoo' },
  '10024': { category: 'family', type: 'aquarium' },
  '10039': { category: 'family', type: 'cinema' },
  '16000': { category: 'family', type: 'theme_park' },
  // attractions — the reason a traveller is IN this city. The owner's own
  // Paris stay surfaced three libraries under "family" and no sights at all;
  // a guide with no sights is a shopping list. (2026-08-30)
  '10025': { category: 'attractions', type: 'museum' },
  '10004': { category: 'attractions', type: 'gallery' },
  // wellness (18025 = Climbing Gym — without it, a climbing venue fell
  // through its own category list to the in-house cafe and was filed "cafe")
  '18025': { category: 'wellness', type: 'climbing' },
  // food — places you EAT. Supermarkets moved to "daily": sorting by
  // distance put Chen Market above every restaurant in the 13th.
  '13032': { category: 'food', type: 'cafe' },
  '13065': { category: 'food', type: 'restaurant' },
  '13002': { category: 'food', type: 'bakery' },
  '13003': { category: 'food', type: 'pub' },
  // daily
  '17069': { category: 'daily', type: 'supermarket' },
  '17062': { category: 'daily', type: 'convenience' },
  '12072': { category: 'daily', type: 'library' },
  '17028': { category: 'daily', type: 'pharmacy' },
  '11045': { category: 'daily', type: 'bank' },
  '11044': { category: 'daily', type: 'atm' },
  '11058': { category: 'daily', type: 'post_office' },
  '19042': { category: 'daily', type: 'station' },
  '19047': { category: 'daily', type: 'subway' },
  '19046': { category: 'daily', type: 'bus_stop' },
  '15014': { category: 'daily', type: 'hospital' },
  '15019': { category: 'daily', type: 'clinic' },
};

// ── Google Places (New) primary type → Scout category/type ──────────────────
// See https://developers.google.com/maps/documentation/places/web-service/place-types
const GOOGLE_TYPE_MAP: Record<string, { category: string; type: string }> = {
  // wellness
  gym: { category: 'wellness', type: 'gym' },
  yoga_studio: { category: 'wellness', type: 'yoga' },
  spa: { category: 'wellness', type: 'spa' },
  fitness_center: { category: 'wellness', type: 'fitness_centre' },
  swimming_pool: { category: 'wellness', type: 'swimming_pool' },
  // family
  park: { category: 'family', type: 'park' },
  playground: { category: 'family', type: 'playground' },
  zoo: { category: 'family', type: 'zoo' },
  aquarium: { category: 'family', type: 'aquarium' },
  movie_theater: { category: 'family', type: 'cinema' },
  amusement_park: { category: 'family', type: 'theme_park' },
  // attractions
  tourist_attraction: { category: 'attractions', type: 'attraction' },
  museum: { category: 'attractions', type: 'museum' },
  art_gallery: { category: 'attractions', type: 'gallery' },
  historical_landmark: { category: 'attractions', type: 'monument' },
  // food — places you EAT (supermarkets live under "daily")
  cafe: { category: 'food', type: 'cafe' },
  restaurant: { category: 'food', type: 'restaurant' },
  bakery: { category: 'food', type: 'bakery' },
  pub: { category: 'food', type: 'pub' },
  // daily
  supermarket: { category: 'daily', type: 'supermarket' },
  convenience_store: { category: 'daily', type: 'convenience' },
  library: { category: 'daily', type: 'library' },
  pharmacy: { category: 'daily', type: 'pharmacy' },
  bank: { category: 'daily', type: 'bank' },
  atm: { category: 'daily', type: 'atm' },
  post_office: { category: 'daily', type: 'post_office' },
  train_station: { category: 'daily', type: 'station' },
  subway_station: { category: 'daily', type: 'subway' },
  bus_station: { category: 'daily', type: 'bus_stop' },
  hospital: { category: 'daily', type: 'hospital' },
  doctor: { category: 'daily', type: 'clinic' },
};

// ── Overpass fallback tag mappings ────────────────────────────────────────────
const TAG_CATEGORIES: Record<string, { category: string; type: string }> = {
  'amenity=gym': { category: 'wellness', type: 'gym' },
  'leisure=fitness_centre': { category: 'wellness', type: 'fitness_centre' },
  'leisure=sports_centre': { category: 'wellness', type: 'sports_centre' },
  'sport=yoga': { category: 'wellness', type: 'yoga' },
  'sport=swimming': { category: 'wellness', type: 'swimming' },
  'leisure=swimming_pool': { category: 'wellness', type: 'swimming_pool' },
  'amenity=spa': { category: 'wellness', type: 'spa' },
  'shop=health_food': { category: 'wellness', type: 'health_food' },
  'leisure=sauna': { category: 'wellness', type: 'sauna' },
  'leisure=playground': { category: 'family', type: 'playground' },
  'leisure=park': { category: 'family', type: 'park' },
  'tourism=zoo': { category: 'family', type: 'zoo' },
  'tourism=aquarium': { category: 'family', type: 'aquarium' },
  'tourism=theme_park': { category: 'family', type: 'theme_park' },
  'amenity=cinema': { category: 'family', type: 'cinema' },
  'leisure=water_park': { category: 'family', type: 'water_park' },
  'amenity=ice_cream': { category: 'family', type: 'ice_cream' },
  'tourism=attraction': { category: 'attractions', type: 'attraction' },
  'tourism=viewpoint': { category: 'attractions', type: 'viewpoint' },
  'tourism=gallery': { category: 'attractions', type: 'gallery' },
  'tourism=museum': { category: 'attractions', type: 'museum' },
  'historic=monument': { category: 'attractions', type: 'monument' },
  'historic=memorial': { category: 'attractions', type: 'monument' },
  'historic=castle': { category: 'attractions', type: 'castle' },
  'sport=climbing': { category: 'wellness', type: 'climbing' },
  'amenity=cafe': { category: 'food', type: 'cafe' },
  'amenity=restaurant': { category: 'food', type: 'restaurant' },
  'shop=supermarket': { category: 'daily', type: 'supermarket' },
  'shop=bakery': { category: 'food', type: 'bakery' },
  'amenity=pub': { category: 'food', type: 'pub' },
  'shop=convenience': { category: 'daily', type: 'convenience' },
  'amenity=library': { category: 'daily', type: 'library' },
  'amenity=pharmacy': { category: 'daily', type: 'pharmacy' },
  'amenity=bank': { category: 'daily', type: 'bank' },
  'amenity=atm': { category: 'daily', type: 'atm' },
  'amenity=post_office': { category: 'daily', type: 'post_office' },
  'railway=station': { category: 'daily', type: 'station' },
  'station=subway': { category: 'daily', type: 'subway' },
  'public_transport=stop_position': { category: 'daily', type: 'stop_position' },
  'highway=bus_stop': { category: 'daily', type: 'bus_stop' },
  'amenity=hospital': { category: 'daily', type: 'hospital' },
  'amenity=clinic': { category: 'daily', type: 'clinic' },
};

// ── Haversine distance in metres ──────────────────────────────────────────────
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type ScoutPlace = {
  name: string;
  type: string;
  lat: number;
  lng: number;
  distance_m: number;
  walk_min: number;
};

type ScoutResponse = {
  hotel: { lat: number; lng: number };
  radius: number;
  quality: 'rich' | 'moderate' | 'thin' | 'empty';
  summary: { total: number; attractions: number; wellness: number; family: number; food: number; daily: number };
  categories: {
    attractions: ScoutPlace[];
    wellness: ScoutPlace[];
    family: ScoutPlace[];
    food: ScoutPlace[];
    daily: ScoutPlace[];
  };
  cached: boolean;
  fallback: boolean;
  source?: 'foursquare' | 'foursquare+google' | 'google' | 'overpass';
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// ── Foursquare Places API ─────────────────────────────────────────────────────
async function fetchFoursquare(lat: number, lng: number, radius: number): Promise<ScoutPlace[] | null> {
  const apiKey = process.env.FOURSQUARE_API_KEY;
  if (!apiKey) return null;

  const categoryIds = Object.keys(FSQ_CATEGORY_MAP).join(',');
  const url = `https://api.foursquare.com/v3/places/search?ll=${lat},${lng}&radius=${radius}&categories=${categoryIds}&limit=50&sort=DISTANCE`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      headers: {
        'Authorization': apiKey,
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();
    if (!data.results || !Array.isArray(data.results)) return null;

    const places: ScoutPlace[] = [];
    for (const place of data.results) {
      const name = place.name;
      if (!name) continue;

      const pLat = place.geocodes?.main?.latitude;
      const pLng = place.geocodes?.main?.longitude;
      if (!isFinite(pLat) || !isFinite(pLng)) continue;

      // Find matching category — EXACT ids across the whole list first, so a
      // venue's primary identity beats its in-house sideline (a climbing gym
      // also carries its cafe's category; taking the first hit filed it as
      // "cafe"). Prefix matching runs second, and a name-keyword rescue
      // catches sights whose ids we do not map.
      let info: { category: string; type: string } | null = null;
      const cats = (place.categories || []) as Array<{ id?: unknown; name?: unknown }>;
      for (const cat of cats) {
        const exact = FSQ_CATEGORY_MAP[String(cat.id)];
        if (exact) { info = exact; break; }
      }
      if (!info) {
        for (const cat of cats) {
          const byPrefix = FSQ_CATEGORY_MAP[String(cat.id).slice(0, 5)];
          if (byPrefix) { info = byPrefix; break; }
        }
      }
      if (!info) {
        const catNames = cats.map((c) => String(c.name || '')).join(' ');
        if (/landmark|monument|historic|castle|palace|cathedral|scenic|gallery/i.test(catNames)) {
          info = { category: 'attractions', type: 'attraction' };
        } else if (/climb/i.test(catNames)) {
          info = { category: 'wellness', type: 'climbing' };
        }
      }
      if (!info) continue;

      const dist = haversine(lat, lng, pLat, pLng);
      places.push({
        name,
        type: info.type,
        lat: pLat,
        lng: pLng,
        distance_m: Math.round(dist),
        walk_min: Math.max(1, Math.round(dist / 80)),
      });
    }

    return places.length > 0 ? places : null;
  } catch {
    return null;
  }
}

// ── Google Places (New) Nearby Search ────────────────────────────────────────
// Maps Google primary types → Scout's category/type taxonomy. Used as a
// gap-filler when Foursquare returns < 15 places, or as the primary source
// when FOURSQUARE_API_KEY is missing entirely.
async function fetchGoogle(lat: number, lng: number, radius: number): Promise<ScoutPlace[] | null> {
  const includedTypes = Object.keys(GOOGLE_TYPE_MAP);
  let raw: GoogleNearbyPlace[];
  try {
    raw = await googlePlacesNearby(lat, lng, radius, includedTypes);
  } catch {
    return null;
  }
  if (raw.length === 0) return null;

  const places: ScoutPlace[] = [];
  for (const p of raw) {
    let info: { category: string; type: string } | null = null;
    for (const t of p.types) {
      if (GOOGLE_TYPE_MAP[t]) { info = GOOGLE_TYPE_MAP[t]; break; }
    }
    // Same trap as Foursquare: a venue's SIDELINE can be its first mapped
    // type. Google files Climb Up's in-house cafe before any sport type, so
    // the climbing gym rendered as "cafe" in the guide (verified live at the
    // owner's Paris hotel, 2026-08-30). The name says what the place is.
    if (info?.category === 'food' && /climb/i.test(p.name || '')) {
      info = { category: 'wellness', type: 'climbing' };
    }
    if (!info) continue;

    const dist = haversine(lat, lng, p.lat, p.lng);
    places.push({
      name: p.name,
      type: info.type,
      lat: p.lat,
      lng: p.lng,
      distance_m: Math.round(dist),
      walk_min: Math.max(1, Math.round(dist / 80)),
    });
  }
  return places.length > 0 ? places : null;
}

// ── Overpass API (fallback) ───────────────────────────────────────────────────
function buildOverpassQuery(lat: number, lng: number, radius: number): string {
  const tagFilters: string[] = [];
  for (const key of Object.keys(TAG_CATEGORIES)) {
    const [k, v] = key.split('=');
    tagFilters.push(`node["${k}"="${v}"](around:${radius},${lat},${lng});`);
    tagFilters.push(`way["${k}"="${v}"](around:${radius},${lat},${lng});`);
  }
  return `[out:json][timeout:10];(${tagFilters.join('')});out center;`;
}

function classifyElement(tags: Record<string, string>): { category: string; type: string } | null {
  for (const [tagKey, info] of Object.entries(TAG_CATEGORIES)) {
    const [k, v] = tagKey.split('=');
    if (tags[k] === v) return info;
  }
  return null;
}

async function fetchOverpass(lat: number, lng: number, radius: number): Promise<ScoutPlace[] | null> {
  const query = buildOverpassQuery(lat, lng, radius);
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();
    const elements = data.elements || [];
    if (elements.length === 0) return null;

    const places: ScoutPlace[] = [];
    for (const el of elements) {
      const tags = el.tags || {};
      const name = tags.name || tags['name:en'];
      if (!name) continue;

      const info = classifyElement(tags);
      if (!info) continue;

      const elLat = el.lat ?? el.center?.lat;
      const elLng = el.lon ?? el.center?.lon;
      if (!isFinite(elLat) || !isFinite(elLng)) continue;

      const dist = haversine(lat, lng, elLat, elLng);
      places.push({
        name,
        type: info.type,
        lat: elLat,
        lng: elLng,
        distance_m: Math.round(dist),
        walk_min: Math.max(1, Math.round(dist / 80)),
      });
    }

    return places.length > 0 ? places : null;
  } catch {
    return null;
  }
}

// ── Bucket, sort, limit ───────────────────────────────────────────────────────
function bucketPlaces(places: ScoutPlace[]): Record<string, ScoutPlace[]> {
  const buckets: Record<string, ScoutPlace[]> = { attractions: [], wellness: [], family: [], food: [], daily: [] };
  const seen = new Set<string>();

  // Build a reverse lookup: type → category
  const typeToCategory: Record<string, string> = {};
  for (const info of Object.values(FSQ_CATEGORY_MAP)) {
    typeToCategory[info.type] = info.category;
  }
  for (const info of Object.values(TAG_CATEGORIES)) {
    typeToCategory[info.type] = info.category;
  }

  for (const place of places) {
    const cat = typeToCategory[place.type];
    if (!cat || !buckets[cat]) continue;

    const dedupKey = `${cat}:${place.name}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    buckets[cat].push(place);
  }

  for (const cat of Object.keys(buckets)) {
    buckets[cat].sort((a, b) => a.distance_m - b.distance_m);
    buckets[cat] = buckets[cat].slice(0, 5);
  }

  return buckets;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const lat = Number(body.latitude);
    const lng = Number(body.longitude);
    const radius = Number(body.radius) || 1000;

    if (!isFinite(lat) || !isFinite(lng)) {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400, headers: CORS });
    }

    // ── Step 1: Check KV cache ──
    // v4 (2026-08-30): v3's climb regex contained a literal BACKSPACE byte (a
    // python 'backslash-b' escape leaked into the pattern) and could never match, so v3
    // entries hold the wrong row; v2 added attractions and moved supermarkets out of
    // food — a v1 entry would render a guide with no sights for a day.
    const cacheKey = `scout:v4:${lat.toFixed(3)}:${lng.toFixed(3)}`;
    try {
      const cached = await kv.get<ScoutResponse>(cacheKey);
      if (cached) {
        cached.cached = true;
        return NextResponse.json(cached, { headers: CORS });
      }
    } catch {
      // KV unavailable — proceed without cache
    }

    // ── Step 2: Source ladder ──
    // Foursquare primary → Google gap-filler (when Foursquare thin or absent)
    // → Overpass as last resort. Google adds high-fidelity coverage in places
    // Foursquare misses (small UK boroughs, non-Western markets). The shared
    // bucketPlaces dedupes by (category, name) so merging is safe.
    const FOURSQUARE_THIN_THRESHOLD = 15;
    let places: ScoutPlace[] | null = null;
    let source: ScoutResponse['source'] = 'foursquare';

    const fsq = await fetchFoursquare(lat, lng, radius);

    if (fsq && fsq.length >= FOURSQUARE_THIN_THRESHOLD) {
      // Foursquare is dense enough on its own — skip Google to save cost.
      places = fsq;
      source = 'foursquare';
    } else if (fsq && fsq.length > 0) {
      // Foursquare thin — top up with Google.
      const google = await fetchGoogle(lat, lng, radius);
      if (google && google.length > 0) {
        places = [...fsq, ...google];
        source = 'foursquare+google';
      } else {
        places = fsq;
        source = 'foursquare';
      }
    } else {
      // No Foursquare (key missing or returned null) — try Google as primary.
      const google = await fetchGoogle(lat, lng, radius);
      if (google && google.length > 0) {
        places = google;
        source = 'google';
      } else {
        // Last resort: free OSM data via Overpass.
        places = await fetchOverpass(lat, lng, radius);
        source = 'overpass';
      }
    }

    if (!places) {
      return NextResponse.json(
        {
          hotel: { lat, lng },
          radius,
          quality: 'empty' as const,
          summary: { total: 0, attractions: 0, wellness: 0, family: 0, food: 0, daily: 0 },
          categories: { attractions: [], wellness: [], family: [], food: [], daily: [] },
          cached: false,
          fallback: true,
          source,
          message: 'Neighbourhood data is temporarily unavailable. Please try again shortly.',
        },
        { headers: CORS }
      );
    }

    // ── Step 3: Bucket & summarise ──
    const buckets = bucketPlaces(places);

    const summary = {
      total: buckets.attractions.length + buckets.wellness.length + buckets.family.length + buckets.food.length + buckets.daily.length,
      attractions: buckets.attractions.length,
      wellness: buckets.wellness.length,
      family: buckets.family.length,
      food: buckets.food.length,
      daily: buckets.daily.length,
    };

    const quality: ScoutResponse['quality'] =
      summary.total >= 12 ? 'rich' :
      summary.total >= 6 ? 'moderate' :
      summary.total >= 1 ? 'thin' : 'empty';

    const response: ScoutResponse = {
      hotel: { lat, lng },
      radius,
      quality,
      summary,
      categories: {
        attractions: buckets.attractions,
        wellness: buckets.wellness,
        family: buckets.family,
        food: buckets.food,
        daily: buckets.daily,
      },
      cached: false,
      fallback: false,
      source,
    };

    // ── Step 4: Store in KV ──
    try {
      await kv.set(cacheKey, response, { ex: 86400 });
    } catch {
      // KV unavailable — continue without caching
    }

    return NextResponse.json(response, { headers: CORS });
  } catch {
    return NextResponse.json(
      {
        hotel: { lat: 0, lng: 0 },
        radius: 1000,
        quality: 'empty' as const,
        summary: { total: 0, attractions: 0, wellness: 0, family: 0, food: 0, daily: 0 },
        categories: { attractions: [], wellness: [], family: [], food: [], daily: [] },
        cached: false,
        fallback: true,
        message: 'Neighbourhood data is temporarily unavailable. Please try again shortly.',
      },
      { status: 500, headers: CORS }
    );
  }
}
