// Temp candidate puller for the Scotland-win reel — downloads small thumbs so we can
// hand-pick clean, unambiguous images (no wrong-nation jerseys/flags). UNTRACKED.
import fs from 'node:fs';
import path from 'node:path';

const KEY = 'fCfL0EOcl2uCjsTknMMjJsdtBPEhrDKWZycKhY61ze2WN0ysj3igecv7';
const dir = path.resolve('scratch/sw2');
fs.mkdirSync(dir, { recursive: true });

// term -> how many candidates to pull
const TERMS = {
  'football stadium crowd night': 5,        // frame-0 packed stadium (need a clean one)
  'scotland football fans saltire': 4,      // right-nation fan energy (gold if clean)
  'fireworks stadium night celebration': 4, // team-less celebration
  'crowd silhouette hands raised cheering': 4,
  'edinburgh castle scotland': 3,           // Scotland icon / travel beat
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const manifest = [];

async function run() {
  for (const [term, count] of Object.entries(TERMS)) {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(term)}&per_page=${count}&orientation=portrait&size=large`;
    const res = await fetch(url, { headers: { Authorization: KEY } });
    if (!res.ok) { console.log(`[skip] ${term} -> ${res.status}`); continue; }
    const data = await res.json();
    const slug = term.replace(/[^a-z]+/gi, '-');
    let rank = 1;
    for (const p of data.photos || []) {
      const thumb = `${p.src.original}?auto=compress&cs=tinysrgb&w=360`;
      const fname = `${slug}__${rank}__${p.id}.jpg`;
      const buf = Buffer.from(await (await fetch(thumb)).arrayBuffer());
      fs.writeFileSync(path.join(dir, fname), buf);
      manifest.push({ term, rank, id: p.id, alt: p.alt, original: p.src.original, w: p.width, h: p.height, file: fname });
      console.log(`[ok] ${fname}  "${(p.alt||'').slice(0,52)}"`);
      rank++;
      await sleep(180);
    }
    await sleep(220);
  }
  fs.writeFileSync(path.resolve('scratch/sw2-manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\n${manifest.length} candidates -> scratch/sw2/  (manifest: scratch/sw2-manifest.json)`);
}
run().catch((e) => { console.error(e); process.exit(1); });
