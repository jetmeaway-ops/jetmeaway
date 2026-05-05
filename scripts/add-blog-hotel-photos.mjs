#!/usr/bin/env node
/**
 * Inject <HotelPhoto> tags into every best-hotels-*-2026.mdx blog post.
 *
 * For each "**N. Hotel Name** —" hotel block in a post, prepends a
 * <HotelPhoto hotelName="..." city="..." /> line so the rendered post
 * gets a real Google Places photo above each hotel's text/video.
 *
 * Idempotent — if a <HotelPhoto> is already directly above a numbered
 * hotel line, the script skips that hotel and prints SKIP.
 *
 * No network calls here — the actual Google Places lookup happens at
 * request time via the HotelPhoto server component (KV-cached 30 days).
 *
 * Usage: node scripts/add-blog-hotel-photos.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');

// Map MDX filenames → city string passed into <HotelPhoto city="…" />.
// Most posts use the slug between "best-hotels-" and "-2026" with
// title-casing applied. The four special cases are listed explicitly.
const SPECIAL_CITIES = {
  'best-all-inclusive-hotels-turkey-2026.mdx': 'Turkey',
  'best-hotels-taj-mahal-2026.mdx':            'Agra',
  'best-hotels-victoria-falls-2026.mdx':       'Victoria Falls',
};

function deriveCity(filename) {
  if (SPECIAL_CITIES[filename]) return SPECIAL_CITIES[filename];
  // best-hotels-{slug}-2026.mdx → titlecase(slug)
  const m = filename.match(/^best-hotels-(.+)-2026\.mdx$/);
  if (!m) return null;
  return m[1]
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function listTargetFiles() {
  return fs
    .readdirSync(POSTS_DIR)
    .filter((f) => /^best-(hotels|all-inclusive-hotels)-.+-2026\.mdx$/.test(f));
}

/**
 * Returns the JSX-safe form of a hotel name for the hotelName="…" attr.
 * MDX/JSX requires straight quotes inside the attribute, and we strip
 * any backticks or stray asterisks just in case the markdown bold
 * markers aren't perfectly balanced in source.
 */
function escapeAttr(name) {
  return name
    .trim()
    .replace(/[*`]/g, '')
    .replace(/"/g, '&quot;');
}

function processFile(absPath) {
  const filename = path.basename(absPath);
  const city = deriveCity(filename);
  if (!city) return { filename, status: 'skip-no-city' };

  const original = fs.readFileSync(absPath, 'utf8');
  const lines = original.split('\n');

  // Match "**1. Hotel Name** —" — the canonical hotel-block opener.
  // Captures: 1=number, 2=hotel name (raw, with possible backticks).
  const HOTEL_RE = /^\*\*(\d+)\.\s+(.+?)\*\*\s+—/;
  // H2 headings that signal we've left the hotels listing. Some posts
  // use multiple hotel-section H2s ("## Riverside Hotels", "## Sukhumvit
  // Hotels", "## Gothic Quarter and El Born — Medieval Atmosphere") so
  // we can't just stop at the first H2 after a hotel block. Instead we
  // stop at any H2 whose text matches the patterns below — every hotel
  // post in the corpus tails off into one of these sections.
  const STOP_H2_RE = new RegExp(
    [
      'things to do',
      'essential experiences?',
      'rooftop bar.*guide',
      'beyond the hotel',
      'uk flights',
      'flights and practical',
      'privacy shield',
      'ready to book',
      "scout'?s verdict",
      'what does',
      'when is the best',
      'how to find',
      'quick comparison',
      'do uk traveller',
      'frequently asked',
      'where to eat',
      'where to stay',
      'neighbourhoods?',
      'practicalities',
    ].join('|'),
    'i',
  );
  const out = [];
  let injected = 0;
  let skipped = 0;

  // State machine: inject inside any H2 section UNTIL we hit one whose
  // heading matches STOP_H2_RE. After that, never inject again.
  //   'on'   = injection active (default)
  //   'done' = past the hotel listing, no more injections
  let state = 'on';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (state === 'on' && line.startsWith('## ') && STOP_H2_RE.test(line)) {
      state = 'done';
      out.push(line);
      continue;
    }

    const match = line.match(HOTEL_RE);
    if (!match || state === 'done') {
      out.push(line);
      continue;
    }

    const hotelName = escapeAttr(match[2]);
    // Look back over the last 4 non-blank lines — if a HotelPhoto with
    // the same hotelName is already there, skip the inject (idempotency).
    const lookback = out.slice(-4).join('\n');
    if (lookback.includes(`<HotelPhoto hotelName="${hotelName}"`)) {
      out.push(line);
      skipped++;
      continue;
    }

    out.push(`<HotelPhoto hotelName="${hotelName}" city="${escapeAttr(city)}" />`);
    out.push(''); // blank line so MDX renders the JSX block standalone
    out.push(line);
    injected++;
  }

  const next = out.join('\n');
  if (next === original) {
    return { filename, city, injected, skipped, status: 'unchanged' };
  }
  fs.writeFileSync(absPath, next, 'utf8');
  return { filename, city, injected, skipped, status: 'written' };
}

const files = listTargetFiles();
console.log(`Found ${files.length} hotel city posts.\n`);

let totalInjected = 0;
let totalSkipped = 0;
let written = 0;

for (const file of files) {
  const result = processFile(path.join(POSTS_DIR, file));
  if (result.status === 'skip-no-city') {
    console.log(`  SKIP (no city) ${result.filename}`);
    continue;
  }
  if (result.status === 'unchanged') {
    console.log(`  UNCH ${result.filename.padEnd(48)} ${result.injected}+ / ${result.skipped}=`);
    continue;
  }
  console.log(`  WROT ${result.filename.padEnd(48)} +${result.injected} (skipped ${result.skipped}) city=${result.city}`);
  totalInjected += result.injected;
  totalSkipped += result.skipped;
  written++;
}

console.log(
  `\nDone. Wrote ${written}/${files.length} files. Injected ${totalInjected} HotelPhoto tags. Skipped ${totalSkipped} that already had one.`,
);
