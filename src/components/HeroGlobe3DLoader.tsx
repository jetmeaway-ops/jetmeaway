'use client';

import { Component, useEffect, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';

/**
 * GlobeErrorBoundary — last line of defence.
 *
 * Some desktop GPUs/drivers fail WebGL context creation (we've seen the
 * "Error creating WebGL context" Sentry alert in prod on another 3D
 * component). The globe is purely decorative and sits BEHIND the hero,
 * so if three.js throws we simply render nothing — the hero, search and
 * the rest of the page are unaffected. A 3D background must never be able
 * to take down the homepage.
 */
class GlobeErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    /* swallow — decorative only, nothing to report or recover */
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// Client-only wrapper so the home page (a Server Component) can lazy-load
// the three.js globe without tripping Next 16's "ssr:false in server
// component" rule.
const HeroGlobe3D = dynamic(() => import('./HeroGlobe3D'), {
  ssr: false,
  loading: () => null,
});

/**
 * HeroGlobe3DLoader — load-on-engagement gate.
 *
 * Three.js (~600KB JS + WebGL init) only downloads when the user has
 * actually engaged with the page:
 *   - they scrolled past 100px (intent signal), OR
 *   - 3 seconds of browser idle have elapsed (page is fully interactive
 *     AND the user hasn't navigated away). Falls back to a plain
 *     setTimeout on browsers without requestIdleCallback (Safari).
 *
 * For users who bounce in the first 3s without scrolling — zero three.js
 * cost. They see the calm hero, search, and they leave. Globe is purely
 * a reward for engaged visitors.
 */
export default function HeroGlobe3DLoader() {
  const [shouldMount, setShouldMount] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const arm = () => {
      if (cancelled) return;
      setShouldMount(true);
    };

    // Path A — first meaningful scroll
    const onScroll = () => {
      if (window.scrollY > 100) {
        window.removeEventListener('scroll', onScroll);
        arm();
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    // Path B — browser idle for ~3s
    type RIC = (cb: () => void, opts?: { timeout?: number }) => number;
    const ric = (window as unknown as { requestIdleCallback?: RIC }).requestIdleCallback;
    const cic = (window as unknown as { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback;
    const idleHandle = ric ? ric(arm, { timeout: 3000 }) : window.setTimeout(arm, 3000);

    return () => {
      cancelled = true;
      window.removeEventListener('scroll', onScroll);
      if (ric && cic) cic(idleHandle);
      else clearTimeout(idleHandle);
    };
  }, []);

  if (!shouldMount) return null;
  return (
    <GlobeErrorBoundary>
      <HeroGlobe3D />
    </GlobeErrorBoundary>
  );
}
