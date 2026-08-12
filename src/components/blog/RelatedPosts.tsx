import Link from 'next/link';

import { formatPostDate, type BlogPost, type PostLocale } from '@/lib/blog';

/**
 * RelatedPosts — "Read next" grid shown at the foot of every article.
 *
 * Its real job is SEO: it gives each post inbound *contextual* internal
 * links from sibling articles, not just the single weak link from the
 * /blog index grid. That link web is what stops posts being treated as
 * orphans (GSC "Referring page: None detected") and helps them get
 * crawled, indexed and ranked.
 *
 * Purely presentational — the parent picks which posts to pass.
 *
 * `locale` only changes the heading, the date format and the link prefix,
 * so translated articles link on to their translated siblings instead of
 * dropping the reader back into English. It defaults to 'en', leaving the
 * English blog byte-identical.
 */
export default function RelatedPosts({
  posts,
  locale = 'en',
}: {
  posts: BlogPost[];
  locale?: PostLocale;
}) {
  if (posts.length === 0) return null;

  const basePath = locale === 'en' ? '/blog' : `/${locale}/blog`;
  const heading = locale === 'de' ? 'Das könnte Sie auch interessieren' : 'Read next';

  return (
    <section className="max-w-[960px] mx-auto px-5 mt-16">
      <h2 className="font-poppins text-[1.4rem] md:text-[1.6rem] font-black text-[#1A1D2B] mb-6">
        {heading}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`${basePath}/${post.slug}`}
            className="group bg-white border border-[#E8ECF4] rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all"
          >
            <div className="relative h-40 overflow-hidden bg-[#F1F3F7]">
              <img
                src={post.heroImage}
                alt={post.title}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <span className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm text-[#0066FF] text-[.55rem] font-black uppercase tracking-[1.5px] px-2.5 py-1 rounded-full shadow-sm">
                {post.category}
              </span>
            </div>
            <div className="p-5">
              <h3 className="font-poppins font-black text-[1rem] text-[#1A1D2B] mb-2 leading-snug line-clamp-2 group-hover:text-[#0066FF] transition-colors">
                {post.title}
              </h3>
              <div className="flex items-center justify-between text-[.68rem] text-[#8E95A9] font-semibold pt-3 border-t border-[#F1F3F7]">
                <span>{formatPostDate(post.date, locale)}</span>
                <span>{post.readTime}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
