/**
 * Per-room occupancy — single source of truth for the new picker, the
 * URL serialisation, and the API ingestion.
 *
 * Shape:
 *   Room   = { adults: number; childAges: number[] }
 *   Rooms  = Room[]    (length 1-5)
 *
 * URL format (new):
 *   occ=2-6/1-8/1-15
 *     • slash-separated per room
 *     • dash-separated within: adults first, then each child's age
 *     • room with no kids: `2`
 *
 * URL format (legacy, kept for back-compat):
 *   adults=4&children=2&rooms=2&childrenAges=6,8
 *   → split children into the FIRST room only (matches old server behaviour)
 *
 * Why this shape:
 *   - Matches what LiteAPI/DOTW already accept upstream
 *   - Avoids the "even-split derive" guesswork that caused 2A/3R → [1,1,1] = 3A
 *   - Customer keeps full control over which kids are in which room
 *
 * Caps:
 *   - Per-room: 4 adults (LiteAPI / DOTW hard ceiling on most properties)
 *   - Per-room: 4 children (same)
 *   - Total guests across rooms: 9 (UX cap, picker won't allow more)
 *   - Rooms: 5 (UX cap)
 *   - Child age: 0-17 inclusive
 */

export interface Room {
  adults: number;
  childAges: number[]; // length === number of children
}

export const MAX_ROOMS = 5;
export const MAX_GUESTS_TOTAL = 9;
export const MAX_ADULTS_PER_ROOM = 4;
export const MAX_CHILDREN_PER_ROOM = 4;
export const DEFAULT_CHILD_AGE = 8;

/** A clean default for "Add another room" — 2 adults, no kids. */
export function newRoom(): Room {
  return { adults: 2, childAges: [] };
}

/** Clamp a single room to the per-room caps. */
export function clampRoom(r: Room): Room {
  const adults = Math.max(1, Math.min(MAX_ADULTS_PER_ROOM, Math.floor(r.adults || 0)));
  const ages = (r.childAges || [])
    .slice(0, MAX_CHILDREN_PER_ROOM)
    .map((a) => {
      const n = Math.floor(Number(a));
      if (Number.isNaN(n)) return DEFAULT_CHILD_AGE;
      return Math.max(0, Math.min(17, n));
    });
  return { adults, childAges: ages };
}

/** Clamp a Rooms array to all UX caps. Always returns at least 1 room. */
export function clampRooms(rooms: Room[]): Room[] {
  if (!rooms || rooms.length === 0) return [newRoom()];
  let clean = rooms.slice(0, MAX_ROOMS).map(clampRoom);
  // Total-guests cap: trim from the LAST room first so the customer's
  // earlier choices stay intact when they hit the cap.
  let totalGuests = clean.reduce((s, r) => s + r.adults + r.childAges.length, 0);
  while (totalGuests > MAX_GUESTS_TOTAL && clean.length > 0) {
    const last = clean[clean.length - 1];
    if (last.childAges.length > 0) {
      last.childAges.pop();
    } else if (last.adults > 1) {
      last.adults -= 1;
    } else if (clean.length > 1) {
      clean.pop();
    } else {
      // Single room with 1 adult and 0 kids: cap is met by definition.
      break;
    }
    totalGuests = clean.reduce((s, r) => s + r.adults + r.childAges.length, 0);
  }
  if (clean.length === 0) clean = [newRoom()];
  return clean;
}

/** Total adults + children across all rooms. */
export function totalGuests(rooms: Room[]): number {
  return rooms.reduce((s, r) => s + r.adults + r.childAges.length, 0);
}

/** Encode rooms to the new `occ=` URL format. */
export function encodeOccupancy(rooms: Room[]): string {
  return rooms
    .map((r) => [r.adults, ...r.childAges].join('-'))
    .join('/');
}

/** Decode an `occ=` URL value. Returns null if malformed (caller falls back). */
export function decodeOccupancy(occ: string | null | undefined): Room[] | null {
  if (!occ || typeof occ !== 'string') return null;
  const parts = occ.split('/').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  const rooms: Room[] = [];
  for (const part of parts) {
    const tokens = part.split('-').map((t) => t.trim()).filter((t) => t !== '');
    if (tokens.length === 0) return null;
    const nums = tokens.map((t) => Number(t));
    if (nums.some((n) => Number.isNaN(n))) return null;
    const [adults, ...ages] = nums;
    rooms.push({ adults, childAges: ages });
  }
  return clampRooms(rooms);
}

/**
 * Legacy decoder — read `adults=`, `children=`, `rooms=`, `childrenAges=`
 * from URL params and produce a Rooms array. Children are placed in
 * the FIRST room only (matches the old server-side behaviour). This
 * means existing affiliate links / sticky-search / blog deep-links
 * keep working — the customer just sees the per-room picker the next
 * time they open the dropdown and can rebalance if they want.
 */
export function decodeLegacy(params: {
  adults?: string | null;
  children?: string | null;
  rooms?: string | null;
  childrenAges?: string | null;
}): Room[] {
  const adults = Math.max(1, parseInt(params.adults || '2', 10) || 2);
  const childCount = Math.max(0, parseInt(params.children || '0', 10) || 0);
  const roomsN = Math.max(1, Math.min(MAX_ROOMS, parseInt(params.rooms || '1', 10) || 1));
  const ages = (params.childrenAges || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s))
    .filter((n) => !Number.isNaN(n))
    .slice(0, childCount)
    .map((n) => Math.max(0, Math.min(17, n)));
  while (ages.length < childCount) ages.push(DEFAULT_CHILD_AGE);

  // Distribute adults across rooms (even split, last room gets remainder).
  const roomCount = Math.min(roomsN, adults);
  const out: Room[] = [];
  let remaining = adults;
  for (let i = 0; i < roomCount; i++) {
    const a =
      i === roomCount - 1
        ? remaining
        : Math.max(1, Math.floor(adults / roomCount));
    out.push({ adults: a, childAges: i === 0 ? ages : [] });
    remaining -= a;
  }
  return clampRooms(out);
}

/** Decode either form. Tries `occ=` first, falls back to legacy params. */
export function decodeFromParams(params: {
  occ?: string | null;
  adults?: string | null;
  children?: string | null;
  rooms?: string | null;
  childrenAges?: string | null;
}): Room[] {
  const fresh = decodeOccupancy(params.occ);
  if (fresh) return fresh;
  return decodeLegacy(params);
}

/** Aggregate rooms back to the legacy flat shape — useful for the API
 *  during the back-compat window AND for affiliate redirect builders
 *  that don't support per-room (Trip.com flattens crn=N + adult=total). */
export function aggregate(rooms: Room[]): {
  adults: number;
  children: number;
  childAges: number[];
  rooms: number;
} {
  return {
    adults: rooms.reduce((s, r) => s + r.adults, 0),
    children: rooms.reduce((s, r) => s + r.childAges.length, 0),
    childAges: rooms.flatMap((r) => r.childAges),
    rooms: rooms.length,
  };
}
