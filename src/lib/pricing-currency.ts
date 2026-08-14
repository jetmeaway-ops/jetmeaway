/**
 * The one currency our pricing layer can actually produce.
 *
 * `getHotels()` in src/lib/liteapi.ts force-converts every supplier response
 * into GBP (`FX_TO_GBP`, then `finalCurrency = 'GBP'`) before it returns, so
 * every hotel price the site renders or stores is sterling — regardless of the
 * `currency` asked for upstream. LiteAPI itself also ignores the requested
 * currency for some markets, which is exactly why that conversion exists.
 *
 * This module exists so that invariant is stated in ONE place instead of being
 * re-derived (or forgotten) at each call site. A `?currency=INR` in the URL used
 * to be echoed straight onto the page as a label, which printed "INR 412.50"
 * over a pound amount, POSTed that currency into the stored booking, and
 * published it as schema.org `priceCurrency`.
 *
 * When the pricing layer can genuinely return another currency, add it to
 * `PRICEABLE_CURRENCIES` — and only then. Widening this list without teaching
 * liteapi.ts to skip the FX conversion would just relabel pounds again.
 */

/** ISO-4217 codes we can genuinely quote a price in today. */
export const PRICEABLE_CURRENCIES: ReadonlySet<string> = new Set(['GBP']);

export const DEFAULT_CURRENCY = 'GBP';

/**
 * Clamp a requested currency to one we can actually price in.
 * Anything unsupported (or absent/malformed) falls back to GBP, because the
 * amount really is in GBP — labelling it otherwise would be a wrong price.
 */
export function normaliseDisplayCurrency(requested?: string | null): string {
  const code = (requested || '').trim().toUpperCase();
  return PRICEABLE_CURRENCIES.has(code) ? code : DEFAULT_CURRENCY;
}

/** Symbol for a currency we can price in; falls back to the bare code. */
export function currencyPrefix(code: string): string {
  switch (code) {
    case 'GBP':
      return '£';
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    default:
      return `${code} `;
  }
}
