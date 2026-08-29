/**
 * The landing behind the rating buttons in the post-stay email.
 *
 * GET  /api/feedback/rate?ref=&score=&t=   — the page a tap opens.
 * POST /api/feedback/rate                  — what actually registers.
 *
 * WHY THE GET DOES NOT REGISTER: mail security scanners prefetch every link in
 * an email before the guest ever sees it. If a bare GET wrote the rating, a
 * scanner walking all four buttons would file the LAST one it fetched — a
 * fabricated "excellent" (or "poor") on every scanned booking. So the GET only
 * renders a page, and an inline script on that page does the POST. Scanners do
 * not execute scripts; thumbs do not notice the difference — tap, page opens,
 * rating saved, done. The page also offers an optional comment box and the
 * same Trustpilot ask the site makes elsewhere.
 *
 * Token: minted per booking when the email is sent (feedback:token:<ref>).
 * No token match → nothing is written. Constant response shape either way, so
 * the endpoint cannot be used to probe which refs exist.
 */
import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import {
  FEEDBACK_INDEX_KEY,
  FEEDBACK_SCORE_NUM,
  feedbackEntryKey,
  feedbackTokenKey,
  isFeedbackScore,
  type FeedbackEntry,
  type FeedbackScore,
} from '@/lib/feedback';
import { getBooking } from '@/lib/bookings';

export const runtime = 'edge';

const TRUSTPILOT_URL = 'https://uk.trustpilot.com/review/jetmeaway.co.uk';
const MAX_COMMENT_CHARS = 2000;

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const SCORE_FACE: Record<FeedbackScore, string> = {
  poor: '☹️',
  fair: '😐',
  good: '🙂',
  excellent: '😄',
};

