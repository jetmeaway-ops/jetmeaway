'use client';

/**
 * Sign-out that actually signs out inside the app.
 *
 * The old `<form action="/api/account/signout" method="POST">` relied on the
 * cookie-clearing Set-Cookie riding a 303 redirect. iOS WKWebView applies
 * Set-Cookie on redirect responses unreliably, so in the app the session
 * often SURVIVED the first sign-out — the owner's 2026-09-02 video shows
 * him signing out, reopening Trips, and still being signed in. Sign-IN was
 * moved to a web-side fetch POST for the same cookie-store race in May
 * (see mobile/src/services/auth.ts); this is the matching half for sign-out:
 * fetch responses land their cookies in WKHTTPCookieStore directly.
 *
 * After the POST resolves we hard-navigate to /account — a full document
 * load with the cleared cookie, which renders the signed-out form: visible
 * proof it worked (the old flow dumped users on the home page instead).
 */
import { useState } from 'react';

export default function SignOutButton() {
  const [busy, setBusy] = useState(false);

  const signOut = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await fetch('/api/account/signout', { method: 'POST', redirect: 'follow' });
    } catch { /* even on a network blip, fall through to the reload — the
                 worst case is the page simply showing the true state */ }
    window.location.assign('/account');
  };

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#E8ECF4] bg-white hover:bg-[#FCFAF5] text-[#0a1628] font-poppins font-bold text-[.78rem] transition-colors disabled:opacity-60"
    >
      <i className={`fa-solid ${busy ? 'fa-circle-notch fa-spin' : 'fa-arrow-right-from-bracket'} text-[.7rem]`} />
      Sign out
    </button>
  );
}
