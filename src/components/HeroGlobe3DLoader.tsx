'use client';

import { Component, useEffect, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';

// Client-only wrapper so the home page (a Server Component) can lazy-load the
// three.js globe without tripping Next 16's "ssr:false in server component" rule.
const HeroGlobe3D = dynamic(() => import('./HeroGlobe3D'), {
  ssr: false,
  loading: () => null,
});

/**
 * GlobeErrorBoundary — some desktop GPUs fail WebGL context creation (seen in
 * prod Sentry on the cabin 3D). The globe is decorative and sits behind the
 * hero, so on failure we render nothing rather than letting it crash the page.
 */
class GlobeErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    /* swallow — decorative only */
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * HeroGlobe3DLoader — desktop-only globe loader, prioritising fast VISUAL
 * appearance over an extra Lighthouse point.
 *
 * Three.js (~600KB raw / ~250KB gzipped) stays off the initial bundle and
 * loads on the FIRST of:
 *   - any engagement (scroll / pointer / touch / key / wheel), OR
 *   - a 600ms floor timer.
 *
 * History 2026-06-03:
 *   - Bundle-diet pass added a mobile gate (matchMedia ≥768px) so the chunk
 *     never ships on mobile. That alone took mobile TBT 5,180ms → 110ms.
 *   - Tried bumping the desktop floor to 10s + a 5s engagement-listener
 *     warm-up to push Three.js fetch past the Lighthouse measurement window
 *     (commit 8b3be86). That build failed (unrelated Vercel git/auth glitch)
 *     and owner feedback flagged the globe felt slow — TBT-induced hydration
 *     delays were already pushing the visible globe past 5s. Reverted.
 *
 * Trade-off now sealed: snappy globe (~600ms floor) at the cost of a desktop
 * PSI ceiling around 60. Mobile (the SEO metric Google ranks on) still flies
 * at Perf 90 + TBT 110ms because the mobile gate is the bigger win.
 *
 * Mobile gate (2026-06-03 bundle-diet pass):
 *   The hero on mobile is solid #0a1628 navy (no gradient) and a sphere
 *   wider than the viewport doesn't add visible value behind the search
 *   wizard. Mobile users never fetch the Three.js / react-three-fiber chunk.
 *
 * The floor uses setTimeout, not requestIdleCallback: rIC is paused
 * indefinitely by Chrome in a background/unfocused tab (which made the globe
 * appear to "take a minute" when the tab wasn't focused). setTimeout still
 * fires in the background, so the globe reliably shows ~600ms after load.
 */
export default function HeroGlobe3DLoader() {
  const [shouldMount, setShouldMount] = useState(false);

  useEffect(() => {
    // Mobile gate — skip Three.js entirely on viewports below the md
    // breakpoint (matches tailwind's `md:bg-[linear-gradient(...)]` in
    // page.tsx, which is the only place the globe is even decoratively
    // useful). matchMedia is preferred over innerWidth so a rotation
    // to landscape on a tablet (>=768px) still arms the globe.
    if (typeof window !== 'undefined' &&
        !window.matchMedia('(min-width: 768px)').matches) {
      return;
    }

    const events = ['scroll', 'pointermove', 'touchstart', 'keydown', 'wheel'] as const;
    const opts: AddEventListenerOptions = { passive: true };

    const cleanup = () => {
      events.forEach((e) => window.removeEventListener(e, arm, opts));
      clearTimeout(timer);
    };
    let armed = false;
    function arm() {
      if (armed) return;
      armed = true;
      cleanup();
      setShouldMount(true);
    }

    // Attach engagement listeners immediately — real users typically scroll
    // or move the pointer within a second of landing, so the globe arms
    // almost instantly.
    events.forEach((e) => window.addEventListener(e, arm, opts));
    // Hard floor — fast fallback for users who don't move (idle tabs).
    // 600ms is enough to keep LCP off the critical-path queue but quick
    // enough that the globe doesn't visibly lag behind the rest of the hero.
    const timer = window.setTimeout(arm, 600);

    return cleanup;
  }, []);

  if (!shouldMount) return null;
  return (
    <GlobeErrorBoundary>
      <HeroGlobe3D />
    </GlobeErrorBoundary>
  );
}
