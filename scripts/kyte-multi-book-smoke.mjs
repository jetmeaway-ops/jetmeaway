#!/usr/bin/env node
/**
 * Kyte multi-carrier full-booking smoke.
 *
 * Runs the full Shop → OfferDetails → Book → Payment → Retrieve flow
 * for each non-bundle, non-Ryanair LCC in sandbox. easyJet (U2) and
 * Ryanair (FR) are excluded: U2 needs the bundle flow + a sandbox card
 * we don't have, FR is the OTA/iframe path tracked in Phase 5.
 *
 * Carriers tested:
 *   - IndiGo  (6E) DEL-BOM   (78 offers on search)
 *   - Wizz Air (W6) LTN-BUD  (sandbox returns 0 offers — script skips)
 *   - Transavia (HV) AMS-AGP (3 offers)
 *   - Volotea (V7) LUX-NCE   (1 offer, Mon/Thu/Fri only — date+45 = Fri)
 *
 * Direct against the Kyte sandbox (does NOT use our HTTP routes, so KV
 * not touched). To persist a booking to /admin, use `kyte-route-smoke.mjs`
 * instead.
 *
 * Usage:
 *   node scripts/kyte-multi-book-smoke.mjs
 *
 * Exit code: 0 if all attempted carriers ticketed, 1 if any failed.
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
const required = ['KYTE_PROXY_URL', 'KYTE_API_KEY', 'KYTE_SANDBOX_BASE_URL'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`missing env vars: ${missing.join(', ')}`);
  process.exit(2);
}

const baseUrl = process.env.KYTE_SANDBOX_BASE_URL.replace(/\/+$/, '');
const dispatcher = new ProxyAgent(process.env.KYTE_PROXY_URL);

const departureDate = (() => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 45);
  return d.toISOString().slice(0, 10);
})();

// Per-carrier sandbox test cards from
// docs.sandbox.gokyte.com/integration_guide.html#payment
// Each carrier has its own bank simulator; wrong card = "Bank declined".
const CARDS = {
  '6E': { number: '4444333322221111', month: 6,  year: 28, security: '789', type: 'visa-debit' },
  'W6': { number: '4917610000000000', month: 3,  year: 30, security: '737', type: 'visa' },
  'HV': { number: '5555555555554444', month: 3,  year: 30, security: '737', type: 'mastercard' },
  'V7': { number: '5210000010001001', month: 8,  year: 27, security: '111', type: 'mastercard' },
};

const CARRIERS = [
  { code: '6E', name: 'IndiGo',    from: 'DEL', to: 'BOM' },
  { code: 'W6', name: 'Wizz Air',  from: 'LTN', to: 'BUD' },
  { code: 'HV', name: 'Transavia', from: 'AMS', to: 'AGP' },
  { code: 'V7', name: 'Volotea',   from: 'LUX', to: 'NCE' },
];

async function kyte(method, path, body, transactionId) {
  const reqId = randomUUID();
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'x-api-key': process.env.KYTE_API_KEY,
      'content-type': 'application/json',
      'x-request-id': reqId,
      'x-transaction-id': transactionId,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    dispatcher,
  });
  const text = await res.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { raw: text.slice(0, 300) };
  }
  return { status: res.status, body: payload };
}

async function bookOne(c) {
  const transactionId = randomUUID();
  const log = (msg) => console.log(`  [${c.code}] ${msg}`);

  // 1. Shop
  const shop = await kyte(
    'POST',
    `/api/v3/flights/shop?airlines=${c.code}`,
    {
      journeys: [{ departureAirport: c.from, arrivalAirport: c.to, date: { main: departureDate } }],
      cabinType: 'economy',
      nonStopFlight: true,
      exactMatch: true,
      flexibility: 'lowest',
      passengers: [{ age: 30 }],
    },
    transactionId,
  );
  if (shop.status !== 200) return { ok: false, step: 'shop', err: shop.body };
  const offerIds = shop.body.offers ? Object.keys(shop.body.offers) : [];
  if (offerIds.length === 0) {
    return { ok: false, step: 'shop', err: 'no offers — sandbox inventory empty' };
  }
  const offerId = offerIds[0];
  log(`shop OK — ${offerIds.length} offers, picking first`);

  // 2. OfferDetails
  const det = await kyte('POST', '/api/v3/flights/shop/offer-details', { offerIds: [offerId] }, transactionId);
  if (det.status !== 200) return { ok: false, step: 'offerDetails', err: det.body };

  // 3. BookFlight
  const book = await kyte(
    'POST',
    `/api/v3/flights/book/${encodeURIComponent(offerId)}`,
    {
      passengers: [
        {
          id: '1', // Jet2/IndiGo/Transavia/Volotea expect '1'. easyJet expects 'P1' (handled in bundle smoke).
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
    },
    transactionId,
  );
  if (book.status !== 200) return { ok: false, step: 'book', err: book.body };
  const bookingId = book.body.id ?? book.body.bookingId ?? book.body.booking?.id;
  const totalAmount = book.body.currentBalance ?? book.body.booking?.currentBalance;
  if (!bookingId) return { ok: false, step: 'book', err: 'no booking id in response' };
  log(`book OK — bookingId, balance=${totalAmount}`);

  // 4. Payment
  const card = CARDS[c.code];
  if (!card) return { ok: false, step: 'payment', err: `no test card mapped for ${c.code}` };
  const pay = await kyte(
    'POST',
    `/api/v3/payment/${encodeURIComponent(bookingId)}`,
    {
      method: 'card',
      amount: totalAmount,
      // Some carriers (Transavia) demand 3DS auth details unless we
      // declare MOTO. Harmless to send for carriers that don't require it.
      transactionType: 'moto',
      creditCardInfo: [
        {
          number: card.number,
          cardholderName: 'Sandbox Tester',
          valid: { month: card.month, year: card.year },
          security: card.security,
          type: card.type,
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
    },
    transactionId,
  );
  if (pay.status !== 200) return { ok: false, step: 'payment', err: pay.body };
  if (pay.body.status !== 'ok') {
    return { ok: false, step: 'payment', err: pay.body.errors || pay.body.status };
  }
  log(`payment OK — status=${pay.body.status}`);

  // 5. Retrieve
  const ret = await kyte(
    'POST',
    `/api/v3/flights/book/retrieve/${encodeURIComponent(bookingId)}`,
    {
      forceRefresh: true,
      requestedInfo: ['PNR', 'passengerDetails', 'ticketInfo', 'itinerary', 'paymentInfo'],
    },
    transactionId,
  );
  if (ret.status !== 200) return { ok: false, step: 'retrieve', err: ret.body };
  const ticketStatus = ret.body.booking?.ticketStatus;
  log(`retrieve OK — ticketStatus=${ticketStatus}`);

  return { ok: ticketStatus === 'ticketed', step: 'done', ticketStatus, totalAmount };
}

const results = [];
for (const c of CARRIERS) {
  console.log(`\n=== ${c.code} ${c.name} ${c.from}-${c.to} ===`);
  try {
    const r = await bookOne(c);
    results.push({ ...c, ...r });
  } catch (e) {
    results.push({ ...c, ok: false, step: 'exception', err: String(e?.message || e) });
  }
}

console.log('\n=== SUMMARY ===');
for (const r of results) {
  const tick = r.ok ? '✓' : '✗';
  const detail = r.ok
    ? `ticketed @${r.totalAmount}`
    : `failed at ${r.step}: ${typeof r.err === 'string' ? r.err.slice(0, 80) : JSON.stringify(r.err).slice(0, 120)}`;
  console.log(`${tick} ${r.code} ${r.name.padEnd(10)} ${r.from}-${r.to}  ${detail}`);
}

const okCount = results.filter((r) => r.ok).length;
console.log(`\n${okCount}/${CARRIERS.length} carriers ticketed in sandbox`);
process.exit(okCount === CARRIERS.length ? 0 : 1);
