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
import { getAllPosts } from '@/lib/blog';
import { DESTINATIONS } from '@/data/destinations';

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
    { url: `${BASE}/destinations`, lastModified: now, changeFrequency: 'weekly',  priority: 0.85 },
  ];

  // Programmatic SEO — one page per destination city
  const destinations: MetadataRoute.Sitemap = DESTINATIONS.map(d => ({
    url: `${BASE}/destinations/${d.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
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
    posts = getAllPosts().map(post => ({
      url: `${BASE}/blog/${post.slug}`,
      lastModified: post.date ? new Date(post.date) : now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }));
  } catch {
    // If the filesystem read fails for any reason (unlikely at
    // build time), fall back to an empty list — better to ship
    // the core sitemap than 500 the whole build.
    posts = [];
  }

  return [...primary, ...info, ...destinations, ...posts];
}
