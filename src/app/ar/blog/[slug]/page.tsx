import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BlogPostArticle from '@/components/blog/BlogPostArticle';
import {
  getAllPosts,
  getAllPostSlugs,
  getPostBySlug,
  blogAlternates,
  localiseInternalBlogLinks,
  postUrl,
} from '@/lib/blog';
import { pickRelatedPosts } from '@/lib/relatedPosts';
import type { Metadata } from 'next';

/**
 * Arabic blog post route — /ar/blog/<slug>.
 *
 * Path-based rather than header-based on purpose: the sitewide UI
 * translation (src/proxy.ts + next-intl) swaps interface strings on the
 * same URL, which is fine for chrome but useless for SEO, because Google
 * only ever indexes one version of a URL. Articles need their own
 * addressable URL plus an hreflang pair to be indexed as Arabic content.
 *
 * The slug is shared with the English original — it is the URL and is
 * never translated — so /blog/<slug> and /ar/blog/<slug> are the same
 * article in two languages, which is exactly what hreflang expects.
 *
 * First RTL locale: BlogPostArticle sets dir="rtl" for 'ar', so the
 * shared renderer flows right-to-left without a separate template.
 */

/** Pre-render every translated post at build time, same as English. */
export function generateStaticParams() {
  return getAllPostSlugs('ar').map(slug => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug, 'ar');
  if (!post) return {};

  const metaDesc =
    post.excerpt.length > 155
      ? post.excerpt.slice(0, 152).replace(/\s\S*$/, '') + '…'
      : post.excerpt;

  return {
    title: `${post.title} | JetMeAway`,
    description: metaDesc,
    // Canonical points at this Arabic URL (not the English one) so the
    // translation is indexed in its own right; `languages` carries the
    // hreflang set back to English plus the other locales and x-default.
    alternates: blogAlternates(post.slug, 'ar'),
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: postUrl(post.slug, 'ar'),
      type: 'article',
      locale: 'ar_AR',
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

export default async function ArabicBlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug, 'ar');
  if (!post) notFound();

  // Keep the reader inside Arabic: sibling-post links in the body point
  // at /ar/blog/… wherever that translation exists.
  const localisedPost = {
    ...post,
    content: localiseInternalBlogLinks(post.content, 'ar'),
  };

  // Related posts come from the Arabic corpus so the "اقرأ التالي" cards
  // are Arabic too.
  const relatedPosts = pickRelatedPosts(post, getAllPosts('ar'));

  return (
    <>
      <Header />
      <BlogPostArticle post={localisedPost} relatedPosts={relatedPosts} locale="ar" />
      <Footer />
    </>
  );
}
