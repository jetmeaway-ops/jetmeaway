'use client';

/* ═══════════════════════════════════════════════════════════════════════════
   ROOMS TABLE — "Scout" identity
   ───────────────────────────────────────────────────────────────────────────
   A booking.com-style availability grid, reimagined in Scout's voice:
     - Playfair Display for room name + price (editorial, boutique)
     - Clean sans-serif for technical facts (Wifi, Cancellation, Board)
     - Emerald solid dot  = positive fact ("Breakfast included")
     - Slate outline dot  = neutral statement ("Non-refundable", "Prepay")
       (we never shout in red — stated, not scolded)
     - Champagne highlight + barely-there gold ring for the selected row
     - Button copy on each row: "Secure this rate →"
     - No library component — raw Tailwind so the padding, borders, and
       generous whitespace match the Scout aesthetic exactly.

   Phase-1 scope (Option #3 in the plan): `offers` here is the board-level
   `boardOptions` array from LiteAPI — one row per unique board type. When
   we extend `liteapi.ts` to keep room-type × rate combos, this same
   component renders richer rows without rework.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useMemo } from 'react';

export type RoomRate = {
  offerId: string;
  boardType: string;
  totalPrice: number;
  pricePerNight: number;
  refundable: boolean;
};

/* The Scout design tokens — pulled out so the page can reuse them on the
   sidebar "breathe" summary. */
export const SCOUT_TOKENS = {
  champagneBg: 'bg-[#FAF3E6]',
  champagneRing: 'ring-1 ring-[#E8D8A8]',
  goldRule: 'border-[#E8D8A8]/50',
};

/* Board type → short, humane label. LiteAPI returns a mess of codes
   ("BB", "Bed and Breakfast", "ALL_INCLUSIVE", "Room Only"). We normalise
   to title case and pick up the inclusions for the "choices" column. */
const BOARD_MEANS = (raw: string) => {
  const b = raw.trim().toLowerCase();
  if (!b || b === 'room only' || b === 'ro') return { label: 'Room Only', breakfast: false, lunch: false, dinner: false, allInclusive: false };
  if (b === 'bb' || b.includes('breakfast')) return { label: 'Bed & Breakfast', breakfast: true, lunch: false, dinner: false, allInclusive: false };
  if (b === 'hb' || b.includes('half board')) return { label: 'Half Board', breakfast: true, lunch: false, dinner: true, allInclusive: false };
  if (b === 'fb' || b.includes('full board')) return { label: 'Full Board', breakfast: true, lunch: true, dinner: true, allInclusive: false };
  if (b.includes('all') && b.includes('incl')) return { label: 'All Inclusive', breakfast: true, lunch: true, dinner: true, allInclusive: true };
  // Fallback: keep the supplier's label but title-case it
  return {
    label: raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    breakfast: false, lunch: false, dinner: false, allInclusive: false,
  };
};

