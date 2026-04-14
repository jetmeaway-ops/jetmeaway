'use client';

import { useEffect, useState } from 'react';

type BalanceState = {
  available: number | null;
  currency: string;
  checkedAt: string;
  loading: boolean;
  error: string | null;
};

/**
 * Duffel balance widget — polls /api/duffel/balance every 60s.
 * Red if below £500, amber below £1000, green above.
 */
export default function BalanceWidget() {
  const [state, setState] = useState<BalanceState>({
    available: null,
    currency: 'GBP',
    checkedAt: '',
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/duffel/balance', { cache: 'no-store' });
        const json = await res.json();
        if (cancelled) return;

        if (!res.ok || json.available === null) {
          setState(s => ({
            ...s,
            loading: false,
            error: json.error || 'Balance unavailable',
          }));
          return;
        }

        setState({
          available: json.available,
          currency: json.currency || 'GBP',
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

  const tone =
    state.available === null
      ? 'bg-gray-50 border-gray-200 text-gray-600'
      : state.available < 500
      ? 'bg-red-50 border-red-200 text-red-800'
      : state.available < 1000
      ? 'bg-amber-50 border-amber-200 text-amber-900'
      : 'bg-green-50 border-green-200 text-green-800';

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);

  return (
    <div className={`rounded-2xl border p-5 ${tone}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="text-xs font-bold uppercase tracking-wide">
          Duffel balance
        </div>
        {state.checkedAt && (
          <div className="text-xs opacity-60">
            {new Date(state.checkedAt).toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        )}
      </div>
      {state.loading ? (
        <div className="text-sm opacity-75">Checking…</div>
      ) : state.error ? (
        <div className="text-sm font-semibold">{state.error}</div>
      ) : (
        <>
          <div className="text-2xl font-black">{fmt(state.available!)}</div>
          {state.available! < 1000 && (
            <div className="text-xs font-semibold mt-1">
              ⚠️ Top up Duffel soon
            </div>
          )}
        </>
      )}
    </div>
  );
}
