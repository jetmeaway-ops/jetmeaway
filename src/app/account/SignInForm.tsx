'use client';

/**
 * /account sign-in form (client).
 *
 * Three sign-in paths:
 *   1. Apple Sign In (top — when in-app on iOS, calls native bridge; on web,
 *      we'd use the Sign in with Apple JS SDK — Phase 2)
 *   2. Google Sign In (top — same pattern, native on Android, GIS on web)
 *   3. Email magic link (bottom, the existing fallback)
 *
 * In the native shell, `window.JetMeAwayNative.signInWithApple()` triggers
 * Apple's system UI, returns an ID token, POSTs it to /api/account/social-signin,
 * sets the session cookie (shared with this WebView via sharedCookiesEnabled),
 * and resolves with { ok, email }.
 *
 * On success we redirect to /account/bookings (same destination as the
 * magic-link verify route).
 */
import { useEffect, useState } from 'react';

type NativeSignInResult = {
  ok: boolean;
  idToken?: string;
  provider?: 'apple' | 'google';
  /** Legacy field — pre-2026-05-01 builds returned { ok, email } directly. */
  email?: string;
  error?: string;
};

type NativeBridge = {
  signInWithApple: () => Promise<NativeSignInResult>;
  signInWithGoogle: () => Promise<NativeSignInResult>;
};

declare global {
  interface Window {
    JetMeAwayNative?: NativeBridge & { isNative?: boolean; platform?: string };
  }
}

export default function SignInForm() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [socialBusy, setSocialBusy] = useState<'apple' | 'google' | null>(null);
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    // Wait for the native bridge injection. If we're in a regular browser
    // window.JetMeAwayNative will never be defined and the buttons fall
    // through to the (Phase 2) web flow. For now, hide them outside the app.
    const check = () => setIsNative(!!window.JetMeAwayNative?.isNative);
    check();
    window.addEventListener('jetmeaway-native-ready', check);
    return () => window.removeEventListener('jetmeaway-native-ready', check);
  }, []);

  async function handleSocial(provider: 'apple' | 'google') {
    if (socialBusy) return;
    const bridge = window.JetMeAwayNative;
    if (!bridge) {
      setLocalError('Social sign-in is currently only available in the JetMeAway app. Please use the email link below.');
      return;
    }
    setLocalError(null);
    setSocialBusy(provider);
    try {
      const res = provider === 'apple'
        ? await bridge.signInWithApple()
        : await bridge.signInWithGoogle();

      if (!res.ok) {
        if (res.error === 'cancelled') { setSocialBusy(null); return; }
        setLocalError(res.error || 'Sign-in failed. Please try again.');
        return;
      }

      // New native flow returns { idToken, provider }. We POST from the
      // WebView itself so the session cookie lands in WKHTTPCookieStore
      // (rather than NSHTTPCookieStorage where RN's fetch would put it),
      // which means the redirect below sees a signed-in /account/bookings
      // on first nav. Older builds still return { email } directly — for
      // those we just trust the cookie was set and redirect.
      if (res.idToken) {
        const apiRes = await fetch('/api/account/social-signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ provider: res.provider || provider, idToken: res.idToken }),
        });
        const data = await apiRes.json().catch(() => ({}));
        if (!apiRes.ok || !data?.success) {
          setLocalError(data?.error || 'Could not complete sign-in. Please try again.');
          return;
        }
      }

      window.location.assign('/account/bookings');
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Unexpected error during sign-in.');
    } finally {
      setSocialBusy(null);
    }
  }

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
    <div className="bg-white border border-[#E8ECF4] rounded-2xl p-6 shadow-[0_4px_24px_rgba(10,22,40,0.04)]">
      {isNative && (
        <>
          <div className="flex flex-col gap-2.5 mb-4">
            <button
              type="button"
              onClick={() => handleSocial('apple')}
              disabled={socialBusy !== null}
              className="w-full inline-flex items-center justify-center gap-2 bg-black hover:bg-[#1a1a1a] disabled:opacity-60 text-white font-poppins font-bold text-[.92rem] py-3.5 rounded-xl transition-all"
            >
              {socialBusy === 'apple' ? (
                <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <i className="fa-brands fa-apple text-[1.05rem]" />
              )}
              Sign in with Apple
            </button>
            <button
              type="button"
              onClick={() => handleSocial('google')}
              disabled={socialBusy !== null}
              className="w-full inline-flex items-center justify-center gap-2 bg-white hover:bg-[#f8fafc] border border-[#E8ECF4] disabled:opacity-60 text-[#0a1628] font-poppins font-bold text-[.92rem] py-3.5 rounded-xl transition-all"
            >
              {socialBusy === 'google' ? (
                <span className="inline-block w-4 h-4 border-2 border-[#0a1628]/30 border-t-[#0a1628] rounded-full animate-spin" />
              ) : (
                <i className="fa-brands fa-google text-[1.0rem] text-[#4285F4]" />
              )}
              Continue with Google
            </button>
          </div>
          <div className="relative my-5 text-center">
            <span className="absolute inset-x-0 top-1/2 h-px bg-[#E8ECF4]" aria-hidden="true" />
            <span className="relative inline-block px-3 bg-white text-[.7rem] font-bold uppercase tracking-[1.5px] text-[#8E95A9]">
              or
            </span>
          </div>
        </>
      )}
      <form onSubmit={onSubmit}>
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
    </div>
  );
}
