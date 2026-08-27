#!/usr/bin/env node
// Second-chance sweep for `<HotelPhoto hotelName="X" city="Y" />` tags that the
// city-scoped swap missed. Scans EVERY scratch/*-hotels-api.json (some hotels
// are indexed under a different city name than the post's) and tries a strict
// substring match — must contain a strong distinctive brand token OR full name
// contains the hotel name. HEAD-verifies the resulting cupid URL. Writes to
// both main-repo and worktree paths.

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MAIN_REPO = resolve(__dirname, '..');
const WORKTREE = resolve(MAIN_REPO, '.claude/worktrees/sad-babbage-9a05f2');

const WRITE = process.argv.includes('--write');

const GENERIC = new Set([
  'hotel', 'hotels', 'the', 'a', 'an', 'de', 'du', 'la', 'le', 'les', 'y', 'and', 'by',
  'in', 'at', 'on', 'of', 'and', 'palace', 'palaces', 'resort', 'resorts', 'suites',
  'apartments', 'apartment', 'inn', 'lodge', 'lodges',
]);
function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[’'`]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((w) => w && !GENERIC.has(w));
}

// Load per-file indexes so we can restrict matches to a target post's own city
// (avoids "Four Seasons Boston" fuzzy-matching a Four Seasons Atlanta record).
function loadIndexesByFile() {
  const dir = resolve(MAIN_REPO, 'scratch');
  const files = readdirSync(dir).filter((f) => f.endsWith('-hotels-api.json'));
  const byFile = new Map(); // filename → Map(normKey → entry)
  for (const f of files) {
    const idx = new Map();
    try {
      const d = JSON.parse(readFileSync(resolve(dir, f), 'utf8'));
      const hotels = d.hotels || d.results || (Array.isArray(d) ? d : []);
      for (const h of hotels) {
        if (!h?.id || !h?.name || !h?.thumbnail) continue;
        const key = norm(h.name).join(' ');
        if (!key) continue;
        if (!idx.has(key)) idx.set(key, { name: h.name, thumbnail: h.thumbnail, id: h.id, source: f });
      }
    } catch { /* skip */ }
    byFile.set(f, idx);
  }
  return byFile;
}

// Map a post slug to the API files that likely cover it. Some cities have sub-region files.
function apisForSlug(citySlug) {
  const map = {
    'all-inclusive-hotels-turkey': ['turkey-hotels-api.json', 'turkey-antalya-hotels-api.json', 'turkey-belek-hotels-api.json', 'turkey-bodrum-hotels-api.json', 'turkey-alanya-hotels-api.json'],
    'los-angeles': ['la-hotels-api.json', 'la-anaheim-hotels-api.json', 'la-beverly-hills-hotels-api.json', 'la-hollywood-hotels-api.json', 'la-long-beach-hotels-api.json', 'la-santa-monica-hotels-api.json'],
    'seattle': ['seattle-hotels-api.json', 'seattle-bellevue-hotels-api.json', 'seattle-renton-hotels-api.json', 'seattle-seatac-hotels-api.json'],
    'las-vegas': ['vegas-hotels-api.json'],
  };
  return map[citySlug] || [`${citySlug}-hotels-api.json`];
}

function findMatch(targetName, index) {
  const tokens = norm(targetName);
  if (tokens.length === 0) return null;
  const targetKey = tokens.join(' ');

  // 1. Exact key match.
  if (index.has(targetKey)) return index.get(targetKey);

  // 2. Substring key match — index key contains target OR target contains index key.
  // Require at least 2 distinctive shared tokens (or 1 if it's a rare brand name ≥ 6 chars).
  const targetSet = new Set(tokens);
  let best = null;
  let bestScore = 0;
  for (const [k, entry] of index) {
    const kTokens = k.split(' ');
    let hits = 0;
    for (const t of kTokens) if (targetSet.has(t)) hits += 1;
    const shortLen = Math.min(tokens.length, kTokens.length);
    if (shortLen === 0) continue;
    const ratio = hits / shortLen;
    // Strict: require ≥60% overlap AND at least 2 hits (or 1 hit on a ≥7-char token).
    const oneStrong = hits === 1 && kTokens.some((t) => t.length >= 7 && targetSet.has(t));
    if ((hits >= 2 || oneStrong) && ratio >= 0.6 && hits > bestScore) {
      bestScore = hits;
      best = entry;
    }
  }
  return best;
}

