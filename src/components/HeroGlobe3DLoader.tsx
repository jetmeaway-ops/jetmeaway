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
 * HeroGlobe3DLoader — load-on-engagement gate, DESKTOP ONLY.
 *
 * Three.js (~600KB + a texture) stays off the initial bundle and only loads
 * once the page is interactive AND the viewport is desktop-sized. It arms on
 * the FIRST of:
 *   - any engagement (scroll / pointer / touch / key / wheel), OR
 *   - a 1.2s floor timer.
 *
 * Mobile gate (2026-06-03 bundle-diet pass):
 *   The hero on mobile is solid #0a1628 navy (no gradient) and a sphere
 *   wider than the viewport doesn't add visible value behind the search
 *   wizard. Mobile users now never fetch the Three.js / react-three-fiber
 *   chunk — that was ~600KB of post-paint JS that was dragging Total
 *   Blocking Time to 5.2s. Desktop still gets the globe as decorative bg.
 *
 * The floor uses setTimeout, not requestIdleCallback: rIC is paused
 * indefinitely by Chrome in a background/unfocused tab (which made the globe
 * appear to "take a minute" when the tab wasn't focused). setTimeout still
 * fires in the background, so the globe reliably shows ~1.2s after load while
 * instant-bouncers (sub-1.2s) still pay zero three.js cost and LCP is unhurt.
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

    events.forEach((e) => window.addEventListener(e, arm, opts));
    const timer = window.setTimeout(arm, 1200);

    return cleanup;
  }, []);

  if (!shouldMount) return null;
  return (
    <GlobeErrorBoundary>
      <HeroGlobe3D />
    </GlobeErrorBoundary>
  );
}
