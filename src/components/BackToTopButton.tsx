'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Floating "back to top" button — appears below the fold, smooth-scrolls
 * to top on tap, AND can be dragged anywhere to a comfortable spot.
 *
 * 2026-05-16 — owner ask: "same way we have created scout bot floating".
 * This file deliberately mirrors `ScoutChat.tsx`'s drag handlers
 * 1-for-1 (`onPointerDown`/`onPointerMove`/`onPointerUp` shape,
 * `justDraggedRef` click-suppression, `{ leftPx, bottomPx }` 2D
 * position anchored bottom-left, 4px movement threshold, localStorage
 * persistence with the same v2 naming convention). Two floating things
 * on the page should feel the same.
 *
 * Free-floating (no snap-to-edge) — matches Scout's behaviour. Where
 * the user puts it is where it stays.
 *
 * Drops in anywhere as `<BackToTopButton />` — self-contained, no props.
 */

const DEFAULT_LEFT_PX = 20;
const DEFAULT_BOTTOM_PX = 24; // bottom-6 ≈ 24px — matches the old fixed position
const B2T_POS_KEY = 'jma_b2t_pos_v1';
const MIN_EDGE = 16;
const BTN_PX = 48; // matches w-12 h-12

export default function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  // 2D position, restored from localStorage. Anchored bottom-left
  // (same as Scout) so it stays clear of the mobile sticky category
  // bar and bottom CTAs by default. The "right-corner" default
  // mounts at innerWidth - BTN_PX - MIN_EDGE — set once on mount
  // so SSR renders something sensible.
  const [pos, setPos] = useState<{ leftPx: number; bottomPx: number }>({
    leftPx: DEFAULT_LEFT_PX,
    bottomPx: DEFAULT_BOTTOM_PX,
  });
  const draggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, leftPx: 0, bottomPx: 0 });
  // While dragging, suppress the click that fires on pointerup so a
  // drag-to-reposition doesn't also scroll the page to top.
  const justDraggedRef = useRef(false);

  // Restore (or default to bottom-RIGHT corner on first visit, since
  // that's where the old non-draggable version sat — visitors who've
  // never moved it shouldn't see the button jump to bottom-left after
  // upgrade).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(B2T_POS_KEY);
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
        /* fall through to default */
      }
    }
    // No persisted position → bottom-RIGHT default (matches the
    // pre-2026-05-16 fixed placement).
    setPos(
      clampPos({
        leftPx: window.innerWidth - BTN_PX - 24,
        bottomPx: DEFAULT_BOTTOM_PX,
      }),
    );
  }, []);

  function clampPos(next: { leftPx: number; bottomPx: number }): {
    leftPx: number;
    bottomPx: number;
  } {
    if (typeof window === 'undefined') return next;
    const maxLeft = Math.max(MIN_EDGE, window.innerWidth - BTN_PX - MIN_EDGE);
    const maxBottom = Math.max(MIN_EDGE, window.innerHeight - BTN_PX - MIN_EDGE);
    return {
      leftPx: Math.min(maxLeft, Math.max(MIN_EDGE, next.leftPx)),
      bottomPx: Math.min(maxBottom, Math.max(MIN_EDGE, next.bottomPx)),
    };
  }

  // Visibility — appear only below the fold so we don't hover above
  // the form at the top of the page. Threshold 600px (~one mobile
  // viewport) matches the original behaviour.
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Re-clamp on resize so rotation / mobile-chrome show-hide doesn't
  // strand the button off-screen.
  useEffect(() => {
    const onResize = () => setPos((p) => clampPos(p));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

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
    } catch {
      /* ignore — capture already released */
    }
    if (justDraggedRef.current && typeof window !== 'undefined') {
      window.localStorage.setItem(B2T_POS_KEY, JSON.stringify(pos));
    }
  }

  function handleClick() {
    // Suppress the click that fires after a drag (same trick as Scout).
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <button
      type="button"
      aria-label="Back to top of page · drag to reposition"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={handleClick}
      style={{
        left: pos.leftPx,
        bottom: pos.bottomPx,
        // touch-action:none stops the browser from hijacking the
        // gesture for scroll/zoom mid-drag. Critical on iOS Safari.
        touchAction: 'none',
        cursor: draggingRef.current ? 'grabbing' : 'grab',
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
