'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-[100] p-3.5 px-5">
        <div className="max-w-[1200px] mx-auto flex justify-between items-center backdrop-blur-[20px] saturate-[1.8] bg-white/[.78] border border-white/30 rounded-3xl px-6 py-3 shadow-[0_32px_64px_-15px_rgba(0,0,0,0.1)]">
          <Link href="/">
            <img src="/jetmeaway-logo.png" alt="Jetmeaway" className="h-9" />
          </Link>
          <div className="hidden md:flex gap-1.5">
            <Link href="/" className="text-[.72rem] font-extrabold uppercase tracking-[1.5px] text-slate-400 px-3 py-2 rounded-lg transition-all hover:text-blue-600 hover:bg-blue-50">Home</Link>
            <Link href="/about" className="text-[.72rem] font-extrabold uppercase tracking-[1.5px] text-slate-400 px-3 py-2 rounded-lg transition-all hover:text-blue-600 hover:bg-blue-50">About</Link>
            <Link href="/contact" className="text-[.72rem] font-extrabold uppercase tracking-[1.5px] text-slate-400 px-3 py-2 rounded-lg transition-all hover:text-blue-600 hover:bg-blue-50">Contact</Link>
          </div>
          <div className="flex items-center gap-2.5">
            <Link href="/contact" className="bg-[#0F1119] text-white px-5 py-2.5 rounded-xl font-bold text-[.8rem] transition-all hover:bg-blue-600 shadow-[0_4px_16px_rgba(0,0,0,0.12)]">Contact</Link>
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden flex flex-col gap-[5px] p-2">
              <span className="w-5 h-0.5 bg-[#0F1119] rounded-sm"></span>
              <span className="w-5 h-0.5 bg-[#0F1119] rounded-sm"></span>
              <span className="w-5 h-0.5 bg-[#0F1119] rounded-sm"></span>
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && <div className="fixed inset-0 bg-[#0F1119]/30 z-[150]" onClick={() => setMobileOpen(false)} />}

      <div className={`fixed top-0 ${mobileOpen ? 'right-0' : '-right-full'} w-[280px] h-full bg-white z-[200] pt-[70px] px-5 transition-all duration-300 border-l border-slate-200 flex flex-col gap-0.5`}>
        <Link href="/" onClick={() => setMobileOpen(false)} className="block px-4 py-3.5 text-slate-800 font-bold rounded-lg transition-all hover:text-blue-600 hover:bg-blue-50">Home</Link>
        <Link href="/about" onClick={() => setMobileOpen(false)} className="block px-4 py-3.5 text-slate-800 font-bold rounded-lg transition-all hover:text-blue-600 hover:bg-blue-50">About</Link>
        <Link href="/contact" onClick={() => setMobileOpen(false)} className="block px-4 py-3.5 text-slate-800 font-bold rounded-lg transition-all hover:text-blue-600 hover:bg-blue-50">Contact</Link>
        <Link href="/privacy" onClick={() => setMobileOpen(false)} className="block px-4 py-3.5 text-slate-800 font-bold rounded-lg transition-all hover:text-blue-600 hover:bg-blue-50">Privacy</Link>
        <Link href="/terms" onClick={() => setMobileOpen(false)} className="block px-4 py-3.5 text-slate-800 font-bold rounded-lg transition-all hover:text-blue-600 hover:bg-blue-50">Terms</Link>
      </div>
    </>
  );
}
