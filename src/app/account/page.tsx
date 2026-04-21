/**
 * /account — sign-in surface
 *
 * If you're already signed in we redirect you to /account/bookings. Otherwise
 * you see a Scout-voiced email form: enter email → receive magic link → click
 * link → land on /account/bookings.
 *
 * Server component so we can read the cookie on the initial render and skip
 * the form entirely for returning visitors.
 */
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { readSessionEmail } from '@/lib/session';
import SignInForm from './SignInForm';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<{ error?: string; sent?: string }>;
};

export default async function AccountPage({ searchParams }: Props) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const email = await readSessionEmail(cookieHeader);
  if (email) {
    redirect('/account/bookings');
  }

  const { error, sent } = await searchParams;

  return (
    <>
      <Header />
      <main className="min-h-[70vh] max-w-[560px] mx-auto px-5 pt-28 pb-16">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FAF3E6] border border-[#E8D8A8] text-[#8a6d00] text-[.7rem] font-bold">
            <i className="fa-solid fa-user-shield text-[.62rem]" />
            Secure sign-in
          </span>
          <h1 className="font-[var(--font-playfair)] font-black text-[2rem] md:text-[2.4rem] text-[#0a1628] tracking-tight mt-4 leading-tight">
            Your JetMeAway trips
          </h1>
          <p className="text-[.92rem] text-[#5C6378] font-medium mt-2">
            We&apos;ll email you a one-tap sign-in link. No password required.
          </p>
        </div>

        {sent === '1' ? (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-6 text-center">
            <i className="fa-solid fa-envelope-circle-check text-[1.8rem] text-emerald-600 mb-3" />
            <h2 className="font-poppins font-black text-[1.1rem] mb-1">Check your inbox</h2>
            <p className="text-[.88rem] leading-relaxed">
              If the email you entered matches a booking, we&apos;ve sent a sign-in link. It&apos;s valid for 1 hour.
            </p>
            <a href="/account" className="inline-block mt-4 text-[.82rem] font-bold text-emerald-700 underline">
              Try a different email
            </a>
          </div>
        ) : (
          <>
            {error === 'expired' && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 mb-5 text-[.85rem] font-semibold">
                That link has expired or was already used. Request a new one below.
              </div>
            )}
            <SignInForm />
          </>
        )}

        <p className="text-[.72rem] text-[#8E95A9] font-medium text-center mt-6 leading-relaxed">
          Use the same email you used when booking. Haven&apos;t booked yet?{' '}
          <a href="/hotels" className="underline font-semibold text-[#0066FF]">Find a hotel →</a>
        </p>
      </main>
      <Footer />
    </>
  );
}
