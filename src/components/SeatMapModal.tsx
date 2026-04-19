'use client';

/**
 * SeatMapModal — Phase 2b "Comfort" selection.
 *
 * Design notes:
 *  - Narrowbody / widebody silhouettes are SVG backdrops so the fuselage
 *    arc renders crisp at any DPI.
 *  - Extra-legroom tier uses a CHAMPAGNE gradient (warm ivory → muted gold),
 *    not a saturated yellow — we're selling luxury, not a traffic cone.
 *  - Every interactive seat has an explicit ARIA label of the form
 *    "Seat 14A, Extra Legroom, Window, £8.50" so screen-readers announce
 *    the commercial context, not just the designator.
 *  - Multi-leg UX is skip-friendly: segment tabs at the top let the user
 *    hop around, and "Skip this leg" is always available. Selections are
 *    per (segmentId, passengerId).
 *  - Always-show free-seat tier: if a seat is included in the fare at £0
 *    we still render it so the customer sees they have options — building
 *    trust that we're not forcing upsells.
 */

import { memo, useCallback, useEffect, useMemo, useState } from 'react';

/* ─────────────────────────── Types (mirror API) ─────────────────────────── */

export type SeatTier =
  | 'standard'
  | 'extra_legroom'
  | 'preferred'
  | 'emergency_exit';

export type SeatCharacteristic = 'window' | 'aisle' | 'middle' | 'bulkhead';

export type PerPassengerSeat = {
  available: boolean;
  serviceId: string | null;
  priceAmount: number;
  priceDisplay: string | null;
};

export type SeatElement =
  | {
      kind: 'seat';
      designator: string;
      tier: SeatTier;
      characteristics: SeatCharacteristic[];
      disclosures: string[];
      perPassenger: Record<string, PerPassengerSeat>;
    }
  | { kind: 'aisle' }
  | { kind: 'missing' }
  | { kind: 'exit_marker' };

export type SeatSection = { elements: SeatElement[] };

export type SeatRow = {
  rowNumber: number;
  isExitRow: boolean;
  sections: SeatSection[];
};

export type SeatCabin = {
  deck: 'main' | 'upper';
  cabinClass: 'first' | 'business' | 'premium_economy' | 'economy';
  wings: { firstRow: number; lastRow: number } | null;
  rows: SeatRow[];
};

export type SeatMapResult = {
  segmentId: string;
  segmentLabel: string;
  aircraftCode: string | null;
  aircraftSilhouette: 'narrowbody' | 'widebody';
  cabins: SeatCabin[];
};

/* ─────────────────────────── Selection model ─────────────────────────── */

export type SeatSelection = {
  segmentId: string;
  passengerId: string;
  designator: string;
  tier: SeatTier;
  serviceId: string;
  priceAmount: number;
  priceDisplay: string;
};

export type SeatSelectionsMap = Map<string, SeatSelection>;
// Key format: `${segmentId}:${passengerId}`
export function seatKey(segmentId: string, passengerId: string) {
  return `${segmentId}:${passengerId}`;
}

/* ─────────────────────────── Props ─────────────────────────── */

type PassengerMeta = {
  id: string;
  name: string; // "Sarah Khan" if provided, else "Passenger 1"
};

type SeatMapModalProps = {
  offerId: string;
  passengers: PassengerMeta[];
  initialSelections: SeatSelectionsMap;
  onClose: () => void;
  onSave: (selections: SeatSelectionsMap) => void;
};

/* ─────────────────────────── Tier cosmetics ─────────────────────────── */

function tierLabel(tier: SeatTier): string {
  switch (tier) {
    case 'extra_legroom':
      return 'Extra Legroom';
    case 'preferred':
      return 'Preferred';
    case 'emergency_exit':
      return 'Exit Row';
    default:
      return 'Standard';
  }
}

function characteristicLabel(chars: SeatCharacteristic[]): string {
  if (chars.includes('window')) return 'Window';
  if (chars.includes('aisle')) return 'Aisle';
  if (chars.includes('middle')) return 'Middle';
  if (chars.includes('bulkhead')) return 'Bulkhead';
  return '';
}

/* ─────────────────────────── Seat component ──────────────────────────────
   Memoized + primitives-only props so React can skip re-rendering the other
   ~249 seats when one selection flips. With 250+ seats rendered, any
   per-render allocation in the map callback blows FID.
   ───────────────────────────────────────────────────────────────────────── */

