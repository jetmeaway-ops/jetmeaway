#!/usr/bin/env node
/**
 * Resize iOS app screenshots to App Store Connect's required dimensions.
 *
 * Reads every JPG/PNG in:
 *   C:/Users/10ban/OneDrive/Desktop/IOS/ios app pic/
 *
 * Outputs PNG at 1290 x 2796 (iPhone 6.7" Display — the size App Store
 * Connect accepts and that iPhone 15 Plus / 14 Pro Max produce natively)
 * to:
 *   C:/Users/10ban/OneDrive/Desktop/IOS/ready-for-upload/
 *
 * Usage:
 *   node scripts/resize-app-screenshots.mjs
 *
 * Strategy: `fit: cover` — scale + smart-crop to fill 1290x2796 exactly.
 * That's the right choice for screenshots that already have iPhone aspect
 * ratio (~1:2.165). For odd-aspect inputs the centre is preserved.
 */

import sharp from 'sharp';
import { readdir, mkdir } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';

const SRC = 'C:/Users/10ban/OneDrive/Desktop/IOS/ios app pic';
const DST = 'C:/Users/10ban/OneDrive/Desktop/IOS/ready-for-upload';
const TARGET_WIDTH = 1290;
const TARGET_HEIGHT = 2796;

await mkdir(DST, { recursive: true });

const files = (await readdir(SRC))
  .filter((f) => /\.(jpg|jpeg|png)$/i.test(f))
  .filter((f) => !f.startsWith('.'));

if (files.length === 0) {
  console.log('No images found in', SRC);
  process.exit(0);
}

console.log(`Found ${files.length} image(s). Resizing to ${TARGET_WIDTH}x${TARGET_HEIGHT}...\n`);

let ok = 0, fail = 0;
for (const file of files) {
  const srcPath = join(SRC, file);
  const dstName = basename(file, extname(file)) + '.png';
  const dstPath = join(DST, dstName);
  try {
    const meta = await sharp(srcPath).metadata();
    await sharp(srcPath)
      .resize(TARGET_WIDTH, TARGET_HEIGHT, {
        fit: 'cover',
        position: 'center',
        kernel: 'lanczos3', // best quality upscale
      })
      .png({ compressionLevel: 9 })
      .toFile(dstPath);
    console.log(`  OK  ${file.padEnd(50)} ${meta.width}x${meta.height} -> ${TARGET_WIDTH}x${TARGET_HEIGHT}`);
    ok++;
  } catch (err) {
    console.log(`  FAIL ${file.padEnd(50)} ${err.message}`);
    fail++;
  }
}

console.log(`\nDone. ${ok} ok, ${fail} failed. Output in:\n  ${DST}`);
