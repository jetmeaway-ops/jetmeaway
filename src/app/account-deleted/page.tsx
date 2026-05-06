/**
 * /account-deleted — confirmation page reached after a successful POST to
 * /api/account/delete. Static, server-rendered, no auth checks (the user
 * has just been signed out by the API).
 */
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const runtime = 'edge';

export const metadata = {
  title: 'Your account has been deleted — JetMeAway',
  description: 'Your JetMeAway account, saved searches and deal-alert subscription have been deleted.',
  robots: 'noindex',
};

export default function AccountDeletedPage() {
  return (
    <>
      <Header />
      <main className="min-h-[70vh] max-w-[600px] mx-auto px-5 pt-28 pb-16">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[.7rem] font-bold">
            <i className="fa-solid fa-circle-check text-[.62rem]" />
            Done
          </span>
          <h1 className="font-[var(--font-playfair)] font-black text-[2rem] md:text-[2.4rem] text-[#0a1628] tracking-tight mt-4 leading-tight">
            Your account has been deleted
          </h1>
        </div>
        <div className="bg-white rounded-2xl border border-[#E8ECF4] shadow-[0_8px_24px_-12px_rgba(0,0,0,0.08)] p-6 md:p-8">
          <p className="text-[.95rem] text-[#1A1D2B] leading-relaxed mb-4">
            We&apos;ve removed your saved searches, price-drop alerts and deal-alert
            email subscription. You&apos;ve been signed out of every device.
          </p>
          <p className="text-[.9rem] text-[#5C6378] leading-relaxed mb-6">
            Booking records linked to this email are retained as required by UK
            consumer law. If you need them adjusted contact{' '}
            <a href="mailto:waqar@jetmeaway.co.uk" className="underline font-semibold">
              waqar@jetmeaway.co.uk
            </a>
            .
          </p>
          <a
            href="/"
            className="inline-block bg-[#0066FF] hover:bg-[#0052cc] text-white font-black text-[.95rem] py-3.5 px-6 rounded-xl transition-colors"
          >
            Back to JetMeAway
          </a>
        </div>
      </main>
      <Footer />
    </>
  );
}
