/**
 * Generator for src/data/blog-countries.ts — the slug -> country map that
 * decides which "Read next" ring each blog post joins.
 *
 *   npm run blog:countries
 *
 * Run after every new batch of posts and commit the regenerated map in the
 * SAME commit as the posts, so new cities join their country ring on the
 * same deploy.
 *
 * Why a committed static map rather than deriving at request time:
 * getAllPosts() already parses all ~507 posts (28 MB) twice per request, so
 * a third pass would make crawl rate worse. The map changes only when posts
 * are added.
 *
 * ── Country is DERIVED FROM EACH POST, never assumed ──────────────────────
 * Precedence, highest confidence first:
 *   1. gov.uk/foreign-travel-advice/<country> — the URL literally names it.
 *      A post linking two advisories (a border destination) is NOT
 *      auto-picked; it must be listed in MULTI_ADVISORY or it stays unmapped.
 *   2. `## Explore more of <Country>` heading — hand-written editorial intent.
 *      Continental buckets are dropped, not mapped (see BROAD).
 *   3. Country-name/demonym frequency in the visible body, with guards.
 *   4. src/data/destinations.ts (slug -> country).
 * Anything unresolved is left OUT and reported. An unmapped post still gets
 * exactly 3 inbound links from the fallback ring — it is never an orphan.
 */
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const ROOT = process.cwd();
const POSTS_DIR = path.join(ROOT, 'content', 'posts');
const OUT = path.join(ROOT, 'src', 'data', 'blog-countries.ts');

/** Body-tally guards. */
const MIN_HITS = 8;
const MARGIN = 2;

/** gov.uk advisory slug -> canonical country. Also the master country list. */
const FCDO = {
  spain: 'Spain', germany: 'Germany', france: 'France', italy: 'Italy', portugal: 'Portugal',
  greece: 'Greece', turkey: 'Turkey', switzerland: 'Switzerland', austria: 'Austria',
  netherlands: 'Netherlands', belgium: 'Belgium', poland: 'Poland', 'czech-republic': 'Czech Republic',
  hungary: 'Hungary', croatia: 'Croatia', ireland: 'Ireland', denmark: 'Denmark', norway: 'Norway',
  sweden: 'Sweden', finland: 'Finland', iceland: 'Iceland', malta: 'Malta', cyprus: 'Cyprus',
  romania: 'Romania', bulgaria: 'Bulgaria', serbia: 'Serbia', albania: 'Albania', montenegro: 'Montenegro',
  slovenia: 'Slovenia', slovakia: 'Slovakia', estonia: 'Estonia', latvia: 'Latvia', lithuania: 'Lithuania',
  ukraine: 'Ukraine', moldova: 'Moldova', 'north-macedonia': 'North Macedonia', andorra: 'Andorra',
  luxembourg: 'Luxembourg', 'bosnia-and-herzegovina': 'Bosnia and Herzegovina',
  usa: 'United States', canada: 'Canada', mexico: 'Mexico', brazil: 'Brazil', argentina: 'Argentina',
  peru: 'Peru', colombia: 'Colombia', chile: 'Chile', uruguay: 'Uruguay', bolivia: 'Bolivia',
  ecuador: 'Ecuador', panama: 'Panama', 'costa-rica': 'Costa Rica', guatemala: 'Guatemala',
  'dominican-republic': 'Dominican Republic', jamaica: 'Jamaica', cuba: 'Cuba', nicaragua: 'Nicaragua',
  'el-salvador': 'El Salvador', honduras: 'Honduras',
  india: 'India', china: 'China', japan: 'Japan', 'south-korea': 'South Korea', thailand: 'Thailand',
  vietnam: 'Vietnam', cambodia: 'Cambodia', laos: 'Laos', malaysia: 'Malaysia', singapore: 'Singapore',
  indonesia: 'Indonesia', philippines: 'Philippines', 'sri-lanka': 'Sri Lanka', nepal: 'Nepal',
  bangladesh: 'Bangladesh', pakistan: 'Pakistan', myanmar: 'Myanmar', bhutan: 'Bhutan',
  maldives: 'Maldives', taiwan: 'Taiwan', 'hong-kong': 'Hong Kong', mongolia: 'Mongolia',
  uae: 'United Arab Emirates', 'saudi-arabia': 'Saudi Arabia', qatar: 'Qatar', oman: 'Oman',
  jordan: 'Jordan', lebanon: 'Lebanon', bahrain: 'Bahrain', kuwait: 'Kuwait',
  egypt: 'Egypt', morocco: 'Morocco', tunisia: 'Tunisia', algeria: 'Algeria',
  'south-africa': 'South Africa', kenya: 'Kenya', tanzania: 'Tanzania', uganda: 'Uganda',
  rwanda: 'Rwanda', ethiopia: 'Ethiopia', ghana: 'Ghana', nigeria: 'Nigeria', senegal: 'Senegal',
  zambia: 'Zambia', zimbabwe: 'Zimbabwe', botswana: 'Botswana', namibia: 'Namibia',
  'ivory-coast': 'Ivory Coast', mozambique: 'Mozambique',
  australia: 'Australia', 'new-zealand': 'New Zealand', fiji: 'Fiji',
  azerbaijan: 'Azerbaijan', armenia: 'Armenia', georgia: 'Georgia', kazakhstan: 'Kazakhstan',
  uzbekistan: 'Uzbekistan', kyrgyzstan: 'Kyrgyzstan', tajikistan: 'Tajikistan',
};

