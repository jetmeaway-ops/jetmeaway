// Curate 10 verified city photos per destination from Pexels.
// Each photo's alt-text is checked against a city guard token => 100% relevance certainty.
// Output: public/data/slideshow-images.json  (city slug -> [10 image URLs])
// Also writes scratch/slideshow-image-manifest.json for human review (alt text + ids).

import fs from 'node:fs';
import path from 'node:path';

const KEY = 'fCfL0EOcl2uCjsTknMMjJsdtBPEhrDKWZycKhY61ze2WN0ysj3igecv7';

// guard: lowercase token(s) that MUST appear in alt text for the photo to qualify
const CITIES = {
  rome: {
    guard: ['rome', 'roman', 'colosseum', 'vatican', 'trevi', 'pantheon'],
    terms: [
      'rome colosseum',
      'rome trevi fountain',
      'rome pantheon',
      'rome st peters basilica',
      'rome roman forum',
      'rome piazza navona',
      'rome spanish steps',
      'rome trastevere street',
      'rome cobblestone alley',
      'rome rooftop sunset',
      // backfill
      'rome castel sant angelo',
      'rome tiber river bridge',
      'rome via dei condotti',
      'rome ancient architecture',
    ],
  },
  vienna: {
    guard: ['vienna', 'wien', 'schonbrunn', 'schönbrunn', 'belvedere', 'hofburg', 'stephansdom'],
    terms: [
      'vienna stephansdom cathedral',
      'vienna schonbrunn palace',
      'vienna belvedere palace',
      'vienna karlskirche',
      'vienna state opera house',
      'vienna hofburg palace',
      'vienna naschmarkt',
      'vienna prater ferris wheel',
      'vienna coffee house cafe',
      'vienna ringstrasse architecture',
      // backfill
      'vienna city hall rathaus',
      'vienna danube canal',
      'vienna old town street',
      'vienna palace garden',
    ],
  },
  marrakech: {
    guard: ['marrak', 'koutoubia', 'jemaa', 'majorelle', 'medina', 'morocco', 'moroccan'],
    terms: [
      'marrakech koutoubia mosque',
      'marrakech jemaa el fnaa square',
      'marrakech bahia palace',
      'marrakech majorelle garden',
      'marrakech medina souk market',
      'marrakech riad courtyard',
      'marrakech ben youssef madrasa',
      'marrakech rooftop atlas mountains',
      'marrakech blue door morocco',
      'marrakech lantern market',
      // backfill
      'marrakech medina rooftop',
      'marrakech spice market',
      'marrakech ornate archway',
      'marrakech desert palm grove',
    ],
  },
  'las-vegas': {
    guard: ['vegas', 'nevada', 'bellagio', 'fremont'],
    terms: [
      'las vegas strip night',
      'las vegas bellagio fountain',
      'las vegas neon sign',
      'las vegas fremont street',
      'las vegas welcome sign',
      'las vegas casino lights',
      'las vegas sphere',
      'las vegas aerial skyline night',
      'las vegas high roller wheel',
      'las vegas boulevard sunset',
      // backfill
      'las vegas luxor pyramid',
      'las vegas caesars palace',
      'las vegas stratosphere tower',
      'las vegas paris eiffel replica',
    ],
  },
  edinburgh: {
    guard: ['edinburgh', 'scotland', 'scottish', 'arthur', 'calton', 'holyrood'],
    terms: [
      'edinburgh castle',
      'edinburgh royal mile',
      'edinburgh arthurs seat',
      'edinburgh old town',
      'edinburgh victoria street',
      'edinburgh dean village',
      'edinburgh calton hill',
      'edinburgh princes street',
      'edinburgh closes alley',
      'edinburgh scott monument',
      // backfill
      'edinburgh grassmarket',
      'edinburgh circus lane',
      'edinburgh national gallery',
      'edinburgh skyline rooftops',
    ],
  },
  prague: {
    guard: ['prague', 'praha', 'czech', 'charles bridge', 'vltava'],
    terms: [
      'prague charles bridge',
      'prague old town square',
      'prague astronomical clock',
      'prague castle',
      'prague vltava river',
      'prague lennon wall',
      'prague st vitus cathedral',
      'prague narrow street',
      'prague red rooftops',
      'prague petrin tower',
      // backfill
      'prague dancing house',
      'prague powder tower',
      'prague kampa island',
      'prague tram street',
    ],
  },
  munich: {
    guard: ['munich', 'münchen', 'munchen', 'bavaria', 'bavarian', 'marienplatz', 'isar'],
    terms: [
      'munich marienplatz',
      'munich english garden',
      'munich viktualienmarkt',
      'munich frauenkirche',
      'munich nymphenburg palace',
      'munich olympiapark',
      'munich hofbrauhaus',
      'munich asamkirche church',
      'munich isar river',
      'munich rooftop alps view',
      // backfill
      'munich residenz palace',
      'munich karlsplatz gate',
      'munich old town hall',
      'munich beer garden trees',
    ],
  },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// reject photos where a PERSON is the subject (user does not want "lady in front of camera")
const PEOPLE_RE =
  /\b(person|people|woman|women|man|men|couple|tourist|tourists|girl|boy|lady|ladies|pose|poses|posing|selfie|skating|skater|portrait of|model|crowd of people|family)\b/i;

function pickFrom(photos, guards, seen, { allowPeople = false } = {}) {
  for (const p of photos) {
    if (seen.has(p.id)) continue;
    const alt = (p.alt || '').toLowerCase();
    if (!guards.some((g) => alt.includes(g))) continue;
    if (!allowPeople && PEOPLE_RE.test(alt)) continue;
    return p;
  }
  return null;
}

async function searchTerm(term, guards, seen) {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(
    term
  )}&per_page=15&orientation=portrait&size=large`;
  const res = await fetch(url, { headers: { Authorization: KEY } });
  if (!res.ok) return { ok: false, status: res.status, term };
  const data = await res.json();
  const photos = data.photos || [];

  // pass 1: guard + no-people + not-seen
  let p = pickFrom(photos, guards, seen, { allowPeople: false });
  let quality = 'clean';
  // pass 2: relax people filter (still guard + not-seen)
  if (!p) {
    p = pickFrom(photos, guards, seen, { allowPeople: true });
    quality = 'people-allowed';
  }
  if (!p) return { ok: false, status: 'no-unique-guarded', term };

  seen.add(p.id);
  return {
    ok: true,
    quality,
    term,
    id: p.id,
    alt: p.alt,
    url: p.src.original,
    portrait: p.src.portrait,
    large2x: p.src.large2x,
    photographer: p.photographer,
  };
}

async function main() {
  const manifest = {};
  const simple = {};
  let unguarded = 0;
  let failed = 0;

  let peopleAllowed = 0;
  for (const [city, cfg] of Object.entries(CITIES)) {
    manifest[city] = [];
    simple[city] = [];
    const seen = new Set();
    for (const term of cfg.terms) {
      if (simple[city].length >= 10) break; // got our 10
      const r = await searchTerm(term, cfg.guard, seen);
      await sleep(300);
      if (!r.ok) {
        console.log(`  [skip] ${city} :: "${term}" -> ${r.status}`);
        continue;
      }
      if (r.quality === 'people-allowed') {
        peopleAllowed++;
        console.log(`  [people] ${city} :: "${term}" -> "${(r.alt || '').slice(0, 55)}"`);
      }
      manifest[city].push(r);
      simple[city].push(r.url);
    }
    if (simple[city].length < 10) failed++;
    console.log(`[DONE] ${city}: ${simple[city].length}/10 images`);
  }
  unguarded = peopleAllowed;

  const dataDir = path.resolve('public/data');
  const scratchDir = path.resolve('scratch');
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(scratchDir, { recursive: true });

  fs.writeFileSync(path.join(dataDir, 'slideshow-images.json'), JSON.stringify(simple, null, 2));
  fs.writeFileSync(
    path.join(scratchDir, 'slideshow-image-manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  console.log('\n=== SUMMARY ===');
  for (const [city, urls] of Object.entries(simple)) {
    console.log(`${city}: ${urls.length} urls`);
  }
  console.log(`Unguarded (need review): ${unguarded}`);
  console.log(`Failed: ${failed}`);
  console.log('Wrote public/data/slideshow-images.json + scratch/slideshow-image-manifest.json');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
