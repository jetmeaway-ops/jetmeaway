'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

/**
 * Save-search button — drop-in for the flights + hotels results pages.
 *
 * UX:
 *   - Logged out: shows "Sign in to save → get a push when prices drop"
 *   - Logged in, not yet saved: "Save this search · Notify me on price drops"
 *   - Logged in, saved: "Saved · Notifying" with a small Remove action
 *
 * Triggers the existing /api/account/saved-searches endpoint. Calls
 * /api/account/me on mount to learn whether the user is signed in (single
 * cheap fetch, results cached in component state for the page lifetime).
 */
export type SaveSearchButtonProps = {
  type: 'flight' | 'hotel';
  label: string;
  criteria: Record<string, string | number | undefined>;
  url: string;
  savedPricePence?: number;
  currency?: string;
  className?: string;
};

type State =
  | { kind: 'init' }
  | { kind: 'anon' }
  | { kind: 'idle'; id: string | null }       // signed-in, may or may not be saved
  | { kind: 'saving' }
  | { kind: 'saved'; id: string }
  | { kind: 'removing' }
  | { kind: 'error'; message: string };

export default function SaveSearchButton(props: SaveSearchButtonProps) {
  const { type, label, criteria, url, savedPricePence, currency, className } = props;
  const [state, setState] = useState<State>({ kind: 'init' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/account/me', { credentials: 'include' });
        if (cancelled) return;
        if (res.status === 401) {
          setState({ kind: 'anon' });
          return;
        }
        // We don't bother fetching the user's existing saved-searches list
        // here — Save is idempotent, so a second click for the same criteria
        // just updates the existing entry. Phase 3 polish: prefetch the list
        // and reflect "already saved" state on mount.
        setState({ kind: 'idle', id: null });
      } catch {
        if (!cancelled) setState({ kind: 'anon' });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function save() {
    if (state.kind === 'saving') return;
    setState({ kind: 'saving' });
    try {
      const res = await fetch('/api/account/saved-searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type,
          label,
          criteria,
          url,
          savedPricePence,
          currency,
          notify: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        setState({ kind: 'error', message: data?.error || 'Could not save the search.' });
        return;
      }
      setState({ kind: 'saved', id: data.id });
    } catch {
      setState({ kind: 'error', message: 'Network error. Please try again.' });
    }
  }

  async function remove() {
    if (state.kind !== 'saved') return;
    const id = state.id;
    setState({ kind: 'removing' });
    try {
      const res = await fetch(`/api/account/saved-searches?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        setState({ kind: 'error', message: 'Could not remove the saved search.' });
        return;
      }
      setState({ kind: 'idle', id: null });
    } catch {
      setState({ kind: 'error', message: 'Network error.' });
    }
  }

  const baseCls = `inline-flex items-center gap-2 px-4 py-2 rounded-xl font-poppins font-bold text-[.82rem] transition-all ${className ?? ''}`;

  if (state.kind === 'init') {
    return (
      <span className={`${baseCls} text-[#8E95A9] bg-[#F1F3F7]`} aria-busy="true">
        <span className="inline-block w-3.5 h-3.5 border-2 border-[#8E95A9]/30 border-t-[#8E95A9] rounded-full animate-spin" />
        Loading…
      </span>
    );
  }

  if (state.kind === 'anon') {
    return (
      <Link
        href="/account"
        className={`${baseCls} bg-white border border-[#E8ECF4] hover:border-[#0066FF] text-[#0a1628] hover:text-[#0066FF]`}
      >
        <i className="fa-solid fa-bell text-[.78rem]" aria-hidden="true" />
        Sign in to save · get push alerts on price drops
      </Link>
    );
  }

  if (state.kind === 'saving') {
    return (
      <span className={`${baseCls} text-white bg-[#0a1628]`} aria-busy="true">
        <span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        Saving…
      </span>
    );
  }

  if (state.kind === 'removing') {
    return (
      <span className={`${baseCls} text-white bg-[#0a1628]`} aria-busy="true">
        <span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        Removing…
      </span>
    );
  }

  if (state.kind === 'saved') {
    return (
      <span className={`${baseCls} text-white bg-emerald-600`}>
        <i className="fa-solid fa-bell text-[.78rem]" aria-hidden="true" />
        Saved · Notifying on price drop
        <button
          type="button"
          onClick={remove}
          className="ml-2 underline-offset-2 hover:underline text-white/80 hover:text-white text-[.74rem] font-semibold"
        >
          Remove
        </button>
      </span>
    );
  }

  if (state.kind === 'error') {
    return (
      <button
        type="button"
        onClick={save}
        className={`${baseCls} text-red-700 bg-red-50 border border-red-200`}
      >
        <i className="fa-solid fa-triangle-exclamation text-[.78rem]" aria-hidden="true" />
        {state.message} · Retry
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={save}
      className={`${baseCls} text-white bg-[#0066FF] hover:bg-[#0052CC] shadow-[0_4px_18px_-6px_rgba(0,102,255,0.55)]`}
    >
      <i className="fa-solid fa-bell text-[.78rem]" aria-hidden="true" />
      Save this search · Notify me on price drops
    </button>
  );
}
