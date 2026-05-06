#!/usr/bin/env node
/**
 * Capture App Store iPad screenshots from jetmeaway.co.uk via puppeteer-core.
 *
 * Renders at 2048 x 2732 — the iPad Pro 12.9" Display dimensions that
 * App Store Connect accepts for iPad screenshots.
 *
 * Outputs PNG to:
 *   C:/Users/10ban/OneDrive/Desktop/IOS/ipad-raw/
 * After this, the same normalise-app-screenshots.mjs script flattens
 * them to flat sRGB no-alpha for upload — but adapt the SRC path or
 * call directly.
 *
 * Usage: node scripts/capture-ipad-screenshots.mjs
 */

import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
import { readdir, mkdir } from 'node:fs/promises';
import { join, basename, extname } from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const RAW = 'C:/Users/10ban/OneDrive/Desktop/IOS/ipad-raw';
const OUT = 'C:/Users/10ban/OneDrive/Desktop/IOS/ipad-ready-for-upload';
const BASE = 'https://jetmeaway.co.uk';

// iPad Pro 12.9" Display — 2048 x 2732 actual pixels.
// CSS viewport is 1024 x 1366 at DPR 2.
const CSS_WIDTH = 1024;
const CSS_HEIGHT = 1366;
const DPR = 2;

const PAGES = [
  { slug: 'home',      path: '/',          waitFor: 1500 },
  { slug: 'flights',   path: '/flights',   waitFor: 1800 },
  { slug: 'hotels',    path: '/hotels',    waitFor: 1800 },
  { slug: 'packages',  path: '/packages',  waitFor: 1500 },
  { slug: 'cars',      path: '/cars',      waitFor: 1500 },
  { slug: 'esim',      path: '/esim',      waitFor: 1200 },
  { slug: 'insurance', path: '/insurance', waitFor: 1200 },
  { slug: 'explore',   path: '/explore',   waitFor: 1800 },
  { slug: 'blog',      path: '/blog',      waitFor: 1500 },
  { slug: 'about',     path: '/about',     waitFor: 1200 },
];

await mkdir(RAW, { recursive: true });
await mkdir(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  defaultViewport: {
    width: CSS_WIDTH,
    height: CSS_HEIGHT,
    deviceScaleFactor: DPR,
    isMobile: true,
    hasTouch: true,
  },
  args: ['--hide-scrollbars', '--no-sandbox'],
});

console.log(`Capturing ${PAGES.length} iPad pages at ${CSS_WIDTH * DPR}x${CSS_HEIGHT * DPR}...\n`);

const page = await browser.newPage();
await page.setUserAgent(
  'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
);

let ok = 0, fail = 0;
for (const p of PAGES) {
  const url = BASE + p.path;
  const dst = join(RAW, `${p.slug}.png`);
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30_000 });
    await new Promise((r) => setTimeout(r, p.waitFor));
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise((r) => setTimeout(r, 300));
    await page.screenshot({
      path: dst,
      type: 'png',
      clip: { x: 0, y: 0, width: CSS_WIDTH, height: CSS_HEIGHT },
    });
    console.log(`  OK  ${p.slug.padEnd(12)} -> ${basename(dst)}`);
    ok++;
  } catch (err) {
    console.log(`  FAIL ${p.slug.padEnd(12)} ${err.message}`);
    fail++;
  }
}

await browser.close();

// Normalise to flat sRGB no-alpha PNGs in OUT
console.log('\nNormalising for Apple...\n');
const files = (await readdir(RAW)).filter((f) => f.endsWith('.png'));
for (const file of files) {
  const src = join(RAW, file);
  const dst = join(OUT, basename(file, extname(file)) + '.png');
  await sharp(src)
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .toColourspace('srgb')
    .withMetadata({ icc: 'srgb' })
    .png({ compressionLevel: 9, palette: false, force: true })
    .toFile(dst);
  const meta = await sharp(dst).metadata();
  console.log(`  ${file.padEnd(15)} -> ${meta.width}x${meta.height} ${meta.channels}ch ${meta.hasAlpha ? 'ALPHA' : 'no-alpha'} ${meta.space}`);
}

console.log(`\nDone. ${ok} captured.\nUpload-ready files:\n  ${OUT}`);
