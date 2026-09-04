import Link from 'next/link';
import FaqSection from '@/components/blog/FaqSection';
import type { FAQ } from '@/lib/blog';

/**
 * Server-rendered SEO content block for the commercial category pages
 * (/hotels, /flights, /packages, /explore).
 *
 * WHY THIS EXISTS (2026-09-04). Screaming Frog + the GSC review flagged these
 * four as "thin": the crawlable body was a hero headline plus a client-lazy
 * search widget — ~90-112 words. Google can't establish topical relevance for
 * non-brand commercial queries ("compare hotel prices", "cheap flights uk")
 * from a search box. This block adds genuine, static, crawlable content below
 * the widget: a short intro in the site's own honest voice, a row of internal
 * links (which also feeds crawl paths to the deeper pages), and the page's
 * existing FAQ set — which until now only ever reached the FAQPage JSON-LD,
 * never the reader (same hidden-content problem `blog/FaqSection` fixed for
 * posts). It reuses that component so the Q&A renders identically site-wide.
 *
 * All copy is English: it matches the existing English FAQ constants in
 * page-faqs.ts, and the KPI is UK/English organic clicks. The hero above stays
 * fully translated via next-intl; this supplementary block does not.
 *
 * Pure server component — no client JS, in the SSR HTML, crawlable at rest.
 */

export type SeoLink = { href: string; label: string };

export type PageSeoContentProps = {
  heading: string;
  /** One or more short paragraphs of intro copy. */
  intro: string[];
  linksHeading: string;
  links: SeoLink[];
  faqs: FAQ[];
};

export default function PageSeoContent({
  heading,
  intro,
  linksHeading,
  links,
  faqs,
}: PageSeoContentProps) {
  return (
    <section className="bg-[#F8FAFC] border-t border-[#E8ECF4]">
      <div className="max-w-[760px] mx-auto px-5 pt-14 pb-2">
        <h2 className="font-poppins text-[1.5rem] md:text-[1.9rem] font-black text-[#1A1D2B] leading-tight tracking-tight mb-4 text-balance">
          {heading}
        </h2>
        <div className="space-y-3">
          {intro.map((p, i) => (
            <p key={i} className="text-[.95rem] md:text-[1rem] leading-relaxed text-[#5C6378] font-medium">
              {p}
            </p>
          ))}
        </div>

        <h3 className="font-poppins text-[.7rem] font-black uppercase tracking-[2px] text-[#8E95A9] mt-9 mb-3.5">
          {linksHeading}
        </h3>
        <nav aria-label={linksHeading} className="flex flex-wrap gap-2.5">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="inline-flex items-center rounded-full border border-[#E3E9F4] bg-white px-3.5 py-1.5 text-[.82rem] font-semibold text-[#1A1D2B] transition-colors hover:border-[#0066FF] hover:text-[#0066FF]"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>

      <FaqSection faqs={faqs} />
      <div className="h-14" aria-hidden="true" />
    </section>
  );
}
