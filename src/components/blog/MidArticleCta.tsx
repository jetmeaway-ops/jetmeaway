import Link from 'next/link';

/**
 * Mid-article CTA — gets injected by `app/blog/[slug]/page.tsx` between
 * the two halves of every blog post. The strategy + traffic playbook docs
 * (April 2026) both call for an in-body CTA, not just one at the end:
 * the in-body placement converts better because it catches users who
 * skim then bail, before they hit the bottom.
 *
 * Variants:
 *   - city present       → "Compare Hotels in <City>" → /hotels?city=<city>
 *   - cityForFlights set → "Find Cheapest Flights to <City>" → /flights?to=<code>
 *   - neither            → generic "Compare Hotels & Flights" → /hotels
 *
 * Posts opt in by adding `ctaCity: "Dubai"` (and optionally
 * `ctaFlightsTo: "DXB"`) to their frontmatter. Posts with no opt-in
 * still get the generic CTA — every post earns at least one bookable
 * exit point mid-body.
 */
export type MidArticleCtaProps = {
  city?: string | null;
  flightCode?: string | null;
};

export default function MidArticleCta({ city, flightCode }: MidArticleCtaProps) {
  const hasCity = !!city && city.trim().length > 0;
  const hasFlight = !!flightCode && flightCode.trim().length > 0;

  const headline = hasCity
    ? `Ready to compare ${city} prices?`
    : 'Ready to plan the trip?';
  const sub = hasCity
    ? `Live ${city} hotel rates from 15+ trusted providers — no booking fees, no markup.`
    : 'Live prices from 15+ trusted providers — no booking fees, no markup.';

  const primaryHref = hasCity
    ? `/hotels?city=${encodeURIComponent(city as string)}`
    : '/hotels';
  const primaryLabel = hasCity ? `Compare Hotels in ${city}` : 'Compare Hotels';

  const secondaryHref = hasFlight
    ? `/flights?to=${encodeURIComponent(flightCode as string)}`
    : '/flights';
  const secondaryLabel = hasFlight
    ? `Cheapest Flights to ${city ?? flightCode}`
    : 'Compare Flights';

  return (
    <aside
      // Block-level padding pulls the CTA off the running text so it reads
      // as a different surface, not part of the prose. Border-y keeps it
      // visually compact (no card-in-card heaviness mid-article).
      className="not-prose my-10 md:my-12 px-5 py-7 md:py-8 border-y border-[#E8ECF4] bg-gradient-to-br from-orange-50/60 via-amber-50/40 to-white rounded-2xl"
      aria-label="In-article booking CTA"
    >
      <p className="text-[.62rem] md:text-[.66rem] font-black uppercase tracking-[2.5px] text-orange-700 mb-1.5">
        Compare Now
      </p>
      <h3 className="font-poppins text-[1.15rem] md:text-[1.3rem] font-black text-[#1A1D2B] mb-1.5 leading-snug">
        {headline}
      </h3>
      <p className="text-[.85rem] md:text-[.9rem] text-[#5C6378] font-semibold leading-snug mb-4 max-w-[520px]">
        {sub}
      </p>
      <div className="flex flex-wrap gap-2.5">
        <Link
          href={primaryHref}
          className="inline-flex items-center gap-1.5 bg-orange-700 hover:bg-orange-800 text-white font-poppins font-black text-[.78rem] md:text-[.82rem] px-5 py-2.5 rounded-xl shadow-[0_6px_20px_-6px_rgba(194,65,12,0.5)] transition-all hover:-translate-y-0.5 active:translate-y-0"
        >
          {primaryLabel} →
        </Link>
        <Link
          href={secondaryHref}
          className="inline-flex items-center gap-1.5 bg-white hover:bg-blue-50 border border-[#E8ECF4] hover:border-[#0066FF] text-[#0066FF] font-poppins font-bold text-[.78rem] md:text-[.82rem] px-5 py-2.5 rounded-xl transition-all"
        >
          {secondaryLabel} →
        </Link>
      </div>
    </aside>
  );
}
