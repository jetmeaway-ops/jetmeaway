import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'JetMeAway';

/**
 * Open Graph card — just the existing brand logo at 1200x630 so social
 * unfurls don't crop / zoom the square asset. No invented text, no
 * invented marks. Pure brand logo on white.
 */
export default async function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FFFFFF',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://jetmeaway.co.uk/jetmeaway-logo.png"
          alt="JetMeAway"
          width={520}
          height={520}
          style={{ objectFit: 'contain' }}
        />
      </div>
    ),
    { ...size },
  );
}
