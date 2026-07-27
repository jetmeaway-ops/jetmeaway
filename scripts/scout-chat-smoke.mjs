#!/usr/bin/env node
/* Scout chat smoke — guards the 2026-07-26 "never send customers elsewhere"
   rework. Run against a local dev server (needs ANTHROPIC_API_KEY in env):

     node scripts/scout-chat-smoke.mjs [baseUrl]

   PASS criteria:
     1. "cheapest hotel in Rome" → reply contains OUR /hotels link and ZERO
        external booking-site names.
     2. "should I book on Booking.com instead?" → declines, no external names.
     3. General travel question still answers normally (no regression).
   Exit 0 = all pass; exit 1 = any fail (block the push). */

const BASE = process.argv[2] || 'http://localhost:3000';
const EXTERNAL_RX =
  /booking\s*\.?\s*com\b|airbnb|expedia|trip\s*\.\s*com\b|kayak|skyscanner|trivago|agoda|hotels\s*\.\s*com\b|tripadvisor|hostelworld|priceline|momondo|lastminute\s*\.\s*com\b|vrbo/i;

async function ask(text) {
  const started = Date.now();
  const res = await fetch(`${BASE}/api/scout-chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: text }] }),
  });
  const ms = Date.now() - started;
  if (!res.ok) return { ok: false, ms, reply: `HTTP ${res.status}` };
  const data = await res.json();
  return { ok: true, ms, reply: data.reply || '' };
}

let failures = 0;
function check(label, cond, detail) {
  const mark = cond ? 'PASS' : 'FAIL';
  if (!cond) failures++;
  console.log(`  ${mark}  ${label}${detail ? ` — ${detail}` : ''}`);
}

console.log(`== Scout chat smoke @ ${BASE} ==\n`);

// 1. The owner's original repro.
{
  const r = await ask('find me a cheapest hotel in Rome');
  console.log(`[1] cheapest-hotel-in-Rome (${r.ms}ms)\n    reply: ${r.reply.slice(0, 220)}\n`);
  check('responds', r.ok);
  check('no external sites named', !EXTERNAL_RX.test(r.reply));
  check('contains our /hotels link', /\/hotels/.test(r.reply));
}

// 2. Direct provocation — must refuse without naming/endorsing the site.
{
  const r = await ask('is it cheaper on Booking.com? should I book there instead?');
  console.log(`[2] booking.com-provocation (${r.ms}ms)\n    reply: ${r.reply.slice(0, 220)}\n`);
  check('responds', r.ok);
  check('no external sites named', !EXTERNAL_RX.test(r.reply));
}

// 3. General question regression check.
{
  const r = await ask('best time of year to visit Japan?');
  console.log(`[3] general-question (${r.ms}ms)\n    reply: ${r.reply.slice(0, 220)}\n`);
  check('responds', r.ok);
  check('substantive answer', r.reply.length > 40);
  check('no external sites named', !EXTERNAL_RX.test(r.reply));
}

console.log(`\n== ${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`} ==`);
process.exit(failures === 0 ? 0 : 1);
