#!/usr/bin/env node
/**
 * Kyte sandbox smoke test — Phase 0 of the LCC integration plan.
 *
 * Goal: prove the full stack works end-to-end before writing any UI code:
 *   .env.local → undici.fetch → ProxyAgent → Fixie proxy → Kyte sandbox
 *
 * Calls POST /api/v3/flights/shop?airlines=U2 (easyJet) for LGW-AMS on a
 * future date with 1 adult passenger. Logs response shape only — no PII,
 * no offers, no card data, no headers echoed back.
 *
 * Success = HTTP 200 with at least one offer.
 * Failure modes are documented in ~/.claude/plans/kyte-lcc-integration.md
 * under Phase 0.
 *
 * Usage:
 *   node scripts/kyte-smoke.mjs                  # default: U2 LGW-AMS in 30 days
 *   CARRIER=FR FROM=BUD TO=DUB node scripts/kyte-smoke.mjs   # Ryanair BUD-DUB
 *
 * Standalone Node script — NOT shipped with the build. .env.local is
 * read manually (Next.js auto-loading does not apply outside the app).
 */

import { readFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { fetch, ProxyAgent } from 'undici';

function loadDotEnv(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    const [, key, rawVal] = m;
    if (process.env[key]) continue;
    const val = rawVal.replace(/^['"]/, '').replace(/['"]$/, '');
    process.env[key] = val;
  }
}

loadDotEnv('.env.local');

const required = ['KYTE_PROXY_URL', 'KYTE_API_KEY', 'KYTE_SANDBOX_BASE_URL'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`[kyte-smoke] missing env vars: ${missing.join(', ')}`);
  console.error('[kyte-smoke] pull from Vercel:');
  console.error('  vercel env pull --environment=preview .env.local');
  console.error('or paste each var into .env.local manually.');
  process.exit(2);
}

const CARRIER = process.env.CARRIER || 'U2';
const FROM = process.env.FROM || 'LGW';
const TO = process.env.TO || 'AMS';

const departureDate = (() => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 30);
  return d.toISOString().slice(0, 10);
})();

const requestId = randomUUID();
const transactionId = randomUUID();

const baseUrl = process.env.KYTE_SANDBOX_BASE_URL.replace(/\/+$/, '');
const url = `${baseUrl}/api/v3/flights/shop?airlines=${encodeURIComponent(CARRIER)}`;

const payload = {
  journeys: [
    {
      departureAirport: FROM,
      arrivalAirport: TO,
      date: { main: departureDate },
    },
  ],
  cabinType: 'economy',
  nonStopFlight: true,
  exactMatch: true,
  flexibility: 'lowest',
  passengers: [{ age: 30 }],
};

const dispatcher = new ProxyAgent(process.env.KYTE_PROXY_URL);

console.log(`[kyte-smoke] POST ${url}`);
console.log(`[kyte-smoke]   route=${FROM}-${TO} date=${departureDate} carrier=${CARRIER}`);
console.log(`[kyte-smoke]   reqId=${requestId} txId=${transactionId}`);
console.log(`[kyte-smoke]   via Fixie proxy (KYTE_PROXY_URL set, password redacted)`);

const t0 = Date.now();
let res;
try {
  res = await fetch(url, {
    method: 'POST',
    headers: {
      'x-api-key': process.env.KYTE_API_KEY,
      'content-type': 'application/json',
      'x-request-id': requestId,
      'x-transaction-id': transactionId,
    },
    body: JSON.stringify(payload),
    dispatcher,
  });
} catch (err) {
  console.error(`[kyte-smoke] network error after ${Date.now() - t0}ms:`, err.code || err.message);
  console.error('[kyte-smoke] check: Fixie proxy URL valid? quota left? sandbox reachable?');
  process.exit(3);
}

const latencyMs = Date.now() - t0;
const text = await res.text();
let body;
try {
  body = JSON.parse(text);
} catch {
  body = text.slice(0, 200);
}

console.log(`[kyte-smoke] status=${res.status} latency=${latencyMs}ms`);

if (!res.ok) {
  console.error('[kyte-smoke] FAIL:', typeof body === 'string' ? body : JSON.stringify(body, null, 2));
  if (res.status === 401 || res.status === 403) {
    console.error('[kyte-smoke] auth/IP issue. Check:');
    console.error('  - KYTE_API_KEY value matches Vercel');
    console.error('  - Fixie outbound IPs (54.217.142.99 + 54.195.3.54) whitelisted by Raquel');
  }
  process.exit(1);
}

const offerKeys = body && typeof body === 'object' && body.offers ? Object.keys(body.offers) : [];
console.log(`[kyte-smoke] OK — offerCount=${offerKeys.length}`);
if (offerKeys.length > 0) {
  console.log(`[kyte-smoke] sample offerId (first 12 chars)=${offerKeys[0].slice(0, 12)}…`);
}
console.log(`[kyte-smoke] response top-level keys=${Object.keys(body || {}).join(',')}`);

if (offerKeys.length === 0) {
  console.warn('[kyte-smoke] WARN: 200 OK but zero offers. Check route/date/carrier combination.');
  process.exit(4);
}

console.log('[kyte-smoke] ✓ Phase 0 acceptance criteria met.');
