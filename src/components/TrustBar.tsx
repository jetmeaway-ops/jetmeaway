/**
 * Trust pills shown directly under the hero search form on /hotels and
 * /flights. Conversion-audit (2026-06-03) found that the homepage shows
 * Trustpilot rotating reviews above the fold but the category pages
 * didn't surface ANY trust signals until the user scrolled past the
 * search form — leaving first-time visitors who land on /hotels via
 * Google with nothing on screen to reassure them that JetMeAway is a
 * real, registered UK business before they enter a destination.
 *
 * Honest signals only:
 *   - UK-Registered → links to Companies House for verification (Co. 17140522)
 *   - Secure Payments → factual (Stripe for Duffel flights, LiteAPI for hotels)
 *   - Trustpilot link → routes to our real profile so the user can see all
 *     reviews (good and bad) rather than us cherry-picking a number to display
 *
 * Variant prop lets each category page pick a colour scheme that blends
 * with its hero gradient (dark navy for /flights, dark brown for /hotels)
 * — pills stay white-on-translucent so they read on either background.
 */

const PILLS = [
  {
    icon: '🇬🇧',
    label: 'UK-Registered · Co. 17140522',
    href: 'https://find-and-update.company-information.service.gov.uk/company/17140522',
    ariaLabel: 'JetMeAway is registered with UK Companies House — opens in new tab',
  },
  {
    icon: '🔒',
    label: 'Secure Payments',
    href: null,
    ariaLabel: 'Secure encrypted payments — JetMeAway never stores your card details',
  },
  {
    icon: '⭐',
    label: 'Read Trustpilot Reviews',
    href: 'https://uk.trustpilot.com/review/jetmeaway.co.uk',
    ariaLabel: 'Read JetMeAway reviews on Trustpilot — opens in new tab',
  },
] as const;

export default function TrustBar() {
  return (
    <div className="max-w-[860px] mx-auto mt-5 relative z-[1]">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {PILLS.map(p => {
          const baseClasses =
            'inline-flex items-center gap-1.5 backdrop-blur-md bg-white/5 border border-white/15 text-white/85 text-[.68rem] sm:text-[.72rem] font-bold px-3 py-1.5 rounded-full whitespace-nowrap';
          const interactiveClasses =
            ' hover:bg-white/10 hover:border-white/25 transition-all';

          if (p.href) {
            return (
              <a
                key={p.label}
                href={p.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={p.ariaLabel}
                className={baseClasses + interactiveClasses}
              >
                <span aria-hidden="true">{p.icon}</span>
                {p.label}
              </a>
            );
          }
          return (
            <span
              key={p.label}
              aria-label={p.ariaLabel}
              className={baseClasses}
            >
              <span aria-hidden="true">{p.icon}</span>
              {p.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
