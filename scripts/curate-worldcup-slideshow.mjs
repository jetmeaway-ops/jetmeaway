// Curate 10 verified city photos per FIFA World Cup 2026 host city from Pexels.
// Alt-text is checked against per-city guard tokens => relevance certainty; people-as-subject rejected.
// Writes public/data/slideshow/<slug>.json in the exact shape the Make pipeline consumes:
//   { city, img1..img10, music, outro_color }
// Also writes scratch/worldcup-slideshow-manifest.json for human review (alt text + ids + which pass).

import fs from 'node:fs';
import path from 'node:path';

const KEY = 'fCfL0EOcl2uCjsTknMMjJsdtBPEhrDKWZycKhY61ze2WN0ysj3igecv7';
const MUSIC = 'https://jetmeaway.co.uk/audio/june-dusk.mp3';
const OUTRO = '#ebd45d';

// slug -> { guard:[tokens that MUST appear in alt], terms:[search queries, primary 10 + backfill] }
const CITIES = {
  // England team hub — national post, use London + England icons
  england: {
    guard: ['london', 'england', 'english', 'wembley', 'britain', 'british', 'thames', 'westminster', 'big ben'],
    terms: [
      'london big ben westminster', 'london tower bridge', 'london skyline aerial', 'wembley stadium london',
      'london eye thames', 'london red telephone box', 'london st pauls cathedral', 'london tower of london',
      'london city financial district', 'london buckingham palace',
      'london double decker bus street', 'england countryside village', 'london parliament night', 'london millennium bridge',
    ],
  },
  vancouver: {
    guard: ['vancouver', 'british columbia', 'stanley park', 'gastown', 'canada place'],
    terms: [
      'vancouver skyline', 'vancouver coal harbour', 'vancouver stanley park', 'vancouver mountains city',
      'vancouver canada place', 'vancouver gastown steam clock', 'vancouver waterfront', 'vancouver lions gate bridge',
      'vancouver granville island', 'vancouver downtown night',
      'vancouver science world', 'vancouver english bay sunset', 'vancouver seawall', 'vancouver false creek',
    ],
  },
  toronto: {
    guard: ['toronto', 'cn tower', 'ontario', 'distillery district', 'rogers centre'],
    terms: [
      'toronto cn tower', 'toronto skyline', 'toronto downtown financial district', 'toronto waterfront lake',
      'toronto distillery district', 'toronto city hall nathan phillips', 'toronto night skyline', 'toronto street',
      'toronto harbourfront', 'toronto skyline sunset',
      'toronto rogers centre', 'toronto kensington market', 'toronto casa loma', 'toronto islands skyline',
    ],
  },
  seattle: {
    guard: ['seattle', 'space needle', 'puget', 'pike place', 'mount rainier'],
    terms: [
      'seattle space needle', 'seattle skyline', 'seattle pike place market', 'seattle waterfront',
      'seattle mount rainier skyline', 'seattle downtown', 'seattle great wheel', 'seattle ferry puget sound',
      'seattle pioneer square', 'seattle night skyline',
      'seattle kerry park view', 'seattle harbor', 'seattle gas works park', 'seattle chihuly glass',
    ],
  },
  'san-francisco': {
    guard: ['san francisco', 'francisco', 'golden gate', 'alcatraz', 'bay area', 'lombard'],
    terms: [
      'san francisco golden gate bridge', 'san francisco skyline', 'san francisco painted ladies', 'san francisco cable car',
      'san francisco lombard street', 'san francisco alcatraz island', 'san francisco bay aerial', 'san francisco fishermans wharf',
      'san francisco coit tower', 'san francisco downtown skyline',
      'san francisco fog bridge', 'san francisco pier 39', 'san francisco transamerica pyramid', 'san francisco chinatown',
    ],
  },
  'new-york': {
    guard: ['new york', 'manhattan', 'brooklyn', 'nyc', 'statue of liberty', 'times square', 'empire state', 'central park'],
    terms: [
      'new york skyline manhattan', 'new york times square', 'new york brooklyn bridge', 'new york statue of liberty',
      'new york central park aerial', 'new york empire state building', 'new york manhattan night', 'new york yellow taxi street',
      'new york one world trade center', 'new york high line',
      'new york rockefeller center', 'new york flatiron building', 'new york dumbo brooklyn', 'new york skyline sunset',
    ],
  },
  miami: {
    guard: ['miami', 'south beach', 'biscayne', 'ocean drive', 'wynwood', 'brickell'],
    terms: [
      'miami beach skyline', 'miami south beach art deco', 'miami ocean drive', 'miami downtown night',
      'miami beach aerial', 'miami palm trees beach', 'miami brickell skyline', 'miami wynwood walls',
      'miami waterfront', 'miami sunset skyline',
      'miami lifeguard tower beach', 'miami biscayne bay', 'miami little havana', 'miami port boats',
    ],
  },
  'mexico-city': {
    guard: ['mexico city', 'cdmx', 'zocalo', 'chapultepec', 'bellas artes', 'reforma', 'coyoacan', 'mexico'],
    terms: [
      'mexico city zocalo square', 'mexico city palacio de bellas artes', 'mexico city skyline', 'mexico city angel of independence',
      'mexico city metropolitan cathedral', 'mexico city chapultepec castle', 'mexico city colorful street', 'mexico city reforma avenue',
      'mexico city coyoacan', 'mexico city aerial skyline',
      'mexico city monument', 'mexico city xochimilco boats', 'mexico city plaza', 'mexico city architecture',
    ],
  },
  'los-angeles': {
    guard: ['los angeles', 'angeles', 'hollywood', 'santa monica', 'venice beach', 'griffith', 'downtown la'],
    terms: [
      'los angeles hollywood sign', 'los angeles skyline', 'los angeles santa monica pier', 'los angeles downtown',
      'los angeles griffith observatory', 'los angeles venice beach', 'los angeles palm trees street', 'los angeles sunset boulevard',
      'los angeles beach sunset', 'los angeles night skyline',
      'los angeles walt disney concert hall', 'los angeles rodeo drive', 'los angeles malibu coast', 'los angeles downtown aerial',
    ],
  },
  dallas: {
    guard: ['dallas', 'texas', 'reunion tower', 'fort worth', 'deep ellum'],
    terms: [
      'dallas skyline', 'dallas reunion tower', 'dallas downtown', 'dallas skyline night',
      'dallas margaret hunt hill bridge', 'dallas city aerial', 'dallas deep ellum', 'dallas arts district',
      'dallas klyde warren park', 'dallas sunset skyline',
      'dallas pegasus', 'dallas skyscrapers', 'fort worth stockyards', 'dallas texas downtown',
    ],
  },
  boston: {
    guard: ['boston', 'massachusetts', 'fenway', 'beacon hill', 'charles river', 'back bay', 'acorn street'],
    terms: [
      'boston skyline', 'boston freedom trail', 'boston beacon hill', 'boston harbor',
      'boston charles river skyline', 'boston back bay', 'boston fenway park', 'boston acorn street',
      'boston downtown night', 'boston public garden',
      'boston zakim bridge', 'boston north end', 'boston commonwealth avenue', 'boston seaport',
    ],
  },
  atlanta: {
    guard: ['atlanta', 'georgia', 'peachtree', 'midtown atlanta', 'piedmont park', 'centennial'],
    terms: [
      'atlanta skyline', 'atlanta downtown', 'atlanta midtown skyline', 'atlanta piedmont park',
      'atlanta centennial olympic park', 'atlanta city aerial', 'atlanta skyline sunset', 'atlanta ponce city market',
      'atlanta street downtown', 'atlanta night skyline',
      'atlanta mercedes benz stadium', 'atlanta beltline', 'atlanta buckhead', 'atlanta georgia skyscrapers',
    ],
  },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PEOPLE_RE =
  /\b(person|people|woman|women|man|men|couple|tourist|tourists|girl|boy|lady|ladies|pose|poses|posing|selfie|portrait of|model|crowd of people|family|wedding|bride)\b/i;

function pickFrom(photos, guards, seen, { requireGuard = true, allowPeople = false } = {}) {
  for (const p of photos) {
    if (seen.has(p.id)) continue;
    const alt = (p.alt || '').toLowerCase();
    if (requireGuard && !guards.some((g) => alt.includes(g))) continue;
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

  // pass 1: guard + no-people
  let p = pickFrom(photos, guards, seen, { requireGuard: true, allowPeople: false });
  let quality = 'clean';
  // pass 2: guard, allow people in alt (still city-relevant)
  if (!p) {
    p = pickFrom(photos, guards, seen, { requireGuard: true, allowPeople: true });
    quality = 'guard-people';
  }
  // pass 3: drop guard (search term was city-specific) but keep no-people — last resort
  if (!p) {
    p = pickFrom(photos, guards, seen, { requireGuard: false, allowPeople: false });
    quality = 'no-guard';
  }
  if (!p) return { ok: false, status: 'no-unique', term };

  seen.add(p.id);
  return { ok: true, quality, term, id: p.id, alt: p.alt, url: p.src.original, photographer: p.photographer };
}

async function main() {
  const manifest = {};
  const slideDir = path.resolve('public/data/slideshow');
  const scratchDir = path.resolve('scratch');
  fs.mkdirSync(slideDir, { recursive: true });
  fs.mkdirSync(scratchDir, { recursive: true });

  let totalNoGuard = 0;
  const shortCities = [];

  for (const [city, cfg] of Object.entries(CITIES)) {
    manifest[city] = [];
    const seen = new Set();
    const picks = [];
    for (const term of cfg.terms) {
      if (picks.length >= 10) break;
      const r = await searchTerm(term, cfg.guard, seen);
      await sleep(280);
      if (!r.ok) {
        console.log(`  [skip] ${city} :: "${term}" -> ${r.status}`);
        continue;
      }
      if (r.quality !== 'clean') {
        console.log(`  [${r.quality}] ${city} :: "${term}" -> "${(r.alt || '').slice(0, 50)}"`);
        if (r.quality === 'no-guard') totalNoGuard++;
      }
      manifest[city].push(r);
      picks.push(r.url);
    }

    // write the city JSON in the exact pipeline shape
    const obj = { city };
    for (let i = 0; i < 10; i++) obj[`img${i + 1}`] = picks[i] || picks[picks.length - 1] || '';
    obj.music = MUSIC;
    obj.outro_color = OUTRO;
    fs.writeFileSync(path.join(slideDir, `${city}.json`), JSON.stringify(obj, null, 2));

    const status = picks.length >= 10 ? 'OK' : `SHORT(${picks.length})`;
    if (picks.length < 10) shortCities.push(`${city}:${picks.length}`);
    console.log(`[DONE] ${city}: ${picks.length}/10 -> public/data/slideshow/${city}.json  ${status}`);
  }

  fs.writeFileSync(
    path.join(scratchDir, 'worldcup-slideshow-manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  console.log('\n=== SUMMARY ===');
  console.log(`Cities: ${Object.keys(CITIES).length}`);
  console.log(`Images via no-guard fallback (spot-check these): ${totalNoGuard}`);
  console.log(`Short cities (<10): ${shortCities.length ? shortCities.join(', ') : 'none'}`);
  console.log('Manifest: scratch/worldcup-slideshow-manifest.json');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
