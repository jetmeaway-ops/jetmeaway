#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));
for (const p of ['.env.local','../.env.local','../../.env.local','../../../.env.local','../../../../.env.local']) {
  try {
    const raw = readFileSync(resolve(__dirname, p), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
    break;
  } catch {}
}
const [,, hotelId] = process.argv;
if (!hotelId) { console.error('Usage: node scripts/liteapi-details-dump.mjs <hotelId>'); process.exit(1); }
const key = process.env.LITE_API_KEY;
const base = (process.env.LITE_API_BASE || 'https://api.liteapi.travel/v3.0').replace(/\/$/, '');
const res = await fetch(`${base}/data/hotel?hotelId=${hotelId}`, {
  headers: { 'X-API-Key': key, Accept: 'application/json' },
});
if (!res.ok) { console.error(`HTTP ${res.status}: ${await res.text()}`); process.exit(1); }
const j = await res.json();
const h = j.data || j;
const rooms = h.rooms || h.roomTypes || h.hotelRooms || [];
console.log('rooms count:', rooms.length);
console.log('hotel name:', h.name);
for (const r of rooms.slice(0, 20)) {
  const name = r.roomName || r.name;
  const photos = (r.photos || r.images || []);
  const photoCount = photos.length;
  const firstPhoto = photos[0] ? (typeof photos[0] === 'string' ? photos[0] : (photos[0].urlHd || photos[0].url)) : null;
  console.log(JSON.stringify({ name, photoCount, firstPhoto }));
}
