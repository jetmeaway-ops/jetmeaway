#!/usr/bin/env node
/**
 * Merge Google Places coordinates into LANDMARK_ALIASES.
 *
 * Reads:
 *   tmp/landmark-coords.json — the JSON the owner saved from
 *     /api/admin/enrich-landmarks (which runs in Vercel against Google
 *     Places to keep the API key server-side).
 *
 * Writes:
 *   src/app/hotels/hotels-client.tsx — every LANDMARK_ALIASES entry
 *     gains `lat`, `lng`, and `radiusKm` fields. Default radius is
 *     10 km; the RADIUS_OVERRIDES table below bumps known-rural /
 *     gateway landmarks.
 *
 * Idempotent: re-running with the same JSON produces no diff.
 */

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const SOURCE = path.join(REPO, 'src', 'app', 'hotels', 'hotels-client.tsx');
const COORDS_JSON = path.join(REPO, 'tmp', 'landmark-coords.json');

// Bumped 10 → 15 km after the first prod run flagged Brandenburg Gate
// and Tokyo Tower with hotels 10.7-14 km from the landmark — within
// 15-min walk/transit but just outside the 10 km circle. 15 km matches
// LiteAPI's default distanceKm and Google's "near here" UX. Disneyland
// Paris uses an override below to handle its larger search area.
const DEFAULT_RADIUS_KM = 15;

/**
 * RADIUS_OVERRIDES — keyed by placeId. Anything not listed gets the
 * 10 km Standard default. Tiers:
 *   - 50  : single-town landmarks (Easter Island)
 *   - 75  : gateway-rural (Stonehenge, Loch Ness, etc.)
 *   - 100 : remote-wilderness (Serengeti, Raja Ampat)
 *   - 150 : ultra-remote (Mount Everest)
 */
const RADIUS_OVERRIDES = {
  'ChIJveJ6yhkd5kcRYOYQY8v4-Ic': 35,   // Disneyland Paris → LiteAPI doesn't have on-site Disney resorts, expand to catch east-Paris hotels closest to the park (~27 km)
  'ChIJAVkDPzdOqEcRcDteW0YgIQQ': 25,   // Brandenburg Gate → outer-Berlin hotels (16-18 km) within transit reach of central Berlin
  'ChIJeSx1tc8PWRMR-l8fWgNgo8A': 400,  // Meteora → LiteAPI has no Kalambaka inventory; cityName fallback returns Athens hotels (~360 km drive)
  'ChIJ7WVKx4w3lkYR_46Eqz9nx20': 800,  // Hermitage Museum → LiteAPI has no Saint Petersburg inventory (sanctions); cityName fallback returns Moscow hotels (~700 km)
  'ChIJqX7IpYRnYUcRsMMrhlCtAAQ': 150,  // Plitvice Lakes → Zagreb gateway ~130 km; LiteAPI doesn't index Karlovac
  'ChIJBzxUOeI4zC0R286ewj4py_s': 100,  // Gili Islands / Lombok → Denpasar Bali gateway ~70 km; Mataram + Lombok itself unindexed
  'ChIJt5sANlWMc0gRBqpe8oDgow0': 75,   // Stonehenge → Salisbury 15 km, rural surrounds
  'ChIJK94XLVtxj0gRPcQ-LtEJQ2I': 75,   // Loch Ness → Inverness ~40 km
  'ChIJFZgxDWKQfUgRBMANIXgrOqg': 75,   // Hadrian's Wall → Hexham, dispersed villages
  'ChIJ_1stWpWTW0gRgVJJCkQbKwM': 75,   // Cliffs of Moher → Galway 60 km
  'ChIJO4rQ1_3_YEgRMcXH7ywWVy4': 75,   // Giant's Causeway → Belfast 100 km
  'ChIJ5d80mCc8lw0RREretbL6OVY': 75,   // Sahara (Merzouga) → Erg Chebbi dunes, sparse
  'ChIJhWOFQ7TZORgRz7zYYwzVhBU': 75,   // Mount Kilimanjaro → Moshi 30 km
  'ChIJg3M48ogcNxgRUnFJ7PcHGbw': 100,  // Serengeti → Arusha 200 km — gateway only
  'ChIJj3XN_VsTNIcROU44U1EvmG4': 75,   // Antelope Canyon → Page 5 km but desert
  'ChIJvfLTWNm6_5MRU2ZOLB6EVRQ': 75,   // Salar de Uyuni → Uyuni town 20 km
  'ChIJP78qqXpMqJYR0Zf5rExh9Ho': 75,   // Atacama Desert → San Pedro de Atacama
  'ChIJ124xIYpntC0R3RVDNqpeqV4': 75,   // Komodo Island → Labuan Bajo 50 km by boat
  'ChIJC7tdhuojXy0RzmYVplSt3Ng': 100,  // Raja Ampat → Waisai + nearby islands
  'ChIJv6p7MIoZ6zkR6rGN8Rt8E7U': 150,  // Mount Everest → Kathmandu via valley
  'ChIJFwoxLFP6R5kRDBoGLMq7qpU': 50,   // Easter Island → Hanga Roa is the only town
};

