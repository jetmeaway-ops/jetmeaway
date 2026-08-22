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
 * Spanish blog post route — /es/blog/<slug>.
 *
 * Path-based rather than header-based on purpose: the sitewide UI
 * translation (src/proxy.ts + next-intl) swaps interface strings on the
 * same URL, which is fine for chrome but useless for SEO, because Google
 * only ever indexes one version of a URL. Articles need their own
 * addressable URL plus an hreflang pair to be indexed as Spanish content.
 *
 * The slug is shared with the English original — it is the URL and is
 * never translated — so /blog/<slug> and /es/blog/<slug> are the same
 * article in two languages, which is exactly what hreflang expects.
 */

/** Pre-render every translated post at build time, same as English. */
export function generateStaticParams() {
  return getAllPostSlugs('es').map(slug => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug, 'es');
  if (!post) return {};

  const metaDesc =
    post.excerpt.length > 155
      ? post.excerpt.slice(0, 152).replace(/\s\S*$/, '') + '…'
      : post.excerpt;

  return {
    title: `${post.title} | JetMeAway`,
    description: metaDesc,
    // Canonical points at this Spanish URL (not the English one) so the
    // translation is indexed in its own right; `languages` carries the
    // hreflang pair back to English plus x-default.
    alternates: blogAlternates(post.slug, 'es'),
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: postUrl(post.slug, 'es'),
      type: 'article',
      // Neutral Spanish corpus, but Open Graph wants a territory — es_ES is
      // the safest single value for a UK-based site selling into Spain.
      locale: 'es_ES',
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

export default async function SpanishBlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug, 'es');
  if (!post) notFound();

  // Keep the reader inside Spanish: sibling-post links in the body point
  // at /es/blog/… wherever that translation exists.
  const localisedPost = {
    ...post,
    content: localiseInternalBlogLinks(post.content, 'es'),
  };

  // Related posts come from the Spanish corpus so the "Read next" cards
  // are Spanish too.
  const relatedPosts = pickRelatedPosts(post, getAllPosts('es'));

  return (
    <>
      <Header />
      <BlogPostArticle post={localisedPost} relatedPosts={relatedPosts} locale="es" />
      <Footer />
    </>
  );
}
