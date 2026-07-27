/**
 * SEO title rewriter — fit blog titles under Google's ~60-char SERP limit.
 *
 *   node scripts/gen-seo-titles.mjs          # DRY RUN: print proposed + flags, change nothing
 *   node scripts/gen-seo-titles.mjs --apply  # rewrite frontmatter `title:` in place
 *
 * 97% of titles exceed 60 chars and truncate in Google, burying the hook.
 * The rendered SERP <title> is `${post.title} | JetMeAway` (verified in
 * src/app/blog/[slug]/page.tsx generateMetadata), so editing frontmatter
 * `title:` is the correct lever.
 *
 * Owner-approved uniform formula (2026-07-27):
 *   hotels:          "{City} Hotels 2026: {N} Real Stays From £{floor}"
 *   all-inclusive:   "{City} All-Inclusive Hotels 2026: {N} Resorts From £{floor}"
 * Front-loads the exact search phrase + number + price — the parts that
 * survive truncation and drive clicks.
 *
 * 🔴 NEVER INVENT. City, N and floor are extracted from the post itself.
 * If any can't be extracted with confidence, the post is FLAGGED and left
 * untouched — never guessed. Only category:"Hotels" posts are in scope
 * (World Cup / Money / eSIM / comparison posts keep their own titles).
 *
 * Byte-preserving: only the single `title:` line is replaced; the file's
 * own EOL is kept; frontmatter is never round-tripped through a YAML dumper.
 */
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const APPLY = process.argv.includes('--apply');
const D = path.join(process.cwd(), 'content', 'posts');
const MAXLEN = 60; // core title target; the " | JetMeAway" suffix can truncate harmlessly

/** Clean display city — prefer ctaCity, else the text before "Hotels" in the current title. */
function cityName(data) {
  if (data.ctaCity && String(data.ctaCity).trim()) return String(data.ctaCity).trim();
  const m = String(data.title || '').match(/^(?:Best\s+)?(.+?)\s+(?:All-Inclusive\s+)?Hotels\b/i);
  return m ? m[1].trim() : null;
}

/** Count = NUMBER OF numbered hotel entries (not the max index — numbering
 *  can be non-contiguous, e.g. Dubai lists 49 hotels numbered up to 76). */
function hotelCount(content) {
  const entries = content.match(/^\*\*\d+\.\s*\[/gm);
  return entries ? entries.length : null;
}

/** Floor = the CHEAPEST hotel in the list — min of the per-hotel
 *  "· from ~£N/night" prices. That is the real advertised floor, not the
 *  first "From £" in the body (which may be a mid-range pick). */
function floorPrice(content) {
  const prices = [...content.matchAll(/from ~?£(\d+)\s*\/\s*night/gi)].map((m) => Number(m[1]));
  return prices.length ? Math.min(...prices) : null;
}

/** The count the post's excerpt claims about itself — cross-check only.
 *  Allows up to 2 filler words between the number and hotels/resorts/... */
function excerptClaim(excerpt) {
  const m = String(excerpt || '').match(/\b(\d+)\s+(?:[A-Za-z][A-Za-z-]*\s+){0,2}(?:hotels|resorts|stays|picks|properties)\b/i);
  return m ? Number(m[1]) : null;
}

const files = fs.readdirSync(D).filter((f) => f.endsWith('.mdx'));
const rows = [];
const flags = [];

for (const file of files) {
  const raw = fs.readFileSync(path.join(D, file), 'utf8');
  const { data, content } = matter(raw);
  const slug = data.slug ?? file.replace(/\.mdx$/, '');

  if (data.category !== 'Hotels') continue; // out of scope

  const allInclusive = /^best-all-inclusive-hotels-/.test(slug);
  const city = cityName(data);
  const listN = hotelCount(content);
  const claim = excerptClaim(data.excerpt);
  const floor = floorPrice(content);

  // Count = the actual number of listed hotels. Cross-check against the
  // excerpt's public claim; if BOTH exist and disagree by >2, flag (never guess).
  const n = listN;
  if (n && claim && Math.abs(claim - n) > 2) {
    flags.push({ file, reason: `count conflict: list=${n} vs excerpt=${claim}` });
    continue;
  }

  // City + count are required. Floor price is preferred but optional: older
  // curated posts are range-priced (£160–260, £100+) with no honest single
  // floor, so those get a price-free variant rather than an invented number.
  if (!city || !n) {
    flags.push({ file, reason: `city=${city ?? 'NULL'} n=${n ?? 'NULL'}` });
    continue;
  }

  const kind = allInclusive ? 'All-Inclusive Hotels' : 'Hotels';
  let title;
  if (floor) {
    const noun = allInclusive ? 'Resorts' : 'Real Stays';
    title = `${city} ${kind} 2026: ${n} ${noun} From £${floor}`;
  } else {
    // No honest floor → real count, no price.
    const noun = allInclusive ? 'Top Resorts, Ranked' : 'Best Stays, Ranked';
    title = `${city} ${kind} 2026: ${n} ${noun}`;
  }

  if (title.length > MAXLEN) {
    flags.push({ file, reason: `formula still >${MAXLEN}: "${title}" (${title.length})` });
    continue;
  }
  rows.push({ file, slug, old: data.title, new: title, len: title.length });
}

// --- apply or report ---
if (APPLY) {
  let changed = 0;
  for (const r of rows) {
    const p = path.join(D, r.file);
    const raw = fs.readFileSync(p, 'utf8');
    const eol = raw.includes('\r\n') ? '\r\n' : '\n';
    // Replace only the title: line inside the frontmatter block.
    const out = raw.replace(/^title:.*$/m, `title: ${JSON.stringify(r.new)}`);
    if (out !== raw) {
      fs.writeFileSync(p, out.split('\n').join(eol === '\r\n' ? '\n' : '\n')); // keep bytes; replace() preserved EOLs already
      fs.writeFileSync(p, out); // out already has original EOLs (single-line replace)
      changed++;
    }
  }
  console.log(`applied ${changed} title rewrites`);
} else {
  console.log(`SCOPE: category "Hotels" posts`);
  console.log(`would rewrite: ${rows.length}`);
  console.log(`flagged (left untouched): ${flags.length}`);
  console.log(`\n--- sample (first 15) ---`);
  for (const r of rows.slice(0, 15)) {
    console.log(`  ${r.new}   [${r.len}]`);
  }
  console.log(`\n--- longest 5 proposed (nearest the limit) ---`);
  for (const r of [...rows].sort((a, b) => b.len - a.len).slice(0, 5)) console.log(`  ${r.len}  ${r.new}`);
  if (flags.length) {
    console.log(`\n--- FLAGGED, need manual (first 20) ---`);
    for (const f of flags.slice(0, 20)) console.log(`  ${f.file}  — ${f.reason}`);
  }
}
