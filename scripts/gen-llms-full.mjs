/**
 * Generator for public/llms-full.txt — the complete machine-readable index
 * of every page on jetmeaway.co.uk, for AI crawlers (ChatGPT, Perplexity,
 * Copilot, Claude, Google AI).
 *
 *   npm run blog:llms-full
 *
 * Run after every new batch of posts and commit the regenerated file with
 * them, so newly-published guides appear in the AI index immediately.
 *
 * Design: llms.txt is the SHORT curated overview (hand-maintained in
 * public/llms.txt). llms-full.txt is the LONG complete index — every
 * blog article with its real title + excerpt, grouped by topic. We do NOT
 * inline full article bodies: 507 posts x ~6,000 words would be a multi-MB
 * file crawlers would truncate. Title + one-line excerpt per URL is the
 * useful, citable unit.
 *
 * 100% derived from real frontmatter (title, slug, excerpt) — nothing is
 * invented. The curated head is read verbatim from public/llms.txt so the
 * two files never contradict each other.
 */
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const ROOT = process.cwd();
const POSTS_DIR = path.join(ROOT, 'content', 'posts');
const LLMS = path.join(ROOT, 'public', 'llms.txt');
const OUT = path.join(ROOT, 'public', 'llms-full.txt');
const BASE = 'https://jetmeaway.co.uk';

/** Friendly section headings per frontmatter category. Unlisted -> as-is. */
const SECTION = {
  Hotels: 'Hotel guides',
  Destinations: 'Destination & neighbourhood guides',
  'Destination Guides': 'Destination & neighbourhood guides',
  Money: 'Money, fares & booking tips',
  Flights: 'Flight guides',
  'World Cup 2026': 'World Cup 2026',
  'Religious Travel': 'Religious & pilgrimage travel',
  Wellness: 'Wellness travel',
  'Hidden Gems': 'Hidden gems',
  Trends: 'Travel trends',
  Tools: 'Tools',
  eSIM: 'eSIM & connectivity',
  Scout: 'Scout Reports',
};

const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

const posts = fs
  .readdirSync(POSTS_DIR)
  .filter((f) => f.endsWith('.mdx'))
  .map((f) => {
    const { data } = matter(fs.readFileSync(path.join(POSTS_DIR, f), 'utf8'));
    return {
      slug: data.slug ?? f.replace(/\.mdx$/, ''),
      title: clean(data.title),
      excerpt: clean(data.excerpt),
      category: data.category ?? 'Other',
    };
  });

// Group by section label, biggest section first, posts sorted by title.
const groups = new Map();
for (const p of posts) {
  const label = SECTION[p.category] ?? p.category;
  if (!groups.has(label)) groups.set(label, []);
  groups.get(label).push(p);
}
const ordered = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);

const curatedHead = fs.readFileSync(LLMS, 'utf8').trimEnd();

let out = curatedHead;
out += '\n\n---\n\n';
out += `# Complete article index (${posts.length} guides)\n\n`;
out += '> Every article on jetmeaway.co.uk/blog, with a one-line summary. '
  + 'Generated from live content; see /llms.txt for the short overview.\n\n';

for (const [label, list] of ordered) {
  list.sort((a, b) => a.title.localeCompare(b.title));
  out += `## ${label} (${list.length})\n\n`;
  for (const p of list) {
    const desc = p.excerpt ? `: ${p.excerpt}` : '';
    out += `- [${p.title}](${BASE}/blog/${p.slug})${desc}\n`;
  }
  out += '\n';
}

fs.writeFileSync(OUT, out.trimEnd() + '\n', 'utf8');

const bytes = fs.statSync(OUT).size;
console.log(`wrote ${path.relative(ROOT, OUT)}`);
console.log(`  articles indexed  ${posts.length}`);
console.log(`  sections          ${ordered.length}`);
console.log(`  file size         ${(bytes / 1024).toFixed(1)} KB`);
