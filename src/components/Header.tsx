'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useTranslations } from 'next-intl';

/**
 * Main category nav — shown on desktop and in the mobile sticky bar.
 * "Discover" is a dropdown (children defined in DISCOVER_ITEMS below).
 * On mobile, tapping "Discover" in the sticky bar jumps straight to
 * /explore rather than opening a dropdown.
 */
/* Labels are next-intl keys under the `header` namespace (src/messages/*.json)
   so the nav renders in the visitor's language. */
const NAV = [
  { href: '/hotels', labelKey: 'nav.hotels', icon: '🏨' },
  { href: '/flights', labelKey: 'nav.flights', icon: '✈' },
  { href: '/packages', labelKey: 'nav.packages', icon: '📦' },
] as const;

/** Children of the Discover dropdown on desktop.
 *  Flights & eSIM live here now — they're lower-priority than the
 *  hotel-driven booking flow but still need to be one click away. */
const DISCOVER_ITEMS = [
  { href: '/explore', labelKey: 'nav.activities', icon: '🎟️' },
  { href: '/cars', labelKey: 'nav.carHire', icon: '🚗' },
  { href: '/esim', labelKey: 'nav.esim', icon: '📱' },
  { href: '/destinations', labelKey: 'nav.destinations', icon: '🧭' },
  { href: '/about', labelKey: 'nav.aboutUs', icon: 'ℹ️' },
] as const;

/** Mobile sticky category bar — same as NAV plus a flat Discover link. */
const MOBILE_STICKY_NAV = [
  ...NAV,
  { href: '/explore', labelKey: 'nav.discover', icon: '🧭' },
] as const;

