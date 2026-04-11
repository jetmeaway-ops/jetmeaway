'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * DateRangePicker — single click-anywhere box that pops a 2-month calendar.
 * Click first day = start, click second day = end. Click before start
 * restarts the range. "Done" closes the popup.
 *
 * `oneWay` lets the user pick only the start date (used by flights one-way mode).
 */
type Accent = 'orange' | 'blue' | 'emerald' | 'purple' | 'indigo' | 'green';

const ACCENT: Record<Accent, { bg: string; ring: string; light: string; focus: string }> = {
  orange:  { bg: 'bg-orange-500',  ring: 'hover:bg-orange-500',  light: 'bg-orange-100 hover:bg-orange-100',  focus: 'focus:border-orange-400' },
  blue:    { bg: 'bg-blue-600',    ring: 'hover:bg-blue-600',    light: 'bg-blue-100 hover:bg-blue-100',      focus: 'focus:border-blue-500' },
  emerald: { bg: 'bg-emerald-500', ring: 'hover:bg-emerald-500', light: 'bg-emerald-100 hover:bg-emerald-100', focus: 'focus:border-emerald-500' },
  purple:  { bg: 'bg-purple-600',  ring: 'hover:bg-purple-600',  light: 'bg-purple-100 hover:bg-purple-100',  focus: 'focus:border-purple-500' },
  indigo:  { bg: 'bg-indigo-600',  ring: 'hover:bg-indigo-600',  light: 'bg-indigo-100 hover:bg-indigo-100',  focus: 'focus:border-indigo-500' },
  green:   { bg: 'bg-green-600',   ring: 'hover:bg-green-600',   light: 'bg-green-100 hover:bg-green-100',    focus: 'focus:border-green-500' },
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
  const ref = useRef<HTMLDivElement>(null);
  const a = ACCENT[accent];

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const todayMs = new Date(minDate).setHours(0, 0, 0, 0);
  const startMs = start ? new Date(start).setHours(0, 0, 0, 0) : 0;
  const endMs = end ? new Date(end).setHours(0, 0, 0, 0) : 0;

  function fmtIso(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  function fmtLabel(s: string) {
    if (!s) return '';
    return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
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
      <div className={`flex-1 min-w-[240px] ${hideOnMobile ? 'hidden md:block' : ''}`}>
        <div className="text-center font-poppins font-black text-[.85rem] text-[#1A1D2B] mb-2">{monthLabel}</div>
        <div className="grid grid-cols-7 text-center text-[.6rem] font-bold text-[#8E95A9] uppercase mb-1">
          {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const ms = new Date(d).setHours(0, 0, 0, 0);
            const isPast = ms < todayMs;
            const isStart = ms === startMs;
            const isEnd = ms === endMs;
            const inRange = !!startMs && !!endMs && ms > startMs && ms < endMs;
            const isEdge = isStart || isEnd;
            return (
              <button key={i} type="button" disabled={isPast}
                onClick={() => pick(d)}
                className={[
                  'h-9 text-[.78rem] font-semibold transition-colors',
                  isPast ? 'text-[#D0D6E2] cursor-not-allowed' : `text-[#1A1D2B] ${a.light}`,
                  isEdge ? `${a.bg} text-white ${a.ring}` : '',
                  isStart && endMs ? 'rounded-l-full' : '',
                  isEnd ? 'rounded-r-full' : '',
                  isStart && !endMs ? 'rounded-full' : '',
                  inRange ? a.light : '',
                ].join(' ')}>
                {d.getDate()}
              </button>
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

  const buttonLabel = oneWay
    ? (start ? fmtLabel(start) : placeholder)
    : start && end
      ? `${fmtLabel(start)} → ${fmtLabel(end)}`
      : start
        ? `${fmtLabel(start)} → Pick ${endWord}`
        : placeholder;

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className={`w-full px-4 py-3.5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] text-left text-[.85rem] font-semibold text-[#1A1D2B] outline-none ${a.focus} hover:bg-white transition-all flex items-center justify-between whitespace-nowrap`}>
        <span className="truncate flex items-center gap-2">
          <i className="fa-regular fa-calendar text-[#8E95A9]" aria-hidden />
          {buttonLabel}
        </span>
        <span className="text-[#B0B8CC] text-xs ml-2">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div className="absolute z-50 left-0 mt-1.5 bg-white border border-[#E8ECF4] rounded-2xl shadow-2xl p-4 w-[min(640px,90vw)]">
          <div className="flex items-center justify-between mb-2">
            <button type="button" disabled={!canGoBack}
              onClick={() => setViewMonth(prevMonth)}
              className="w-8 h-8 rounded-full hover:bg-[#F1F3F7] flex items-center justify-center text-[#5C6378] disabled:opacity-30 disabled:cursor-not-allowed text-lg">‹</button>
            <button type="button"
              onClick={() => setViewMonth(nextMonth)}
              className="w-8 h-8 rounded-full hover:bg-[#F1F3F7] flex items-center justify-center text-[#5C6378] text-lg">›</button>
          </div>
          <div className="flex gap-6 flex-wrap">
            <MonthGrid monthStart={viewMonth} />
            <MonthGrid monthStart={nextMonth} hideOnMobile />
          </div>
          <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-[#F1F3F7]">
            <div className="text-[.72rem] font-semibold text-[#5C6378]">
              {oneWay
                ? (start ? fmtLabel(start) : `Pick ${startWord}`)
                : nights > 0
                  ? `${nights} night${nights !== 1 ? 's' : ''}`
                  : start
                    ? `Pick ${endWord}`
                    : `Pick ${startWord}`}
            </div>
            <div className="flex gap-2">
              {(start || end) && (
                <button type="button" onClick={() => onChange({ start: '', end: '' })}
                  className="text-[.72rem] font-bold text-[#8E95A9] hover:text-[#5C6378] px-3 py-1.5">Clear</button>
              )}
              <button type="button" onClick={() => setOpen(false)}
                className={`${a.bg} ${a.ring} text-white font-poppins font-bold text-[.78rem] px-4 py-1.5 rounded-xl transition-colors`}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
