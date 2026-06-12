'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/**
 * Floating, draggable button that drives traffic to the temporary
 * /world-cup-2026 campaign page — rendered as the OFFICIAL adidas "Trionda"
 * 2026 World Cup match ball (public/wc-2026-ball.webp).
 *
 * Behaviour mirrors ScoutChat / BackToTopButton 1-for-1 — same 2D drag,
 * same 4px threshold, same click-suppression-after-drag, same localStorage
 * persistence — so it feels identical to the Scout button the owner asked
 * to match. Tap (without dragging) navigates to the World Cup hub.
 *
 * Lifecycle: it's a TEMPORARY campaign, so the ball auto-hides after the
 * tournament (CAMPAIGN_END) and on the World Cup page itself (redundant
 * there) plus the conversion-critical funnels (checkout / account / success).
 */

// Hide once the tournament is over (the page itself empties after this too).
const CAMPAIGN_END = '2026-07-20';
// Routes where a promo ball would distract from a primary CTA, or be
// redundant (the World Cup page already has its own big ball).
const HIDE_ON_PREFIXES = ['/world-cup-2026', '/checkout', '/hotels/checkout', '/account', '/success'];

const BALL_PX = 56;
const DEFAULT_BOTTOM_PX = 96; // sits above the back-to-top button's corner
const WC_BALL_POS_KEY = 'jma_wc_ball_pos_v1';
const MIN_EDGE = 16;

type Pos = { leftPx: number; bottomPx: number };

/** Keep a position on-screen (and clear of the very edges / header). */
function clampPos(next: Pos): Pos {
  if (typeof window === 'undefined') return next;
  const maxLeft = Math.max(MIN_EDGE, window.innerWidth - BALL_PX - MIN_EDGE);
  const maxBottom = Math.max(MIN_EDGE, window.innerHeight - BALL_PX - MIN_EDGE);
  return {
    leftPx: Math.min(maxLeft, Math.max(MIN_EDGE, next.leftPx)),
    bottomPx: Math.min(maxBottom, Math.max(MIN_EDGE, next.bottomPx)),
  };
}

/**
 * First-visit default landing spot for the current route.
 *  - Homepage: perched just ABOVE the hero search "Go" button so it sits on
 *    the primary CTA without ever covering it (Go stays fully clickable).
 *  - Anywhere else (or if the Go button can't be found): bottom-right corner,
 *    raised above the back-to-top button and clear of the bottom-left Scout.
 */
function defaultPosFor(pathname: string | null): Pos {
  if (typeof window === 'undefined') return { leftPx: MIN_EDGE, bottomPx: DEFAULT_BOTTOM_PX };
  if (pathname === '/') {
    const go = document.querySelector('button[aria-label="Search"]');
    if (go) {
      const r = go.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        return clampPos({
          leftPx: r.left + r.width / 2 - BALL_PX / 2, // centred on Go
          bottomPx: window.innerHeight - r.top + 8, // 8px gap above Go's top
        });
      }
    }
  }
  return clampPos({
    leftPx: window.innerWidth - BALL_PX - 20,
    bottomPx: DEFAULT_BOTTOM_PX,
  });
}

