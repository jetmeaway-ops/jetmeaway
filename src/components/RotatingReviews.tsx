/**
 * Trustpilot rating strip — one clean line on the dark band under the hero.
 *
 * History:
 * - 2026-05-03 owner: "remove fake reviews please and add original reviews
 *   from trustpilot" → switched to the official Trustpilot carousel widget.
 * - 2026-07-02 audit: the widget's dark theme was invisible on our navy
 *   strip; the white-card fix looked bulky and the owner didn't like it.
 *   Owner's call: drop the embedded widget, show a compact honest rating
 *   line linking to the real Trustpilot profile (all reviews, good and
 *   bad). No iframe, no ~70KB third-party script on the homepage, always
 *   readable. This mirrors what the native app already showed.
 *
 * Rating below is our live Trustpilot aggregate — update it when the
 * score moves (uk.trustpilot.com/review/jetmeaway.co.uk).
 */

const TRUSTPILOT_SCORE = '4.1';

export default function RotatingReviews() {
  return (
    <section
      className="bg-gradient-to-b from-[#0a1628] to-[#0F1119] border-b border-white/10"
      aria-label="Customer reviews"
    >
      <div className="max-w-[1100px] mx-auto px-6 py-4">
        <a
          href="https://uk.trustpilot.com/review/jetmeaway.co.uk"
          target="_blank"
          rel="noopener nofollow"
          className="group flex items-center justify-center gap-2.5 no-underline"
          aria-label={`Rated ${TRUSTPILOT_SCORE} on Trustpilot — read all JetMeAway reviews, opens in new tab`}
        >
          <span className="inline-flex items-center gap-0.5" aria-hidden="true">
            {[0, 1, 2, 3].map(i => <span key={i} className="text-emerald-400 text-[.95rem]">★</span>)}
            <span className="text-emerald-400/40 text-[.95rem]">★</span>
          </span>
          <span className="font-poppins font-black text-white text-[.85rem]">{TRUSTPILOT_SCORE}</span>
          <span className="font-[var(--next-poppins)] text-white/60 text-[.72rem]">
            on Trustpilot
          </span>
          <span className="font-[var(--next-poppins)] text-white/40 group-hover:text-white/70 text-[.72rem] transition-colors">
            · Read reviews <i className="fa-solid fa-arrow-up-right-from-square text-[.55rem]" aria-hidden="true" />
          </span>
        </a>
      </div>
    </section>
  );
}
