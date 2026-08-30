/**
 * The signed-in face of /account — a "My account" overview, modelled on the
 * account screens in the owner's reference screenshots (2026-08-30): travel
 * activity first, then personal details, help, legal, sign out.
 *
 * Server component: everything here is one KV read of the unified store plus
 * one get per review, all owned by the signed-in email. It shows ONLY what we
 * truly have — there is no rewards tier, no wallet, no payment methods on
 * file (LiteAPI takes payment per booking and we never store cards), and the
 * page says that plainly instead of dressing up empty sections.
 */
import Link from 'next/link';
import { kv } from '@vercel/kv';
import { listBookings, fmtDate, type Booking } from '@/lib/bookings';
import { feedbackEntryKey, type FeedbackEntry, type FeedbackScore } from '@/lib/feedback';

const SCORE_FACE: Record<FeedbackScore, string> = {
  poor: '☹️',
  fair: '😐',
  good: '🙂',
  excellent: '😄',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-[.68rem] font-black uppercase tracking-[2px] text-[#8E95A9] mb-3">{title}</h2>
      <div className="bg-white border border-[#E8ECF4] rounded-2xl divide-y divide-[#F1F3F7] overflow-hidden">
        {children}
      </div>
    </section>
  );
}

function RowLink({ href, icon, label, hint, external }: { href: string; icon: string; label: string; hint?: string; external?: boolean }) {
  const inner = (
    <span className="flex items-center gap-3 px-5 py-4">
      <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#F1F5FF] text-[#0066FF]">
        <i className={`fa-solid ${icon} text-[.85rem]`} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[.88rem] font-bold text-[#0a1628]">{label}</span>
        {hint ? <span className="block text-[.74rem] text-[#8E95A9] truncate">{hint}</span> : null}
      </span>
      <i className="fa-solid fa-chevron-right text-[.7rem] text-[#B0B8CC]" />
    </span>
  );
  return external ? (
    <a href={href} className="block hover:bg-[#FAFBFC] transition-colors">{inner}</a>
  ) : (
    <Link href={href} className="block hover:bg-[#FAFBFC] transition-colors">{inner}</Link>
  );
}

export default async function AccountOverview({ email }: { email: string }) {
  const all = await listBookings();
  const mine = all.filter((b) => (b.customerEmail || '').toLowerCase() === email);

  const now = Date.now();
  const upcoming = mine.filter(
    (b) => b.status !== 'cancelled' && b.status !== 'refunded' && b.status !== 'failed'
      && b.checkOut && new Date(b.checkOut).getTime() >= now,
  ).length;

  // The customer's reviews: their own bookings' refs looked up in the
  // feedback store. Per-ref gets, bounded by how many stays THEY have.
  const reviews = (
    await Promise.all(
      mine.map((b) => kv.get<FeedbackEntry>(feedbackEntryKey(b.id)).catch(() => null)),
    )
  ).filter((e): e is FeedbackEntry => !!e);
  reviews.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));

  // Greet by the name on their latest booking; the literal 'Guest' fallback
  // both mirror functions write is not a name.
  const latestName = (mine[0]?.customerName || '').trim();
  const firstName = latestName && latestName.toLowerCase() !== 'guest'
    ? latestName.split(/\s+/)[0]
    : '';

  return (
    <main className="min-h-[70vh] max-w-[640px] mx-auto px-5 pt-28 pb-16">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-[var(--font-playfair)] font-black text-[1.9rem] text-[#0a1628] tracking-tight leading-tight">
            {firstName ? `Hi, ${firstName}` : 'My account'}
          </h1>
          <p className="text-[.85rem] text-[#5C6378] font-medium mt-1 break-all">{email}</p>
        </div>
        <form action="/api/account/signout" method="POST">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#E8ECF4] bg-white hover:bg-[#FCFAF5] text-[#0a1628] font-bold text-[.78rem] transition-colors shrink-0"
          >
            <i className="fa-solid fa-arrow-right-from-bracket text-[.7rem]" />
            Sign out
          </button>
        </form>
      </div>

      <Section title="Travel activity">
        <RowLink
          href="/account/bookings"
          icon="fa-suitcase-rolling"
          label="My bookings"
          hint={
            mine.length === 0
              ? 'No bookings on this email yet'
              : `${mine.length} booking${mine.length === 1 ? '' : 's'}${upcoming ? ` · ${upcoming} upcoming` : ''}`
          }
        />
        <RowLink href="/account/favourites" icon="fa-heart" label="Saved hotels" />
      </Section>

      <Section title="My reviews">
        {reviews.length === 0 ? (
          <p className="px-5 py-4 text-[.82rem] text-[#8E95A9]">
            No reviews yet — after your next stay we&apos;ll ask how it was.
          </p>
        ) : (
          reviews.map((r) => (
            <Link
              key={r.ref}
              href={`/account/bookings/${encodeURIComponent(r.ref)}`}
              className="block hover:bg-[#FAFBFC] transition-colors"
            >
              <span className="flex items-center gap-3 px-5 py-4">
                <span className="text-[1.4rem] leading-none">{SCORE_FACE[r.score] || '🙂'}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[.88rem] font-bold text-[#0a1628] truncate">
                    {r.hotel || r.ref}
                  </span>
                  <span className="block text-[.74rem] text-[#8E95A9] truncate">
                    {[r.score, r.checkOut ? fmtDate(r.checkOut) : '', r.comment ? `“${r.comment}”` : '']
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                <i className="fa-solid fa-chevron-right text-[.7rem] text-[#B0B8CC]" />
              </span>
            </Link>
          ))
        )}
      </Section>

      <Section title="Personal details">
        <div className="px-5 py-4">
          <p className="text-[.82rem] font-bold text-[#0a1628]">Email</p>
          <p className="text-[.82rem] text-[#5C6378] break-all">{email}</p>
          <p className="text-[.72rem] text-[#8E95A9] mt-2 leading-relaxed">
            Guest names go to the hotel per booking. We never store card details — payment is taken
            securely per stay and JetMeAway keeps no payment methods on file.
          </p>
        </div>
      </Section>

      <Section title="Help and support">
        <RowLink href="/contact" icon="fa-circle-question" label="Contact us" hint="Questions about a booking, or anything else" />
        <RowLink href="mailto:contact@jetmeaway.co.uk" icon="fa-envelope" label="contact@jetmeaway.co.uk" external />
      </Section>

      <Section title="Legal and privacy">
        <RowLink href="/privacy" icon="fa-shield-halved" label="Privacy policy" />
        <RowLink href="/terms" icon="fa-scale-balanced" label="Terms and affiliate disclosure" />
      </Section>
    </main>
  );
}
