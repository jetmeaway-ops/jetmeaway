'use client';

/**
 * Client-side tabs for the bookings list. Three buckets — Upcoming / Past /
 * Cancelled. Tab state is kept in the URL (?tab=upcoming|past|cancelled) so
 * a refresh preserves the user's view.
 *
 * BACKLOG B3 (2026-04-21): each card now exposes a "Request cancellation"
 * button when the booking is self-cancel eligible (LiteAPI supplier + free-
 * cancel deadline still in the future — computed server-side by page.tsx).
 */

import { useState, useTransition } from 'react';
import type { ClientBooking } from './page';

type Bucket = 'upcoming' | 'past' | 'cancelled';

export default function BookingsTabs({
  counts,
  buckets,
}: {
  counts: Record<Bucket, number>;
  buckets: Record<Bucket, ClientBooking[]>;
}) {
  const initial = typeof window === 'undefined'
    ? 'upcoming'
    : ((new URLSearchParams(window.location.search).get('tab') as Bucket) || 'upcoming');
  const [tab, setTab] = useState<Bucket>(
    counts[initial] > 0 ? initial : (counts.upcoming > 0 ? 'upcoming' : (counts.past > 0 ? 'past' : 'cancelled')),
  );

  const setAndPush = (next: Bucket) => {
    setTab(next);
    if (typeof window !== 'undefined') {
      const u = new URL(window.location.href);
      u.searchParams.set('tab', next);
      window.history.replaceState(null, '', u);
    }
  };

  const items = buckets[tab];

  return (
    <>
      <nav aria-label="Booking filters" className="flex gap-1 border-b border-[#E8ECF4] mb-5 overflow-x-auto">
        {(['upcoming', 'past', 'cancelled'] as const).map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => setAndPush(b)}
            aria-pressed={tab === b}
            className={`px-4 py-3 -mb-px border-b-2 font-poppins font-bold text-[.82rem] whitespace-nowrap transition-colors ${
              tab === b
                ? 'border-[#0a1628] text-[#0a1628]'
                : 'border-transparent text-[#8E95A9] hover:text-[#0a1628]'
            }`}
          >
            {b.charAt(0).toUpperCase() + b.slice(1)}
            <span className={`ml-1.5 inline-block px-1.5 py-0.5 rounded-full text-[.64rem] font-black ${
              tab === b ? 'bg-[#FAF3E6] text-[#8a6d00]' : 'bg-slate-100 text-slate-500'
            }`}>
              {counts[b]}
            </span>
          </button>
        ))}
      </nav>

      {items.length === 0 ? (
        <div className="bg-white border border-[#E8ECF4] rounded-2xl p-8 text-center">
          <p className="text-[.9rem] text-[#5C6378] font-medium">
            {tab === 'upcoming' && 'No upcoming trips.'}
            {tab === 'past' && 'No past trips yet.'}
            {tab === 'cancelled' && 'Nothing cancelled.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {items.map((b) => (
            <BookingCard key={b.id} b={b} />
          ))}
        </div>
      )}
    </>
  );
}

