import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const KV_TTL = 21600; // 6 hours

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

interface ViatorImage {
  variants: { url: string; width: number; height: number }[];
}

interface ViatorProduct {
  productCode: string;
  title: string;
  description: string;
  images: ViatorImage[];
  reviews: { combinedAverageRating: number; totalReviews: number };
  duration: { variableDurationFromMinutes?: number; variableDurationToMinutes?: number; fixedDurationInMinutes?: number };
  pricing: { summary: { fromPrice: number }; currency: string };
  productUrl: string;
  flags: string[];
  confirmationType: string;
}

function pickImage(images: ViatorImage[]): string {
  if (!images || images.length === 0) return '';
  for (const img of images) {
    if (!img.variants) continue;
    // Try to find 480x320 variant
    const match = img.variants.find(
      (v) => v.width === 480 && v.height === 320,
    );
    if (match) return match.url;
    // Fallback: pick closest to 480px wide
    const sorted = [...img.variants].sort(
      (a, b) => Math.abs(a.width - 480) - Math.abs(b.width - 480),
    );
    if (sorted.length > 0) return sorted[0].url;
  }
  return '';
}

function formatDuration(dur: ViatorProduct['duration']): string {
  if (!dur) return '';
  const mins = dur.fixedDurationInMinutes || dur.variableDurationFromMinutes;
  const maxMins = dur.variableDurationToMinutes;
  if (!mins) return '';
  const fmtTime = (m: number) => {
    if (m < 60) return `${m}min`;
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return rm > 0 ? `${h}h ${rm}min` : `${h}h`;
  };
  if (maxMins && maxMins !== mins) {
    return `${fmtTime(mins)} - ${fmtTime(maxMins)}`;
  }
  return fmtTime(mins);
}

function cleanProduct(p: ViatorProduct) {
  return {
    productCode: p.productCode,
    title: p.title,
    description: p.description ? p.description.slice(0, 150) : '',
    imageUrl: pickImage(p.images),
    rating: p.reviews?.combinedAverageRating || 0,
    reviewCount: p.reviews?.totalReviews || 0,
    fromPrice: p.pricing?.summary?.fromPrice || 0,
    currency: p.pricing?.currency || 'GBP',
    duration: formatDuration(p.duration),
    bookingUrl: p.productUrl || '',
    flags: p.flags || [],
    freeCancellation: (p.flags || []).includes('FREE_CANCELLATION'),
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const destination = searchParams.get('destination');
  const currency = searchParams.get('currency') || 'GBP';

  if (!destination) {
    return NextResponse.json(
      { error: 'destination parameter is required' },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const cacheKey = `tours:${destination.toLowerCase()}:${currency}`;

  // Try KV cache
  try {
    const { kv } = await import('@vercel/kv');
    const cached = await kv.get(cacheKey);
    if (cached) {
      return NextResponse.json(
        { source: 'cache', destination, tours: cached },
        { headers: CORS_HEADERS },
      );
    }
  } catch {
    // KV not available, continue without cache
  }

  const apiKey = process.env.viatorsandbox;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Viator API key not configured' },
      { status: 500, headers: CORS_HEADERS },
    );
  }

  try {
    const res = await fetch(
      'https://api.sandbox.viator.com/partner/search/freetext',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json;version=2.0',
          'Accept-Language': 'en-US',
          'exp-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchTerm: destination,
          searchTypes: [
            {
              searchType: 'PRODUCTS',
              pagination: { start: 1, count: 12 },
            },
          ],
          currency,
        }),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      console.error('[tours] Viator API error:', res.status, text);
      return NextResponse.json(
        { error: 'Viator API error', status: res.status },
        { status: 502, headers: CORS_HEADERS },
      );
    }

    const data = await res.json();
    const products: ViatorProduct[] = data?.products?.results || [];
    const tours = products.map(cleanProduct);

    // Store in KV cache
    try {
      const { kv } = await import('@vercel/kv');
      await kv.set(cacheKey, tours, { ex: KV_TTL });
    } catch {
      // KV not available, skip caching
    }

    return NextResponse.json(
      { source: 'api', destination, tours },
      { headers: CORS_HEADERS },
    );
  } catch (err) {
    console.error('[tours] fetch error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch tours' },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
