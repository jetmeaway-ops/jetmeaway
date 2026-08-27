// One-off: curate portrait, high-res Pexels photos for a Scotland 1-0 Haiti
// (2026 World Cup, McGinn 28') REACTION reel — grow-first engagement content.
//
// Reel logic: img1 = packed stadium (kills the 0:00 black screen), then Saltire +
// Tartan Army / fan celebration + stadium atmosphere. NO match footage anywhere
// (that's broadcaster copyright) — the voiceover carries the facts, images set mood.
//
// Writes public/data/slideshow/scotland-win.json in the exact pipeline shape the
// Make->Creatomate flow consumes: { city, img1..img10, music, outro_color }.
// Also writes scratch/scotland-win-manifest.json (alt text + ids) for human review.
//
// NOTE: Pexels key is hard-coded (same as curate-worldcup-slideshow.mjs) — keep this
// script UNTRACKED; only the JSON gets committed.

import fs from 'node:fs';
import path from 'node:path';

const KEY = 'fCfL0EOcl2uCjsTknMMjJsdtBPEhrDKWZycKhY61ze2WN0ysj3igecv7';
const MUSIC = 'https://jetmeaway.co.uk/audio/champions.mp3'; // royalty-free Nesterouk anthem
const OUTRO = '#0A2A66'; // Scotland navy for the end-card fill
const SLUG = 'scotland-win';

// Ordered: index 0 is FRAME 0 (the hook sits on it) — must be a packed stadium.
const TERMS = [
  'football stadium packed crowd night', // img1 = frame 0
  'scotland flag saltire',
  'football fans celebrating crowd',
  'soccer stadium floodlights night',
  'football supporters scarves stadium',
  'scotland tartan flag fan',
  'soccer goal net stadium',
  'football crowd flags cheering',
  'stadium crowd celebration',
  'football pitch stadium aerial',
  // backfill (used only if earlier terms dupe / get filtered)
  'soccer fans crowd flares',
  'football terrace fans singing',
  'scotland kilt bagpipes',
  'football trophy celebration',
];

// Reject single-person portraits / selfies (a crowd IS what we want, so allow groups).
const PORTRAIT_RE = /\b(selfie|portrait of|headshot|posing|model|fashion|close[- ]?up of (a )?(man|woman|girl|boy|person))\b/i;
// Reject obvious OTHER-nation imagery so we never show the wrong flag/jersey.
const OTHER_NATION_RE = /\b(england|english|brazil|brazilian|morocco|moroccan|haiti|haitian|argentina|argentine|france|french|germany|german|spain|spanish|italy|italian|portugal|portuguese|netherlands|dutch|croatia|croatian|usa flag|american flag|stars and stripes)\b/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function pick(photos, seen) {
  for (const p of photos) {
    if (seen.has(p.id)) continue;
    const alt = (p.alt || '').toLowerCase();
    if (PORTRAIT_RE.test(alt)) continue;
    if (OTHER_NATION_RE.test(alt)) continue;
    return p;
  }
  // relax: allow if only reason was empty/odd alt (still dedup)
  for (const p of photos) {
    if (seen.has(p.id)) continue;
    const alt = (p.alt || '').toLowerCase();
    if (OTHER_NATION_RE.test(alt)) continue;
    return p;
  }
  return null;
}

async function searchTerm(term, seen) {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(
    term
  )}&per_page=15&orientation=portrait&size=large`;
  const res = await fetch(url, { headers: { Authorization: KEY } });
  if (!res.ok) return { ok: false, status: res.status, term };
  const data = await res.json();
  const p = pick(data.photos || [], seen);
  if (!p) return { ok: false, status: 'no-unique', term };
  seen.add(p.id);
  return {
    ok: true,
    term,
    id: p.id,
    alt: p.alt,
    url: p.src.original, // full resolution
    w: p.width,
    h: p.height,
    photographer: p.photographer,
  };
}

async function main() {
  const slideDir = path.resolve('public/data/slideshow');
  const scratchDir = path.resolve('scratch');
  fs.mkdirSync(slideDir, { recursive: true });
  fs.mkdirSync(scratchDir, { recursive: true });

  const seen = new Set();
  const picks = [];
  const manifest = [];

  for (const term of TERMS) {
    if (picks.length >= 10) break;
    const r = await searchTerm(term, seen);
    await sleep(280);
    if (!r.ok) {
      console.log(`  [skip] "${term}" -> ${r.status}`);
      continue;
    }
    manifest.push(r);
    picks.push(r.url);
    console.log(`  [ok]  "${term}" -> ${r.w}x${r.h}  "${(r.alt || '').slice(0, 54)}"`);
  }

  const obj = { city: SLUG };
  for (let i = 0; i < 10; i++) obj[`img${i + 1}`] = picks[i] || picks[picks.length - 1] || '';
  obj.music = MUSIC;
  obj.outro_color = OUTRO;

  fs.writeFileSync(path.join(slideDir, `${SLUG}.json`), JSON.stringify(obj, null, 2));
  fs.writeFileSync(path.join(scratchDir, 'scotland-win-manifest.json'), JSON.stringify(manifest, null, 2));

  console.log(`\n[DONE] ${picks.length}/10 -> public/data/slideshow/${SLUG}.json`);
  console.log('Manifest (alt text + ids): scratch/scotland-win-manifest.json');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
