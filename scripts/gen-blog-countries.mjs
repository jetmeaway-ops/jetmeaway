/**
 * Throwaway generator for src/data/blog-countries.ts.
 *
 * NOT imported by the app. Run it by hand when the corpus grows:
 *   node scripts/gen-blog-countries.mjs
 *
 * Why a committed static map instead of reading MDX at request time:
 * getAllPosts() already parses all 507 files (28 MB) twice per request
 * (see BLOG-INTERNAL-LINKING-PLAN.md A3). Deriving countries at runtime
 * would add a third pass. The map is small and changes only when posts
 * are added, so it is generated once and committed.
 *
 * Sources, in precedence order:
 *   1. The `## Explore more of <Country>` heading already present in the
 *      post body — hand-written, so it reflects real editorial grouping.
 *   2. src/data/destinations.ts (slug -> country) to fill gaps.
 */
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const ROOT = process.cwd();
const POSTS_DIR = path.join(ROOT, 'content', 'posts');
const OUT = path.join(ROOT, 'src', 'data', 'blog-countries.ts');

/**
 * Heading text -> canonical country.
 * Only entries that are unambiguously ONE country. Merging these turns
 * e.g. France's three heading variants into a single 7-post cluster.
 */
const NORMALISE = {
  'the UK': 'United Kingdom',
  'the USA': 'United States',
  'the Philippines': 'Philippines',
  'the French Alps & France': 'France',
  'the French Riviera': 'France',
  'Austria and the Alps': 'Austria',
  'Albania and the Balkans': 'Albania',
};

/**
 * Multi-country / continental / meaningless buckets. These are dropped,
 * NOT mapped — grouping a Moroccan post with a South African one under
 * "Africa" would produce "related" links that are not related, which is
 * the templated-duplication problem this whole exercise is trying to avoid.
 * Posts landing here fall through to the fallback ring, which still
 * guarantees them 3 inbound links.
 */
const DROP = new Set([
  'Africa',
  'Southern Africa',
  'South America',
  'North America',
  'the American west',
  'the Caribbean and Mexico',
  'the Baltics',
  'the Balkans',
  'the Balkans and Central Europe',
  'Central Europe',
  'Central Asia',
  'South Asia',
  'Southeast Asia',
  'the region',
]);

/** slug -> country from src/data/destinations.ts (fills gaps only). */
function destinationCountries() {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'data', 'destinations.ts'), 'utf8');
  const out = new Map();
  // Within each object literal `slug:` always precedes `country:`, so a
  // sequential scan pairs them correctly without parsing TypeScript.
  const re = /\bslug:\s*'([^']+)'|\bcountry:\s*'([^']+)'/g;
  let pendingSlug = null;
  let m;
  while ((m = re.exec(src))) {
    if (m[1]) pendingSlug = m[1];
    else if (m[2] && pendingSlug) {
      out.set(pendingSlug, m[2]);
      pendingSlug = null;
    }
  }
  return out;
}

const destCountry = destinationCountries();
const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.mdx'));

const map = {};
const stats = { fromHeading: 0, fromDestinations: 0, dropped: 0, unmapped: 0 };

for (const file of files) {
  const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
  const { data, content } = matter(raw);
  const slug = data.slug ?? file.replace(/\.mdx$/, '');

  let country = null;

  const heading = content.match(/^##\s+Explore more of\s+(.+?)\s*$/m);
  if (heading) {
    const rawValue = heading[1].trim();
    if (DROP.has(rawValue)) {
      stats.dropped++;
    } else {
      country = NORMALISE[rawValue] ?? rawValue;
      stats.fromHeading++;
    }
  }

  if (!country) {
    const key = slug.match(/^best-(?:all-inclusive-)?hotels-(.+)-2026$/)?.[1];
    if (key && destCountry.has(key)) {
      country = destCountry.get(key);
      stats.fromDestinations++;
    }
  }

  if (country) map[slug] = country;
  else stats.unmapped++;
}

const sorted = Object.keys(map).sort();
const clusters = new Map();
for (const s of sorted) clusters.set(map[s], (clusters.get(map[s]) ?? 0) + 1);
const qualifying = [...clusters.values()].filter((n) => n >= 4).length;

const body = `/**
 * slug -> country for blog posts. GENERATED — do not hand-edit.
 * Regenerate with: node scripts/gen-blog-countries.mjs
 *
 * Used only by the "Read next" selection in src/app/blog/[slug]/page.tsx
 * to group genuinely related siblings. Posts absent from this map are
 * served by the fallback ring, which still guarantees them 3 inbound
 * links — an unmapped post is never an orphan.
 *
 * Continental buckets ("Africa", "South America", "the Balkans") are
 * deliberately excluded: they are too broad to imply relatedness.
 *
 * ${sorted.length} of ${files.length} posts mapped across ${clusters.size} countries.
 */
export const BLOG_COUNTRIES: Readonly<Record<string, string>> = {
${sorted.map((s) => `  ${JSON.stringify(s)}: ${JSON.stringify(map[s])},`).join('\n')}
};

/** Country for a post slug, or null when unmapped (falls back to the ring). */
export function countryForSlug(slug: string): string | null {
  return BLOG_COUNTRIES[slug] ?? null;
}
`;

fs.writeFileSync(OUT, body, 'utf8');

console.log(`wrote ${path.relative(ROOT, OUT)}`);
console.log(`  posts scanned      ${files.length}`);
console.log(`  from heading       ${stats.fromHeading}`);
console.log(`  from destinations  ${stats.fromDestinations}`);
console.log(`  dropped (broad)    ${stats.dropped}`);
console.log(`  unmapped           ${stats.unmapped}`);
console.log(`  mapped total       ${sorted.length}`);
console.log(`  countries          ${clusters.size} (${qualifying} with >=4 posts)`);
