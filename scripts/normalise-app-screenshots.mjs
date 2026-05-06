#!/usr/bin/env node
/**
 * Normalise App Store screenshots so App Store Connect accepts them.
 *
 * Apple rejects PNGs that have an alpha channel, a non-sRGB colour
 * profile, or a bit depth other than 8 — even if dimensions are right.
 * This script re-encodes everything to flat 8-bit sRGB without alpha
 * and strips metadata.
 *
 * Reads:  C:/Users/10ban/OneDrive/Desktop/IOS/raw-screenshots/
 * Writes: C:/Users/10ban/OneDrive/Desktop/IOS/ready-for-upload/
 */

import sharp from 'sharp';
import { readdir, mkdir } from 'node:fs/promises';
import { join, basename, extname } from 'node:path';

const SRC = 'C:/Users/10ban/OneDrive/Desktop/IOS/raw-screenshots';
const DST = 'C:/Users/10ban/OneDrive/Desktop/IOS/ready-for-upload';

await mkdir(DST, { recursive: true });

const files = (await readdir(SRC)).filter((f) => /\.(png|jpe?g)$/i.test(f));
console.log(`Normalising ${files.length} files...\n`);

for (const file of files) {
  const src = join(SRC, file);
  const dst = join(DST, basename(file, extname(file)) + '.png');
  await sharp(src)
    // Force-flatten any alpha onto a white background. Apple rejects
    // anything with a transparency channel even when fully opaque.
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    // Standardise to sRGB. Default sharp output may carry the source's
    // colour profile which can trip Apple's checker.
    .toColourspace('srgb')
    // Drop EXIF/ICC/etc. — clean PNG only.
    .withMetadata({ icc: 'srgb' })
    .png({ compressionLevel: 9, palette: false, force: true })
    .toFile(dst);
  const meta = await sharp(dst).metadata();
  console.log(`  ${file.padEnd(15)} -> ${meta.width}x${meta.height} ${meta.channels}ch ${meta.depth} ${meta.hasAlpha ? 'ALPHA' : 'no-alpha'} ${meta.space}`);
}

console.log(`\nDone. Files in:\n  ${DST}`);
