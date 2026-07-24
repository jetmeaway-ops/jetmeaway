/**
 * Distribution proof for the "Read next" selection.
 *
 *   node scripts/verify-related-posts.mjs
 *
 * Imports the REAL shipped src/lib/relatedPosts.ts (Node 24 strips types
 * natively) rather than re-implementing the algorithm, so a divergence
 * between design and code fails here instead of shipping.
 *
 * Exits non-zero if any invariant breaks.
 */
import fs from 'node:fs';
import path from 'node:path';
import { register } from 'node:module';
import matter from 'gray-matter';

// Teach Node to resolve the app's extensionless TS imports (see ts-hooks.mjs).
register('./ts-resolve-hooks.mjs', import.meta.url);

const { pickRelatedPosts, RELATED_COUNT, MIN_COUNTRY_CLUSTER } = await import(
  '../src/lib/relatedPosts.ts'
);
const { countryForSlug } = await import('../src/data/blog-countries.ts');

const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');
const posts = fs
  .readdirSync(POSTS_DIR)
  .filter((f) => f.endsWith('.mdx'))
  .map((f) => {
    const { data } = matter(fs.readFileSync(path.join(POSTS_DIR, f), 'utf8'));
    return {
      slug: data.slug ?? f.replace(/\.mdx$/, ''),
      category: data.category ?? 'Uncategorised',
      date: data.date ?? '',
    };
  });

// Feed the function the same date-sorted order getAllPosts() produces, so
// we exercise it exactly as the page does.
const asPageSeesThem = [...posts].sort((a, b) => (b.date > a.date ? 1 : -1));

const known = new Set(posts.map((p) => p.slug));
const inbound = new Map(posts.map((p) => [p.slug, 0]));
const linkSets = new Set();
const failures = [];

// Recompute the M/F partition independently to assert disjointness.
const clusterSize = new Map();
for (const p of posts) {
  const c = countryForSlug(p.slug);
  if (c) clusterSize.set(c, (clusterSize.get(c) ?? 0) + 1);
}
const servedByCountry = (slug) => {
  const c = countryForSlug(slug);
  return !!(c && (clusterSize.get(c) ?? 0) >= MIN_COUNTRY_CLUSTER);
};

let mCount = 0;
let fCount = 0;

for (const post of posts) {
  const picks = pickRelatedPosts(post, asPageSeesThem);
  const slugs = picks.map((p) => p.slug);

  if (slugs.length !== RELATED_COUNT) failures.push(`${post.slug}: emitted ${slugs.length} picks`);
  if (slugs.includes(post.slug)) failures.push(`${post.slug}: SELF-LINK`);
  if (new Set(slugs).size !== slugs.length) failures.push(`${post.slug}: duplicate picks`);
  for (const t of slugs) {
    if (!known.has(t)) failures.push(`${post.slug}: broken target ${t}`);
    inbound.set(t, (inbound.get(t) ?? 0) + 1);
  }

  // Partition invariant: a country-served post must draw ONLY from its own
  // country; a fallback post must draw ONLY from non-country-served posts.
  const inM = servedByCountry(post.slug);
  if (inM) {
    mCount++;
    const mine = countryForSlug(post.slug);
    const strays = slugs.filter((t) => countryForSlug(t) !== mine);
    if (strays.length) failures.push(`${post.slug}: country post drew outside cluster: ${strays}`);
  } else {
    fCount++;
    const strays = slugs.filter((t) => servedByCountry(t));
    if (strays.length) failures.push(`${post.slug}: fallback post drew from M: ${strays}`);
  }

  linkSets.add(slugs.join('|'));
}

const counts = [...inbound.values()];
const min = Math.min(...counts);
const max = Math.max(...counts);
const orphans = [...inbound].filter(([, n]) => n === 0);
const under = [...inbound].filter(([, n]) => n < RELATED_COUNT);

console.log(`posts                 ${posts.length}`);
console.log(`M (country) / F (ring) ${mCount} / ${fCount}   disjoint: ${mCount + fCount === posts.length}`);
console.log(`inbound per post      min ${min}, max ${max}`);
console.log(`zero-inbound posts    ${orphans.length}`);
console.log(`under ${RELATED_COUNT} inbound        ${under.length}`);
console.log(`distinct link-sets    ${linkSets.size}`);

if (min !== RELATED_COUNT || max !== RELATED_COUNT) {
  failures.push(`inbound not uniformly ${RELATED_COUNT} (min ${min}, max ${max})`);
}
if (orphans.length) failures.push(`${orphans.length} orphans: ${orphans.slice(0, 5).map(([s]) => s)}`);
if (linkSets.size < posts.length * 0.9) {
  failures.push(`only ${linkSets.size} distinct link-sets — selection is not spreading`);
}

// Determinism: same input, freshly sorted, must give identical output.
const again = posts.map((p) => pickRelatedPosts(p, [...asPageSeesThem].reverse()).map((x) => x.slug).join('|'));
const first = posts.map((p) => pickRelatedPosts(p, asPageSeesThem).map((x) => x.slug).join('|'));
if (again.join('\n') !== first.join('\n')) {
  failures.push('NOT DETERMINISTIC — output depends on incoming array order');
} else {
  console.log('determinism           stable under reordered input');
}

if (failures.length) {
  console.error(`\n❌ ${failures.length} FAILURE(S)`);
  for (const f of failures.slice(0, 20)) console.error('  - ' + f);
  process.exit(1);
}
console.log('\n✅ all invariants hold');
