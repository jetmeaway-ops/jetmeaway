#!/usr/bin/env node
// Swap <HotelPhoto hotelName="X" city="Y" /> → ![X](https://static.cupid.travel/...)
// Reads scratch/<city>-tier-data.txt for the name→cupid-URL mapping.
// Writes back to BOTH the main-repo copy and the worktree copy so dev server + git stay in sync.
//
// Usage:
//   node scripts/swap-hotelphoto-to-cupid.mjs <city>            # single city, verify only
//   node scripts/swap-hotelphoto-to-cupid.mjs <city> --write    # single city, write
//   node scripts/swap-hotelphoto-to-cupid.mjs --all --write     # all cities

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MAIN_REPO = resolve(__dirname, '..');
const WORKTREE = resolve(MAIN_REPO, '.claude/worktrees/sad-babbage-9a05f2');

const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const ALL = args.includes('--all');
const cityArg = args.find((a) => !a.startsWith('--'));

// City slug on disk → tier-data filename basename (without -tier-data.txt).
// Most cities are 1:1. LA and Turkey have known filename mismatches per the recon report.
const SLUG_TO_TIER = {
  'all-inclusive-hotels-turkey': 'turkey',
  'los-angeles': 'la',
  'las-vegas': 'vegas',
  // Cities without tier-data.txt but with hotels-api.json:
  'athens': 'athens',
  'rome': 'rome',
  'goa': 'goa',
  'kerala': 'kerala',
  'lisbon': 'lisbon',
  'new-york': 'new-york',
  'san-francisco': 'san-francisco',
  'taj-mahal': 'taj-mahal',
};

const TIER_TO_SLUG = {
  turkey: 'all-inclusive-hotels-turkey',
  la: 'los-angeles',
  vegas: 'las-vegas',
};

function normName(s, extraStopwords = []) {
  const stop = new Set(['hotel', 'hotels', 'the', 'a', 'an', 'de', 'du', 'la', 'le', 'y', 'and', 'by', ...extraStopwords]);
  return String(s || '')
    .toLowerCase()
    .replace(/[’'`]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((w) => w && !stop.has(w))
    .join(' ');
}

function parseTierData(txt, extraStop = []) {
  const map = new Map();
  const byId = new Map();
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*\{.*"id":"(la_[a-z0-9]+)".*\}\s*$/);
    if (!m) continue;
    let obj;
    try { obj = JSON.parse(line.trim()); } catch { continue; }
    if (!obj?.id || !obj?.name || !obj?.thumbnail) continue;
    const nn = normName(obj.name, extraStop);
    if (!map.has(nn)) map.set(nn, obj);
    byId.set(obj.id, obj);
  }
  return { byName: map, byId };
}

function loadFullApi(apiPath, extraStop = []) {
  if (!existsSync(apiPath)) return { byName: new Map(), byId: new Map() };
  try {
    const d = JSON.parse(readFileSync(apiPath, 'utf8'));
    const hotels = d.hotels || d.results || (Array.isArray(d) ? d : []);
    const byName = new Map();
    const byId = new Map();
    for (const h of hotels) {
      if (!h?.id || !h?.name || !h?.thumbnail) continue;
      const nn = normName(h.name, extraStop);
      if (!byName.has(nn)) byName.set(nn, { id: h.id, name: h.name, thumbnail: h.thumbnail });
      byId.set(h.id, { id: h.id, name: h.name, thumbnail: h.thumbnail });
    }
    return { byName, byId };
  } catch { return { byName: new Map(), byId: new Map() }; }
}

/**
 * Loose match — strip city tokens from the target, keep the API-side normalized as-is.
 * Used only as a fallback after strict fuzzy fails, to catch cases like MDX="Titania Hotel Athens"
 * vs API="Titania Hotel" (which normalize to "titania athens" vs "titania" — 1 hit, target has 2).
 * With city stripped from target: "titania" vs "titania" → exact match.
 */
function fuzzyLookupOneSided(byName, hotelName, cityTokens) {
  const target = normName(hotelName, cityTokens);
  if (!target) return null;
  if (byName.has(target)) return byName.get(target);
  const targetTokens = target.split(' ');
  if (targetTokens.length === 0) return null;
  // For single-token targets after stripping city, require it to be a distinctive word (≥4 chars)
  // and to appear in the candidate as one of its tokens.
  if (targetTokens.length === 1) {
    const t = targetTokens[0];
    if (t.length < 4) return null;
    for (const [nn, entry] of byName) {
      const nnTokens = new Set(nn.split(' '));
      if (nnTokens.has(t) && nnTokens.size <= 4) return entry; // don't match generic "grand hotel" etc.
    }
    return null;
  }
  return fuzzyLookup(byName, target, []);
}

