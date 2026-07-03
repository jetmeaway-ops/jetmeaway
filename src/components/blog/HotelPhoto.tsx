/**
 * HotelPhoto — async server component used inside MDX blog posts.
 *
 * Renders a single Google Places hero photo for a named hotel. The photo
 * URL is resolved via Text Search → Photo Media (one combined Text Search
 * call returns the first photo `name`, then a Photo Media call resolves
 * the CDN URL). KV-cached for 30 days positive / 30 minutes negative so
 * blog posts only burn Google quota on the first cold render after a
 * deploy.
 *
 * Wired into `mdxComponents` in src/app/blog/[slug]/page.tsx so authors
 * can drop `<HotelPhoto hotelName="…" city="…" />` straight into MDX.
 *
 * SEO + UX: always emits an `<img>` tag. If Google Places returns nothing
 * the component falls back to a deterministic hash-rotated pick from a
 * pool of generic luxury-hotel Unsplash photos. Different hotels on the
 * same page get different fallback images so the page doesn't render
 * 10 copies of the same city skyline (the bug the 2026-06-04 evening
 * survey caught — 106 fallback firings across 13 posts).
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
// Negative TTL was 6h, which was too punishing — when Google's first
// response timed out during the original render the post then served
// the same fallback for 6h afterwards. Dropped to 30 min so the next
// visitor after a transient Google blip pulls fresh.
const NEGATIVE_TTL = 60 * 30;

type CachedPhoto = { url: string } | { miss: true };

// v2 bump (2026-06-04 evening): forces all prior KV cache entries to
// be ignored. The v1 keys held a wave of `{miss:true}` rows from the
// initial render of the 10 hotel posts shipped today, which were then
// serving the city-fallback image for every hotel.
// v3 bump (2026-06-12 evening): v2 held 30-day positive entries with
// expired lh3.googleusercontent.com URLs (broken imgs on Milan/Dublin/
// Edinburgh/Dubai posts) plus misses seeded while the prod Google key
// was dead (June outage + key-rotation incident). Working key restored.
function cacheKey(hotelName: string, city: string) {
  const slug = `${hotelName}::${city}`.toLowerCase().replace(/[^a-z0-9: ]+/g, '').trim();
  return `blog-hotel-photo:v3:${slug}`;
}

/**
 * Pool of generic luxury-hotel Unsplash photos used as the fallback
 * when Google Places returns nothing. We hash the hotel name and pick
 * deterministically so:
 *   1. The same hotel always shows the same fallback image (stable URL
 *      for browser caches + reproducible audit results).
 *   2. Different hotels on the same page show different images — no
 *      more "10 copies of the city skyline" rendering.
 *
 * Mix of suite interiors, lobbies, pools, dining rooms, spas, beds,
 * façades, rooftop terraces — every photo reads as "a luxury hotel"
 * regardless of city.
 */
const HOTEL_POOL: string[] = [
  '1566073771259-6a8506099945', // luxury suite interior
  '1582719508461-905c673771fd', // hotel pool deck at dusk
  '1551882547-ff40c63fe5fa',    // grand hotel lobby
  '1564501049412-61c2a3083791', // suite with view
  '1571896349842-33c89424de2d', // luxury bedroom
  '1542314831-068cd1dbfeeb',    // hotel dining room
  '1590490360182-c33d57733427', // hotel courtyard
  '1611892440504-42a792e24d32', // marble bathroom
  '1576675784201-0e142b423952', // rooftop terrace
  '1455587734955-081b22074882', // boutique hotel façade
  '1578683010236-d716f9a3f461', // spa interior
  '1568084680786-a84f91d1153c', // sunlit bed with linens
];

/**
 * djb2 string hash → integer in [0, HOTEL_POOL.length). Deterministic
 * across server restarts, no Math.random() drift between renders.
 */
function hashIndex(input: string, mod: number): number {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % mod;
}

function buildUnsplashUrl(photoId: string): string {
  return `https://images.unsplash.com/photo-${photoId}?q=80&w=1200&h=600&fit=crop`;
}

function fallbackUrlFor(hotelName: string, city: string): string {
  const seed = `${hotelName}::${city}`;
  const idx = hashIndex(seed, HOTEL_POOL.length);
  return buildUnsplashUrl(HOTEL_POOL[idx]);
}

export default async function HotelPhoto({ hotelName, city, alt, className }: Props) {
  const cls =
    className ??
    'w-full h-[260px] md:h-[320px] object-cover rounded-2xl shadow-[0_12px_40px_-12px_rgba(0,102,255,0.18)] my-6';
  const altText = alt ?? `${hotelName || 'Hotel'}${city ? `, ${city}` : ''}`;

  // No data to query Google with — pick a deterministic pool photo.
  if (!hotelName || !city) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={fallbackUrlFor(hotelName || 'unknown', city || 'unknown')}
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
  } catch { /* KV unreachable — continue to live fetch */ }

  // Only call Google if we have no cached result at all (positive or negative).
  if (!url && !cachedMiss) {
    // googleHotelFirstPhoto now self-manages its per-attempt timeout, retry
    // and a process-wide concurrency cap (see src/lib/google-places.ts). The
    // old 8s wrapper here would abort those retries mid-flight during a static
    // build — the exact reason big posts (e.g. Athens, 46 hotels) burst-failed
    // and froze generic stock photos into the page — so it's gone.
    try {
      url = await googleHotelFirstPhoto(`${hotelName} ${city}`);
    } catch {
      url = null;
    }

    try {
      if (url) {
        await kv.set(key, { url }, { ex: POSITIVE_TTL });
      } else {
        await kv.set(key, { miss: true }, { ex: NEGATIVE_TTL });
      }
    } catch { /* KV write fail — still return result for this render */ }
  }

  // Always emit an <img>. If Google had nothing, the fallback is a
  // hash-rotated pick from the luxury-hotel pool — each hotel on the
  // page gets a different image, not 10 copies of the city skyline.
  const finalUrl = url ?? fallbackUrlFor(hotelName, city);

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
