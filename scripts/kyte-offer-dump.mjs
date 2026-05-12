#!/usr/bin/env node
/**
 * Quick exploratory dump of a single Kyte offer for any LCC, so we can
 * see exactly which fields we have to map into our `FlightResult` shape
 * (used by /flights). One-off helper — not part of the smoke suite.
 *
 * Usage:
 *   node scripts/kyte-offer-dump.mjs                     # LS MAN-PMI
 *   CARRIER=FR FROM=BUD TO=DUB node scripts/kyte-offer-dump.mjs
 */

import { readFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { fetch, ProxyAgent } from 'undici';

function loadDotEnv(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^['"]/, '').replace(/['"]$/, '');
  }
}

loadDotEnv('.env.local');

const CARRIER = process.env.CARRIER || 'LS';
const FROM = process.env.FROM || 'MAN';
const TO = process.env.TO || 'PMI';
const baseUrl = process.env.KYTE_SANDBOX_BASE_URL.replace(/\/+$/, '');
const dispatcher = new ProxyAgent(process.env.KYTE_PROXY_URL);
const departureDate = (() => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 45);
  return d.toISOString().slice(0, 10);
})();

const res = await fetch(`${baseUrl}/api/v3/flights/shop?airlines=${CARRIER}`, {
  method: 'POST',
  headers: {
    'x-api-key': process.env.KYTE_API_KEY,
    'content-type': 'application/json',
    'x-request-id': randomUUID(),
    'x-transaction-id': randomUUID(),
  },
  body: JSON.stringify({
    journeys: [{ departureAirport: FROM, arrivalAirport: TO, date: { main: departureDate } }],
    cabinType: 'economy',
    nonStopFlight: true,
    exactMatch: true,
    flexibility: 'lowest',
    passengers: [{ age: 30 }],
  }),
  dispatcher,
});

const body = await res.json();
const offers = body.offers ? Object.values(body.offers) : [];
if (!offers.length) {
  console.error('no offers');
  process.exit(1);
}

const offer = offers[0];
console.log('=== Top-level OFFER keys ===');
console.log(Object.keys(offer));
console.log('\n=== Full first offer (pretty) ===');
console.log(JSON.stringify(offer, null, 2));

console.log('\n=== Top-level RESPONSE keys ===');
console.log(Object.keys(body));
if (body.legs) {
  console.log('\n=== body.legs (first) ===');
  console.log(JSON.stringify(Array.isArray(body.legs) ? body.legs[0] : body.legs, null, 2));
}
if (body.flightSolutions) {
  console.log('\n=== body.flightSolutions sample ===');
  const fs = body.flightSolutions;
  const sample = Array.isArray(fs) ? fs[0] : Object.values(fs)[0];
  console.log(JSON.stringify(sample, null, 2));
}
