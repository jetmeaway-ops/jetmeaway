'use client';

import { useEffect } from 'react';

/**
 * Pinch-zoom crash guard (2026-08-27, owner report with app-switcher proof):
 * deep pinch-zoom on any hotel page blanked the page in Safari and KILLED the
 * iOS app outright (WKWebView's web-content process OOMs and the app shows a
 * white card until relaunch).
 *
 * Why: WebKit rasterises compositing layers at the ZOOMED resolution, so tile
 * memory grows with the square of the pinch scale — and this site stacks a
 * full-viewport fixed backdrop image (HotelBackdrop / DestinationBackdrop)
 * under ~50 backdrop-filter surfaces (glass header, sticky bars, modals).
 * At 4-5x zoom that multiplies into hundreds of MB and the process dies.
 *
 * We deliberately do NOT cap the viewport's maximum-scale — zooming is an
 * accessibility right (see the note in layout.tsx). Instead, while the visual
 * viewport is actually zoomed past ~15%, the <html> element carries
 * `is-zoomed`, and globals.css uses it to (a) hide the decorative fixed
 * backdrops and (b) switch backdrop-filter surfaces to plain translucent
 * fills. A zoomed-in reader is looking at content, not glass effects — the
 * page looks the same to them, and the memory bomb is defused.
 */
export default function ZoomGuard() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    let zoomed = false;
    const onChange = () => {
      const next = vv.scale > 1.15;
      if (next !== zoomed) {
        zoomed = next;
        document.documentElement.classList.toggle('is-zoomed', next);
      }
    };
    vv.addEventListener('resize', onChange);
    onChange();
    return () => vv.removeEventListener('resize', onChange);
  }, []);
  return null;
}
