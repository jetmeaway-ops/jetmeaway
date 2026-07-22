import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  COUNTRY_TO_LOCALE,
  DEFAULT_LOCALE,
  isActiveLocale,
  matchAcceptLanguage,
} from '@/i18n/config';

/* ═══════════════════════════════════════════════════════════════════════════
   Locale resolution proxy (Next 16 convention — `proxy`, the renamed
   `middleware`). Runs at the edge before render, <1ms: no fetches, no KV.

   Resolution order (owner decision 2026-07-17, browser-language-first):
     1. jma_locale cookie (explicit switcher choice)
     2. Accept-Language best match
     3. x-vercel-ip-country mapping
     4. 'en'

   The winner travels to the app as the `x-jma-locale` request header, read by
   src/i18n/request.ts (next-intl) and src/app/layout.tsx (<html lang/dir>).
   Bots send no cookie and usually en/no Accept-Language → they get English,
   so indexing/SEO is unchanged in Phase 1.
   ═══════════════════════════════════════════════════════════════════════════ */

export function proxy(request: NextRequest) {
  const cookieLocale = request.cookies.get('jma_locale')?.value;
  const locale = isActiveLocale(cookieLocale)
    ? cookieLocale
    : matchAcceptLanguage(request.headers.get('accept-language'))
      ?? COUNTRY_TO_LOCALE[request.headers.get('x-vercel-ip-country') || '']
      ?? DEFAULT_LOCALE;

  const headers = new Headers(request.headers);
  headers.set('x-jma-locale', locale);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Pages only — APIs, Next internals, and static files stay untouched.
  matcher: ['/((?!api|_next|admin|.*\\.(?:ico|png|jpg|jpeg|svg|webp|js|css|txt|xml|webmanifest)).*)'],
};
