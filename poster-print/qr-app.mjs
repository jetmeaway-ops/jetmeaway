/**
 * JetMeAway app / website QR codes.
 *
 * Generates the QR images you can hand to someone or drop into any print /
 * social asset. Output goes to poster-print/qr/ as both PNG (1200px, for
 * screens & print) and SVG (vector, scales to any size with no blur).
 *
 * The headline one is qr-app-website — a single "smart" code pointing at
 * jetmeaway.co.uk/get, which forwards iPhone users to the App Store, Android
 * users to Google Play, and everyone else to the website. One code, all three
 * destinations. The three "direct-*" codes are there if you'd rather print a
 * store-specific code on its own.
 *
 * Run:  cd poster-print && node qr-app.mjs
 */

import QRCode from 'qrcode';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, 'qr');

// utm tags so scans show up as their own source in analytics.
const UTM = 'utm_source=qr&utm_medium=print&utm_campaign=app_share_2026';

const CODES = [
  {
    slug: 'qr-app-website',
    label: 'Smart link — App Store OR Play Store OR website (device-aware)',
    url: `https://jetmeaway.co.uk/get?${UTM}`,
  },
  {
    slug: 'direct-app-store',
    label: 'App Store only (iOS)',
    url: 'https://apps.apple.com/gb/app/jetmeaway/id6765715611',
  },
  {
    slug: 'direct-play-store',
    label: 'Google Play only (Android)',
    url: 'https://play.google.com/store/apps/details?id=uk.co.jetmeaway.app',
  },
  {
    slug: 'direct-website',
    label: 'Website only',
    url: `https://jetmeaway.co.uk/?${UTM}`,
  },
];

// High error-correction so the code still scans with a logo overlay, print
// smudges, or a crease. Brand-dark modules on white for maximum contrast.
const PNG_OPTS = {
  errorCorrectionLevel: 'H',
  margin: 2,
  width: 1200,
  color: { dark: '#0A0D1AFF', light: '#FFFFFFFF' },
};
const SVG_OPTS = {
  type: 'svg',
  errorCorrectionLevel: 'H',
  margin: 2,
  color: { dark: '#0A0D1A', light: '#FFFFFF' },
};

await fs.mkdir(OUT_DIR, { recursive: true });

for (const { slug, label, url } of CODES) {
  const pngPath = path.join(OUT_DIR, `${slug}.png`);
  const svgPath = path.join(OUT_DIR, `${slug}.svg`);
  await QRCode.toFile(pngPath, url, PNG_OPTS);
  const svg = await QRCode.toString(url, SVG_OPTS);
  await fs.writeFile(svgPath, svg, 'utf8');
  console.log(`✓ ${slug.padEnd(18)} → ${url}`);
  console.log(`  ${label}`);
  console.log(`  png: qr/${slug}.png   svg: qr/${slug}.svg\n`);
}

console.log(`Done. ${CODES.length} codes written to ${OUT_DIR}`);
