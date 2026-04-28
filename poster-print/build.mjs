/**
 * JetMeAway A1 shopfront poster — universal, one design.
 * Output: poster-A1.svg (A1 + 3mm bleed = 600 × 847 mm).
 * Real JetMeAway logo embedded from public/jetmeaway-logo.png (base64).
 */

import QRCode from 'qrcode';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const URL = 'https://jetmeaway.co.uk/?utm_source=poster&utm_medium=shopfront&utm_campaign=a1_q2_2026';
const PHONE_DISPLAY = '0800 652 6699';   // JetMeAway call centre — UK freephone
const PHONE_HOURS = 'FREE · 24/7 · UK CALL CENTRE';

const BLEED = 3;
const W = 594, H = 841;
const FW = W + BLEED * 2, FH = H + BLEED * 2;
const OX = BLEED, OY = BLEED;

// --- embed real logo ---
const logoPath = path.resolve(__dirname, '..', 'public', 'jetmeaway-logo.png');
const logoBuf = await fs.readFile(logoPath);
const logoB64 = logoBuf.toString('base64');
const logoURI = `data:image/png;base64,${logoB64}`;
// native px 313 × 80 → aspect 3.9125. Logo 82mm tall → 321mm wide; leaves
// enough room on both sides for the ribbon (top-left) and price badge
// (top-right) without clipping.
// NB: source PNG is low-res (313 px). At A1 print it WILL soften — for a truly
// crisp result, supply a high-res or vector version of the logo.
const LOGO_H = 62;                        // smaller so ribbon + price badge don't touch
const LOGO_W = LOGO_H * (313 / 80);       // ~ 242.6 mm wide, logo ends ~ x=421, badge starts ~ x=460

// --- QR ---
const qrSvg = await QRCode.toString(URL, {
  type: 'svg',
  errorCorrectionLevel: 'H',
  margin: 2,
  color: { dark: '#0A0D1A', light: '#FFFFFF' },
});
const vbMatch = qrSvg.match(/viewBox="0 0 (\d+) (\d+)"/);
const qrModules = vbMatch ? parseInt(vbMatch[1], 10) : 29;
const qrInner = [...qrSvg.matchAll(/<path[^>]*\/>/g)].map(m => m[0]).join('');

const QR_MM = 160;
const QR_CX = OX + W / 2;              // centre horizontally
const QR_CY = OY + 560;                // lifted to leave room for URL + phone

