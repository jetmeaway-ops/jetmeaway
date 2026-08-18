/**
 * Dynamic sitemap — auto-includes every MDX blog post plus every
 * public route. Runs at build time and is served at /sitemap.xml.
 *
 * Next.js 16 App Router reads this file automatically when it lives
 * at `src/app/sitemap.ts`. The old static `public/sitemap.xml` is
 * shadowed by this dynamic version (Next serves the dynamic one
 * first). Keeping the static file around as a fallback is harmless.
 */

import type { MetadataRoute } from 'next';
import { getAllPosts, TRANSLATED_LOCALES } from '@/lib/blog';
import { DESTINATIONS, getDestination } from '@/data/destinations';
import { WHERE_TO_STAY } from '@/data/where-to-stay';

const BASE = 'https://jetmeaway.co.uk';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Primary routes — customer-facing, high priority
  const primary: MetadataRoute.Sitemap = [
    { url: `${BASE}/`,            lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
    { url: `${BASE}/flights`,     lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE}/hotels`,      lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE}/packages`,    lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE}/cars`,        lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${BASE}/insurance`,   lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${BASE}/esim`,        lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${BASE}/explore`,     lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${BASE}/blog`,        lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${BASE}/de/blog`,     lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${BASE}/destinations`, lastModified: now, changeFrequency: 'weekly',  priority: 0.85 },
    { url: `${BASE}/travel-data`, lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
    // Seasonal campaign — the 2026 World Cup host-city hub. Listed while the
    // tournament window is live so Google/Bing actively crawl it; remove after
    // 19 Jul 2026 when the page retires.
    { url: `${BASE}/world-cup-2026`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
  ];

  // Programmatic SEO — one page per destination city
  const destinations: MetadataRoute.Sitemap = DESTINATIONS.map(d => ({
    url: `${BASE}/destinations/${d.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Neighbourhood-level pSEO seeds — hand-written long-tail pages.
  // Add one per promising hood as we prove the pattern works.
  const neighbourhoods: MetadataRoute.Sitemap = [
    {
      url: `${BASE}/destinations/rome/trastevere`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.75,
    },
  ];

  // "Where to stay in <city>" — one per city that has a where-to-stay guide.
  // Filtered against DESTINATIONS for the same reason the route is: a guide
  // without a destination record has no hero image, IATA or price to render.
  const whereToStay: MetadataRoute.Sitemap = WHERE_TO_STAY
    .filter(g => getDestination(g.citySlug))
    .map(g => ({
      url: `${BASE}/destinations/${g.citySlug}/where-to-stay`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.75,
    }));

  // Informational routes — trust / legal / partnerships
  const info: MetadataRoute.Sitemap = [
    { url: `${BASE}/about`,                 lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/contact`,               lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/affiliate`,             lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/financial-protection`,  lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/refund`,                lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE}/privacy`,               lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${BASE}/terms`,                 lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
  ];

  // Blog posts — pulled from MDX frontmatter so new posts land
  // in the sitemap automatically on the next build.
  let posts: MetadataRoute.Sitemap = [];
  try {
    // Prefer post.dateModified (set in frontmatter when a post is
    // substantively re-edited after first publish) over post.date.
    // This lets Google see the freshness signal even when we don't
    // want to fake the original publish date for "What's new" UX.
    posts = getAllPosts().map(post => {
      const lastModSource = post.dateModified || post.date;
      return {
        url: `${BASE}/blog/${post.slug}`,
        lastModified: lastModSource ? new Date(lastModSource) : now,
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      };
    });
  } catch {
    // If the filesystem read fails for any reason (unlikely at
    // build time), fall back to an empty list — better to ship
    // the core sitemap than 500 the whole build.
    posts = [];
  }

  // Translated posts — one entry per locale that has a corpus on disk.
  // These carry their own canonical + hreflang (set in the route's
  // generateMetadata), so listing them here is what actually gets the
  // German articles crawled rather than left as orphans.
  let translated: MetadataRoute.Sitemap = [];
  try {
    translated = TRANSLATED_LOCALES.flatMap(locale =>
      getAllPosts(locale).map(post => {
        const lastModSource = post.dateModified || post.date;
        return {
          url: `${BASE}/${locale}/blog/${post.slug}`,
          lastModified: lastModSource ? new Date(lastModSource) : now,
          changeFrequency: 'monthly' as const,
          priority: 0.6,
        };
      }),
    );
  } catch {
    translated = [];
  }

  return [...primary, ...info, ...destinations, ...neighbourhoods, ...whereToStay, ...posts, ...translated];
}
