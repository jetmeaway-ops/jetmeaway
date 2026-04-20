'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  bookingRef: string;
  disabled?: boolean;
};

export default function CancelButton({ bookingRef, disabled }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<'supplier' | 'admin' | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function cancelViaSupplier() {
    if (disabled || busy) return;
    const sure = window.confirm(
      `Cancel booking ${bookingRef} VIA LITEAPI?\n\nThis calls LiteAPI to cancel on the supplier side. Past-deadline cancels may not be refundable. LiteAPI handles the refund directly to the customer's card.\n\nDo NOT use this if the supplier has already cancelled/refunded outside our system.`,
    );
    if (!sure) return;
    setBusy('supplier');
    setResult(null);
    try {
      const res = await fetch('/api/admin/cancel-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: bookingRef }),
      });
      const body = await res.json();
      if (body.success) {
        const amt = body.liteapi?.refundAmount;
        setResult(`✅ Cancelled via LiteAPI. ${amt != null ? `Refund: ${amt}` : 'No refund amount returned.'}`);
      } else {
        setResult(`⚠️ Supplier refused: ${body.liteapi?.error || body.error || 'unknown'}. Admin record still marked cancelled.`);
      }
      router.refresh();
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setBusy(null);
    }
  }

  async function markCancelledAdminOnly() {
    if (disabled || busy) return;
    const reason = window.prompt(
      `Mark ${bookingRef} as cancelled in ADMIN ONLY (no supplier call)?\n\nUse this when LiteAPI has already cancelled/refunded outside our system and we just need the admin status to match.\n\nOptional reason (saved to notes):`,
      '',
    );
    if (reason === null) return;
    setBusy('admin');
    setResult(null);
    try {
      const res = await fetch('/api/admin/mark-cancelled', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: bookingRef, reason }),
      });
      const body = await res.json();
      if (body.success) {
        setResult('✅ Admin record marked cancelled. No supplier call was made.');
      } else {
        setResult(`⚠️ ${body.error || 'Failed'}`);
      }
      router.refresh();
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={cancelViaSupplier}
          disabled={disabled || !!busy}
          className="px-4 py-2 border border-gray-300 rounded-xl text-sm text-[#1A1D2B] hover:bg-red-50 hover:border-red-300 hover:text-red-700 disabled:opacity-50 transition"
        >
          {busy === 'supplier' ? 'Cancelling via LiteAPI…' : 'Cancel via LiteAPI'}
        </button>
        <button
          type="button"
          onClick={markCancelledAdminOnly}
          disabled={disabled || !!busy}
          className="px-4 py-2 border border-gray-300 rounded-xl text-sm text-[#5C6378] hover:bg-gray-50 disabled:opacity-50 transition"
        >
          {busy === 'admin' ? 'Marking…' : 'Mark cancelled (admin only)'}
        </button>
      </div>
      {result && <p className="text-xs text-[#5C6378] max-w-md">{result}</p>}
    </div>
  );
}
