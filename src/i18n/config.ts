/* ═══════════════════════════════════════════════════════════════════════════
   i18n configuration — single source of truth for supported locales.

   Phase 1 rollout (2026-07-17, owner decision): ship ARABIC first — it's the
   hardest case (RTL) so everything after it is easier. The full agreed set is
   12 locales (see plans/clever-mixing-gadget.md); add each to ACTIVE_LOCALES
   as its catalog lands in src/messages/.

   Detection order (resolved in src/proxy.ts):
     1. jma_locale cookie   — the user's explicit choice via the Header switcher
     2. Accept-Language     — browser/device preference (owner chose this over
                              strict country: a German phone gets German anywhere)
     3. x-vercel-ip-country — geography fallback
     4. 'en'
   ═══════════════════════════════════════════════════════════════════════════ */

/** Locales with a shipped message catalog. ORDER = switcher display order. */
export const ACTIVE_LOCALES = ['en', 'ar', 'ur', 'hi', 'de', 'zh', 'ru', 'es', 'fr', 'tr', 'it', 'ja', 'sw'] as const;

export type Locale = (typeof ACTIVE_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/** Right-to-left locales — drives <html dir>. (ur joins when it ships.) */
export const RTL_LOCALES: ReadonlySet<string> = new Set(['ar', 'ur']);

/** Native-script labels for the Header switcher. */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  ar: 'العربية',
  ur: 'اردو',
  hi: 'हिन्दी',
  de: 'Deutsch',
  zh: '简体中文',
  ru: 'Русский',
  es: 'Español',
  fr: 'Français',
  tr: 'Türkçe',
  it: 'Italiano',
  ja: '日本語',
  sw: 'Kiswahili',
};

/** ISO country → locale fallback (only used when Accept-Language gives no
 *  supported match). Arabic-speaking countries per the Phase-1 rollout. */
export const COUNTRY_TO_LOCALE: Record<string, Locale> = {
  SA: 'ar', AE: 'ar', EG: 'ar', QA: 'ar', KW: 'ar', BH: 'ar', OM: 'ar',
  JO: 'ar', LB: 'ar', IQ: 'ar', SY: 'ar', YE: 'ar', PS: 'ar', LY: 'ar',
  DZ: 'ar', TN: 'ar', MA: 'ar', SD: 'ar', MR: 'ar',
  PK: 'ur',
  IN: 'hi',
  DE: 'de', AT: 'de', CH: 'de',
  CN: 'zh', HK: 'zh', TW: 'zh', SG: 'zh',
  RU: 'ru', BY: 'ru', KZ: 'ru', KG: 'ru',
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es', VE: 'es',
  FR: 'fr', BE: 'fr', LU: 'fr', MC: 'fr', SN: 'fr', CI: 'fr',
  TR: 'tr',
  IT: 'it',
  JP: 'ja',
  // Swahili-speaking East Africa. Only countries where Swahili is an official
  // or national language — DR Congo is deliberately absent (French is official
  // there and Swahili is regional, so a blanket mapping would mislabel most
  // visitors). This map is the LAST resort anyway: Accept-Language is checked
  // first, so anyone whose phone is set to English still gets English.
  KE: 'sw', TZ: 'sw', UG: 'sw', RW: 'sw',
};

export function isActiveLocale(x: string | undefined | null): x is Locale {
  return !!x && (ACTIVE_LOCALES as readonly string[]).includes(x);
}

/**
 * Locales whose blog posts are translated and served on their own path
 * (content/posts/<locale>/ → /<locale>/blog). Distinct from ACTIVE_LOCALES:
 * every locale above translates the UI chrome, but only these have a
 * translated article corpus.
 *
 * Kept here rather than in src/lib/blog.ts because Header and Footer are
 * client components — importing the blog helper would pull `node:fs` into
 * the browser bundle. Add a locale here when its corpus ships.
 */
export const BLOG_LOCALES: ReadonlySet<string> = new Set(['de', 'es']);

/**
 * Where the "Blog" nav link should point for a locale. German readers get
 * the German blog; everyone else keeps the English one, including locales
 * whose UI is translated but whose posts are not.
 */
export function blogHref(locale: string | undefined | null): string {
  return locale && BLOG_LOCALES.has(locale) ? `/${locale}/blog` : '/blog';
}

/** Pick the best supported locale from an Accept-Language header value. */
export function matchAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;
  // "ar-SA,ar;q=0.9,en;q=0.8" → ordered base codes ["ar", "en"]
  const ordered = header
    .split(',')
    .map((part) => {
      const [tag, qPart] = part.trim().split(';');
      const q = qPart?.startsWith('q=') ? parseFloat(qPart.slice(2)) : 1;
      return { base: tag.trim().toLowerCase().split('-')[0], q: Number.isFinite(q) ? q : 0 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { base } of ordered) {
    if (isActiveLocale(base)) return base;
  }
  return null;
}
