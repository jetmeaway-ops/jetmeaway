#!/usr/bin/env node
/**
 * Capture App Store screenshots from jetmeaway.co.uk via puppeteer-core.
 *
 * Hits prod at 1290x2796 (iPhone 6.7" Display — accepted by App Store
 * Connect) using the system Chrome. Outputs PNG to:
 *   C:/Users/10ban/OneDrive/Desktop/IOS/raw-screenshots/
 *
 * After this, run:
 *   node scripts/resize-app-screenshots.mjs
 * (or upload directly — these are already at the correct dimensions).
 *
 * Usage: node scripts/capture-app-screenshots.mjs
 */

import puppeteer from 'puppeteer-core';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = 'C:/Users/10ban/OneDrive/Desktop/IOS/raw-screenshots';
const BASE = 'https://jetmeaway.co.uk';

// iPhone 6.7" Display — 1290 x 2796 actual pixels at DPR 3.
// Browser viewport in CSS pixels is 430 x 932; we set DPR = 3 so the
// rendered framebuffer comes out at the App Store target resolution.
const CSS_WIDTH = 430;
const CSS_HEIGHT = 932;
const DPR = 3;

const PAGES = [
  { slug: 'home',      path: '/',          waitFor: 1200 },
  { slug: 'flights',   path: '/flights',   waitFor: 1500 },
  { slug: 'hotels',    path: '/hotels',    waitFor: 1500 },
  { slug: 'packages',  path: '/packages',  waitFor: 1200 },
  { slug: 'cars',      path: '/cars',      waitFor: 1200 },
  { slug: 'esim',      path: '/esim',      waitFor: 1000 },
  { slug: 'insurance', path: '/insurance', waitFor: 1000 },
  { slug: 'explore',   path: '/explore',   waitFor: 1500 },
  { slug: 'blog',      path: '/blog',      waitFor: 1200 },
  { slug: 'about',     path: '/about',     waitFor: 1000 },
];

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
  args: [
    '--hide-scrollbars',
    '--disable-features=IsolateOrigins,site-per-process',
    '--no-sandbox',
  ],
});

console.log(`Capturing ${PAGES.length} pages at ${CSS_WIDTH * DPR}x${CSS_HEIGHT * DPR}...\n`);

const page = await browser.newPage();
// Mobile UA so the site renders the mobile layout
await page.setUserAgent(
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
);

let ok = 0, fail = 0;
for (const p of PAGES) {
  const url = BASE + p.path;
  const dst = join(OUT, `${p.slug}.png`);
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30_000 });
    await new Promise((r) => setTimeout(r, p.waitFor));
    // Scroll to top and take a non-fullpage screenshot at viewport size
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise((r) => setTimeout(r, 300));
    await page.screenshot({
      path: dst,
      type: 'png',
      omitBackground: false,
      clip: { x: 0, y: 0, width: CSS_WIDTH, height: CSS_HEIGHT },
    });
    console.log(`  OK  ${p.slug.padEnd(12)} -> ${dst.split(/[\\/]/).pop()}`);
    ok++;
  } catch (err) {
    console.log(`  FAIL ${p.slug.padEnd(12)} ${err.message}`);
    fail++;
  }
}

await browser.close();
console.log(`\nDone. ${ok} ok, ${fail} failed.\nFiles in:\n  ${OUT}`);