function loadCoords() {
  if (!fs.existsSync(COORDS_JSON)) {
    console.error(`\n❌ Missing ${COORDS_JSON}`);
    console.error(`\n   To generate it:`);
    console.error(`     curl -H "Authorization: Bearer \\$ADMIN_SECRET" \\\\`);
    console.error(`          https://jetmeaway.co.uk/api/admin/enrich-landmarks > tmp/landmark-coords.json\n`);
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(COORDS_JSON, 'utf8'));
  // The route returns { ok, coords: { [placeId]: { lat, lng } | null }, ... }
  return raw.coords || raw;
}

function main() {
  const coords = loadCoords();
  let source = fs.readFileSync(SOURCE, 'utf8');
  const before = source;

  // First strip any previously-injected lat/lng/radiusKm fields so the
  // script is idempotent. Match patterns like:
  //   placeId: 'X', lat: 1.23, lng: 4.56, radiusKm: 10
  //   placeId: 'X', lat: 1.23, lng: 4.56, radiusKm: 10,
  source = source.replace(
    /placeId:\s*'([^']+)',\s*lat:\s*-?\d+(?:\.\d+)?,\s*lng:\s*-?\d+(?:\.\d+)?,\s*radiusKm:\s*\d+/g,
    `placeId: '$1'`,
  );

  let injected = 0;
  let missingCoords = [];

  // Inject lat/lng/radiusKm after every placeId. The same placeId can
  // appear in multiple entries (Big Ben + Buckingham + London Eye etc
  // all share the central-London placeId) — each gets the same coords
  // injected, which is correct.
  source = source.replace(
    /placeId:\s*'([^']+)'/g,
    (match, placeId) => {
      const c = coords[placeId];
      if (!c || typeof c.lat !== 'number' || typeof c.lng !== 'number') {
        missingCoords.push(placeId);
        return match; // leave entry without coords — falls back to searchAs city
      }
      const radius = RADIUS_OVERRIDES[placeId] || DEFAULT_RADIUS_KM;
      injected++;
      return `placeId: '${placeId}', lat: ${c.lat}, lng: ${c.lng}, radiusKm: ${radius}`;
    },
  );

  // Update the TS type definition once at the top of LANDMARK_ALIASES.
  // Idempotent — only inserts if the type doesn't already have lat/lng/radiusKm.
  source = source.replace(
    /const LANDMARK_ALIASES: Array<\{\s*\n((?:[^}]|\n)*?)\}> = \[/,
    (whole, body) => {
      if (body.includes('lat:') && body.includes('lng:') && body.includes('radiusKm:')) {
        return whole; // already updated
      }
      const newBody = body.replace(
        /placeId:\s*string;\s*\n/,
        `placeId: string;\n  lat: number;\n  lng: number;\n  radiusKm: number;\n`,
      );
      return `const LANDMARK_ALIASES: Array<{\n${newBody}}> = [`;
    },
  );

  if (source === before) {
    console.log('No changes needed (everything already in place).');
    return;
  }
  fs.writeFileSync(SOURCE, source);
  console.log(`✅ Injected lat/lng/radiusKm into ${injected} placeId occurrences.`);
  console.log(`   Default radius: ${DEFAULT_RADIUS_KM} km · ${Object.keys(RADIUS_OVERRIDES).length} overrides applied.`);
  if (missingCoords.length > 0) {
    console.log(`\n⚠️  ${missingCoords.length} placeId(s) had no coords (fall back to searchAs city):`);
    for (const pid of missingCoords) console.log(`   - ${pid}`);
  }
}

main();
