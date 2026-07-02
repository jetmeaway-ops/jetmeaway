/**
 * build-hotel-tier-data.mjs — blog redo helper (2026-07-02)
 *
 * Reads a saved /api/hotels response (scratch/<city>-hotels-api.json) and a
 * list of chosen LiteAPI ids per tier, then prints verified per-hotel data
 * (name, stars, reviews, from-price, thumbnail, deep link) ready to paste
 * into a blog post. Fails loudly if an id is missing, outside the city's
 * coordinate box, or a same-building duplicate of another pick.
 *
 * Usage: node scripts/build-hotel-tier-data.mjs scratch/vegas-hotels-api.json vegas-tiers.json
 * where vegas-tiers.json = { "box": [latMin, latMax, lngMin, lngMax],
 *                            "city": "Las Vegas",
 *                            "tiers": { "mid": ["la_x", ...], "budget": [...] } }
 */
import fs from 'node:fs';

const [, , apiFile, tiersFile] = process.argv;
const api = JSON.parse(fs.readFileSync(apiFile, 'utf8'));
const cfg = JSON.parse(fs.readFileSync(tiersFile, 'utf8'));
const [latMin, latMax, lngMin, lngMax] = cfg.box;

const byId = new Map(api.hotels.map((h) => [h.id, h]));
const seenCoords = [];
let failed = false;

for (const [tier, ids] of Object.entries(cfg.tiers)) {
  console.log(`\n===== ${tier.toUpperCase()} (${ids.length}) =====`);
  for (const id of ids) {
    const h = byId.get(id);
    if (!h) { console.log(`!! MISSING FROM API: ${id}`); failed = true; continue; }
    if (h.lat < latMin || h.lat > latMax || h.lng < lngMin || h.lng > lngMax) {
      console.log(`!! OUTSIDE CITY BOX (wrong city?): ${id} ${h.name} @ ${h.lat},${h.lng}`);
      failed = true;
      continue;
    }
    // Same-building duplicate check: two picks within ~60m of each other.
    const dup = seenCoords.find(
      (s) => Math.abs(s.lat - h.lat) < 0.0006 && Math.abs(s.lng - h.lng) < 0.0006,
    );
    if (dup) {
      console.log(`!! DUPLICATE BUILDING: ${h.name} (${id}) ~same location as ${dup.name} (${dup.id})`);
      failed = true;
      continue;
    }
    seenCoords.push({ id, name: h.name, lat: h.lat, lng: h.lng });
    console.log(JSON.stringify({
      id: h.id,
      name: h.name,
      stars: h.stars,
      reviews: h.reviewCount,
      score: h.reviewScore,
      fromPerNight: Math.round(h.pricePerNight),
      thumbnail: h.thumbnail,
      deepLink: `/hotels/${h.id}?city=${encodeURIComponent(cfg.city)}`,
    }));
  }
}
console.log(failed ? '\n*** FIX THE !! LINES BEFORE USING ***' : '\n*** ALL CLEAN ***');
