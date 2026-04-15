/**
 * Generate all Android/iOS/Play-Store assets from the SVG brand sources in
 * assets/brand/. Run: node scripts/generate-assets.js
 */
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const BRAND = path.join(ROOT, 'assets', 'brand');
const OUT = path.join(ROOT, 'assets', 'images');
const STORE = path.join(ROOT, 'assets', 'store');

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(STORE, { recursive: true });

async function render(svgPath, outPath, width, height, bg = null) {
  const svg = fs.readFileSync(svgPath);
  let pipe = sharp(svg, { density: 384 }).resize(width, height, { fit: 'contain' });
  if (bg) pipe = pipe.flatten({ background: bg });
  await pipe.png().toFile(outPath);
  console.log('✔', path.relative(ROOT, outPath), `${width}×${height}`);
}

(async () => {
  // App icon — square, full bleed, required 1024×1024 for Expo
  await render(
    path.join(BRAND, 'icon-source.svg'),
    path.join(OUT, 'icon.png'),
    1024, 1024,
  );

  // Android adaptive foreground — 1024×1024 transparent (Expo auto-pads safe zone)
  await render(
    path.join(BRAND, 'adaptive-foreground.svg'),
    path.join(OUT, 'adaptive-icon.png'),
    1024, 1024,
  );

  // Splash image — centred content, Expo will fill rest with splash.backgroundColor
  await render(
    path.join(BRAND, 'splash-source.svg'),
    path.join(OUT, 'splash.png'),
    1284, 2778,
  );

  // Play Store feature graphic — 1024×500 required
  await render(
    path.join(BRAND, 'feature-graphic.svg'),
    path.join(STORE, 'feature-graphic.png'),
    1024, 500,
  );

  // Play Store high-res icon — 512×512 PNG (no alpha)
  await render(
    path.join(BRAND, 'icon-source.svg'),
    path.join(STORE, 'play-store-icon-512.png'),
    512, 512,
    '#0A1230',
  );

  console.log('\nAll assets generated.');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
