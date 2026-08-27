#!/usr/bin/env node
// After swap-hotelphoto-to-cupid.mjs, some pairs of DIFFERENT hotel names may
// have both fuzzy-matched to the same cupid URL. Revert the SECOND (and later)
// occurrences back to <HotelPhoto> so at least the first mapping is retained
// and the collision doesn't render two hotels with the same photo.
//
// A duplicate is a COLLISION only if the same URL is paired with distinct hotel names.
// Same URL + same name (e.g. Scout box + luxury tier + at-a-glance table referencing
// the same hotel) is expected and OK.

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MAIN_REPO = resolve(__dirname, '..');
const WORKTREE = resolve(MAIN_REPO, '.claude/worktrees/sad-babbage-9a05f2');

const WRITE = process.argv.includes('--write');

function processFile(mainPath) {
  const txt = readFileSync(mainPath, 'utf8');
  const lines = txt.split(/\r?\n/);
  const urlMatch = /!\[([^\]]*)\]\((https:\/\/static\.cupid\.travel\/hotels\/[^)]+)\)/;
  // URL → array of {name, lineIndex}
  const usages = new Map();
  lines.forEach((ln, i) => {
    const m = ln.match(urlMatch);
    if (!m) return;
    const name = m[1].trim();
    const url = m[2];
    if (!usages.has(url)) usages.set(url, []);
    usages.get(url).push({ name, lineIndex: i, original: ln });
  });

  // Normalize a caption to distinctive tokens (drop location + generic words).
  const LOCATION_STOP = new Set([
    'hotel', 'hotels', 'the', 'a', 'an', 'de', 'du', 'la', 'le', 'les', 'y', 'and', 'by',
    'in', 'at', 'on', 'of', 'and', 'nice', 'paris', 'lyon', 'nyc', 'new', 'york', 'atlanta', 'boston',
    'bangkok', 'bordeaux', 'lisbon', 'marrakech', 'marseille', 'lasvegas', 'vegas', 'lisbon',
    'marseille', 'san', 'francisco', 'taj', 'mahal', 'agra', 'monastiraki', 'plaka', 'athens',
    'palace', 'palace', 'resort', 'suites', 'apartments', 'apartment', 'blvd', 'boulevard',
    'avenue', 'rue', 'strasse', 'straße', 'road', 'quarter', 'district', 'centre', 'center',
  ]);
  function distinctiveTokens(name) {
    // Don't split on em-dash — captions after — often contain the distinctive name (e.g. "Sofitel Marseille — X").
    return String(name || '')
      .toLowerCase()
      .replace(/[’'`]/g, '')
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter((w) => w && !LOCATION_STOP.has(w));
  }

  // Location-ish tokens that appear across sibling hotels — sharing these alone doesn't mean same hotel.
  const LOCATION_ISH = new Set([
    'jumeirah', 'beach', 'palm', 'marina', 'downtown', 'centro', 'centre', 'center',
    'old', 'city', 'town', 'quarter', 'side', 'view', 'square', 'plaza', 'park', 'gate',
    'north', 'south', 'east', 'west', 'central', 'main', 'grand',
    'lake', 'river', 'harbor', 'harbour', 'port', 'bay', 'canal', 'valley', 'hill', 'hills',
    'garden', 'gardens', 'boulevard', 'avenue', 'street', 'road', 'walk', 'front',
    'international', 'financial', 'business', 'district',
  ]);

  const reverts = [];
  for (const [url, uses] of usages) {
    if (uses.length < 2) continue;
    const firstTokens = distinctiveTokens(uses[0].name);
    const firstBrand = firstTokens.filter((t) => !LOCATION_ISH.has(t));
    for (let i = 1; i < uses.length; i += 1) {
      const t = distinctiveTokens(uses[i].name);
      const brand = t.filter((tok) => !LOCATION_ISH.has(tok));
      // If either is empty after brand-strip, fall back to raw distinctive comparison.
      const firstSet = new Set(firstBrand.length ? firstBrand : firstTokens);
      const iSet = new Set(brand.length ? brand : t);
      if (firstSet.size === 0 && iSet.size === 0) continue; // truly nothing to compare, keep.
      let hits = 0;
      for (const tok of iSet) if (firstSet.has(tok)) hits += 1;
      // Require at least ONE brand-level shared token to consider it the same hotel.
      // (Was: overlap ≥ 0.5, which let "Jumeirah Beach" tokens cover 3 different brands.)
      if (hits === 0) reverts.push(uses[i]);
    }
  }

  if (reverts.length === 0) return { path: mainPath, collisions: 0, reverted: 0 };

  // Guess city from filename slug: best-hotels-<slug>-2026.mdx  OR  best-all-inclusive-hotels-<slug>-2026.mdx
  const base = mainPath.split(/[\\/]/).pop();
  let citySlug = '';
  let mm = base.match(/^best-hotels-(.+)-2026\.mdx$/);
  if (mm) citySlug = mm[1];
  else if ((mm = base.match(/^best-all-inclusive-hotels-(.+)-2026\.mdx$/))) citySlug = mm[1];
  const cityDisplay = citySlug
    .split('-')
    .map((w) => (w === 'and' ? 'and' : w[0]?.toUpperCase() + w.slice(1)))
    .join(' ');

  for (const r of reverts) {
    const replacement = `<HotelPhoto hotelName="${r.name}" city="${cityDisplay}" />`;
    lines[r.lineIndex] = lines[r.lineIndex].replace(urlMatch, replacement);
  }

  const out = lines.join('\n');
  if (WRITE) {
    writeFileSync(mainPath, out);
    const worktreeMirror = mainPath.replace(MAIN_REPO, WORKTREE);
    if (existsSync(worktreeMirror)) writeFileSync(worktreeMirror, out);
  }

  return {
    path: mainPath,
    collisions: reverts.length,
    reverted: reverts.map((r) => r.name),
  };
}

function main() {
  const dir = resolve(MAIN_REPO, 'content/posts');
  const files = readdirSync(dir)
    .filter((f) => f.match(/^best-(hotels-|all-inclusive-hotels-).+-2026\.mdx$/))
    .sort();
  let totalCollisions = 0;
  for (const f of files) {
    const r = processFile(resolve(dir, f));
    if (r.collisions > 0) {
      totalCollisions += r.collisions;
      const slug = f.replace(/^best-(hotels-|all-inclusive-hotels-)/, '').replace(/-2026\.mdx$/, '');
      console.log(`[${slug.padEnd(28)}] ${r.collisions} reverted: ${r.reverted.join(' | ')}`);
    }
  }
  console.log(`\nTotal ${totalCollisions} collisions ${WRITE ? 'reverted' : '(dry-run)'} across ${files.length} files.`);
}

main();
