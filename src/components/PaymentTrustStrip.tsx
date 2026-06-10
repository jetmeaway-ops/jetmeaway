/**
 * PaymentTrustStrip — the "Secure payments powered by Stripe" badge row.
 *
 * Rendered with Font Awesome brand icons (already loaded site-wide via CDN)
 * instead of an image so it stays crisp, themeable and zero-asset.
 *
 * `stripe` wording rule: only claim "powered by Stripe" where Stripe is the
 * actual processor (Duffel/Kyte flight checkouts, DOTW hotel checkout, and
 * the footer as a site-wide statement). The LiteAPI hotel payment step is
 * NOT Stripe — pass stripe={false} there so the strip stays truthful; a
 * false processor claim is ammunition in a card dispute.
 */

const CARD_METHODS = [
  { icon: 'fa-cc-visa', label: 'Visa', color: '#1A1F71' },
  { icon: 'fa-cc-mastercard', label: 'Mastercard', color: '#EB001B' },
  { icon: 'fa-cc-amex', label: 'American Express', color: '#2E77BC' },
  { icon: 'fa-cc-discover', label: 'Discover', color: '#F76E20' },
  { icon: 'fa-cc-jcb', label: 'JCB', color: '#0B4EA2' },
];

const WALLET_METHODS = [
  { icon: 'fa-cc-paypal', label: 'PayPal', color: '#003087' },
  { icon: 'fa-apple-pay', label: 'Apple Pay', color: '#000000' },
  { icon: 'fa-google-pay', label: 'Google Pay', color: '#5F6368' },
  { icon: 'fa-ideal', label: 'iDEAL', color: '#CC0066' },
];

export default function PaymentTrustStrip({
  variant = 'checkout',
  stripe = true,
}: {
  /** 'footer' = dark background, full method set, larger. 'checkout' = light card, compact. */
  variant?: 'checkout' | 'footer';
  /** False on the LiteAPI hotel payment step (not Stripe-processed). */
  stripe?: boolean;
}) {
  // Wallets are only advertised where Stripe (which provides them) runs.
  const methods = stripe ? [...CARD_METHODS, ...WALLET_METHODS] : CARD_METHODS;
  const heading = stripe
    ? 'Secure payments powered by Stripe'
    : 'Secure card payment — SSL encrypted';

  if (variant === 'footer') {
    return (
      <div className="mb-6">
        <div className="text-[.55rem] uppercase tracking-[2.5px] font-extrabold text-white/75 mb-2.5">
          {heading}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {methods.map(m => (
            <span
              key={m.label}
              title={m.label}
              aria-label={m.label}
              className="inline-flex items-center justify-center bg-white rounded-full px-3 py-1.5 shadow-sm"
            >
              <i className={`fa-brands ${m.icon} text-[1.15rem]`} style={{ color: m.color }} aria-hidden="true" />
            </span>
          ))}
          {stripe && (
            <span className="text-[.72rem] font-semibold text-white/75 ml-1.5">
              by <span className="font-poppins font-extrabold text-[#A5B4FC]">stripe</span>
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-[#F1F3F7]">
      <div className="text-[.55rem] uppercase tracking-[2px] font-extrabold text-[#8E95A9] mb-2 text-center">
        {heading}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {methods.map(m => (
          <span
            key={m.label}
            title={m.label}
            aria-label={m.label}
            className="inline-flex items-center justify-center bg-white border border-[#E8ECF4] rounded-full px-2.5 py-1"
          >
            <i className={`fa-brands ${m.icon} text-[1rem]`} style={{ color: m.color }} aria-hidden="true" />
          </span>
        ))}
        {stripe && (
          <span className="text-[.68rem] font-semibold text-[#8E95A9] ml-1">
            by <span className="font-poppins font-extrabold text-[#635BFF]">stripe</span>
          </span>
        )}
      </div>
      <p className="text-[.65rem] text-[#8E95A9] font-semibold text-center mt-2">
        🔒 JetMeAway never sees or stores your card number.
      </p>
    </div>
  );
}
