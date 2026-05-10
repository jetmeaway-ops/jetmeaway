'use client';

import { useState } from 'react';

/**
 * Inline "Mark as paid" form for the /admin/promos queue. Prompts the
 * owner for a short note (e.g. the LiteAPI refund txn ID, or "Wise
 * transfer ref=xyz"), POSTs to /api/admin/promos/mark-paid, then reloads
 * the page so the row drops out of the eligible queue.
 *
 * Kept as a Client Component (the surrounding page is a Server Component)
 * because we need the prompt + loading state. Auth is handled at the API
 * route via the jma_admin cookie.
 */
export function MarkPaidButton({ ref: bookingRef }: { ref: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    const note = window.prompt(
      `Mark cashback paid for ${bookingRef}.\n\nOptional note (e.g. "LiteAPI partial refund txn=xxx", "Wise ref=yyy"):`,
      '',
    );
    if (note === null) return; // user cancelled

    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/promos/mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: bookingRef, note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      // Refresh — server component will re-fetch and the row will be gone.
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'mark-paid failed');
      setBusy(false);
    }
  };

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {busy ? 'Marking…' : 'Mark as paid'}
      </button>
      {error && (
        <span className="text-[.65rem] text-red-600 font-semibold">{error}</span>
      )}
    </div>
  );
}