type SeatProps = {
  designator: string;
  rowLabel: string;            // designator minus row number ("A")
  tier: SeatTier;
  chars: string;               // "Window" | "Aisle" | "Middle" | "" — precomputed
  available: boolean;
  priceDisplay: string | null;
  isFree: boolean;
  isSelected: boolean;
  onSelect: (designator: string) => void;
};

const Seat = memo(function Seat({
  designator,
  rowLabel,
  tier,
  chars,
  available,
  priceDisplay,
  isFree,
  isSelected,
  onSelect,
}: SeatProps) {
  // ARIA: "Seat 14A, Extra Legroom, Window, £8.50" — commercial context first
  const ariaBits = [
    `Seat ${designator}`,
    tierLabel(tier),
    chars || null,
    !available
      ? 'Unavailable'
      : isFree
        ? 'Included'
        : priceDisplay || '',
    isSelected ? 'Selected' : null,
  ].filter(Boolean);
  const ariaLabel = ariaBits.join(', ');

  // ── Tier-based styling ────────────────────────────────────────────────
  let base = '';
  let text = 'text-[#1A1D2B]';
  const ring = isSelected
    ? 'ring-2 ring-emerald-500 ring-offset-1 ring-offset-white'
    : '';

  if (!available) {
    base = 'bg-[#E8ECF4] border-[#D5DBE6]';
    text = 'text-[#A0A8B8]';
  } else if (isSelected) {
    base = 'bg-emerald-500 border-emerald-600 shadow-[0_2px_8px_rgba(16,185,129,0.35)]';
    text = 'text-white';
  } else {
    switch (tier) {
      case 'extra_legroom':
        // Champagne: warm ivory → muted burnished gold. NOT yellow.
        base =
          'border-[#D4B77B] bg-[linear-gradient(135deg,#FBF3DF_0%,#E8CB85_100%)] hover:shadow-[0_2px_10px_rgba(212,183,123,0.45)]';
        text = 'text-[#6B5318]';
        break;
      case 'emergency_exit':
        base = 'bg-amber-50 border-amber-300 hover:bg-amber-100';
        text = 'text-amber-800';
        break;
      case 'preferred':
        base = 'bg-sky-50 border-sky-300 hover:bg-sky-100';
        text = 'text-sky-800';
        break;
      default:
        base = 'bg-white border-[#D5DBE6] hover:border-[#0a1628] hover:shadow-[0_2px_8px_rgba(10,22,40,0.08)]';
    }
  }

  const handleClick = () => onSelect(designator);

  return (
    <button
      type="button"
      disabled={!available}
      onClick={handleClick}
      aria-label={ariaLabel}
      aria-pressed={isSelected}
      title={ariaLabel}
      className={`relative w-7 h-7 md:w-8 md:h-8 rounded-md border text-[.56rem] md:text-[.6rem] font-bold flex items-center justify-center transition-all duration-150 ease-out ${base} ${text} ${ring} ${available ? 'cursor-pointer' : 'cursor-not-allowed'}`}
    >
      <span className="leading-none">{rowLabel}</span>
      {isSelected && (
        <i
          className="fa-solid fa-check absolute -top-1.5 -right-1.5 w-3.5 h-3.5 text-[.55rem] bg-emerald-600 text-white rounded-full flex items-center justify-center"
          aria-hidden
        />
      )}
    </button>
  );
});

/* ─────────────────────────── Cabin SVG backdrop ─────────────────────────── */

function FuselageBackdrop({
  silhouette,
}: {
  silhouette: 'narrowbody' | 'widebody';
}) {
  // Subtle fuselage outline behind the seat grid. Decorative only.
  const width = silhouette === 'widebody' ? 360 : 260;
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox={`0 0 ${width} 800`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="fuselage-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#F8FAFC" />
          <stop offset="100%" stopColor="#EEF1F6" />
        </linearGradient>
      </defs>
      {/* Rounded-rect fuselage */}
      <rect
        x="8"
        y="40"
        width={width - 16}
        height="720"
        rx={silhouette === 'widebody' ? 90 : 70}
        fill="url(#fuselage-grad)"
        stroke="#E0E5EF"
        strokeWidth="1"
      />
      {/* Nose cone */}
      <path
        d={`M 8 120 Q ${width / 2} -10 ${width - 8} 120`}
        fill="url(#fuselage-grad)"
        stroke="#E0E5EF"
        strokeWidth="1"
      />
      {/* Tail */}
      <path
        d={`M 8 680 Q ${width / 2} 820 ${width - 8} 680`}
        fill="url(#fuselage-grad)"
        stroke="#E0E5EF"
        strokeWidth="1"
      />
    </svg>
  );
}

