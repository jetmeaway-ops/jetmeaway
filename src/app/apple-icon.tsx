import { ImageResponse } from 'next/og';

// Image metadata — Apple touch icon for iOS home screens
export const size = {
  width: 180,
  height: 180,
};
export const contentType = 'image/png';

// Image generation — branded JetMeAway apple touch icon
// Same design as icon.tsx but larger. iOS applies its own rounded corners.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 120,
          background: 'linear-gradient(135deg, #0066FF 0%, #0052CC 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 900,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          letterSpacing: '-6px',
        }}
      >
        J
      </div>
    ),
    { ...size },
  );
}
