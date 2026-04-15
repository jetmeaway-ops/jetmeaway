/**
 * Giata ID resolver — the canonical cross-supplier hotel key.
 *
 * Most travel wholesalers (Webbeds/DOTW included) tag inventory with Giata
 * IDs natively. LiteAPI does NOT expose Giata directly, so until Phase 2 of
 * the Scout blueprint lands we fall back to normalised-name matching for
 * LiteAPI offers and only use Giata de-dupe when BOTH sides of a match
 * expose it.
 *
 * Keeping this as a thin stub today — full mapping table goes in when we
 * licence the Giata multicodes feed (see `docs/scout-implementation-plan.md`
 * Phase 2). Once live, back this with a Vercel KV cache (key:
 * `giata:liteapi:{hotelId}`) with a 30-day TTL.
 */

export type SupplierId = 'liteapi' | 'dotw' | 'ratehawk' | 'webbeds';

/**
 * Resolve a supplier's hotel ID to a Giata ID.
 *
 * - `dotw` / `webbeds`: returns the Giata ID if the caller already has it
 *   (DOTW embeds it directly in the search response — see
 *   `src/lib/suppliers/dotw-adapter.ts`). This function just passes through.
 * - `liteapi`: placeholder until Phase 2. Returns null.
 * - `ratehawk`: RateHawk affiliate response does not expose Giata. Null.
 */
export async function resolveGiataId(
  supplier: SupplierId,
  supplierHotelId: string,
  opts?: { embeddedGiataId?: string | null },
): Promise<string | null> {
  if (opts?.embeddedGiataId) return String(opts.embeddedGiataId);

  // DOTW / Webbeds embed Giata natively; the caller should always pass it
  // via `embeddedGiataId`. Defensive null return if they didn't.
  if (supplier === 'dotw' || supplier === 'webbeds') return null;

  // LiteAPI + RateHawk: no mapping yet.
  // TODO(phase-2): wire Giata multicodes feed here and cache in Vercel KV.
  return null;
}

/**
 * De-dupe key builder for merging cross-supplier offers.
 *
 * Prefers Giata when both sides expose it; otherwise falls back to a
 * normalised hotel name. Lets the existing name-based matcher keep working
 * for LiteAPI-only rows until Giata coverage is complete.
 */
export function dedupeKey(
  giataId: string | null | undefined,
  hotelName: string,
): string {
  if (giataId) return `giata:${giataId}`;
  return `name:${normaliseHotelName(hotelName)}`;
}

function normaliseHotelName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[-–—]/g, ' ')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
