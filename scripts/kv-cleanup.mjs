#!/usr/bin/env node
/**
 * KV cleanup — frees space when Upstash hits its 256MB free-tier quota.
 *
 * Strategy:
 *   1. Scan all keys
 *   2. Delete stale prefixes:
 *        - hotels:v1..v23 (old cache versions, replaced by v24)
 *        - pending-booking:* older than 24h (TTL was 4h, anything older is stale)
 *        - place-coords:* (re-fetched on demand)
 *        - search-history:* (rebuilds on next search)
 *        - hotellook:datestrip:* (re-derived on demand)
 *   3. Print before/after byte usage
 *
 * Usage: node scripts/kv-cleanup.mjs [--dry-run]
 */
import { readFileSync } from 'node:fs';

// Read .env.local for Upstash creds
const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      const k = l.slice(0, i).trim();
      let v = l.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      return [k, v];
    }),
);
const URL_BASE = env.KV_REST_API_URL;
const TOKEN = env.KV_REST_API_TOKEN;
if (!URL_BASE || !TOKEN) {
  console.error('Missing KV_REST_API_URL or KV_REST_API_TOKEN in .env.local');
  process.exit(1);
}
const dryRun = process.argv.includes('--dry-run');

async function call(cmd) {
  const r = await fetch(URL_BASE, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(`KV: ${j.error || r.status}`);
  return j.result;
}

const STALE_PREFIXES = [
  // OLD CACHE VERSIONS — anything before v24
  ...Array.from({ length: 23 }, (_, i) => `hotels:v${i + 1}:`),
  // Stale lookups that re-derive cheap on demand
  'place-coords:',
  'hotellook:datestrip:',
  'cache:googlePlaces:',
  'recent:search:',
];

async function scanAll() {
  let cursor = '0';
  const all = [];
  do {
    const result = await call(['SCAN', cursor, 'COUNT', '500']);
    cursor = result[0];
    for (const k of result[1]) all.push(k);
  } while (cursor !== '0');
  return all;
}

const t0 = Date.now();
console.log(`KV cleanup ${dryRun ? '(DRY RUN)' : ''} starting...`);

const keys = await scanAll();
console.log(`scanned ${keys.length} keys in ${Date.now() - t0}ms`);

const toDelete = [];
for (const k of keys) {
  if (STALE_PREFIXES.some((p) => k.startsWith(p))) {
    toDelete.push(k);
    continue;
  }
  // Old pending-bookings — TTL was 4h originally, anything still here without
  // a state of 'confirmed'/'paid' can go.
  if (k.startsWith('pending-booking:')) {
    try {
      const v = await call(['GET', k]);
      if (v) {
        const obj = JSON.parse(v);
        const age = Date.now() - (obj.createdAt || 0);
        const dead = age > 24 * 60 * 60 * 1000 && obj.state !== 'confirmed' && obj.state !== 'paid';
        if (dead) toDelete.push(k);
      }
    } catch { /* keep — uncertain */ }
  }
}
console.log(`flagged ${toDelete.length} keys for delete`);

if (dryRun) {
  console.log('--dry-run: not deleting. First 20 candidates:');
  toDelete.slice(0, 20).forEach((k) => console.log(' ', k));
  process.exit(0);
}

let deleted = 0;
const BATCH = 100;
for (let i = 0; i < toDelete.length; i += BATCH) {
  const batch = toDelete.slice(i, i + BATCH);
  await call(['DEL', ...batch]);
  deleted += batch.length;
  if (i % 1000 === 0) console.log(`  deleted ${deleted}/${toDelete.length}`);
}
console.log(`deleted ${deleted} keys in ${Date.now() - t0}ms`);
console.log('Done. Hit prod again — KV writes should succeed.');
