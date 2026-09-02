import { compileMDX } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import MidArticleCta from '@/components/blog/MidArticleCta';
import DownloadPdfCard from '@/components/blog/DownloadPdfCard';
import HotelPhoto from '@/components/blog/HotelPhoto';
import CheapestMonthsTable from '@/components/blog/CheapestMonthsTable';
import BestValueTable from '@/components/blog/BestValueTable';
import CarHireCta from '@/components/blog/CarHireCta';
import RelatedPosts from '@/components/blog/RelatedPosts';
import FaqSection, {
  bodyHasFaqHeading,
  faqsMissingFromBody,
  MIN_FAQS_TO_RENDER,
} from '@/components/blog/FaqSection';
import CityBlogBackdrop from '@/components/CityBlogBackdrop';
import { formatPostDate, type BlogPost, type PostLocale } from '@/lib/blog';
import { RTL_LOCALES } from '@/i18n/config';

/**
 * Shared article renderer for every locale of a blog post.
 *
 * The English route (/blog/<slug>) and each translated route
 * (/de/blog/<slug>) are thin wrappers around this component: they resolve
 * the post for their locale and hand it over. Keeping one renderer means
 * a change to article layout, JSON-LD or the MDX component map lands on
 * every language at once instead of drifting apart.
 *
 * Only three things vary by locale: the visible chrome strings, the date
 * format, and the URL prefix used for canonical/JSON-LD/internal links.
 */

const BASE_URL = 'https://jetmeaway.co.uk';

/** Path prefix for a locale's blog. English stays at the bare /blog root. */
export function blogBasePath(locale: PostLocale): string {
  return locale === 'en' ? '/blog' : `/${locale}/blog`;
}

/** BCP-47 tag emitted as JSON-LD `inLanguage`. */
const IN_LANGUAGE: Record<PostLocale, string> = {
  en: 'en-GB',
  de: 'de-DE',
  es: 'es',
  it: 'it-IT',
  ar: 'ar',
};

/** Visible chrome around the article body, per locale. */
const STRINGS: Record<PostLocale, {
  backToBlog: string;
  liveAlert: string;
  by: string;
  breadcrumbHome: string;
  breadcrumbBlog: string;
  ctaHeading: string;
  ctaBody: string;
  ctaButton: string;
}> = {
  en: {
    backToBlog: 'Back to Blog',
    liveAlert: 'Live Alert · Updated',
    by: 'By',
    breadcrumbHome: 'Home',
    breadcrumbBlog: 'Blog',
    ctaHeading: 'Plan Your 2026 Trip Now',
    ctaBody:
      'Use the JetMeAway Scout to compare live prices across 15+ trusted providers. Zero booking fees.',
    ctaButton: 'Start Searching',
  },
  de: {
    backToBlog: 'Zurück zum Blog',
    liveAlert: 'Live-Update · Aktualisiert',
    by: 'Von',
    breadcrumbHome: 'Startseite',
    breadcrumbBlog: 'Blog',
    ctaHeading: 'Planen Sie jetzt Ihre Reise 2026',
    ctaBody:
      'Vergleichen Sie mit dem JetMeAway Scout Live-Preise von über 15 geprüften Anbietern. Keine Buchungsgebühren.',
    ctaButton: 'Jetzt suchen',
  },
  // Spanish uses informal "tú" throughout, matching src/messages/es.json and
  // the translated corpus. German above is formal Sie — do not copy that here.
  es: {
    backToBlog: 'Volver al blog',
    liveAlert: 'Alerta en vivo · Actualizado',
    by: 'Por',
    breadcrumbHome: 'Inicio',
    breadcrumbBlog: 'Blog',
    ctaHeading: 'Planea tu viaje de 2026 ahora',
    ctaBody:
      'Usa el JetMeAway Scout para comparar precios en vivo de más de 15 proveedores de confianza. Sin comisiones de reserva.',
    ctaButton: 'Empieza a buscar',
  },
  // Italian uses informal "tu" throughout, matching src/messages/it.json and
  // the translated corpus. German above is formal Sie — do not copy that here.
  it: {
    backToBlog: 'Torna al blog',
    liveAlert: 'Avviso in tempo reale · Aggiornato',
    by: 'Di',
    breadcrumbHome: 'Home',
    breadcrumbBlog: 'Blog',
    ctaHeading: 'Pianifica ora il tuo viaggio del 2026',
    ctaBody:
      'Usa lo JetMeAway Scout per confrontare i prezzi in tempo reale di oltre 15 fornitori affidabili. Nessuna commissione di prenotazione.',
    ctaButton: 'Inizia a cercare',
  },
  // Arabic — Modern Standard Arabic, matching src/messages/ar.json and the
  // translated corpus. This is the first RTL locale; the article sets
  // dir="rtl" below and the MDX components use logical (start/end) spacing so
  // lists, quotes and tables flow correctly right-to-left.
  ar: {
    backToBlog: 'العودة إلى المدونة',
    liveAlert: 'تنبيه مباشر · تم التحديث',
    by: 'بواسطة',
    breadcrumbHome: 'الرئيسية',
    breadcrumbBlog: 'المدونة',
    ctaHeading: 'خطّط لرحلتك في 2026 الآن',
    ctaBody:
      'استخدم JetMeAway Scout لمقارنة الأسعار المباشرة عبر أكثر من 15 مزوّدًا موثوقًا. بدون رسوم حجز.',
    ctaButton: 'ابدأ البحث',
  },
};

