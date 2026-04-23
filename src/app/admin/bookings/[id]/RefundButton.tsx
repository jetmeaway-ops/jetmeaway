'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  bookingRef: string;
  totalPence: number;
  disabled?: boolean;
};

/**
 * Admin-only manual Stripe refund.
 *
 * Two flows:
 *   - "Refund full" — no prompt beyond a confirm; sends the full totalPence.
 *   - "Refund partial" — prompts for £ amount; parses to pence; validates.
 *
 * On success the page refreshes via router.refresh() so the booking status,
 * payment status, and notes reflect the refund immediately.
 */
export default function RefundButton({ bookingRef, totalPence, disabled }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<'full' | 'partial' | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const gbp = (p: number) => `£${(p / 100).toFixed(2)}`;

  async function post(body: { ref: string; amountPence?: number; reason: string }) {
    const res = await fetch('/api/admin/issue-refund', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  async function refundFull() {
    if (disabled || busy) return;
    const reason = window.prompt(
      `Refund the FULL ${gbp(totalPence)} on ${bookingRef}?\n\nThis calls Stripe directly. The supplier is NOT notified — use "Cancel via LiteAPI" separately if the booking also needs to be cancelled with the supplier.\n\nOptional reason (saved to notes):`,
      '',
    );
    if (reason === null) return;
    setBusy('full');
    setResult(null);
    try {
      const body = await post({ ref: bookingRef, reason });
      if (body.success) {
        setResult(`✅ Full refund issued — Stripe id ${body.refundId} (${body.refundStatus}).`);
      } else {
        setResult(`⚠️ ${body.error || 'Refund failed'}`);
      }
      router.refresh();
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setBusy(null);
    }
  }

  async function refundPartial() {
    if (disabled || busy) return;
    const raw = window.prompt(
      `Partial refund on ${bookingRef}.\n\nEnter the £ amount to refund (max ${gbp(totalPence)}). Use a decimal point, e.g. 45.50.`,
      '',
    );
    if (raw === null) return;
    const parsed = parseFloat(raw.replace(/[£,\s]/g, ''));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setResult('⚠️ Invalid amount.');
      return;
    }
    const amountPence = Math.round(parsed * 100);
    if (amountPence > totalPence) {
      setResult(`⚠️ Amount exceeds paid total (${gbp(totalPence)}).`);
      return;
    }
    const reason = window.prompt('Optional reason (saved to notes):', '') ?? '';
    setBusy('partial');
    setResult(null);
    try {
      const body = await post({ ref: bookingRef, amountPence, reason });
      if (body.success) {
        setResult(
          `✅ Partial refund ${gbp(body.amountPence)} issued — Stripe id ${body.refundId} (${body.refundStatus}).`,
        );
      } else {
        setResult(`⚠️ ${body.error || 'Refund failed'}`);
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
          onClick={refundFull}
          disabled={disabled || !!busy}
          className="px-4 py-2 border border-gray-300 rounded-xl text-sm text-red-600 hover:bg-red-50 hover:border-red-300 disabled:opacity-50 transition"
        >
          {busy === 'full' ? 'Refunding…' : `Refund full (${gbp(totalPence)})`}
        </button>
        <button
          type="button"
          onClick={refundPartial}
          disabled={disabled || !!busy}
          className="px-4 py-2 border border-gray-300 rounded-xl text-sm text-[#5C6378] hover:bg-gray-50 disabled:opacity-50 transition"
        >
          {busy === 'partial' ? 'Refunding…' : 'Refund partial'}
        </button>
      </div>
      {result && <p className="text-xs text-[#5C6378] max-w-md">{result}</p>}
    </div>
  );
}
