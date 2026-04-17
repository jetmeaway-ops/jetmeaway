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
}

export type BlogPost = BlogPostFrontmatter & {
  content: string;
};

const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');

/** Lists every post (frontmatter + raw MDX), sorted by date descending. */
export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(POSTS_DIR)) return [];

  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));

  const posts = files.map(file => {
    const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
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
      content,
    };
  });

  return posts.sort((a, b) => (b.date > a.date ? 1 : -1));
}

/** Fetches a single post by slug, or null if it doesn't exist. */
export function getPostBySlug(slug: string): BlogPost | null {
  return getAllPosts().find(p => p.slug === slug) ?? null;
}

/** Lists just the slugs — used by `generateStaticParams`. */
export function getAllPostSlugs(): string[] {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs
    .readdirSync(POSTS_DIR)
    .filter(f => f.endsWith('.mdx'))
    .map(f => f.replace(/\.mdx$/, ''));
}

/** Human-friendly date formatter for blog cards and post headers. */
export function formatPostDate(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return isoDate;
  }
}
