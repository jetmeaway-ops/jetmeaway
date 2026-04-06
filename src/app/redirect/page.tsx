'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

/* ═══════════════════════════════════════════════════════════════════════════
   CROSS-SELL CONFIG
   ═══════════════════════════════════════════════════════════════════════════ */

type CrossSell = {
  icon: string;
  title: string;
  desc: string;
  cta: string;
  href: string;
  color: string;
};

function getCrossSells(dest: string, cat: string): CrossSell[] {
  const d = encodeURIComponent(dest);
  const sells: CrossSell[] = [];

  if (cat !== 'hotels') {
    sells.push({
      icon: '🏨',
      title: `Hotels in ${dest || 'your destination'}`,
      desc: 'Compare rates across trusted providers',
      cta: 'Compare Hotels',
      href: `/hotels?destination=${d}`,
      color: 'from-orange-50 to-amber-50 border-orange-200',
    });
  }

  if (cat !== 'flights') {
    sells.push({
      icon: '✈',
      title: `Flights to ${dest || 'your destination'}`,
      desc: 'Find the cheapest flights from UK airports',
      cta: 'Compare Flights',
      href: `/flights?to=${d}`,
      color: 'from-blue-50 to-indigo-50 border-blue-200',
    });
  }

  if (cat !== 'cars') {
    sells.push({
      icon: '🚗',
      title: `Car hire in ${dest || 'your destination'}`,
      desc: 'Compare 5 rental providers from £8/day',
      cta: 'Compare Cars',
      href: `/cars?location=${d}`,
      color: 'from-emerald-50 to-green-50 border-emerald-200',
    });
  }

  if (cat !== 'esim') {
    sells.push({
      icon: '📱',
      title: 'Stay connected abroad',
      desc: 'eSIM data plans from $4.50 — no roaming charges',
      cta: 'Get eSIM',
      href: '/esim',
      color: 'from-purple-50 to-violet-50 border-purple-200',
    });
  }

  if (cat !== 'explore') {
    sells.push({
      icon: '🧭',
      title: `Things to do in ${dest || 'your destination'}`,
      desc: 'Tours, activities & experiences from top providers',
      cta: 'Explore Activities',
      href: `/explore?destination=${d}`,
      color: 'from-rose-50 to-pink-50 border-rose-200',
    });
  }

  if (cat !== 'insurance') {
    sells.push({
      icon: '🛡',
      title: 'Travel insurance',
      desc: 'Medical cover, cancellation & luggage from £3/day',
      cta: 'Compare Insurance',
      href: '/insurance',
      color: 'from-teal-50 to-cyan-50 border-teal-200',
    });
  }

  return sells.slice(0, 3);
}

