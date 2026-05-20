/**
 * Local-timezone date helpers.
 *
 * Search forms must serialise the picked date from its LOCAL calendar parts.
 * `Date.prototype.toISOString()` converts to UTC first, so a date created at
 * local midnight rolls back to the previous day in any timezone ahead of UTC
 * (e.g. UK summer time / BST = UTC+1) — the user picks the 21st and the web
 * receives the 20th. These helpers keep the calendar day the user actually
 * tapped.
 */

/** Format a Date as `YYYY-MM-DD` using LOCAL calendar parts (no UTC shift). */
export function toLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse a `YYYY-MM-DD` string into a Date at LOCAL midnight (no UTC shift). */
export function fromLocalISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
