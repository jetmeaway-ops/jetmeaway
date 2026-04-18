#!/usr/bin/env node
/**
 * RateHawk Hotel Dump Sync — scheduled weekly
 *
 * Pulls the full static hotel inventory dump from RateHawk and stores
 * it in Vercel Blob. The live search route enriches API results with
 * images/amenities pulled from this static layer to avoid paying per-
 * request for catalogue-level data.
 *
 * RateHawk exposes the dump as a multi-file S3 download (the API returns
 * pre-signed URLs; files are .jsonl.gz, split by region). This script
 * walks those files, re-uploads to our own Blob store, and writes a
 * manifest so the search route can look up hotel metadata by id.
 *
 * Endpoints used:
 *   POST /hotel/info/dump/          → returns file URLs + metadata
 *   GET  <pre-signed s3 url>        → download gzipped JSONL
 *
 * Usage:
 *   node scripts/ratehawk-dump-sync.mjs          # full sync
 *   node scripts/ratehawk-dump-sync.mjs --dry    # list files only, no upload
 *
 * ENV REQUIRED:
 *   RATEHAWK_KEY_ID, RATEHAWK_API_KEY
 *   BLOB_READ_WRITE_TOKEN   (Vercel Blob write token)
 *
 * Schedule via vercel.json:
 *   { "crons": [{ "path": "/api/ratehawk/cron/dump", "schedule": "0 3 * * 0" }] }
 * ...or run manually / on GitHub Actions weekly.
 *
 * STATUS: scaffold — awaiting sandbox credentials from api@ratehawk.com.
 */

const BASE = process.env.RATEHAWK_BASE_URL || 'https://api.worldota.net/api/b2b/v3';
const KEY_ID = process.env.RATEHAWK_KEY_ID;
const API_KEY = process.env.RATEHAWK_API_KEY;
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const DRY = process.argv.includes('--dry');

if (!KEY_ID || !API_KEY) {
  console.error('❌ RATEHAWK_KEY_ID / RATEHAWK_API_KEY not set — exiting.');
  console.error('   Sandbox credentials pending (see MEMORY.md RateHawk entry).');
  process.exit(1);
}

const auth = Buffer.from(`${KEY_ID}:${API_KEY}`).toString('base64');

async function rhPost(path, body = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`RateHawk ${path} → HTTP ${res.status}`);
  const json = await res.json();
  if (json.status !== 'ok') throw new Error(`RateHawk ${path} → ${JSON.stringify(json.error)}`);
  return json.data;
}

async function main() {
  console.log(`🏨 RateHawk hotel dump sync — ${new Date().toISOString()}`);
  console.log(`   mode: ${DRY ? 'DRY RUN' : 'LIVE'}`);

  // Request current dump metadata. RateHawk returns an array of file URLs,
  // each pointing to a gzipped JSONL on S3. Exact response shape TBC — the
  // sandbox docs will confirm this before we enable the upload branch.
  const dump = await rhPost('/hotel/info/dump/', { language: 'en' });
  const files = Array.isArray(dump?.urls) ? dump.urls : [];

  console.log(`   ${files.length} dump file(s) advertised by RateHawk`);

  if (DRY || files.length === 0) {
    for (const f of files) console.log(`   • ${f}`);
    console.log('✅ dry run complete — no uploads performed.');
    return;
  }

  if (!BLOB_TOKEN) {
    console.error('❌ BLOB_READ_WRITE_TOKEN not set — cannot upload to Vercel Blob.');
    process.exit(1);
  }

  // TODO: once sandbox is live, stream each file → gunzip → re-upload to
  // Blob under `ratehawk/dump/<yyyy-mm-dd>/<filename>`, write a manifest
  // JSON at `ratehawk/dump/latest.json`, and purge dumps older than 30 days.
  console.log('⚠️  Upload path is stubbed — implement once sandbox dump shape is confirmed.');
}

main().catch(err => {
  console.error('❌ sync failed:', err);
  process.exit(1);
});
