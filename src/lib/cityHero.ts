import { DESTINATIONS } from '@/data/destinations';

/**
 * Resolve a wide (~1400px) place photo for a searched city, used as the
 * full-page backdrop behind hotel + flight RESULTS. Loads only AFTER a search
 * fires, so it never touches initial-paint perf (mobile 90 / LCP).
 *
 * Resolution order:
 *   1. curatedCityImage() (sync) — URL/Commons overrides + Destination.heroImage.
 *   2. fetchCityImage() (async) — the real Wikipedia lead photo for ANY other
 *      destination (Antalya → beach, Leukerbad → alps, Bangkok → skyline).
 *      Programmatic, so it covers all ~250 searchable cities + future ones.
 *   3. neutralCityImage() — deterministic travel pool, last resort only.
 *
 * The Wikipedia lookup runs client-side (its REST API sends CORS headers): no
 * new API route, no edge concern, no KV. All image URLs resolve to
 * upload.wikimedia.org / images.unsplash.com — stable CDNs already in use.
 *
 * WHY the override + alias maps exist: most proper cities have a good Wikipedia
 * "page image" (a cityscape). But ISLANDS/REGIONS/small countries infobox a
 * FLAG or locator MAP (Maldives, Bali, Sicily…), and some names are
 * DISAMBIGUATION pages (Queenstown, Newcastle, Split…). Those two classes can't
 * be resolved programmatically, so they get hand-verified Commons photos
 * (COMMONS_FILES / URL_OVERRIDES) or a more specific Wikipedia title
 * (WIKI_TITLE_ALIASES). Everything else flows through fetchCityImage.
 */

// Hand-verified Wikimedia Commons filenames for island/region destinations
// whose Wikipedia infobox image is a flag/map. Served via Special:FilePath
// (stable redirect — no fragile hash path). Keyed by lowercase city name/slug.
const COMMONS_FILES: Record<string, string> = {
  // Lahore — bright daytime Fort (its heroImage is a dusk aerial; too dark).
  lahore: 'Lahore_Fort_view_from_Baradari.jpg',
  // Islands / regions (flag/map infobox → curated scenery instead).
  seychelles: 'Anse_Lazio_beach_Praslin_Seychelles.jpg',
  madagascar: 'Landscape_Madagascar_04.jpg',
  'st lucia': 'At_the_top_of_Pigeon_Island.jpg',
  azores: 'Ribeira_Grande,_São_Miguel_Island,_Azores_-_panoramio_(7)_(cropped).jpg',
  bali: 'Bali_panorama.jpg',
  sardinia: 'Sardegna,_Italy.jpg',
  sicily: 'Messina_harbour_AK.jpg',
  fiji: 'Shangri-La_Fijian_Resort_15.jpg',
  zanzibar: 'Zanzibar_Panorama.jpg',
  jamaica: 'Doctors-Cave-Beach.jpg',
  'punta cana': 'Cap_Cana_Marina_Dominican_Republic.jpg',
  'turks and caicos': 'Turks_and_Caicos_Islands_sunset.jpg',
  antigua: 'TurnerBeachAntigua.JPG',
  trinidad: 'Pigeon_Point_beach.jpg',
  goa: 'GOA_Colva_Beach_-_panoramio.jpg',
  malta: 'Mellieha_Bay_beach_Malta_1.jpg',
  // City/resort destinations whose Wikipedia infobox is a flag (Singapore,
  // Hong Kong, Bahrain) or whose lead image isn't scenic (Ibiza, Marmaris,
  // Cape-Verde islands).
  singapore: 'Marina_Bay_Sands_20250903_(1).jpg',
  'hong kong': 'Yick_Cheong_Building_View_2015.jpg',
  bahrain: 'Avenues_coastline,_Bahrain.jpg',
  ibiza: 'O_Beach_Ibiza-Ibiza_Spain-Andres_Larin.jpg',
  marmaris: 'Marmaris_harbor_(aerial_view),_Muğla_Province,_southwest_Turkey,_Mediterranean.jpg',
  sal: 'SantaMariaSal.jpg',
  'boa vista': 'Aerial-Sal-Reis-Cape-Verde-2012.JPG',
};