// --- compose ---
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${FW}mm" height="${FH}mm"
     viewBox="0 0 ${FW} ${FH}">

  <defs>
    <style><![CDATA[
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@500;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap');
      text { font-family: 'Poppins', 'Helvetica Neue', Arial, sans-serif; }
      .mono { font-family: 'JetBrains Mono', 'Menlo', monospace; }
    ]]></style>

    <radialGradient id="aurora1" cx="20%" cy="15%" r="70%">
      <stop offset="0"   stop-color="#3D7BFF" stop-opacity="1"/>
      <stop offset="0.5" stop-color="#1740A8" stop-opacity="0.6"/>
      <stop offset="1"   stop-color="#0A0D1A" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="aurora2" cx="85%" cy="40%" r="55%">
      <stop offset="0"   stop-color="#8B3DFF" stop-opacity="0.85"/>
      <stop offset="0.6" stop-color="#3D1F8A" stop-opacity="0.4"/>
      <stop offset="1"   stop-color="#0A0D1A" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="aurora3" cx="35%" cy="85%" r="60%">
      <stop offset="0"   stop-color="#FF4D8D" stop-opacity="0.65"/>
      <stop offset="0.6" stop-color="#8A1F4F" stop-opacity="0.3"/>
      <stop offset="1"   stop-color="#0A0D1A" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="base" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#050712"/>
      <stop offset="1" stop-color="#0F1428"/>
    </linearGradient>

    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="3"/>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="softglow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="6"/>
    </filter>

    <!-- colour-invert logo for dark background: pops warm on night-sky palette -->
    <filter id="invertLogo" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feColorMatrix type="matrix"
        values="-1 0 0 0 1
                 0 -1 0 0 1
                 0 0 -1 0 1
                 0 0 0 1 0"/>
    </filter>

    <linearGradient id="trajGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0"   stop-color="#FF4D8D" stop-opacity="0"/>
      <stop offset="0.4" stop-color="#FF4D8D" stop-opacity="1"/>
      <stop offset="1"   stop-color="#3D7BFF" stop-opacity="1"/>
    </linearGradient>
  </defs>

  <!-- background -->
  <rect x="0" y="0" width="${FW}" height="${FH}" fill="url(#base)"/>
  <rect x="0" y="0" width="${FW}" height="${FH}" fill="url(#aurora1)"/>
  <rect x="0" y="0" width="${FW}" height="${FH}" fill="url(#aurora2)"/>
  <rect x="0" y="0" width="${FW}" height="${FH}" fill="url(#aurora3)"/>

  ${scanlines()}
  ${stars(70)}

  <!-- trajectory arc (stays below logo area: enters left-lower, curves to right-middle, never touches top 180mm) -->
  <path d="M ${OX - 10} ${OY + 620}
           C ${OX + 180} ${OY + 420}, ${OX + 420} ${OY + 280}, ${OX + W + 10} ${OY + 210}"
        fill="none" stroke="url(#trajGrad)" stroke-width="16" stroke-linecap="round"
        filter="url(#softglow)" opacity="0.75"/>
  <path d="M ${OX - 10} ${OY + 620}
           C ${OX + 180} ${OY + 420}, ${OX + 420} ${OY + 280}, ${OX + W + 10} ${OY + 210}"
        fill="none" stroke="url(#trajGrad)" stroke-width="2.4" stroke-linecap="round"
        stroke-dasharray="6 8"/>
  <g transform="translate(${OX + W - 50}, ${OY + 215}) rotate(-10)" filter="url(#glow)">
    ${planeIcon()}
  </g>
  <circle cx="${OX - 10}" cy="${OY + 620}" r="6" fill="#FF4D8D" filter="url(#glow)"/>

  <!-- ========= SUMMER 2026 corner ribbon (top-left, diagonal) ========= -->
  <g transform="translate(${OX + 60}, ${OY + 60}) rotate(-45)">
    <!-- ribbon body with subtle drop shadow -->
    <rect x="-140" y="-12" width="280" height="24" fill="#000000" opacity="0.25"
          transform="translate(1,2)" filter="url(#softglow)"/>
    <rect x="-140" y="-12" width="280" height="24" fill="#FF4D8D"/>
    <!-- notched ends -->
    <polygon points="-140,-12 -150,0 -140,12" fill="#B7295E"/>
    <polygon points="140,-12 150,0 140,12" fill="#B7295E"/>
    <text x="0" y="6" text-anchor="middle" font-size="14" font-weight="900" fill="#FFFFFF" letter-spacing="6">
      SUMMER 2026
    </text>
  </g>

  <!-- ========= PRICE BADGE (top-right, clear of logo) ========= -->
  <g transform="translate(${OX + W - 78}, ${OY + 150})">
    <!-- drop shadow -->
    <g transform="translate(2,3)" opacity="0.35" filter="url(#softglow)">
      ${starburstPath(62, 46, 18)}
    </g>
    <!-- outer jagged sunburst -->
    <g transform="rotate(9)">
      ${starburstPath(62, 46, 18)}
    </g>
    <!-- solid inner disc + dark ring -->
    <circle cx="0" cy="0" r="44" fill="#FFD400"/>
    <circle cx="0" cy="0" r="44" fill="none" stroke="#0A0D1A" stroke-width="1.8"/>
    <circle cx="0" cy="0" r="39" fill="none" stroke="#0A0D1A" stroke-width="0.5" stroke-dasharray="1.4 2"/>
    <!-- text — spaced so nothing overlaps -->
    <text y="-18" text-anchor="middle" class="mono" font-size="9"  font-weight="700" fill="#0A0D1A" letter-spacing="3">FROM</text>
    <text y="10"  text-anchor="middle"            font-size="32" font-weight="900" fill="#0A0D1A" letter-spacing="-1.2">£29</text>
    <text y="26"  text-anchor="middle" class="mono" font-size="7"  font-weight="700" fill="#0A0D1A" letter-spacing="1.5">PER FLIGHT*</text>
  </g>

  <!-- ========= REAL LOGO (inverted dark→light) with soft halo ========= -->
  <g transform="translate(${OX + W / 2}, ${OY + 60 + LOGO_H / 2})">
    <!-- subtle halo behind -->
    <ellipse cx="0" cy="0" rx="${LOGO_W / 2 + 40}" ry="${LOGO_H / 2 + 24}"
             fill="#FFFFFF" opacity="0.08" filter="url(#softglow)"/>
    <!-- logo inverted: dark text becomes white/light on dark background -->
    <image x="${-LOGO_W / 2}" y="${-LOGO_H / 2}"
           width="${LOGO_W}" height="${LOGO_H}"
           href="${logoURI}" xlink:href="${logoURI}"
           preserveAspectRatio="xMidYMid meet"
           filter="url(#invertLogo)"
           style="image-rendering:auto"/>
  </g>

  <!-- ========= HEADLINE ========= -->
  <g transform="translate(${OX + W / 2}, ${OY + 230})" text-anchor="middle">
    <text y="0"  font-size="54" font-weight="900" letter-spacing="-1.8" fill="#FFFFFF">Your next trip,</text>
    <text y="64" font-size="54" font-weight="900" letter-spacing="-1.8" fill="#FFFFFF">
      sorted in <tspan fill="#FF4D8D">seconds.</tspan>
    </text>
  </g>

  <!-- category line -->
  <g transform="translate(${OX + W / 2}, ${OY + 370})" text-anchor="middle">
    <text y="0" class="mono" font-size="13" font-weight="700" fill="#BFD5FF" letter-spacing="6">
      FLIGHTS · HOTELS · PACKAGES · CARS
    </text>
  </g>

  <!-- destination chips (single row, prices per destination) -->
  <g transform="translate(${OX + W / 2}, ${OY + 410})" text-anchor="middle">
    ${destChip(-180, 'Lahore',   '£499')}
    ${destChip(0,    'Antalya',  '£59')}
    ${destChip(180,  'Dubai',    '£249')}
  </g>

  <!-- ========= QR CARD (centre, clean) ========= -->
  <g transform="translate(${QR_CX}, ${QR_CY})">
    <rect x="${-(QR_MM / 2 + 18)}" y="${-(QR_MM / 2 + 30) + 6}"
          width="${QR_MM + 36}" height="${QR_MM + 72}"
          rx="20" ry="20" fill="#000000" opacity="0.35" filter="url(#softglow)"/>
    <rect x="${-(QR_MM / 2 + 18)}" y="${-(QR_MM / 2 + 30)}"
          width="${QR_MM + 36}" height="${QR_MM + 72}"
          rx="20" ry="20" fill="#FFFFFF"/>
    <rect x="${-(QR_MM / 2 + 18)}" y="${-(QR_MM / 2 + 30)}"
          width="${QR_MM + 36}" height="24" rx="20" ry="20" fill="#FF4D8D"/>
    <rect x="${-(QR_MM / 2 + 18)}" y="${-(QR_MM / 2 + 30) + 16}"
          width="${QR_MM + 36}" height="10" fill="#FF4D8D"/>
    <g transform="translate(${-QR_MM / 2}, ${-QR_MM / 2}) scale(${QR_MM / qrModules})">
      ${qrInner}
    </g>
    <text y="${QR_MM / 2 + 28}" text-anchor="middle"
          font-size="14" font-weight="800" fill="#0A0D1A" letter-spacing="5">SCAN TO BOOK</text>
  </g>

  <!-- "point camera" caption above QR (sits between chips and QR card) -->
  <g transform="translate(${OX + W / 2}, ${OY + 462})" text-anchor="middle">
    <text y="0" font-size="17" font-weight="700" fill="#FFFFFF" letter-spacing="0.5">↓  Point your camera  ↓</text>
  </g>

  <!-- ========= FOOTER (app teaser + URL + phone) ========= -->
  <!-- app launching soon pill -->
  <g transform="translate(${OX + W / 2}, ${OY + H - 150})" text-anchor="middle">
    <rect x="-130" y="-11" width="260" height="22" rx="11" ry="11"
          fill="#FFFFFF" opacity="0.12" stroke="#FFFFFF" stroke-opacity="0.45" stroke-width="0.6"/>
    <!-- tiny phone glyph on the left -->
    <g transform="translate(-108, -6) scale(0.55)" fill="#FF4D8D">
      <rect x="0" y="0" width="14" height="22" rx="3" ry="3" stroke="#FF4D8D" stroke-width="1" fill="none"/>
      <circle cx="7" cy="18" r="1.2" fill="#FF4D8D"/>
    </g>
    <text y="3" class="mono" font-size="9" font-weight="700" fill="#FFFFFF" letter-spacing="3">
      iOS &amp; ANDROID APP LAUNCHING 2026
    </text>
  </g>

  <!-- URL -->
  <g transform="translate(${OX + W / 2}, ${OY + H - 110})" text-anchor="middle">
    <text y="0" fill="#FFFFFF" font-size="40" font-weight="900" letter-spacing="-1">jetmeaway.co.uk</text>
  </g>

  <!-- divider -->
  <line x1="${OX + W / 2 - 120}" y1="${OY + H - 88}" x2="${OX + W / 2 + 120}" y2="${OY + H - 88}"
        stroke="#FFFFFF" stroke-opacity="0.25" stroke-width="0.6"/>

  <!-- phone + icon -->
  <g transform="translate(${OX + W / 2}, ${OY + H - 52})" text-anchor="middle">
    <g transform="translate(-170, -14)">
      ${phoneIcon()}
    </g>
    <text y="0" fill="#FFFFFF" font-size="34" font-weight="800" letter-spacing="-0.5">${PHONE_DISPLAY}</text>
    <text y="22" fill="#BFD5FF" font-size="12" font-weight="500" letter-spacing="3">${PHONE_HOURS}</text>
  </g>

  ${trimMarks()}
