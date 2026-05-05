#!/usr/bin/env node
/**
 * KV inventory — read-only.
 * Scans every key in Upstash KV and groups by prefix. Reports count +
 * approximate size per group. No deletes. Safe to run anytime.
 *
 * Usage:
 *   node scripts/kv-inventory.mjs
 *
 * Reads connection from .env.local (KV_REST_API_URL + KV_REST_API_TOKEN).
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Load env
const envPath = resolve(process.cwd(), '.env.local');
const env = {};
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
  if (m) env[m[1]] = m[2];
}

const URL_BASE = env.KV_REST_API_URL;
const TOKEN = env.KV_REST_API_TOKEN;
if (!URL_BASE || !TOKEN) {
  console.error('Missing KV_REST_API_URL or KV_REST_API_TOKEN');
  process.exit(1);
}

async function rest(path, body) {
  const res = await fetch(`${URL_BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

// Upstash REST: SCAN /scan/{cursor}?match=...&count=...
async function scanAll() {
  const keys = [];
  let cursor = '0';
  while (true) {
    const params = new URLSearchParams({ count: '500', match: '*' });
    const res = await fetch(`${URL_BASE}/scan/${cursor}?${params}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    if (!res.ok) throw new Error(`SCAN HTTP ${res.status}`);
    const data = await res.json();
    cursor = data.result[0];
    for (const k of data.result[1]) keys.push(k);
    if (cursor === '0') break;
  }
  return keys;
}

function prefixOf(key) {
  // hotels:v29:foo → hotels:v29
  // pending-booking:abc → pending-booking
  // google-info:v1:la_xx → google-info:v1
  // bookings:all → bookings:all
  // hotel-details:v5:abc → hotel-details:v5
  const parts = key.split(':');
  if (parts.length === 1) return key;
  if (parts[1]?.startsWith('v')) return `${parts[0]}:${parts[1]}`;
  if (key.startsWith('pending-booking:')) return 'pending-booking';
  if (key.startsWith('bug-inbox:')) return 'bug-inbox';
  if (key.startsWith('search:')) return 'search';
  if (key.startsWith('subscriber:')) return 'subscriber';
  if (key.startsWith('pdf-leads:')) return 'pdf-leads';
  return parts[0];
}

(async () => {
  console.log('Scanning KV...');
  const keys = await scanAll();
  console.log(`Total keys: ${keys.length}\n`);

  // Group
  const groups = new Map();
  for (const k of keys) {
    const p = prefixOf(k);
    if (!groups.has(p)) groups.set(p, []);
    groups.get(p).push(k);
  }

  // Sort by count desc
  const sorted = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);

  // Sample size — fetch ~20 keys per group to estimate avg size
  console.log('Group | Count | Avg-size | Approx-total | Sample key');
  console.log('---|---|---|---|---');
  let grandTotal = 0;
  for (const [prefix, ks] of sorted) {
    const sample = ks.slice(0, Math.min(10, ks.length));
    let totalBytes = 0;
    for (const k of sample) {
      const r = await fetch(`${URL_BASE}/get/${encodeURIComponent(k)}`, {
        headers: { Authorization: `Bearer ${TOKEN}` },
      });
      if (r.ok) {
        const d = await r.json();
        totalBytes += d.result ? Buffer.byteLength(d.result, 'utf8') : 0;
      }
    }
    const avg = sample.length > 0 ? totalBytes / sample.length : 0;
    const approxTotal = avg * ks.length;
    grandTotal += approxTotal;
    console.log(`${prefix} | ${ks.length} | ${(avg / 1024).toFixed(1)} KB | ${(approxTotal / 1024 / 1024).toFixed(2)} MB | ${ks[0].slice(0, 80)}`);
  }
  console.log(`\nApprox total: ${(grandTotal / 1024 / 1024).toFixed(2)} MB`);
})();
