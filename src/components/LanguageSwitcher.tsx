'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ACTIVE_LOCALES, LOCALE_LABELS, type Locale } from '@/i18n/config';

/* ═══════════════════════════════════════════════════════════════════════════
   Header language switcher (Phase 1, 2026-07-17 — English + Arabic).

   Auto-detection (proxy.ts) picks the visitor's language from their browser;
   this switcher is the always-available manual override the plan requires.
   Choosing a language writes the jma_locale cookie (1 year) and reloads —
   the proxy then honours the cookie above everything else.

   Styled to sit beside the GBP chip in Header. New locales appear here
   automatically when added to ACTIVE_LOCALES.
   ═══════════════════════════════════════════════════════════════════════════ */

export default function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations('common');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const choose = (next: Locale) => {
    if (next === locale) { setOpen(false); return; }
    document.cookie = `jma_locale=${next}; path=/; max-age=31536000; samesite=lax`;
    window.location.reload();
  };

  // Hide entirely while only English is active (nothing to switch to).
  if (ACTIVE_LOCALES.length < 2) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[.72rem] font-extrabold uppercase tracking-[1px] text-slate-500 bg-slate-50 border border-slate-200 hover:bg-white hover:text-[#0a1628] transition-colors"
        aria-label={t('language')}
        aria-expanded={open}
      >
        <i className="fa-solid fa-globe text-[.8rem]" aria-hidden="true" />
        <span className="hidden md:inline">{LOCALE_LABELS[locale as Locale] ?? locale.toUpperCase()}</span>
      </button>
      {open && (
        <div className="absolute end-0 top-full mt-1.5 z-[210] min-w-[160px] bg-white border border-[#E8ECF4] rounded-2xl shadow-2xl overflow-hidden py-1">
          {ACTIVE_LOCALES.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => choose(code)}
              className={`w-full text-start px-4 py-2.5 text-[.82rem] font-bold transition-colors hover:bg-blue-50 ${
                code === locale ? 'text-[#0066FF] bg-blue-50/60' : 'text-[#1A1D2B]'
              }`}
            >
              {LOCALE_LABELS[code]}
              {code === locale && <i className="fa-solid fa-check ms-2 text-[.68rem]" aria-hidden="true" />}
            </button>
          ))}
          <div className="px-4 pt-1.5 pb-2 text-[.62rem] font-semibold text-[#8E95A9] border-t border-[#F1F3F7]">
            {t('pricesInGbp')}
          </div>
        </div>
      )}
    </div>
  );
}
