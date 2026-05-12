'use client';

/**
 * RyanairTermsCheckbox — mandatory T&C gate before Payment commit.
 *
 * Per Ryanair OTA certification spec (KH-Iframe-Ryanair.pdf, page 1):
 *   "Make sure you include Ryanair's T&Cs prior the payment commit:
 *    1. Ryanair's General Terms and Conditions of Carriage
 *    2. Website Terms
 *    3. Cookie Policy
 *    4. Privacy Statement
 *    5. Notice"
 *
 * The customer MUST be able to view each of these before they can
 * confirm the booking. A single checkbox acknowledging all five is
 * sufficient. Without this, certification fails.
 *
 * URLs: defaults are Ryanair's best-known public legal pages. They
 * should be confirmed with Ryanair via Kyte Service Desk during
 * certification (the exact /gb/en/legal/* paths can change).
 */

import { useState } from 'react';

export type RyanairLegalLinks = {
  termsOfCarriage: string;
  websiteTerms: string;
  cookiePolicy: string;
  privacyStatement: string;
  notice: string;
};

const DEFAULT_LINKS: RyanairLegalLinks = {
  termsOfCarriage:
    'https://www.ryanair.com/content/dam/ryanair/Generic/PDFs/Terms-of-Carriage.pdf',
  websiteTerms: 'https://www.ryanair.com/gb/en/useful-info/website-terms-of-use',
  cookiePolicy: 'https://www.ryanair.com/gb/en/useful-info/cookies-policy',
  privacyStatement: 'https://www.ryanair.com/gb/en/useful-info/privacy-policy',
  notice: 'https://www.ryanair.com/gb/en/useful-info/legal-notice',
};

type Props = {
  /** Override individual legal URLs. Useful once Ryanair confirms the
   *  exact certified paths during onboarding. */
  links?: Partial<RyanairLegalLinks>;
  /** Fired with `true` when the user ticks the box; `false` when they untick. */
  onAcceptChange?: (accepted: boolean) => void;
  /** Optional CTA label override. Default: "Continue to payment". */
  continueLabel?: string;
  /** Fired when the user clicks Continue (only enabled when accepted). */
  onContinue?: () => void;
  /** Disable the Continue button independently (e.g. while parent is loading). */
  busy?: boolean;
};

export default function RyanairTermsCheckbox({
  links,
  onAcceptChange,
  continueLabel = 'Continue to payment',
  onContinue,
  busy,
}: Props) {
  const [accepted, setAccepted] = useState(false);
  const resolved: RyanairLegalLinks = { ...DEFAULT_LINKS, ...(links || {}) };

  function toggle(next: boolean) {
    setAccepted(next);
    onAcceptChange?.(next);
  }

  return (
    <div className="bg-white border border-[#E8ECF4] rounded-2xl p-6 shadow-sm">
      <h3 className="text-base font-semibold text-[#1A1D2B]">
        Before you confirm — Ryanair terms
      </h3>
      <p className="text-sm text-[#5C6378] mt-1">
        Ryanair require you to acknowledge their booking terms before payment. Please review each
        link below.
      </p>
      <ul className="mt-4 space-y-2 text-sm">
        <li>
          <a
            href={resolved.termsOfCarriage}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#0066FF] hover:underline"
          >
            Ryanair General Terms and Conditions of Carriage
          </a>
        </li>
        <li>
          <a
            href={resolved.websiteTerms}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#0066FF] hover:underline"
          >
            Website Terms of Use
          </a>
        </li>
        <li>
          <a
            href={resolved.cookiePolicy}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#0066FF] hover:underline"
          >
            Cookie Policy
          </a>
        </li>
        <li>
          <a
            href={resolved.privacyStatement}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#0066FF] hover:underline"
          >
            Privacy Statement
          </a>
        </li>
        <li>
          <a
            href={resolved.notice}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#0066FF] hover:underline"
          >
            Legal Notice
          </a>
        </li>
      </ul>

      <label className="flex items-start gap-3 mt-5 cursor-pointer">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => toggle(e.target.checked)}
          className="mt-1 h-4 w-4 accent-[#0066FF]"
        />
        <span className="text-sm text-[#1A1D2B]">
          I have read and accept Ryanair&apos;s General Terms and Conditions of Carriage, Website
          Terms of Use, Cookie Policy, Privacy Statement, and Legal Notice.
        </span>
      </label>

      {onContinue && (
        <button
          onClick={onContinue}
          disabled={!accepted || busy}
          className="mt-5 w-full md:w-auto bg-[#0066FF] hover:bg-[#0052cc] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg px-5 py-2 text-sm"
        >
          {busy ? 'Working…' : continueLabel}
        </button>
      )}
    </div>
  );
}
