#!/usr/bin/env node
/**
 * Bundle tripwire — run AFTER `next build`.
 *
 * The category-tap freeze has been "fixed" a dozen times (service worker,
 * loading.tsx skeletons, …) and kept returning, because the actual disease —
 * the 117 KB DESTINATIONS dataset riding inside the hotels/flights main
 * client chunks — was never removed, and nothing guarded against it. Every
 * deploy busts the browser cache, so days after each "fix" phones re-download
 * the fat chunk on hotel Wi-Fi and the 12-16 s dead taps return
 * (owner reports 2026-07-16, 2026-08-26 — "this is the 13th time").
 *
 * 2026-08-26 the dataset moved into lazy chunks (ScoutSidebarLauncher /
 * DestinationBackdrop). THIS script makes that permanent: it fails the build
 * if any single client chunk ever contains BOTH the destinations data AND a
 * page's main client code again — i.e. if a future static import re-couples
 * them. Marker strings survive minification because they are data/i18n-key
 * literals, not identifiers.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// A distinctive literal from src/data/destinations.ts (Dubai's tagline).
const DATA_MARKER = 'busiest long-haul airport';
// Literals that exist only in each page's main client component.
const PAGE_MARKERS = {
  'hotels-client': 'nearMeLocating',      // near-me i18n key, hotels-client.tsx
  'flights-client': 'errNoOrigin',        // flights form validation key
};

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith('.js')) out.push({ p, size: st.size });
  }
  return out;
}

const chunksDir = join('.next', 'static', 'chunks');
let chunks;
try {
  chunks = walk(chunksDir);
} catch {
  console.error(`No ${chunksDir} — run \`next build\` first.`);
  process.exit(2);
}

let failed = false;
for (const { p, size } of chunks) {
  const txt = readFileSync(p, 'utf8');
  if (!txt.includes(DATA_MARKER)) continue;
  console.log(`destinations data lives in: ${p} (${(size / 1024).toFixed(0)} KB)`);
  for (const [page, marker] of Object.entries(PAGE_MARKERS)) {
    if (txt.includes(marker)) {
      console.error(
        `✖ TRIPWIRE: chunk ${p} contains BOTH the DESTINATIONS dataset and ${page}'s main code.\n` +
        `  A static import has re-coupled them — the 117 KB dataset is back on the ` +
        `category-tap critical path.\n` +
        `  Keep destinations behind dynamic() (see ScoutSidebarLauncher.tsx / DestinationBackdrop).`,
      );
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log('✓ bundle tripwire: destinations data stays out of the page-entry chunks.');
