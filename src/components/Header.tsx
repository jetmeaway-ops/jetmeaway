'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/packages', label: 'Packages', icon: '📦' },
  { href: '/hotels', label: 'Hotels', icon: '🏨' },
  { href: '/cars', label: 'Car Hire', icon: '🚗' },
  { href: '/esim', label: 'eSIM', icon: '📱' },
  { href: '/flights', label: 'Flights', icon: '✈' },
  { href: '/explore', label: 'Explore', icon: '🧭' },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-[100] p-3.5 px-5">
        <div className="max-w-[1200px] mx-auto flex justify-between items-center backdrop-blur-[20px] saturate-[1.8] bg-white/[.78] border border-white/30 rounded-3xl px-5 py-3 shadow-[0_32px_64px_-15px_rgba(0,0,0,0.1)]">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <img src="/jetmeaway-logo.png" alt="Jetmeaway" className="h-8" />
          </Link>

          {/* Desktop category nav */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {NAV.map(item => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[.72rem] font-extrabold uppercase tracking-[1.2px] transition-all ${active ? 'bg-[#0066FF] text-white shadow-[0_4px_12px_rgba(0,102,255,0.3)]' : 'text-slate-400 hover:text-[#0066FF] hover:bg-blue-50'}`}>
                  <span className="text-sm leading-none">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <Link href="/contact" className="hidden md:inline-flex bg-[#0F1119] text-white px-4 py-2.5 rounded-xl font-bold text-[.78rem] transition-all hover:bg-[#0066FF] shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
              Contact
            </Link>
            {/* Hamburger */}
            <button onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu" className="lg:hidden flex flex-col gap-[5px] p-2.5">
              <span className={`w-5 h-0.5 bg-[#0F1119] rounded-sm transition-all ${mobileOpen ? 'rotate-45 translate-y-[7px]' : ''}`}></span>
              <span className={`w-5 h-0.5 bg-[#0F1119] rounded-sm transition-all ${mobileOpen ? 'opacity-0' : ''}`}></span>
              <span className={`w-5 h-0.5 bg-[#0F1119] rounded-sm transition-all ${mobileOpen ? '-rotate-45 -translate-y-[7px]' : ''}`}></span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile category bar — sits below the header glass bar */}
      <nav className="lg:hidden fixed left-0 right-0 z-[101] bg-white border-b border-slate-200 shadow-md" style={{ top: '90px' }}>
        <div className="flex overflow-x-auto gap-1.5 px-3 py-2.5" style={{ scrollbarWidth: 'none' }}>
          {NAV.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[.65rem] font-extrabold uppercase tracking-[0.8px] whitespace-nowrap transition-all flex-shrink-0 ${active ? 'bg-[#0066FF] text-white shadow-sm' : 'text-slate-500 bg-slate-50 hover:text-[#0066FF] hover:bg-blue-50'}`}>
                <span className="text-xs">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile overlay */}
      {mobileOpen && <div className="fixed inset-0 bg-[#0F1119]/30 z-[150]" onClick={() => setMobileOpen(false)} />}

      {/* Mobile menu */}
      <div className={`fixed top-0 ${mobileOpen ? 'right-0' : '-right-full'} w-[300px] h-full bg-white z-[200] pt-20 px-5 transition-all duration-300 border-l border-slate-100 flex flex-col overflow-y-auto`}>
        <p className="text-[.6rem] font-extrabold uppercase tracking-[2.5px] text-[#8E95A9] mb-3 px-2">Compare</p>
        <div className="flex flex-col gap-0.5 mb-5">
          {NAV.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-[.9rem] transition-all ${active ? 'bg-[#0066FF] text-white' : 'text-[#1A1D2B] hover:bg-blue-50 hover:text-[#0066FF]'}`}>
                <span className="text-lg w-6 text-center">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
        <p className="text-[.6rem] font-extrabold uppercase tracking-[2.5px] text-[#8E95A9] mb-3 px-2">Company</p>
        <div className="flex flex-col gap-0.5">
          {[
            { href: '/', label: 'Home' },
            { href: '/about', label: 'About' },
            { href: '/contact', label: 'Contact' },
            { href: '/privacy', label: 'Privacy Policy' },
            { href: '/terms', label: 'Terms of Service' },
          ].map(item => (
            <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
              className="block px-4 py-3 text-slate-600 font-semibold rounded-lg text-[.85rem] transition-all hover:text-[#0066FF] hover:bg-blue-50">
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
