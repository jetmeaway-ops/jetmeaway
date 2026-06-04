/**
 * HotelPhoto — async server component used inside MDX blog posts.
 *
 * Renders a single Google Places hero photo for a named hotel. The photo
 * URL is resolved via Text Search → Photo Media (one combined Text Search
 * call returns the first photo `name`, then a Photo Media call resolves
 * the CDN URL). KV-cached for 30 days positive / 6 hours negative so blog
 * posts only burn Google quota on the first cold render after a deploy.
 *
 * Wired into `mdxComponents` in src/app/blog/[slug]/page.tsx so authors
 * can drop `<HotelPhoto hotelName="…" city="…" />` straight into MDX.
 *
 * SEO: always emits an `<img>` tag. If Google Places returns nothing
 * (smaller riads, brand-new properties, API key missing in preview),
 * the component falls back to a deterministic city-themed Unsplash photo
 * so crawlers (and the on-page.ai entity audit) always see an image.
 * Previously this returned `null` on Google miss, which caused
 * `image_count: 0` on the 2026-06-04 Marrakech SEO audit.
 *
 * Cost is roughly $0.04 per cold hotel render on Google's Places API
 * (New) SKU pricing as of 2026-05.
 */

import { kv } from '@vercel/kv';
import { googleHotelFirstPhoto } from '@/lib/google-places';

interface Props {
  hotelName: string;
  city: string;
  /** Optional alt text override. Defaults to "{hotelName}, {city}". */
  alt?: string;
  /** Optional className override. Defaults to article-image styling. */
  className?: string;
}

const POSITIVE_TTL = 60 * 60 * 24 * 30; // 30 days
const NEGATIVE_TTL = 60 * 60 * 6;       // 6 hours

type CachedPhoto = { url: string } | { miss: true };

function cacheKey(hotelName: string, city: string) {
  const slug = `${hotelName}::${city}`.toLowerCase().replace(/[^a-z0-9: ]+/g, '').trim();
  return `blog-hotel-photo:v1:${slug}`;
}

/**
 * Deterministic Unsplash fallback per city — used when Google Places has
 * no record of the hotel (smaller riads, newly-opened properties, the
 * crawler's User-Agent gets refused, the KV layer is cold, etc.). Each
 * ID has been verified to appear in its city's Unsplash search results
 * so an SEO crawler reading the rendered HTML sees a city-relevant image.
 *
 * The match key is lowercased and stripped of non-alphanumerics so
 * "Las Vegas", "las-vegas", "lasvegas" all resolve to the same fallback.
 *
 * Where a city isn't in this map we drop through to GENERIC_FALLBACK
 * (a luxury-hotel-interior shot) so we never return null.
 */
const CITY_FALLBACKS: Record<string, string> = {
  // 10 hero images shipped 2026-06-04 (verified against Unsplash search)
  marrakech: '1597212618440-806262de4f6b',
  budapest: '1541343672885-9be56236302a',
  prague: '1541849546-216549ae216d',
  rome: '1525874684015-58379d421a52',
  vienna: '1516550893923-42d28e5677af',
  berlin: '1560969184-10fe8719e047',
  munich: '1595867818082-083862f3d630',
  edinburgh: '1506377585622-bedcbb027afc',
  dublin: '1549918864-48ac978761a4',
  lasvegas: '1581351721010-8cf859cb14a4',
  // Existing hotel-post hero images (carried over from each post's
  // own frontmatter, verified at file-write time)
  dubai: '1512453979798-5ea266f8880c',
  bangkok: '1508009603885-50cf7c579365',
  amsterdam: '1534351590666-13e3e96c5017',
  athens: '1555993539-1732b0258235',
  barcelona: '1583422409516-2895a77efded',
  istanbul: '1541432901042-2d8bd64b4a9b',
  lisbon: '1555881400-74d7acaacd8b',
  milan: '1520440229-6469a149ac24',
  seville: '1559535332-db9971090158',
  granada: '1591101761702-d5e8e98c6c0e',
  valencia: '1599282114097-eba4b81e2123',
  goa: '1512343879784-a960bf40e7f2',
  jaipur: '1599661046289-e31897846e41',
  kerala: '1602216056096-3b40cc0c9944',
  udaipur: '1567606404787-5ad7d8e15ba0',
  victoriafalls: '1516026672322-bc52d61a55d5',
  tajmahal: '1564507592333-c60657eea523',
  turkey: '1541432901042-2d8bd64b4a9b',
};

/**
 * Final fallback when neither Google Places nor the city map has anything.
 * A generic luxury-hotel-interior shot — still relevant to "best hotels"
 * blog posts, still gives the crawler a real `<img>` to count.
 */
const GENERIC_FALLBACK = '1566073771259-6a8506099945';

function normaliseCity(city: string): string {
  return city.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function buildUnsplashUrl(photoId: string): string {
  return `https://images.unsplash.com/photo-${photoId}?q=80&w=1200&h=600&fit=crop`;
}

function fallbackUrlFor(city: string): string {
  const key = normaliseCity(city);
  const id = CITY_FALLBACKS[key] ?? GENERIC_FALLBACK;
  return buildUnsplashUrl(id);
}

export default async function HotelPhoto({ hotelName, city, alt, className }: Props) {
  const cls =
    className ??
    'w-full h-[260px] md:h-[320px] object-cover rounded-2xl shadow-[0_12px_40px_-12px_rgba(0,102,255,0.18)] my-6';
  const altText = alt ?? `${hotelName || 'Hotel'}${city ? `, ${city}` : ''}`;

  // No data to query Google with — emit a generic fallback so we still
  // contribute to image_count for crawlers.
  if (!hotelName || !city) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={buildUnsplashUrl(GENERIC_FALLBACK)}
        alt={altText}
        className={cls}
        loading="lazy"
        decoding="async"
      />
    );
  }

  const key = cacheKey(hotelName, city);
  let url: string | null = null;
  let cachedMiss = false;

  try {
    const cached = await kv.get<CachedPhoto>(key);
    if (cached) {
      if ('miss' in cached) {
        cachedMiss = true;
      } else if ('url' in cached && typeof cached.url === 'string') {
        url = cached.url;
      }
    }
  } catch { /* KV miss — continue to live fetch */ }

  // Only call Google if we have no cached result at all (positive or negative).
  if (!url && !cachedMiss) {
    // 4-second hard cap so a slow Google response can't block page render.
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 4000);
    try {
      url = await googleHotelFirstPhoto(`${hotelName} ${city}`, ctrl.signal);
    } catch {
      url = null;
    } finally {
      clearTimeout(timeout);
    }

    try {
      if (url) {
        await kv.set(key, { url }, { ex: POSITIVE_TTL });
      } else {
        await kv.set(key, { miss: true }, { ex: NEGATIVE_TTL });
      }
    } catch { /* KV write fail — still return result for this render */ }
  }

  // Always emit an <img>. If Google had nothing (and our negative cache
  // confirmed it), fall back to a deterministic city Unsplash photo.
  const finalUrl = url ?? fallbackUrlFor(city);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={finalUrl}
      alt={altText}
      className={cls}
      loading="lazy"
      decoding="async"
    />
  );
}
