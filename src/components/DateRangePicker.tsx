'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * DateRangePicker — single click-anywhere box that pops a 2-month calendar.
 * Click first day = start, click second day = end. Click before start
 * restarts the range. "Done" closes the popup.
 *
 * 2026-07-02 refresh ("the calendar looks like the 18th century" — owner):
 *  - hover preview paints the candidate range before the second click
 *  - quick-pick presets (weekend / 1 week / 2 weeks) fill both ends at once
 *  - proper continuous range band with rounded caps, today gets a dot
 *  - month navigation on both sides of the header, larger touch targets
 * The public props are unchanged — all seven search pages get the new
 * calendar without touching their code.
 *
 * `oneWay` lets the user pick only the start date (used by flights one-way mode).
 */
type Accent = 'orange' | 'blue' | 'emerald' | 'purple' | 'indigo' | 'green';

const ACCENT: Record<Accent, { bg: string; bgHover: string; band: string; bandText: string; focus: string; text: string; chip: string; chipHover: string }> = {
  orange:  { bg: 'bg-orange-500',  bgHover: 'hover:bg-orange-600',  band: 'bg-orange-100',  bandText: 'text-orange-900',  focus: 'focus:border-orange-400',  text: 'text-orange-600',  chip: 'bg-orange-50 text-orange-700 border-orange-200',   chipHover: 'hover:bg-orange-100 hover:border-orange-300' },
  blue:    { bg: 'bg-blue-600',    bgHover: 'hover:bg-blue-700',    band: 'bg-blue-100',    bandText: 'text-blue-900',    focus: 'focus:border-blue-500',    text: 'text-blue-600',    chip: 'bg-blue-50 text-blue-700 border-blue-200',         chipHover: 'hover:bg-blue-100 hover:border-blue-300' },
  emerald: { bg: 'bg-emerald-500', bgHover: 'hover:bg-emerald-600', band: 'bg-emerald-100', bandText: 'text-emerald-900', focus: 'focus:border-emerald-500', text: 'text-emerald-600', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', chipHover: 'hover:bg-emerald-100 hover:border-emerald-300' },
  purple:  { bg: 'bg-purple-600',  bgHover: 'hover:bg-purple-700',  band: 'bg-purple-100',  bandText: 'text-purple-900',  focus: 'focus:border-purple-500',  text: 'text-purple-600',  chip: 'bg-purple-50 text-purple-700 border-purple-200',   chipHover: 'hover:bg-purple-100 hover:border-purple-300' },
  indigo:  { bg: 'bg-indigo-600',  bgHover: 'hover:bg-indigo-700',  band: 'bg-indigo-100',  bandText: 'text-indigo-900',  focus: 'focus:border-indigo-500',  text: 'text-indigo-600',  chip: 'bg-indigo-50 text-indigo-700 border-indigo-200',   chipHover: 'hover:bg-indigo-100 hover:border-indigo-300' },
  green:   { bg: 'bg-green-600',   bgHover: 'hover:bg-green-700',   band: 'bg-green-100',   bandText: 'text-green-900',   focus: 'focus:border-green-500',   text: 'text-green-600',   chip: 'bg-green-50 text-green-700 border-green-200',      chipHover: 'hover:bg-green-100 hover:border-green-300' },
};

export default function DateRangePicker({
  start, end, minDate, onChange, accent = 'orange', oneWay = false, placeholder = 'Add dates', startWord = 'start', endWord = 'end',
}: {
  start: string;
  end: string;
  minDate: string;
  onChange: (next: { start: string; end: string }) => void;
  accent?: Accent;
  oneWay?: boolean;
  placeholder?: string;
  startWord?: string;
  endWord?: string;
}) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => {
    const d = start ? new Date(start) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  // Day currently under the cursor — paints the candidate range between
  // the picked start and the hovered day before the second click lands.
  const [hoverMs, setHoverMs] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const a = ACCENT[accent];

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  // When the popup opens, jump the view to the selected start month so the
  // user never lands on a month with nothing highlighted.
  useEffect(() => {
    if (open && start) {
      const d = new Date(start);
      setViewMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const todayMs = new Date(minDate).setHours(0, 0, 0, 0);
  const realTodayMs = useMemo(() => new Date().setHours(0, 0, 0, 0), []);
  const startMs = start ? new Date(start).setHours(0, 0, 0, 0) : 0;
  const endMs = end ? new Date(end).setHours(0, 0, 0, 0) : 0;
  // Range being previewed: confirmed end wins; otherwise hover candidate.
  const previewEndMs = endMs || (startMs && hoverMs && hoverMs > startMs ? hoverMs : 0);

  function fmtIso(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  function fmtLabel(s: string) {
    if (!s) return '';
    return new Date(s).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  function addDaysIso(base: Date, n: number) {
    const d = new Date(base);
    d.setDate(d.getDate() + n);
    return fmtIso(d);
  }

  function pick(d: Date) {
    const ms = new Date(d).setHours(0, 0, 0, 0);
    if (ms < todayMs) return;
    if (oneWay) {
      onChange({ start: fmtIso(d), end: '' });
      setOpen(false);
      return;
    }
    if (!start || (start && end)) {
      onChange({ start: fmtIso(d), end: '' });
    } else if (ms <= startMs) {
      onChange({ start: fmtIso(d), end: '' });
    } else {
      onChange({ start, end: fmtIso(d) });
      setOpen(false);
    }
  }

  /** Quick-pick presets — one tap fills both ends. Anchored on the picked
   *  start date when there is one, otherwise on the next Friday (weekend)
   *  or two weeks out (the sweet spot of "soon but plannable"). */
  const presets = useMemo(() => {
    if (oneWay) return [];
    const anchor = startMs && !endMs ? new Date(startMs) : null;
    const base = new Date(Math.max(todayMs, realTodayMs));
    const nextFriday = new Date(base);
    nextFriday.setDate(nextFriday.getDate() + ((5 - nextFriday.getDay() + 7) % 7 || 7));
    const twoWeeksOut = new Date(base);
    twoWeeksOut.setDate(twoWeeksOut.getDate() + 14);
    return [
      anchor
        ? { label: `Weekend from ${fmtLabel(fmtIso(anchor))}`, start: fmtIso(anchor), end: addDaysIso(anchor, 2) }
        : { label: 'Next weekend', start: fmtIso(nextFriday), end: addDaysIso(nextFriday, 2) },
      anchor
        ? { label: '1 week', start: fmtIso(anchor), end: addDaysIso(anchor, 7) }
        : { label: '1 week away', start: fmtIso(twoWeeksOut), end: addDaysIso(twoWeeksOut, 7) },
      anchor
        ? { label: '2 weeks', start: fmtIso(anchor), end: addDaysIso(anchor, 14) }
        : { label: '2 weeks away', start: fmtIso(twoWeeksOut), end: addDaysIso(twoWeeksOut, 14) },
    ];
  }, [oneWay, startMs, endMs, todayMs, realTodayMs]); // eslint-disable-line react-hooks/exhaustive-deps

  function buildMonth(monthStart: Date) {
    const year = monthStart.getFullYear();
    const month = monthStart.getMonth();
    const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let i = 1; i <= daysInMonth; i++) cells.push(new Date(year, month, i));
    while (cells.length % 7) cells.push(null);
    return cells;
  }

  function MonthGrid({ monthStart, hideOnMobile = false }: { monthStart: Date; hideOnMobile?: boolean }) {
    const cells = buildMonth(monthStart);
    const monthLabel = monthStart.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    return (
      <div className={`flex-1 min-w-[252px] ${hideOnMobile ? 'hidden md:block' : ''}`}>
        <div className="text-center font-poppins font-black text-[.88rem] text-[#1A1D2B] mb-2.5">{monthLabel}</div>
        <div className="grid grid-cols-7 text-center text-[.58rem] font-black text-[#B0B8CC] uppercase tracking-wider mb-1.5">
          {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-y-0.5" onMouseLeave={() => setHoverMs(null)}>
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const ms = new Date(d).setHours(0, 0, 0, 0);
            const isPast = ms < todayMs;
            const isToday = ms === realTodayMs;
            const isStart = ms === startMs;
            const isEnd = !!endMs && ms === endMs;
            const isHoverEnd = !endMs && !!previewEndMs && ms === previewEndMs;
            const inBand = !!startMs && !!previewEndMs && ms > startMs && ms < previewEndMs;
            const isEdge = isStart || isEnd;
            return (
              <div key={i} className="relative">
                {/* Range band painted UNDER the day button so edge pills sit
                    on a continuous strip instead of floating squares. */}
                {(inBand || (isStart && !!previewEndMs) || isEnd || isHoverEnd) && !oneWay && (
                  <div className={[
                    'absolute inset-y-0.5',
                    a.band,
                    isStart ? 'left-1/2 right-0' : isEnd || isHoverEnd ? 'left-0 right-1/2' : 'left-0 right-0',
                  ].join(' ')} aria-hidden />
                )}
                <button type="button" disabled={isPast}
                  onClick={() => pick(d)}
                  onMouseEnter={() => { if (!isPast) setHoverMs(ms); }}
                  aria-label={d.toDateString()}
                  className={[
                    'relative z-[1] w-full h-10 text-[.8rem] font-bold rounded-full transition-all duration-100',
                    isPast
                      ? 'text-[#D8DDE8] cursor-not-allowed line-through decoration-transparent'
                      : isEdge
                        ? `${a.bg} text-white shadow-md scale-[1.04]`
                        : isHoverEnd
                          ? `${a.bg} text-white opacity-80`
                          : inBand
                            ? `${a.bandText} hover:scale-[1.04]`
                            : 'text-[#1A1D2B] hover:bg-[#F1F3F7] hover:scale-[1.04]',
                  ].join(' ')}>
                  {d.getDate()}
                  {isToday && (
                    <span className={`absolute left-1/2 -translate-x-1/2 bottom-1 w-1 h-1 rounded-full ${isEdge ? 'bg-white' : a.bg}`} aria-hidden />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const todayD = new Date(); todayD.setHours(0, 0, 0, 0);
  const canGoBack = !(viewMonth.getFullYear() === todayD.getFullYear() && viewMonth.getMonth() <= todayD.getMonth());
  const nextMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
  const prevMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1);
  const nights = startMs && endMs ? Math.round((endMs - startMs) / 86400000) : 0;
  const hoverNights = !endMs && startMs && previewEndMs ? Math.round((previewEndMs - startMs) / 86400000) : 0;

  const buttonLabel = oneWay
    ? (start ? fmtLabel(start) : placeholder)
    : start && end
      ? `${fmtLabel(start)} → ${fmtLabel(end)}`
      : start
        ? `${fmtLabel(start)} → Pick ${endWord}`
        : placeholder;

  const navBtn = 'w-9 h-9 rounded-full bg-[#F8FAFC] border border-[#E8ECF4] hover:bg-white hover:shadow-sm flex items-center justify-center text-[#5C6378] disabled:opacity-30 disabled:cursor-not-allowed text-base transition-all';

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className={`w-full px-4 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-left text-[.85rem] font-semibold text-[#1A1D2B] outline-none ${a.focus} hover:bg-white hover:border-[#D8DDE8] transition-all flex items-center justify-between whitespace-nowrap ${open ? 'bg-white shadow-sm' : ''}`}>
        <span className="truncate flex items-center gap-2.5">
          <span className={`w-7 h-7 rounded-lg flex items-center justify-center border ${a.chip}`}>
            <i className="fa-regular fa-calendar text-[.72rem]" aria-hidden />
          </span>
          {buttonLabel}
          {!oneWay && nights > 0 && (
            <span className={`hidden sm:inline-flex text-[.62rem] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-md border ${a.chip}`}>
              {nights}n
            </span>
          )}
        </span>
        <i className={`fa-solid fa-chevron-down text-[.6rem] text-[#B0B8CC] ml-2 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && (
        <div className="absolute z-50 left-0 mt-2 bg-white border border-[#E8ECF4] rounded-2xl shadow-[0_24px_64px_rgba(15,23,42,0.18)] p-5 w-[min(660px,92vw)]">
          {/* Quick presets — one tap fills the whole range. */}
          {presets.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mb-3.5">
              {presets.map(pr => (
                <button key={pr.label} type="button"
                  onClick={() => { onChange({ start: pr.start, end: pr.end }); setOpen(false); }}
                  className={`text-[.68rem] font-bold px-3 py-1.5 rounded-full border transition-colors ${a.chip} ${a.chipHover}`}>
                  {pr.label}
                </button>
              ))}
            </div>
          )}
          <div className="relative">
            <button type="button" disabled={!canGoBack}
              onClick={() => setViewMonth(prevMonth)}
              aria-label="Previous month"
              className={`${navBtn} absolute left-0 -top-1 z-[2]`}>
              <i className="fa-solid fa-chevron-left text-[.7rem]" aria-hidden />
            </button>
            <button type="button"
              onClick={() => setViewMonth(nextMonth)}
              aria-label="Next month"
              className={`${navBtn} absolute right-0 -top-1 z-[2]`}>
              <i className="fa-solid fa-chevron-right text-[.7rem]" aria-hidden />
            </button>
            <div className="flex gap-7 flex-wrap">
              <MonthGrid monthStart={viewMonth} />
              <MonthGrid monthStart={nextMonth} hideOnMobile />
            </div>
          </div>
          {/* Mobile-only bottom nav. The original ‹ › arrows live at the
              top of the popup, but on phones the user scrolls down to
              tap a date and then has to scroll all the way back up just
              to switch month. Real Clarity recording 2026-04-27 caught
              this: visitor mashing through dates, getting lost, bailing.
              Bottom pills mirror the top arrows so they can keep moving
              forward without scrolling back. md:hidden so the desktop
              two-month view (which doesn't have the scroll problem)
              stays clean. */}
          <div className="flex items-center justify-between gap-2 mt-3 md:hidden">
            <button type="button" disabled={!canGoBack}
              onClick={() => setViewMonth(prevMonth)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#F1F3F7] text-[#5C6378] font-poppins font-bold text-[.78rem] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#E8ECF4] transition-colors">
              ‹ Previous month
            </button>
            <button type="button"
              onClick={() => setViewMonth(nextMonth)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#F1F3F7] text-[#5C6378] font-poppins font-bold text-[.78rem] hover:bg-[#E8ECF4] transition-colors">
              Next month ›
            </button>
          </div>
          <div className="flex items-center justify-between gap-3 mt-4 pt-3.5 border-t border-[#F1F3F7]">
            <div className="text-[.74rem] font-bold text-[#5C6378]">
              {oneWay ? (
                start ? fmtLabel(start) : `Pick ${startWord}`
              ) : nights > 0 ? (
                <span className={a.text}>
                  <i className="fa-regular fa-moon mr-1.5" aria-hidden />
                  {nights} night{nights !== 1 ? 's' : ''}
                </span>
              ) : hoverNights > 0 ? (
                <span className="text-[#8E95A9]">{hoverNights} night{hoverNights !== 1 ? 's' : ''}?</span>
              ) : start ? (
                `Now pick ${endWord}`
              ) : (
                `Pick ${startWord}`
              )}
            </div>
            <div className="flex gap-2">
              {(start || end) && (
                <button type="button" onClick={() => onChange({ start: '', end: '' })}
                  className="text-[.72rem] font-bold text-[#8E95A9] hover:text-[#5C6378] px-3 py-2">Clear</button>
              )}
              <button type="button" onClick={() => setOpen(false)}
                className={`${a.bg} ${a.bgHover} text-white font-poppins font-bold text-[.8rem] px-5 py-2 rounded-xl transition-colors shadow-sm`}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
