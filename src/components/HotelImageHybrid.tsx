/**
 * HotelImageHybrid — async server component that resolves a real hotel photo
 * from MULTIPLE live sources, in priority order, with a graceful fallback:
 *
 *   1. Google Places — googleHotelFirstPhoto. Fast + accurate for "the photo
 *      of this named hotel" (the right tool for the job). Primary source.
 *      (Prod only — GOOGLE_PLACES_API_KEY isn't set in local dev.)
 *   2. LiteAPI — our own hotel-content API. Resolves a hotel by bare name +
 *      country (searchHotelByNameInCountry) then pulls its mainPhoto
 *      (getHotelDetails). Used only as a GAP-FILLER when Google has nothing,
 *      because LiteAPI's name search is slow (6-20s/call) — viable for the
 *      smaller CA/MX markets, times out on the huge US index.
 *   3. Unsplash pool — deterministic hash-rotated luxury-hotel photo so every
 *      hotel still shows *something* distinct, never a broken image.
 *
 * Result (incl. which source won) is KV-cached: 30 days positive, 30 min
 * negative, on its OWN namespace (`wc-hotel-img:v7:`) so it isn't polluted by
 * HotelPhoto's older Google-only "miss" entries.
 *
 * Built for the /world-cup-2026 campaign page; HotelPhoto (Google-only, blog
 * posts) is left untouched.
 */

import { kv } from '@vercel/kv';
import { searchHotelByNameInCountry, getHotelDetails } from '@/lib/liteapi';
import { googleHotelFirstPhoto } from '@/lib/google-places';

interface Props {
  hotelName: string;
  city: string;
  /** ISO-2 country code (US / CA / MX) — required for the LiteAPI lookup. */
  countryCode: string;
  alt?: string;
  className?: string;
}

const POSITIVE_TTL = 60 * 60 * 24 * 30; // 30 days
const NEGATIVE_TTL = 60 * 30; // 30 min

type Cached = { url: string; source?: string } | { miss: true };

/** Generic words stripped before brand-token matching a LiteAPI result. */
const GENERIC = new Set([
  'hotel', 'hotels', 'the', 'and', 'by', 'an', 'of', 'at', 'on', 'in', 'spa',
  'resort', 'inn', 'house', 'suites', 'collection', 'autograph', 'curio',
  'luxury', 'a',
]);
function toks(s: string): string[] {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !GENERIC.has(t));
}
/** True when the first 1-2 distinctive tokens of the expected name appear in
 *  the LiteAPI-resolved name — guards against matching the wrong property. */
function brandMatch(expected: string, resolved: string): boolean {
  const e = toks(expected);
  const r = new Set(toks(resolved));
  if (e.length === 0 || r.size === 0) return true;
  return e.slice(0, 2).every((t) => r.has(t));
}

const HOTEL_POOL: string[] = [
  '1566073771259-6a8506099945', '1582719508461-905c673771fd',
  '1551882547-ff40c63fe5fa', '1564501049412-61c2a3083791',
  '1571896349842-33c89424de2d', '1542314831-068cd1dbfeeb',
  '1590490360182-c33d57733427', '1611892440504-42a792e24d32',
  '1576675784201-0e142b423952', '1455587734955-081b22074882',
  '1578683010236-d716f9a3f461', '1568084680786-a84f91d1153c',
];
function hashIndex(input: string, mod: number): number {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) | 0;
  return Math.abs(h) % mod;
}
function fallbackUrlFor(hotelName: string, city: string): string {
  const id = HOTEL_POOL[hashIndex(`${hotelName}::${city}`, HOTEL_POOL.length)];
  return `https://images.unsplash.com/photo-${id}?q=80&w=1200&h=600&fit=crop`;
}

function cacheKey(hotelName: string, city: string): string {
  const slug = `${hotelName}::${city}`.toLowerCase().replace(/[^a-z0-9: ]+/g, '').trim();
  // v7 bump (2026-06-12 evening): v6 entries were seeded while the prod
  // GOOGLE_PLACES_API_KEY was being rejected by Google (key-rotation
  // incident) — every hotel cached a Google miss for 30 days. Fresh
  // namespace now that the working key is restored.
  return `wc-hotel-img:v7:${slug}`;
}

/** Try LiteAPI: resolve the hotel by bare name + country → its real mainPhoto. */
async function liteApiPhoto(hotelName: string, countryCode: string): Promise<string | null> {
  try {
    const candidates = await searchHotelByNameInCountry(hotelName, countryCode, 5);
    if (!candidates.length) return null;
    const match = candidates.find((c) => c.name && brandMatch(hotelName, c.name)) ?? candidates[0];
    if (!match?.id) return null;
    const details = await getHotelDetails(match.id);
    return details?.mainPhoto ?? details?.photos?.[0] ?? null;
  } catch {
    return null;
  }
}

export default async function HotelImageHybrid({ hotelName, city, countryCode, alt, className }: Props) {
  const cls =
    className ??
    'w-full h-[200px] object-cover rounded-2xl shadow-[0_12px_40px_-12px_rgba(0,102,255,0.18)]';
  const altText = alt ?? `${hotelName || 'Hotel'}${city ? `, ${city}` : ''}`;

  if (!hotelName) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={fallbackUrlFor('unknown', city || 'unknown')} alt={altText} className={cls} loading="lazy" decoding="async" />;
  }

  const key = cacheKey(hotelName, city);
  let url: string | null = null;
  let miss = false;
  try {
    const cached = await kv.get<Cached>(key);
    if (cached) {
      if ('url' in cached && typeof cached.url === 'string') url = cached.url;
      else if ('miss' in cached) miss = true;
    }
  } catch {
    /* KV unreachable — fall through to live resolve */
  }

  if (!url && !miss) {
    let source: string | null = null;
    // 1. Google Places — fast + accurate for a named hotel's photo (the right
    //    tool for "photo of this hotel"). Primary source.
    {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 8000);
      try {
        url = await googleHotelFirstPhoto(`${hotelName} ${city}`, ctrl.signal);
      } catch {
        url = null;
      } finally {
        clearTimeout(timeout);
      }
      if (url) source = 'google';
    }
    // 2. LiteAPI — best-effort gap-filler when Google has nothing. Its
    //    name search is slow (6-20s) so it's deliberately the fallback, not
    //    the primary; reliably resolves smaller markets (CA/MX).
    if (!url) {
      url = await liteApiPhoto(hotelName, countryCode);
      if (url) source = 'liteapi';
    }
    try {
      await kv.set(key, url ? { url, source: source ?? 'unknown' } : { miss: true }, {
        ex: url ? POSITIVE_TTL : NEGATIVE_TTL,
      });
    } catch {
      /* KV write failed — still return a result for this render */
    }
  }

  const finalUrl = url ?? fallbackUrlFor(hotelName, city);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={finalUrl} alt={altText} className={cls} loading="lazy" decoding="async" />
  );
}
