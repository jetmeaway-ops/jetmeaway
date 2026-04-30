import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'JetMeAway — UK travel comparison. Compare flights, hotels, car hire and holidays from trusted providers.';

/**
 * Dynamic Open Graph image. Renders a branded 1200x630 PNG at the edge so
 * Messenger / WhatsApp / Facebook / Twitter / LinkedIn / iMessage unfurls
 * show a properly-sized card instead of zooming the square 512x512 logo.
 *
 * Next picks this up automatically by file convention — no metadata wiring
 * needed once the manual `openGraph.images` array is removed from layout.
 */
export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0066FF 0%, #003D99 100%)',
          color: '#FFFFFF',
          fontFamily: 'sans-serif',
          padding: 80,
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div
            style={{
              width: 84,
              height: 84,
              background: '#FFFFFF',
              borderRadius: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 56,
              color: '#0066FF',
              fontWeight: 800,
            }}
          >
            J
          </div>
          <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: -2 }}>JetMeAway</div>
        </div>
        <div style={{ fontSize: 38, fontWeight: 500, marginTop: 36, opacity: 0.95, lineHeight: 1.25 }}>
          Compare flights, hotels &amp; holidays
        </div>
        <div style={{ fontSize: 28, fontWeight: 400, marginTop: 16, opacity: 0.85 }}>
          Trusted UK providers · No markups · No booking fees
        </div>
        <div style={{ fontSize: 26, marginTop: 48, opacity: 0.85, letterSpacing: 1 }}>
          jetmeaway.co.uk
        </div>
      </div>
    ),
    { ...size },
  );
}
