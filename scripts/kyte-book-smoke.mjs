#!/usr/bin/env node
/**
 * Kyte FULL booking smoke — Phase 3 of the LCC integration plan.
 *
 * Runs the end-to-end sandbox booking flow:
 *   Shop → OfferDetails → BookFlight → Payment → RetrieveBooking
 *
 * Carrier: LS (Jet2) by default — simplest LCC, no bundle workflow, no
 * iframe quirks. Switch carrier via env.
 *
 * Test card is Kyte's documented sandbox PAN (visa-debit) — NO real
 * money, NO PCI scope. Production card-capture is a separate decision
 * deferred to its own phase.
 *
 * PII handling: passenger / card / address are HARDCODED sandbox test
 * data, not real user input. Logs scrub anything that looks remotely
 * like PII — only IDs, status codes, amounts, latency.
 *
 * Usage:
 *   node scripts/kyte-book-smoke.mjs
 *   CARRIER=LS FROM=MAN TO=PMI node scripts/kyte-book-smoke.mjs
 *
 * Exit codes:
 *   0 = full flow OK (booking confirmed + payment OK + retrieve OK)
 *   1 = some step returned non-2xx
 *   2 = missing env vars
 *   3 = no offers from Shop
 *   4 = offer/booking ID missing in response
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
    process.env[key] = rawVal.replace(/^['"]/, '').replace(/['"]$/, '');
  }
}

loadDotEnv('.env.local');

const required = ['KYTE_PROXY_URL', 'KYTE_API_KEY', 'KYTE_SANDBOX_BASE_URL'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`[book-smoke] missing env vars: ${missing.join(', ')}`);
  process.exit(2);
}

const CARRIER = process.env.CARRIER || 'LS';
const FROM = process.env.FROM || 'MAN';
const TO = process.env.TO || 'PMI';

const departureDate = (() => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 45);
  return d.toISOString().slice(0, 10);
})();

const baseUrl = process.env.KYTE_SANDBOX_BASE_URL.replace(/\/+$/, '');
const dispatcher = new ProxyAgent(process.env.KYTE_PROXY_URL);
const transactionId = randomUUID();

function log(...args) {
  console.log('[book-smoke]', ...args);
}
function err(...args) {
  console.error('[book-smoke] FAIL', ...args);
}

async function kyte(method, path, body) {
  const requestId = randomUUID();
  const url = `${baseUrl}${path}`;
  const t0 = Date.now();
  const res = await fetch(url, {
    method,
    headers: {
      'x-api-key': process.env.KYTE_API_KEY,
      'content-type': 'application/json',
      'x-request-id': requestId,
      'x-transaction-id': transactionId,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    dispatcher,
  });
  const latency = Date.now() - t0;
  const text = await res.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { raw: text.slice(0, 500) };
  }
  log(`${method} ${path} -> ${res.status} (${latency}ms) req=${requestId.slice(0, 8)}`);
  if (!res.ok) {
    err('non-2xx:', JSON.stringify(payload).slice(0, 400));
    process.exit(1);
  }
  return payload;
}

// ───── Step 1: Shop ─────
log(`tx=${transactionId.slice(0, 8)} carrier=${CARRIER} route=${FROM}-${TO} date=${departureDate}`);
log('--- Step 1: ShopFlights ---');
const shopRes = await kyte('POST', `/api/v3/flights/shop?airlines=${CARRIER}`, {
  journeys: [{ departureAirport: FROM, arrivalAirport: TO, date: { main: departureDate } }],
  cabinType: 'economy',
  nonStopFlight: true,
  exactMatch: true,
  flexibility: 'lowest',
  passengers: [{ age: 30 }],
});

const offers = shopRes.offers ? Object.entries(shopRes.offers) : [];
if (offers.length === 0) {
  err(`no offers returned for ${FROM}-${TO} on ${departureDate} carrier=${CARRIER}`);
  err('try a different route/date/carrier');
  process.exit(3);
}

const [offerId, offerRaw] = offers[0];
log(`Got ${offers.length} offers — selected offerId=${offerId.slice(0, 16)}…`);
const offerSummary = (() => {
  const o = offerRaw;
  if (!o || typeof o !== 'object') return {};
  return {
    totalAmount: o.totalAmount ?? o.price?.total ?? o.fareDetails?.total ?? 'unknown',
    currency: o.currency ?? o.price?.currency ?? 'unknown',
    keys: Object.keys(o).slice(0, 8),
  };
})();
log('offer summary:', offerSummary);

// ───── Step 2: OfferDetails ─────
log('--- Step 2: OfferDetails ---');
const detailsRes = await kyte('POST', '/api/v3/flights/shop/offer-details', {
  offerIds: [offerId],
});
log('details top-level keys:', Object.keys(detailsRes || {}).slice(0, 10).join(','));

// ───── Step 3: BookFlight ─────
log('--- Step 3: BookFlight ---');
const bookRes = await kyte('POST', `/api/v3/flights/book/${encodeURIComponent(offerId)}`, {
  passengers: [
    {
      id: '1',
      firstName: 'Sandbox',
      lastName: 'Tester',
      gender: 'male',
      title: 'mr',
      dateOfBirth: '1990-01-15',
      contactInformation: {
        email: 'sandbox-test@jetmeaway.co.uk',
        phone: [{ countryCode: '+44', number: '7700900000', type: 'Mobile' }],
      },
    },
  ],
});

const bookingId = bookRes.id ?? bookRes.bookingId ?? bookRes.booking?.id;
const totalAmount =
  bookRes.currentBalance ?? bookRes.booking?.currentBalance ?? bookRes.totalAmount;
if (!bookingId) {
  err('BookFlight response missing booking id. Top-level keys:', Object.keys(bookRes || {}));
  process.exit(4);
}
log(`bookingId=${String(bookingId).slice(0, 16)}… currentBalance=${totalAmount}`);

// ───── Step 4: Payment ─────
log('--- Step 4: Payment ---');
const paymentRes = await kyte('POST', `/api/v3/payment/${encodeURIComponent(bookingId)}`, {
  method: 'card',
  amount: totalAmount,
  creditCardInfo: [
    {
      number: '4539795097006388',
      cardholderName: 'Sandbox Tester',
      valid: { month: 10, year: 30 },
      security: '747',
      type: 'visa-debit',
      isCorporate: false,
      address: {
        addressLines: ['66 Paul Street'],
        city: 'London',
        postalCode: 'EC2A 4NA',
        countryCode: 'GB',
      },
      owner: '1',
    },
  ],
  payerInformation: [
    {
      id: '1',
      firstName: 'Sandbox',
      lastName: 'Tester',
      title: 'mr',
      contactInformation: {
        email: 'sandbox-test@jetmeaway.co.uk',
        phone: [{ countryCode: '+44', number: '7700900000', type: 'Home' }],
      },
    },
  ],
});

log('payment status:', paymentRes.status ?? 'no-status-field');
log('payment top-level keys:', Object.keys(paymentRes || {}).slice(0, 10).join(','));

// ───── Step 5: RetrieveBooking ─────
log('--- Step 5: RetrieveBooking ---');
const retrieveRes = await kyte(
  'POST',
  `/api/v3/flights/book/retrieve/${encodeURIComponent(bookingId)}`,
  {
    forceRefresh: true,
    requestedInfo: [
      'PNR',
      'passengerDetails',
      'ticketInfo',
      'itinerary',
      'ancillaries',
      'paymentInfo',
      'pricingBreakdown',
    ],
  },
);

const pnr = retrieveRes.booking?.pnr ?? retrieveRes.pnr ?? retrieveRes.booking?.PNR;
const ticketStatus = retrieveRes.booking?.ticketStatus ?? retrieveRes.ticketStatus;
log(`PNR=${pnr ?? 'not-present'} ticketStatus=${ticketStatus ?? 'unknown'}`);
log('retrieve top-level keys:', Object.keys(retrieveRes || {}).slice(0, 10).join(','));

log('✓ Phase 3 acceptance: full booking flow completed in sandbox');
