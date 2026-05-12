/**
 * TEMPORARY admin route — populates lat/lng for the 96 LANDMARK_ALIASES
 * entries in `src/app/hotels/hotels-client.tsx`. The Google Places API
 * key lives in Vercel; this route is the bridge so the key never leaves
 * the server. Owner hits it once, copies the JSON, saves it locally, then
 * `scripts/merge-landmark-coords.mjs` writes the coords back into the
 * source.
 *
 * This route is DELETED in the same commit that lands the data write so
 * the attack surface never lingers on main beyond a few minutes.
 *
 * Auth: Authorization: Bearer <ADMIN_SECRET> — see `src/lib/admin-auth.ts`.
 *
 * Usage from a logged-in browser tab:
 *   1. Open https://jetmeaway.co.uk/api/admin/enrich-landmarks with the
 *      browser DevTools "Edit and resend" feature to add the auth header.
 *      OR curl from a terminal:
 *        curl -H "Authorization: Bearer $ADMIN_SECRET" \
 *             https://jetmeaway.co.uk/api/admin/enrich-landmarks > tmp/landmark-coords.json
 *   2. Save the JSON response to `tmp/landmark-coords.json`.
 *   3. Run `node scripts/merge-landmark-coords.mjs` to patch the source.
 */

import { NextRequest, NextResponse } from 'next/server';
import { googlePlaceDetails } from '@/lib/google-places';

const ADMIN_SECRET = process.env.ADMIN_SECRET || '';

/**
 * Accept either:
 *   - Authorization: Bearer <ADMIN_SECRET>   (CLI / curl flow)
 *   - jma_admin cookie equal to ADMIN_SECRET (logged-in /admin browser)
 *
 * Constant-time string compare on the bearer path to avoid timing leaks.
 */
function authed(req: NextRequest): boolean {
  if (!ADMIN_SECRET) return false;
  // Cookie path — set by /admin/login when the owner signs in.
  const cookie = req.cookies.get('jma_admin')?.value;
  if (cookie && cookie === ADMIN_SECRET) return true;
  // Bearer header path
  const header = req.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1] || '';
  if (!token || token.length !== ADMIN_SECRET.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) {
    diff |= token.charCodeAt(i) ^ ADMIN_SECRET.charCodeAt(i);
  }
  return diff === 0;
}

export const runtime = 'edge';