const fmtGBP = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`;

/* ─────────────────── Dots (positive + neutral) ─────────────────── */

function ChoiceDot({ tone }: { tone: 'positive' | 'neutral' }) {
  if (tone === 'positive') {
    return <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden />;
  }
  return <span className="inline-block w-1.5 h-1.5 rounded-full border border-slate-300 bg-transparent shrink-0" aria-hidden />;
}

function Choice({ tone, children }: { tone: 'positive' | 'neutral'; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 leading-tight">
      <ChoiceDot tone={tone} />
      <span
        className={
          tone === 'positive'
            ? 'text-[.78rem] font-semibold text-[#1A1D2B]'
            : 'text-[.78rem] font-medium text-slate-500'
        }
      >
        {children}
      </span>
    </div>
  );
}

/* ─────────────────── Single row ─────────────────── */

function RateRow({
  rate,
  nights,
  roomName,
  isSelected,
  onSelect,
  onReserve,
}: {
  rate: RoomRate;
  nights: number;
  roomName: string;
  isSelected: boolean;
  onSelect: () => void;
  onReserve: () => void;
}) {
  const board = BOARD_MEANS(rate.boardType);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onClick={onSelect}
      onKeyDown={onKey}
      className={`relative grid grid-cols-1 md:grid-cols-[1.2fr_1.3fr_auto] gap-5 md:gap-8 p-5 md:p-6 transition-all duration-300 ease-out cursor-pointer
        ${isSelected
          ? `${SCOUT_TOKENS.champagneBg} ${SCOUT_TOKENS.champagneRing} rounded-2xl`
          : 'bg-white hover:bg-[#FCFAF5] rounded-2xl'
        }`}
    >
      {/* ─── Column 1: Room & Board ─── */}
      <div>
        <h3 className="font-[var(--font-playfair)] font-black text-[1.15rem] text-[#0a1628] tracking-tight leading-tight">
          {/* Graceful fallback: when the supplier omits a room name we let the
              board-type label wear the Playfair weight. "All Inclusive" in
              Playfair looks like a premium title — happy coincidence. */}
          {roomName || board.label}
        </h3>
        <div className="text-[.68rem] font-semibold text-slate-500 uppercase tracking-[2px] mt-1.5">
          {board.label}
        </div>
      </div>

      {/* ─── Column 2: Scout Choices ─── */}
      <div className="flex flex-col gap-2 md:gap-2 md:pt-0.5">
        {board.breakfast && <Choice tone="positive">Breakfast included</Choice>}
        {board.allInclusive && <Choice tone="positive">All meals &amp; drinks included</Choice>}
        {!board.breakfast && !board.allInclusive && (
          <Choice tone="neutral">Room only — meals not included</Choice>
        )}
        {rate.refundable ? (
          <Choice tone="positive">Free cancellation</Choice>
        ) : (
          <Choice tone="neutral">Non-refundable</Choice>
        )}
        <Choice tone="positive">High-speed Wi-Fi</Choice>
      </div>

      {/* ─── Column 3: Price + CTA ─── */}
      <div className="flex flex-col items-start md:items-end justify-between gap-3 md:text-right">
        <div>
          <div className="font-[var(--font-playfair)] font-black text-[1.6rem] md:text-[1.75rem] text-[#0a1628] tracking-tight leading-none">
            {fmtGBP(rate.totalPrice)}
          </div>
          <div className="text-[.62rem] font-semibold text-slate-400 uppercase tracking-[1.5px] mt-1">
            Total for {nights} {nights === 1 ? 'night' : 'nights'}
          </div>
          <div className="text-[.68rem] font-medium text-slate-500 mt-1">
            {fmtGBP(rate.pricePerNight)} / night · taxes included
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onReserve();
          }}
          className={`inline-flex items-center gap-2 font-poppins font-bold text-[.78rem] rounded-full px-5 py-2.5 transition-all duration-200 ease-out
            ${isSelected
              ? 'bg-[#0a1628] text-white hover:bg-[#0066FF] shadow-[0_6px_18px_rgba(10,22,40,0.18)]'
              : 'bg-white border border-[#0a1628] text-[#0a1628] hover:bg-[#0a1628] hover:text-white'
            }`}
        >
          Secure this rate →
        </button>
      </div>
    </div>
  );
}

/* ─────────────────── Table shell ─────────────────── */

export default function RoomsTable({
  offers,
  nights,
  roomName,
  selectedOfferId,
  onSelect,
  onReserve,
}: {
  offers: RoomRate[];
  nights: number;
  /** Optional — currently unused by the board-level rows; wired up for
   *  Option-B phase when we emit per-room-type rates. */
  roomName?: string | null;
  selectedOfferId: string | null;
  onSelect: (offerId: string) => void;
  onReserve: (offerId: string) => void;
}) {
  const sorted = useMemo(() => [...offers].sort((a, b) => a.totalPrice - b.totalPrice), [offers]);

  if (!sorted || sorted.length === 0) return null;

  return (
    <section className="bg-white border border-[#E8ECF4] rounded-3xl p-2 md:p-3 shadow-[0_4px_24px_rgba(10,22,40,0.04)]">
      <div className="px-4 md:px-5 pt-4 pb-3 flex items-baseline justify-between">
        <h2 className="font-[var(--font-playfair)] font-black text-[1.35rem] md:text-[1.55rem] text-[#0a1628] tracking-tight">
          Choose your rate
        </h2>
        <p className="text-[.68rem] font-semibold text-slate-500 uppercase tracking-[1.5px] hidden md:block">
          {sorted.length} option{sorted.length === 1 ? '' : 's'} · cheapest first
        </p>
      </div>

      {/* Rate rows separated by the gold rule — a watermark, not a frame */}
      <div className="divide-y divide-[#E8D8A8]/50">
        {sorted.map((rate) => (
          <RateRow
            key={rate.offerId}
            rate={rate}
            nights={nights}
            roomName={roomName || ''}
            isSelected={rate.offerId === selectedOfferId}
            onSelect={() => onSelect(rate.offerId)}
            onReserve={() => onReserve(rate.offerId)}
          />
        ))}
      </div>
    </section>
  );
}
