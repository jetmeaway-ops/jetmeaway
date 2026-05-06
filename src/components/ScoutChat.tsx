'use client';

import { useState, useRef, useEffect } from 'react';

type Msg = { role: 'user' | 'assistant'; content: string };

const GREETING: Msg = {
  role: 'assistant',
  content:
    "Hi, I'm Scout 👋 Ask me anything about travel — destinations, packing, weather, visas, culture. For prices, head to our search pages.",
};

// Default position of the Scout button. Anchored from the bottom-left so
// it stays clear of the mobile sticky category bar and bottom CTAs.
const DEFAULT_LEFT_PX = 20;
const DEFAULT_BOTTOM_PX = 80;
const SCOUT_POS_KEY = 'jma_scout_pos_v2';
// Legacy single-axis key from the v1 vertical-only drag. Migrated on
// first load if v2 isn't present yet so users don't lose their spot.
const SCOUT_POS_KEY_LEGACY = 'jma_scout_bottom_px';
// Keep the button at least this far from each edge so it never sits
// off-screen or behind the header.
const MIN_EDGE = 16;
// Avatar diameter (with name tag the hit-target is wider, but we clamp
// against the avatar so it never tucks fully off-screen).
const AVATAR_PX = 36;

export default function ScoutChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 2D position state — both axes are draggable. Restored from
  // localStorage on mount so the visitor's chosen spot persists across
  // visits. Drag handlers below update live; we save on pointer-up.
  const [pos, setPos] = useState<{ leftPx: number; bottomPx: number }>({
    leftPx: DEFAULT_LEFT_PX,
    bottomPx: DEFAULT_BOTTOM_PX,
  });
  const draggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, leftPx: 0, bottomPx: 0 });
  // While dragging we suppress the click that fires on pointerup so a
  // drag-to-reposition doesn't also open the chat.
  const justDraggedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(SCOUT_POS_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { leftPx?: number; bottomPx?: number };
        if (
          typeof parsed.leftPx === 'number' &&
          typeof parsed.bottomPx === 'number' &&
          Number.isFinite(parsed.leftPx) &&
          Number.isFinite(parsed.bottomPx)
        ) {
          setPos(clampPos({ leftPx: parsed.leftPx, bottomPx: parsed.bottomPx }));
          return;
        }
      } catch {
        /* fallthrough to legacy migration */
      }
    }
    // Migrate from v1 (bottom-only) if present.
    const legacy = window.localStorage.getItem(SCOUT_POS_KEY_LEGACY);
    if (legacy) {
      const n = Number(legacy);
      if (Number.isFinite(n)) {
        setPos(clampPos({ leftPx: DEFAULT_LEFT_PX, bottomPx: n }));
      }
    }
  }, []);

  function clampPos(next: { leftPx: number; bottomPx: number }): {
    leftPx: number;
    bottomPx: number;
  } {
    if (typeof window === 'undefined') return next;
    const maxLeft = Math.max(MIN_EDGE, window.innerWidth - AVATAR_PX - MIN_EDGE);
    const maxBottom = Math.max(MIN_EDGE, window.innerHeight - AVATAR_PX - MIN_EDGE);
    return {
      leftPx: Math.min(maxLeft, Math.max(MIN_EDGE, next.leftPx)),
      bottomPx: Math.min(maxBottom, Math.max(MIN_EDGE, next.bottomPx)),
    };
  }

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    draggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      leftPx: pos.leftPx,
      bottomPx: pos.bottomPx,
    };
    justDraggedRef.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!draggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = dragStartRef.current.y - e.clientY; // bottom is inverted
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) justDraggedRef.current = true;
    setPos(
      clampPos({
        leftPx: dragStartRef.current.leftPx + dx,
        bottomPx: dragStartRef.current.bottomPx + dy,
      }),
    );
  }
  function onPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch { /* ignore */ }
    if (justDraggedRef.current && typeof window !== 'undefined') {
      window.localStorage.setItem(SCOUT_POS_KEY, JSON.stringify(pos));
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

  // Decide whether the chat panel should anchor by left or right of the
  // avatar so it never opens off-screen. If the avatar sits in the
  // right half of the viewport, anchor by right edge instead.
  const panelAnchorRight =
    typeof window !== 'undefined' && pos.leftPx + AVATAR_PX / 2 > window.innerWidth / 2;
  const panelHorizontalStyle = panelAnchorRight
    ? {
        right:
          typeof window !== 'undefined'
            ? `${Math.max(MIN_EDGE, window.innerWidth - pos.leftPx - AVATAR_PX)}px`
            : '20px',
      }
    : { left: `${pos.leftPx}px` };

  return (
    <>
      {/* Floating Scout avatar — fully draggable in 2D. Drag with finger
          or mouse to move anywhere on the page; position persists across
          visits via localStorage. Default sits well above the mobile
          sticky category bar so it doesn't cover bottom CTAs. */}
      <button
        onClick={handleClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        aria-label={open ? 'Close Scout' : 'Open Scout (drag to move anywhere)'}
        style={{
          left: `${pos.leftPx}px`,
          bottom: `${pos.bottomPx}px`,
          touchAction: 'none',
        }}
        className="fixed z-[300] group flex items-center gap-2.5 transition-[transform,opacity] cursor-grab active:cursor-grabbing"
      >
        {/* Name tag — visible when closed, hides on open. We hide on
            small screens to keep the dragged button compact. */}
        {!open && !panelAnchorRight && (
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
        {/* When the avatar is on the right half, the name tag (if any)
            visually trails on the left of the icon — but we omit it
            to keep the right-anchored variant tidy. */}
      </button>

      {/* Chat panel — anchored just above the (movable) avatar so it
          follows whichever spot the customer dragged Scout to. Picks the
          near edge (left vs right) so it never opens off-screen. */}
      {open && (
        <div
          style={{
            bottom: `${pos.bottomPx + 56}px`,
            ...panelHorizontalStyle,
          }}
          className="fixed z-[299] w-[calc(100vw-40px)] max-w-[380px] h-[520px] max-h-[calc(100vh-120px)] bg-white rounded-3xl shadow-[0_32px_64px_-15px_rgba(0,0,0,0.25)] border border-[#E8ECF4] flex flex-col overflow-hidden"
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
