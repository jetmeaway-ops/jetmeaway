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
 * Italian blog post route — /it/blog/<slug>.
 *
 * Path-based rather than header-based on purpose: the sitewide UI
 * translation (src/proxy.ts + next-intl) swaps interface strings on the
 * same URL, which is fine for chrome but useless for SEO, because Google
 * only ever indexes one version of a URL. Articles need their own
 * addressable URL plus an hreflang pair to be indexed as Italian content.
 *
 * The slug is shared with the English original — it is the URL and is
 * never translated — so /blog/<slug> and /it/blog/<slug> are the same
 * article in two languages, which is exactly what hreflang expects.
 */

/** Pre-render every translated post at build time, same as English. */
export function generateStaticParams() {
  return getAllPostSlugs('it').map(slug => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug, 'it');
  if (!post) return {};

  const metaDesc =
    post.excerpt.length > 155
      ? post.excerpt.slice(0, 152).replace(/\s\S*$/, '') + '…'
      : post.excerpt;

  return {
    title: `${post.title} | JetMeAway`,
    description: metaDesc,
    // Canonical points at this Italian URL (not the English one) so the
    // translation is indexed in its own right; `languages` carries the
    // hreflang pair back to English plus x-default.
    alternates: blogAlternates(post.slug, 'it'),
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: postUrl(post.slug, 'it'),
      type: 'article',
      locale: 'it_IT',
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

export default async function ItalianBlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug, 'it');
  if (!post) notFound();

  // Keep the reader inside Italian: sibling-post links in the body point
  // at /it/blog/… wherever that translation exists.
  const localisedPost = {
    ...post,
    content: localiseInternalBlogLinks(post.content, 'it'),
  };

  // Related posts come from the Italian corpus so the "Leggi anche" cards
  // are Italian too.
  const relatedPosts = pickRelatedPosts(post, getAllPosts('it'));

  return (
    <>
      <Header />
      <BlogPostArticle post={localisedPost} relatedPosts={relatedPosts} locale="it" />
      <Footer />
    </>
  );
}
