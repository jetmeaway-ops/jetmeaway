import { ImageResponse } from 'next/og';
import { DESTINATIONS, getDestination } from '@/data/destinations';

/**
 * Dynamic OG card per destination — generated at build time (static via
 * generateStaticParams on the parent page). Twitter/Facebook/WhatsApp/LinkedIn
 * all pick this up automatically via the Next.js metadata.openGraph.images
 * convention — no explicit wiring needed in the page's metadata.
 *
 * Renders a 1200×630 card with:
 *  • Brand label ("JETMEAWAY · DESTINATIONS")
 *  • City name in Playfair-style serif
 *  • Tagline (truncated)
 *  • Price anchor ("from £X/night · Xh from London")
 *  • IATA + country in bottom corner
 *
 * Note: we intentionally avoid fetching the heroImage at build time — that
 * would slow the build and doesn't meaningfully improve share CTR over a
 * well-composed gradient card with strong typography.
 */

// Note: no edge runtime — `generateImageMetadata` below is only supported on
// the Node runtime. Cards are generated once at build time, so perf is moot.
export const alt = 'JetMeAway destination card';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export function generateImageMetadata() {
  return DESTINATIONS.map(d => ({ id: d.slug }));
}

export default async function Image({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  const d = getDestination(city);
  if (!d) {
    return new ImageResponse(
      (
        <div style={{ display: 'flex', width: '100%', height: '100%', background: '#0a1628', color: 'white', alignItems: 'center', justifyContent: 'center', fontSize: 64, fontWeight: 900 }}>
          JetMeAway
        </div>
      ),
      size,
    );
  }

  // Shorten tagline if it's long — OG cards clip around 180px width for body.
  const tagline = d.tagline.length > 110 ? d.tagline.slice(0, 108).trim() + '…' : d.tagline;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background:
            'linear-gradient(135deg, #0a1628 0%, #1a2948 45%, #0d3a5f 100%)',
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Ambient glow accents */}
        <div
          style={{
            position: 'absolute',
            top: -180,
            right: -120,
            width: 520,
            height: 520,
            borderRadius: 9999,
            background: 'radial-gradient(closest-side, rgba(251,146,60,0.35), rgba(251,146,60,0))',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -200,
            left: -140,
            width: 560,
            height: 560,
            borderRadius: 9999,
            background: 'radial-gradient(closest-side, rgba(56,189,248,0.25), rgba(56,189,248,0))',
            display: 'flex',
          }}
        />

        {/* Top row — brand label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, zIndex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 20px',
              background: 'rgba(255,255,255,0.14)',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 9999,
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: 4,
              textTransform: 'uppercase',
            }}
          >
            JetMeAway · Destinations
          </div>
        </div>

        {/* City + tagline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, zIndex: 1 }}>
          <div
            style={{
              fontSize: 132,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: -3,
              display: 'flex',
            }}
          >
            {d.city}
          </div>
          <div
            style={{
              fontSize: 34,
              fontWeight: 600,
              lineHeight: 1.25,
              maxWidth: 980,
              color: 'rgba(255,255,255,0.88)',
              display: 'flex',
            }}
          >
            {tagline}
          </div>
        </div>

        {/* Bottom row — price + country + IATA */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 1,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                padding: '14px 22px',
                background: 'linear-gradient(135deg, #f97316, #fb923c)',
                borderRadius: 18,
                boxShadow: '0 8px 30px rgba(249,115,22,0.45)',
              }}
            >
              <span style={{ fontSize: 16, fontWeight: 700, opacity: 0.9, letterSpacing: 2, textTransform: 'uppercase' }}>
                Hotels from
              </span>
              <span style={{ fontSize: 40, fontWeight: 900, lineHeight: 1 }}>
                £{d.averageNightlyPrice}/night
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 16, fontWeight: 700, opacity: 0.65, letterSpacing: 2, textTransform: 'uppercase' }}>
                Flight time
              </span>
              <span style={{ fontSize: 32, fontWeight: 800 }}>
                {d.flightTimeFromLondonHours}h from London
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              fontSize: 26,
              fontWeight: 800,
              color: 'rgba(255,255,255,0.8)',
            }}
          >
            <span style={{ display: 'flex' }}>{d.country}</span>
            <span style={{ display: 'flex', opacity: 0.4 }}>·</span>
            <span
              style={{
                display: 'flex',
                padding: '6px 14px',
                border: '2px solid rgba(255,255,255,0.35)',
                borderRadius: 10,
                letterSpacing: 3,
              }}
            >
              {d.iata}
            </span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
