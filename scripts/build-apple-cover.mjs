import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const W = 1600;
const H = 1040;
const ICON = 340;
const ICON_TOP = 200;
const ICON_LEFT = Math.round((W - ICON) / 2);
const RADIUS = Math.round(ICON * 0.22);

const maskSvg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${ICON}" height="${ICON}">
     <rect width="${ICON}" height="${ICON}" rx="${RADIUS}" ry="${RADIUS}" fill="white"/>
   </svg>`
);

const iconBuf = await sharp(path.join(root, 'public', 'icon-512x512.png'))
  .resize(ICON, ICON, { fit: 'cover' })
  .ensureAlpha()
  .composite([{ input: maskSvg, blend: 'dest-in' }])
  .png()
  .toBuffer();

const bgSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF"/>
      <stop offset="1" stop-color="#E8F0FF"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <text x="${W / 2}" y="720" font-family="-apple-system, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif" font-size="96" font-weight="700" fill="#1A1D2B" text-anchor="middle" letter-spacing="-2">Jetmeaway</text>
  <text x="${W / 2}" y="790" font-family="-apple-system, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif" font-size="38" font-weight="500" fill="#5C6378" text-anchor="middle" letter-spacing="-0.5">Travel Scout. Compare. Book.</text>
  <text x="${W / 2}" y="${H - 60}" font-family="-apple-system, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif" font-size="22" font-weight="500" fill="#8E95A9" text-anchor="middle" letter-spacing="0.5">jetmeaway.co.uk</text>
</svg>`.trim();

const out = path.join(root, 'public', 'apple-brand-cover-1600x1040.png');

await sharp(Buffer.from(bgSvg))
  .composite([{ input: iconBuf, top: ICON_TOP, left: ICON_LEFT }])
  .png({ compressionLevel: 9 })
  .toFile(out);

const stats = await sharp(out).metadata();
console.log(`OK  ${out}`);
console.log(`    ${stats.width}x${stats.height}  ${stats.format}`);