// Full-URL overrides (Unsplash) where Commons had no clean scenic file.
const URL_OVERRIDES: Record<string, string> = {
  // Iconic turquoise overwater-villa lagoon (the Commons lead was a moody,
  // overcast shot — wrong vibe for the Maldives).
  maldives:
    'https://images.unsplash.com/photo-1758717152007-6a2eb7299409?w=1600&q=75&fit=crop&fm=webp',
  barbados:
    'https://images.unsplash.com/photo-1682289570915-5d6e41ade8bc?w=1600&q=75&fit=crop&fm=webp',
  aruba:
    'https://images.unsplash.com/photo-1678449784319-423c621569b9?w=1600&q=75&fit=crop&fm=webp',
};

// Disambiguation / region→city aliases — query a more specific Wikipedia title
// so the programmatic lookup lands on the right scenic page.
const WIKI_TITLE_ALIASES: Record<string, string> = {
  queenstown: 'Queenstown, New Zealand',
  newcastle: 'Newcastle upon Tyne',
  bath: 'Bath, Somerset',
  split: 'Split, Croatia',
  'gold coast': 'Gold Coast, Queensland',
  madeira: 'Funchal',
  mauritius: 'Port Louis',
  monaco: 'Monte Carlo',
  'new york': 'New York City',
  orlando: 'Orlando, Florida',
  fez: 'Fez, Morocco',
  hammamet: 'Hammamet, Tunisia',
  cartagena: 'Cartagena, Colombia',
};

// Premium, city-neutral travel/interior shots (verified Unsplash IDs reused
// from HotelPhoto's pool). Deterministic seeding keeps a given city stable.
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

/** Wikimedia Commons Special:FilePath URL — stable redirect to a thumb. */
function commonsFile(name: string, width = 1600): string {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(name)}?width=${width}`;
}

/**
 * Curated image (override → Commons file → Destination.heroImage). Synchronous;
 * returns null when the city isn't curated (caller then tries Wikipedia).
 */
export function curatedCityImage(city?: string | null): string | null {
  const needle = (city || '').trim().toLowerCase();
  if (!needle) return null;

  if (URL_OVERRIDES[needle]) return URL_OVERRIDES[needle];
  if (COMMONS_FILES[needle]) return commonsFile(COMMONS_FILES[needle]);

  let match = DESTINATIONS.find(
    (d) =>
      d.city.toLowerCase() === needle ||
      d.slug === needle ||
      d.iata.toLowerCase() === needle,
  );
  if (!match) {
    match = DESTINATIONS.find((d) => {
      const c = d.city.toLowerCase();
      return needle.startsWith(c) || c.startsWith(needle);
    });
  }
  if (match) {
    if (URL_OVERRIDES[match.slug]) return URL_OVERRIDES[match.slug];
    if (COMMONS_FILES[match.slug]) return commonsFile(COMMONS_FILES[match.slug]);
    if (match.heroImage) return match.heroImage;
  }
  return null;
}

/** Deterministic neutral fallback — last resort only. */
export function neutralCityImage(city?: string | null): string {
  const seed = (city || '').trim().toLowerCase() || 'travel';
  const id = NEUTRAL_POOL[hashIndex(seed, NEUTRAL_POOL.length)];
  return `https://images.unsplash.com/photo-${id}?w=1600&h=1000&fit=crop&fm=webp&q=70`;
}

// Reject Wikimedia files that aren't scenery photos. `.svg` matched anywhere
// catches Wikimedia's `Flag_of_X.svg/…X.svg.png` raster renders of flags /
// locator maps / coats of arms. `dimos`/`marker` catch Greek-municipality
// locator PNGs (e.g. "2011 Dimos Thiras.png").
function isBadWikiImage(url: string): boolean {
  return /\.svg|\.gif|\.ogv|flag|coat[_ ]?of[_ ]?arms|wappen|locator|location[_ ]?map|\bmap\b|\bseal\b|emblem|\blogo\b|\bicon\b|\bmarker\b|\bdimos\b|special[_ ]?marker/i.test(
    url,
  );
}

// Wikimedia thumbnails look like .../thumb/a/ab/Name.jpg/320px-Name.jpg — bump
// the width segment so the backdrop is sharp. Non-thumb URLs pass through.
function upsizeWikiThumb(url: string, px: number): string {
  return /\/\d+px-[^/]+$/.test(url) ? url.replace(/\/\d+px-/, `/${px}px-`) : url;
}

const wikiCache = new Map<string, string | null>();

/**
 * Fetch a destination's real lead photo from Wikipedia (client-side). Applies
 * WIKI_TITLE_ALIASES so disambiguation/region names hit the right article.
 * Returns null on miss / disambiguation / non-photo lead image (caller falls
 * back to neutralCityImage). Memoised per session.
 */
