'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Floating "back to top" button — appears below the fold, smooth-scrolls
 * to top on tap, AND can be dragged to a comfortable spot on the screen.
 *
 * 2026-05-16 — owner ask: "before build 30 goes live, can we make the
 * arrow floating so users can adjust according to their comfort". The
 * old version was fixed bottom-right. Right-handed users on big phones
 * loved it; left-handed users wanted it on the left, tall-phone users
 * wanted it higher so it didn't sit under the thumb-rest. Now they
 * just drag.
 *
 * Behaviour:
 *   - Tap (no movement > 8px) → smooth scroll to top
 *   - Hold + drag → reposition. Pointer events for unified touch + mouse.
 *   - Release → snap to the NEAREST vertical edge (left or right). Keeps
 *     the button flush — never half-floating in the middle of content.
 *   - Position is persisted to localStorage under `jma:b2t:pos:v1`. The
 *     stored shape is `{ side, top }` where side is "left" or "right"
 *     and top is the px offset from the top of the viewport. Stored
 *     in PX (not %) because the button is a fixed pixel size and
 *     viewport-height changes (rotation, browser-chrome show/hide) on
 *     mobile shouldn't drift the button — keeping the same px offset
 *     means "stays where the user put it" matches the user's intuition.
 *   - On viewport resize, clamp the stored top so the button stays
 *     between 80px from each edge.
 *
 * Drops in anywhere as `<BackToTopButton />` — self-contained, no props.
 */

const STORAGE_KEY = 'jma:b2t:pos:v1';
const DRAG_THRESHOLD_PX = 8;
const SAFE_TOP_PX = 80;
const SAFE_BOTTOM_PX = 80;
const BTN_SIZE = 48;
const EDGE_PADDING = 24; // px from the left/right viewport edge when snapped

type Side = 'left' | 'right';
type Pos = { side: Side; top: number };

function clampTop(top: number): number {
  if (typeof window === 'undefined') return top;
  const max = window.innerHeight - SAFE_BOTTOM_PX - BTN_SIZE;
  const min = SAFE_TOP_PX;
  return Math.max(min, Math.min(max, top));
}

function defaultPos(): Pos {
  if (typeof window === 'undefined') {
    return { side: 'right', top: 600 };
  }
  // Old default: bottom-6 right-6 ≈ 24px from each corner.
  // Map that to a `top` value so the same component drives both modes.
  return { side: 'right', top: window.innerHeight - SAFE_BOTTOM_PX - BTN_SIZE };
}

function loadPos(): Pos {
  if (typeof window === 'undefined') return defaultPos();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPos();
    const parsed = JSON.parse(raw) as Partial<Pos>;
    const side: Side = parsed.side === 'left' ? 'left' : 'right';
    const top =
      typeof parsed.top === 'number' && Number.isFinite(parsed.top)
        ? clampTop(parsed.top)
        : defaultPos().top;
    return { side, top };
  } catch {
    return defaultPos();
  }
}

function savePos(pos: Pos) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  } catch {
    /* private mode / quota — silent */
  }
}

