/**
 * One-shot — strip TestFlight banner + iOS status bar from owner's
 * iPhone screenshots, pad back to App Store Connect's required 1290×2796
 * (iPhone 6.9" display) using the screenshot's own top-edge colour.
 *
 * Reads:  C:/Users/10ban/OneDrive/ios app pic/app issues/*.png
 * Writes: C:/Users/10ban/OneDrive/ios app pic/app issues/app-store-ready/<name>.png
 */
import sharp from 'sharp';
import { readdir, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const SRC_DIR = 'C:/Users/10ban/OneDrive/ios app pic/app issues';
const OUT_DIR = 'C:/Users/10ban/OneDrive/ios app pic/app issues/app-store-ready';

const TARGET_W = 1290;
const TARGET_H = 2796;
// iOS status bar (~120px on iPhone 16/17 Pro Max) plus TestFlight banner
// (~40px). Cropping 160px from the top reliably removes both regardless of
// whether the banner is showing.
const CROP_TOP = 160;

await mkdir(OUT_DIR, { recursive: true });

const files = (await readdir(SRC_DIR))
  .filter((f) => f.toLowerCase().endsWith('.png') && !f.startsWith('app-store-ready'));

console.log(`Found ${files.length} PNG(s) in ${SRC_DIR}\n`);

for (const file of files) {
  const inPath = join(SRC_DIR, file);
  const outPath = join(OUT_DIR, file);

  const meta = await sharp(inPath).metadata();
  if (meta.width !== TARGET_W || meta.height !== TARGET_H) {
    console.log(`SKIP ${file} — ${meta.width}x${meta.height} (not 1290x2796)`);
    continue;
  }

  // Sample the top edge of the cropped region for the pad colour, so the
  // padding visually matches the app's background (light, dark, or branded).
  const sampleStrip = await sharp(inPath)
    .extract({ left: 0, top: CROP_TOP, width: TARGET_W, height: 4 })
    .raw()
    .toBuffer();
  // Average the strip into one colour. RGBA → 4 channels.
  let r = 0, g = 0, b = 0, a = 0, n = 0;
  for (let i = 0; i + 3 < sampleStrip.length; i += 4) {
    r += sampleStrip[i];
    g += sampleStrip[i + 1];
    b += sampleStrip[i + 2];
    a += sampleStrip[i + 3];
    n++;
  }
  const padColour = {
    r: Math.round(r / n),
    g: Math.round(g / n),
    b: Math.round(b / n),
    alpha: Math.round(a / n) / 255,
  };

  // Crop top CROP_TOP px → leaves 1290×(2796-160) = 1290×2636
  // Pad bottom with sampled colour back up to 1290×2796 so total height
  // stays at the App Store-required pixel count. Bottom-padding (rather
  // than top-padding) preserves the natural look — the iOS home
  // indicator area is already empty white on most screens.
  await sharp(inPath)
    .extract({ left: 0, top: CROP_TOP, width: TARGET_W, height: TARGET_H - CROP_TOP })
    .extend({
      top: 0,
      bottom: CROP_TOP,
      left: 0,
      right: 0,
      background: padColour,
    })
    .png({ compressionLevel: 9 })
    .toFile(outPath);

  console.log(`OK   ${file} → ${outPath} (pad rgb(${padColour.r},${padColour.g},${padColour.b}))`);
}

console.log('\nDone.');
