#!/usr/bin/env node
/**
 * Kyte Ryanair OTA smoke — Phase 5 of the LCC integration plan.
 *
 * Flow (per docs.sandbox.gokyte.com Ryanair OTA spec):
 *   ShopFlights → OfferDetails → ShopAncillaries(offerId)
 *    → BookFlight(with traveller address)
 *    → ShopAncillaries(bookingId)
 *    → BookAncillaries(seat)
 *    → CommitBooking (returns x-session-token header)
 *    → [iframe skipped in sandbox smoke — UI concern]
 *    → Payment (transactionType=moto, codegen=true)
 *    → RetrieveBooking
 *
 * Default route BUD-DUB (FR sandbox-friendly per Google Sheet).
 * Test card: 5210000010001001 mastercard 12/30 CVV 747 (per integration
 * guide #payment).
 *
 * Skips iframe by design — sandbox accepts Payment without iframe
 * confirmation per the Postman OTA flow. Production requires the iframe
 * round-trip (handled in /flights UI, Phase 5b).
 *
 * Usage:
 *   node scripts/kyte-ryanair-smoke.mjs
 *   FROM=ARN TO=STN node scripts/kyte-ryanair-smoke.mjs
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
  console.error(`[ryanair-smoke] missing env vars: ${missing.join(', ')}`);
  process.exit(2);
}

const FROM = process.env.FROM || 'BUD';
const TO = process.env.TO || 'DUB';
const baseUrl = process.env.KYTE_SANDBOX_BASE_URL.replace(/\/+$/, '');
const dispatcher = new ProxyAgent(process.env.KYTE_PROXY_URL);
const transactionId = randomUUID();

const departureDate = (() => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 45);
  return d.toISOString().slice(0, 10);
})();

function log(...a) {
  console.log('[ryanair-smoke]', ...a);
}
function err(...a) {
  console.error('[ryanair-smoke] FAIL', ...a);
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
  try { payload = JSON.parse(text); } catch { payload = { raw: text.slice(0, 400) }; }
  const sessionToken = res.headers.get('x-session-token');
  log(`${method} ${path.slice(0, 70)} -> ${res.status} (${ms}ms)${sessionToken ? ` session=${sessionToken.slice(0, 16)}…` : ''}`);
  if (!res.ok) {
    err('non-2xx:', JSON.stringify(payload).slice(0, 500));
    process.exit(1);
  }
  return { body: payload, sessionToken };
}

log(`tx=${transactionId.slice(0, 8)} carrier=FR route=${FROM}-${TO} date=${departureDate}`);

// 1. Shop
log('--- 1. ShopFlights ---');
const shop = await kyte('POST', '/api/v3/flights/shop?airlines=FR', {
  journeys: [{ departureAirport: FROM, arrivalAirport: TO, date: { main: departureDate } }],
  cabinType: 'economy',
  nonStopFlight: true,
  exactMatch: true,
  flexibility: 'lowest',
  passengers: [{ age: 30 }],
});
const offers = shop.body.offers ? Object.keys(shop.body.offers) : [];
if (offers.length === 0) {
  err('no FR offers in sandbox for', FROM + '-' + TO);
  process.exit(3);
}
const offerId = offers[0];
log(`offers=${offers.length} picking offerId=${offerId.slice(0, 16)}…`);

// 2. OfferDetails
log('--- 2. OfferDetails ---');
await kyte('POST', '/api/v3/flights/shop/offer-details', { offerIds: [offerId] });

// 3. ShopAncillaries by offerId (Ryanair OTA pre-book step)
log('--- 3. ShopAncillaries(offerId) ---');
await kyte('POST', `/api/v3/flights/shop/ancillaries/${encodeURIComponent(offerId)}`, {
  requestedTypes: ['bag', 'seat'],
});

// 4. BookFlight with traveller address (Ryanair OTA requirement)
log('--- 4. BookFlight (with address) ---');
const book = await kyte('POST', `/api/v3/flights/book/${encodeURIComponent(offerId)}`, {
  passengers: [
    {
      id: '1',
      firstName: 'Ryanair',
      lastName: 'Tester',
      gender: 'male',
      title: 'mr',
      dateOfBirth: '1988-05-12',
      contactInformation: {
        email: 'sandbox-test@jetmeaway.co.uk',
        phone: [{ countryCode: '+44', number: '7700900000', type: 'Mobile' }],
      },
    },
  ],
  address: {
    addressLines: ['66 Paul Street'],
    city: 'London',
    postalCode: 'EC2A 4NA',
    countryCode: 'GB',
  },
});
const bookingId = book.body.id ?? book.body.bookingId ?? book.body.booking?.id;
const balanceAfterBook = book.body.currentBalance ?? book.body.booking?.currentBalance;
if (!bookingId) {
  err('no booking id in response. keys:', Object.keys(book.body || {}));
  process.exit(4);
}
log(`bookingId=${String(bookingId).slice(0, 20)}…  balance=${balanceAfterBook}`);

// 5. ShopAncillaries by bookingId (for seatMap)
log('--- 5. ShopAncillaries(bookingId) ---');
const shopAnc = await kyte(
  'POST',
  `/api/v3/flights/shop/ancillaries/${encodeURIComponent(bookingId)}`,
  { requestedTypes: ['seat', 'bag'] },
);
log('shopAnc keys:', Object.keys(shopAnc.body || {}).slice(0, 10).join(','));

// 6. BookAncillaries (seat — same seatMap parser as easyJet)
let totalAmount = balanceAfterBook;
const seatMap = shopAnc.body.seatMap || {};
const segIds = Object.keys(seatMap);
if (segIds.length > 0) {
  let seatPick = null;
  for (const segId of segIds) {
    const cabins = seatMap[segId]?.cabins ?? [];
    let chosen = null;
    for (const cabin of cabins) {
      const rows = cabin?.rows ?? {};
      for (const rowNum of Object.keys(rows)) {
        for (const s of rows[rowNum]) {
          if (!s) continue;
          if (s.available && !s.isEmergencyExit) { chosen = s; break; }
        }
        if (chosen) break;
      }
      if (chosen) break;
    }
    if (chosen) { seatPick = { segId, seat: chosen }; break; }
  }
  if (seatPick) {
    log(`--- 6. BookAncillaries (seat ${seatPick.seat.number} on ${seatPick.segId}) ---`);
    const bookAnc = await kyte(
      'POST',
      `/api/v3/flights/book/ancillaries/${encodeURIComponent(bookingId)}`,
      {
        passengers: [
          {
            id: '1',
            ancillaries: [
              {
                id: seatPick.seat.number,
                type: 'seat',
                action: 'add',
                quantity: 1,
                flightSegments: [seatPick.segId],
              },
            ],
          },
        ],
      },
    );
    totalAmount = bookAnc.body.currentBalance ?? bookAnc.body.booking?.currentBalance ?? totalAmount;
    log(`seat added — balance=${totalAmount}`);
  } else {
    log('--- 6. BookAncillaries skipped (no eligible seats found) ---');
  }
} else {
  log('--- 6. BookAncillaries skipped (seatMap empty) ---');
}

// 7. CommitBooking — NEW step for Ryanair OTA
log('--- 7. CommitBooking ---');
const commit = await kyte('POST', `/api/v3/flights/book/commit/${encodeURIComponent(bookingId)}`, {});
const sessionToken = commit.sessionToken;
log(`commit ticketStatus=${commit.body.booking?.ticketStatus ?? 'unknown'} balance=${commit.body.booking?.currentBalance ?? 'unknown'}`);
log(`x-session-token: ${sessionToken ? sessionToken.slice(0, 24) + '…' : 'MISSING'}`);
if (!sessionToken) {
  log('WARN: no x-session-token header. Production will need this for the iframe. Sandbox may still let Payment through.');
}

// 8. Payment (with OTA-specific fields)
log('--- 8. Payment (transactionType=moto, codegen=true) ---');
const pay = await kyte('POST', `/api/v3/payment/${encodeURIComponent(bookingId)}`, {
  method: 'card',
  amount: totalAmount,
  transactionType: 'moto',
  codegen: true,
  creditCardInfo: [
    {
      number: '5210000010001001',
      cardholderName: 'Ryanair Tester',
      valid: { month: 12, year: 30 },
      security: '747',
      type: 'mastercard',
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
      firstName: 'Ryanair',
      lastName: 'Tester',
      title: 'mr',
      contactInformation: {
        email: 'sandbox-test@jetmeaway.co.uk',
        phone: [{ countryCode: '+44', number: '7700900000', type: 'Home' }],
      },
    },
  ],
});
log(`payment status=${pay.body.status ?? '?'}`);
if (pay.body.errors?.length) {
  log('payment errors:', JSON.stringify(pay.body.errors).slice(0, 400));
}

// 9. Retrieve
log('--- 9. RetrieveBooking ---');
const ret = await kyte('POST', `/api/v3/flights/book/retrieve/${encodeURIComponent(bookingId)}`, {
  forceRefresh: true,
  requestedInfo: ['PNR', 'passengerDetails', 'ticketInfo', 'itinerary', 'paymentInfo'],
});
const ticketStatus = ret.body.booking?.ticketStatus;
log(`ticketStatus=${ticketStatus}`);

if (ticketStatus === 'ticketed') {
  log('');
  log('✓ Phase 5 acceptance: Ryanair OTA sandbox booking ticketed end-to-end (no iframe).');
} else {
  err(`expected ticketStatus='ticketed', got '${ticketStatus}'`);
  process.exit(1);
}
