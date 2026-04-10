import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getAllPosts, formatPostDate } from '@/lib/blog';

export const metadata = {
  title: 'Travel Blog | JetMeAway',
  description:
    'Expert travel tips, destination guides, and insider advice from your personal travel scout. Find the best hotels, flights, packages, and eSIM deals for 2026.',
  openGraph: {
    title: 'Travel Blog | JetMeAway',
    description:
      'Expert travel tips, destination guides, and insider advice from your personal travel scout.',
    url: 'https://jetmeaway.co.uk/blog',
    type: 'website',
  },
};

export default function BlogListingPage() {
  const posts = getAllPosts();

  return (
    <>
      <Header />

      <main className="pt-36 pb-20 px-5 min-h-screen bg-[radial-gradient(ellipse_at_top,#EBF3FF_0%,#fff_55%,#F8FAFC_100%)]">
        <div className="max-w-[1200px] mx-auto">
          {/* Hero */}
          <div className="text-center mb-14">
            <span className="inline-block bg-blue-50 text-[#0066FF] text-[.65rem] font-black uppercase tracking-[2.5px] px-3.5 py-1.5 rounded-full mb-4">
              📝 Travel Blog
            </span>
            <h1 className="font-poppins text-[2.6rem] md:text-[3.8rem] font-black text-[#1A1D2B] leading-[1.05] tracking-tight mb-3">
              Travel Tips & <em className="italic bg-gradient-to-br from-[#0066FF] to-[#0052CC] bg-clip-text text-transparent">Guides</em>
            </h1>
            <p className="text-[1rem] text-[#8E95A9] font-semibold max-w-[560px] mx-auto">
              Expert insights from your personal travel scout — destinations, deals, and tactics for 2026.
            </p>
          </div>

          {/* Posts grid */}
          {posts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map(post => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group bg-white border border-[#E8ECF4] rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all"
                >
                  <div className="relative h-52 overflow-hidden bg-[#F1F3F7]">
                    <img
                      src={post.heroImage}
                      alt={post.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <span className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm text-[#0066FF] text-[.6rem] font-black uppercase tracking-[1.5px] px-2.5 py-1 rounded-full shadow-sm">
                      {post.category}
                    </span>
                  </div>
                  <div className="p-6">
                    <h2 className="font-poppins font-black text-[1.15rem] text-[#1A1D2B] mb-2 leading-snug line-clamp-2 group-hover:text-[#0066FF] transition-colors">
                      {post.title}
                    </h2>
                    <p className="text-[.82rem] text-[#5C6378] font-semibold mb-4 line-clamp-3 leading-relaxed">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between text-[.7rem] text-[#8E95A9] font-semibold pt-3 border-t border-[#F1F3F7]">
                      <span>{formatPostDate(post.date)}</span>
                      <span>{post.readTime}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-[#8E95A9]">
              <p className="text-[.9rem] font-semibold">No posts yet — check back soon.</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
