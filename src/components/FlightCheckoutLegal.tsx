'use client';

/**
 * Flight checkout legal block — rendered on the card-input step of BOTH the
 * Duffel checkout and the Kyte booking flow. Two parts:
 *
 *   1. Section 75 booking tip (informational badge).
 *   2. ATOL / agent-of-the-airline disclosure the customer must tick before
 *      the Pay button unlocks. Flight-only sales aren't ATOL-protected, so the
 *      consumer must be notified *before they book* — not before they search.
 *
 * The disclosure copy lives here and ONLY here: both checkout flows render
 * this component so the legal wording can never drift between them.
 */

type Props = {
  acknowledged: boolean;
  onAcknowledgedChange: (v: boolean) => void;
};

export default function FlightCheckoutLegal({ acknowledged, onAcknowledgedChange }: Props) {
  return (
    <div className="mb-4 space-y-3">
      {/* Section 75 booking tip — exact wording, do not paraphrase */}
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-4 text-[.78rem] font-semibold text-[#1A3A6B] leading-snug">
        <span>💡</span>
        <span>
          <strong className="font-black">Booking Tip:</strong> Pay with a UK credit card to
          secure full statutory financial protection up to £30,000 via Section 75 on flights
          over £100.
        </span>
      </div>

      {/* ATOL / agent disclosure — must be ticked to unlock payment */}
      <label className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={e => onAcknowledgedChange(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-[#0066FF] shrink-0"
        />
        <span className="text-[.78rem] font-semibold text-amber-900 leading-snug">
          I understand that this flight-only booking is sold by JetMeAway as an agent for the
          airline and is not protected under the ATOL scheme. Many airlines provide their own
          financial protection; I should check the airline&apos;s terms for details. JetMeAway
          recommends comprehensive travel insurance.
        </span>
      </label>
    </div>
  );
}
