import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getAllPosts, formatPostDate } from '@/lib/blog';

/**
 * Arabic blog index — /ar/blog.
 *
 * Mirrors the English listing at src/app/blog/page.tsx; only the copy,
 * the date format, the card links and the reading direction differ. It
 * exists so the Arabic articles have a real parent page: "العودة إلى
 * المدونة" needs somewhere to go, and Google needs a crawlable hub
 * linking the 545 translations.
 *
 * First RTL locale: the content column sets dir="rtl" so the whole
 * listing flows right-to-left. Copy is Modern Standard Arabic, matching
 * src/messages/ar.json and the translated corpus.
 */

export const metadata = {
  title: 'مدونة السفر | JetMeAway',
  description:
    'نصائح السفر وأدلة الوجهات وحيل من مستكشف السفر الشخصي الخاص بك. أفضل الفنادق والرحلات والباقات وعروض eSIM لعام 2026.',
  alternates: {
    canonical: 'https://jetmeaway.co.uk/ar/blog',
    languages: {
      en: 'https://jetmeaway.co.uk/blog',
      de: 'https://jetmeaway.co.uk/de/blog',
      es: 'https://jetmeaway.co.uk/es/blog',
      it: 'https://jetmeaway.co.uk/it/blog',
      ar: 'https://jetmeaway.co.uk/ar/blog',
      'x-default': 'https://jetmeaway.co.uk/blog',
    },
  },
  openGraph: {
    title: 'مدونة السفر | JetMeAway',
    description:
      'نصائح السفر وأدلة الوجهات وحيل من مستكشف السفر الشخصي الخاص بك.',
    url: 'https://jetmeaway.co.uk/ar/blog',
    type: 'website',
    locale: 'ar_AR',
  },
};

export default function ArabicBlogListingPage() {
  const posts = getAllPosts('ar');

  return (
    <>
      <Header />

      {/* Full-page world-map backdrop — see the English listing for the
          reasoning behind the fixed z-index -1 layer and the dark scrim. */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: -1,
          backgroundColor: '#0a1020',
          backgroundImage:
            'linear-gradient(180deg, rgba(7,11,22,0.45) 0%, rgba(7,11,22,0.30) 45%, rgba(7,11,22,0.55) 100%), url("https://commons.wikimedia.org/wiki/Special:FilePath/Whole_world_-_land_and_oceans_12000.jpg?width=2560")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />

      <main dir="rtl" className="pt-36 pb-20 px-5 min-h-screen">
        <div className="max-w-[1200px] mx-auto">
          {/* Hero */}
          <div className="text-center mb-14">
            <span className="inline-block bg-white/15 backdrop-blur-sm text-white border border-white/25 text-[.65rem] font-black uppercase tracking-[2.5px] px-3.5 py-1.5 rounded-full mb-4">
              📝 مدونة السفر
            </span>
            <h1 className="font-poppins text-[2.6rem] md:text-[3.8rem] font-black text-white leading-[1.15] tracking-tight mb-3 [text-shadow:0_2px_24px_rgba(0,0,0,0.45)]">
              نصائح و<em className="italic bg-gradient-to-br from-cyan-300 to-blue-400 bg-clip-text text-transparent">أدلة</em> السفر
            </h1>
            <p className="text-[1rem] text-white/85 font-semibold max-w-[560px] mx-auto [text-shadow:0_1px_12px_rgba(0,0,0,0.5)]">
              أفكار موثوقة من مستكشف السفر الشخصي الخاص بك — الوجهات والعروض واستراتيجيات لعام 2026.
            </p>
          </div>

          {/* Posts grid */}
          {posts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post, postIdx) => (
                <Link
                  key={post.slug}
                  href={`/ar/blog/${post.slug}`}
                  className="group bg-white border border-[#E8ECF4] rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all"
                >
                  <div className="relative h-52 overflow-hidden bg-gradient-to-br from-[#DDE4EF] to-[#F1F3F7]">
                    <img
                      src={post.heroImage}
                      alt={post.title}
                      loading={postIdx < 3 ? 'eager' : 'lazy'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <span className="absolute top-3 start-3 bg-white/95 backdrop-blur-sm text-[#0066FF] text-[.6rem] font-black uppercase tracking-[1.5px] px-2.5 py-1 rounded-full shadow-sm">
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
                      <span>{formatPostDate(post.date, 'ar')}</span>
                      <span>{post.readTime}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-[#8E95A9]">
              <p className="text-[.9rem] font-semibold">لا توجد مقالات بعد — تحقق مرة أخرى قريبًا.</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
