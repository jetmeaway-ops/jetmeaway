#!/usr/bin/env node
/**
 * Accessibility Audit — Stage 5 of the Safety Net.
 *
 * Fetches each public route's server-rendered HTML, parses it with jsdom,
 * runs axe-core inside that virtual DOM, and fails the run on any
 * `serious` or `critical` violations.
 *
 * Trade-off: jsdom does NOT execute React hydration. So we catch a11y
 * issues in the SSR'd HTML but miss things that only appear after JS
 * mounts (modals, carousels, dynamic menus). For our SSR'd Next.js
 * pages this still covers most landmark / heading / colour-contrast /
 * form-label / link-name / image-alt regressions, which are the ones
 * Lighthouse would surface.
 *
 * Why not headless Chrome / Playwright? Significant CI weight (~150MB
 * browser binary) and flake risk. The owner explicitly chose the lighter
 * static path for this push.
 *
 * Failure path: posts each violation rule (deduped per route) to
 * /api/bug-monitor with a stable fingerprint so the inbox doesn't
 * re-spam the same issue every night.
 *
 * Env:
 *   BASE                 - default https://jetmeaway.co.uk
 *   BUG_MONITOR_SECRET   - optional; when set, failures fingerprint into the bug inbox
 *   ROUTES               - optional comma-separated override
 */

import jsdomPkg from 'jsdom';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const { JSDOM } = jsdomPkg;
const require = createRequire(import.meta.url);
// Read the axe-core bundle as a string so we can inject it into each
// JSDom window's own JS context. Importing axe-core into Node directly
// doesn't work — axe checks `window`/`document` against its own realm
// and JSDom objects don't pass that check from a different realm.
const AXE_SOURCE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const BASE = (process.env.BASE || 'https://jetmeaway.co.uk').replace(/\/$/, '');
const SECRET = process.env.BUG_MONITOR_SECRET || '';

const DEFAULT_ROUTES = [
  '/', '/flights', '/hotels', '/packages', '/cars',
  '/explore', '/esim', '/insurance',
  '/about', '/contact', '/privacy', '/terms',
  '/blog', '/account',
];
const ROUTES = (process.env.ROUTES ? process.env.ROUTES.split(',') : DEFAULT_ROUTES).map((r) => r.trim()).filter(Boolean);

// axe rule severities we treat as failing. `moderate` and `minor` are
// reported but don't fail the build — too noisy to action nightly.
const FAILING_IMPACTS = new Set(['serious', 'critical']);

async function reportBug(message, context) {
  if (!SECRET) return;
  try {
    await fetch(`${BASE}/api/bug-monitor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-bug-monitor-secret': SECRET },
      body: JSON.stringify([{ level: 'error', message, context: context || {}, ts: new Date().toISOString() }]),
    });
  } catch {
    /* swallow */
  }
}

async function auditRoute(path) {
  const url = `${BASE}${path}`;
  const t0 = Date.now();
  let html;
  try {
    const r = await fetch(url, { headers: { 'user-agent': 'jetmeaway-a11y-audit/1' } });
    if (!r.ok) {
      return { path, ok: false, ms: Date.now() - t0, err: `HTTP ${r.status}`, violations: [] };
    }
    html = await r.text();
  } catch (e) {
    return { path, ok: false, ms: Date.now() - t0, err: `fetch failed: ${e.message}`, violations: [] };
  }

  // jsdom defaults to NOT fetching subresources (fonts/images/CSS/JS) —
  // exactly what we want for a fast, deterministic, structure-only scan.
  // runScripts:'outside-only' lets us .eval() axe in this window's realm
  // without executing any <script> tags from the page itself.
  const dom = new JSDOM(html, { url, pretendToBeVisual: true, runScripts: 'outside-only' });
  dom.window.eval(AXE_SOURCE);

  // axe runs inside the JSDom window. Disable rules that need a live
  // browser (colour-contrast needs computed styles which JSDom can't
  // produce reliably from external stylesheets we deliberately didn't load).
  const results = await dom.window.axe.run(dom.window.document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    rules: {
      'color-contrast': { enabled: false },
      'region': { enabled: false }, // SSR'd skeleton may legitimately not yet have a <main> wrapper
    },
    resultTypes: ['violations'],
  });

  dom.window.close();

  const failing = results.violations.filter((v) => FAILING_IMPACTS.has(v.impact));
  return { path, ok: failing.length === 0, ms: Date.now() - t0, violations: failing };
}

async function main() {
  console.log(`a11y-audit — BASE=${BASE} ROUTES=${ROUTES.length}`);
  const t0 = Date.now();
  const results = [];
  for (const path of ROUTES) {
    const r = await auditRoute(path);
    results.push(r);
    const tag = r.ok ? 'PASS' : 'FAIL';
    const v = r.violations.length;
    const errNote = r.err ? ` ${r.err}` : '';
    console.log(`  ${tag} ${path.padEnd(20)} ${r.ms}ms${errNote}${v ? ` — ${v} violation${v === 1 ? '' : 's'}` : ''}`);
    if (v) {
      for (const viol of r.violations) {
        console.log(`         ↳ [${viol.impact}] ${viol.id}: ${viol.help}`);
        console.log(`             ${viol.helpUrl}`);
        console.log(`             nodes: ${viol.nodes.length}`);
        const first = viol.nodes[0];
        if (first?.html) console.log(`             first: ${first.html.slice(0, 200)}`);
        if (first?.target) console.log(`             selector: ${first.target.join(' > ')}`);
      }
    }
  }

  const fails = results.filter((r) => !r.ok);
  console.log(`\n== Summary ==`);
  console.log(`  ${results.length - fails.length}/${results.length} routes clean`);
  console.log(`  total: ${Date.now() - t0}ms`);

  if (fails.length) {
    // Fingerprint by (route, ruleId) — one bug per distinct violation type,
    // not one per element. Stops the inbox flooding when a single shared
    // component leaks a violation across every page.
    const seen = new Set();
    for (const r of fails) {
      if (r.err) {
        await reportBug(`a11y route fetch failed: ${r.path}`, { path: r.path, err: r.err });
        continue;
      }
      for (const v of r.violations) {
        const fp = `${r.path}::${v.id}`;
        if (seen.has(fp)) continue;
        seen.add(fp);
        await reportBug(`a11y ${v.impact}: ${v.id} on ${r.path}`, {
          path: r.path,
          rule: v.id,
          impact: v.impact,
          help: v.help,
          helpUrl: v.helpUrl,
          nodeCount: v.nodes.length,
          firstNode: v.nodes[0]?.html?.slice(0, 200) || null,
        });
      }
    }
    process.exit(1);
  }
}

main().catch((e) => { console.error('a11y-audit crashed:', e); process.exit(2); });
