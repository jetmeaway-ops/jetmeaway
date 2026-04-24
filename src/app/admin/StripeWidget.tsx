'use client';

import { useEffect, useState } from 'react';

type StripeState = {
  available: number | null;
  pending: number | null;
  last7Volume: number;
  last7Count: number;
  nextPayout: { amount: number; arrivalDate: string } | null;
  checkedAt: string;
  loading: boolean;
  error: string | null;
};

/**
 * Stripe balance widget — polls /api/admin/stripe-balance every 60s.
 *
 * Shows available GBP up top (the money Stripe will actually pay us on the
 * next payout cycle), pending GBP underneath (still in the hold period), plus
 * 7-day charge volume and the next payout ETA.
 */
export default function StripeWidget() {
  const [state, setState] = useState<StripeState>({
    available: null,
    pending: null,
    last7Volume: 0,
    last7Count: 0,
    nextPayout: null,
    checkedAt: '',
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/admin/stripe-balance', { cache: 'no-store' });
        const json = await res.json();
        if (cancelled) return;

        if (!res.ok) {
          setState(s => ({
            ...s,
            loading: false,
            error: json.error || 'Stripe balance unavailable',
          }));
          return;
        }

        setState({
          available: json.available,
          pending: json.pending,
          last7Volume: json.last7Volume,
          last7Count: json.last7Count,
          nextPayout: json.nextPayout,
          checkedAt: json.checkedAt,
          loading: false,
          error: null,
        });
      } catch {
        if (!cancelled) {
          setState(s => ({ ...s, loading: false, error: 'Network error' }));
        }
      }
    }

    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    });

  return (
    <div className="rounded-2xl border border-[#635BFF]/20 bg-gradient-to-br from-[#f6f5ff] to-white p-5">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-[#635BFF] text-white text-xs font-black">
            S
          </span>
          <div className="text-xs font-bold uppercase tracking-wide text-[#5C6378]">
            Stripe balance
          </div>
        </div>
        {state.checkedAt && (
          <div className="text-xs text-[#8E95A9]">
            {new Date(state.checkedAt).toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        )}
      </div>

      {state.loading ? (
        <div className="text-sm text-[#8E95A9]">Checking…</div>
      ) : state.error ? (
        <div className="text-sm font-semibold text-red-600">{state.error}</div>
      ) : (
        <>
          <div className="text-2xl font-black text-[#1A1D2B]">
            {fmt(state.available ?? 0)}
          </div>
          <div className="text-xs text-[#8E95A9] mb-3">available now</div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white/70 rounded-lg p-2 border border-gray-100">
              <div className="text-[#8E95A9] font-medium">Pending</div>
              <div className="font-bold text-[#1A1D2B]">{fmt(state.pending ?? 0)}</div>
            </div>
            <div className="bg-white/70 rounded-lg p-2 border border-gray-100">
              <div className="text-[#8E95A9] font-medium">7-day volume</div>
              <div className="font-bold text-[#1A1D2B]">
                {fmt(state.last7Volume)}{' '}
                <span className="text-[#8E95A9] font-medium">
                  ({state.last7Count})
                </span>
              </div>
            </div>
          </div>

          {state.nextPayout && (
            <div className="mt-2 text-xs text-[#5C6378]">
              Next payout: <span className="font-semibold text-[#1A1D2B]">{fmt(state.nextPayout.amount)}</span>{' '}
              on {fmtDate(state.nextPayout.arrivalDate)}
            </div>
          )}

          <a
            href="https://dashboard.stripe.com/balance"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-3 text-xs font-semibold text-[#635BFF] hover:underline"
          >
            Open Stripe dashboard ↗
          </a>
        </>
      )}
    </div>
  );
}
