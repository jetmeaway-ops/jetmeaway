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

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