// Inlined from LANDMARK_ALIASES (src/app/hotels/hotels-client.tsx) to avoid
// importing the React module into the edge function bundle. Deduped on
// placeId — several London landmarks (Big Ben, Buckingham, London Eye,
// Tower Bridge) share the central-London placeId; we fetch coords once
// and the merge script applies them to every entry that references it.
const PLACE_IDS = [
  'ChIJ_WegsaCYc0gRlCypaxXgLjs',  // Durdle Door (Bournemouth)
  'ChIJveJ6yhkd5kcRYOYQY8v4-Ic',  // Disneyland Paris
  'ChIJdd4hrwug2EcRmSrV3Vo6llI',  // London (Big Ben, Buckingham, London Eye, Tower Bridge)
  'ChIJt5sANlWMc0gRBqpe8oDgow0',  // Stonehenge
  'ChIJIyaYpQC4h0gRJxfnfHsU8mQ',  // Edinburgh Castle
  'ChIJK94XLVtxj0gRPcQ-LtEJQ2I',  // Loch Ness
  'ChIJ_1stWpWTW0gRgVJJCkQbKwM',  // Cliffs of Moher
  'ChIJO4rQ1_3_YEgRMcXH7ywWVy4',  // Giant's Causeway
  'ChIJ8WWY4UDDeEgR0eRUiomrdEc',  // York Minster
  'ChIJFZgxDWKQfUgRBMANIXgrOqg',  // Hadrian's Wall
  'ChIJD7fiBh9u5kcRYJSMaMOCCwQ',  // Eiffel Tower
  'ChIJu46S-ZZhLxMROG5lkwZ3D7k',  // Colosseum + Trevi Fountain
  'ChIJj1n28JqR1RIRyHiEp7UPuKo',  // Leaning Tower of Pisa
  'ChIJfcIyLeb8cQ0Rcg1g0533WJI',  // Alhambra
  'ChIJ5TCOcRaYpBIRCmZHTz37sEQ',  // Park Güell
  'ChIJAVkDPzdOqEcRcDteW0YgIQQ',  // Brandenburg Gate
  'ChIJCfRmaIBfnEcRAPOL161IHgQ',  // Neuschwanstein Castle
  'ChIJ5S-raZElv0cR8HcqSvxgJwQ',  // Cologne Cathedral
  'ChIJn8o2UZ4HbUcRRluiUYrlwv0',  // Schönbrunn Palace
  'ChIJVXealLU_xkcRja_At0z9AGY',  // Amsterdam museums
  'ChIJi3lwCZyTC0cRkEAWZg-vAAQ',  // Prague Castle / Charles Bridge
  'ChIJ8UNwBh-9oRQR3Y1mdkU1Nic',  // Acropolis
  'ChIJeSx1tc8PWRMR-l8fWgNgo8A',  // Meteora
  'ChIJqX7IpYRnYUcRsMMrhlCtAAQ',  // Plitvice Lakes
  'ChIJybDUc_xKtUYRTM9XV8zWRD0',  // Red Square / Kremlin
  'ChIJ7WVKx4w3lkYR_46Eqz9nx20',  // Hermitage Museum
  'ChIJw-3c7rl01kgRcWDSMKIskew',  // Blue Lagoon (Iceland)
  'ChIJ_XE7bFLExEUR075ujoXKPQI',  // Northern Lights (Tromsø)
  'ChIJawhoAASnyhQR0LABvJj-zOE',  // Hagia Sophia + Blue Mosque
  'ChIJq9Fr03loKhURUK4_ohdObEY',  // Cappadocia
  'ChIJRcbZaklDXz4RYlEphFBu5r0',  // Burj Al Arab + Palm Jumeirah
  'ChIJg3M48ogcNxgRUnFJ7PcHGbw',  // Serengeti
  'ChIJhWOFQ7TZORgRz7zYYwzVhBU',  // Mount Kilimanjaro
  'ChIJl5ZXNZJGWBQRUvx4mB_WkU4',  // Pyramids of Giza
  'ChIJ5d80mCc8lw0RREretbL6OVY',  // Sahara Desert (Merzouga)
  'ChIJuSwU55ZS8DURiqkPryBWYrk',  // Forbidden City + Great Wall
  'ChIJMzz1sUBwsjURoWTDI5QSlQI',  // The Bund (Shanghai)
  'ChIJByjqov3-AzQR2pT0dDW0bUg',  // Hong Kong skyline
  'ChIJGyRHiGvgG2ARRmIMgHRWc1w',  // Mount Fuji
  'ChIJXSModoWLGGARILWiCfeu2M0',  // Tokyo Tower + Sensō-ji
  'ChIJ8cM8zdaoAWARPR27azYdlsA',  // Arashiyama Bamboo Forest
  'ChIJ5-rvAcdJzDERfSgcL1uO2fQ',  // Petronas Twin Towers
  'ChIJeaiRjJoWEDER-rvlPvmqQKk',  // Angkor Wat
  'ChIJBcqveDxXSjERAThbfWDP5Wc',  // Halong Bay
  'ChIJ24BeDptA0i0RSje5zOg0c-I',  // Bali
  'ChIJyY4rtGcX2jERIKTarqz3AAQ',  // Singapore (Marina Bay, Sentosa, Gardens by the Bay)
  'ChIJ5fXRB1Z-PzsRmRIFWpvp2Io',  // Maldives
  'ChIJv6p7MIoZ6zkR6rGN8Rt8E7U',  // Mount Everest
  'ChIJ2UEvfIUNdDkRQjtSqTjvSng',  // Taj Mahal
  'ChIJ9Vm7fePBvzsRhscxtxGXD50',  // Goa
  'ChIJYWspqvGECDsRWvhBLFVkR7g',  // Kerala Backwaters
  'ChIJOwg_06VPwokRYv534QaPC8g',  // New York City (Statue of Liberty, Empire State, Central Park, Brooklyn Bridge)
  'ChIJE9on3F3HwoAR9AhGJW_fL-I',  // Hollywood Sign
  'ChIJW-T2Wt7Gt4kRKl2I1CJFUsI',  // The White House
  'ChIJ-6W7nqVCfYcRx7eTPlphccQ',  // Mount Rushmore
  'ChIJd7zN_thz54gRnr-lPAaywwo',  // Walt Disney World
  'ChIJZ-hVgPnW3IARYLErmquJqwE',  // Disneyland California
  'ChIJpTvG15DL1IkRd8S0KlBVNTI',  // CN Tower
  'ChIJW6AIkVXemwARTtIvZ2xC3FA',  // Christ the Redeemer
  'ChIJQwpTruuQ9pQRUqnEtHOUlyE',  // Iguazu Falls
  'ChIJEySiW1VieGkRYHggf_HuAAQ',  // Great Barrier Reef
  'ChIJPz2rao9AIysRAIUkKqgXAgQ',  // Uluru / Ayers Rock
  'ChIJqRZ64SdObG0RsOGiQ2HvAAU',  // Hobbiton
  'ChIJYZkT1x2OekcRUOw_ghz4AAQ',  // Lake Bled
  'ChIJY-0nEEichkcRJPVfeK-Wm7k',  // Lake Como
  'ChIJB4uscYn61BIRgGX4h7QPnhE',  // Cinque Terre
  'ChIJlUCZXxwuvEgRqSUCjJgJrt0',  // Faroe Islands
  'ChIJUUNvFyKA3kURMw-2Z5beIIw',  // Lofoten Islands
  'ChIJq4sfUMNfYAwROaHNFSxN2P8',  // Madeira
  'ChIJlw6wdswqQwsRFsRvTvKAVXY',  // Azores
  'ChIJj3XN_VsTNIcROU44U1EvmG4',  // Antelope Canyon
  'ChIJP78qqXpMqJYR0Zf5rExh9Ho',  // Atacama Desert
  'ChIJvfLTWNm6_5MRU2ZOLB6EVRQ',  // Salar de Uyuni
  'ChIJFwoxLFP6R5kRDBoGLMq7qpU',  // Easter Island
  'ChIJa7-U-0NdqpoRNWGGLDX6QZg',  // Galápagos Islands
  'ChIJUQgUUYtaF24RKNOlslOphx0',  // Fiji
  'ChIJ124xIYpntC0R3RVDNqpeqV4',  // Komodo Island
  'ChIJC7tdhuojXy0RzmYVplSt3Ng',  // Raja Ampat
  'ChIJkc4JNwA_pTMR9YmVzK8IcUw',  // Boracay
  'ChIJ_3YDv3uTlTkRZCGAJTuCz_Y',  // Annapurna
  'ChIJZVKVEX6lpTYRBQDurljkC0c',  // Guilin / Yangshuo
  'ChIJtzlsWuid4TkRkAEHWg94-gE',  // Bhutan
  'ChIJBzxUOeI4zC0R286ewj4py_s',  // Gili Islands / Lombok
];

