/**
 * JetMeAway 2-inch takeaway-bag sticker — circular kiss-cut.
 * Trim: 50 mm (≈2"), +3 mm bleed → 56 × 56 mm artboard.
 * Kiss-cut guide included on a separate colour (print shop knows the drill).
 * Output: sticker-2in.svg, with real logo + QR embedded.
 */

import QRCode from 'qrcode';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// utm_medium=sticker so you can see bag-traffic separately in GA4
const URL = 'https://jetmeaway.co.uk/?utm_source=sticker&utm_medium=takeawaybag&utm_campaign=a1_q2_2026';

const BLEED = 3;            // mm
const TRIM = 50;            // mm (≈ 2 inch)
const FW = TRIM + BLEED * 2;
const FH = FW;
const CX = FW / 2;
const CY = FH / 2;

// --- embed real logo ---
const logoPath = path.resolve(__dirname, '..', 'public', 'jetmeaway-logo.png');
const logoBuf = await fs.readFile(logoPath);
const logoB64 = logoBuf.toString('base64');
const logoURI = `data:image/png;base64,${logoB64}`;
// logo native 313 × 80
const LOGO_H = 6;
const LOGO_W = LOGO_H * (313 / 80);   // ≈ 23.5 mm wide

// --- QR ---
const qrSvg = await QRCode.toString(URL, {
  type: 'svg',
  errorCorrectionLevel: 'H',   // survives crumples + sticky residue
  margin: 1,
  color: { dark: '#0A0D1A', light: '#FFFFFF' },
});
const vbMatch = qrSvg.match(/viewBox="0 0 (\d+) (\d+)"/);
const qrModules = vbMatch ? parseInt(vbMatch[1], 10) : 29;
const qrInner = [...qrSvg.matchAll(/<path[^>]*\/>/g)].map(m => m[0]).join('');

const QR_MM = 26;   // 26 mm QR — comfortable for a phone camera at arm's length

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${FW}mm" height="${FH}mm"
     viewBox="0 0 ${FW} ${FH}">

  <defs>
    <style><![CDATA[
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@700;800;900&family=JetBrains+Mono:wght@700&display=swap');
      text { font-family: 'Poppins', 'Helvetica Neue', Arial, sans-serif; }
      .mono { font-family: 'JetBrains Mono', 'Menlo', monospace; }
    ]]></style>

    <!-- colour-invert for the dark logo over blue -->
    <filter id="invertLogo" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feColorMatrix type="matrix"
        values="-1 0 0 0 1
                 0 -1 0 0 1
                 0 0 -1 0 1
                 0 0 0 1 0"/>
    </filter>

    <!-- arc path for curved bottom text -->
    <path id="bottomArc"
          d="M ${CX - (TRIM / 2 - 4)} ${CY}
             A ${TRIM / 2 - 4} ${TRIM / 2 - 4} 0 0 0 ${CX + (TRIM / 2 - 4)} ${CY}"/>
  </defs>

  <!-- full bleed background (the 3mm extra so cutter can drift) -->
  <rect x="0" y="0" width="${FW}" height="${FH}" fill="#0066FF"/>

  <!-- brand disc (sits inside trim so any cutter slip still looks clean) -->
  <circle cx="${CX}" cy="${CY}" r="${TRIM / 2 - 0.2}" fill="#0066FF"/>
  <!-- inner pink ring for a bit of punch -->
  <circle cx="${CX}" cy="${CY}" r="${TRIM / 2 - 2.2}" fill="none"
          stroke="#FF4D8D" stroke-width="0.8"/>

  <!-- JetMeAway wordmark (top) -->
  <g transform="translate(${CX}, ${CY - 16})">
    <image x="${-LOGO_W / 2}" y="${-LOGO_H / 2}"
           width="${LOGO_W}" height="${LOGO_H}"
           href="${logoURI}" xlink:href="${logoURI}"
           preserveAspectRatio="xMidYMid meet"
           filter="url(#invertLogo)"
           style="image-rendering:auto"/>
  </g>

  <!-- white QR card -->
  <g transform="translate(${CX}, ${CY + 1})">
    <rect x="${-(QR_MM / 2 + 1.2)}" y="${-(QR_MM / 2 + 1.2)}"
          width="${QR_MM + 2.4}" height="${QR_MM + 2.4}"
          rx="2" ry="2" fill="#FFFFFF"/>
    <g transform="translate(${-QR_MM / 2}, ${-QR_MM / 2}) scale(${QR_MM / qrModules})">
      ${qrInner}
    </g>
  </g>

  <!-- curved call-to-action along bottom arc -->
  <text font-size="3.4" font-weight="800" fill="#FFFFFF" letter-spacing="2"
        class="mono" text-anchor="middle">
    <textPath href="#bottomArc" startOffset="50%">SCAN · BOOK · FLY</textPath>
  </text>

  <!-- dashed kiss-cut guide (MAGENTA — print shops read this as die line, NOT as ink) -->
  <circle cx="${CX}" cy="${CY}" r="${TRIM / 2}"
          fill="none" stroke="#FF00FF" stroke-width="0.12" stroke-dasharray="0.8 0.8"/>

  <!-- tiny corner crop marks on bleed for the print shop -->
  <g stroke="#FFFFFF" stroke-width="0.15">
    <line x1="0"   y1="${BLEED}" x2="1" y2="${BLEED}"/>
    <line x1="${BLEED}" y1="0" x2="${BLEED}" y2="1"/>
    <line x1="${FW - 1}" y1="${BLEED}" x2="${FW}" y2="${BLEED}"/>
    <line x1="${FW - BLEED}" y1="0" x2="${FW - BLEED}" y2="1"/>
    <line x1="0"   y1="${FH - BLEED}" x2="1" y2="${FH - BLEED}"/>
    <line x1="${BLEED}" y1="${FH - 1}" x2="${BLEED}" y2="${FH}"/>
    <line x1="${FW - 1}" y1="${FH - BLEED}" x2="${FW}" y2="${FH - BLEED}"/>
    <line x1="${FW - BLEED}" y1="${FH - 1}" x2="${FW - BLEED}" y2="${FH}"/>
  </g>
</svg>`;

await fs.writeFile(path.join(__dirname, 'sticker-2in.svg'), svg, 'utf8');
console.log(`Wrote sticker-2in.svg — ${FW}×${FH} mm (2" trim + 3 mm bleed), QR → ${URL}`);
