'use client';

/* ═══════════════════════════════════════════════════════════════════════════
   ROOMS TABLE — "Scout" identity
   ───────────────────────────────────────────────────────────────────────────
   A standard wholesale-availability grid, reimagined in Scout's voice:
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
import { useTranslations } from 'next-intl';

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
   popular categories (standard hotel-grid layout), so the row always surfaces the
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
  /** How many guests THIS PRICE COVERS — the per-rate figure from
   *  /hotels/rates, summed across rooms on multi-room quotes.
   *
   *  🔴 It is NOT the room's capacity, and must never be labelled "Sleeps N".
   *  Audited 2026-08-27: searching 2 adults badged every room in the hotel
   *  "Sleeps 2" — including "Family Room (4 Adults)" — and searching 3 adults
   *  re-badged a Standard Double as "Sleeps 3". The figure simply echoes the
   *  party searched, so it misleads in both directions: a family rules out a
   *  real family room, and three people are told a double fits them. The
   *  room's true size comes from the catalogue (RoomMetaInput.maxOccupancy);
   *  this number answers a different, still-useful question — "is the price
   *  I'm looking at for all of us?" — and is labelled accordingly. */
  maxOccupancy?: number | null;
  /** Multi-room bundles: the name of EACH room in the quote, in occupancy
   *  order. LiteAPI titles a bundle by ONE of its rooms, so a "Room for 3
   *  people" title priced "for 2 rooms" left the customer guessing what the
   *  second room is (owner report 2026-08-27). Null/absent hides the list. */
  roomBreakdown?: string[] | null;
  /** The sleeping arrangement as the supplier worded it ("2 Twin Bunk Beds
   *  and 1 Double Bed"), split off the room name upstream. Preferred over the
   *  catalogue's bed string because it belongs to THIS rate. */
  bedInfo?: string | null;
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
  if (!b || b === 'room only' || b === 'ro') return { key: 'roomOnly', label: 'Room Only', breakfast: false, lunch: false, dinner: false, allInclusive: false };
  if (b === 'bb' || b.includes('breakfast')) return { key: 'bb', label: 'Bed & Breakfast', breakfast: true, lunch: false, dinner: false, allInclusive: false };
  if (b === 'hb' || b.includes('half board')) return { key: 'hb', label: 'Half Board', breakfast: true, lunch: false, dinner: true, allInclusive: false };
  if (b === 'fb' || b.includes('full board')) return { key: 'fb', label: 'Full Board', breakfast: true, lunch: true, dinner: true, allInclusive: false };
  if (b.includes('all') && b.includes('incl')) return { key: 'ai', label: 'All Inclusive', breakfast: true, lunch: true, dinner: true, allInclusive: true };
  // Fallback: keep the supplier's label but title-case it
  return {
    key: 'other',
    label: raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    breakfast: false, lunch: false, dinner: false, allInclusive: false,
  };
};