export default function WorldCupBall() {
  const pathname = usePathname();
  const router = useRouter();
  const suppressed = HIDE_ON_PREFIXES.some((p) => pathname?.startsWith(p));

  const [mounted, setMounted] = useState(false);
  const [expired, setExpired] = useState(false);

  // 2D position. On first visit it (re)anchors to the route default —
  // perched above the hero Go button on the homepage; bottom-right elsewhere.
  // A drag overrides it and persists to localStorage.
  const [pos, setPos] = useState<Pos>({
    leftPx: MIN_EDGE,
    bottomPx: DEFAULT_BOTTOM_PX,
  });
  const draggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, leftPx: 0, bottomPx: 0 });
  // While dragging, suppress the click that fires on pointerup so a
  // drag-to-reposition doesn't also navigate to the campaign page.
  const justDraggedRef = useRef(false);
  // True once the visitor has a spot of their own (restored from localStorage
  // or set by a drag). Stops the route default from overriding their choice.
  const customRef = useRef(false);

  // Runs on mount and on every client-side route change. Restores the
  // visitor's saved spot if they have one; otherwise (re)anchors to the
  // current route's default — so landing on, or navigating to, the homepage
  // perches the ball just above the Go button.
  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined') return;

    // Campaign expiry — compute against the client's "today".
    const today = new Date().toISOString().slice(0, 10);
    if (today >= CAMPAIGN_END) {
      setExpired(true);
      return;
    }

    const raw = window.localStorage.getItem(WC_BALL_POS_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { leftPx?: number; bottomPx?: number };
        if (
          typeof parsed.leftPx === 'number' &&
          typeof parsed.bottomPx === 'number' &&
          Number.isFinite(parsed.leftPx) &&
          Number.isFinite(parsed.bottomPx)
        ) {
          customRef.current = true; // their own spot — never override it
          setPos(clampPos({ leftPx: parsed.leftPx, bottomPx: parsed.bottomPx }));
          return;
        }
      } catch {
        /* fall through to default */
      }
    }
    // No saved spot → anchor to the route default (homepage: above Go).
    if (!customRef.current) setPos(defaultPosFor(pathname));
  }, [pathname]);

  // Re-clamp on resize so rotation / mobile-chrome show-hide never strands
  // the ball off-screen.
  useEffect(() => {
    if (typeof window === 'undefined') return;
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
      customRef.current = true; // their chosen spot now wins over the default
      window.localStorage.setItem(WC_BALL_POS_KEY, JSON.stringify(pos));
    }
  }

  function handleClick() {
    // Suppress the click that fires after a drag (same trick as Scout).
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      return;
    }
    router.push('/world-cup-2026');
  }

  if (!mounted || expired || suppressed) return null;

  return (
    <>
      {/* Spin-on-hover + a soft attention pulse around the ball. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
.wc-float-ball{
  transition: transform .8s ease;
  animation: wc-float-pulse 2.6s ease-out infinite;
}
.wc-float-ball:hover{ animation:none; transform: rotate(360deg) scale(1.08); }
.wc-float-ball:active{ transform: scale(.95); }
@keyframes wc-float-pulse{
  0%,100%{ box-shadow:0 8px 22px -6px rgba(10,22,40,.55), 0 0 0 0 rgba(0,102,255,.45); }
  50%{ box-shadow:0 8px 22px -6px rgba(10,22,40,.55), 0 0 0 10px rgba(0,102,255,0); }
}
@media (prefers-reduced-motion: reduce){
  .wc-float-ball{ animation:none; transition:none; }
  .wc-float-ball:hover{ transform: scale(1.08); }
}
`,
        }}
      />
      <button
        type="button"
        aria-label="World Cup 2026 host-city hotels & flights · drag to reposition"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={handleClick}
        style={{
          left: pos.leftPx,
          bottom: pos.bottomPx,
          width: BALL_PX,
          height: BALL_PX,
          // touch-action:none stops the browser hijacking the gesture for
          // scroll/zoom mid-drag. Critical on iOS Safari.
          touchAction: 'none',
          cursor: draggingRef.current ? 'grabbing' : 'grab',
        }}
        className="wc-float-ball group fixed z-[120] flex select-none items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-black/10"
      >
        {/* The real adidas Trionda 2026 World Cup match ball. Scaled up a
            touch so the ball fills the circular button with no white ring. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/wc-2026-ball.webp"
          alt=""
          draggable={false}
          className="pointer-events-none h-full w-full scale-[1.06] object-cover"
        />
        {/* Hover tooltip — centred above the ball, never blocks the drag. */}
        <span className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-[#E8ECF4] bg-white px-3 py-1.5 font-poppins text-[.72rem] font-extrabold text-[#1A1D2B] opacity-0 shadow-[0_6px_18px_rgba(0,0,0,0.12)] transition-opacity duration-200 group-hover:opacity-100">
          ⚽ World Cup 2026 →
        </span>
      </button>
    </>
  );
}
