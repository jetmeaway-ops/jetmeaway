/**
 * "Read next" selection — which 3 sibling posts appear under an article.
 *
 * Pure logic, deliberately kept out of the page component so it can be
 * exercised directly by scratch/verify-related-posts.mjs. That script
 * asserts the orphan guarantee below against this exact code rather than
 * against a re-implementation.
 *
 * Background: this replaces a selection that took the 3 newest posts in
 * the same category. 455 of 507 posts share `category: "Hotels"`, so 452
 * of them rendered a byte-identical trio and only 4 posts in the whole
 * corpus received any inbound "Read next" link at all.
 */

import { countryForSlug } from '../data/blog-countries';
import type { BlogPost } from './blog';

/** Number of "Read next" cards rendered under each article. */
export const RELATED_COUNT = 3;

/**
 * A country cluster is only used when it can serve each of its own members
 * without outside help — it needs RELATED_COUNT siblings plus the post
 * itself. Smaller clusters go entirely to the fallback ring; they are never
 * partially served (see pickRelatedPosts for why that matters).
 */
export const MIN_COUNTRY_CLUSTER = RELATED_COUNT + 1;

const bySlug = (a: BlogPost, b: BlogPost) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0);

/**
 * Picks the 3 "Read next" posts.
 *
 * Every post sits in exactly ONE closed ring and takes all 3 picks from it:
 *
 *   • Country ring — posts whose country has >= MIN_COUNTRY_CLUSTER posts,
 *     ordered by slug.
 *   • Fallback ring — everything else (no known country, or too small a
 *     cluster), ordered by category then slug so neighbours stay on-topic
 *     wherever the category is big enough.
 *
 * In a ring of N posts, post i links to i+1, i+2, i+3 (mod N). Every member
 * therefore emits 3 links into the ring and receives 3 from its
 * predecessors. That is what guarantees no post is ever an orphan.
 *
 * The rings MUST stay disjoint. If a post drew some picks from its country
 * and topped the rest up from the fallback ring, it would emit fewer than 3
 * links into that ring, and its ring successors could drop below 3 inbound —
 * reintroducing the orphaning this replaces. So a post is entirely
 * country-served or entirely fallback-served. Never a mix.
 *
 * Ordering is by slug, never by date: getAllPosts() sorts on a comparator
 * that never returns 0 and 101 posts share a single date, so date order is
 * implementation-defined and would let the link graph shift between deploys.
 */
export function pickRelatedPosts(post: BlogPost, all: BlogPost[]): BlogPost[] {
  const canonical = [...all].sort(bySlug);

  const clusterSize = new Map<string, number>();
  for (const p of canonical) {
    const country = countryForSlug(p.slug);
    if (country) clusterSize.set(country, (clusterSize.get(country) ?? 0) + 1);
  }

  /** The post's country, but only if that cluster is big enough to serve it. */
  const servingCountry = (p: BlogPost): string | null => {
    const country = countryForSlug(p.slug);
    return country && (clusterSize.get(country) ?? 0) >= MIN_COUNTRY_CLUSTER ? country : null;
  };

  const country = servingCountry(post);
  const ring = country
    ? canonical.filter((p) => servingCountry(p) === country)
    : canonical
        .filter((p) => servingCountry(p) === null)
        .sort((a, b) => (a.category < b.category ? -1 : a.category > b.category ? 1 : bySlug(a, b)));

  const index = ring.findIndex((p) => p.slug === post.slug);
  if (index === -1) return [];

  // `step < ring.length` stops a short ring wrapping back onto the post itself.
  const picks: BlogPost[] = [];
  for (let step = 1; step <= RELATED_COUNT && step < ring.length; step++) {
    picks.push(ring[(index + step) % ring.length]);
  }
  return picks;
}
