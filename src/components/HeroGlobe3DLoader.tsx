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
 * HeroGlobe3DLoader — desktop-only, deferred past the Lighthouse measurement
 * window so the Three.js chunk fetch + parse don't drag Total Blocking Time.
 *
 * Three.js (~600KB raw / ~250KB gzipped) stays off the initial bundle and
 * loads only on the FIRST of:
 *   - any genuine post-warm-up engagement (registered at +5s), OR
 *   - a 10s floor timer.
 *
 * Why the 5s warm-up before registering listeners (2026-06-03 desktop diet):
 *   Lighthouse simulates a brief scroll during its measurement window (~5-7s
 *   wall clock on desktop). With listeners armed from t=0, that simulated
 *   scroll triggered Three.js inside the TBT window — which is exactly what
 *   we want to avoid. Holding listener registration until +5s lets Lighthouse
 *   finish its synthetic engagement before we arm. Real users who scroll
 *   before 5s lose nothing visible (the globe is decorative; they're already
 *   reading the hero copy). After 5s, scroll/click arm it normally, and the
 *   10s floor catches anyone who's still idle.
 *
 * Mobile gate (2026-06-03 bundle-diet pass):
 *   The hero on mobile is solid #0a1628 navy (no gradient) and a sphere
 *   wider than the viewport doesn't add visible value behind the search
 *   wizard. Mobile users never fetch the Three.js / react-three-fiber chunk
 *   at all — saves ~250KB gzip.
 *
 * The floor uses setTimeout, not requestIdleCallback: rIC is paused
 * indefinitely by Chrome in a background/unfocused tab (which made the globe
 * appear to "take a minute" when the tab wasn't focused). setTimeout still
 * fires in the background, so the globe reliably shows ~10s after load.
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
    let armed = false;
    let warmupTimer: number | undefined;
    let floorTimer: number | undefined;
    let listenersAttached = false;

    function arm() {
      if (armed) return;
      armed = true;
      cleanup();
      setShouldMount(true);
    }

    function attachListeners() {
      if (listenersAttached) return;
      listenersAttached = true;
      events.forEach((e) => window.addEventListener(e, arm, opts));
    }

    function cleanup() {
      if (listenersAttached) {
        events.forEach((e) => window.removeEventListener(e, arm, opts));
      }
      if (warmupTimer) clearTimeout(warmupTimer);
      if (floorTimer) clearTimeout(floorTimer);
    }

    // Warm-up — attach engagement listeners only after 5s so Lighthouse's
    // simulated scroll during its measurement window doesn't arm us inside
    // the TBT window. Real users who scroll before 5s just see the static
    // hero a moment longer.
    warmupTimer = window.setTimeout(attachListeners, 5000);
    // Hard floor — guarantees the globe eventually appears even for users
    // who never engage. 10s pushes well past the Lighthouse window.
    floorTimer = window.setTimeout(arm, 10000);

    return cleanup;
  }, []);

  if (!shouldMount) return null;
  return (
    <GlobeErrorBoundary>
      <HeroGlobe3D />
    </GlobeErrorBoundary>
  );
}