/**
 * Split MDX source at roughly the middle H2 so we can inject the
 * MidArticleCta between two halves. If a post has fewer than 2 H2
 * headings the CTA falls through to "after the entire body" — still
 * better than nothing on a thin post. We split on the H2 marker
 * (newline + ## + space) and re-prefix the second half with `## `.
 */
function splitMdxAtMiddleH2(source: string): { first: string; second: string | null } {
  const parts = source.split(/\n##\s/);
  if (parts.length < 3) return { first: source, second: null };
  // parts[0] is everything before the first H2, parts[1..] are sections.
  const sectionCount = parts.length - 1;
  const middle = Math.max(1, Math.floor(sectionCount / 2));
  const before = [parts[0], ...parts.slice(1, middle + 1).map((s, i) => (i === 0 ? `\n## ${s}` : `## ${s}`))].join('');
  const after = parts.slice(middle + 1).map(s => `## ${s}`).join('\n');
  return { first: before, second: after || null };
}

/**
 * Styled React components that replace default HTML elements inside the
 * compiled MDX output. This gives us full Tailwind control over article
 * typography without needing @tailwindcss/typography.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
const mdxComponents = {
  h1: (props: any) => (
    <h1 className="font-poppins text-[2rem] md:text-[2.3rem] font-black text-[#1A1D2B] mt-12 mb-4 leading-tight" {...props} />
  ),
  h2: (props: any) => (
    <h2 className="font-poppins text-[1.5rem] md:text-[1.75rem] font-black text-[#1A1D2B] mt-12 mb-4 leading-tight" {...props} />
  ),
  h3: (props: any) => (
    <h3 className="font-poppins text-[1.15rem] md:text-[1.3rem] font-bold text-[#1A1D2B] mt-8 mb-2 leading-snug" {...props} />
  ),
  p: (props: any) => (
    <p className="text-[1rem] md:text-[1.05rem] text-[#374151] leading-[1.75] mb-5 font-medium" {...props} />
  ),
  ul: (props: any) => (
    <ul className="list-disc ps-6 mb-6 space-y-2 text-[1rem] md:text-[1.05rem] text-[#374151] font-medium" {...props} />
  ),
  ol: (props: any) => (
    <ol className="list-decimal ps-6 mb-6 space-y-2 text-[1rem] md:text-[1.05rem] text-[#374151] font-medium" {...props} />
  ),
  li: (props: any) => <li className="leading-[1.7]" {...props} />,
  strong: (props: any) => <strong className="font-bold text-[#1A1D2B]" {...props} />,
  em: (props: any) => <em className="italic" {...props} />,
  a: (props: any) => (
    <a className="text-[#0066FF] font-bold hover:underline underline-offset-2 transition-colors hover:text-[#0052CC]" {...props} />
  ),
  blockquote: (props: any) => (
    <blockquote
      className="border-s-4 border-[#0066FF] ps-5 py-2 my-8 bg-blue-50/50 rounded-e-lg italic text-[#5C6378] font-semibold"
      {...props}
    />
  ),
  hr: () => <hr className="my-12 border-[#E8ECF4]" />,
  // GFM tables (via remark-gfm) — e.g. the "At a glance" hotel comparison
  // matrix at the top of every hotel post. Wrapped for horizontal scroll on
  // mobile so wide tables never break the layout.
  table: (props: any) => (
    <div className="my-8 overflow-x-auto rounded-2xl border border-[#E8ECF4] shadow-[0_12px_40px_-12px_rgba(0,102,255,0.10)]">
      <table className="w-full border-collapse text-start text-[0.92rem] md:text-[0.98rem]" {...props} />
    </div>
  ),
  thead: (props: any) => <thead className="bg-[#F1F5FF]" {...props} />,
  th: (props: any) => (
    <th className="px-4 py-3 font-poppins font-bold text-[#1A1D2B] border-b border-[#E8ECF4] whitespace-nowrap" {...props} />
  ),
  td: (props: any) => (
    <td className="px-4 py-3 align-top text-[#374151] border-b border-[#EEF1F6] font-medium" {...props} />
  ),
  tr: (props: any) => <tr className="even:bg-[#FAFBFD]" {...props} />,
  img: (props: any) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img
      // Hotel-guide posts embed 45-50 full-size supplier photos (110-650KB
      // each, ~15MB total, no resize API). Lazy-load so only the photos in
      // view download — the rest stream in as the reader scrolls.
      loading="lazy"
      decoding="async"
      className="w-full rounded-2xl shadow-[0_12px_40px_-12px_rgba(0,102,255,0.18)] my-8"
      {...props}
    />
  ),
  code: (props: any) => (
    <code className="bg-[#F1F3F7] text-[#0066FF] px-1.5 py-0.5 rounded text-[.92em] font-mono" {...props} />
  ),
  // Lead-magnet PDF download card — usable as `<DownloadPdfCard slug="..." city="..." />`
  // anywhere inside MDX. See src/components/blog/DownloadPdfCard.tsx.
  DownloadPdfCard,
  // Per-hotel hero image pulled from Google Places — usable inside any
  // hotel city blog post as `<HotelPhoto hotelName="…" city="…" />`.
  HotelPhoto,
  // Original-data fare table for the "Cheapest Months to Fly" flagship post.
  CheapestMonthsTable,
  // Ranked fare table for the "Cheapest UK destinations right now" post.
  BestValueTable,
  // Prefilled car-hire search CTA for the /blog/car-hire-* money posts —
  // `<CarHireCta location="Alicante Airport (ALC)" place="Alicante" />`.
  // `location` must match a LOCATIONS name in src/app/cars/page.tsx exactly.
  CarHireCta,
};
/* eslint-enable @typescript-eslint/no-explicit-any */

export default async function BlogPostArticle({
  post,
  relatedPosts,
  locale = 'en',
}: {
  post: BlogPost;
  relatedPosts: BlogPost[];
  locale?: PostLocale;
}) {
  const t = STRINGS[locale] ?? STRINGS.en;
  const basePath = blogBasePath(locale);
  const postUrl = `${BASE_URL}${basePath}/${post.slug}`;
  // First RTL locale (Arabic). dir flows the whole article right-to-left;
  // the directional back/forward arrows below are mirrored to match.
  const isRtl = RTL_LOCALES.has(locale);
  const backArrow = isRtl ? 'fa-arrow-right' : 'fa-arrow-left';
  const fwdArrow = isRtl ? 'fa-arrow-left' : 'fa-arrow-right';

  // Compile the MDX body in two halves so we can drop the in-body CTA
  // between them. If the post has <2 H2 headings, splitMdxAtMiddleH2
  // returns second=null and we fall back to single-compile + CTA after.
  const { first: firstSource, second: secondSource } = splitMdxAtMiddleH2(post.content);
  const { content: firstContent } = await compileMDX({
    source: firstSource,
    components: mdxComponents,
    options: { parseFrontmatter: false, mdxOptions: { remarkPlugins: [remarkGfm] } },
  });
  const secondContent = secondSource
    ? (await compileMDX({
        source: secondSource,
        components: mdxComponents,
        options: { parseFrontmatter: false, mdxOptions: { remarkPlugins: [remarkGfm] } },
      })).content
    : null;

  // JSON-LD BlogPosting schema — more specific than Article (its parent
  // type), which Google's structured-data documentation specifically
  // recommends for blog content. Helps establish topical authority for
  // the travel niche and unlocks the article rich result.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image: post.heroImage,
    inLanguage: IN_LANGUAGE[locale] ?? IN_LANGUAGE.en,
    datePublished: post.date,
    // dateModified preference (Google freshness signal):
    //   1. liveAlert → now (real-time updated post)
    //   2. dateModified frontmatter field → that date (substantive re-edit)
    //   3. fall through to publish date
    dateModified: post.liveAlert
      ? new Date().toISOString()
      : (post.dateModified || post.date),
    author: {
      '@type': 'Organization',
      name: post.author ?? 'JetMeAway',
      url: BASE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: 'JetMeAway',
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/jetmeaway-logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': postUrl,
    },
    // articleSection signals the topical category to crawlers (per Google's
    // BlogPosting docs) and gives the page a stronger semantic anchor than
    // the @type alone. Mirrors the visible category pill.
    articleSection: post.category,
  };

  // JSON-LD BreadcrumbList — Home → Blog → Post. Google uses this to
  // render the breadcrumb trail in the SERP result instead of the bare
  // URL, and on-page.ai's 2026-06-04 audit flagged it as missing on
  // every blog post (top-3 competitors all carry it). Single edit here
  // gives every post the schema. The ListItem children are first-class
  // items per https://schema.org/BreadcrumbList — they don't need their
  // own JSON-LD blocks. Position is 1-indexed.
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: t.breadcrumbHome,
        item: locale === 'en' ? BASE_URL : `${BASE_URL}/${locale}`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: t.breadcrumbBlog,
        item: `${BASE_URL}${basePath}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: post.title,
        item: postUrl,
      },
    ],
  };

  // Optional FAQPage JSON-LD — emitted only when the post declares
  // `faqs:` in its frontmatter. This is the richest-citation signal
  // for Perplexity / ChatGPT Search, and unlocks Google FAQ rich
  // results in the SERP.
  const faqJsonLd = post.faqs && post.faqs.length > 0
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        inLanguage: IN_LANGUAGE[locale] ?? IN_LANGUAGE.en,
        mainEntity: post.faqs.map(f => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      }
    : null;

  return (
    <>
      {/* City photo slideshow behind the article — cross-fades through this
          destination's images. The article below is a frosted-white sheet so
          the imagery glows through while the text stays readable. */}
      <CityBlogBackdrop city={post.ctaCity ?? ''} seed={post.heroImage} />

      {/* JSON-LD structured data — Google reads this for rich snippets */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      <article dir={isRtl ? 'rtl' : undefined} className="pt-32 pb-16 px-4 sm:px-5">
        {/* White "paper" sheet so the long-form text stays fully readable while
            the clear city slideshow shows boldly in the margins around it. */}
        <div className="relative z-[1] mx-auto max-w-[900px] bg-white rounded-[28px] shadow-[0_40px_90px_-35px_rgba(0,0,0,0.55)] pt-10 sm:pt-12 pb-14">
        {/* Article header */}
        <div className="max-w-[760px] mx-auto px-5 text-center mb-10">
          <Link
            href={basePath}
            className="inline-flex items-center gap-1 text-[.72rem] font-bold text-[#8E95A9] hover:text-[#0066FF] uppercase tracking-[1.5px] mb-6 transition-colors"
          >
            <i className={`fa-solid ${backArrow} text-[.65rem]`} /> {t.backToBlog}
          </Link>
          <div className="flex items-center justify-center flex-wrap gap-2 mb-4">
            <span className="inline-block bg-blue-50 text-[#0066FF] text-[.65rem] font-black uppercase tracking-[2.5px] px-3.5 py-1.5 rounded-full">
              {post.category}
            </span>
            {post.liveAlert && (
              <span className="inline-flex items-center gap-1.5 bg-red-50 text-[#D9281B] text-[.65rem] font-black uppercase tracking-[2px] px-3.5 py-1.5 rounded-full border border-red-200">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-600" />
                </span>
                {t.liveAlert} {post.liveAlert}
              </span>
            )}
          </div>
          <h1 className="font-poppins text-[2.2rem] md:text-[3rem] font-black text-[#1A1D2B] leading-[1.1] tracking-tight mb-5">
            {post.title}
          </h1>
          <div className="flex items-center justify-center gap-3 text-[.82rem] text-[#8E95A9] font-semibold">
            <span>{formatPostDate(post.date, locale)}</span>
            <span>•</span>
            <span>{post.readTime}</span>
            {post.author && (
              <>
                <span>•</span>
                <span>{t.by} {post.author}</span>
              </>
            )}
          </div>
        </div>

        {/* Hero image */}
        <div className="max-w-[960px] mx-auto px-5 mb-12">
          <img
            src={post.heroImage}
            alt={post.title}
            // LCP element — load it first, ahead of the 45-50 lazy body photos.
            fetchPriority="high"
            decoding="async"
            className="w-full h-[320px] md:h-[460px] object-cover rounded-3xl shadow-[0_24px_60px_-20px_rgba(0,102,255,0.2)]"
          />
        </div>

        {/* MDX body — split around an in-body CTA */}
        <div className="max-w-[760px] mx-auto px-5">
          {firstContent}
          <MidArticleCta city={post.ctaCity ?? null} flightCode={post.ctaFlightsTo ?? null} />
          {secondContent}
        </div>

        {/* The post's own Q&A, rendered for humans — but ONLY the answers that
            are not already written into the body. `post.faqs` used to feed the
            FAQPage JSON-LD and nothing else, so every answer lived inside a
            <script> tag; rendering them fixed that, but rendering ALL of them
            printed 72% of the corpus twice (400 of 546 posts). faqsMissingFromBody
            keeps just the genuinely-unseen ones — about 145 posts' worth. */}
        {(() => {
          if (!post.faqs || post.faqs.length === 0) return null;
          const unseen = faqsMissingFromBody(post.faqs, post.content);
          if (unseen.length < MIN_FAQS_TO_RENDER) return null;
          return <FaqSection faqs={unseen} showHeading={!bodyHasFaqHeading(post.content)} />;
        })()}

        {/* "Read next" — contextual internal links to sibling articles. */}
        <RelatedPosts posts={relatedPosts} locale={locale} />

        {/* End-of-post CTA */}
        <div className="max-w-[760px] mx-auto px-5 mt-16">
          <div className="bg-gradient-to-br from-[#EBF3FF] to-[#F8FAFC] border border-[#E8ECF4] rounded-3xl p-8 md:p-10 text-center">
            <h3 className="font-poppins text-[1.3rem] md:text-[1.5rem] font-black text-[#1A1D2B] mb-2">
              {t.ctaHeading}
            </h3>
            <p className="text-[.88rem] text-[#5C6378] font-semibold mb-6 max-w-[480px] mx-auto">
              {t.ctaBody}
            </p>
            <Link
              href="/hotels"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-[#0066FF] to-[#0052CC] text-white font-poppins font-black text-[.9rem] shadow-[0_8px_24px_rgba(0,102,255,0.28)] hover:shadow-[0_12px_32px_rgba(0,102,255,0.35)] hover:-translate-y-0.5 active:translate-y-0 transition-all"
            >
              {t.ctaButton} <i className={`fa-solid ${fwdArrow} text-[.8rem]`} />
            </Link>
          </div>
        </div>
        </div>
      </article>
    </>
  );
}
