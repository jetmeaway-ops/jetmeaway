/**
 * Blog helper — reads MDX posts from content/posts/ on the filesystem.
 *
 * This file uses Node.js `fs` and only runs on the server, so every route
 * that imports it must run on the Node.js runtime (not Edge). The blog
 * layout at `src/app/blog/layout.tsx` sets `runtime = 'nodejs'` to
 * override the Edge default from the root layout.
 *
 * MDX bodies are read raw here and compiled per-request via
 * `next-mdx-remote/rsc` in the `[slug]/page.tsx` route. The listing page
 * only needs frontmatter, which we parse via gray-matter without
 * touching the MDX compiler.
 */

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

/** One Q&A pair surfaced to FAQPage JSON-LD. */
export interface FAQ {
  q: string;
  a: string;
}

export interface BlogPostFrontmatter {
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  date: string;
  readTime: string;
  heroImage: string;
  author?: string;
  /** Optional — posts can declare FAQs in frontmatter. When present,
   *  the post page emits FAQPage JSON-LD for richer Google results
   *  and direct citation by Perplexity / ChatGPT Search. */
  faqs?: FAQ[];
  /** Optional — timely posts can flag themselves with a live-alert
   *  timestamp (e.g. "April 17, 2026 — 21:00 BST"). Rendered as a red
   *  pill near the article header and used as `dateModified` in JSON-LD. */
  liveAlert?: string;
  /** Optional — last meaningful content edit. When set, this drives
   *  the sitemap `lastModified` field and the BlogPosting `dateModified`
   *  JSON-LD property, giving Google a "fresh content" signal independent
   *  of the original publish date. Use ISO-8601 (e.g. "2026-06-04") for
   *  edits that aren't a real-time liveAlert. */
  dateModified?: string;
  /** Optional — populates the in-body MidArticleCta with a city-specific
   *  hotel CTA. e.g. `ctaCity: "Dubai"` → "Compare Hotels in Dubai" → /hotels?city=Dubai.
   *  Posts without this still show a generic CTA. */
  ctaCity?: string;
  /** Optional — IATA code for the secondary "Cheapest Flights to X" button.
   *  Pair with ctaCity for the most contextual CTA. e.g. `ctaFlightsTo: "DXB"`. */
  ctaFlightsTo?: string;
}

export type BlogPost = BlogPostFrontmatter & {
  content: string;
};

const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');

/**
 * Locales that have a translated post corpus on disk. English lives at
 * content/posts/, every other locale in a subdirectory named after it
 * (content/posts/de/). Translated files keep the SAME filename and the
 * SAME `slug` frontmatter value as their English source — the slug is
 * the URL and must not be translated.
 *
 * Note the English readers below filter on `.endsWith('.mdx')`, so the
 * locale subdirectories are skipped automatically and the English blog
 * is unaffected by translations landing on disk.
 */
export type PostLocale = 'en' | 'de' | 'es';

/** Locales offered as translated alternates (excludes the 'en' source). */
export const TRANSLATED_LOCALES: readonly Exclude<PostLocale, 'en'>[] = ['de', 'es'];

function postsDir(locale: PostLocale): string {
  return locale === 'en' ? POSTS_DIR : path.join(POSTS_DIR, locale);
}

/**
 * Parsed-corpus cache, keyed by locale.
 *
 * Every post page calls getAllPosts() at least twice (once to resolve
 * itself, once for the related-post picks), and each call used to re-read
 * and gray-matter-parse the whole corpus. That is O(posts²) per build:
 * fine at 546 English pages, but adding the 545 German ones pushed
 * individual pages past Next's 60-second per-page budget and failed the
 * build outright — on English pages as well as German ones.
 *
 * Content is immutable during a build, so parsing once per worker process
 * is safe. Cached only in production: `next dev` keeps reading from disk
 * so edits to an .mdx file still show up on refresh.
 */
const postCache = new Map<PostLocale, BlogPost[]>();
const CACHE_ENABLED = process.env.NODE_ENV === 'production';

/** Lists every post (frontmatter + raw MDX), sorted by date descending. */
export function getAllPosts(locale: PostLocale = 'en'): BlogPost[] {
  if (CACHE_ENABLED) {
    const cached = postCache.get(locale);
    // Hand back a copy so a caller sorting or splicing the result can
    // never corrupt the shared cache for every later page.
    if (cached) return cached.slice();
  }

  const dir = postsDir(locale);
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.mdx'));

  const posts = files.map(file => {
    const raw = fs.readFileSync(path.join(dir, file), 'utf8');
    const { data, content } = matter(raw);
    const slug = (data.slug as string | undefined) ?? file.replace(/\.mdx$/, '');
    return {
      title: data.title as string,
      slug,
      category: data.category as string,
      excerpt: data.excerpt as string,
      date: data.date as string,
      readTime: (data.readTime as string) ?? '5 min read',
      heroImage: data.heroImage as string,
      author: data.author as string | undefined,
      faqs: Array.isArray(data.faqs) ? (data.faqs as FAQ[]) : undefined,
      liveAlert: (data.liveAlert as string | undefined) ?? undefined,
      dateModified: (data.dateModified as string | undefined) ?? undefined,
      ctaCity: (data.ctaCity as string | undefined) ?? undefined,
      ctaFlightsTo: (data.ctaFlightsTo as string | undefined) ?? undefined,
      content,
    };
  });

  posts.sort((a, b) => (b.date > a.date ? 1 : -1));
  if (CACHE_ENABLED) postCache.set(locale, posts);
  return CACHE_ENABLED ? posts.slice() : posts;
}

