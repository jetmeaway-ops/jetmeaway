'use client';

import { useEffect, useState } from 'react';

/**
 * App-store badge row — links to the JetMeAway iOS + Android apps.
 *
 * Rendered under the search area of the home hero and every category page.
 * The previous treatment was a faint "Get the app" label + two tiny
 * monochrome glyphs that were near-invisible on the dark hero — this is the
 * high-contrast replacement: proper pill buttons, bigger glyphs, two-line
 * store text.
 *
 *   variant="dark"  — sits on a dark background (home hero + 6 categories)
 *   variant="light" — sits on a light background (the /explore page)
 *
 * These are JetMeAway's own branded buttons. To switch to Apple's / Google's
 * official badge artwork, drop the official image files into /public and
 * swap each <a>'s inner markup for an <img>.
 */

const APP_STORE_URL = 'https://apps.apple.com/gb/app/jetmeaway/id6765715611';
const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=uk.co.jetmeaway.app';

type Props = {
  variant?: 'dark' | 'light';
  className?: string;
};

export default function AppStoreBadges({ variant = 'dark', className = '' }: Props) {
  // Hide the "Get the app" badges when the page is already running inside the
  // JetMeAway native app's WebView — the injected bridge sets
  // window.JetMeAwayNative, so an app user is never told to download the app.
  const [inApp, setInApp] = useState(false);
  useEffect(() => {
    if ((window as unknown as { JetMeAwayNative?: unknown }).JetMeAwayNative) {
      setInApp(true);
    }
  }, []);
  if (inApp) return null;

  const onDark = variant === 'dark';
  const labelColor = onDark ? 'text-white/70' : 'text-[#5C6378]';

  // Black pill on both backgrounds — the universal app-badge look — but the
  // border + shadow change so the button separates cleanly from whichever
  // background it lands on.
  //
  // Mobile: both pills share ONE fixed width (w-[148px]) with centred content
  // and tighter padding, so App Store and Google Play are visually identical
  // and the pair fits comfortably side-by-side on a phone. sm+ restores the
  // original auto-width, left-aligned, roomier pill for desktop.
  const pill = [
    'group inline-flex items-center justify-center gap-2 rounded-xl bg-black',
    'w-[148px] px-3 py-2 sm:w-auto sm:justify-start sm:gap-2.5 sm:px-4 sm:py-2.5',
    'transition-all hover:-translate-y-0.5',
    onDark
      ? 'border border-white/25 hover:border-white/55 shadow-[0_2px_12px_rgba(0,0,0,0.45)]'
      : 'border border-black/10 shadow-[0_4px_16px_rgba(0,0,0,0.18)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.25)]',
  ].join(' ');

  // Layout: on mobile the "Get the app" label sits centred on its own line
  // with the two pills side-by-side below it (an even, symmetric row). On
  // desktop (sm+) it collapses to the original single inline row: label then
  // both pills. Previously all three shared one flex-wrap row, so on a narrow
  // phone the label + one pill filled line 1 and the second pill dropped to a
  // lopsided line 2. Grouping the pills fixes that; the inner group also wraps
  // so on very narrow (<~330px) devices the pills stack evenly (still centred).
  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-center gap-x-3 gap-y-2.5 ${className}`}
    >
      <span
        className={`font-[var(--next-poppins)] text-[.8rem] font-semibold ${labelColor}`}
      >
        Get the app
      </span>

      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Download JetMeAway on the App Store"
          className={pill}
        >
          <i
            className="fa-brands fa-apple text-white text-[1.35rem] sm:text-[1.6rem] leading-none"
            aria-hidden="true"
          />
          <span className="flex flex-col leading-tight text-left text-white">
            <span className="text-[.52rem] sm:text-[.58rem] font-medium tracking-wide opacity-80">
              Download on the
            </span>
            <span className="text-[.82rem] sm:text-[.95rem] font-bold -mt-0.5">App Store</span>
          </span>
        </a>

        <a
          href={PLAY_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Get JetMeAway on Google Play"
          className={pill}
        >
          <i
            className="fa-brands fa-google-play text-white text-[1.15rem] sm:text-[1.35rem] leading-none"
            aria-hidden="true"
          />
          <span className="flex flex-col leading-tight text-left text-white">
            <span className="text-[.52rem] sm:text-[.58rem] font-medium tracking-wide opacity-80">
              Get it on
            </span>
            <span className="text-[.82rem] sm:text-[.95rem] font-bold -mt-0.5">Google Play</span>
          </span>
        </a>
      </div>
    </div>
  );
}
