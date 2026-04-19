/**
 * Shared page-level JSON-LD helpers.
 *
 * Root layout already emits Organization + WebSite. This module adds
 * BreadcrumbList + (optional) FAQPage to category/policy/info pages so
 * every page gets rich-result real estate, not just /destinations/[city].
 *
 * Server-component safe — returns a fragment of <script type="application/ld+json">.
 */

const BASE = 'https://jetmeaway.co.uk';

export type Crumb = { name: string; path: string };
export type Faq = { q: string; a: string };

export function buildBreadcrumb(crumbs: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'JetMeAway', item: BASE },
      ...crumbs.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 2,
        name: c.name,
        item: `${BASE}${c.path}`,
      })),
    ],
  };
}

export function buildFaq(faqs: Faq[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

type Props = {
  crumbs: Crumb[];
  faqs?: Faq[];
};

export function PageSchema({ crumbs, faqs }: Props) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumb(crumbs)) }}
      />
      {faqs && faqs.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(buildFaq(faqs)) }}
        />
      )}
    </>
  );
}
