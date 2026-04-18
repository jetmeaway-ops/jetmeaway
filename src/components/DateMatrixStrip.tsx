'use client';

import { useMemo, useState } from 'react';

/**
 * Date Matrix Strip — horizontal price calendar showing cheapest-per-date
 * across D−3 … D+3. Works for flights (each cell = departure date) and
 * hotels (each cell = check-in date; stay-length is locked so every
 * cell represents the same trip shape).
 *
 * Parent pages feed it pre-formatted options; this component is a dumb
 * presentational widget that doesn't know about APIs or URLs. The
 * caller handles state + fetch on click.
 */

export interface MatrixOption {
  /** Unique per-cell key, usually the ISO date string. */
  id: string;
  /** Display label e.g. "19 Apr – 26 Apr" or "19 Apr (3 nights)". */
  label: string;
  /**
   * GBP price (no pence). Always TOTAL cost in the type's natural unit:
   *  • flights: per-person round-trip (or one-way) price.
   *  • hotels:  total-stay price (pricePerNight × nights).
   * The per-night / total toggle divides this on the fly.
   * null when upstream has no cached fare for that date.
   */
  price: number | null;
  isSelected: boolean;
  /** Opaque context the caller reads back in onSelect (e.g. dep/ret dates). */
  metadata?: unknown;
  /**
   * Optional sub-label rendered under the price. Flights use this to
   * warn when the cheapest cached fare for a neighbour date is for a
   * different stay length than the user intended (e.g. "5n" when they
   * asked for 7n) — apples-to-apples honesty that TP's trip_duration
   * param silently refuses to enforce server-side.
   */
  subLabel?: string;
}

export interface ScoutTip {
  /** ISO date (YYYY-MM-DD) of the cheapest date outside the ±3 strip. */
  dep: string;
  /** GBP price for that date. */
  price: number;
  /** GBP savings vs the selected cell (always positive). */
  savings: number;
}

interface DateMatrixStripProps {
  options: MatrixOption[];
  loading: boolean;
  type: 'flights' | 'hotels';
  onSelect: (option: MatrixOption) => void;
  /** Hotels only: stay length — used for the per-night toggle math. */
  nights?: number;
  /** Optional click handler for the trailing "Flexible dates" cell. */
  onFlexible?: () => void;
  /**
   * If set, renders a "Scout Tip" line below the strip surfacing a
   * cheaper date outside the ±3 window. Click handler shifts the
   * search to that date. Caller provides the handler + metadata so
   * this component stays dumb about URLs / fetches.
   */
  scoutTip?: ScoutTip | null;
  onScoutTip?: (tip: ScoutTip) => void;
}

