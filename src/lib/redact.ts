/**
 * Sensitive-data redactor for logging/error reporting.
 *
 * Walks any value recursively and:
 *   1. Nukes entire `card` / `payment` parent values (replaced with [REDACTED]).
 *   2. Masks values under sensitive keys (card number, CVC, security code,
 *      AGENCY_CARD_*, password/token/secret).
 *   3. Scans plain strings for card-number-like patterns (13-19 digits with
 *      optional separators) and masks them inline. This catches the case
 *      where a card number ends up in an error message string.
 *
 * Used at the boundary in `report-bug.ts` and `sentry-edge.ts` so no caller
 * has to remember to redact. Defence at the entry point, not at every site.
 *
 * Design notes:
 *  - Returns a deep clone — never mutates input.
 *  - Depth cap (20) as a safety net against pathological cycles.
 *  - Card-number visible-last-4 masking is intentionally weak ("****") since
 *    even the last 4 in logs is risky if combined with other info. We mask
 *    the whole digit string.
 */

const MAX_DEPTH = 20;

/**
 * Keys whose ENTIRE value should be nuked (case-insensitive whole-name match).
 * These are object fields that, by convention, contain only sensitive data —
 * e.g. `card: { number, cvc, exp }` or `payment: { card, transactionType }`.
 */
const NUKE_PARENT_KEYS = new Set([
  'card',
  'payment',
  'paymentmethod',
  'payment_method',
  'cardholder',
]);

/**
 * Keys whose value should be masked (case-insensitive partial match).
 * Catches sensitive fields wherever they appear in an object tree.
 */
const SENSITIVE_KEY_PATTERN =
  /(card.*number|cardnumber|^number$|cvc|cvv|cvc2|security.*code|agency.?card|^pin$|password|secret|api.?key|^token$|bearer)/i;

/**
 * Inline pattern that matches card-number-like sequences in plain text.
 * Format: 4 digits + optional separator (space, dash) + 4 digits + sep + 4 + sep + 1-7 digits.
 * Catches "4111 1111 1111 1111", "4111-1111-1111-1111", "4111111111111111".
 */
const INLINE_CARD_PATTERN = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{1,7}\b/g;

const REDACTED = '[REDACTED]';
const MASKED_CARD = '**** **** **** ****';

/**
 * Recursively redact sensitive data from any value. Returns a deep clone.
 */
export function deepRedact<T>(input: T, depth: number = 0): T {
  if (depth > MAX_DEPTH) return '[MAX_DEPTH]' as unknown as T;

  if (input === null || input === undefined) return input;

  // Primitive strings: scan for inline card-number patterns.
  if (typeof input === 'string') {
    return maskInlineCards(input) as unknown as T;
  }

  // Other primitives pass through.
  if (typeof input !== 'object') return input;

  // Arrays: recurse into each element.
  if (Array.isArray(input)) {
    return input.map((item) => deepRedact(item, depth + 1)) as unknown as T;
  }

  // Objects: per-key inspection.
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(input as Record<string, unknown>)) {
    const keyLower = key.toLowerCase();

    if (NUKE_PARENT_KEYS.has(keyLower)) {
      out[key] = REDACTED;
      continue;
    }

    if (SENSITIVE_KEY_PATTERN.test(key)) {
      out[key] = maskSensitiveValue(val);
      continue;
    }

    out[key] = deepRedact(val, depth + 1);
  }
  return out as unknown as T;
}

/**
 * Mask a value that lives under a sensitive key. Always returns a string.
 * Card numbers (15-19 digits) → "**** **** **** ****".
 * Everything else (CVCs, names, tokens, etc.) → "[REDACTED]".
 */
function maskSensitiveValue(val: unknown): string {
  if (val === null || val === undefined) return REDACTED;
  const s = String(val);
  if (/^\d{15,19}$/.test(s)) return MASKED_CARD;
  return REDACTED;
}

/**
 * Replace inline card-number-like sequences in a string with a mask.
 * Conservative: only matches patterns that look like real card formatting
 * (4-4-4-1..7 digit blocks). Won't false-positive on regular-length IDs.
 */
function maskInlineCards(str: string): string {
  return str.replace(INLINE_CARD_PATTERN, MASKED_CARD);
}
