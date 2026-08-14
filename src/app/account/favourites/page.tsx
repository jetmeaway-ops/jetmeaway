/**
 * /account/favourites — the visitor's saved hotels.
 *
 * Deliberately NOT gated on sign-in, unlike /account/bookings. Favourites work
 * signed out (stored on the device) and signed in (stored on the account), so
 * redirecting anonymous visitors to a sign-in wall would hide the very list
 * they just built. The client component reads whichever store applies and
 * tells signed-out visitors their list is device-only.
 */
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getTranslations } from 'next-intl/server';
import FavouritesClient from './FavouritesClient';

export const runtime = 'edge';

export const metadata = {
  title: 'Your saved hotels | JetMeAway',
  description: 'The hotels you saved on JetMeAway, ready to compare when you are.',
  // Personal, per-visitor content — nothing here belongs in an index.
  robots: { index: false, follow: false },
};

export default async function FavouritesPage() {
  const t = await getTranslations('favourites');
  return (
    <>
      <Header />
      <main className="max-w-[960px] mx-auto px-5 pt-28 pb-16 min-h-[60vh]">
        <div className="mb-6">
          <p className="text-[.72rem] font-black uppercase tracking-[1.8px] text-[#8a6d00]">JetMeAway</p>
          <h1 className="font-[var(--font-playfair)] font-black text-[1.8rem] md:text-[2.2rem] text-[#0a1628] tracking-tight leading-tight mt-1">
            {t('pageTitle')}
          </h1>
          <p className="text-[.85rem] text-[#5C6378] font-semibold mt-2 max-w-[560px]">{t('pageSub')}</p>
        </div>
        <FavouritesClient />
      </main>
      <Footer />
    </>
  );
}
