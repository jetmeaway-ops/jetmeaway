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

/* Lightweight room-metadata shape the RoomsTable accepts. Matches the shape
   exported by /api/hotels/details — photos, size, beds, amenities, maximum
   occupancy. All fields optional so the row degrades gracefully when the
   supplier returned sparse data. */
export interface RoomMetaInput {
  id: string;
  name: string;
  description: string | null;
  photos: string[];
  amenities: string[];
  maxOccupancy: number | null;
  sizeSqm: number | null;
  beds: string | null;
}

/* A compact in-room amenity shortlist. We pick the first ≤3 that match these
   popular categories (booking.com-style), so the row always surfaces the
   highest-signal facts first. Lowercase substring match — keeps us resilient
   to LiteAPI phrasing drift ("Hair Dryer" vs "Hairdryer" vs "Hair-dryer"). */
const ROOM_AMENITY_PRIORITY: Array<{ icon: string; label: string; match: string[] }> = [
  { icon: 'fa-snowflake', label: 'Air conditioning', match: ['air condition', 'a/c', 'aircon'] },
  { icon: 'fa-wifi', label: 'Free Wi-Fi', match: ['wifi', 'wi-fi', 'internet'] },
  { icon: 'fa-tv', label: 'Flat-screen TV', match: ['tv', 'television'] },
  { icon: 'fa-wind', label: 'Hairdryer', match: ['hair'] },
  { icon: 'fa-mug-hot', label: 'Tea/coffee', match: ['coffee', 'tea', 'kettle', 'nespresso'] },
  { icon: 'fa-champagne-glasses', label: 'Minibar', match: ['minibar', 'mini-bar', 'mini bar'] },
  { icon: 'fa-lock', label: 'In-room safe', match: ['safe', 'safety deposit'] },
  { icon: 'fa-bath', label: 'Private bathroom', match: ['bathroom', 'bathtub', 'shower'] },
  { icon: 'fa-bolt', label: 'Iron & board', match: ['iron'] },
];

function pickRoomHighlights(amenities: string[]): Array<{ icon: string; label: string }> {
  const have = amenities.map((a) => a.toLowerCase());
  const picks: Array<{ icon: string; label: string }> = [];
  for (const p of ROOM_AMENITY_PRIORITY) {
    if (have.some((a) => p.match.some((m) => a.includes(m)))) {
      picks.push({ icon: p.icon, label: p.label });
    }
    if (picks.length >= 3) break;
  }
  return picks;
}

