/**
 * /admin/reviews — every guest review, in one place.
 *
 * Built the night the FIRST real review arrived (the owner's wife rated her
 * Paris stay "good" via the post-checkout email) and the owner had nowhere to
 * see it: guests see their own reviews in My Account, but the store's owner
 * could only read the KV store by hand.
 *
 * Reads the feedback namespace (lib/feedback.ts): the newest-first index, one
 * entry per booking. Each row links to the admin booking detail, where the
 * guest and the money live — this page deliberately shows NO guest names or
 * emails, so it can be glanced at on a phone in public without leaking PII.
 */
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { kv } from '@vercel/kv';
import { fmtDate } from '@/lib/bookings';
import {
  FEEDBACK_INDEX_KEY,
  feedbackEntryKey,
  type FeedbackEntry,
  type FeedbackScore,
} from '@/lib/feedback';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FACE: Record<FeedbackScore, string> = {
  poor: '☹️',
  fair: '😐',
  good: '🙂',
  excellent: '😄',
};

const SCORE_TINT: Record<FeedbackScore, string> = {
  poor: 'bg-red-50 text-red-700 ring-red-200',
  fair: 'bg-amber-50 text-amber-700 ring-amber-200',
  good: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  excellent: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
};

export default async function AdminReviewsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('jma_admin')?.value || '';
  const secret = process.env.ADMIN_SECRET || '';
  if (!secret || token !== secret) redirect('/admin/login');

  const refs = (await kv.get<string[]>(FEEDBACK_INDEX_KEY)) || [];
  const entries = (
    await Promise.all(refs.map((r) => kv.get<FeedbackEntry>(feedbackEntryKey(r)).catch(() => null)))
  ).filter((e): e is FeedbackEntry => !!e);

  const counts = { poor: 0, fair: 0, good: 0, excellent: 0 } as Record<FeedbackScore, number>;
  for (const e of entries) counts[e.score] = (counts[e.score] || 0) + 1;
  const avg = entries.length
    ? (entries.reduce((s, e) => s + (e.scoreNum || 0), 0) / entries.length).toFixed(1)
    : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-[#0a1628]">Guest reviews</h1>
          <p className="text-sm text-[#5C6378] mt-1">
            From the post-checkout rating email. Guests see their own under My account.
          </p>
        </div>
        <Link href="/admin" className="text-sm font-bold text-[#0066FF]">
          ← Dashboard
        </Link>
      </div>

      {/* The shape of sentiment at a glance. */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
        <div className="bg-white border border-[#E8ECF4] rounded-xl p-4">
          <p className="text-[.65rem] font-black uppercase tracking-wider text-[#8E95A9]">Average</p>
          <p className="text-xl font-black text-[#0a1628] mt-1">{avg ? `${avg} / 4` : '—'}</p>
        </div>
        {(['excellent', 'good', 'fair', 'poor'] as const).map((s) => (
          <div key={s} className="bg-white border border-[#E8ECF4] rounded-xl p-4">
            <p className="text-[.65rem] font-black uppercase tracking-wider text-[#8E95A9]">
              {FACE[s]} {s}
            </p>
            <p className="text-xl font-black text-[#0a1628] mt-1">{counts[s]}</p>
          </div>
        ))}
      </div>

      {entries.length === 0 ? (
        <div className="bg-white border border-[#E8ECF4] rounded-2xl p-10 text-center text-[#5C6378]">
          No reviews yet. They arrive ~2 hours after each guest checks out.
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((e) => (
            <div key={e.ref} className="bg-white border border-[#E8ECF4] rounded-2xl p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-2xl leading-none">{FACE[e.score] || '🙂'}</span>
                <span
                  className={`inline-block px-2.5 py-1 rounded-full text-[.68rem] font-black uppercase tracking-wider ring-1 ${SCORE_TINT[e.score] || ''}`}
                >
                  {e.score}
                </span>
                <span className="font-bold text-[#0a1628]">{e.hotel || e.ref}</span>
                {e.city ? <span className="text-sm text-[#8E95A9]">· {e.city}</span> : null}
                <span className="ml-auto text-xs text-[#8E95A9]">
                  {e.updatedAt ? fmtDate(e.updatedAt.slice(0, 10)) : ''}
                </span>
              </div>
              {e.comment ? (
                <blockquote className="mt-3 text-[.95rem] leading-relaxed text-[#1A1D2B] border-l-4 border-[#E8ECF4] pl-4">
                  “{e.comment}”
                </blockquote>
              ) : (
                <p className="mt-3 text-sm text-[#8E95A9]">No written comment — score only.</p>
              )}
              <div className="mt-4 pt-3 border-t border-[#F1F3F7] flex flex-wrap items-center gap-4 text-xs">
                <span className="text-[#8E95A9]">
                  Stay {e.checkIn ? fmtDate(e.checkIn) : '?'} → {e.checkOut ? fmtDate(e.checkOut) : '?'}
                </span>
                <Link
                  href={`/admin/bookings/${encodeURIComponent(e.ref)}`}
                  className="font-bold text-[#0066FF]"
                >
                  Open booking {e.ref} →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
