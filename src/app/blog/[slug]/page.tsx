import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BlogPostArticle from '@/components/blog/BlogPostArticle';
import { getAllPosts, getAllPostSlugs, getPostBySlug, blogAlternates, postUrl } from '@/lib/blog';
import { pickRelatedPosts } from '@/lib/relatedPosts';
import type { Metadata } from 'next';

/**
 * English blog post route.
 *
 * The article itself is rendered by the shared <BlogPostArticle>, which
 * every locale reuses — see src/components/blog/BlogPostArticle.tsx. This
 * file only resolves the post, the related-post picks, and the SEO
 * metadata for the English URL.
 */

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
  // Trim the excerpt for the meta description — Google truncates at
  // ~155-160 chars in SERPs, so we slice at 152 and back up to the last
  // word boundary before adding an ellipsis. Frontmatter excerpts often
  // run 200-300 chars (used as the long-form summary on /blog index
  // cards), but only the truncated form ships in <meta description>.
  const metaDesc =
    post.excerpt.length > 155
      ? post.excerpt.slice(0, 152).replace(/\s\S*$/, '') + '…'
      : post.excerpt;

  return {
    // Title suffix shortened from " | JetMeAway Blog" (17 chars) to
    // " | JetMeAway" (12 chars) per the 2026-05-09 daily SEO audit. 55
    // of 58 posts had titles >65 chars after the longer suffix; this
    // alone reclaims ~5 chars across every post.
    title: `${post.title} | JetMeAway`,
    description: metaDesc,
    // Canonical URL — tells Google + AI crawlers that any parameterised
    // variant of this post (?utm_source=…, ?ref=…, trailing slash, etc.)
    // should consolidate ranking signals into the bare /blog/<slug> URL.
    // Without this, GSC sees each parameter combo as a separate page and
    // splits PageRank across all 58 blog posts. From the 2026-05-09 daily
    // SEO audit (HIGH-impact, one-line fix, largest SEO surface area).
    //
    // `languages` adds the hreflang cluster pairing this post with its
    // translations (only those that exist on disk) plus x-default. Without
    // it Google reads /blog/<slug> and /de/blog/<slug> as duplicates.
    alternates: blogAlternates(post.slug, 'en'),
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: postUrl(post.slug, 'en'),
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

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const relatedPosts = pickRelatedPosts(post, getAllPosts());

  return (
    <>
      <Header />
      <BlogPostArticle post={post} relatedPosts={relatedPosts} locale="en" />
      <Footer />
    </>
  );
}
