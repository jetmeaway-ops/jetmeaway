import { getRequestConfig } from 'next-intl/server';
import { headers } from 'next/headers';
import { DEFAULT_LOCALE, isActiveLocale } from './config';

/* next-intl request config (no-URL-routing mode). The locale was resolved in
   src/proxy.ts and arrives as the x-jma-locale header; we load that locale's
   catalog only — a visitor never downloads other languages. */
export default getRequestConfig(async () => {
  const h = await headers();
  const fromProxy = h.get('x-jma-locale');
  const locale = isActiveLocale(fromProxy) ? fromProxy : DEFAULT_LOCALE;

  // English is the base layer: any key not yet translated in `locale` shows
  // the English string instead of a raw key path. This makes incremental
  // translation safe — a half-translated locale never renders broken keys.
  const en = (await import('../messages/en.json')).default;
  const localeMessages =
    locale === DEFAULT_LOCALE ? en : (await import(`../messages/${locale}.json`)).default;

  return {
    locale,
    messages: deepMerge(en, localeMessages),
  };
});

/** Deep-merge: overlay `over` on `base`, recursing into plain objects so a
 *  partially-translated namespace inherits English for any missing leaf. */
function deepMerge(base: Record<string, unknown>, over: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(over)) {
    const b = out[k];
    if (v && typeof v === 'object' && !Array.isArray(v) && b && typeof b === 'object' && !Array.isArray(b)) {
      out[k] = deepMerge(b as Record<string, unknown>, v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}
