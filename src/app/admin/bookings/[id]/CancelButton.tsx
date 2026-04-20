'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  bookingRef: string;
  disabled?: boolean;
};

export default function CancelButton({ bookingRef, disabled }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function onClick() {
    if (disabled || busy) return;
    const sure = window.confirm(
      `Cancel booking ${bookingRef}?\n\nThis calls LiteAPI to cancel on the supplier side and marks the admin record as cancelled. Past-deadline cancels may not be refundable.`,
    );
    if (!sure) return;

    setBusy(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/cancel-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: bookingRef }),
      });
      const body = await res.json();
      if (body.success) {
        const ref = body.liteapi?.refundAmount;
        setResult(`Cancelled. ${ref ? `Refund: ${ref}` : 'No refund amount returned.'}`);
      } else {
        setResult(`Supplier refused: ${body.liteapi?.error || body.error || 'unknown'}. Admin record still marked cancelled.`);
      }
      router.refresh();
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || busy}
        className="px-4 py-2 border border-gray-300 rounded-xl text-sm text-[#1A1D2B] hover:bg-red-50 hover:border-red-300 hover:text-red-700 disabled:opacity-50 transition"
      >
        {busy ? 'Cancelling…' : 'Request cancellation'}
      </button>
      {result && (
        <p className="text-xs text-[#5C6378] mt-2 max-w-md">{result}</p>
      )}
    </div>
  );
}
