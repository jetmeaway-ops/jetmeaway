'use client';

import { useState, useRef, useEffect } from 'react';

type Msg = { role: 'user' | 'assistant'; content: string };

const GREETING: Msg = {
  role: 'assistant',
  content:
    "Hi, I'm Scout 👋 Ask me anything about travel — destinations, packing, weather, visas, culture. For prices, head to our search pages.",
};

// Default vertical position for the Scout button (px from the bottom).
// Was 20px which collided with the mobile sticky category bar and
// covered the bottom-most page CTAs on smaller phones. 80px lifts it
// clear of those without floating into the middle of the screen.
const DEFAULT_BOTTOM_PX = 80;
const SCOUT_POS_KEY = 'jma_scout_bottom_px';
// Keep the button at least this far from each edge so it never sits
// off-screen or behind the header.
const MIN_BOTTOM = 16;

export default function ScoutChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Vertical position state. Restored from localStorage on mount so the
  // visitor's chosen spot persists across visits. Drag handlers below
  // update it live; we save to localStorage on pointer-up so we don't
  // hammer storage during the drag.
  const [bottomPx, setBottomPx] = useState<number>(DEFAULT_BOTTOM_PX);
  const draggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const dragStartBottomRef = useRef(DEFAULT_BOTTOM_PX);
  // While dragging we suppress the click that fires on pointerup so a
  // drag-to-reposition doesn't also open the chat.
  const justDraggedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(SCOUT_POS_KEY);
    if (raw) {
      const n = Number(raw);
      if (Number.isFinite(n)) {
        setBottomPx(clampBottom(n));
      }
    }
  }, []);

  function clampBottom(v: number): number {
    if (typeof window === 'undefined') return v;
    const max = Math.max(MIN_BOTTOM, window.innerHeight - 80);
    return Math.min(max, Math.max(MIN_BOTTOM, v));
  }

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    // Only start dragging on a long-press / drag — a normal click still
    // toggles the chat. We arm the drag state and decide based on
    // movement in pointermove.
    draggingRef.current = true;
    dragStartYRef.current = e.clientY;
    dragStartBottomRef.current = bottomPx;
    justDraggedRef.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!draggingRef.current) return;
    const dy = dragStartYRef.current - e.clientY;
    if (Math.abs(dy) > 4) justDraggedRef.current = true;
    setBottomPx(clampBottom(dragStartBottomRef.current + dy));
  }
  function onPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch { /* ignore */ }
    if (justDraggedRef.current && typeof window !== 'undefined') {
      window.localStorage.setItem(SCOUT_POS_KEY, String(bottomPx));
    }
  }
  function handleClick() {
    // Suppress the click that immediately follows a drag.
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      return;
    }
    setOpen((v) => !v);
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function send() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const next: Msg[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      // Strip the greeting before sending (it's UI-only, not a real turn)
      const history = next.filter((m, i) => !(i === 0 && m === GREETING));
      const res = await fetch('/api/scout-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scout error');
      setMessages((m) => [...m, { role: 'assistant', content: data.reply }]);
    } catch (err: any) {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: err?.message || "Sorry, I couldn't reach the server." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <>
      {/* Floating Scout avatar — vertically draggable. Drag with finger
          or mouse to move up/down; position persists across visits via
          localStorage. Default sits well above the mobile sticky
          category bar so it doesn't cover bottom CTAs. */}
      <button
        onClick={handleClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        aria-label={open ? 'Close Scout' : 'Open Scout (drag to move)'}
        style={{ bottom: `${bottomPx}px`, touchAction: 'none' }}
        className="fixed left-5 z-[300] group flex items-center gap-2.5 transition-[transform,opacity] cursor-grab active:cursor-grabbing"
      >
        {/* Name tag — visible when closed, hides on open */}
        {!open && (
          <span className="hidden sm:flex items-center bg-white text-[#1A1D2B] font-poppins font-extrabold text-[.72rem] px-3 py-1.5 rounded-full shadow-[0_6px_18px_rgba(0,0,0,0.1)] border border-[#E8ECF4]">
            Ask Scout
          </span>
        )}
        {/* Avatar circle */}
        <span className="relative w-9 h-9 rounded-full bg-gradient-to-br from-[#0066FF] to-[#4F46E5] shadow-[0_6px_16px_rgba(0,102,255,0.4)] flex items-center justify-center text-white text-[.85rem] ring-2 ring-white group-hover:scale-105 transition-transform">
          {open ? (
            <i className="fa-solid fa-xmark"></i>
          ) : (
            <i className="fa-solid fa-person-hiking"></i>
          )}
          {/* Online pulse dot */}
          {!open && (
            <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white">
              <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75"></span>
            </span>
          )}
        </span>
      </button>

      {/* Chat panel — anchored just above the (movable) avatar so it
          follows whichever spot the customer dragged Scout to. */}
      {open && (
        <div
          style={{ bottom: `${bottomPx + 56}px` }}
          className="fixed left-5 z-[299] w-[calc(100vw-40px)] max-w-[380px] h-[520px] max-h-[calc(100vh-120px)] bg-white rounded-3xl shadow-[0_32px_64px_-15px_rgba(0,0,0,0.25)] border border-[#E8ECF4] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-br from-[#0066FF] to-[#4F46E5] text-white px-5 py-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg">
              <i className="fa-solid fa-compass"></i>
            </div>
            <div>
              <p className="font-poppins font-extrabold text-[.95rem] leading-tight">Scout</p>
              <p className="text-[.7rem] text-white/80 leading-tight">Your travel assistant</p>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#F8FAFC]">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[.82rem] leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-[#0066FF] text-white rounded-br-sm'
                      : 'bg-white text-[#1A1D2B] border border-[#E8ECF4] rounded-bl-sm'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-[#E8ECF4] rounded-2xl rounded-bl-sm px-3.5 py-2.5">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8E95A9] animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8E95A9] animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8E95A9] animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-[#E8ECF4] bg-white p-3">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder="Ask Scout anything..."
                rows={1}
                maxLength={500}
                className="flex-1 resize-none bg-[#F8FAFC] border border-[#E8ECF4] rounded-2xl px-3.5 py-2.5 text-[.82rem] text-[#1A1D2B] placeholder:text-[#8E95A9] focus:outline-none focus:border-[#0066FF] max-h-24"
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                aria-label="Send"
                className="w-10 h-10 rounded-full bg-[#0066FF] text-white flex items-center justify-center hover:bg-[#0052cc] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0"
              >
                <i className="fa-solid fa-paper-plane text-sm"></i>
              </button>
            </div>
            <p className="text-[.62rem] text-[#8E95A9] text-center mt-1.5">
              Scout gives general travel tips, not bookings.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