</svg>`;

function phoneIcon() {
  // simple rounded-rect phone handset, 24mm wide
  return `<g transform="scale(1.4)" fill="#FF4D8D">
    <path d="M4 2 C 4 0.9 4.9 0 6 0 L10 0 C 11.1 0 12 0.9 12 2 L 12 3.5
             C 12 4.1 11.6 4.6 11.05 4.75 L 9.8 5.05 C 9.3 5.2 9 5.65 9 6.15
             L 9 9.85 C 9 10.35 9.3 10.8 9.8 10.95 L 11.05 11.25
             C 11.6 11.4 12 11.9 12 12.5 L 12 14 C 12 15.1 11.1 16 10 16 L 6 16
             C 4.9 16 4 15.1 4 14 L 4 2 Z"
          transform="rotate(-35 8 8)"/>
  </g>`;
}

function planeIcon() {
  return `<g transform="scale(2.2)" fill="#FFFFFF">
    <path d="M0 6 L20 6 L26 0 L28 2 L24 8 L28 14 L26 16 L20 10 L0 10 Z"/>
    <path d="M6 4 L10 0 L12 0 L10 4 Z"/>
    <path d="M6 12 L10 16 L12 16 L10 12 Z"/>
  </g>`;
}

function starburstPath(rOuter, rInner, points) {
  // zigzag star badge — alternate outer/inner vertices
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const ang = (i * Math.PI) / points - Math.PI / 2;
    pts.push(`${(Math.cos(ang) * r).toFixed(2)},${(Math.sin(ang) * r).toFixed(2)}`);
  }
  return `
    <polygon points="${pts.join(' ')}" fill="#FFD400" stroke="#0A0D1A" stroke-width="1.5"/>
    <circle cx="0" cy="0" r="${rInner - 2}" fill="#FFD400" opacity="0"/>`;
}

function destChip(dx, name, price) {
  const w = 172, h = 44, r = h / 2;
  return `
    <g transform="translate(${dx}, 0)">
      <rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="${r}" ry="${r}"
            fill="#FFFFFF" opacity="0.12"
            stroke="#FFFFFF" stroke-opacity="0.4" stroke-width="0.8"/>
      <text x="${-w / 2 + 16}" y="5" text-anchor="start" font-size="15" font-weight="800" fill="#FFFFFF">${name}</text>
      <text x="${w / 2 - 16}" y="5" text-anchor="end" class="mono" font-size="13" font-weight="700" fill="#FF4D8D">${price}</text>
    </g>`;
}

function chip(dx, label) {
  const w = 160, h = 38, r = h / 2;
  return `
    <g transform="translate(${dx}, 0)">
      <rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="${r}" ry="${r}"
            fill="#FFFFFF" opacity="0.12"
            stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="0.8"/>
      <text y="5" text-anchor="middle" font-size="14" font-weight="700" fill="#FFFFFF">${label}</text>
    </g>`;
}

function scanlines() {
  const lines = [];
  for (let y = OY; y < OY + H; y += 3) {
    lines.push(`<rect x="${OX}" y="${y}" width="${W}" height="0.4" fill="#FFFFFF" opacity="0.015"/>`);
  }
  return lines.join('');
}

function stars(n) {
  let seed = 42;
  const rand = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  const out = [];
  for (let i = 0; i < n; i++) {
    const x = OX + rand() * W;
    const y = OY + rand() * H * 0.55;
    const r = rand() * 1.4 + 0.3;
    const o = rand() * 0.5 + 0.2;
    out.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="#FFFFFF" opacity="${o.toFixed(2)}"/>`);
  }
  return out.join('');
}

function trimMarks() {
  const len = 5, off = 1;
  const s = `stroke="#FFFFFF" stroke-width="0.3"`;
  const corners = [[OX, OY], [OX + W, OY], [OX, OY + H], [OX + W, OY + H]];
  const m = [];
  for (const [x, y] of corners) {
    const hx1 = x < FW / 2 ? x - off - len : x + off;
    m.push(`<line x1="${hx1}" y1="${y}" x2="${hx1 + len}" y2="${y}" ${s}/>`);
    const vy1 = y < FH / 2 ? y - off - len : y + off;
    m.push(`<line x1="${x}" y1="${vy1}" x2="${x}" y2="${vy1 + len}" ${s}/>`);
  }
  return m.join('\n');
}

await fs.writeFile(path.join(__dirname, 'poster-A1.svg'), svg, 'utf8');
console.log(`Wrote poster-A1.svg — ${FW}×${FH} mm (A1 + 3mm bleed), logo embedded, QR → ${URL}`);