/** Fetches a single post by slug, or null if it doesn't exist. */
export function getPostBySlug(slug: string, locale: PostLocale = 'en'): BlogPost | null {
  return getAllPosts(locale).find(p => p.slug === slug) ?? null;
}

/** Lists just the slugs — used by `generateStaticParams`. */
export function getAllPostSlugs(locale: PostLocale = 'en'): string[] {
  const dir = postsDir(locale);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.mdx'))
    .map(f => f.replace(/\.mdx$/, ''));
}

/**
 * True when `slug` has a translated file for `locale`. Used to gate
 * hreflang alternates and sitemap entries: emitting an alternate for a
 * post that was never translated (e.g. a retired seasonal post) would
 * point Google at a 404, which is worse than no alternate at all.
 *
 * Reads the directory once per call rather than parsing every file —
 * the filename mirrors the slug for every post in the corpus.
 */
export function hasTranslation(slug: string, locale: Exclude<PostLocale, 'en'>): boolean {
  return translatedSlugs(locale).has(slug);
}

/**
 * Set of slugs available in a locale. Cached like the corpus above:
 * localiseInternalBlogLinks() asks this once per in-body link, which is
 * tens of thousands of lookups across a build.
 */
const slugSetCache = new Map<PostLocale, ReadonlySet<string>>();

function translatedSlugs(locale: Exclude<PostLocale, 'en'>): ReadonlySet<string> {
  if (CACHE_ENABLED) {
    const cached = slugSetCache.get(locale);
    if (cached) return cached;
  }
  const dir = postsDir(locale);
  const set = fs.existsSync(dir)
    ? new Set(
        fs.readdirSync(dir).filter(f => f.endsWith('.mdx')).map(f => f.replace(/\.mdx$/, '')),
      )
    : new Set<string>();
  if (CACHE_ENABLED) slugSetCache.set(locale, set);
  return set;
}

/** Locale → BCP-47 tag used for hreflang and date formatting. */
const DATE_LOCALE: Record<PostLocale, string> = {
  en: 'en-GB',
  de: 'de-DE',
  // Neutral Spanish rather than es-ES: the corpus is written to read in
  // both Spain and Latin America, and es-419 would exclude Spain.
  es: 'es',
};

const SITE_URL = 'https://jetmeaway.co.uk';

/**
 * Rewrites in-body links to sibling posts so a translated article keeps
 * the reader in their own language: `](/blog/x)` → `](/de/blog/x)`.
 *
 * Only rewrites when that sibling has actually been translated — a link
 * to a post that exists in English only is deliberately left pointing at
 * the English article rather than turned into a 404. Non-blog links
 * (/hotels, /flights, …) are untouched, as are absolute URLs.
 */
export function localiseInternalBlogLinks(content: string, locale: PostLocale): string {
  if (locale === 'en') return content;
  return content.replace(
    /\]\(\/blog\/([a-z0-9][a-z0-9-]*)((?:#[^)\s]*)?)\)/g,
    (whole, slug: string, hash: string) =>
      hasTranslation(slug, locale as Exclude<PostLocale, 'en'>)
        ? `](/${locale}/blog/${slug}${hash})`
        : whole,
  );
}

/** Public URL of a post in a given locale. English keeps the bare /blog root. */
export function postUrl(slug: string, locale: PostLocale = 'en'): string {
  return locale === 'en'
    ? `${SITE_URL}/blog/${slug}`
    : `${SITE_URL}/${locale}/blog/${slug}`;
}

/**
 * Canonical + hreflang alternates for one post, ready to spread into a
 * Next.js `Metadata.alternates`.
 *
 * Two rules matter for SEO here:
 *  - A translated alternate is only listed when the file actually exists,
 *    so a post with no German version (e.g. a retired seasonal post) never
 *    advertises a URL that would 404.
 *  - `x-default` always points at the English original, which is what
 *    Google falls back to for any language we don't publish.
 *
 * Language-only codes ('de', not 'de-DE') so the German pages serve every
 * German-speaking market — Germany, Austria and Switzerland alike.
 */
export function blogAlternates(
  slug: string,
  current: PostLocale = 'en',
): { canonical: string; languages: Record<string, string> } {
  const languages: Record<string, string> = { en: postUrl(slug, 'en') };

  for (const loc of TRANSLATED_LOCALES) {
    if (loc === current || hasTranslation(slug, loc)) {
      languages[loc] = postUrl(slug, loc);
    }
  }

  languages['x-default'] = postUrl(slug, 'en');

  return { canonical: postUrl(slug, current), languages };
}

/** Human-friendly date formatter for blog cards and post headers. */
export function formatPostDate(isoDate: string, locale: PostLocale = 'en'): string {
  try {
    return new Date(isoDate).toLocaleDateString(DATE_LOCALE[locale] ?? 'en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return isoDate;
  }
}
