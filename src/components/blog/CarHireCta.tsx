'use client';

import Link from 'next/link';

/**
 * Airport car-hire CTA for the `/blog/car-hire-*` money posts.
 *
 * WHY THIS EXISTS (2026-08-09). PR #84 re-homed the standalone
 * `/car-hire/[slug]` routes as blog posts. The old routes carried direct
 * EconomyBookings / Trip.com deep links; the MDX rewrite replaced them with a
 * bare `[text](/cars)` link, which lands the reader on an EMPTY search form —
 * location, pickup date and dropoff date all default to '' in
 * `src/app/cars/page.tsx`, and `ebHref` / `tripHref` stay '#' until every field
 * is filled in by hand. So the three money pages shipped earning nothing on a
 * click. This component restores the one-click path.
 *
 * HOW IT WORKS. `/cars` already reads `location` / `pickup` / `dropoff` from the
 * query string (cars/page.tsx, the URL-param effect) and auto-runs the search
 * once all three are present AND `findLocation(location)` matches
 * (cars/page.tsx, the autoSearched effect). So a link carrying those three
 * params lands the reader straight on populated results with the real
 * EconomyBookings and Trip.com affiliate buttons rendered.
 *
 * WHY WE POINT AT `/cars` AND NOT STRAIGHT AT THE PARTNER. Two reasons:
 *   1. Dates. A partner deep link needs a concrete date window. MDX is static,
 *      so a hardcoded date would rot into a past-dated search within weeks.
 *      Here the window is computed at render time, so it is always in future.
 *   2. Attribution + model. `/cars` wraps outbound clicks in `redirectUrl(...)`
 *      and shows both partners side by side. Jumping straight to one supplier
 *      would skip our own comparison step and the tracking wrapper.
 *
 * 🔴 `location` MUST match a `name` in the LOCATIONS table in
 * `src/app/cars/page.tsx` EXACTLY — `findLocation()` does a strict `===` on it.
 * A near-miss ("Alicante Airport" without the "(ALC)") silently disables the
 * auto-search and the reader is back on an empty form. Copy the string from
 * that table, never retype it.
 *
 * Usage in MDX:
 *   <CarHireCta location="Alicante Airport (ALC)" place="Alicante" />
 */

export type CarHireCtaProps = {
  /** Exact `name` from the LOCATIONS table in src/app/cars/page.tsx. */
  location: string;
  /** Human place name for the button copy, e.g. "Alicante". */
  place: string;
  /** Days ahead for the pickup date. Default 30. */
  leadDays?: number;
  /** Length of the hire window in days. Default 7. */
  hireDays?: number;
};

/** ISO yyyy-mm-dd for `days` from now, computed at render so it never goes stale. */
function isoInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export default function CarHireCta({
  location,
  place,
  leadDays = 30,
  hireDays = 7,
}: CarHireCtaProps) {
  const pickup = isoInDays(leadDays);
  const dropoff = isoInDays(leadDays + hireDays);

  // Times are what /cars defaults to; passing them keeps the prefilled form
  // identical to a hand-filled one so the auto-search fires cleanly.
  const href =
    `/cars?location=${encodeURIComponent(location)}` +
    `&pickup=${pickup}&dropoff=${dropoff}` +
    `&pickupTime=10:00&dropoffTime=10:00`;

  return (
    <aside
      className="not-prose my-10 md:my-12 px-5 py-7 md:py-8 rounded-2xl border border-[#E8ECF4] bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-white"
      aria-label={`Compare ${place} car hire prices`}
    >
      <p className="text-[.62rem] md:text-[.66rem] font-black uppercase tracking-[2.5px] text-emerald-700 mb-1.5">
        Compare Now
      </p>
      <h3 className="font-poppins text-[1.15rem] md:text-[1.3rem] font-black text-[#1A1D2B] mb-1.5 leading-snug">
        See live {place} car hire prices
      </h3>
      <p className="text-[.85rem] md:text-[.9rem] text-[#5C6378] font-semibold leading-snug mb-4 max-w-[560px]">
        EconomyBookings and Trip.com side by side. The price you see is the
        supplier&rsquo;s price — we are paid by them, so we never add a booking
        fee or a markup. Opens on a sample week; change the dates to yours.
      </p>
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-poppins font-black text-[.78rem] md:text-[.82rem] px-5 py-2.5 rounded-xl shadow-[0_6px_20px_-6px_rgba(4,120,87,0.5)] transition-all hover:-translate-y-0.5 active:translate-y-0"
      >
        Compare {place} car hire →
      </Link>
    </aside>
  );
}
