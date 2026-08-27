#!/usr/bin/env node
/**
 * Kyte LCC Certification runner — FULL flow, direct to sandbox via Fixie.
 *
 *   Shop → OfferDetails → Book → Payment → Retrieve, per carrier.
 *
 * Runs entirely LOCAL through the Fixie proxy in .env.local (whitelisted IP).
 * NO dev server, NO deploy, NO production, NO customer exposure. Produces real
 * sandbox Booking IDs for column E of Kyte's "Certification - LCC" sheet.
 *
 * Passenger IDs are echoed from the offer (offer.passengers[].id) — carrier
 * specific (easyJet=P1, Jet2=1). The same IDs flow into the payment payload.
 *
 * Base bookings (1 adult, simple routes) first to prove each carrier end-to-end;
 * multi-pax + ancillaries + exact fare classes are the next refinement layer.
 *
 *   node scripts/kyte-cert-bookings.mjs            # all carriers
 *   node scripts/kyte-cert-bookings.mjs U2         # one carrier code
 *
 * Output: scripts/cert-results.json
 */
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { fetch, ProxyAgent } from 'undici';

function loadDotEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^['"]/, '').replace(/['"]$/, '');
  }
}
loadDotEnv('.env.local');
for (const k of ['KYTE_PROXY_URL', 'KYTE_API_KEY', 'KYTE_SANDBOX_BASE_URL']) {
  if (!process.env[k]) { console.error(`missing env ${k}`); process.exit(2); }
}

const FILTER = process.argv[2];
const base = process.env.KYTE_SANDBOX_BASE_URL.replace(/\/+$/, '');
const dispatcher = new ProxyAgent(process.env.KYTE_PROXY_URL);
const depart = new Date(Date.now() + 45 * 864e5).toISOString().slice(0, 10);
const ret = new Date(Date.now() + 52 * 864e5).toISOString().slice(0, 10);

// Carrier code → simple proving route (from Kyte's sheet where known).
// Ryanair (FR) is OTA: needs bookAncillaries→commit→iframe before payment, and
// is currently blocked by the 403 at iframe-commit — book-only here.
const CASES = [
  { name: 'Jet2 base',      carrier: 'LS', from: 'MAN', to: 'PMI', rt: false },
  { name: 'easyJet base',   carrier: 'U2', from: 'LGW', to: 'AMS', rt: true  },
  { name: 'Wizzair base',   carrier: 'W6', from: 'LTN', to: 'BUD', rt: false },
  { name: 'Indigo base',    carrier: '6E', from: 'DEL', to: 'BOM', rt: false },
  { name: 'Transavia base', carrier: 'HV', from: 'AMS', to: 'BCN', rt: false },
  { name: 'Volotea base',   carrier: 'V7', from: 'NTE', to: 'VCE', rt: false },
  { name: 'Ryanair (book-only, OTA 403 at commit)', carrier: 'FR', from: 'STN', to: 'DUB', rt: false, bookOnly: true },
];

const CARD = {
  number: '4539795097006388', cardholderName: 'Sandbox Tester',
  valid: { month: 10, year: 30 }, security: '747', type: 'visa-debit', isCorporate: false,
  address: { addressLines: ['66 Paul Street'], city: 'London', postalCode: 'EC2A 4NA', countryCode: 'GB' },
};
const PAX = {
  firstName: 'Sandbox', lastName: 'Tester', gender: 'male', title: 'mr', dateOfBirth: '1990-01-15',
  contactInformation: { email: 'cert@jetmeaway.co.uk', phone: [{ countryCode: '+44', number: '7700900077', type: 'Mobile' }] },
};

async function kyte(tx, method, path, body) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'x-api-key': process.env.KYTE_API_KEY, 'content-type': 'application/json', 'x-request-id': randomUUID(), 'x-transaction-id': tx },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    dispatcher,
  });
  const text = await res.text();
  let p; try { p = JSON.parse(text); } catch { p = { raw: text.slice(0, 200) }; }
  return { status: res.status, p };
}