function BookingCard({ b }: { b: ClientBooking }) {
  // BACKLOG B3 (2026-04-21): local state for the self-cancel flow. We use
  // a 2-step pattern — first click arms the action, second click confirms —
  // to avoid an accidental irreversible cancel without needing a modal.
  // Once cancelled we mark `cancelled` locally and reload so the card
  // hops into the Cancelled tab with fresh server state.
  const [armed, setArmed] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const doCancel = () => {
    setCancelError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/account/bookings/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId: b.id }),
        });
        const data = await res.json().catch(() => ({ success: false, error: 'Unexpected response' }));
        if (!res.ok || !data.success) {
          setCancelError(data.error || `Cancel failed (${res.status})`);
          setArmed(false);
          return;
        }
        // Hard reload — the server-rendered page re-partitions the booking
        // into the Cancelled bucket with the fresh status + updatedAt.
        window.location.assign('/account/bookings?tab=cancelled');
      } catch (e) {
        setCancelError(e instanceof Error ? e.message : 'Cancel failed');
        setArmed(false);
      }
    });
  };

  return (
    <div className="bg-white border border-[#E8ECF4] rounded-2xl p-5 shadow-[0_4px_24px_rgba(10,22,40,0.04)] hover:border-[#E8D8A8]/70 transition-colors">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#FAF3E6] border border-[#E8D8A8] text-[#8a6d00]">
            <i className={`fa-solid ${b.typeIcon} text-[.82rem]`} />
          </span>
          <span className="text-[.62rem] font-black uppercase tracking-[1.8px] text-[#8a6d00]">
            {b.type} · {b.supplierLabel}
          </span>
        </div>
        <span className={`inline-block px-2.5 py-1 rounded-full text-[.64rem] font-black uppercase tracking-[1.2px] border ${b.statusColor}`}>
          {b.status}
        </span>
      </div>

      <h3 className="font-[var(--font-playfair)] font-black text-[1.25rem] text-[#0a1628] tracking-tight leading-tight">
        {b.title}
      </h3>
      {b.destination && (
        <p className="text-[.8rem] text-[#5C6378] font-semibold mt-0.5">
          <i className="fa-solid fa-location-dot text-[.72rem] text-[#287DFA] mr-1" />
          {b.destination}
        </p>
      )}

      <dl className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[.78rem]">
        <div>
          <dt className="text-[.6rem] font-black uppercase tracking-[1.2px] text-[#8E95A9]">Check-in</dt>
          <dd className="font-semibold text-[#0a1628] mt-0.5">{b.checkInFormatted}</dd>
        </div>
        <div>
          <dt className="text-[.6rem] font-black uppercase tracking-[1.2px] text-[#8E95A9]">Check-out</dt>
          <dd className="font-semibold text-[#0a1628] mt-0.5">{b.checkOutFormatted}</dd>
        </div>
        <div>
          <dt className="text-[.6rem] font-black uppercase tracking-[1.2px] text-[#8E95A9]">Guests</dt>
          <dd className="font-semibold text-[#0a1628] mt-0.5">{b.guests}</dd>
        </div>
        <div>
          <dt className="text-[.6rem] font-black uppercase tracking-[1.2px] text-[#8E95A9]">Total</dt>
          <dd className="font-semibold text-[#0a1628] mt-0.5">{b.totalFormatted}</dd>
        </div>
      </dl>

      {/* BACKLOG B3: free-cancel deadline banner. Shown when the booking is
          self-cancel eligible so the customer knows exactly how long they
          have to act. */}
      {b.canCancel && b.cancellationDeadlineFormatted && (
        <p className="mt-3 text-[.72rem] text-emerald-700 font-semibold bg-emerald-50 ring-1 ring-emerald-200 rounded-lg px-3 py-2">
          <i className="fa-solid fa-shield-check text-[.68rem] mr-1.5" />
          Free cancellation until {b.cancellationDeadlineFormatted}
        </p>
      )}

      {cancelError && (
        <p className="mt-3 text-[.74rem] text-red-700 font-semibold bg-red-50 ring-1 ring-red-200 rounded-lg px-3 py-2">
          <i className="fa-solid fa-triangle-exclamation text-[.68rem] mr-1.5" />
          {cancelError}
        </p>
      )}

      <div className="mt-4 pt-4 border-t border-[#E8ECF4] flex flex-wrap items-center justify-between gap-3">
        <div className="text-[.7rem] text-[#8E95A9] font-medium">
          Booking ref <strong className="font-bold text-[#0a1628]">{b.id}</strong>
          {b.supplierRef && (
            <span className="ml-2 text-[.68rem]">Supplier <strong className="font-bold text-[#0a1628]">{b.supplierRef}</strong></span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {b.canCancel ? (
            armed ? (
              <>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setArmed(false)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#E8ECF4] text-[.76rem] font-bold text-[#5C6378] hover:text-[#0a1628] hover:bg-[#FAFBFC] disabled:opacity-50"
                >
                  Keep booking
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={doCancel}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-[.76rem] font-bold transition-colors disabled:opacity-60"
                >
                  {pending ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin text-[.68rem]" />
                      Cancelling…
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-circle-check text-[.68rem]" />
                      Confirm cancellation
                    </>
                  )}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setArmed(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-[.76rem] font-bold transition-colors"
              >
                <i className="fa-solid fa-xmark text-[.68rem]" />
                Request cancellation
              </button>
            )
          ) : (
            <a
              href="/contact"
              className="inline-flex items-center gap-1.5 text-[.78rem] font-bold text-[#0066FF] hover:text-[#0a1628]"
            >
              Need changes?
              <i className="fa-solid fa-arrow-right text-[.64rem]" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
