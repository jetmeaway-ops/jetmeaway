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
  const onDark = variant === 'dark';
  const labelColor = onDark ? 'text-white/70' : 'text-[#5C6378]';

  // Black pill on both backgrounds — the universal app-badge look — but the
  // border + shadow change so the button separates cleanly from whichever
  // background it lands on.
  const pill = [
    'group inline-flex items-center gap-2.5 rounded-xl bg-black px-4 py-2.5',
    'transition-all hover:-translate-y-0.5',
    onDark
      ? 'border border-white/25 hover:border-white/55 shadow-[0_2px_12px_rgba(0,0,0,0.45)]'
      : 'border border-black/10 shadow-[0_4px_16px_rgba(0,0,0,0.18)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.25)]',
  ].join(' ');

  return (
    <div className={`flex flex-wrap items-center justify-center gap-3 ${className}`}>
      <span
        className={`font-[var(--font-dm-sans)] text-[.8rem] font-semibold ${labelColor}`}
      >
        Get the app
      </span>

      <a
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Download JetMeAway on the App Store"
        className={pill}
      >
        <i
          className="fa-brands fa-apple text-white text-[1.6rem] leading-none"
          aria-hidden="true"
        />
        <span className="flex flex-col leading-tight text-left text-white">
          <span className="text-[.58rem] font-medium tracking-wide opacity-80">
            Download on the
          </span>
          <span className="text-[.95rem] font-bold -mt-0.5">App Store</span>
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
          className="fa-brands fa-google-play text-white text-[1.35rem] leading-none"
          aria-hidden="true"
        />
        <span className="flex flex-col leading-tight text-left text-white">
          <span className="text-[.58rem] font-medium tracking-wide opacity-80">
            Get it on
          </span>
          <span className="text-[.95rem] font-bold -mt-0.5">Google Play</span>
        </span>
      </a>
    </div>
  );
}