/** The UK has no foreign-travel-advice page — it is the home country. */
const EXTRA_COUNTRIES = ['United Kingdom'];

/**
 * Posts covering a border destination link two advisories. Each is decided
 * explicitly on where the destination itself sits — never auto-picked.
 */
const MULTI_ADVISORY = {
  'best-hotels-victoria-falls-2026': 'Zimbabwe', // town is Zimbabwean; post covers both banks
};

/** Heading text -> canonical country (only unambiguously single-country). */
const NORMALISE = {
  'the UK': 'United Kingdom', 'the USA': 'United States', 'the Philippines': 'Philippines',
  'the French Alps & France': 'France', 'the French Riviera': 'France',
  'Austria and the Alps': 'Austria', 'Albania and the Balkans': 'Albania',
};

/**
 * Multi-country / continental buckets. Dropped, NOT mapped — grouping a
 * Moroccan post with a South African one under "Africa" would produce
 * "related" links that are not related.
 */
const BROAD = new Set([
  'Africa', 'Southern Africa', 'South America', 'North America', 'the American west',
  'the Caribbean and Mexico', 'the Baltics', 'the Balkans', 'the Balkans and Central Europe',
  'Central Europe', 'Central Asia', 'South Asia', 'Southeast Asia', 'the region',
]);

/** Extra spellings/demonyms a plain country name misses. */
const ALIASES = {
  // NB: no 'Georgian' for Georgia — it collides with Georgian-era architecture
  // and wrongly scored Edinburgh (x19) and Dublin (x16) as Georgia.
  'United Kingdom': ['UK', 'Britain', 'British', 'Scotland', 'Scottish', 'England', 'Wales', 'Welsh', 'Northern Ireland'],
  'United Arab Emirates': ['UAE', 'Emirates', 'Emirati'],
  'United States': ['USA', 'America', 'American'],
  'Bosnia and Herzegovina': ['Bosnia', 'Herzegovina', 'Bosnian'],
  Netherlands: ['Holland', 'Dutch'], Switzerland: ['Swiss'], Germany: ['German'],
  Spain: ['Spanish'], France: ['French'], Italy: ['Italian'], Portugal: ['Portuguese'],
  Greece: ['Greek'], Turkey: ['Turkish', 'Türkiye'], Ireland: ['Irish'], Poland: ['Polish'],
  Austria: ['Austrian'], Belgium: ['Belgian'], Croatia: ['Croatian'], Malta: ['Maltese'],
  Cyprus: ['Cypriot'], Denmark: ['Danish'], Norway: ['Norwegian'], Sweden: ['Swedish'],
  Finland: ['Finnish'], Iceland: ['Icelandic'], 'Czech Republic': ['Czechia', 'Czech'],
  Hungary: ['Hungarian'], Morocco: ['Moroccan'], Egypt: ['Egyptian'], Tunisia: ['Tunisian'],
  India: ['Indian'], China: ['Chinese'], Japan: ['Japanese'], 'South Korea': ['Korea', 'Korean'],
  Thailand: ['Thai'], Vietnam: ['Vietnamese'], Malaysia: ['Malaysian'],
  Indonesia: ['Indonesian'], Philippines: ['Filipino'], 'Sri Lanka': ['Sri Lankan'],
  Mexico: ['Mexican'], Brazil: ['Brazilian'], Canada: ['Canadian'], Australia: ['Australian'],
  'New Zealand': ['Kiwi'], 'South Africa': ['South African'], Cambodia: ['Cambodian'],
  Singapore: ['Singaporean'], Nepal: ['Nepali', 'Nepalese'], Peru: ['Peruvian'],
  Argentina: ['Argentine', 'Argentinian'], Colombia: ['Colombian'],
  'Dominican Republic': ['Dominican'], Jordan: ['Jordanian'], Oman: ['Omani'],
  'Saudi Arabia': ['Saudi'], Qatar: ['Qatari'], Azerbaijan: ['Azerbaijani'],
  Armenia: ['Armenian'], Uzbekistan: ['Uzbek'], Kazakhstan: ['Kazakh'], Kenya: ['Kenyan'],
  Tanzania: ['Tanzanian'], Rwanda: ['Rwandan'], Zimbabwe: ['Zimbabwean'], Zambia: ['Zambian'],
  Ghana: ['Ghanaian'], Nigeria: ['Nigerian'], Taiwan: ['Taiwanese'], Laos: ['Lao', 'Laotian'],
  Bhutan: ['Bhutanese'], Bangladesh: ['Bangladeshi'], Pakistan: ['Pakistani'],
  Maldives: ['Maldivian'],
};

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PATTERNS = new Map();
for (const country of new Set([...Object.values(FCDO), ...EXTRA_COUNTRIES])) {
  const terms = [country, ...(ALIASES[country] ?? [])].map(esc);
  PATTERNS.set(country, new RegExp(`\\b(${terms.join('|')})\\b`, 'g'));
}

