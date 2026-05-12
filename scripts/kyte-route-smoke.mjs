#!/usr/bin/env node
/**
 * Kyte HTTP-routes smoke — proves the four /api/flights/kyte/* routes
 * work end-to-end (search → book → payment → retrieve) AND that the
 * payment route persists the booking to `bookings:all` so it appears
 * in /admin.
 *
 * Prerequisites:
 *   - Local dev server running: `npm run dev`  (or set BASE to a deployed URL)
 *   - `.env.local` has KYTE_PROXY_URL + KYTE_API_KEY + KYTE_SANDBOX_BASE_URL
 *
 * Usage:
 *   node scripts/kyte-route-smoke.mjs
 *   BASE=http://localhost:3000 node scripts/kyte-route-smoke.mjs
 *   BASE=https://jetmeaway.co.uk node scripts/kyte-route-smoke.mjs   # only if prod env is wired
 *
 * Exit codes: 0 OK, 1 step failed, 2 prereq missing.
 */

const BASE = process.env.BASE || 'http://localhost:3000';
const CARRIER = process.env.CARRIER || 'LS';
const FROM = process.env.FROM || 'MAN';
const TO = process.env.TO || 'PMI';
const EMAIL = process.env.EMAIL || 'sandbox-test@jetmeaway.co.uk';
// E.164 format, e.g. "+447712345678". Default is Ofcom's reserved test
// number which Twilio rejects (expected) — set PHONE=+44... to actually
// receive an SMS on your phone. Hardcoded UK assumption (3-char country
// code) — for non-UK, edit the slice below.
const PHONE = process.env.PHONE || '+447700900000';
const PHONE_CC = PHONE.slice(0, 3);
const PHONE_NUM = PHONE.slice(3);

const departureDate = (() => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 45);
  return d.toISOString().slice(0, 10);
})();

function log(...a) {
  console.log('[route-smoke]', ...a);
}
function err(...a) {
  console.error('[route-smoke] FAIL', ...a);
}

async function call(path, body) {
  const url = `${BASE}${path}`;
  log(`→ POST ${path}`);
  const t0 = Date.now();
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    err(`network error: ${e.message}`);
    err(`is your dev server running at ${BASE}? Start it with: npm run dev`);
    process.exit(2);
  }
  const latency = Date.now() - t0;
  const text = await res.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { raw: text.slice(0, 500) };
  }
  log(`  ← ${res.status} in ${latency}ms`);
  if (!res.ok) {
    err(`${path} returned ${res.status}:`, JSON.stringify(payload).slice(0, 400));
    process.exit(1);
  }
  return payload;
}

// ───── Step 1: search ─────
log(`carrier=${CARRIER} route=${FROM}-${TO} date=${departureDate}`);
log('--- 1. /api/flights/kyte/search ---');
const search = await call('/api/flights/kyte/search', {
  origin: FROM,
  destination: TO,
  departure: departureDate,
  adults: 1,
  airlines: CARRIER,
});
const { transactionId, offerCount, offers } = search;
if (!transactionId || !offerCount) {
  err('search returned no transactionId or no offers');
  process.exit(1);
}
const [offerId] = Object.keys(offers);
log(`  txId=${transactionId.slice(0, 8)}… offers=${offerCount} picking offerId=${offerId.slice(0, 12)}…`);

// ───── Step 2: book ─────
log('--- 2. /api/flights/kyte/book ---');
const book = await call('/api/flights/kyte/book', {
  transactionId,
  offerId,
  passengers: [
    {
      firstName: 'Sandbox',
      lastName: 'Tester',
      gender: 'male',
      title: 'mr',
      dateOfBirth: '1990-01-15',
      email: EMAIL,
      phone: { countryCode: PHONE_CC, number: PHONE_NUM },
    },
  ],
});
const { bookingId, currentBalance, currency } = book;
log(`  kyteBookingId=${String(bookingId).slice(0, 16)}… amount=${currentBalance} currency=${currency?.code}`);

// ───── Step 3: payment (with tripContext so it persists) ─────
log('--- 3. /api/flights/kyte/payment ---');
const pay = await call('/api/flights/kyte/payment', {
  transactionId,
  bookingId,
  amount: currentBalance,
  card: {
    number: '4539795097006388',
    cardholderName: 'Sandbox Tester',
    expMonth: 10,
    expYear: 30,
    cvv: '747',
    type: 'visa-debit',
    address: {
      addressLines: ['66 Paul Street'],
      city: 'London',
      postalCode: 'EC2A 4NA',
      countryCode: 'GB',
    },
  },
  payer: {
    firstName: 'Sandbox',
    lastName: 'Tester',
    title: 'mr',
    email: EMAIL,
    phone: { countryCode: PHONE_CC, number: PHONE_NUM },
  },
  tripContext: {
    destination: TO,
    departureDate,
    returnDate: null,
    passengerCount: 1,
    title: `Kyte sandbox: ${FROM} → ${TO}`,
  },
});
log(`  payment status=${pay.status}  internalBookingId=${pay.internalBookingId || '(none)'}`);
if (pay.status !== 'ok') {
  err('payment did not return status=ok');
  process.exit(1);
}
if (!pay.internalBookingId) {
  err('payment returned ok but no internalBookingId — KV persistence failed (check server logs)');
  process.exit(1);
}

// ───── Step 4: retrieve ─────
log('--- 4. /api/flights/kyte/retrieve ---');
const ret = await call('/api/flights/kyte/retrieve', {
  transactionId,
  bookingId,
  forceRefresh: true,
});
const ticketStatus = ret.booking?.ticketStatus;
log(`  ticketStatus=${ticketStatus}`);
if (ticketStatus !== 'ticketed') {
  err(`expected ticketStatus='ticketed', got '${ticketStatus}'`);
  process.exit(1);
}

log('');
log('✓ ALL ROUTES OK — booking persisted to KV');
log(`  Visit ${BASE}/admin/bookings to see record ${pay.internalBookingId}`);