function fuzzyLookup(byName, hotelName, extraStop = []) {
  const target = normName(hotelName, extraStop);
  if (!target) return null;
  if (byName.has(target)) return byName.get(target);
  const targetTokens = target.split(' ');
  const minHits = targetTokens.length <= 2 ? 1 : 2;
  let best = null;
  let bestScore = 0;
  for (const [nn, entry] of byName) {
    const nnTokens = new Set(nn.split(' '));
    let hits = 0;
    for (const t of targetTokens) if (nnTokens.has(t)) hits += 1;
    const shortLen = Math.min(targetTokens.length, nnTokens.size);
    // For distinctive single-word matches (target len 1 or 2), require all target tokens to match.
    // Otherwise require ≥2 hits and ≥60% of the shorter side matched.
    const distinctive = targetTokens.length <= 2 && hits === targetTokens.length && hits / nnTokens.size >= 0.4;
    const broad = hits >= 2 && hits / shortLen >= 0.6;
    if ((distinctive || broad) && hits >= minHits && hits > bestScore) {
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

async function processCity(citySlug, { write }) {
  const tierBase = SLUG_TO_TIER[citySlug] || citySlug;
  const tierPath = resolve(MAIN_REPO, 'scratch', `${tierBase}-tier-data.txt`);
  const apiPath = resolve(MAIN_REPO, 'scratch', `${tierBase}-hotels-api.json`);
  // For Turkey the post is best-all-inclusive-hotels-turkey-2026.mdx not best-hotels-…
  const mainPost = citySlug.startsWith('all-inclusive-hotels-')
    ? resolve(MAIN_REPO, 'content/posts', `best-${citySlug}-2026.mdx`)
    : resolve(MAIN_REPO, 'content/posts', `best-hotels-${citySlug}-2026.mdx`);

  const hasTier = existsSync(tierPath);
  const hasApi = existsSync(apiPath);
  if (!hasTier && !hasApi) return { citySlug, skipped: true, reason: 'no tier-data and no hotels-api.json' };
  if (!existsSync(mainPost)) return { citySlug, skipped: true, reason: `no post at ${mainPost.replace(MAIN_REPO,'')}` };

  const stopTokens = [];
  const { byName: tierByName } = hasTier ? parseTierData(readFileSync(tierPath, 'utf8'), stopTokens) : { byName: new Map() };
  const { byName: apiByName } = loadFullApi(apiPath, stopTokens);
  const mdxOrig = readFileSync(mainPost, 'utf8');

  const skipped = [];
  const swapped = [];
  let mdx = mdxOrig;

  const tagRe = /<HotelPhoto\s+hotelName="([^"]+)"\s+city="([^"]+)"\s*\/>/g;
  const replacements = new Map();
  let m;
  while ((m = tagRe.exec(mdxOrig)) !== null) {
    const [full, hotelName] = m;
    if (replacements.has(full)) continue;
    // Two-pass: strict first, then loosen by stripping city tokens from the *target only*
    // (not the API side — protects "Hotel Berlin, Berlin" case).
    const citySlugParts = citySlug.split(/[-]+/).filter((w) => w.length >= 3);
    const entry =
      fuzzyLookup(tierByName, hotelName, []) ||
      fuzzyLookup(apiByName, hotelName, []) ||
      fuzzyLookupOneSided(tierByName, hotelName, citySlugParts) ||
      fuzzyLookupOneSided(apiByName, hotelName, citySlugParts);
    if (entry) {
      const md = `![${hotelName}](${entry.thumbnail})`;
      replacements.set(full, md);
      swapped.push({ hotelName, id: entry.id, url: entry.thumbnail });
    } else {
      replacements.set(full, null);
      skipped.push(hotelName);
    }
  }

  for (const [needle, replacement] of replacements) {
    if (!replacement) continue;
    // global replace of literal string
    mdx = mdx.split(needle).join(replacement);
  }

  // HEAD-verify unique URLs.
  const uniqUrls = [...new Set(swapped.map((s) => s.url))];
  const headResults = await Promise.all(uniqUrls.map(async (u) => [u, await headOk(u)]));
  const bad = headResults.filter(([, ok]) => !ok).map(([u]) => u);

  const summary = {
    citySlug,
    tierData: `${tierBase}-tier-data.txt`,
    tagsFound: replacements.size,
    swappedCount: swapped.length,
    skippedCount: skipped.length,
    skippedNames: skipped,
    headFailures: bad,
  };

  if (bad.length > 0) {
    summary.aborted = true;
    return summary;
  }

  if (write && mdx !== mdxOrig) {
    writeFileSync(mainPost, mdx);
    const worktreePost = resolve(WORKTREE, 'content/posts', `best-hotels-${citySlug}-2026.mdx`);
    if (existsSync(worktreePost)) writeFileSync(worktreePost, mdx);
    summary.written = true;
  }

  return summary;
}

async function main() {
  const targets = [];
  if (ALL) {
    const { readdirSync } = await import('node:fs');
    const files = readdirSync(resolve(MAIN_REPO, 'content/posts'));
    for (const f of files) {
      const mm = f.match(/^best-hotels-(.+)-2026\.mdx$/);
      if (mm) targets.push(mm[1]);
      const mm2 = f.match(/^best-all-inclusive-hotels-(.+)-2026\.mdx$/);
      if (mm2) targets.push(`all-inclusive-hotels-${mm2[1]}`);
    }
    targets.sort();
  } else if (cityArg) {
    targets.push(cityArg);
  } else {
    console.error('Usage: node scripts/swap-hotelphoto-to-cupid.mjs <city|--all> [--write]');
    process.exit(1);
  }

  const results = [];
  for (const t of targets) {
    const r = await processCity(t, { write: WRITE });
    results.push(r);
    const status = r.skipped
      ? `SKIP (${r.reason})`
      : r.aborted
        ? `ABORT (bad URLs: ${r.headFailures.length})`
        : `${r.swappedCount}/${r.tagsFound} swapped, ${r.skippedCount} skipped${r.written ? ', written' : ''}`;
    console.log(`[${t.padEnd(26)}] ${status}`);
    if (r.skippedCount > 0 && r.skippedNames?.length) {
      for (const n of r.skippedNames) console.log(`    skip: ${n}`);
    }
  }

  const totalSwapped = results.reduce((a, r) => a + (r.swappedCount || 0), 0);
  const totalSkipped = results.reduce((a, r) => a + (r.skippedCount || 0), 0);
  console.log(`\nTotal: ${totalSwapped} swapped, ${totalSkipped} skipped across ${results.length} cities.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
