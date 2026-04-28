#!/usr/bin/env node
/**
 * One-off Trustpilot review broadcast via Twilio.
 *
 * Usage:
 *   node scripts/broadcast-trustpilot.mjs --test      # sends to testNumber only
 *   node scripts/broadcast-trustpilot.mjs --all       # sends to full contact list (skips testNumber to avoid dupe)
 *   node scripts/broadcast-trustpilot.mjs --dry-run   # prints what would send, no API calls
 *
 * Reads Twilio creds from .env.local (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
 * TWILIO_FROM, TWILIO_SENDER_ID). Sender ID "JetMeAway" is used for display
 * on UK destinations (alphanumeric IDs aren't replyable).
 *
 * Reads contacts from scripts/broadcast-contacts.local.json (gitignored — PII).
 * A scrubbed template lives at scripts/broadcast-contacts.example.json.
 *
 * Rate-limited to 1 send every 500ms to stay well under Twilio's 1 msg/sec
 * default API concurrency limit.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

// --- Load .env.local manually (no extra deps) -------------------------
function loadEnvLocal() {
  const envPath = path.join(REPO_ROOT, '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('.env.local not found at', envPath);
    process.exit(1);
  }
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadEnvLocal();

const SID = process.env.TWILIO_ACCOUNT_SID;
const TOKEN = process.env.TWILIO_AUTH_TOKEN;
const FROM = process.env.TWILIO_FROM;
const SENDER_ID = process.env.TWILIO_SENDER_ID || '';

if (!SID || !TOKEN || !FROM) {
  console.error('Missing Twilio env vars.');
  process.exit(1);
}

// --- Load contacts from gitignored JSON -------------------------------
const contactsPath = path.join(__dirname, 'broadcast-contacts.local.json');
if (!fs.existsSync(contactsPath)) {
  console.error(`Contacts file not found: ${contactsPath}`);
  console.error('Copy scripts/broadcast-contacts.example.json to broadcast-contacts.local.json and fill in real numbers.');
  process.exit(1);
}
const contactsData = JSON.parse(fs.readFileSync(contactsPath, 'utf8'));
const TEST_NUMBER = contactsData.testNumber;
const CONTACTS = contactsData.contacts;

// --- The broadcast message --------------------------------------------
const MESSAGE = [
  'Thanks for scouting with JetMeAway! 🌍',
  '',
  "We're on a mission to make travel faster and more personalised. Could you help us grow by leaving an honest review on Trustpilot?",
  '',
  '⭐ https://uk.trustpilot.com/evaluate/jetmeaway.co.uk',
  '🌍 jetmeaway.co.uk',
  '📞 0800 652 6699 (free from UK)',
].join('\n');

// --- Arg parsing -------------------------------------------------------
const args = new Set(process.argv.slice(2));
const isTest = args.has('--test');
const isAll = args.has('--all');
const isDry = args.has('--dry-run');

if (!isTest && !isAll && !isDry) {
  console.error('Specify --test, --all, or --dry-run');
  process.exit(1);
}

const recipients = isTest
  ? [['Test Recipient', TEST_NUMBER]]
  // Skip the test number on --all so the tester doesn't get a duplicate SMS
  : CONTACTS.filter(([, phone]) => phone !== TEST_NUMBER);

// --- Send helper -------------------------------------------------------
async function sendSms(to, body) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`;
  const form = new URLSearchParams();
  form.append('To', to);
  // Alphanumeric sender ID for UK destinations
  form.append('From', to.startsWith('+1') ? FROM : (SENDER_ID || FROM));
  form.append('Body', body);

  const auth = Buffer.from(`${SID}:${TOKEN}`).toString('base64');
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, sid: json.sid, error: json.message };
}

// --- Main --------------------------------------------------------------
function mask(phone) {
  return phone.slice(0, 5) + '*****' + phone.slice(-3);
}

console.log(`\n=== JetMeAway Trustpilot Broadcast ===`);
console.log(`Mode: ${isTest ? 'TEST' : isAll ? 'ALL' : 'DRY-RUN'}`);
console.log(`Recipients: ${recipients.length}`);
console.log(`Sender: ${SENDER_ID || FROM}`);
console.log(`Message length: ${MESSAGE.length} chars\n`);

if (isDry) {
  for (const [name, phone] of recipients) {
    console.log(`  [DRY] ${name.padEnd(28)} → ${mask(phone)}`);
  }
  console.log(`\n${recipients.length} sends simulated.`);
  process.exit(0);
}

let sent = 0, failed = 0;
for (const [name, phone] of recipients) {
  try {
    const r = await sendSms(phone, MESSAGE);
    if (r.ok) {
      console.log(`  ✓ ${name.padEnd(28)} → ${mask(phone)}  [${r.sid}]`);
      sent++;
    } else {
      console.log(`  ✗ ${name.padEnd(28)} → ${mask(phone)}  ${r.status} ${r.error || ''}`);
      failed++;
    }
  } catch (err) {
    console.log(`  ✗ ${name.padEnd(28)} → ${mask(phone)}  ERR ${err?.message || err}`);
    failed++;
  }
  // Throttle: 500ms between sends
  if (recipients.length > 1) await new Promise(r => setTimeout(r, 500));
}

console.log(`\nDone. ${sent} sent, ${failed} failed.`);
