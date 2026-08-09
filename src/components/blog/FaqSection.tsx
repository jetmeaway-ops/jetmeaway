import type { BlogPost } from '@/lib/blog';

/**
 * Renders a post's `faqs:` frontmatter as visible, on-page Q&A.
 *
 * WHY THIS EXISTS (2026-08-09). Every post carries `faqs:` in frontmatter, and
 * until now `post.faqs` fed exactly one thing — the FAQPage JSON-LD in
 * `src/app/blog/[slug]/page.tsx`. There was no FAQ component anywhere in
 * `src/components`. So all 14,121 Q&A pairs across all 546 posts existed in the
 * page source only inside a `<script>` tag, invisible to every human who ever
 * loaded the page. Proven on production: /blog/best-hotels-rome-2026 shipped 28
 * questions in the markup and 0 on the page.
 *
 * Three costs, all of which this fixes:
 *   1. Google's structured-data guidelines require marked-up content to be
 *      visible to the user. FAQPage markup over hidden content is a stated
 *      violation and risks the rich result or a manual action.
 *   2. It is the most direct lever we have on click-through. AI retrieval pulls
 *      these pages constantly off the back of their question coverage while the
 *      human who lands sees none of it.
 *   3. Every blog batch has been written to a "15-20 unique Q&A" bar. That work
 *      was never once shown to a reader.
 *
 * WHY <details> AND NOT AN EXPANDED LIST. Posts run 3,000-7,000 words and carry
 * 8-41 questions. Dumping 41 open answers under the article buries the CTA and
 * the Read-next links. Native <details>/<summary> keeps every question scannable
 * — which is the part that earns the scroll — with the answer one click away.
 * Crucially it is plain HTML: the content is in the DOM, crawlable, and it works
 * before (and without) hydration, so it never depends on client JS.
 *
 * HEADING. 450 of 546 posts already end with their own "…questions answered" /
 * "FAQ" H2 in the MDX body, and this section renders directly after that body.
 * Emitting a second heading there would read as a duplicate, so the caller
 * passes `showHeading` only when the body has none. See `bodyHasFaqHeading()`.
 */

export type FaqSectionProps = {
  faqs: NonNullable<BlogPost['faqs']>;
  /** Render our own H2. Pass false when the MDX body already supplies one. */
  showHeading?: boolean;
};

/**
 * True when the post body already opens an FAQ section of its own, in which
 * case this component must not add a second heading.
 *
 * Deliberately matches the same shapes the corpus actually uses — "## FAQ",
 * "## Frequently asked questions", and the "## <topic>: your questions
 * answered" pattern the hotel/flight/car templates all end on.
 */
export function bodyHasFaqHeading(content: string): boolean {
  return /^##\s.*(questions answered|FAQs?\b|Frequently asked)/im.test(content);
}

/** Lowercase, strip punctuation, collapse whitespace — for text comparison. */
function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The FAQs whose question text is NOT already written out in the post body.
 *
 * 🔴 WHY (2026-08-09, same day as the original fix). The first version of this
 * component rendered EVERY faq and only guarded against a duplicate *heading*.
 * That was wrong: on most posts the Q&A had already been written into the body
 * as prose, so shipping the block printed the same question twice. Measured
 * across the corpus after that deploy: **10,183 of 14,095 questions (72%) were
 * duplicated on 400 of 546 posts** — Tokyo 25/26, Vienna 11/11, Baku 25/26.
 * Only 145 posts genuinely had no on-page copy.
 *
 * A question is treated as already-present if its normalised text appears
 * anywhere in the normalised body. Substring matching on the question is
 * deliberate: the body renders these as headings or bold lead-ins, so the
 * question survives verbatim even when the surrounding prose differs.
 */
export function faqsMissingFromBody(
  faqs: NonNullable<BlogPost['faqs']>,
  content: string,
): NonNullable<BlogPost['faqs']> {
  const body = normalise(content);
  return faqs.filter((f) => !body.includes(normalise(f.q)));
}

/**
 * Below this, a rendered block reads as a stub rather than an FAQ section —
 * one lonely question under a "Frequently asked questions" heading looks
 * broken. Posts under the floor render nothing; their Q&A is already in the
 * body and still ships in the FAQPage JSON-LD either way.
 */
export const MIN_FAQS_TO_RENDER = 3;

export default function FaqSection({ faqs, showHeading = true }: FaqSectionProps) {
  if (!faqs || faqs.length === 0) return null;

  return (
    <section
      // `faq` is the anchor 400 posts already link to from their in-body
      // "Jump to:" nav. Those links pointed at an <a id="faq"></a> marker that
      // sat above nothing; now they land on the actual questions.
      id="faq-answers"
      className="max-w-[760px] mx-auto px-5 mt-4"
      aria-label="Frequently asked questions"
    >
      {showHeading && (
        <h2 className="font-poppins text-[1.4rem] md:text-[1.7rem] font-black text-[#1A1D2B] mt-12 mb-5 leading-tight">
          Frequently asked questions
        </h2>
      )}

      <div className="divide-y divide-[#E8ECF4] border-y border-[#E8ECF4]">
        {faqs.map((faq, i) => (
          // 🔴 `open` by default, deliberately. Google's snippet documentation
          // (updated 2026-04-20) says content hidden behind an expandable
          // section is not eligible for the "Read more" deep links that jump a
          // searcher straight to an answer. With FAQ rich results switched off
          // on 7 May 2026, ordinary body text is the ONLY route left, so
          // nothing here may start collapsed. The disclosure stays so a reader
          // can still fold a long list away — it just starts open.
          <details key={i} open className="group py-1">
            <summary
              // list-none + the custom chevron below: Safari and Chrome render
              // the native marker differently and neither matches the design.
              className="list-none cursor-pointer flex items-start justify-between gap-4 py-4 font-poppins font-bold text-[.95rem] md:text-[1rem] text-[#1A1D2B] hover:text-[#0066FF] transition-colors"
            >
              <span>{faq.q}</span>
              <span
                aria-hidden="true"
                className="shrink-0 mt-0.5 text-[#8E95A9] transition-transform group-open:rotate-180"
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M5 7.5L10 12.5L15 7.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </summary>
            <div className="pb-5 -mt-1 text-[.9rem] md:text-[.95rem] leading-relaxed text-[#5C6378] font-medium">
              {faq.a}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