const fmtGBP = (n: number) => {
  const rounded = Math.round(n * 100) / 100;
  const isWhole = Number.isInteger(rounded);
  return `£${rounded.toLocaleString('en-GB', {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * What THIS RATE actually costs: the supplier total plus every tax LiteAPI
 * marks payable at the property desk.
 *
 * 🔴 This is the ONLY figure allowed to rank or compare rows — the same rule
 * `allInTotal` enforces on the results list (src/app/hotels/hotels-client.tsx).
 * That fix stopped one hotel outranking another on its sticker price; it was
 * never carried one page deeper, so the rooms table went on sorting rows by
 * `totalPrice` alone under a header that promises "cheapest first".
 *
 * Measured on prod 2026-08-28, Hotel Philia Rome (la_lp5048d), 2 adults.
 * 14-17 Oct, 49 rate rows: row 1 was DOUBLE STANDARD at £270.89 + £55.21 owed
 * at the property = £326.10, while the genuinely cheapest stay — Standard Room
 * at £288.35 with nothing owed — sat at row 5. £37.75 dearer at the top of a
 * table that said cheapest first, with 46 of the 49 positions showing a dearer
 * stay than this ordering gives (worst £40.29). Re-run on 4-7 Nov: row 1 owed
 * £42.82 more than row 2, and all 5 hotels re-sampled were misordered, worst
 * single position £74.71. Every one of 12 Rome hotels checked was affected.
 * Rows carrying no `excludedTaxes` (LiteAPI omits the field entirely on rates
 * with nothing payable at the desk) must read as 0, not as missing, or they
 * sink below rates that genuinely owe money on arrival.
 *
 * Exported so the price shown, the sort order and anything that later needs
 * "the cheapest rate here" (e.g. the JSON-LD `lowPrice` in page.tsx, which
 * still reduces on `totalPrice`) can share one definition rather than drift.
 */
export function allInTotal(rate: RoomRate): number {
  return rate.totalPrice + (rate.excludedTaxes ?? 0);
}

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

/* Capacity as a row of little people. A number has to be read and converted;
   five figures are counted at a glance, which is why every serious booking
   site draws them. Above six the row stops being countable, so it collapses
   to one figure and a multiplier. Decorative only — the caller supplies the
   accessible text. */
function GuestIcons({ n }: { n: number }) {
  if (n <= 0) return null;
  if (n > 6) {
    return (
      <span className="inline-flex items-center gap-1 text-[#0a1628]" aria-hidden>
        <i className="fa-solid fa-user text-[.72rem]" />
        <span className="text-[.75rem] font-bold">×{n}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-[3px]" aria-hidden>
      {Array.from({ length: n }).map((_, i) => (
        <i key={i} className="fa-solid fa-user text-[.72rem] text-[#0a1628]" />
      ))}
    </span>
  );
}

/* The bed line — the fact a family looks for first and the one our cards used
   to bury. Rendered whenever either the rate or the room catalogue supplies
   it. */
function BedLine({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 mt-2">
      <i className="fa-solid fa-bed text-[.72rem] text-[#8a6d00] mt-[3px]" aria-hidden />
      <span className="text-[.82rem] font-semibold text-[#1A1D2B] leading-snug">{text}</span>
    </div>
  );
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

/* ─────────────────── The bed text, printed once ───────────────────
   Upstream splits the sleeping arrangement off the supplier's room name into
   `bedInfo`, but most suppliers ALSO leave a copy inside the name, so the row
   rendered "Standard Bungalow(2 Twin Beds and 1 Twin Sofa Bed)" with
   "2 Twin Beds and 1 Twin Sofa Bed" repeated on the bed line directly beneath.
   Measured on prod 2026-08-27 across 20 Rome + Milan hotels (640 rate rows):
   178 rows carried a bedInfo and 140 of those (78.7%, or 21.9% of every row on
   the page) repeated it in the title — all 140 as a trailing bracket. Replaying
   the same 640 rows through this helper leaves 0 duplicates, 140 shortened
   titles, and no row without a title or without its bed line.

   The two copies differ cosmetically ("(2 Twin Beds and 1 Twin Sofa Bed)" vs
   "2 twin beds & 1 twin sofa bed"), so only a case- and punctuation-blind
   comparison catches them, and "&" has to read as "and" because suppliers use
   both spellings for the same room.

   The duplicate is cut from the TITLE rather than from the bed line: the bed
   line is the fact a family looks for first and it carries the bed icon, so
   dropping it would push that fact back inside a long Playfair title — exactly
   what this card was rebuilt to stop doing. Only when the supplier names a room
   by its beds and nothing else ("1 Double Bed") do we keep the title and drop
   the bed line, because a row with no title at all is worse.

   Deliberately fixed here and not in the upstream split: src/lib/liteapi.ts
   owns `bedInfo`, and rows whose name was keyed differently never got split
   there at all — the row is the one place that sees both strings. */

/** Case- and punctuation-blind normalisation, plus a per-character index back
 *  into the ORIGINAL string so a match can be cut out of the original text. */
function normaliseBedText(s: string): { norm: string; map: number[] } {
  const chars: string[] = [];
  const map: number[] = [];
  let gap = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i].toLowerCase();
    const token = /[a-z0-9]/.test(c) ? c : c === '&' ? 'and' : '';
    if (!token) {
      if (chars.length > 0) gap = true;
      continue;
    }
    if (gap) { chars.push(' '); map.push(i); gap = false; }
    for (const ch of token) { chars.push(ch); map.push(i); }
    // "&" expanded to a whole word — force a separator after it so it can't
    // fuse with the next token ("A&B" must normalise to "a and b").
    if (token.length > 1) gap = true;
  }
  return { norm: chars.join(''), map };
}

/** The row title with any repeated bed description removed, and the bed line
 *  to render (null when the title has to keep it). */
function splitBedFromTitle(
  title: string,
  beds: string | null,
): { title: string; bedLine: string | null } {
  if (!beds) return { title, bedLine: null };
  const t = normaliseBedText(title);
  const b = normaliseBedText(beds).norm;
  if (!b || !t.norm) return { title, bedLine: beds };

  // Whole-word match only, so "1 double bed" is never cut out of the middle of
  // "…1 double bedroom suite…".
  let at = -1;
  for (let i = t.norm.indexOf(b); i !== -1; i = t.norm.indexOf(b, i + 1)) {
    const startsWord = i === 0 || t.norm[i - 1] === ' ';
    const endsWord = i + b.length === t.norm.length || t.norm[i + b.length] === ' ';
    if (startsWord && endsWord) { at = i; break; }
  }
  if (at === -1) return { title, bedLine: beds }; // no duplication — nothing to do

  const cleaned = (title.slice(0, t.map[at]) + title.slice(t.map[at + b.length - 1] + 1))
    // Whatever carried the bed text — "Bungalow(…)", "Room [ … ]" — is empty now.
    .replace(/\(\s*\)|\[\s*\]|\{\s*\}/g, '')
    .replace(/\s{2,}/g, ' ')
    // A cut from the MIDDLE of a name leaves its two separators touching:
    // "Junior Suite - 1 King Bed - Sea View" → "Junior Suite - - Sea View".
    .replace(/([,;:·•|\/–—-])\s*(?:[,;:·•|\/–—-]\s*)+/g, '$1 ')
    .replace(/\s+([,;:])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,;:\/|·•–—-]+|[\s,;:\/|·•–—-]+$/g, '')
    .trim();

  if (!cleaned) return { title, bedLine: null };
  return { title: cleaned, bedLine: beds };
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
  siblingHasBedInfo = false,
  nights,
  rooms,
  roomName,
  isSelected,
  roomMeta,
  fallbackPhoto,
  party,
  unitLabel,
  onSelect,
  onReserve,
  onShowDetails,
}: {
  rate: RoomRate;
  /** True when another row for the SAME room + board carries a rate-specific
   *  bed string. Then this row must NOT borrow the catalogue's beds: doing so
   *  is what made two differently-priced rows read identically. */
  siblingHasBedInfo?: boolean;
  nights: number;
  /** Rooms in this quote — totalPrice covers ALL of them. >1 happens when a
   *  bigger party is split across rooms; without the label the doubled total
   *  reads as a pricing bug (owner report 2026-07-14). */
  rooms: number;
  roomName: string;
  isSelected: boolean;
  /** Phase-4: resolved room metadata (photos/size/beds/amenities). Null when
   *  the supplier didn't emit matching room data — the row falls back to the
   *  Phase-1 layout (no thumb, no chips, no "see details" link). */
  roomMeta: RoomMetaInput | null;
  /** Hotel-level fallback thumbnail when roomMeta lookup misses. */
  fallbackPhoto?: string | null;
  /** The occupancy this quote was PRICED for (server echo, never URL params).
   *  Renders "Price for 2 adults + 3 children" on every row — the one line
   *  that is always available and always true. Null hides the line. */
  party?: { adults: number; children: number; rooms: number } | null;
  /** Pre-translated property-unit pill ("Entire apartment"). Null hides it. */
  unitLabel?: string | null;
  onSelect: () => void;
  onReserve: () => void;
  onShowDetails?: () => void;
}) {
  const t = useTranslations('hotelDetail');
  const board = BOARD_MEANS(rate.boardType);

  /* Row title resolution (Phase-2):
     1. rate.roomName  — per-rate supplier name ("Deluxe King, City View")
     2. roomName prop  — table-level fallback for single-room hotels
     3. board.label    — graceful Phase-1 fallback ("All Inclusive" in Playfair
                         reads like a boutique title — happy coincidence)   */
  const suppliedTitle = rate.roomName || roomName || (board.key === 'other' ? board.label : t('board.' + board.key));
  const showBoardSubtitle = Boolean(rate.roomName || roomName);

  /* The rate's own bed string beats the catalogue's: it belongs to THIS rate,
     while roomMeta is attached by fuzzy name match and can describe a
     different room. Whichever we end up with, it is printed once — see
     splitBedFromTitle above. */
  // 🔴 Borrow the catalogue's beds ONLY when no sibling row is describing its
  // own. Two rows for the same room + board at different prices used to
  // converge on identical words: the described row had its bed text cut out of
  // its title, while the undescribed one filled the same words back in from
  // roomMeta — leaving the customer two identical cards at GBP 308.79 and
  // GBP 449.54 with nothing to tell them apart. A blank bed line is honest;
  // a borrowed one is not.
  const bedSource = rate.bedInfo || (siblingHasBedInfo ? null : roomMeta?.beds) || null;
  const { title, bedLine } = splitBedFromTitle(suppliedTitle, bedSource);

  // Phase-4: derive the top-3 in-room amenity highlights once per render.
  const roomHighlights = roomMeta ? pickRoomHighlights(roomMeta.amenities) : [];
  const thumb = roomMeta?.photos?.[0] || fallbackPhoto || null;

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
            aria-label={t('seePhotosOf', { title })}
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
              {board.key === 'other' ? board.label : t('board.' + board.key)}
            </div>
          )}

          {/* Multi-room bundles: spell out what each room IS. The title above
              names only one of the rooms (LiteAPI bundles are titled by their
              first room), so "TRIPLE — for 3 people" over a 2-room price read
              as a contradiction. Identical rooms collapse to one ×-count line;
              mixed bundles list each room on its own line. */}
          {rooms > 1 && rate.roomBreakdown && rate.roomBreakdown.length === rooms && (
            <div className="mt-2 flex flex-col gap-1">
              {rate.roomBreakdown.every((nm) => nm === rate.roomBreakdown![0]) ? (
                <span className="inline-flex items-start gap-1.5 text-[.74rem] font-semibold text-slate-700">
                  <i className="fa-solid fa-door-open text-[.66rem] text-[#8a6d00] mt-0.5" aria-hidden />
                  {t('bundleSameRoom', { count: rooms })}
                </span>
              ) : (
                rate.roomBreakdown.map((nm, i) => (
                  <span key={i} className="inline-flex items-start gap-1.5 text-[.74rem] font-semibold text-slate-700">
                    <i className="fa-solid fa-door-open text-[.66rem] text-[#8a6d00] mt-0.5" aria-hidden />
                    <span>{t('bundleRoomN', { n: i + 1 })} {truncate(nm, 64)}</span>
                  </span>
                ))
              )}
            </div>
          )}

          {/* What you actually get, in the order a family reads it: the beds,
              then who fits, then the room's other facts.

              CAPACITY IS TWO DIFFERENT FACTS and they must not be conflated
              (audit 2026-08-27):
                • the ROOM's size comes from the catalogue — that is the only
                  source entitled to say "Sleeps N";
                • the RATE's figure only echoes the party searched, so it can
                  answer "is this price for all of us?" and nothing more.
              Showing the rate figure as "Sleeps N" badged a Standard Double as
              sleeping 3 and a 4-person Family Room as sleeping 2. */}
          {(() => {
            const pricedFor = rate.maxOccupancy ?? null;
            // The catalogue is only trusted about capacity while it is not
            // contradicted by the booking itself. It is joined to the rate by
            // fuzzy NAME match, so it can attach the wrong room — measured on
            // Trilussa Palace Rome, where a £1,948 "Suite (3 rooms, 6 pers)"
            // priced for six was badged "Sleeps 2" off a matched 2-person spa
            // room. If the supplier just sold this rate to more people than the
            // catalogue's room holds, the match is wrong, and the honest thing
            // to say is what the price actually covers.
            const catalogueSleeps = roomMeta?.maxOccupancy ?? null;
            const roomSleeps =
              catalogueSleeps != null && (pricedFor == null || catalogueSleeps >= pricedFor)
                ? catalogueSleeps
                : null;
            const capacityN = roomSleeps ?? pricedFor;
            const capacityLabel = roomSleeps
              ? t('sleeps', { n: roomSleeps })
              : pricedFor
                ? t('fitsYourParty', { n: pricedFor })
                : null;

            if (!(bedLine || capacityLabel || unitLabel || roomMeta?.sizeSqm)) return null;
            return (
              <>
                {bedLine && <BedLine text={truncate(bedLine, 72)} />}
                {capacityLabel && capacityN && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <GuestIcons n={capacityN} />
                    <span className="text-[.8rem] font-bold text-[#0a1628]">{capacityLabel}</span>
                  </div>
                )}
                {(unitLabel || roomMeta?.sizeSqm) && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {unitLabel && <SpecPill icon="fa-house" label={unitLabel} />}
                    {roomMeta?.sizeSqm && (
                      <SpecPill icon="fa-up-right-and-down-left-from-center" label={`${roomMeta.sizeSqm} m²`} />
                    )}
                  </div>
                )}
              </>
            );
          })()}

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
              {t('seeRoomDetails')}
              <i className="fa-solid fa-arrow-right text-[.62rem]" />
            </button>
          )}
        </div>
      </div>

      {/* ─── Column 2: Scout Choices (board + cancellation + Wi-Fi) ─── */}
      <div className="flex flex-col gap-2 md:gap-2 md:pt-0.5">
        {board.breakfast && <Choice tone="positive">{t('breakfastIncluded')}</Choice>}
        {board.allInclusive && <Choice tone="positive">{t('allMealsDrinks')}</Choice>}
        {!board.breakfast && !board.allInclusive && (
          <Choice tone="neutral">{t('roomOnlyMeals')}</Choice>
        )}
        {(() => {
          // v2-plan step-2: surface the exact cancel deadline when the
          // supplier emits one. Falls back to the generic badge when it
          // doesn't, so refundable rates always carry a positive line.
          const deadline = rate.refundable ? fmtCancelDeadline(rate.cancelDeadline) : null;
          if (rate.refundable) {
            return (
              <Choice tone="positive">
                {deadline ? t('freeCancellationUntil', { date: deadline }) : t('freeCancellation')}
              </Choice>
            );
          }
          return <Choice tone="neutral">{t('nonRefundable')}</Choice>;
        })()}
        {/* v2-plan step-3: "Pay at hotel" — only when the rate genuinely
            supports it. Silent otherwise (Scout rule — we never invent a
            positive). */}
        {isPayAtHotel(rate.paymentTypes) && (
          <Choice tone="positive">{t('noPrepayment')}</Choice>
        )}
        {/* There was a hardcoded "High-speed Wi-Fi" line here, outside every
            conditional, so 100% of rate rows sitewide promised it. Audited
            2026-08-27 against Hotel Tachfine, Marrakech: the entire hotel
            record contains no mention of wifi or internet, and all 13 rows
            still advertised it — and LiteAPI never returns a speed attribute
            for any hotel, so "high-speed" was unsupported even where wifi
            exists. Wi-Fi now appears only via the room amenity list above,
            which is built from supplier data. Same rule as the Pay-at-hotel
            chip two lines up: we never invent a positive. */}
      </div>

      {/* ─── Column 3: Price + CTA ─── */}
      <div className="flex flex-col items-start md:items-end justify-between gap-3 md:text-right">
        <div>
          {/* Phase-3: Scout Deal ribbon — only when the row's negotiated price
              is strictly less than its market price. Silent otherwise. */}
          {rate.negotiatedPrice != null && rate.marketPrice != null && rate.negotiatedPrice < rate.marketPrice && (
            <>
              <span className="inline-block text-[.55rem] font-black uppercase tracking-[1.2px] bg-gradient-to-r from-orange-500 to-amber-500 text-white px-2 py-0.5 rounded-full mb-1">
                {t('scoutDeal')}
              </span>
              <div className="text-[.8rem] text-slate-400 font-bold line-through leading-none">
                {fmtGBP(rate.marketPrice)}
              </div>
            </>
          )}
          <div className="font-[var(--font-playfair)] font-black text-[1.6rem] md:text-[1.75rem] text-[#0a1628] tracking-tight leading-none">
            {fmtGBP(rate.totalPrice)}
          </div>
          {/* Always name the ROOM COUNT, not only when it is more than one.
              A single-room quote used to read "TOTAL FOR 1 NIGHT", which left
              the owner asking how many rooms he was getting (2026-08-27). */}
          <div className="text-[.62rem] font-semibold text-slate-400 uppercase tracking-[1.5px] mt-1">
            {t('totalFor')} {t('roomsSep', { rooms })}{nights} {t('nightWord', { count: nights })}
          </div>
          <div className="text-[.68rem] font-medium text-slate-500 mt-1">
            {fmtGBP(rate.pricePerNight)} {t('perNightSlash')}{rooms > 1 ? ` ${t('forNRooms', { rooms })}` : ''} · {rate.excludedTaxes && rate.excludedTaxes > 0 ? t('inclVat') : t('allTaxesIncluded')}
          </div>
          {rate.excludedTaxes != null && rate.excludedTaxes > 0 && (
            /* The all-in figure has to be ON the row, not just behind the sort.
               Now that rows rank on the all-in cost, a taxed row sits BELOW a
               cheaper-LOOKING untaxed one — Hotel Philia 14-17 Oct now opens
               £288.35 (nothing owed) with £278.48 (+£30.86) two rows under it
               — and with only the sticker price on screen that reads as a
               broken sort rather than an honest one. Same line the results
               list prints under each card (PropertyTaxLine in hotels-client),
               so the two pages state the number the same way. */
            <div className="text-[.66rem] font-medium text-slate-500 mt-0.5">
              + {fmtGBP(rate.excludedTaxes)} {t('cityTaxPayable')}
              <span className="text-slate-400"> · {fmtGBP(allInTotal(rate))} {t('allInTotal')}</span>
            </div>
          )}
          {/* The one line that is ALWAYS available and always true: who this
              price is for — straight from the server's occupancy echo, so it
              cannot drift from what was actually priced. Booking.com prints
              "3 nights, 2 adults, 3 children" on every card for the same
              reason: it kills the "is this for all of us?" doubt. */}
          {party && (
            <div className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-full bg-[#0066FF]/10 border border-[#0066FF]/25 text-[.72rem] font-bold text-[#0052CC] leading-snug">
              <i className="fa-solid fa-user-group text-[.6rem]" aria-hidden />
              <span>{t('pricedForParty', { adults: party.adults, children: party.children, rooms: party.rooms })}</span>
            </div>
          )}
          {rate.negotiatedPrice != null && rate.marketPrice != null && rate.negotiatedPrice < rate.marketPrice && (
            <div className="text-[.68rem] font-bold text-emerald-600 mt-1">
              {t('youSave')} {fmtGBP(rate.marketPrice - rate.negotiatedPrice)}
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
          {t('secureThisRate')}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────── Table shell ─────────────────── */

export default function RoomsTable({
  offers,
  nights,
  rooms = 1,
  roomName,
  selectedOfferId,
  resolveRoomMeta,
  fallbackPhoto,
  party,
  unitLabel,
  onSelect,
  onReserve,
  onShowDetails,
}: {
  offers: RoomRate[];
  nights: number;
  /** Rooms per quote (party split) — labels each total "for N rooms". */
  rooms?: number;
  /** Optional — currently unused by the board-level rows; wired up for
   *  Option-B phase when we emit per-room-type rates. */
  roomName?: string | null;
  selectedOfferId: string | null;
  /** Phase-4: resolve a rate row's room name → parsed room metadata
   *  (photos/size/beds/amenities). Exact-name match first, then token-overlap
   *  matching, because the two LiteAPI endpoints name rooms differently.
   *  Rows fall back to the Phase-1 layout when nothing matches. */
  resolveRoomMeta?: (rateName: string) => RoomMetaInput | null;
  /** Hotel-level fallback thumbnail (main photo or first gallery shot).
   *  Shown on rate rows when per-room metadata lookup misses — suppliers
   *  often send /hotels/rates roomNames in a totally different format from
   *  /data/hotel rooms, so the lookup silently misses on most hotels and
   *  we end up with photo-less rows. A hotel photo is better than none. */
  fallbackPhoto?: string | null;
  /** Server-echoed occupancy this quote was priced for (see RateRow). */
  party?: { adults: number; children: number; rooms: number } | null;
  /** Pre-translated property-unit pill ("Entire apartment"). */
  unitLabel?: string | null;
  onSelect: (offerId: string) => void;
  onReserve: (offerId: string) => void;
  /** Phase-4: open the room detail modal for a given offerId. Page owns the
   *  modal so multiple rows share the same dialog instance. */
  onShowDetails?: (offerId: string) => void;
}) {
  const t = useTranslations('hotelDetail');
  /* Ranked on the ALL-IN cost (see allInTotal) — the cheapest STAY, not the
     cheapest sticker, exactly as the results list ranks its cards. The header
     below promises "cheapest first", so this sort is what makes that copy
     true. Array.prototype.sort is stable, so rows that genuinely cost the same
     keep the supplier's order. */
  const sorted = useMemo(() => [...offers].sort((a, b) => allInTotal(a) - allInTotal(b)), [offers]);
  /* Which (room, board) groups have at least one row carrying its OWN bed
     string. Rows in such a group must not fill a blank bed line from the room
     catalogue, or they render word-for-word identical to the described row at
     a different price. */
  const bedDescribedGroups = useMemo(() => {
    const set = new Set<string>();
    for (const o of offers) {
      if (o.bedInfo) set.add(`${(o.roomName || '').toLowerCase()}|${(o.boardType || '').toLowerCase()}`);
    }
    return set;
  }, [offers]);

  /* How many rooms the prices below actually cover. The server's `party` echo
     wins over the `rooms` prop: the echo is derived from the occupancy handed
     to LiteAPI, after `occ=` has overridden the flat params and after the
     site-wide caps (5 rooms / 9 guests, src/lib/occupancy.ts) have trimmed it,
     whereas the prop is read straight off the URL by the page. A URL asking
     for more rooms than we sell is now clamped at /api/hotels/rates, so the
     prop can name a room count that was never priced — and every label built
     from it ("TOTAL FOR 8 ROOMS", the per-room breakdown's length check) would
     contradict the price sitting next to it. */
  const pricedRooms = party?.rooms ?? rooms;

  if (!sorted || sorted.length === 0) return null;

  return (
    <section className="bg-white border border-[#E8ECF4] rounded-3xl p-2 md:p-3 shadow-[0_4px_24px_rgba(10,22,40,0.04)]">
      <div className="px-4 md:px-5 pt-4 pb-3 flex items-baseline justify-between">
        <h2 className="font-[var(--font-playfair)] font-black text-[1.35rem] md:text-[1.55rem] text-[#0a1628] tracking-tight">
          {t('chooseYourRate')}
        </h2>
        <p className="text-[.68rem] font-semibold text-slate-500 uppercase tracking-[1.5px] hidden md:block">
          {t('optionsCount', { count: sorted.length })} · {t('cheapestFirst')}
        </p>
      </div>

      {/* Rate rows separated by the gold rule — a watermark, not a frame */}
      <div className="divide-y divide-[#E8D8A8]/50">
        {sorted.map((rate) => {
          const rateRoomName = (rate.roomName || roomName || '').trim();
          const meta = rateRoomName && resolveRoomMeta ? resolveRoomMeta(rateRoomName) : null;
          return (
            <RateRow
              key={rate.offerId}
              rate={rate}
              siblingHasBedInfo={bedDescribedGroups.has(`${(rate.roomName || '').toLowerCase()}|${(rate.boardType || '').toLowerCase()}`)}
              nights={nights}
              rooms={pricedRooms}
              roomName={roomName || ''}
              roomMeta={meta}
              fallbackPhoto={fallbackPhoto ?? null}
              party={party ?? null}
              unitLabel={unitLabel ?? null}
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