/**
 * Fetch coords for an array of placeIds with bounded parallelism.
 */
async function fetchCoordsInBatches(
  placeIds: string[],
  batchSize: number,
): Promise<Record<string, { lat: number; lng: number } | null>> {
  const out: Record<string, { lat: number; lng: number } | null> = {};
  for (let i = 0; i < placeIds.length; i += batchSize) {
    const slice = placeIds.slice(i, i + batchSize);
    const results = await Promise.all(
      slice.map(async (pid) => {
        const coords = await googlePlaceDetails(pid);
        return [pid, coords] as const;
      }),
    );
    for (const [pid, coords] of results) {
      out[pid] = coords;
    }
  }
  return out;
}

export async function GET(req: NextRequest) {
  if (!authed(req)) {
    return NextResponse.json(
      { error: 'Unauthorized — sign in to /admin or send Authorization: Bearer <ADMIN_SECRET>' },
      { status: 401 },
    );
  }

  const t0 = Date.now();
  const unique = Array.from(new Set(PLACE_IDS));
  const coords = await fetchCoordsInBatches(unique, 10);
  const ms = Date.now() - t0;

  const succeeded = Object.values(coords).filter((c) => c != null).length;
  const failed = Object.entries(coords)
    .filter(([, c]) => c == null)
    .map(([pid]) => pid);

  return NextResponse.json(
    {
      ok: true,
      totalPlaceIds: PLACE_IDS.length,
      uniquePlaceIds: unique.length,
      succeeded,
      failed,
      ms,
      coords,
    },
    {
      headers: {
        // Make it easy to save directly to disk via the browser download flow
        'Content-Disposition': 'inline; filename="landmark-coords.json"',
      },
    },
  );
}