/** slug -> country from src/data/destinations.ts (last-resort gap filler). */
function destinationCountries() {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'data', 'destinations.ts'), 'utf8');
  const out = new Map();
  const re = /\bslug:\s*'([^']+)'|\bcountry:\s*'([^']+)'/g;
  let pending = null;
  let m;
  while ((m = re.exec(src))) {
    if (m[1]) pending = m[1];
    else if (m[2] && pending) { out.set(pending, m[2]); pending = null; }
  }
  return out;
}

const destCountry = destinationCountries();
const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.mdx'));

const map = {};
const stats = { fcdo: 0, heading: 0, body: 0, destinations: 0, broadDropped: 0, unresolved: 0, skippedNonHotel: 0 };
const unresolved = [];

for (const file of files) {
  const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
  const { data, content } = matter(raw);
  const slug = data.slug ?? file.replace(/\.mdx$/, '');

  // Only hotel/city posts get a country. Money/Flights/Trends posts group by
  // category in the fallback ring, which is the right neighbour for them.
  if (data.category !== 'Hotels') { stats.skippedNonHotel++; continue; }

  let country = null;

  // 1. FCDO advisory link
  const advisories = [...new Set((content.match(/foreign-travel-advice\/([a-z-]+)/g) || []).map((s) => s.split('/')[1]))].filter((s) => FCDO[s]);
  if (advisories.length === 1) { country = FCDO[advisories[0]]; stats.fcdo++; }
  else if (advisories.length > 1 && MULTI_ADVISORY[slug]) { country = MULTI_ADVISORY[slug]; stats.fcdo++; }

  // 2. "Explore more of <Country>" heading
  if (!country) {
    const h = content.match(/^##\s+Explore more of\s+(.+?)\s*$/m);
    if (h) {
      const v = h[1].trim();
      if (BROAD.has(v)) stats.broadDropped++;
      else { country = NORMALISE[v] ?? v; stats.heading++; }
    }
  }

  // 3. Body-text frequency, guarded
  if (!country) {
    const tally = [];
    for (const [c, re] of PATTERNS) {
      const n = (content.match(re) || []).length;
      if (n) tally.push([c, n]);
    }
    tally.sort((a, b) => b[1] - a[1]);
    const top = tally[0];
    // This is a UK-audience site — "UK visitors", "from the UK" appears in
    // every post. That boilerplate must not block a genuine winner (Dublin
    // scored Ireland x14 vs UK x10), so the UK is skipped as runner-up. It
    // still wins outright when it tops the tally, as on real UK posts.
    const runner = tally.slice(1).find(([c]) => !(top && top[0] !== 'United Kingdom' && c === 'United Kingdom'));
    if (top && top[1] >= MIN_HITS && (!runner || top[1] >= runner[1] * MARGIN)) {
      country = top[0];
      stats.body++;
    }
  }

  // 4. destinations.ts
  if (!country) {
    const key = slug.match(/^best-(?:all-inclusive-)?hotels-(.+)-2026$/)?.[1];
    if (key && destCountry.has(key)) { country = destCountry.get(key); stats.destinations++; }
  }

  if (country) map[slug] = country;
  else { stats.unresolved++; unresolved.push(slug); }
}

const sorted = Object.keys(map).sort();
const clusters = new Map();
for (const s of sorted) clusters.set(map[s], (clusters.get(map[s]) ?? 0) + 1);
const qualifying = [...clusters.values()].filter((n) => n >= 4).length;

const body = `/**
 * slug -> country for blog posts. GENERATED — do not hand-edit.
 * Regenerate with: npm run blog:countries
 *
 * Drives the "Read next" country ring in src/lib/relatedPosts.ts. Each
 * country is derived from the post itself (its gov.uk advisory link, its
 * "Explore more of" heading, or its body text) — never assumed.
 *
 * Posts absent from this map are served by the fallback ring, which still
 * guarantees them 3 inbound links, so an unmapped post is never an orphan.
 * Continental buckets ("Africa", "South America") are deliberately excluded:
 * too broad to imply relatedness.
 *
 * ${sorted.length} posts mapped across ${clusters.size} countries (${qualifying} with >=4 posts).
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
console.log(`  posts scanned        ${files.length}`);
console.log(`  non-Hotels skipped   ${stats.skippedNonHotel}`);
console.log(`  via FCDO advisory    ${stats.fcdo}`);
console.log(`  via heading          ${stats.heading}   (broad buckets dropped: ${stats.broadDropped})`);
console.log(`  via body text        ${stats.body}`);
console.log(`  via destinations.ts  ${stats.destinations}`);
console.log(`  UNRESOLVED           ${stats.unresolved}`);
if (unresolved.length) for (const s of unresolved) console.log(`      - ${s}`);
console.log(`  mapped total         ${sorted.length}`);
console.log(`  countries            ${clusters.size} (${qualifying} with >=4 posts -> country ring)`);
