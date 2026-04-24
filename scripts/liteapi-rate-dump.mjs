#!/usr/bin/env node
/**
 * LiteAPI rate-plan diagnostic.
 *
 * Dumps the raw board-type and pricing fields for every rate under every
 * roomType, grouped by what our normaliser would produce. Run for a single
 * hotel + the same dates + occupancy that show the suspicious £5 breakfast
 * delta, and the output makes it obvious whether the LiteAPI response
 * genuinely has near-identical Room Only / B&B prices, or whether our
 * normaliser is collapsing two distinct rate plans into one row.
 *
 * Usage:
 *   LITE_API_KEY=... node scripts/liteapi-rate-dump.mjs <hotelId> <checkin> <checkout> [adults] [currency]
 *
 * Example (Hotel Saratoga, Palma, 30 Apr – 3 May 2026, 2 adults):
 *   node scripts/liteapi-rate-dump.mjs lp1234567 2026-04-30 2026-05-03 2 GBP
 *
 * Reads LITE_API_KEY and LITE_API_BASE from env (or ../../../.env.local).
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Pull LITE_API_KEY from .env.local at the main-repo root if not already in env.
function loadDotEnv() {
  if (process.env.LITE_API_KEY) return;
  const candidates = [
    resolve(__dirname, '..', '.env.local'),
    resolve(__dirname, '..', '..', '..', '.env.local'),
    resolve(__dirname, '..', '..', '..', '..', '.env.local'),
  ];
  for (const path of candidates) {
    try {
      const raw = readFileSync(path, 'utf8');
      for (const line of raw.split('\n')) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
        if (!m) continue;
        const [, k, vRaw] = m;
        if (process.env[k]) continue;
        const v = vRaw.replace(/^['"]|['"]$/g, '');
        process.env[k] = v;
      }
      return;
    } catch {}
  }
}

loadDotEnv();

const [,, hotelId, checkin, checkout, adultsArg = '2', currency = 'GBP'] = process.argv;
if (!hotelId || !checkin || !checkout) {
  console.error('Usage: node scripts/liteapi-rate-dump.mjs <hotelId> <checkin> <checkout> [adults] [currency]');
  process.exit(1);
}
const adults = Number(adultsArg) || 2;

const apiKey = process.env.LITE_API_KEY;
if (!apiKey) {
  console.error('LITE_API_KEY not set (and no .env.local found with it)');
  process.exit(1);
}
const base = (process.env.LITE_API_BASE || 'https://api.liteapi.travel/v3.0').replace(/\/$/, '');

const body = {
  hotelIds: [hotelId],
  checkin,
  checkout,
  occupancies: [{ adults, children: [] }],
  currency,
  guestNationality: 'GB',
};

console.log(`POST ${base}/hotels/rates`);
console.log(JSON.stringify(body, null, 2));
console.log('---');

const res = await fetch(`${base}/hotels/rates`, {
  method: 'POST',
  headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify(body),
});
if (!res.ok) {
  console.error(`HTTP ${res.status}: ${await res.text()}`);
  process.exit(1);
}
const json = await res.json();
const entry = json.data?.[0];
if (!entry) {
  console.error('No hotel entry returned');
  console.error(JSON.stringify(json, null, 2));
  process.exit(1);
}

console.log(`Hotel: ${entry.hotel?.name || entry.hotelId}`);
console.log(`roomTypes: ${entry.roomTypes?.length || 0}`);
console.log('');

const groups = new Map();
for (const rt of entry.roomTypes || []) {
  for (const r of rt.rates || []) {
    const boardName = r.boardName ?? null;
    const boardType = r.boardType ?? null;
    const rName = r.name ?? null;
    const rtName = rt.name ?? rt.roomName ?? null;
    const board = boardName || boardType || rName || 'Room Only';
    const roomKey = (rtName || rName || '__none__').toLowerCase();
    const boardKey = (board + '').toLowerCase();
    const mapKey = `${roomKey}|${boardKey}`;

    let price;
    if (typeof r.retailRate === 'number') price = r.retailRate;
    else if (r.retailRate?.total) {
      const arr = Array.isArray(r.retailRate.total) ? r.retailRate.total : [r.retailRate.total];
      price = arr.reduce((s, t) => s + (t.amount || 0), 0);
    } else if (typeof r.price === 'number') price = r.price;

    const row = {
      mapKey,
      rtName,
      rName,
      boardName,
      boardType,
      priceType: r.priceType ?? null,
      price,
      negotiatedRate: r.negotiatedRate ?? null,
      offerId_rate: r.offerId ?? null,
      offerId_roomType: rt.offerId ?? null,
      refundable: r.cancellationPolicy?.refundable ?? r.cancellationPolicies?.refundableTag ?? null,
    };

    if (!groups.has(mapKey)) groups.set(mapKey, []);
    groups.get(mapKey).push(row);
  }
}

console.log(`Distinct mapKeys produced by normaliser: ${groups.size}`);
console.log('(If Room Only and B&B share a key, they collapse into one row.)');
console.log('');

for (const [key, rows] of groups) {
  console.log(`━━ ${key} ━━ (${rows.length} rate${rows.length === 1 ? '' : 's'})`);
  for (const r of rows) console.log(JSON.stringify(r));
  console.log('');
}
