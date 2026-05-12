#!/usr/bin/env node
/**
 * Kyte easyJet bundle smoke — Phase 4 of the LCC integration plan.
 *
 * easyJet (U2) and Ryanair (FR) require an extra `shopBundles` step
 * between OfferDetails and BookFlight. The Shop call returns "base"
 * offers; shopBundles converts those into per-bundle offers (Hand
 * Bag-only / Hold Bag / Flexi) — each with its own offerId. The Book
 * call MUST use the bundle offerId, not the original Shop offerId,
 * otherwise the booking is invalid for easyJet.
 *
 * Flow:
 *   Shop → OfferDetails → shopBundles → Book(bundleOfferId) → Payment → Retrieve
 *
 * Default route LGW-AMS easyJet — proven to return 5 base offers in
 * Phase 0 search smoke.
 *
 * Usage:
 *   node scripts/kyte-bundle-smoke.mjs
 *   CARRIER=U2 FROM=LGW TO=AMS node scripts/kyte-bundle-smoke.mjs
 *
 * Exit codes: 0 OK, 1 non-2xx, 2 missing env, 3 no offers, 4 no bundles, 5 no booking id
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
    if (process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^['"]/, '').replace(/['"]$/, '');
  }
}

loadDotEnv('.env.local');

const required = ['KYTE_PROXY_URL', 'KYTE_API_KEY', 'KYTE_SANDBOX_BASE_URL'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`[bundle-smoke] missing env vars: ${missing.join(', ')}`);
  process.exit(2);
}

const CARRIER = process.env.CARRIER || 'U2';
const FROM = process.env.FROM || 'LGW';
const TO = process.env.TO || 'AMS';

const departureDate = (() => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 45);
  return d.toISOString().slice(0, 10);
})();

const baseUrl = process.env.KYTE_SANDBOX_BASE_URL.replace(/\/+$/, '');
const dispatcher = new ProxyAgent(process.env.KYTE_PROXY_URL);
const transactionId = randomUUID();

function log(...a) {
  console.log('[bundle-smoke]', ...a);
}
function err(...a) {
  console.error('[bundle-smoke] FAIL', ...a);
}

async function kyte(method, path, body) {
  const reqId = randomUUID();
  const t0 = Date.now();
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
  const ms = Date.now() - t0;
  const text = await res.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { raw: text.slice(0, 500) };
  }
  log(`${method} ${path} -> ${res.status} (${ms}ms) req=${reqId.slice(0, 8)}`);
  if (!res.ok) {
    err('non-2xx:', JSON.stringify(payload).slice(0, 400));
    process.exit(1);
  }
  return payload;
}

log(`tx=${transactionId.slice(0, 8)} carrier=${CARRIER} route=${FROM}-${TO} date=${departureDate}`);

// 1. Shop
log('--- 1. ShopFlights ---');
const shop = await kyte('POST', `/api/v3/flights/shop?airlines=${CARRIER}`, {
  journeys: [{ departureAirport: FROM, arrivalAirport: TO, date: { main: departureDate } }],
  cabinType: 'economy',
  nonStopFlight: true,
  exactMatch: true,
  flexibility: 'lowest',
  passengers: [{ age: 30 }],
});
const baseOffers = shop.offers ? Object.keys(shop.offers) : [];
if (baseOffers.length === 0) {
  err('no base offers from Shop');
  process.exit(3);
}
const baseOfferId = baseOffers[0];
log(`base offerId=${baseOfferId.slice(0, 16)}…  baseOfferCount=${baseOffers.length}`);

// 2. OfferDetails (optional but matches Postman flow)
log('--- 2. OfferDetails ---');
await kyte('POST', '/api/v3/flights/shop/offer-details', { offerIds: [baseOfferId] });

// 3. shopBundles — the new step
log('--- 3. shopBundles (NEW for U2/FR) ---');
const bundles = await kyte('POST', '/api/v3/flights/shop/bundles', { offerIds: [baseOfferId] });
log('bundles top-level keys:', Object.keys(bundles || {}).join(','));
const bundleOffers = bundles.offers ? Object.entries(bundles.offers) : [];
if (bundleOffers.length === 0) {
  err('shopBundles returned 0 bundle offers');
  process.exit(4);
}
log(`bundle offers returned: ${bundleOffers.length}`);
for (const [bid, bRaw] of bundleOffers.slice(0, 5)) {
  const b = bRaw && typeof bRaw === 'object' ? bRaw : {};
  log(
    `  bundleId=${bid.slice(0, 16)}…  totalPrice=${b.totalPrice ?? '?'}  fares=${
      Array.isArray(b.fares) ? b.fares.length : '?'
    }`,
  );
}

// Pick the cheapest bundle — basic/Hand-bag fares typically don't require
// mandatory seat selection. Expensive bundles ("Extra") include seat as
// part of the fare, which means seat selection becomes mandatory before
// Payment (TODO: handle that path properly with BookAncillaries).
const sortedBundles = [...bundleOffers].sort(
  (a, b) => (a[1]?.totalPrice ?? Infinity) - (b[1]?.totalPrice ?? Infinity),
);
const [bundleOfferId] = sortedBundles[0];
log(`picking cheapest bundle offerId=${bundleOfferId.slice(0, 16)}… price=${sortedBundles[0][1]?.totalPrice}`);

// 4. BookFlight with the BUNDLE offerId (not the base)
log('--- 4. BookFlight (bundle offerId) ---');
const book = await kyte('POST', `/api/v3/flights/book/${encodeURIComponent(bundleOfferId)}`, {
  passengers: [
    {
      id: 'P1',
      firstName: 'Bundle',
      lastName: 'Tester',
      gender: 'female',
      title: 'ms',
      dateOfBirth: '1992-03-20',
      contactInformation: {
        email: 'sandbox-test@jetmeaway.co.uk',
        phone: [{ countryCode: '+44', number: '7700900000', type: 'Mobile' }],
      },
    },
  ],
});

const bookingId = book.id ?? book.bookingId ?? book.booking?.id;
const totalAmount = book.currentBalance ?? book.booking?.currentBalance;
if (!bookingId) {
  err('BookFlight response missing booking id. Keys:', Object.keys(book || {}));
  process.exit(5);
}
log(`bookingId=${String(bookingId).slice(0, 16)}…  currentBalance=${totalAmount}`);

// 4b. shopAncillaries (post-book — easyJet bundles need seat selection)
log('--- 4b. shopAncillaries (post-book, find seats) ---');
const shopAnc = await kyte(
  'POST',
  `/api/v3/flights/shop/ancillaries/${encodeURIComponent(bookingId)}`,
  { requestedTypes: ['seat', 'bag', 'meal'] },
);
log('shopAnc top-level keys:', Object.keys(shopAnc || {}).slice(0, 10).join(','));
if (shopAnc.seatMap) {
  log('seatMap shape:', JSON.stringify(shopAnc.seatMap, null, 2).slice(0, 1500));
}

// seatMap structure observed: { "<segmentId>": { seatCategories, cabins: [{ rows: { "1": [{number, available, ...}] } }] } }
// One pick per segment (mandatory seat selection across all segments).
function pickSeatsPerSegment(seatMap) {
  const picks = [];
  for (const [segmentId, segData] of Object.entries(seatMap)) {
    const cabins = segData?.cabins ?? [];
    let chosen = null;
    for (const cabin of cabins) {
      const rows = cabin?.rows ?? {};
      for (const rowNum of Object.keys(rows)) {
        for (const s of rows[rowNum]) {
          if (!s) continue; // null = aisle gap, skip
          if (s.available && !s.isEmergencyExit) {
            chosen = s;
            break;
          }
        }
        if (chosen) break;
      }
      if (chosen) break;
    }
    if (chosen) picks.push({ segmentId, seatNumber: chosen.number, category: chosen.category });
  }
  return picks;
}

const picks = shopAnc.seatMap ? pickSeatsPerSegment(shopAnc.seatMap) : [];
log(`picked ${picks.length} seats (one per segment)`);
for (const p of picks) {
  log(`  seg=${p.segmentId} seat=${p.seatNumber} cat=${p.category}`);
}
if (picks.length === 0) {
  err('seatMap did not yield any picks — inspect logged seatMap shape above');
  process.exit(6);
}

// Try seat id = the seat number ("1A"). If Kyte expects a different
// shape (e.g. composite "<segmentId>-<seatNumber>") the BookAncillaries
// call will tell us via the error response.
const seat = {
  id: picks[0].seatNumber,
  passengerId: 'P1',
  flightSegments: [picks[0].segmentId],
};
log('--- 4c. bookAncillaries (add seat) ---');
const bookAnc = await kyte(
  'POST',
  `/api/v3/flights/book/ancillaries/${encodeURIComponent(bookingId)}`,
  {
    passengers: [
      {
        id: seat.passengerId || 'P1',
        ancillaries: [
          {
            id: seat.id,
            type: 'seat',
            action: 'add',
            quantity: 1,
            flightSegments: seat.flightSegments || [],
          },
        ],
      },
    ],
  },
);
const newBalance = bookAnc.currentBalance ?? bookAnc.booking?.currentBalance ?? totalAmount;
log(`seat added — new currentBalance=${newBalance}`);

// 5. Payment
log('--- 5. Payment ---');
const pay = await kyte('POST', `/api/v3/payment/${encodeURIComponent(bookingId)}`, {
  method: 'card',
  amount: newBalance,
  transactionType: 'moto',
  codegen: true,
  creditCardInfo: [
    {
      // easyJet (U2) sandbox test card — per integration_guide.html#payment
      number: '4444333322221111',
      cardholderName: 'Bundle Tester',
      valid: { month: 3, year: 30 },
      security: '737',
      type: 'visa',
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
      firstName: 'Bundle',
      lastName: 'Tester',
      title: 'ms',
      contactInformation: {
        email: 'sandbox-test@jetmeaway.co.uk',
        phone: [{ countryCode: '+44', number: '7700900000', type: 'Home' }],
      },
    },
  ],
});
log(`payment status=${pay.status ?? '?'}`);
log('payment errors:', JSON.stringify(pay.errors || []).slice(0, 400));
log('payment warnings:', JSON.stringify(pay.warnings || []).slice(0, 400));
log('payment possibleActions:', JSON.stringify(pay.possibleActions || []).slice(0, 400));
log('payment actionList:', JSON.stringify(pay.actionList || []).slice(0, 400));

// 6. Retrieve
log('--- 6. RetrieveBooking ---');
const ret = await kyte('POST', `/api/v3/flights/book/retrieve/${encodeURIComponent(bookingId)}`, {
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
});
const ticketStatus = ret.booking?.ticketStatus ?? ret.ticketStatus;
log(`ticketStatus=${ticketStatus ?? 'unknown'}`);

if (ticketStatus !== 'ticketed') {
  err(`expected ticketStatus='ticketed', got '${ticketStatus}'`);
  process.exit(1);
}

log('');
log('✓ Phase 4 acceptance: bundle booking ticketed for', CARRIER, FROM + '-' + TO);