async function runCase(tc) {
  const tx = randomUUID();
  const r = { name: tc.name, carrier: tc.carrier, route: `${tc.from}-${tc.to}` };
  try {
    const journeys = [{ departureAirport: tc.from, arrivalAirport: tc.to, date: { main: depart } }];
    if (tc.rt) journeys.push({ departureAirport: tc.to, arrivalAirport: tc.from, date: { main: ret } });
    const shop = await kyte(tx, 'POST', `/api/v3/flights/shop?airlines=${tc.carrier}`, {
      journeys, cabinType: 'economy', nonStopFlight: true, exactMatch: true, flexibility: 'lowest', passengers: [{ age: 30 }],
    });
    if (shop.status !== 200) throw new Error(`shop ${shop.status}: ${JSON.stringify(shop.p).slice(0, 150)}`);
    const offers = shop.p.offers ? Object.entries(shop.p.offers) : [];
    if (!offers.length) throw new Error(`no offers (route may be empty in sandbox)`);
    const [offerId, offer] = offers[0];
    const paxIds = (offer.passengers || []).map((o) => o.id).filter(Boolean);
    const id0 = paxIds[0] || '1';

    await kyte(tx, 'POST', '/api/v3/flights/shop/offer-details', { offerIds: [offerId] });

    const book = await kyte(tx, 'POST', `/api/v3/flights/book/${encodeURIComponent(offerId)}`, {
      passengers: (paxIds.length ? paxIds : ['1']).map((id) => ({ id, ...PAX })),
      address: { addressLines: ['66 Paul Street'], city: 'London', postalCode: 'EC2A 4NA', countryCode: 'GB' },
    });
    const bookingId = book.p.id ?? book.p.bookingId ?? book.p.booking?.id;
    if (book.status !== 200 || !bookingId) throw new Error(`book ${book.status}: ${JSON.stringify(book.p.errors || book.p).slice(0, 180)}`);
    r.bookingId = bookingId;
    const amount = book.p.currentBalance ?? book.p.booking?.currentBalance ?? book.p.totalAmount;

    if (tc.bookOnly) { r.ok = true; r.ticketStatus = 'booked-only (OTA commit/iframe pending — 403)'; return r; }

    const pay = await kyte(tx, 'POST', `/api/v3/payment/${encodeURIComponent(bookingId)}`, {
      method: 'card', amount,
      transactionType: 'moto', // bypasses 3DS in sandbox (Transavia); no-op elsewhere
      creditCardInfo: [{ ...CARD, owner: id0 }],
      payerInformation: [{ id: id0, firstName: PAX.firstName, lastName: PAX.lastName, title: PAX.title, contactInformation: PAX.contactInformation }],
    });
    if (pay.p.status !== 'ok') { r.ok = false; r.bookingId = bookingId; r.error = `payment(${pay.p.status ?? '?'}): ${JSON.stringify(pay.p.errors ?? pay.p).slice(0, 160)}`; return r; }

    const retr = await kyte(tx, 'POST', `/api/v3/flights/book/retrieve/${encodeURIComponent(bookingId)}`, { forceRefresh: true, requestedInfo: ['PNR', 'ticketInfo'] });
    r.ticketStatus = retr.p.booking?.ticketStatus ?? 'unknown';
    r.pnr = retr.p.booking?.pnr ?? null;
    r.ok = r.ticketStatus === 'ticketed';
  } catch (e) { r.ok = false; r.error = e.message; }
  return r;
}

const cases = FILTER ? CASES.filter((c) => c.carrier === FILTER || c.name.includes(FILTER)) : CASES;
const results = [];
for (const tc of cases) {
  process.stdout.write(`\n=== ${tc.name} (${tc.carrier} ${tc.from}-${tc.to}) ===\n`);
  const r = await runCase(tc);
  console.log(r.ok ? `  ✓ ${r.ticketStatus || 'ok'}  bookingId=${r.bookingId}` : `  ✗ ${r.error}${r.bookingId ? `  (booked: ${r.bookingId})` : ''}`);
  results.push(r);
}
writeFileSync('scripts/cert-results.json', JSON.stringify(results, null, 2));
const ok = results.filter((r) => r.ok).length;
console.log(`\n=== ${ok}/${results.length} fully ticketed ===`);
for (const r of results) console.log(`  ${r.ok ? '✓' : '✗'} ${r.name.padEnd(40)} ${r.bookingId || ''} ${r.ok ? '' : '— ' + (r.error || '').slice(0, 90)}`);