export default function BackToTopButton() {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<Pos>(() => defaultPos());

  // Tracks the live drag position in absolute viewport coords so the
  // button can render anywhere mid-drag, not just snapped to an edge.
  // Null = not currently dragging.
  const [dragXY, setDragXY] = useState<{ x: number; y: number } | null>(null);

  const btnRef = useRef<HTMLButtonElement>(null);
  // Tracks the pointer position relative to the button's top-left at
  // drag start, so the button doesn't jump under the finger.
  const dragOffsetRef = useRef<{ dx: number; dy: number } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const movedPastThresholdRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);

  // Rehydrate from localStorage on mount. SSR-safe because loadPos
  // is short-circuited server-side.
  useEffect(() => {
    setPos(loadPos());
  }, []);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Re-clamp on resize so the button doesn't end up off-screen after
  // device-rotation or browser-chrome show/hide on mobile.
  useEffect(() => {
    const onResize = () => {
      setPos((prev) => {
        const next: Pos = { side: prev.side, top: clampTop(prev.top) };
        if (next.top !== prev.top) savePos(next);
        return next;
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!btnRef.current) return;
    // Only left mouse button. Touch + pen have button === 0 too.
    if (e.button !== 0) return;
    const rect = btnRef.current.getBoundingClientRect();
    dragOffsetRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    movedPastThresholdRef.current = false;
    activePointerIdRef.current = e.pointerId;
    // Capture so we keep receiving move/up even if the cursor leaves the button.
    btnRef.current.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    const start = dragStartRef.current;
    const offset = dragOffsetRef.current;
    if (!start || !offset) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (!movedPastThresholdRef.current) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      movedPastThresholdRef.current = true;
    }
    // Live drag: render at (clientX - offset.dx, clientY - offset.dy)
    // clamped so the button can't be dragged off-screen.
    const liveX = Math.max(
      4,
      Math.min(window.innerWidth - BTN_SIZE - 4, e.clientX - offset.dx),
    );
    const liveY = Math.max(
      4,
      Math.min(window.innerHeight - BTN_SIZE - 4, e.clientY - offset.dy),
    );
    setDragXY({ x: liveX, y: liveY });
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    activePointerIdRef.current = null;
    if (btnRef.current?.hasPointerCapture(e.pointerId)) {
      btnRef.current.releasePointerCapture(e.pointerId);
    }

    const moved = movedPastThresholdRef.current;
    const live = dragXY;
    setDragXY(null);
    dragStartRef.current = null;
    dragOffsetRef.current = null;
    movedPastThresholdRef.current = false;

    if (!moved || !live) {
      // Treat as a click — scroll to top.
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Snap to nearest vertical edge. Use the button CENTRE (not its left
    // edge) as the snap reference so a button dragged just past the
    // midline still feels like it's "on that side".
    const buttonCentreX = live.x + BTN_SIZE / 2;
    const side: Side = buttonCentreX < window.innerWidth / 2 ? 'left' : 'right';
    const top = clampTop(live.y);
    const next: Pos = { side, top };
    setPos(next);
    savePos(next);
  }, [dragXY]);

  // If the pointer is lost (e.g. system gesture interrupted on iOS),
  // tidy up state so the next interaction starts clean.
  const handlePointerCancel = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    activePointerIdRef.current = null;
    dragStartRef.current = null;
    dragOffsetRef.current = null;
    movedPastThresholdRef.current = false;
    setDragXY(null);
  }, []);

  // Build the style. Mid-drag: pin to dragXY for live feedback.
  // Otherwise: anchor to chosen edge at saved top.
  const style: React.CSSProperties = dragXY
    ? { left: dragXY.x, top: dragXY.y, right: 'auto', bottom: 'auto' }
    : pos.side === 'left'
      ? { left: EDGE_PADDING, top: pos.top, right: 'auto', bottom: 'auto' }
      : { right: EDGE_PADDING, top: pos.top, left: 'auto', bottom: 'auto' };

  return (
    <button
      ref={btnRef}
      type="button"
      aria-label="Back to top of page · drag to reposition"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      style={{
        ...style,
        // touch-action:none stops the browser from hijacking the
        // gesture for scroll/zoom mid-drag. Critical on iOS Safari.
        touchAction: 'none',
        // Slight scale-up while dragging gives haptic-equivalent
        // visual feedback that "you've picked it up".
        transform: dragXY ? 'scale(1.08)' : undefined,
        cursor: dragXY ? 'grabbing' : 'grab',
      }}
      className={`fixed z-[50] w-12 h-12 rounded-full bg-[#0066FF] hover:bg-[#0052CC] text-white shadow-lg shadow-[rgba(0,102,255,0.35)] flex items-center justify-center transition-opacity duration-200 select-none ${
        visible
          ? 'opacity-100 pointer-events-auto'
          : 'opacity-0 pointer-events-none'
      }`}
    >
      <i className="fa-solid fa-arrow-up text-base" aria-hidden />
    </button>
  );
}