export default function DateMatrixStrip({
  options,
  loading,
  type,
  onSelect,
  nights,
  onFlexible,
  scoutTip,
  onScoutTip,
}: DateMatrixStripProps) {
  // Hotels-only view toggle. Users love seeing the total price so there
  // are no surprises at checkout, which aligns with our Trustpilot
  // "trustworthy & easy to use" signal — so default to total.
  const [hotelView, setHotelView] = useState<'total' | 'perNight'>('total');

  const cheapestPrice = useMemo(() => {
    const valid = options.map(o => o.price).filter((p): p is number => p !== null);
    return valid.length > 0 ? Math.min(...valid) : Infinity;
  }, [options]);

  // For hotels "Best Value" nudge: a non-selected cell that's ≥30%
  // cheaper than the currently-selected one earns a Value badge.
  const selectedPrice = options.find(o => o.isSelected)?.price ?? null;

  // Translate a total-stay price into per-night on the fly. Flights
  // never toggle — the parent always sends per-person price.
  const displayPrice = (p: number): number => {
    if (type !== 'hotels' || hotelView === 'total') return p;
    if (!nights || nights < 1) return p;
    return p / nights;
  };

  if (loading) {
    return (
      <section className="max-w-[1000px] mx-auto px-5 pb-3">
        <div className="bg-white border border-[#E8ECF4] rounded-2xl p-3 overflow-hidden">
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
              <div
                key={i}
                className="flex-shrink-0 w-[108px] h-[88px] rounded-xl bg-[#F1F3F7] animate-pulse"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (options.length === 0) return null;

  const heading = type === 'hotels'
    ? 'Shift check-in? See prices nearby'
    : 'Flexible on dates? See prices nearby';

  return (
    <section className="max-w-[1000px] mx-auto px-5 pb-3">
      <div className="bg-white border border-[#E8ECF4] rounded-2xl p-3">
        <div className="flex items-center justify-between gap-3 mb-2 px-1 flex-wrap">
          <p className="font-poppins font-black text-[.72rem] text-[#1A1D2B] uppercase tracking-wider">
            {heading}
            {type === 'hotels' && typeof nights === 'number' && nights > 0 && (
              <span className="text-[#8E95A9] ml-2 normal-case tracking-normal">
                ({nights} night{nights > 1 ? 's' : ''})
              </span>
            )}
          </p>

          {type === 'hotels' && (
            <div className="inline-flex bg-[#F1F3F7] rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setHotelView('total')}
                className={`px-2.5 py-1 rounded-md text-[.65rem] font-poppins font-bold transition-all ${
                  hotelView === 'total' ? 'bg-white text-[#1A1D2B] shadow-sm' : 'text-[#5C6378]'
                }`}
              >
                Total stay
              </button>
              <button
                type="button"
                onClick={() => setHotelView('perNight')}
                className={`px-2.5 py-1 rounded-md text-[.65rem] font-poppins font-bold transition-all ${
                  hotelView === 'perNight' ? 'bg-white text-[#1A1D2B] shadow-sm' : 'text-[#5C6378]'
                }`}
              >
                Per night
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-1 px-1 pb-1">
          {options.map((option) => {
            const hasPrice = option.price !== null;
            const isCheapest =
              hasPrice && option.price === cheapestPrice && !option.isSelected;

            // ≥20% cheaper than the currently-selected cell earns the
            // purple "Scout Choice" badge — Waqar tightened the
            // threshold from 30% to 20% so genuine deals surface more
            // often on expensive cities (a 25% drop on a £400/night
            // Dubai hotel is still £100, worth flagging).
            const scoutValue =
              type === 'hotels' &&
              hasPrice &&
              !option.isSelected &&
              selectedPrice !== null &&
              (option.price as number) <= selectedPrice * 0.8;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => hasPrice && onSelect(option)}
                disabled={!hasPrice}
                className={[
                  'relative flex-shrink-0 w-[108px] min-h-[88px] rounded-xl px-2 py-2.5',
                  'flex flex-col items-center justify-center gap-0.5',
                  'font-poppins transition-all border',
                  option.isSelected
                    ? 'bg-[#0F1119] text-white border-[#0F1119] shadow-md'
                    : hasPrice
                      ? 'bg-white text-[#1A1D2B] border-[#E8ECF4] hover:border-[#0066FF] hover:shadow-sm cursor-pointer'
                      : 'bg-[#F8FAFC] text-[#B0B8CC] border-[#F1F3F7] cursor-not-allowed',
                ].join(' ')}
              >
                {scoutValue ? (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white text-[.55rem] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full whitespace-nowrap shadow-sm">
                    ★ Scout Choice
                  </span>
                ) : isCheapest ? (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[.55rem] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full whitespace-nowrap">
                    {type === 'hotels' ? 'Best Value' : 'Cheapest'}
                  </span>
                ) : null}
                <span
                  className={`text-[.68rem] font-bold leading-tight text-center ${
                    option.isSelected ? 'text-white/80' : 'text-[#5C6378]'
                  }`}
                >
                  {option.label}
                </span>
                <span
                  className={`text-[.95rem] font-black leading-none mt-0.5 ${
                    option.isSelected
                      ? 'text-white'
                      : isCheapest || scoutValue
                        ? 'text-emerald-600'
                        : hasPrice
                          ? 'text-[#1A1D2B]'
                          : 'text-[#B0B8CC]'
                  }`}
                >
                  {hasPrice
                    ? `£${Math.round(displayPrice(option.price as number)).toLocaleString()}`
                    : '—'}
                </span>
                {type === 'hotels' && hasPrice && (
                  <span
                    className={`text-[.55rem] font-semibold leading-none ${
                      option.isSelected ? 'text-white/60' : 'text-[#8E95A9]'
                    }`}
                  >
                    {hotelView === 'total' ? 'total' : '/ night'}
                  </span>
                )}
                {/* Selected cell → small pulsing "LIVE" badge so users
                    understand this exact price is real-time (from the
                    main search below) while the others are cache
                    trends. Neighbour cells → optional subLabel e.g.
                    "5n" to flag a different-length trip. */}
                {option.isSelected && hasPrice ? (
                  <span className="flex items-center gap-1 text-[.5rem] font-black uppercase tracking-wider leading-none mt-0.5 text-emerald-400">
                    <span className="inline-block w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                    Live
                  </span>
                ) : option.subLabel && hasPrice ? (
                  <span className="text-[.5rem] font-bold leading-none mt-0.5 text-[#C08A3E]">
                    {option.subLabel}
                  </span>
                ) : null}
              </button>
            );
          })}

          {onFlexible && (
            <button
              type="button"
              onClick={onFlexible}
              className="flex-shrink-0 w-[108px] min-h-[88px] rounded-xl px-2 py-2.5 flex flex-col items-center justify-center gap-1 font-poppins bg-[#F1F6FF] text-[#0066FF] border border-dashed border-[#0066FF]/40 hover:bg-[#E6EFFF] hover:border-[#0066FF] transition-all cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
              </svg>
              <span className="text-[.62rem] font-black uppercase tracking-wider leading-tight text-center">
                Flexible<br />dates
              </span>
            </button>
          )}
        </div>

        {/* Scout Tip — progressive disclosure: the calendar API returns
            a whole month, but we only render ±3. When a date outside
            that window is meaningfully cheaper (≥15% savings), surface
            it as a single-line nudge the user can one-click to shift
            to. Clicking fires onScoutTip which the caller turns into
            a full re-search at that date. */}
        {scoutTip && onScoutTip && (
          <button
            type="button"
            onClick={() => onScoutTip(scoutTip)}
            className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-[#F3EFFE] to-[#FEF0F6] border border-[#8B5CF6]/20 hover:from-[#E9E0FC] hover:to-[#FDE3EE] hover:border-[#8B5CF6]/40 transition-all cursor-pointer group"
          >
            <span className="text-[.72rem]">🎯</span>
            <span className="text-[.7rem] font-poppins font-bold text-[#1A1D2B]">
              Scout Tip:
              <span className="font-semibold text-[#5C6378]"> prices drop to </span>
              <span className="font-black text-[#8B5CF6]">£{scoutTip.price.toLocaleString()}</span>
              <span className="font-semibold text-[#5C6378]"> on </span>
              <span className="font-black text-[#1A1D2B]">{formatTipDate(scoutTip.dep)}</span>
              <span className="font-semibold text-[#5C6378]"> — save </span>
              <span className="font-black text-emerald-600">£{scoutTip.savings.toLocaleString()}</span>
            </span>
            <span className="text-[.65rem] font-bold text-[#8B5CF6] group-hover:translate-x-0.5 transition-transform">→</span>
          </button>
        )}
      </div>
    </section>
  );
}

/** Local helper — "2026-04-23" → "Thu 23 Apr". */
function formatTipDate(iso: string): string {
  try {
    const d = new Date(iso + 'T12:00:00Z');
    return d.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    });
  } catch {
    return iso;
  }
}
