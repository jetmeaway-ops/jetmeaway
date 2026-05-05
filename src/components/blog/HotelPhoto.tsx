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
 * Fails silently — if Google has no record of the hotel, or the API key
 * is missing, the component renders nothing rather than breaking the
 * post layout. Cost is roughly $0.04 per cold hotel render on Google's
 * Places API (New) SKU pricing as of 2026-05.
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

export default async function HotelPhoto({ hotelName, city, alt, className }: Props) {
  if (!hotelName || !city) return null;

  const key = cacheKey(hotelName, city);
  let url: string | null = null;

  try {
    const cached = await kv.get<CachedPhoto>(key);
    if (cached) {
      if ('miss' in cached) return null;
      if ('url' in cached && typeof cached.url === 'string') url = cached.url;
    }
  } catch { /* KV miss — continue to live fetch */ }

  if (!url) {
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

  if (!url) return null;

  // Default styling lines up with the existing article image rhythm
  // (rounded-2xl, soft shadow, full bleed inside the 760px column).
  const cls =
    className ??
    'w-full h-[260px] md:h-[320px] object-cover rounded-2xl shadow-[0_12px_40px_-12px_rgba(0,102,255,0.18)] my-6';

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt ?? `${hotelName}, ${city}`}
      className={cls}
      loading="lazy"
      decoding="async"
    />
  );
}