export default function Header() {
  const t = useTranslations('header');
  const [mobileOpen, setMobileOpen] = useState(false);
  // Discover dropdown — needs to work on touch devices, not just hover.
  // The old pure-CSS group-hover approach broke on iPad Air landscape
  // (≥lg breakpoint, no real hover) and any Windows touchscreen. Now the
  // button toggles open state on click; we keep group-hover as a
  // secondary affordance for true mouse-only devices.
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const discoverRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close Discover when clicking outside it (touch/click flow).
  useEffect(() => {
    if (!discoverOpen) return;
    const handler = (e: MouseEvent) => {
      if (discoverRef.current && !discoverRef.current.contains(e.target as Node)) {
        setDiscoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [discoverOpen]);

  // Close Discover when route changes (after a Link navigation).
  useEffect(() => { setDiscoverOpen(false); }, [pathname]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  const discoverActive = DISCOVER_ITEMS.some(
    item => pathname === item.href || pathname.startsWith(item.href + '/'),
  );

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-[100] p-3.5 px-5">
        {/* Glassmorphism (backdrop-blur + saturate) is GPU-expensive on
            mobile — repaints every scroll frame and was the dominant
            LCP/Speed Index drag on PageSpeed. We now keep the glass look
            on md+ and serve mobile a flat, opaque white pill that paints
            in zero milliseconds. Visually almost identical at thumb-zoom. */}
        <div className="max-w-[1200px] mx-auto flex justify-between items-center bg-white border border-slate-200/70 md:bg-white/[.78] md:border-white/30 md:backdrop-blur-[20px] md:saturate-[1.8] rounded-3xl px-5 py-3 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.12)] md:shadow-[0_32px_64px_-15px_rgba(0,0,0,0.1)]">

          {/* LEFT: Blog link + Logo (Blog sits LEFT of the logo for content-first prominence) */}
          <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
            <Link
              href="/blog"
              className={`flex items-center gap-1 px-2 md:px-2.5 py-2 rounded-xl text-[.68rem] md:text-[.72rem] font-extrabold uppercase tracking-[1.2px] transition-all ${
                isActive('/blog')
                  ? 'bg-[#0066FF] text-white shadow-[0_4px_12px_rgba(0,102,255,0.3)]'
                  : 'text-slate-700 hover:text-[#0066FF] hover:bg-blue-50'
              }`}
              aria-label="JetMeAway Blog"
            >
              <span className="text-[.9rem] leading-none">📝</span>
              <span>{t('nav.blog')}</span>
            </Link>
            <Link href="/" className="flex-shrink-0" aria-label="JetMeAway home">
              <Image
                src="/jetmeaway-logo.png"
                alt="Jetmeaway"
                className="h-9 w-auto rounded-none"
                width={141}
                height={36}
                priority
                fetchPriority="high"
              />
            </Link>
            <Link
              href="/account"
              className={`flex items-center gap-1 px-2 md:px-2.5 py-2 rounded-xl text-[.68rem] md:text-[.72rem] font-extrabold uppercase tracking-[1.2px] transition-all ${
                isActive('/account')
                  ? 'bg-[#FAF3E6] border border-[#E8D8A8] text-[#8a6d00]'
                  : 'text-slate-700 hover:text-[#0066FF] hover:bg-blue-50'
              }`}
              aria-label={t('nav.myTrips')}
            >
              <i className="fa-solid fa-suitcase-rolling text-[.85rem] leading-none" />
              <span>{t('nav.trips')}</span>
            </Link>
          </div>

          {/* CENTER: Desktop main nav */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {NAV.map(item => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[.72rem] font-extrabold uppercase tracking-[1.2px] transition-all ${
                    active
                      ? 'bg-[#0066FF] text-white shadow-[0_4px_12px_rgba(0,102,255,0.3)]'
                      : 'text-slate-700 hover:text-[#0066FF] hover:bg-blue-50'
                  }`}
                >
                  <span className="text-sm leading-none">{item.icon}</span>
                  {t(item.labelKey)}
                </Link>
              );
            })}

            {/* Discover dropdown (hover on desktop, focus-within for keyboard).
                Pure CSS reveal — no aria-expanded (we can't truthfully report a
                boolean we don't track). Treated as a plain navigation list of
                links, NOT a WAI-ARIA menu, so no role=menu / role=menuitem /
                aria-haspopup — those would require arrow-key handling we don't
                have. Screen readers announce it as "list of links" which is
                exactly what it is. */}
            <div ref={discoverRef} className="relative group">
              <button
                type="button"
                onClick={() => setDiscoverOpen(o => !o)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[.72rem] font-extrabold uppercase tracking-[1.2px] transition-all ${
                  discoverActive
                    ? 'bg-[#0066FF] text-white shadow-[0_4px_12px_rgba(0,102,255,0.3)]'
                    : 'text-slate-700 group-hover:text-[#0066FF] group-hover:bg-blue-50'
                }`}
                aria-controls="discover-menu"
                aria-expanded={discoverOpen}
                aria-haspopup="true"
              >
                <span className="text-sm leading-none" aria-hidden="true">🧭</span>
                {t('nav.discover')}
                <span className="text-[.6rem] opacity-60" aria-hidden="true">▾</span>
              </button>
              {/* Dropdown panel. pt-1 creates a hover-bridge so the mouse
                  can move from button → panel without leaving the group
                  hover zone. Click-state takes priority over hover, so a
                  touch-tap opens it cleanly while a desktop hover still
                  reveals it without requiring a click. */}
              <div
                id="discover-menu"
                className={`absolute top-full right-0 pt-1 transition-all duration-150 min-w-[180px] ${
                  discoverOpen
                    ? 'visible opacity-100 translate-y-0'
                    : 'invisible opacity-0 translate-y-1 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 focus-within:visible focus-within:opacity-100 focus-within:translate-y-0'
                }`}
              >
                <div className="bg-white border border-[#E8ECF4] rounded-2xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.18)] p-2">
                  {DISCOVER_ITEMS.map(item => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[.78rem] font-bold transition-all ${
                        isActive(item.href)
                          ? 'bg-[#0066FF] text-white'
                          : 'text-[#1A1D2B] hover:bg-blue-50 hover:text-[#0066FF]'
                      }`}
                    >
                      <span className="text-[.95rem]">{item.icon}</span>
                      {t(item.labelKey)}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </nav>

          {/* RIGHT: Language + currency badges + Contact button + mobile hamburger */}
          <div className="flex items-center gap-2">
            {/* Language switcher — auto-detected via proxy.ts, manual override here */}
            <LanguageSwitcher />
            {/* Currency / region badge — display-only for now (we only price in GBP).
                Union Jack is an inline SVG so it renders on Windows (which has no flag-emoji glyphs). */}
            <span
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[.72rem] font-extrabold uppercase tracking-[1px] text-slate-500 bg-slate-50 border border-slate-200"
              aria-label="Prices shown in British Pounds"
              title="Prices shown in GBP"
            >
              <svg viewBox="0 0 60 30" className="w-4 h-[10px] rounded-[1px] shrink-0" aria-hidden="true">
                <clipPath id="ukflag-clip"><rect width="60" height="30"/></clipPath>
                <clipPath id="ukflag-tl"><path d="M30 15h30v15zv15H0zH0V0zV0h30z"/></clipPath>
                <g clipPath="url(#ukflag-clip)">
                  <rect width="60" height="30" fill="#012169"/>
                  <path d="M0 0l60 30m0-30L0 30" stroke="#fff" strokeWidth="6"/>
                  <path d="M0 0l60 30m0-30L0 30" clipPath="url(#ukflag-tl)" stroke="#C8102E" strokeWidth="4"/>
                  <path d="M30 0v30M0 15h60" stroke="#fff" strokeWidth="10"/>
                  <path d="M30 0v30M0 15h60" stroke="#C8102E" strokeWidth="6"/>
                </g>
              </svg>
              GBP
            </span>
            {/* My Trips — always visible; /account redirects to the bookings
                list when signed in, otherwise shows the sign-in form. */}
            <Link
              href="/account"
              className={`hidden md:inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl font-bold text-[.76rem] transition-all ${
                isActive('/account')
                  ? 'bg-[#FAF3E6] border border-[#E8D8A8] text-[#8a6d00]'
                  : 'border border-[#E8ECF4] text-[#0a1628] hover:bg-[#FAF3E6] hover:border-[#E8D8A8]'
              }`}
              aria-label={t('nav.myTrips')}
            >
              <i className="fa-solid fa-suitcase-rolling text-[.78rem]" />
              {t('nav.myTrips')}
            </Link>
            <Link
              href="/contact"
              className="hidden md:inline-flex bg-[#0F1119] text-white px-4 py-2.5 rounded-xl font-bold text-[.78rem] transition-all hover:bg-[#0066FF] shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
            >
              {t('nav.contact')}
            </Link>
            {/* Hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? t('aria.closeMenu') : t('aria.openMenu')}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              className="lg:hidden flex flex-col gap-[5px] p-2.5"
            >
              <span className={`w-5 h-0.5 bg-[#0F1119] rounded-sm transition-all ${mobileOpen ? 'rotate-45 translate-y-[7px]' : ''}`}></span>
              <span className={`w-5 h-0.5 bg-[#0F1119] rounded-sm transition-all ${mobileOpen ? 'opacity-0' : ''}`}></span>
              <span className={`w-5 h-0.5 bg-[#0F1119] rounded-sm transition-all ${mobileOpen ? '-rotate-45 -translate-y-[7px]' : ''}`}></span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile sticky category bar (below the header on mobile) */}
      <nav
        className="lg:hidden fixed left-0 right-0 z-[101] bg-white border-b border-slate-200 shadow-md"
        style={{ top: '90px' }}
        aria-label={t('aria.mobileCategories')}
      >
        <div className="flex overflow-x-auto gap-1.5 px-3 py-2.5" style={{ scrollbarWidth: 'none' }}>
          {MOBILE_STICKY_NAV.map(item => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[.65rem] font-extrabold uppercase tracking-[0.8px] whitespace-nowrap transition-all flex-shrink-0 ${
                  active
                    ? 'bg-[#0066FF] text-white shadow-sm'
                    : 'text-slate-700 bg-slate-50 hover:text-[#0066FF] hover:bg-blue-50'
                }`}
              >
                <span className="text-xs">{item.icon}</span>
                {t(item.labelKey)}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile overlay */}
      {mobileOpen && <div className="fixed inset-0 bg-[#0F1119]/30 z-[150]" onClick={() => setMobileOpen(false)} />}

      {/* Mobile slide-out menu */}
      <div
        id="mobile-menu"
        role="dialog"
        aria-modal={mobileOpen ? 'true' : undefined}
        aria-label={t('aria.mainMenu')}
        aria-hidden={!mobileOpen}
        className={`fixed top-0 ${mobileOpen ? 'right-0' : '-right-full'} w-[300px] h-full bg-white z-[200] pt-20 px-5 transition-all duration-300 border-l border-slate-100 flex flex-col overflow-y-auto`}
      >
        <p className="text-[.6rem] font-extrabold uppercase tracking-[2.5px] text-[#5C6378] mb-3 px-2">{t('sections.compare')}</p>
        <div className="flex flex-col gap-0.5 mb-5">
          {NAV.map(item => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-[.9rem] transition-all ${
                  active
                    ? 'bg-[#0066FF] text-white'
                    : 'text-[#1A1D2B] hover:bg-blue-50 hover:text-[#0066FF]'
                }`}
              >
                <span className="text-lg w-6 text-center">{item.icon}</span>
                {t(item.labelKey)}
              </Link>
            );
          })}
        </div>

        <p className="text-[.6rem] font-extrabold uppercase tracking-[2.5px] text-[#5C6378] mb-3 px-2">{t('sections.discover')}</p>
        <div className="flex flex-col gap-0.5 mb-5">
          <Link
            href="/blog"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-[.9rem] transition-all ${
              isActive('/blog') ? 'bg-[#0066FF] text-white' : 'text-[#1A1D2B] hover:bg-blue-50 hover:text-[#0066FF]'
            }`}
          >
            <span className="text-lg w-6 text-center">📝</span>
            Blog
          </Link>
          {DISCOVER_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-[.9rem] transition-all ${
                isActive(item.href) ? 'bg-[#0066FF] text-white' : 'text-[#1A1D2B] hover:bg-blue-50 hover:text-[#0066FF]'
              }`}
            >
              <span className="text-lg w-6 text-center">{item.icon}</span>
              {t(item.labelKey)}
            </Link>
          ))}
        </div>

        {/* Mobile: My Trips — top of Company so it's easy to reach after the
            booking-related Compare / Discover stacks above. */}
        <p className="text-[.6rem] font-extrabold uppercase tracking-[2.5px] text-[#5C6378] mb-3 px-2">{t('sections.yourAccount')}</p>
        <div className="flex flex-col gap-0.5 mb-5">
          <Link
            href="/account"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-[.9rem] transition-all ${
              isActive('/account') ? 'bg-[#FAF3E6] text-[#8a6d00]' : 'text-[#1A1D2B] hover:bg-[#FAF3E6] hover:text-[#8a6d00]'
            }`}
          >
            <span className="text-lg w-6 text-center">🧳</span>
            {t('nav.myTrips')}
          </Link>
        </div>

        <p className="text-[.6rem] font-extrabold uppercase tracking-[2.5px] text-[#5C6378] mb-3 px-2">{t('sections.company')}</p>
        <div className="flex flex-col gap-0.5">
          {([
            { href: '/', labelKey: 'nav.home' },
            { href: '/contact', labelKey: 'nav.contact' },
            { href: '/privacy', labelKey: 'nav.privacyPolicy' },
            { href: '/terms', labelKey: 'nav.termsOfService' },
          ] as const).map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="block px-4 py-3 text-slate-600 font-semibold rounded-lg text-[.85rem] transition-all hover:text-[#0066FF] hover:bg-blue-50"
            >
              {t(item.labelKey)}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
