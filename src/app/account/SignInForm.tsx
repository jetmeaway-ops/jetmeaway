'use client';

/**
 * /account sign-in form (client).
 *
 * Posts the email to /api/account/request-link and then redirects to
 * /account?sent=1 so the success state renders through a URL the user can
 * bookmark/reload. Loading + error states kept inline to match Scout voice.
 */
import { useState } from 'react';

export default function SignInForm() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setLocalError('Please enter a valid email address.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/account/request-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      // We always get success from the server (anti-enumeration). On network
      // errors we fall back to a generic message.
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Could not send the sign-in link.');
      }
      window.location.assign('/account?sent=1');
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Unexpected error.');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="bg-white border border-[#E8ECF4] rounded-2xl p-6 shadow-[0_4px_24px_rgba(10,22,40,0.04)]">
      <label className="block text-[.7rem] font-black uppercase tracking-[1.5px] text-[#8E95A9] mb-2">
        Email address
      </label>
      <input
        type="email"
        required
        autoComplete="email"
        inputMode="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="w-full px-4 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#FCFAF5] text-[.95rem] font-semibold text-[#0a1628] focus:outline-none focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20 transition"
      />
      {localError && (
        <p className="mt-2 text-[.78rem] font-semibold text-red-600">{localError}</p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="w-full mt-5 inline-flex items-center justify-center gap-2 bg-[#0a1628] hover:bg-[#0066FF] disabled:opacity-60 text-white font-poppins font-bold text-[.92rem] py-3.5 rounded-xl transition-all shadow-[0_6px_22px_rgba(10,22,40,0.22)]"
      >
        {submitting ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Sending…
          </>
        ) : (
          <>
            <i className="fa-solid fa-paper-plane text-[.82rem]" />
            Email me a sign-in link
          </>
        )}
      </button>
    </form>
  );
}