/* ═══════════════════════════════════════════════════════════════════════════
   REDIRECT PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function RedirectPage() {
  const [progress, setProgress] = useState(0);
  const [url, setUrl] = useState('');
  const [provider, setProvider] = useState('');
  const [dest, setDest] = useState('');
  const [cat, setCat] = useState('');
  const [email, setEmail] = useState('');
  const [emailSaved, setEmailSaved] = useState(false);
  const [paused, setPaused] = useState(false);

  // Read params on mount
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const rawUrl = p.get('url') || '';
    setUrl(rawUrl);
    setProvider(p.get('provider') || 'the provider');
    setDest(p.get('dest') || '');
    setCat(p.get('cat') || '');
  }, []);

  // Progress bar + auto-redirect
  useEffect(() => {
    if (!url || paused) return;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          window.location.href = url;
          return 100;
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [url, paused]);

  const handleSaveEmail = async () => {
    if (!email || !email.includes('@')) return;
    try {
      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'redirect', destination: dest }),
      });
      setEmailSaved(true);
    } catch {
      setEmailSaved(true);
    }
  };

  const crossSells = getCrossSells(dest, cat);

  // Category labels
  const catLabels: Record<string, string> = {
    flights: 'flight',
    hotels: 'hotel',
    cars: 'car hire',
    packages: 'package holiday',
    esim: 'eSIM plan',
    insurance: 'insurance',
    explore: 'activity',
  };
  const catLabel = catLabels[cat] || 'deal';

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,#E8F0FE_0%,#fff_50%,#F8FAFC_100%)] flex flex-col">
      {/* Top bar */}
      <div className="p-4">
        <Link href="/">
          <img src="/jetmeaway-logo.png" alt="Jetmeaway" className="h-7" />
        </Link>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-start justify-center px-5 pt-8 pb-16">
        <div className="w-full max-w-[600px]">

          {/* Redirect card */}
          <div className="bg-white border border-[#E8ECF4] rounded-3xl p-8 shadow-[0_8px_40px_rgba(0,102,255,0.06)] mb-6 text-center">
            {/* Animated plane */}
            <div className="relative w-16 h-16 mx-auto mb-5">
              <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-20" />
              <div className="relative w-16 h-16 bg-gradient-to-br from-[#0066FF] to-[#4F46E5] rounded-full flex items-center justify-center text-2xl text-white">
                {cat === 'hotels' ? '🏨' : cat === 'cars' ? '🚗' : cat === 'packages' ? '📦' : cat === 'esim' ? '📱' : cat === 'explore' ? '🧭' : '✈'}
              </div>
            </div>

            <h1 className="font-poppins font-black text-[1.3rem] text-[#1A1D2B] mb-2">
              Taking you to {provider}
            </h1>
            <p className="text-[.85rem] text-[#5C6378] font-semibold mb-6">
              {dest
                ? `To book your ${dest} ${catLabel}`
                : `To view your ${catLabel} deal`
              }
            </p>

            {/* Progress bar */}
            <div className="w-full bg-[#F1F3F7] rounded-full h-2 mb-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#0066FF] to-[#4F46E5] rounded-full transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[.68rem] text-[#8E95A9] font-semibold mb-4">
              {progress < 100 ? 'Redirecting...' : 'Opening provider site...'}
            </p>

            {/* Skip button */}
            <button
              onClick={() => { if (url) window.location.href = url; }}
              className="text-[#0066FF] font-bold text-[.78rem] hover:underline"
            >
              Skip — go to {provider} now
            </button>
          </div>

          {/* Cross-sell cards */}
          <div className="space-y-3 mb-6">
            <h2 className="font-poppins font-black text-[.85rem] text-[#1A1D2B] px-1">
              Complete your trip
            </h2>
            {crossSells.map(sell => (
              <Link
                key={sell.cta}
                href={sell.href}
                className={`block bg-gradient-to-r ${sell.color} border rounded-2xl p-5 hover:shadow-md transition-all group`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl flex-shrink-0">{sell.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-poppins font-bold text-[.88rem] text-[#1A1D2B] mb-0.5">{sell.title}</div>
                    <div className="text-[.72rem] text-[#5C6378] font-semibold">{sell.desc}</div>
                  </div>
                  <span className="text-[#0066FF] font-bold text-[.75rem] group-hover:translate-x-0.5 transition-transform flex-shrink-0 whitespace-nowrap">
                    {sell.cta} →
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Email capture */}
          {!emailSaved ? (
            <div className="bg-white border border-[#E8ECF4] rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xl">🔔</span>
                <div>
                  <div className="font-poppins font-bold text-[.85rem] text-[#1A1D2B]">
                    {dest ? `Get price alerts for ${dest}` : 'Get deal alerts'}
                  </div>
                  <div className="text-[.7rem] text-[#8E95A9] font-semibold">
                    We&apos;ll notify you when prices drop
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Your email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setPaused(true)}
                  onBlur={() => setPaused(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-[.82rem] font-semibold text-[#1A1D2B] outline-none focus:border-[#0066FF] transition-all"
                />
                <button
                  onClick={handleSaveEmail}
                  className="bg-[#0066FF] hover:bg-[#0052CC] text-white font-poppins font-bold text-[.78rem] px-5 py-2.5 rounded-xl transition-all flex-shrink-0"
                >
                  Alert Me
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
              <span className="text-xl">✅</span>
              <p className="font-poppins font-bold text-[.85rem] text-green-700 mt-1">You&apos;re all set! We&apos;ll email you when prices drop.</p>
            </div>
          )}

          {/* Back to JetMeAway */}
          <div className="text-center mt-6">
            <Link href="/" className="text-[.75rem] text-[#8E95A9] font-semibold hover:text-[#0066FF] transition-colors">
              ← Back to JetMeAway
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
