'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Main category nav — shown on desktop and in the mobile sticky bar.
 * "Discover" is a dropdown (children defined in DISCOVER_ITEMS below).
 * On mobile, tapping "Discover" in the sticky bar jumps straight to
 * /explore rather than opening a dropdown.
 */
const NAV = [
  { href: '/hotels', label: 'Hotels', icon: '🏨' },
  { href: '/packages', label: 'Packages', icon: '📦' },
  { href: '/cars', label: 'Car Hire', icon: '🚗' },
];

/** Children of the Discover dropdown on desktop.
 *  Flights & eSIM live here now — they're lower-priority than the
 *  hotel-driven booking flow but still need to be one click away. */
const DISCOVER_ITEMS = [
  { href: '/flights', label: 'Flights', icon: '✈' },
  { href: '/esim', label: 'eSIM', icon: '📱' },
  { href: '/explore', label: 'Destinations', icon: '🧭' },
  { href: '/about', label: 'About Us', icon: 'ℹ️' },
];

/** Mobile sticky category bar — same as NAV plus a flat Discover link. */
const MOBILE_STICKY_NAV = [
  ...NAV,
  { href: '/explore', label: 'Discover', icon: '🧭' },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  const discoverActive = DISCOVER_ITEMS.some(
    item => pathname === item.href || pathname.startsWith(item.href + '/'),
  );

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-[100] p-3.5 px-5">
        <div className="max-w-[1200px] mx-auto flex justify-between items-center backdrop-blur-[20px] saturate-[1.8] bg-white/[.78] border border-white/30 rounded-3xl px-5 py-3 shadow-[0_32px_64px_-15px_rgba(0,0,0,0.1)]">

          {/* LEFT: Blog link + Logo (Blog sits LEFT of the logo for content-first prominence) */}
          <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
            <Link
              href="/blog"
              className={`flex items-center gap-1 px-2 md:px-2.5 py-2 rounded-xl text-[.68rem] md:text-[.72rem] font-extrabold uppercase tracking-[1.2px] transition-all ${
                isActive('/blog')
                  ? 'bg-[#0066FF] text-white shadow-[0_4px_12px_rgba(0,102,255,0.3)]'
                  : 'text-slate-500 hover:text-[#0066FF] hover:bg-blue-50'
              }`}
              aria-label="JetMeAway Blog"
            >
              <span className="text-[.9rem] leading-none">📝</span>
              <span>Blog</span>
            </Link>
            <Link href="/" className="flex-shrink-0" aria-label="JetMeAway home">
              <img src="/jetmeaway-logo.png" alt="Jetmeaway" className="h-9 rounded-none" />
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
                      : 'text-slate-400 hover:text-[#0066FF] hover:bg-blue-50'
                  }`}
                >
                  <span className="text-sm leading-none">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}

            {/* Discover dropdown (hover on desktop, focus-within for keyboard) */}
            <div className="relative group">
              <button
                type="button"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[.72rem] font-extrabold uppercase tracking-[1.2px] transition-all ${
                  discoverActive
                    ? 'bg-[#0066FF] text-white shadow-[0_4px_12px_rgba(0,102,255,0.3)]'
                    : 'text-slate-400 group-hover:text-[#0066FF] group-hover:bg-blue-50'
                }`}
                aria-haspopup="true"
                aria-expanded="false"
              >
                <span className="text-sm leading-none">🧭</span>
                Discover
                <span className="text-[.6rem] opacity-60">▾</span>
              </button>
              {/* Dropdown panel. pt-1 creates a hover-bridge so the mouse can move from button → panel without leaving the group hover zone. */}
              <div className="absolute top-full right-0 pt-1 invisible opacity-0 translate-y-1 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 focus-within:visible focus-within:opacity-100 focus-within:translate-y-0 transition-all duration-150 min-w-[180px]">
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
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </nav>

          {/* RIGHT: Currency badge + Contact button + mobile hamburger */}
          <div className="flex items-center gap-2">
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
            <Link
              href="/contact"
              className="hidden md:inline-flex bg-[#0F1119] text-white px-4 py-2.5 rounded-xl font-bold text-[.78rem] transition-all hover:bg-[#0066FF] shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
            >
              Contact
            </Link>
            {/* Hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
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
                    : 'text-slate-500 bg-slate-50 hover:text-[#0066FF] hover:bg-blue-50'
                }`}
              >
                <span className="text-xs">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile overlay */}
      {mobileOpen && <div className="fixed inset-0 bg-[#0F1119]/30 z-[150]" onClick={() => setMobileOpen(false)} />}

      {/* Mobile slide-out menu */}
      <div className={`fixed top-0 ${mobileOpen ? 'right-0' : '-right-full'} w-[300px] h-full bg-white z-[200] pt-20 px-5 transition-all duration-300 border-l border-slate-100 flex flex-col overflow-y-auto`}>
        <p className="text-[.6rem] font-extrabold uppercase tracking-[2.5px] text-[#8E95A9] mb-3 px-2">Compare</p>
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
                {item.label}
              </Link>
            );
          })}
        </div>

        <p className="text-[.6rem] font-extrabold uppercase tracking-[2.5px] text-[#8E95A9] mb-3 px-2">Discover</p>
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
              {item.label}
            </Link>
          ))}
        </div>

        <p className="text-[.6rem] font-extrabold uppercase tracking-[2.5px] text-[#8E95A9] mb-3 px-2">Company</p>
        <div className="flex flex-col gap-0.5">
          {[
            { href: '/', label: 'Home' },
            { href: '/contact', label: 'Contact' },
            { href: '/privacy', label: 'Privacy Policy' },
            { href: '/terms', label: 'Terms of Service' },
          ].map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="block px-4 py-3 text-slate-600 font-semibold rounded-lg text-[.85rem] transition-all hover:text-[#0066FF] hover:bg-blue-50"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