/* ─────────────────────────── Cabin grid ─────────────────────────── */

function CabinGrid({
  cabin,
  silhouette,
  passengerId,
  selections,
  segmentId,
  onSelectDesignator,
}: {
  cabin: SeatCabin;
  silhouette: 'narrowbody' | 'widebody';
  passengerId: string;
  selections: SeatSelectionsMap;
  segmentId: string;
  /* Stable dispatcher — parent recomputes the seat element by designator.
     Passing a designator instead of the whole element means Seat's onSelect
     prop stays referentially equal across non-selection state changes and
     React.memo actually kicks in. */
  onSelectDesignator: (designator: string) => void;
}) {
  // Designators already-taken by the other passengers on this segment
  const takenByOtherPax = useMemo(() => {
    const s = new Set<string>();
    for (const [, sel] of selections) {
      if (sel.segmentId === segmentId && sel.passengerId !== passengerId) {
        s.add(sel.designator);
      }
    }
    return s;
  }, [selections, segmentId, passengerId]);

  const currentSel = selections.get(seatKey(segmentId, passengerId));
  const selectedDesignator = currentSel?.designator ?? null;

  return (
    <div
      className="relative mx-auto py-8"
      style={{
        maxWidth: silhouette === 'widebody' ? 420 : 320,
        // content-visibility lets the browser skip layout/paint for rows
        // scrolled off-screen — huge win for long-haul widebodies (300+ seats).
        contentVisibility: 'auto',
        containIntrinsicSize: '1px 5000px',
      }}
    >
      <FuselageBackdrop silhouette={silhouette} />
      <div className="relative space-y-1.5">
        {cabin.rows.map((row) => (
          <div key={row.rowNumber} className="flex items-center justify-center gap-1">
            {/* Row number on left */}
            <span className="w-5 text-[.58rem] font-bold text-[#8E95A9] text-right shrink-0">
              {row.rowNumber}
            </span>
            {/* Sections separated by aisles */}
            <div className="flex items-center gap-1.5">
              {row.sections.map((sec, secIdx) => (
                <div key={secIdx} className="flex items-center gap-1">
                  {sec.elements.map((el, elIdx) => {
                    if (el.kind === 'aisle') {
                      return <div key={elIdx} className="w-3 md:w-4" />;
                    }
                    if (el.kind === 'missing' || el.kind === 'exit_marker') {
                      return <div key={elIdx} className="w-7 h-7 md:w-8 md:h-8" />;
                    }
                    const paxEntry = el.perPassenger[passengerId];
                    const available =
                      !!paxEntry?.available &&
                      !takenByOtherPax.has(el.designator);
                    const price = paxEntry?.priceAmount ?? 0;
                    return (
                      <Seat
                        key={el.designator}
                        designator={el.designator}
                        rowLabel={el.designator.replace(String(row.rowNumber), '')}
                        tier={el.tier}
                        chars={characteristicLabel(el.characteristics)}
                        available={available}
                        priceDisplay={paxEntry?.priceDisplay ?? null}
                        isFree={available && price === 0}
                        isSelected={selectedDesignator === el.designator}
                        onSelect={onSelectDesignator}
                      />
                    );
                  })}
                  {secIdx < row.sections.length - 1 && (
                    <div className="w-3 md:w-4 self-stretch flex items-center">
                      <div className="w-full h-px bg-[#E8ECF4]" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* Exit marker on right */}
            {row.isExitRow && (
              <span className="ml-1 text-[.5rem] font-black text-amber-700 bg-amber-100 px-1 rounded uppercase tracking-wider shrink-0">
                Exit
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── Legend ─────────────────────────── */

function Legend() {
  const items: { label: string; className: string }[] = [
    { label: 'Standard (free)', className: 'bg-white border-[#D5DBE6]' },
    {
      label: 'Extra Legroom',
      className:
        'border-[#D4B77B] bg-[linear-gradient(135deg,#FBF3DF_0%,#E8CB85_100%)]',
    },
    { label: 'Preferred', className: 'bg-sky-50 border-sky-300' },
    { label: 'Exit Row', className: 'bg-amber-50 border-amber-300' },
    { label: 'Selected', className: 'bg-emerald-500 border-emerald-600' },
    { label: 'Unavailable', className: 'bg-[#E8ECF4] border-[#D5DBE6]' },
  ];
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 items-center text-[.62rem] font-semibold text-[#5C6378]">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-1.5">
          <span
            className={`inline-block w-3.5 h-3.5 rounded border ${it.className}`}
            aria-hidden
          />
          {it.label}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────── Main Modal ─────────────────────────── */

export default function SeatMapModal({
  offerId,
  passengers,
  initialSelections,
  onClose,
  onSave,
}: SeatMapModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seatMaps, setSeatMaps] = useState<SeatMapResult[]>([]);
  const [noSeatMap, setNoSeatMap] = useState(false);

  // Local selections — only committed to parent on Save
  const [selections, setSelections] = useState<SeatSelectionsMap>(
    () => new Map(initialSelections),
  );

  const [activeSegIdx, setActiveSegIdx] = useState(0);
  const [activePaxIdx, setActivePaxIdx] = useState(0);

  // ── Lock body scroll while modal is open ──
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // ── Escape to close ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // ── Fetch seat map ──
  // Note: initial state (loading=true, error=null, noSeatMap=false) already
  // matches what we'd reset to, and `offerId` is frozen for the modal's
  // lifetime — we remount on re-open — so we skip the pre-fetch resets that
  // react-hooks/set-state-in-effect would otherwise flag.
  useEffect(() => {
    let cancelled = false;

    fetch(`/api/seat-map/${offerId}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setError(data.error);
          return;
        }
        const maps: SeatMapResult[] = data.seatMaps || [];
        if (maps.length === 0 || data.reason === 'no_seat_map') {
          setNoSeatMap(true);
          return;
        }
        setSeatMaps(maps);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load seat map.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [offerId]);

  const activeSegment = seatMaps[activeSegIdx];
  const activePassenger = passengers[activePaxIdx];

  /* Total added price across all segments / passengers */
  const subtotal = useMemo(() => {
    let s = 0;
    for (const [, sel] of selections) s += sel.priceAmount;
    return s;
  }, [selections]);

  /* Index seats by designator once per segment so the click handler can
     resolve without walking the cabins tree on every tap. Keyed on segment
     id — rebuilds only when the active segment changes, not on every
     selection flip. */
  const seatLookup = useMemo(() => {
    const map = new Map<string, Extract<SeatElement, { kind: 'seat' }>>();
    if (!activeSegment) return map;
    for (const cab of activeSegment.cabins) {
      for (const row of cab.rows) {
        for (const sec of row.sections) {
          for (const el of sec.elements) {
            if (el.kind === 'seat') map.set(el.designator, el);
          }
        }
      }
    }
    return map;
  }, [activeSegment]);

  /* ── Seat-click handler ─────────────────────────────────────────────
     Stable across renders (only rebinds when segment/passenger changes).
     Seat components wrapped in React.memo can therefore skip re-rendering
     when the user just toggles a different seat. */
  const handleSeatSelect = useCallback(
    (designator: string) => {
      if (!activeSegment || !activePassenger) return;
      const seatEl = seatLookup.get(designator);
      if (!seatEl) return;
      const paxEntry = seatEl.perPassenger[activePassenger.id];
      if (!paxEntry?.available) return;

      const k = seatKey(activeSegment.segmentId, activePassenger.id);
      setSelections((prev) => {
        const next = new Map(prev);
        const existing = next.get(k);
        // Toggle off if clicking the already-selected seat
        if (existing && existing.designator === seatEl.designator) {
          next.delete(k);
          return next;
        }
        next.set(k, {
          segmentId: activeSegment.segmentId,
          passengerId: activePassenger.id,
          designator: seatEl.designator,
          tier: seatEl.tier,
          serviceId: paxEntry.serviceId || '',
          priceAmount: paxEntry.priceAmount,
          priceDisplay: paxEntry.priceDisplay || '£0',
        });
        return next;
      });
    },
    [activeSegment, activePassenger, seatLookup],
  );

  const handleSkipLeg = () => {
    if (activeSegIdx < seatMaps.length - 1) {
      setActiveSegIdx(activeSegIdx + 1);
      setActivePaxIdx(0);
    } else {
      onSave(selections);
    }
  };

  const handleContinue = () => {
    // Advance through passengers, then segments, then save.
    if (activePaxIdx < passengers.length - 1) {
      setActivePaxIdx(activePaxIdx + 1);
    } else if (activeSegIdx < seatMaps.length - 1) {
      setActiveSegIdx(activeSegIdx + 1);
      setActivePaxIdx(0);
    } else {
      onSave(selections);
    }
  };

  const isLastStep =
    activeSegIdx === seatMaps.length - 1 &&
    activePaxIdx === passengers.length - 1;

  /* ─────────────────────────── Render ─────────────────────────── */

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-0 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Select your seats"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#0a1628]/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative bg-white w-full h-full md:h-[90vh] md:max-h-[900px] md:max-w-5xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 md:px-7 py-4 md:py-5 border-b border-[#F1F3F7] flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-[var(--font-playfair)] font-black text-[1.25rem] md:text-[1.45rem] text-[#0a1628] tracking-tight leading-tight">
              Choose your seats
            </h2>
            <p className="text-[.72rem] md:text-[.78rem] text-[#5C6378] font-semibold mt-0.5">
              Pre-book at the airline&apos;s own price. No booking fees, no markup.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close seat map"
            className="w-9 h-9 rounded-full bg-[#F1F3F7] hover:bg-[#E8ECF4] text-[#5C6378] flex items-center justify-center transition-colors shrink-0"
          >
            <i className="fa-solid fa-xmark text-[.9rem]" aria-hidden />
          </button>
        </div>

        {/* Segment tab strip */}
        {seatMaps.length > 0 && (
          <div className="px-5 md:px-7 py-3 border-b border-[#F1F3F7] overflow-x-auto">
            <div className="flex gap-2 min-w-max">
              {seatMaps.map((sm, i) => (
                <button
                  key={sm.segmentId}
                  type="button"
                  onClick={() => {
                    setActiveSegIdx(i);
                    setActivePaxIdx(0);
                  }}
                  aria-pressed={i === activeSegIdx}
                  className={`px-3.5 py-1.5 rounded-full text-[.7rem] font-bold transition-all ${
                    i === activeSegIdx
                      ? 'bg-[#0a1628] text-white'
                      : 'bg-[#F1F3F7] text-[#5C6378] hover:bg-[#E8ECF4]'
                  }`}
                >
                  {sm.segmentLabel}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-[#8E95A9] py-20">
              <div className="w-10 h-10 border-2 border-[#E8ECF4] border-t-[#0066FF] rounded-full animate-spin" />
              <p className="text-[.8rem] font-semibold">Loading seat map…</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-20 px-6 text-center">
              <i className="fa-solid fa-triangle-exclamation text-amber-600 text-2xl" aria-hidden />
              <p className="text-[.9rem] font-bold text-[#1A1D2B]">{error}</p>
              <p className="text-[.75rem] text-[#5C6378] font-semibold max-w-xs">
                You can continue without a seat — the airline will assign one at check-in.
              </p>
            </div>
          )}

          {noSeatMap && !loading && (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-20 px-6 text-center">
              <i className="fa-solid fa-info-circle text-[#5C6378] text-2xl" aria-hidden />
              <p className="text-[.9rem] font-bold text-[#1A1D2B]">
                This airline doesn&apos;t offer advance seat selection
              </p>
              <p className="text-[.75rem] text-[#5C6378] font-semibold max-w-sm">
                Seats will be assigned automatically at check-in. You&apos;re not missing anything —
                this is normal on many low-cost fares.
              </p>
            </div>
          )}

          {!loading && !error && !noSeatMap && activeSegment && activePassenger && (
            <div className="px-5 md:px-7 py-5">
              {/* Passenger switcher */}
              <div className="flex items-center justify-between mb-4 gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[.58rem] font-black uppercase tracking-[2px] text-[#8E95A9]">
                    Selecting for
                  </span>
                  {passengers.map((pax, i) => {
                    const hasSeat = selections.has(
                      seatKey(activeSegment.segmentId, pax.id),
                    );
                    return (
                      <button
                        key={pax.id}
                        type="button"
                        onClick={() => setActivePaxIdx(i)}
                        aria-pressed={i === activePaxIdx}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[.7rem] font-bold transition-all ${
                          i === activePaxIdx
                            ? 'bg-emerald-600 text-white shadow-[0_2px_8px_rgba(16,185,129,0.25)]'
                            : 'bg-white border border-[#D5DBE6] text-[#1A1D2B] hover:border-[#0a1628]'
                        }`}
                      >
                        {pax.name}
                        {hasSeat && (
                          <i
                            className={`fa-solid fa-check text-[.6rem] ${i === activePaxIdx ? 'text-white' : 'text-emerald-600'}`}
                            aria-hidden
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Current selection summary */}
              {(() => {
                const curSel = selections.get(
                  seatKey(activeSegment.segmentId, activePassenger.id),
                );
                return curSel ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <i className="fa-solid fa-chair text-[.72rem]" aria-hidden />
                      </span>
                      <div className="text-[.78rem] font-bold text-emerald-900 truncate">
                        Seat {curSel.designator}
                        <span className="font-semibold text-emerald-700/80">
                          {' '}&middot; {tierLabel(curSel.tier)}
                        </span>
                      </div>
                    </div>
                    <span className="font-[var(--font-playfair)] font-black text-emerald-700 text-[.95rem] tracking-tight shrink-0">
                      {curSel.priceAmount === 0 ? 'Free' : curSel.priceDisplay}
                    </span>
                  </div>
                ) : (
                  <div className="bg-[#F8FAFC] border border-[#E8ECF4] rounded-xl px-4 py-2.5 mb-4 text-[.72rem] font-semibold text-[#5C6378]">
                    Tap a seat below to select one for {activePassenger.name}.
                  </div>
                );
              })()}

              {/* Cabins */}
              <div className="bg-[#FCFDFE] border border-[#F1F3F7] rounded-2xl p-3 md:p-5">
                <div className="text-center mb-2">
                  <span className="text-[.58rem] font-black uppercase tracking-[3px] text-[#8E95A9]">
                    Front of aircraft
                  </span>
                </div>
                {activeSegment.cabins.map((cab, ci) => (
                  <div key={ci}>
                    {ci > 0 && (
                      <div className="my-4 border-t border-dashed border-[#D5DBE6] text-center">
                        <span className="inline-block px-3 -mt-2 bg-[#FCFDFE] text-[.55rem] font-black uppercase tracking-[2px] text-[#8E95A9]">
                          {cab.cabinClass.replace('_', ' ')}
                        </span>
                      </div>
                    )}
                    <CabinGrid
                      cabin={cab}
                      silhouette={activeSegment.aircraftSilhouette}
                      passengerId={activePassenger.id}
                      selections={selections}
                      segmentId={activeSegment.segmentId}
                      onSelectDesignator={handleSeatSelect}
                    />
                  </div>
                ))}
                <div className="text-center mt-2">
                  <span className="text-[.58rem] font-black uppercase tracking-[3px] text-[#8E95A9]">
                    Rear of aircraft
                  </span>
                </div>
              </div>

              {/* Legend */}
              <div className="mt-5">
                <Legend />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && (
          <div className="px-5 md:px-7 py-4 border-t border-[#F1F3F7] bg-white flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[.58rem] font-black uppercase tracking-[2px] text-[#8E95A9]">
                Seats subtotal
              </div>
              <div className="font-[var(--font-playfair)] font-black text-[1.15rem] text-[#0a1628] tracking-tight">
                {subtotal === 0 ? (
                  <span className="text-[#5C6378]">No extra charge yet</span>
                ) : (
                  <>£{subtotal.toFixed(2)}</>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!noSeatMap && !error && seatMaps.length > 0 && !isLastStep && (
                <button
                  type="button"
                  onClick={handleSkipLeg}
                  className="px-4 py-2.5 rounded-xl text-[.75rem] font-bold text-[#5C6378] hover:text-[#0a1628] transition-colors"
                >
                  Skip this leg
                </button>
              )}
              {(noSeatMap || error) && (
                <button
                  type="button"
                  onClick={() => onSave(selections)}
                  className="px-5 py-2.5 rounded-xl bg-[#0a1628] hover:bg-[#1a2638] text-white text-[.8rem] font-bold transition-colors"
                >
                  Continue without seat
                </button>
              )}
              {!noSeatMap && !error && seatMaps.length > 0 && (
                <button
                  type="button"
                  onClick={handleContinue}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[.8rem] font-bold transition-colors shadow-[0_4px_14px_rgba(16,185,129,0.3)]"
                >
                  {isLastStep ? 'Save seats' : 'Continue →'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