async function headOk(url) {
  try {
    const r = await fetch(url, { method: 'HEAD' });
    return r.ok;
  } catch { return false; }
}

async function processFile(mainPath, byFile) {
  const txt = readFileSync(mainPath, 'utf8');
  const base = mainPath.split(/[\\/]/).pop();
  let citySlug = '';
  let mm = base.match(/^best-hotels-(.+)-2026\.mdx$/);
  if (mm) citySlug = mm[1];
  else if ((mm = base.match(/^best-all-inclusive-hotels-(.+)-2026\.mdx$/))) citySlug = `all-inclusive-hotels-${mm[1]}`;
  // Build combined city-scoped index from likely API files.
  const cityIndex = new Map();
  for (const apiFile of apisForSlug(citySlug)) {
    const idx = byFile.get(apiFile);
    if (!idx) continue;
    for (const [k, v] of idx) if (!cityIndex.has(k)) cityIndex.set(k, v);
  }

  const tagRe = /<HotelPhoto\s+hotelName="([^"]+)"\s+city="([^"]+)"\s*\/>/g;
  const uniqTags = new Map();
  let m;
  while ((m = tagRe.exec(txt)) !== null) {
    const [full, hotelName] = m;
    if (uniqTags.has(full)) continue;
    const match = findMatch(hotelName, cityIndex);
    if (match) {
      const md = `![${hotelName}](${match.thumbnail})`;
      uniqTags.set(full, { hotelName, replacement: md, source: match.source });
    } else {
      uniqTags.set(full, { hotelName, replacement: null });
    }
  }

  const swaps = [];
  for (const [, entry] of uniqTags) if (entry.replacement) swaps.push(entry);
  if (swaps.length === 0) return { path: mainPath, swaps: 0 };

  const uniqUrls = [...new Set(swaps.map((s) => s.replacement.match(/\(([^)]+)\)/)[1]))];
  const headResults = await Promise.all(uniqUrls.map(async (u) => [u, await headOk(u)]));
  const bad = new Set(headResults.filter(([, ok]) => !ok).map(([u]) => u));

  let out = txt;
  const applied = [];
  for (const [full, entry] of uniqTags) {
    if (!entry.replacement) continue;
    const url = entry.replacement.match(/\(([^)]+)\)/)[1];
    if (bad.has(url)) continue;
    out = out.split(full).join(entry.replacement);
    applied.push({ hotelName: entry.hotelName, source: entry.source });
  }

  if (WRITE && out !== txt) {
    writeFileSync(mainPath, out);
    const worktreeMirror = mainPath.replace(MAIN_REPO, WORKTREE);
    if (existsSync(worktreeMirror)) writeFileSync(worktreeMirror, out);
  }

  return { path: mainPath, swaps: applied.length, applied };
}

async function main() {
  const byFile = loadIndexesByFile();
  console.log(`Loaded ${byFile.size} API files.\n`);
  const dir = resolve(MAIN_REPO, 'content/posts');
  const files = readdirSync(dir)
    .filter((f) => f.match(/^best-(hotels-|all-inclusive-hotels-).+-2026\.mdx$/))
    .sort();
  let total = 0;
  for (const f of files) {
    const r = await processFile(resolve(dir, f), byFile);
    if (r.swaps > 0) {
      total += r.swaps;
      const slug = f.replace(/^best-(hotels-|all-inclusive-hotels-)/, '').replace(/-2026\.mdx$/, '');
      console.log(`[${slug.padEnd(28)}] +${r.swaps} extra swap(s)`);
      for (const a of r.applied) console.log(`    ${a.hotelName} ← ${a.source}`);
    }
  }
  console.log(`\nTotal ${total} extra swaps ${WRITE ? 'written' : '(dry-run)'} across ${files.length} files.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