export async function fetchCityImage(city?: string | null): Promise<string | null> {
  const key = (city || '').trim();
  if (!key) return null;
  const cacheKey = key.toLowerCase();
  if (wikiCache.has(cacheKey)) return wikiCache.get(cacheKey) ?? null;

  const queryTitle = WIKI_TITLE_ALIASES[cacheKey] || key;
  let result: string | null = null;
  try {
    const title = encodeURIComponent(queryTitle.replace(/\s+/g, ' '));
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`,
      { headers: { accept: 'application/json' } },
    );
    if (res.ok) {
      const d = await res.json();
      if (d && d.type !== 'disambiguation') {
        const raw: string | null =
          d?.thumbnail?.source || d?.originalimage?.source || null;
        if (raw && !isBadWikiImage(raw)) {
          // Cap requested width at the original — Wikimedia 400s on upscale.
          const maxW: number =
            Number(d?.originalimage?.width) || Number(d?.thumbnail?.width) || 0;
          const targetW = maxW ? Math.min(1280, maxW) : 1280;
          result = upsizeWikiThumb(raw, targetW);
        }
      }
    }
  } catch {
    result = null;
  }
  wikiCache.set(cacheKey, result);
  return result;
}

/**
 * Synchronous best-effort image (curated → neutral). Kept for any caller that
 * can't await; the live backdrop path uses curatedCityImage + fetchCityImage.
 */
export function cityHeroImage(city?: string | null): string {
  return curatedCityImage(city) ?? neutralCityImage(city);
}

// Scenic-filename whitelist for picking extra city photos off Wikipedia's
// media-list (used only to enrich the blog slideshow — the first images are
// always the guaranteed-good seed + curated/lead photo).
const SCENIC_RE =
  /skyline|panorama|aerial|old.?town|cathedral|bridge|square|castle|cityscape|\bnight\b|\bview\b|harbou?r|palace|river|sunset|old.?city|downtown|waterfront|beach|temple|fort|mosque|basilica/i;

const cityImagesCache = new Map<string, string[]>();

/**
 * Resolve MULTIPLE real photos for a destination, for the blog-post backdrop
 * slideshow. Order: seed (the post's own hero) → curated/Wikipedia lead photo
 * → up to `max` scenic photos from the city's Wikipedia media-list (strictly
 * filtered to skip flags/maps/portraits/historical scans). De-duplicated.
 * Always returns at least the seed/lead when available. Memoised per session.
 */
export async function fetchCityImages(
  city?: string | null,
  seed?: string | null,
  max = 5,
): Promise<string[]> {
  const key = `${(city || '').toLowerCase()}|${seed || ''}`;
  if (cityImagesCache.has(key)) return cityImagesCache.get(key)!;

  const seen = new Set<string>();
  const out: string[] = [];
  const add = (u?: string | null) => {
    if (u && !seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  };

  add(seed);
  add(curatedCityImage(city));
  add(await fetchCityImage(city));

  if (city && out.length < max) {
    try {
      const title = WIKI_TITLE_ALIASES[city.trim().toLowerCase()] || city;
      const res = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/media-list/${encodeURIComponent(title)}`,
        { headers: { accept: 'application/json' } },
      );
      if (res.ok) {
        const data = await res.json();
        const imgs = (data?.items || []).filter(
          (i: { type?: string; title?: string }) =>
            i.type === 'image' &&
            !!i.title &&
            /\.(jpe?g)$/i.test(i.title) &&
            !isBadWikiImage(i.title),
        );
        // Scenic first, then the rest as filler.
        const ranked = [
          ...imgs.filter((i: { title: string }) => SCENIC_RE.test(i.title)),
          ...imgs.filter((i: { title: string }) => !SCENIC_RE.test(i.title)),
        ];
        for (const it of ranked as Array<{ srcset?: Array<{ src?: string }> }>) {
          if (out.length >= max) break;
          const raw = it.srcset?.[0]?.src;
          if (!raw) continue;
          const abs = raw.startsWith('//') ? `https:${raw}` : raw;
          add(upsizeWikiThumb(abs, 1280));
        }
      }
    } catch {
      /* media-list is best-effort enrichment only */
    }
  }

  const result = out.slice(0, max);
  cityImagesCache.set(key, result);
  return result;
}
