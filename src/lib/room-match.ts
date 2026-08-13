/**
 * Match a LiteAPI *rate* row to the *room* record that carries its photos.
 *
 * WHY THIS EXISTS
 * LiteAPI returns room names from two endpoints in completely different
 * formats, and there is no shared id we can rely on:
 *
 *   /hotels/rates  →  "Classic Double room (full double bed) (bed type is
 *                      subject to availability)", "double or twin classic",
 *                      "classic room(1 king bed)", "run of house"
 *   /data/hotel    →  "Classic Room", "Deluxe View Room", "Park Suite"
 *
 * An exact lowercased-name lookup — what this codebase did previously —
 * matched only ~14% of rate rows against live data (51/357 rows over 10
 * London hotels). Every miss hid the "See room details & photos" button and
 * made the room modal show the hotel gallery instead of the room.
 *
 * NOT USING `roomMapping: true`
 * LiteAPI can return a `mappedRoomId` that joins exactly, but measured live it
 * collapses the response from ~200 rates to 5-9 and cuts visible rate rows by
 * ~85% (41 → 4 on one hotel). We would trade photos for inventory. Rejected.
 *
 * APPROACH
 * Token-overlap scoring. Strip parenthetical noise and generic hotel words,
 * then require that *every* catalogue token appears in the rate name
 * (containment === 1) before considering a match. That direction matters: the
 * rate name is the verbose one, so the short catalogue name should be fully
 * contained within it. Measured 14.3% → 73.4% on the same sample.
 */

/** Generic words that carry no room identity and would create false matches. */
const STOP = new Set([
  'room', 'rooms', 'bed', 'beds', 'bedroom', 'bedrooms',
  'with', 'and', 'or', 'the', 'a', 'an', 'in', 'of', 'for',
  'free', 'wifi', 'wi', 'fi',
  'subject', 'availability', 'type', 'is', 'to', 'size',
  'full', 'non', 'smoking', 'guests', 'guest',
  '1', '2', '3', '4',
  'includes', 'include', 'breakfast', 'only', 'board', 'inclusive', 'all', 'half',
]);

/** Lowercase, drop parenthetical asides, split to meaningful tokens. */
export function roomNameTokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ') // "(full double bed)", "(bed type is subject to availability)"
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((w) => w && !STOP.has(w));
}

/** Minimum blended score before we accept a fuzzy match. */
const SCORE_FLOOR = 0.5;

/**
 * Pick the catalogue room that best matches a rate row's room name.
 * Returns null when nothing clears the bar — callers must handle that and
 * fall back to hotel-level photos rather than showing a wrong room.
 */
export function bestRoomMatch<T extends { name: string }>(
  rateName: string,
  rooms: readonly T[],
): T | null {
  const rateTokens = new Set(roomNameTokens(rateName));
  if (rateTokens.size === 0) return null;

  let best: T | null = null;
  let bestScore = 0;

  for (const room of rooms) {
    const roomTokens = new Set(roomNameTokens(room.name));
    if (roomTokens.size === 0) continue;

    let intersection = 0;
    for (const w of roomTokens) if (rateTokens.has(w)) intersection++;

    // Every catalogue token must be present in the rate name. Without this,
    // "Deluxe Room" would match "Classic Room" on the shared token alone.
    const containment = intersection / roomTokens.size;
    if (containment < 1) continue;

    // Tie-break toward the room that explains more of the rate name, so
    // "Classic Room" beats a bare "Room" for "classic room(1 king bed)".
    const precision = intersection / rateTokens.size;
    const score = containment * 0.75 + precision * 0.25;

    if (score > bestScore) {
      bestScore = score;
      best = room;
    }
  }

  return bestScore >= SCORE_FLOOR ? best : null;
}

/**
 * Build a resolver that tries the exact-name map first (fast path, and exactly
 * what the old behaviour did) then falls back to fuzzy matching. Results are
 * memoised per rate name because a hotel can render 40+ rate rows against 30
 * catalogue rooms on every render.
 */
export function createRoomResolver<T extends { name: string }>(
  rooms: readonly T[],
): (rateName: string) => T | null {
  const exact = new Map<string, T>();
  for (const r of rooms) {
    const key = r.name.toLowerCase().trim();
    if (key && !exact.has(key)) exact.set(key, r);
  }

  const memo = new Map<string, T | null>();

  return (rateName: string): T | null => {
    const raw = (rateName || '').trim();
    if (!raw) return null;

    const cached = memo.get(raw);
    if (cached !== undefined) return cached;

    const resolved = exact.get(raw.toLowerCase()) ?? bestRoomMatch(raw, rooms);
    memo.set(raw, resolved);
    return resolved;
  };
}
