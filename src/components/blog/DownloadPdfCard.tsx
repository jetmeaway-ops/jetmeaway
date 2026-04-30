'use client';

import { useState } from 'react';

/**
 * In-article lead-magnet card. Email-gates a downloadable PDF version of
 * the blog post and double-converts the lead by also opting them into
 * weekly deal alerts. Used inside MDX as `<DownloadPdfCard slug="..." city="..." />`.
 *
 * Two placements per post (recommended): one right after the editorial
 * intro/Scout's Take, one at the bottom. The bottom one catches users
 * who read all the way through; the upper one catches scanners.
 *
 * Backend: POST /api/pdf-download — saves to KV (per-slug list + main
 * deal-alerts list), sends Resend email with the PDF download link.
 */
export type DownloadPdfCardProps = {
  slug: string;
  city: string;
};

export default function DownloadPdfCard({ slug, city }: DownloadPdfCardProps) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state === 'submitting' || state === 'sent') return;

    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setErrorMsg('Please enter a valid email address.');
      setState('error');
      return;
    }

    setState('submitting');
    setErrorMsg(null);
    try {
      const res = await fetch('/api/pdf-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, slug, city }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Could not send the PDF. Please try again.');
        setState('error');
        return;
      }
      setState('sent');
    } catch {
      setErrorMsg('Network error. Please try again.');
      setState('error');
    }
  }

  if (state === 'sent') {
    return (
      <aside
        className="not-prose my-10 md:my-12 px-5 py-7 md:py-8 border-y border-[#E8ECF4] bg-gradient-to-br from-blue-50/60 via-indigo-50/40 to-white rounded-2xl"
        aria-label="PDF sent confirmation"
      >
        <p className="text-[.62rem] md:text-[.66rem] font-black uppercase tracking-[2.5px] text-[#0066FF] mb-1.5">
          Check your inbox
        </p>
        <h3 className="font-poppins text-[1.15rem] md:text-[1.3rem] font-black text-[#1A1D2B] mb-1.5 leading-snug">
          Your {city} PDF is on its way
        </h3>
        <p className="text-[.85rem] md:text-[.9rem] text-[#5C6378] font-semibold leading-snug max-w-[520px]">
          We&apos;ve also added you to our deal alerts so you&apos;ll see when {city} hotels and flights drop in price. Reply &quot;unsubscribe&quot; any time to opt out.
        </p>
      </aside>
    );
  }

  return (
    <aside
      className="not-prose my-10 md:my-12 px-5 py-7 md:py-8 border-y border-[#E8ECF4] bg-gradient-to-br from-blue-50/60 via-indigo-50/40 to-white rounded-2xl"
      aria-label="Download printable PDF"
    >
      <p className="text-[.62rem] md:text-[.66rem] font-black uppercase tracking-[2.5px] text-[#0066FF] mb-1.5">
        Free download
      </p>
      <h3 className="font-poppins text-[1.15rem] md:text-[1.3rem] font-black text-[#1A1D2B] mb-1.5 leading-snug">
        Want this as a printable PDF?
      </h3>
      <p className="text-[.85rem] md:text-[.9rem] text-[#5C6378] font-semibold leading-snug mb-4 max-w-[520px]">
        Get the full {city} Intelligence Report — every hotel, every neighbourhood, every booking tip — sent to your inbox in seconds. No spam, ever.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2.5">
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (state === 'error') setState('idle'); }}
          disabled={state === 'submitting'}
          className="flex-1 min-w-[200px] bg-white border border-[#E8ECF4] focus:border-[#0066FF] focus:outline-none focus:ring-2 focus:ring-blue-100 rounded-xl px-4 py-2.5 text-[.9rem] font-semibold text-[#1A1D2B] placeholder:text-[#8E95A9] transition-colors"
          aria-label="Email address"
        />
        <button
          type="submit"
          disabled={state === 'submitting'}
          className="inline-flex items-center gap-1.5 bg-[#0066FF] hover:bg-[#0052CC] disabled:opacity-60 disabled:cursor-not-allowed text-white font-poppins font-black text-[.78rem] md:text-[.82rem] px-5 py-2.5 rounded-xl shadow-[0_6px_20px_-6px_rgba(0,102,255,0.5)] transition-all hover:-translate-y-0.5 active:translate-y-0"
        >
          {state === 'submitting' ? 'Sending…' : 'Email me the PDF →'}
        </button>
      </form>
      {state === 'error' && errorMsg && (
        <p role="alert" className="mt-3 text-[.8rem] font-semibold text-red-600">
          {errorMsg}
        </p>
      )}
      <p className="mt-3 text-[.72rem] text-[#8E95A9] font-medium">
        By submitting you agree to receive deal alerts. We never sell your email.
      </p>
    </aside>
  );
}
