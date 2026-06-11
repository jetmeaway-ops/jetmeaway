// Curate 10 verified city photos for the EVENING (18:00) social-post rotation.
// Same guard/no-people logic as curate-slideshow-images.mjs, but writes the
// per-city shape the Make pipeline consumes: public/data/slideshow/{city}.json
// with { city, img1..img10, music, outro_color }.
//
// Evening cities = never-posted hotel blogs, led by the three pages the
// 2026-06-10 GSC push is driving to page 1 (goa, jaipur, victoria-falls).
// Does NOT touch the existing 7 morning-city files.

import fs from 'node:fs';
import path from 'node:path';

const KEY = 'fCfL0EOcl2uCjsTknMMjJsdtBPEhrDKWZycKhY61ze2WN0ysj3igecv7';
const MUSIC = 'https://jetmeaway.co.uk/audio/hyperlight.mp3';
const OUTRO_COLOR = '#ebd45d';

const CITIES = {
  goa: {
    guard: ['goa', 'palolem', 'baga', 'anjuna', 'dudhsagar', 'konkan', 'calangute'],
    terms: [
      'goa palolem beach', 'goa baga beach', 'goa anjuna beach', 'goa dudhsagar falls',
      'goa beach shack sunset', 'goa portuguese church', 'goa fort aguada',
      'goa palm trees beach aerial', 'goa fishing boats beach', 'goa beach sunset palms',
      'old goa basilica', 'goa morjim beach', 'goa river backwaters', 'goa paddy fields palms',
    ],
  },
  jaipur: {
    guard: ['jaipur', 'hawa mahal', 'amber', 'amer', 'rajasthan', 'jal mahal', 'nahargarh', 'jantar'],
    terms: [
      'jaipur hawa mahal', 'jaipur amber fort', 'jaipur city palace', 'jaipur jal mahal',
      'jaipur nahargarh fort', 'jaipur jantar mantar', 'jaipur pink city street',
      'jaipur patrika gate', 'jaipur albert hall museum', 'jaipur bazaar market',
      'jaipur rajasthan palace', 'amber fort elephant', 'jaipur stepwell', 'jaipur fort sunset',
    ],
  },
  'victoria-falls': {
    // Looser guard than other cities: VF alt-texts on Pexels rarely name the
    // place, but every search term below is already VF-specific, so generic
    // waterfall/gorge/river alts on those queries are near-certainly VF.
    guard: ['victoria falls', 'zambezi', 'zimbabwe', 'zambia', 'livingstone', 'mosi', 'waterfall', 'falls', 'gorge', 'river', 'africa'],
    terms: [
      'victoria falls waterfall', 'victoria falls zimbabwe', 'victoria falls bridge',
      'zambezi river sunset', 'victoria falls rainbow', 'victoria falls aerial',
      'zambezi river safari', 'victoria falls gorge', 'livingstone zambia town',
      'victoria falls mist spray', 'zambezi sunset cruise boat', 'victoria falls devils pool',
      'zimbabwe safari elephant', 'zambezi river bend aerial',
    ],
  },
  istanbul: {
    guard: ['istanbul', 'bosphorus', 'hagia', 'galata', 'sultanahmet', 'ortakoy', 'balat'],
    terms: [
      'istanbul hagia sophia', 'istanbul blue mosque', 'istanbul galata tower',
      'istanbul bosphorus bridge', 'istanbul grand bazaar', 'istanbul sultanahmet',
      'istanbul ferry seagulls', 'istanbul balat colorful houses', 'istanbul ortakoy mosque',
      'istanbul rooftop sunset', 'istanbul spice bazaar', 'istanbul istiklal tram',
      'istanbul topkapi palace', 'istanbul maiden tower',
    ],
  },
  milan: {
    guard: ['milan', 'milano', 'duomo', 'galleria', 'navigli', 'sforza', 'bosco verticale'],
    terms: [
      'milan duomo cathedral', 'milan galleria vittorio emanuele', 'milan navigli canal',
      'milan sforza castle', 'milan bosco verticale', 'milan brera street',
      'milan duomo rooftop spires', 'milan porta nuova skyline', 'milan teatro alla scala',
      'milan tram street', 'milan duomo square', 'milan arco della pace',
      'milan fashion district street', 'milan navigli sunset',
    ],
  },
  bangkok: {
    guard: ['bangkok', 'thailand', 'thai', 'wat ', 'chao phraya', 'khao san', 'tuk'],
    terms: [
      'bangkok wat arun', 'bangkok grand palace', 'bangkok wat pho',
      'bangkok chao phraya river', 'bangkok street food market', 'bangkok skyline night',
      'bangkok floating market', 'bangkok chinatown neon', 'bangkok golden temple',
      'bangkok tuk tuk street', 'bangkok rooftop view', 'bangkok khao san road',
      'bangkok longtail boat', 'bangkok night market',
    ],
  },
  dublin: {
    guard: ['dublin', 'ireland', 'irish', 'liffey', 'temple bar', 'trinity', 'ha’penny', 'halfpenny'],
    terms: [
      'dublin temple bar', 'dublin trinity college library', 'dublin ha penny bridge',
      'dublin liffey river', 'dublin georgian doors', 'dublin grafton street',
      'dublin christ church cathedral', 'dublin pub exterior', 'dublin st stephens green',
      'dublin castle', 'dublin samuel beckett bridge', 'dublin phoenix park',
      'dublin cobbled street', 'dublin docklands evening',
    ],
  },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

  let p = pickFrom(photos, guards, seen, { allowPeople: false });
  let quality = 'clean';
  if (!p) {
    p = pickFrom(photos, guards, seen, { allowPeople: true });
    quality = 'people-allowed';
  }
  if (!p) return { ok: false, status: 'no-unique-guarded', term };

  seen.add(p.id);
  return { ok: true, quality, term, id: p.id, alt: p.alt, url: p.src.original };
}

