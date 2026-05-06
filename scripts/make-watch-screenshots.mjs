#!/usr/bin/env node
/**
 * Generate JetMeAway-branded Apple Watch screenshots at every accepted
 * App Store Connect dimension. The iOS app is a WebView wrapper with no
 * watchOS extension, so this is purely placeholder branding to satisfy
 * the Watch tab in App Store Connect.
 *
 * Output: C:/Users/10ban/OneDrive/Desktop/IOS/watch-ready-for-upload/
 *
 * One PNG per Watch size:
 *   - watch-ultra-422x514.png
 *   - watch-ultra-410x502.png
 *   - watch-series11-416x496.png
 *   - watch-series9-396x484.png
 *   - watch-series6-368x448.png
 *   - watch-series3-312x390.png
 */

import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const OUT = 'C:/Users/10ban/OneDrive/Desktop/IOS/watch-ready-for-upload';
const LOGO = 'C:/Users/10ban/OneDrive/Desktop/jetmeaway/public/jetmeaway-logo.png';

// Apple wants all Watch screenshots in the SAME dimension set in a
// single upload slot — mixing 422x514 + 416x496 + 396x484 etc. errors
// out. Picked Ultra 3 (422x514) — newest/largest Watch size, Apple
// downscales for smaller watches automatically. Generating 3 variants
// so the listing has multiple distinct screens, not one repeated.
const SIZES = [
  { name: 'watch-01-compare', w: 422, h: 514, line1: 'Compare flights,', line2: 'hotels &amp; more', line3: 'from your wrist' },
  { name: 'watch-02-prices',  w: 422, h: 514, line1: 'Real prices.',    line2: 'No markups.',    line3: 'No booking fees.' },
  { name: 'watch-03-15plus',  w: 422, h: 514, line1: '15+ providers.',  line2: 'One search.',    line3: '90s checkout.' },
];

await mkdir(OUT, { recursive: true });

// Load + resize the logo for each Watch screen. Logo width ~70% of
// canvas width so it has comfortable padding inside the small frame.
async function makeWatchScreenshot(width, height, dst, line1, line2, line3) {
  // Logo: scale to ~70% of canvas width, white on dark background
  // Our public logo is on white — invert isn't needed because JetMeAway
  // wordmark is dark. Better: render the logo on a bright orange-to-navy
  // gradient to match the site's brand palette.
  const logoWidth = Math.floor(width * 0.78);
  const logoBuf = await sharp(LOGO)
    .resize(logoWidth, null, { fit: 'inside' })
    .png()
    .toBuffer();
  const logoMeta = await sharp(logoBuf).metadata();

  // SVG canvas: dark navy gradient + tagline text underneath logo.
  const taglineFontSize = Math.max(11, Math.round(width / 22));
  const taglineY = height * 0.78;
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0F1B33"/>
          <stop offset="100%" stop-color="#0a1628"/>
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="35%" r="60%">
          <stop offset="0%" stop-color="#FF8C28" stop-opacity="0.18"/>
          <stop offset="100%" stop-color="#FF8C28" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <rect width="100%" height="100%" fill="url(#glow)"/>
      <text x="50%" y="${taglineY}"
            font-family="Helvetica, Arial, sans-serif"
            font-size="${taglineFontSize}"
            font-weight="700"
            fill="#FF8C28"
            text-anchor="middle">
        ${line1}
      </text>
      <text x="50%" y="${taglineY + taglineFontSize + 4}"
            font-family="Helvetica, Arial, sans-serif"
            font-size="${Math.max(9, taglineFontSize - 1)}"
            font-weight="600"
            fill="#FFFFFFE6"
            text-anchor="middle">
        ${line2}
      </text>
      <text x="50%" y="${taglineY + (taglineFontSize + 4) * 2}"
            font-family="Helvetica, Arial, sans-serif"
            font-size="${Math.max(9, taglineFontSize - 3)}"
            font-weight="500"
            fill="#FFFFFFAA"
            text-anchor="middle">
        ${line3}
      </text>
    </svg>
  `;

  // Composite: gradient background → logo centred slightly above middle
  const logoTop = Math.floor(height * 0.32 - (logoMeta.height || 0) / 2);
  const logoLeft = Math.floor((width - (logoMeta.width || 0)) / 2);

  // Build the composite first, then re-encode through a flatten step to
  // strip alpha cleanly (sharp pipelines re-introduce alpha during
  // composite even after .flatten()).
  const composed = await sharp(Buffer.from(svg))
    .composite([{ input: logoBuf, left: logoLeft, top: logoTop }])
    .png()
    .toBuffer();

  await sharp(composed)
    .flatten({ background: { r: 10, g: 22, b: 40 } })
    .removeAlpha()
    .toColourspace('srgb')
    .withMetadata({ icc: 'srgb' })
    .png({ compressionLevel: 9, palette: false, force: true })
    .toFile(dst);
}

console.log(`Generating ${SIZES.length} Watch screenshots...\n`);

for (const s of SIZES) {
  const dst = join(OUT, `${s.name}.png`);
  await makeWatchScreenshot(s.w, s.h, dst, s.line1, s.line2, s.line3);
  const meta = await sharp(dst).metadata();
  console.log(`  ${s.name.padEnd(28)} ${meta.width}x${meta.height} ${meta.channels}ch ${meta.hasAlpha ? 'ALPHA' : 'no-alpha'} ${meta.space}`);
}

console.log(`\nDone. Files in:\n  ${OUT}`);