export type RoomRate = {
  offerId: string;
  boardType: string;
  totalPrice: number;
  pricePerNight: number;
  refundable: boolean;
  /** Phase-2: room category name ("Deluxe King, City View"). When absent the
   *  row title gracefully falls back to the board label — Phase-1 parity. */
  roomName?: string | null;
  /** Phase-3: per-row Scout Deal signal. When negotiatedPrice is present AND
   *  strictly less than marketPrice, the row renders the orange ribbon +
   *  strikethrough market total. Otherwise the row stays quiet. */
  negotiatedPrice?: number | null;
  marketPrice?: number | null;
  /** Phase-4: per-row property-payable taxes (city tax / VAT) that LiteAPI
   *  marks `included: false`. Displayed alongside totalPrice as an honest
   *  grand-total line so BB vs RO comparisons reflect reality, not just
   *  supplier net rates. */
  excludedTaxes?: number | null;
  /** v2-plan step-2: ISO timestamp for when free cancellation expires. When
   *  present and in the future, the row shows "Free cancellation until
   *  {date}" instead of the generic badge — RateHawk-grade clarity. */
  cancelDeadline?: string | null;
  /** v2-plan step-3: supported payment methods. When the list includes
   *  `PAY_AT_HOTEL` we render an emerald chip saying so; otherwise silent. */
  paymentTypes?: string[] | null;
  /** LiteAPI commission — our merchant margin for this row (scaled pro-rata
   *  from the hotel-level commission reported by LiteAPI). Not displayed in
   *  the UI; forwarded to /api/hotels/start-booking so the admin unified
   *  store can show accurate margin on the booking row. */
  commission?: number | null;
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

/* v2-plan step-2: format an ISO timestamp to a short human deadline.
   Returns null when the string isn't a real date or sits in the past.
   Example: "2026-05-28T23:59:00Z" → "28 May 2026". */
function fmtCancelDeadline(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  if (t < Date.now()) return null;
  return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* v2-plan step-3: does this rate allow paying at the hotel? LiteAPI uses
   the literal code `PAY_AT_HOTEL`; we match case-insensitively with
   underscore/hyphen tolerance. */
function isPayAtHotel(types: string[] | null | undefined): boolean {
  if (!types || types.length === 0) return false;
  return types.some((t) => /pay.?at.?hotel/i.test(t.replace(/_/g, '-')));
}

/* ─────────────────── Dots (positive + neutral) ─────────────────── */

function ChoiceDot({ tone }: { tone: 'positive' | 'neutral' }) {
  if (tone === 'positive') {
    return <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden />;
  }
  return <span className="inline-block w-1.5 h-1.5 rounded-full border border-slate-300 bg-transparent shrink-0" aria-hidden />;
}

function SpecPill({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-[#E8D8A8]/70 text-[#0a1628] text-[.7rem] font-bold">
      <i className={`fa-solid ${icon} text-[.62rem] text-[#8a6d00]`} />
      {label}
    </span>
  );
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n - 1).trimEnd()}…`;
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
  roomMeta,
  onSelect,
  onReserve,
  onShowDetails,
}: {
  rate: RoomRate;
  nights: number;
  roomName: string;
  isSelected: boolean;
  /** Phase-4: resolved room metadata (photos/size/beds/amenities). Null when
   *  the supplier didn't emit matching room data — the row falls back to the
   *  Phase-1 layout (no thumb, no chips, no "see details" link). */
  roomMeta: RoomMetaInput | null;
  onSelect: () => void;
  onReserve: () => void;
  onShowDetails?: () => void;
}) {
  const board = BOARD_MEANS(rate.boardType);

  /* Row title resolution (Phase-2):
     1. rate.roomName  — per-rate supplier name ("Deluxe King, City View")
     2. roomName prop  — table-level fallback for single-room hotels
     3. board.label    — graceful Phase-1 fallback ("All Inclusive" in Playfair
                         reads like a boutique title — happy coincidence)   */
  const title = rate.roomName || roomName || board.label;
  const showBoardSubtitle = Boolean(rate.roomName || roomName);

  // Phase-4: derive the top-3 in-room amenity highlights once per render.
  const roomHighlights = roomMeta ? pickRoomHighlights(roomMeta.amenities) : [];
  const thumb = roomMeta?.photos?.[0] || null;

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
      className={`relative grid grid-cols-1 md:grid-cols-[1.5fr_1.1fr_auto] gap-5 md:gap-8 p-5 md:p-6 transition-all duration-300 ease-out cursor-pointer
        ${isSelected
          ? `${SCOUT_TOKENS.champagneBg} ${SCOUT_TOKENS.champagneRing} rounded-2xl`
          : 'bg-white hover:bg-[#FCFAF5] rounded-2xl'
        }`}
    >
      {/* ─── Column 1: Room identity + spec chips + in-room amenities ─── */}
      <div className="flex gap-4">
        {/* Thumbnail — opens the detail modal on click */}
        {thumb && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onShowDetails?.(); }}
            aria-label={`See photos of ${title}`}
            className="flex-shrink-0 w-[88px] h-[68px] md:w-[104px] md:h-[80px] rounded-xl overflow-hidden border border-[#E8ECF4] bg-[#F1F3F7] group relative"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumb}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
            <span className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <i className="fa-solid fa-expand text-white text-[.9rem]" />
            </span>
          </button>
        )}

        <div className="min-w-0 flex-1">
          <h3 className="font-[var(--font-playfair)] font-black text-[1.15rem] text-[#0a1628] tracking-tight leading-tight">
            {title}
          </h3>
          {showBoardSubtitle && (
            <div className="text-[.68rem] font-semibold text-slate-500 uppercase tracking-[2px] mt-1">
              {board.label}
            </div>
          )}

          {/* Phase-4: spec chips — size / beds / occupancy. Each chip is a
              small, quiet pill — never shouting, always legible. */}
          {(roomMeta?.sizeSqm || roomMeta?.beds || roomMeta?.maxOccupancy) && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {roomMeta.sizeSqm && (
                <SpecPill icon="fa-up-right-and-down-left-from-center" label={`${roomMeta.sizeSqm} m²`} />
              )}
              {roomMeta.beds && (
                <SpecPill icon="fa-bed" label={truncate(roomMeta.beds, 32)} />
              )}
              {roomMeta.maxOccupancy && (
                <SpecPill icon="fa-user-group" label={`Sleeps ${roomMeta.maxOccupancy}`} />
              )}
            </div>
          )}

          {/* Phase-4: top-3 in-room amenity highlights */}
          {roomHighlights.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {roomHighlights.map((h) => (
                <span key={h.label} className="inline-flex items-center gap-1.5 text-[.72rem] font-semibold text-slate-600">
                  <i className={`fa-solid ${h.icon} text-[.66rem] text-[#8a6d00]`} />
                  {h.label}
                </span>
              ))}
            </div>
          )}

          {/* Phase-4: "See details" link — opens the modal with full photos
              + amenity list. Stop propagation so the row-click selector
              doesn't fire alongside. */}
          {roomMeta && onShowDetails && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onShowDetails(); }}
              className="mt-2.5 inline-flex items-center gap-1 text-[.74rem] font-bold text-[#0066FF] hover:text-[#0a1628] transition-colors"
            >
              See room details & photos
              <i className="fa-solid fa-arrow-right text-[.62rem]" />
            </button>
          )}
        </div>
      </div>

      {/* ─── Column 2: Scout Choices (board + cancellation + Wi-Fi) ─── */}
      <div className="flex flex-col gap-2 md:gap-2 md:pt-0.5">
        {board.breakfast && <Choice tone="positive">Breakfast included</Choice>}
        {board.allInclusive && <Choice tone="positive">All meals &amp; drinks included</Choice>}
        {!board.breakfast && !board.allInclusive && (
          <Choice tone="neutral">Room only — meals not included</Choice>
        )}
        {(() => {
          // v2-plan step-2: surface the exact cancel deadline when the
          // supplier emits one. Falls back to the generic badge when it
          // doesn't, so refundable rates always carry a positive line.
          const deadline = rate.refundable ? fmtCancelDeadline(rate.cancelDeadline) : null;
          if (rate.refundable) {
            return (
              <Choice tone="positive">
                {deadline ? `Free cancellation until ${deadline}` : 'Free cancellation'}
              </Choice>
            );
          }
          return <Choice tone="neutral">Non-refundable</Choice>;
        })()}
        {/* v2-plan step-3: "Pay at hotel" — only when the rate genuinely
            supports it. Silent otherwise (Scout rule — we never invent a
            positive). */}
        {isPayAtHotel(rate.paymentTypes) && (
          <Choice tone="positive">No prepayment — pay at the property</Choice>
        )}
        <Choice tone="positive">High-speed Wi-Fi</Choice>
      </div>

      {/* ─── Column 3: Price + CTA ─── */}
      <div className="flex flex-col items-start md:items-end justify-between gap-3 md:text-right">
        <div>
          {/* Phase-3: Scout Deal ribbon — only when the row's negotiated price
              is strictly less than its market price. Silent otherwise. */}
          {rate.negotiatedPrice != null && rate.marketPrice != null && rate.negotiatedPrice < rate.marketPrice && (
            <>
              <span className="inline-block text-[.55rem] font-black uppercase tracking-[1.2px] bg-gradient-to-r from-orange-500 to-amber-500 text-white px-2 py-0.5 rounded-full mb-1">
                Scout Deal
              </span>
              <div className="text-[.8rem] text-slate-400 font-bold line-through leading-none">
                {fmtGBP(rate.marketPrice)}
              </div>
            </>
          )}
          <div className="font-[var(--font-playfair)] font-black text-[1.6rem] md:text-[1.75rem] text-[#0a1628] tracking-tight leading-none">
            {fmtGBP(rate.totalPrice)}
          </div>
          <div className="text-[.62rem] font-semibold text-slate-400 uppercase tracking-[1.5px] mt-1">
            Total for {nights} {nights === 1 ? 'night' : 'nights'}
          </div>
          <div className="text-[.68rem] font-medium text-slate-500 mt-1">
            {fmtGBP(rate.pricePerNight)} / night · {rate.excludedTaxes && rate.excludedTaxes > 0 ? 'incl. VAT' : 'all taxes & fees included'}
          </div>
          {rate.excludedTaxes != null && rate.excludedTaxes > 0 && (
            <div className="text-[.66rem] font-medium text-slate-500 mt-0.5">
              + {fmtGBP(rate.excludedTaxes)} city tax payable at the property
            </div>
          )}
          {rate.negotiatedPrice != null && rate.marketPrice != null && rate.negotiatedPrice < rate.marketPrice && (
            <div className="text-[.68rem] font-bold text-emerald-600 mt-1">
              You save {fmtGBP(rate.marketPrice - rate.negotiatedPrice)}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onReserve();
          }}
          className={`inline-flex items-center justify-center gap-2 font-poppins font-bold text-[.8rem] rounded-full px-5 min-h-[44px] transition-all duration-200 ease-out
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
  roomMetaByName,
  onSelect,
  onReserve,
  onShowDetails,
}: {
  offers: RoomRate[];
  nights: number;
  /** Optional — currently unused by the board-level rows; wired up for
   *  Option-B phase when we emit per-room-type rates. */
  roomName?: string | null;
  selectedOfferId: string | null;
  /** Phase-4: map from lowercased room name → parsed room metadata
   *  (photos/size/beds/amenities). Rows fall back to the Phase-1 layout
   *  when the map doesn't contain a match. */
  roomMetaByName?: Map<string, RoomMetaInput>;
  onSelect: (offerId: string) => void;
  onReserve: (offerId: string) => void;
  /** Phase-4: open the room detail modal for a given offerId. Page owns the
   *  modal so multiple rows share the same dialog instance. */
  onShowDetails?: (offerId: string) => void;
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
        {sorted.map((rate) => {
          const nameKey = (rate.roomName || roomName || '').toLowerCase().trim();
          const meta = nameKey && roomMetaByName ? (roomMetaByName.get(nameKey) || null) : null;
          return (
            <RateRow
              key={rate.offerId}
              rate={rate}
              nights={nights}
              roomName={roomName || ''}
              roomMeta={meta}
              isSelected={rate.offerId === selectedOfferId}
              onSelect={() => onSelect(rate.offerId)}
              onReserve={() => onReserve(rate.offerId)}
              onShowDetails={meta && onShowDetails ? () => onShowDetails(rate.offerId) : undefined}
            />
          );
        })}
      </div>
    </section>
  );
}
