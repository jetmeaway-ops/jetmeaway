/**
 * /delete-account — confirmation page reached from the native iOS Profile
 * button (Apple Guideline 5.1.1(v)) or directly from /account.
 *
 * Server component. Reads the session cookie, asks the user to confirm,
 * then POSTs to /api/account/delete which actually wipes the data.
 *
 * If they're not signed in we render a sign-in prompt with the deletion
 * link as the next-step — Apple's reviewer always lands here signed in via
 * the demo account so they hit the confirm flow on first paint.
 */
import { cookies } from 'next/headers';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { readSessionEmailFromCookies } from '@/lib/session';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Delete your JetMeAway account',
  description: 'Permanently delete your JetMeAway account, saved searches and deal-alert subscription.',
  robots: 'noindex',
};

export default async function DeleteAccountPage() {
  const cookieStore = await cookies();
  const email = await readSessionEmailFromCookies(cookieStore);

  return (
    <>
      <Header />
      <main className="min-h-[70vh] max-w-[600px] mx-auto px-5 pt-28 pb-16">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-[.7rem] font-bold">
            <i className="fa-solid fa-triangle-exclamation text-[.62rem]" />
            Permanent action
          </span>
          <h1 className="font-[var(--font-playfair)] font-black text-[2rem] md:text-[2.4rem] text-[#0a1628] tracking-tight mt-4 leading-tight">
            Delete your account
          </h1>
        </div>

        {email ? (
          <div className="bg-white rounded-2xl border border-[#E8ECF4] shadow-[0_8px_24px_-12px_rgba(0,0,0,0.08)] p-6 md:p-8">
            <p className="text-[.95rem] text-[#1A1D2B] leading-relaxed mb-4">
              You are signed in as <span className="font-bold">{email}</span>. Confirming
              below will permanently delete:
            </p>
            <ul className="text-[.9rem] text-[#374151] leading-relaxed space-y-1.5 list-disc pl-5 mb-5">
              <li>Your saved searches and price-drop alerts</li>
              <li>Your deal-alert email subscription</li>
              <li>Your sign-in session on this device</li>
            </ul>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <p className="text-[.82rem] text-amber-900 leading-relaxed">
                <span className="font-bold">Booking records are retained.</span> Your
                completed bookings stay in our system as required by UK consumer law
                (refunds, chargeback windows, HMRC). They cannot be removed by request —
                this is the same rule airlines and hotels follow. Contact{' '}
                <a href="mailto:waqar@jetmeaway.co.uk" className="underline font-semibold">
                  waqar@jetmeaway.co.uk
                </a>{' '}
                if you need a record-by-record discussion.
              </p>
            </div>
            <form method="POST" action="/api/account/delete" className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                className="flex-1 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-black text-[.95rem] py-3.5 px-6 rounded-xl transition-colors"
              >
                <i className="fa-solid fa-trash-can mr-2" />
                Permanently delete my account
              </button>
              <a
                href="/account/bookings"
                className="flex-1 text-center bg-white border border-[#E8ECF4] text-[#1A1D2B] hover:bg-[#F8FAFC] font-bold text-[.95rem] py-3.5 px-6 rounded-xl transition-colors"
              >
                Cancel
              </a>
            </form>
            <p className="text-[.72rem] text-[#8E95A9] font-medium mt-5 leading-relaxed">
              This action cannot be undone. After deletion you can create a new account
              at any time by signing in with the same email — the new account will
              start clean.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E8ECF4] shadow-[0_8px_24px_-12px_rgba(0,0,0,0.08)] p-6 md:p-8">
            <p className="text-[.95rem] text-[#1A1D2B] leading-relaxed mb-4">
              Sign in first so we know which account to delete. We&apos;ll bring you
              back to this page after sign-in.
            </p>
            <a
              href="/account"
              className="inline-block bg-[#0066FF] hover:bg-[#0052cc] text-white font-black text-[.95rem] py-3.5 px-6 rounded-xl transition-colors"
            >
              Sign in to continue
            </a>
            <p className="text-[.72rem] text-[#8E95A9] font-medium mt-5 leading-relaxed">
              No password needed — we&apos;ll email you a one-tap sign-in link.
            </p>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
