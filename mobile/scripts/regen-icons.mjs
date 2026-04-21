#!/usr/bin/env node
/**
 * Regenerate all JetMeAway app icon PNGs from the user's canonical logo.
 *
 * Canonical source (DO NOT redraw or replace with hand-built SVG):
 *   mobile/assets/brand/icon-canonical.png  — the user's actual logo,
 *   extracted 2026-04-21 from public/Jetmeaway logo for app.jpeg and
 *   rendered at 1024×1024 with transparent background outside the circle.
 *
 * Outputs:
 *   mobile/assets/images/icon.png                (1024×1024)  ← canonical direct
 *   mobile/assets/images/adaptive-icon.png       (1024×1024)  ← canonical scaled to 66% safe zone, on #1458B5
 *   mobile/assets/store/play-store-icon-512.png  (512×512)    ← canonical downscaled
 *
 * Context: Google Play rejection 2026-04-21 — "App does not match store
 * listing" because the hi-res store icon and on-device launcher icon were
 * rendered from different source designs. On 2026-04-21 a further rejection
 * from the user: previously hand-drawn SVGs (paper-plane, then realistic
 * airliner) were WRONG — the brand mark is the curved swoosh + stylised
 * plane shown in public/Jetmeaway logo for app.jpeg. Do not redraw; use
 * the user's logo verbatim.
 *
 * Run with:   node mobile/scripts/regen-icons.mjs
 *
 * Requires sharp (already in the repo's root node_modules).
 */

import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MOBILE_ROOT = resolve(__dirname, '..');
const CANONICAL = resolve(MOBILE_ROOT, 'assets/brand/icon-canonical.png');

// Adaptive icon spec: 108×108 dp canvas. Safe zone is inner 66%, but since
// our brand mark IS a circle that should fill the whole masked area, we
// scale the logo to the FULL canvas. Under circle/squircle/rounded-square
// masks the circle is inscribed and reads as the full logo. (Shrinking to
// 66% caused the logo's own blue body to blend into the bg-layer blue —
// the circle edge disappeared.) Transparent outside the circle lets the
// bg layer (#1458B5, set in app.json) show in any corner bits not masked.
const ADAPTIVE_BG = null;

const jobs = [
  {
    out: 'assets/images/icon.png',
    size: 1024,
    mode: 'direct',
    note: 'iOS main + Android legacy fallback',
  },
  {
    out: 'assets/images/adaptive-icon.png',
    size: 1024,
    mode: 'direct',
    note: 'Android adaptive foreground (full-bleed logo; bg layer #1458B5 from app.json)',
  },
  {
    out: 'assets/store/play-store-icon-512.png',
    size: 512,
    mode: 'direct',
    note: 'Play Console store listing hi-res icon',
  },
];

let failed = 0;
for (const job of jobs) {
  const dst = resolve(MOBILE_ROOT, job.out);
  try {
    // Both direct and adaptive use the same full-bleed logo render.
    // icon.png: iOS + Android legacy fallback — needs the full logo.
    // adaptive-icon.png: foreground layer — full-bleed logo; Android
    //   inscribes a circle/squircle mask over it, revealing the logo.
    // play-store-icon-512.png: store listing — same logo, halved.
    await sharp(CANONICAL)
      .resize(job.size, job.size, {
        fit: 'contain',
        kernel: 'lanczos3',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png({ compressionLevel: 9 })
      .toFile(dst);
    console.log(`  ✓ ${job.out.padEnd(44)} ${job.size}×${job.size}  (${job.note})`);
  } catch (err) {
    failed += 1;
    console.error(`  ✗ ${job.out}`);
    console.error(`    ${err.message}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} icon(s) failed to render.`);
  process.exit(1);
}

console.log('\nDone. Verify the PNGs visually, then bump app.json versionCode and rebuild.');