async function main() {
  const outDir = path.resolve('public/data/slideshow');
  fs.mkdirSync(outDir, { recursive: true });
  const manifest = {};
  let incomplete = 0;

  for (const [city, cfg] of Object.entries(CITIES)) {
    const urls = [];
    manifest[city] = [];
    const seen = new Set();
    for (const term of cfg.terms) {
      if (urls.length >= 10) break;
      const r = await searchTerm(term, cfg.guard, seen);
      await sleep(300);
      if (!r.ok) {
        console.log(`  [skip] ${city} :: "${term}" -> ${r.status}`);
        continue;
      }
      if (r.quality === 'people-allowed') {
        console.log(`  [people] ${city} :: "${term}" -> "${(r.alt || '').slice(0, 55)}"`);
      }
      manifest[city].push({ term: r.term, id: r.id, alt: r.alt });
      urls.push(r.url);
    }
    if (urls.length < 10) {
      incomplete++;
      console.log(`[INCOMPLETE] ${city}: only ${urls.length}/10 — NOT writing file`);
      continue;
    }
    const doc = { city };
    urls.forEach((u, i) => (doc[`img${i + 1}`] = u));
    doc.music = MUSIC;
    doc.outro_color = OUTRO_COLOR;
    fs.writeFileSync(path.join(outDir, `${city}.json`), JSON.stringify(doc, null, 2));
    console.log(`[DONE] ${city}: 10/10 -> public/data/slideshow/${city}.json`);
  }

  fs.mkdirSync('scratch', { recursive: true });
  fs.writeFileSync('scratch/slideshow-evening-manifest.json', JSON.stringify(manifest, null, 2));
  console.log(`\n${incomplete === 0 ? 'ALL CITIES COMPLETE' : incomplete + ' cities incomplete'}`);
  process.exit(incomplete === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(2); });
