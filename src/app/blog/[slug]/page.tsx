import { notFound } from 'next/navigation';
import { compileMDX } from 'next-mdx-remote/rsc';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MidArticleCta from '@/components/blog/MidArticleCta';
import DownloadPdfCard from '@/components/blog/DownloadPdfCard';
import { getAllPostSlugs, getPostBySlug, formatPostDate } from '@/lib/blog';
import type { Metadata } from 'next';

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
 * Statically pre-render every post at build time. New posts dropped into
 * content/posts/ need a fresh deploy to appear — which matches the
 * "Semi-Ongoing SEO" plan we agreed on.
 */
export function generateStaticParams() {
  return getAllPostSlugs().map(slug => ({ slug }));
}

/**
 * Per-post SEO metadata — drives <title>, meta description, and
 * OpenGraph previews for WhatsApp / Twitter shares.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return {
    title: `${post.title} | JetMeAway Blog`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `https://jetmeaway.co.uk/blog/${post.slug}`,
      type: 'article',
      publishedTime: post.date,
      images: [{ url: post.heroImage, width: 1600, height: 800, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [post.heroImage],
    },
  };
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
    <ul className="list-disc pl-6 mb-6 space-y-2 text-[1rem] md:text-[1.05rem] text-[#374151] font-medium" {...props} />
  ),
  ol: (props: any) => (
    <ol className="list-decimal pl-6 mb-6 space-y-2 text-[1rem] md:text-[1.05rem] text-[#374151] font-medium" {...props} />
  ),
  li: (props: any) => <li className="leading-[1.7]" {...props} />,
  strong: (props: any) => <strong className="font-bold text-[#1A1D2B]" {...props} />,
  em: (props: any) => <em className="italic" {...props} />,
  a: (props: any) => (
    <a className="text-[#0066FF] font-bold hover:underline underline-offset-2 transition-colors hover:text-[#0052CC]" {...props} />
  ),
  blockquote: (props: any) => (
    <blockquote
      className="border-l-4 border-[#0066FF] pl-5 py-2 my-8 bg-blue-50/50 rounded-r-lg italic text-[#5C6378] font-semibold"
      {...props}
    />
  ),
  hr: () => <hr className="my-12 border-[#E8ECF4]" />,
  img: (props: any) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img
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
};
/* eslint-enable @typescript-eslint/no-explicit-any */

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  // Compile the MDX body in two halves so we can drop the in-body CTA
  // between them. If the post has <2 H2 headings, splitMdxAtMiddleH2
  // returns second=null and we fall back to single-compile + CTA after.
  const { first: firstSource, second: secondSource } = splitMdxAtMiddleH2(post.content);
  const { content: firstContent } = await compileMDX({
    source: firstSource,
    components: mdxComponents,
    options: { parseFrontmatter: false },
  });
  const secondContent = secondSource
    ? (await compileMDX({
        source: secondSource,
        components: mdxComponents,
        options: { parseFrontmatter: false },
      })).content
    : null;

  // JSON-LD Article schema — gives Google the rich-result signal and
  // helps establish topical authority for the travel niche.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    image: post.heroImage,
    datePublished: post.date,
    // If a post has a liveAlert timestamp, treat it as the most recent
    // modification — this tells Google/LLMs the content was freshly updated.
    dateModified: post.liveAlert ? new Date().toISOString() : post.date,
    author: {
      '@type': 'Organization',
      name: post.author ?? 'JetMeAway',
      url: 'https://jetmeaway.co.uk',
    },
    publisher: {
      '@type': 'Organization',
      name: 'JetMeAway',
      logo: {
        '@type': 'ImageObject',
        url: 'https://jetmeaway.co.uk/jetmeaway-logo.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://jetmeaway.co.uk/blog/${post.slug}`,
    },
  };

  // Optional FAQPage JSON-LD — emitted only when the post declares
  // `faqs:` in its frontmatter. This is the richest-citation signal
  // for Perplexity / ChatGPT Search, and unlocks Google FAQ rich
  // results in the SERP.
  const faqJsonLd = post.faqs && post.faqs.length > 0
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: post.faqs.map(f => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      }
    : null;

  return (
    <>
      <Header />

      {/* JSON-LD structured data — Google reads this for rich snippets */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      <article className="pt-32 pb-16 bg-white">
        {/* Article header */}
        <div className="max-w-[760px] mx-auto px-5 text-center mb-10">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1 text-[.72rem] font-bold text-[#8E95A9] hover:text-[#0066FF] uppercase tracking-[1.5px] mb-6 transition-colors"
          >
            <i className="fa-solid fa-arrow-left text-[.65rem]" /> Back to Blog
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
                Live Alert · Updated {post.liveAlert}
              </span>
            )}
          </div>
          <h1 className="font-poppins text-[2.2rem] md:text-[3rem] font-black text-[#1A1D2B] leading-[1.1] tracking-tight mb-5">
            {post.title}
          </h1>
          <div className="flex items-center justify-center gap-3 text-[.82rem] text-[#8E95A9] font-semibold">
            <span>{formatPostDate(post.date)}</span>
            <span>•</span>
            <span>{post.readTime}</span>
            {post.author && (
              <>
                <span>•</span>
                <span>By {post.author}</span>
              </>
            )}
          </div>
        </div>

        {/* Hero image */}
        <div className="max-w-[960px] mx-auto px-5 mb-12">
          <img
            src={post.heroImage}
            alt={post.title}
            className="w-full h-[320px] md:h-[460px] object-cover rounded-3xl shadow-[0_24px_60px_-20px_rgba(0,102,255,0.2)]"
          />
        </div>

        {/* MDX body — split around an in-body CTA */}
        <div className="max-w-[760px] mx-auto px-5">
          {firstContent}
          <MidArticleCta city={post.ctaCity ?? null} flightCode={post.ctaFlightsTo ?? null} />
          {secondContent}
        </div>

        {/* End-of-post CTA */}
        <div className="max-w-[760px] mx-auto px-5 mt-16">
          <div className="bg-gradient-to-br from-[#EBF3FF] to-[#F8FAFC] border border-[#E8ECF4] rounded-3xl p-8 md:p-10 text-center">
            <h3 className="font-poppins text-[1.3rem] md:text-[1.5rem] font-black text-[#1A1D2B] mb-2">
              Plan Your 2026 Trip Now
            </h3>
            <p className="text-[.88rem] text-[#5C6378] font-semibold mb-6 max-w-[480px] mx-auto">
              Use the JetMeAway Scout to compare live prices across 15+ trusted providers. Zero booking fees.
            </p>
            <Link
              href="/hotels"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-[#0066FF] to-[#0052CC] text-white font-poppins font-black text-[.9rem] shadow-[0_8px_24px_rgba(0,102,255,0.28)] hover:shadow-[0_12px_32px_rgba(0,102,255,0.35)] hover:-translate-y-0.5 active:translate-y-0 transition-all"
            >
              Start Searching <i className="fa-solid fa-arrow-right text-[.8rem]" />
            </Link>
          </div>
        </div>
      </article>

      <Footer />
    </>
  );
}
