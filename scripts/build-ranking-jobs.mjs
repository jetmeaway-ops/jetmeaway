/**
 * build-ranking-jobs.mjs — turn a city's blog-redo tier data into ranking-short
 * job files (2026-07-03). As the SEO agent finishes each city redo, its tier
 * data becomes the next shorts automatically.
 *
 * Usage: node scripts/build-ranking-jobs.mjs scratch/<city>-hotels-api.json scratch/<city>-tiers.json "<City>" <city-slug>
 * Emits: scratch/shorts/<slug>-cheapest-5.json and scratch/shorts/<slug>-budget-vs-luxury.json
 * (Edit oneLiners by hand before rendering — the generator only writes
 * data-true placeholders: stars/reviews. Never invent hotel facts.)
 */
import fs from 'node:fs';
import path from 'node:path';

const [, , apiFile, tiersFile, cityName, slug] = process.argv;
if (!slug) { console.error('usage: node scripts/build-ranking-jobs.mjs <api.json> <tiers.json> "<City>" <slug>'); process.exit(1); }

const api = JSON.parse(fs.readFileSync(apiFile, 'utf8'));
const tiers = JSON.parse(fs.readFileSync(tiersFile, 'utf8'));
const byId = new Map(api.hotels.map((h) => [h.id, h]));
const get = (id) => { const h = byId.get(id); if (!h) throw new Error('id not in API: ' + id); return h; };

const OUTDIR = path.join('scratch', 'shorts');
fs.mkdirSync(OUTDIR, { recursive: true });

const entry = (h, badge) => ({
  badge,
  hotelName: h.name.length > 26 ? h.name.slice(0, 24).trimEnd() + '…' : h.name,
  price: `from ~£${Math.round(h.pricePerNight)}/night${h.stars >= 4 ? ` · ${h.stars}-star` : ''}`,
  oneLiner: `${h.stars}★ · ${h.reviewCount.toLocaleString()} guest reviews`, // EDIT BY HAND with a real fact
  photoUrl: h.thumbnail,
  laId: h.id,
});

/* Job 1 — cheapest 5 (budget tier sorted by price; rank 1 = best value pick = cheapest) */
const budget = tiers.tiers.budget.map(get).sort((a, b) => a.pricePerNight - b.pricePerNight).slice(0, 5);
const cheapJob = {
  id: `${slug}-cheapest-5`,
  titleLines: [
    { text: 'Ranking the 5', color: 'white' },
    { text: `CHEAPEST ${cityName} hotels`, color: '0x2DD4BF' },
  ],
  subtitle: `real bookable prices · from £${Math.round(budget[0].pricePerNight)}/night`,
  entries: budget.map((h, i) => entry(h, `#${i + 1}`)),
  playbackOrder: [2, 4, 1, 3, 0],
  cta: { line1: 'Full list + live prices', line2: 'jetmeaway.co.uk', line3: 'LINK IN BIO' },
};

/* Job 2 — budget vs luxury price ladder (cheapest budget → priciest luxury) */
const lux = tiers.tiers.luxury.map(get).sort((a, b) => a.pricePerNight - b.pricePerNight);
const mid = (tiers.tiers.mid || []).map(get).sort((a, b) => a.pricePerNight - b.pricePerNight);
const ladder = [budget[0], budget[budget.length - 1], mid[Math.floor(mid.length / 2)], lux[0], lux[lux.length - 1]].filter(Boolean);
const ladderJob = {
  id: `${slug}-budget-vs-luxury`,
  titleLines: [
    { text: `£${Math.round(ladder[0].pricePerNight)} vs £${Math.round(ladder[ladder.length - 1].pricePerNight)} a night`, color: '0x2DD4BF' },
    { text: `in ${cityName.toUpperCase()}`, color: 'white' },
  ],
  subtitle: 'what each budget really gets you',
  entries: ladder.map((h) => entry(h, `£${Math.round(h.pricePerNight)}`)),
  playbackOrder: ladder.map((_, i) => i), // ascending price = the story
  cta: { line1: 'Every budget compared, live prices', line2: 'jetmeaway.co.uk', line3: 'LINK IN BIO' },
};

for (const job of [cheapJob, ladderJob]) {
  const f = path.join(OUTDIR, job.id + '.json');
  fs.writeFileSync(f, JSON.stringify(job, null, 2));
  console.log('wrote', f);
}
console.log('\nNOW: edit each oneLiner with a REAL fact (from the blog post), then:');
console.log(`  node scripts/build-ranking-short.mjs scratch/shorts/${slug}-cheapest-5.json`);