function page(body: string): NextResponse {
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>Your feedback — JetMeAway</title>
</head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:'Helvetica Neue',Arial,sans-serif;color:#1A1D2B;">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:24px;">
      <img src="/jetmeaway-logo.png" alt="JetMeAway" width="150" style="height:auto;max-width:150px;border:0;" />
    </div>
    ${body}
    <p style="text-align:center;font-size:11px;color:#B0B8CC;margin:24px 0 0;">JETMEAWAY LTD &middot; 66 Paul Street, London</p>
  </div>
</body>
</html>`;
  return new NextResponse(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}

function card(inner: string): string {
  return `<div style="background:#fff;border:1px solid #E8ECF4;border-radius:16px;padding:28px;text-align:center;">${inner}</div>`;
}

/** The one page for stale/invalid links. Deliberately identical for a wrong
 *  token and an unknown ref, so the URL space cannot be probed. */
function expiredPage(): NextResponse {
  return page(card(
    `<h1 style="font-size:20px;font-weight:900;margin:0 0 10px;">This link has expired</h1>
     <p style="font-size:14px;line-height:1.6;color:#5C6378;margin:0;">Feedback links live for 90 days after check-out. You can still tell us anything at
     <a href="mailto:contact@jetmeaway.co.uk" style="color:#0066FF;">contact@jetmeaway.co.uk</a> — a real person reads it.</p>`,
  ));
}

export async function GET(req: NextRequest) {
  const ref = (req.nextUrl.searchParams.get('ref') || '').slice(0, 40);
  const score = req.nextUrl.searchParams.get('score') || '';
  const t = (req.nextUrl.searchParams.get('t') || '').slice(0, 64);

  if (!ref || !t || !isFeedbackScore(score)) return expiredPage();
  const stored = await kv.get<string>(feedbackTokenKey(ref));
  if (!stored || stored !== t) return expiredPage();

  const booking = await getBooking(ref).catch(() => null);
  const hotel = booking?.title || 'your hotel';

  return page(`
    ${card(`
      <div style="font-size:44px;line-height:1;margin-bottom:8px;">${SCORE_FACE[score]}</div>
      <h1 style="font-size:20px;font-weight:900;margin:0 0 6px;">You rated ${esc(hotel)} &ldquo;${score}&rdquo;</h1>
      <p id="save-state" style="font-size:13px;color:#8E95A9;margin:0 0 4px;">Saving&hellip;</p>
    `)}
    <div style="background:#fff;border:1px solid #E8ECF4;border-radius:16px;padding:24px;margin-top:14px;">
      <p style="font-size:14px;font-weight:800;margin:0 0 8px;">Anything you want to add? <span style="font-weight:400;color:#8E95A9;">(optional)</span></p>
      <form method="POST" action="/api/feedback/rate">
        <input type="hidden" name="ref" value="${esc(ref)}" />
        <input type="hidden" name="t" value="${esc(t)}" />
        <input type="hidden" name="score" value="${score}" />
        <textarea name="comment" maxlength="${MAX_COMMENT_CHARS}" rows="4" placeholder="The room, the beds, check-in, the area — whatever the next family should know."
          style="width:100%;box-sizing:border-box;border:1px solid #E8ECF4;border-radius:10px;padding:12px;font-size:14px;font-family:inherit;resize:vertical;"></textarea>
        <button type="submit" style="margin-top:10px;background:#0066FF;color:#fff;border:0;border-radius:10px;padding:12px 24px;font-size:14px;font-weight:800;cursor:pointer;">Send</button>
      </form>
    </div>
    <div style="text-align:center;margin-top:18px;">
      <p style="font-size:13px;color:#8E95A9;margin:0 0 10px;">Happy with JetMeAway? A public review helps other travellers trust a small company:</p>
      <a href="${TRUSTPILOT_URL}" style="display:inline-block;background:#fff;border:2px solid #D6E2FF;border-radius:10px;padding:10px 22px;font-size:13px;font-weight:800;color:#0066FF;text-decoration:none;">Review us on Trustpilot</a>
    </div>
    <script>
      /* The actual registration — scanners prefetch the GET but do not run
         this, so only a real open records a score. */
      fetch('/api/feedback/rate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ref: ${JSON.stringify('__REF__')}, t: ${JSON.stringify('__T__')}, score: ${JSON.stringify('__SCORE__')} }),
      }).then(function (r) {
        document.getElementById('save-state').textContent = r.ok ? 'Saved — thank you.' : 'Could not save. The comment box below still works.';
      }).catch(function () {
        document.getElementById('save-state').textContent = 'Could not save. The comment box below still works.';
      });
    </script>
  `.replace('__REF__', ref).replace('__T__', t).replace('__SCORE__', score));
}

export async function POST(req: NextRequest) {
  // Accept both the page script's JSON and the comment form's URL-encoding.
  let ref = '', t = '', score = '', comment = '';
  let isForm = false;
  const ctype = req.headers.get('content-type') || '';
  try {
    if (ctype.includes('application/json')) {
      const j = await req.json();
      ref = String(j.ref || ''); t = String(j.t || ''); score = String(j.score || '');
      comment = String(j.comment || '');
    } else {
      isForm = true;
      const f = await req.formData();
      ref = String(f.get('ref') || ''); t = String(f.get('t') || ''); score = String(f.get('score') || '');
      comment = String(f.get('comment') || '');
    }
  } catch {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  ref = ref.slice(0, 40); t = t.slice(0, 64); comment = comment.trim().slice(0, MAX_COMMENT_CHARS);

  const fail = () => (isForm ? expiredPage() : NextResponse.json({ success: false }, { status: 403 }));
  if (!ref || !t || !isFeedbackScore(score)) return fail();
  const stored = await kv.get<string>(feedbackTokenKey(ref));
  if (!stored || stored !== t) return fail();

  const now = new Date().toISOString();
  const prior = await kv.get<FeedbackEntry>(feedbackEntryKey(ref));
  const booking = prior ? null : await getBooking(ref).catch(() => null);

  const entry: FeedbackEntry = {
    ref,
    score,
    scoreNum: FEEDBACK_SCORE_NUM[score],
    // A new comment replaces the old one; an empty re-submit keeps what was
    // written (tapping a second smiley must not wipe a paragraph of feedback).
    ...(comment ? { comment } : prior?.comment ? { comment: prior.comment } : {}),
    hotel: prior?.hotel ?? booking?.title ?? undefined,
    city: prior?.city ?? booking?.destination ?? undefined,
    checkIn: prior?.checkIn ?? booking?.checkIn ?? null,
    checkOut: prior?.checkOut ?? booking?.checkOut ?? null,
    createdAt: prior?.createdAt ?? now,
    updatedAt: now,
  };
  await kv.set(feedbackEntryKey(ref), entry);

  // Newest-first index for the admin. Read-modify-write like bookings:all —
  // volumes here are a fraction of bookings, so the same pattern holds.
  if (!prior) {
    try {
      const idx = (await kv.get<string[]>(FEEDBACK_INDEX_KEY)) || [];
      if (!idx.includes(ref)) {
        idx.unshift(ref);
        await kv.set(FEEDBACK_INDEX_KEY, idx);
      }
    } catch {
      // Index is a convenience; the entry itself is already saved.
    }
  }

  if (isForm) {
    return page(card(
      `<div style="font-size:44px;line-height:1;margin-bottom:8px;">🙏</div>
       <h1 style="font-size:20px;font-weight:900;margin:0 0 8px;">Thank you</h1>
       <p style="font-size:14px;line-height:1.6;color:#5C6378;margin:0 0 16px;">Your feedback is saved. It genuinely shapes which hotels we send families to.</p>
       <a href="${TRUSTPILOT_URL}" style="display:inline-block;background:#0066FF;border-radius:10px;padding:12px 24px;font-size:14px;font-weight:800;color:#fff;text-decoration:none;">Review us on Trustpilot</a>`,
    ));
  }
  return NextResponse.json({ success: true });
}
