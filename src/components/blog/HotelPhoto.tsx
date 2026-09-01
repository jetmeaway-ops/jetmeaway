/**
 * HotelPhoto — async server component used inside MDX blog posts.
 *
 * Renders a hero photo for a named hotel, resolved through LiteAPI's free
 * hotel catalogue (liteHotelHeroPhoto in src/lib/liteapi.ts: name+country
 * search, brand-validated, main_photo/hotelImages). KV-cached for a year
 * positive / a week negative.
 *
 * 2026-09-01: this used to buy the photo from Google Places (Text Search →
 * Photo Media, ~$0.04 per cold render) with a 30-DAY cache — so the whole
 * blog re-purchased its photos every month, multiplied by four language
 * trees and ~80% crawler traffic. That was most of the £73 August Places
 * bill. LiteAPI already carries a photo for these hotels at no charge.
 *
 * Wired into `mdxComponents` in src/app/blog/[slug]/page.tsx so authors
 * can drop `<HotelPhoto hotelName="…" city="…" />` straight into MDX.
 *
 * SEO + UX: always emits an `<img>` tag. If LiteAPI has no match
 * the component falls back to a deterministic hash-rotated pick from a
 * pool of generic luxury-hotel Unsplash photos. Different hotels on the
 * same page get different fallback images so the page doesn't render
 * 10 copies of the same city skyline (the bug the 2026-06-04 evening
 * survey caught — 106 fallback firings across 13 posts).
 *
 */

import { kv } from '@vercel/kv';
import { liteHotelHeroPhoto } from '@/lib/liteapi';

interface Props {
  hotelName: string;
  city: string;
  /** Optional alt text override. Defaults to "{hotelName}, {city}". */
  alt?: string;
  /** Optional className override. Defaults to article-image styling. */
  className?: string;
}

// LiteAPI photo URLs are stable CDN links (unlike Google's expiring
// lh3.googleusercontent URIs, the reason v2→v3 existed), so a hit can
// live for a year. The 30-day TTL was the engine of the August 2026
// Places bill: the whole blog re-BOUGHT its photos every month.
const POSITIVE_TTL = 60 * 60 * 24 * 365; // 1 year
// A miss retried every 30 min × crawler traffic was a steady paid drip
// under Google. LiteAPI is free, but its catalogue doesn't change hourly
// either — retry weekly, the Unsplash fallback covers the gap.
const NEGATIVE_TTL = 60 * 60 * 24 * 7;

type CachedPhoto = { url: string } | { miss: true };

// v2 bump (2026-06-04 evening): forces all prior KV cache entries to
// be ignored. The v1 keys held a wave of `{miss:true}` rows from the
// initial render of the 10 hotel posts shipped today, which were then
// serving the city-fallback image for every hotel.
// v3 bump (2026-06-12 evening): v2 held 30-day positive entries with
// expired lh3.googleusercontent.com URLs (broken imgs on Milan/Dublin/
// Edinburgh/Dubai posts) plus misses seeded while the prod Google key
// was dead (June outage + key-rotation incident). Working key restored.
// v4 bump (2026-09-01): source switched Google → LiteAPI. v3 entries
// hold expiring Google URLs; every key re-resolves once, free, and then
// sits for a year.
function cacheKey(hotelName: string, city: string) {
  const slug = `${hotelName}::${city}`.toLowerCase().replace(/[^a-z0-9: ]+/g, '').trim();
  // A fully non-Latin name strips to nothing and every such hotel would
  // share one key (and one photo). Salt short slugs with a hash of the raw.
  const salt = slug.length < 3 ? `:${hashIndex(`${hotelName}::${city}`, 1_000_000)}` : '';
  return `blog-hotel-photo:v4:${slug}${salt}`;
}

/**
 * Pool of generic luxury-hotel Unsplash photos used as the fallback
 * when LiteAPI returns nothing. We hash the hotel name and pick
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

  // No data to search LiteAPI with — pick a deterministic pool photo.
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

  // Only hit LiteAPI if we have no cached result at all (positive or negative).
  if (!url && !cachedMiss) {
    try {
      url = await liteHotelHeroPhoto(hotelName, city);
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

  // Always emit an <img>. If LiteAPI had nothing, the fallback is a
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
