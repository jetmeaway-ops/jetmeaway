import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const runtime = 'edge';

/**
 * Bug monitor — receives Vercel log-drain (or any error webhook) events,
 * filters for actual errors, asks Claude for a 2-sentence root-cause +
 * fix summary, then emails the owner via Resend.
 *
 * Hardening:
 *  - Auth: requires `x-bug-monitor-secret` header matching env var.
 *    Without this, anyone could hit the endpoint and burn through our
 *    Anthropic credit.
 *  - Rate limit: same error fingerprint suppressed for 5 min so a burst
 *    of identical errors doesn't flood the inbox.
 *  - Prompt cache: system prompt is stable, tagged with cache_control
 *    so input-token cost drops on repeated invocations.
 *  - Current model: claude-sonnet-4-5.
 *  - Soft-fail: if Resend env var is missing we still analyse the error
 *    and return the summary — caller can still see it in the response.
 *
 * Email path (was Twilio SMS — owner switched to email-only 2026-04-29
 * for cheaper, longer, more triageable alerts).
 *
 * Required env vars on Vercel:
 *  - ANTHROPIC_API_KEY
 *  - BUG_MONITOR_SECRET — any random string. Must be sent by the caller
 *    in the x-bug-monitor-secret header.
 *  - RESEND_API_KEY — already configured for contact / deal-alerts /
 *    booking emails. Email leg skipped if missing.
 */

const CLAUDE_MODEL = 'claude-sonnet-4-5';
const SMS_DEDUPE_TTL = 60 * 5; // 5 min — same error fingerprint suppressed
const ALERT_FROM = 'JetMeAway Bug Monitor <noreply@jetmeaway.co.uk>';
const ALERT_TO = 'waqar@jetmeaway.co.uk';

interface BugEvent {
  level?: string;
  type?: string;
  message?: string;
  body?: string;
  [k: string]: unknown;
}

/** Stable hash for email de-dup. Same error text → same key → no spam. */
function fingerprint(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return `bug:dedupe:${Math.abs(hash)}`;
}

/** Trim a long summary to a length safe for an email subject line. */
function truncateForSubject(s: string, max = 60): string {
  const cleaned = s.replace(/\s+/g, ' ').trim();
  return cleaned.length <= max ? cleaned : cleaned.slice(0, max - 1) + '…';
}

/** Escape HTML so error text doesn't break the email layout. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function POST(req: NextRequest) {
  // Auth gate. If the env var isn't set we fail closed rather than open
  // — better to no-op until configured than expose an unauthed endpoint.
  const expected = process.env.BUG_MONITOR_SECRET;
  const provided = req.headers.get('x-bug-monitor-secret');
  if (!expected || provided !== expected) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const events: BugEvent[] = Array.isArray(body) ? body : [body];

    const errors = events.filter(e =>
      e.level === 'error' ||
      e.level === 'fatal' ||
      e.type === 'error' ||
      (typeof e.message === 'string' && /error|exception|failed|crash/i.test(e.message))
    );

    if (errors.length === 0) {
      return NextResponse.json({ ok: true, message: 'No errors' });
    }

    const errorText = errors
      .map(e => e.message || e.body || JSON.stringify(e))
      .join('\n')
      .slice(0, 2000);

    // Rate-limit: same error fingerprint, only 1 email per 5 min.
    const dedupeKey = fingerprint(errorText);
    try {
      const cached = await kv.get(dedupeKey);
      if (cached) {
        return NextResponse.json({
          ok: true,
          message: 'Suppressed (recent duplicate)',
          dedupeKey,
        });
      }
    } catch { /* KV miss → proceed */ }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ ok: false, error: 'ANTHROPIC_API_KEY not set' }, { status: 500 });
    }

    // System prompt is stable across requests — cache it (saves input
    // tokens on every call after the first within the cache window).
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 300,
        system: [
          {
            type: 'text',
            text: 'You are a bug analyst for JetMeAway, a UK travel comparison platform (Next.js, Vercel Edge, LiteAPI hotels, Duffel flights, Stripe, Twilio IVR). Given a production error, explain in 2 short sentences: (1) what went wrong, (2) the most likely fix. Be specific and actionable. No filler.',
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{ role: 'user', content: 'Error: ' + errorText }],
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      console.error('[bug-monitor] Claude API error', claudeRes.status, errText.slice(0, 200));
      return NextResponse.json(
        { ok: false, error: 'Claude API failed', status: claudeRes.status },
        { status: 502 },
      );
    }

    const claudeData = await claudeRes.json();
    const summary: string = claudeData?.content?.[0]?.text || 'Could not analyse error.';

    const RESEND_KEY = process.env.RESEND_API_KEY;
    // Soft-fail when Resend env is missing — still return the analysis
    // so the caller can capture it from the response body.
    if (!RESEND_KEY) {
      console.warn('[bug-monitor] RESEND_API_KEY missing — analysed but email skipped');
      try { await kv.set(dedupeKey, '1', { ex: SMS_DEDUPE_TTL }); } catch {}
      return NextResponse.json({
        ok: true,
        message: 'Analysed but email skipped (Resend not configured)',
        summary,
      });
    }

    const subject = '🐛 JetMeAway Bug — ' + truncateForSubject(summary);
    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:640px;color:#1A1D2B;">
        <h2 style="color:#dc2626;margin:0 0 8px;">JetMeAway production error</h2>
        <p style="color:#5C6378;margin:0 0 24px;font-size:.85rem;">Auto-detected by /api/bug-monitor · ${new Date().toUTCString()}</p>

        <h3 style="margin:24px 0 8px;font-size:.95rem;">Claude analysis</h3>
        <div style="background:#F8FAFC;border:1px solid #E8ECF4;border-radius:12px;padding:16px;line-height:1.5;">
          ${escapeHtml(summary).replace(/\n/g, '<br>')}
        </div>

        <h3 style="margin:24px 0 8px;font-size:.95rem;">Raw error</h3>
        <pre style="background:#0F1119;color:#F8FAFC;border-radius:12px;padding:16px;font-size:.78rem;line-height:1.5;overflow-x:auto;white-space:pre-wrap;word-break:break-word;">${escapeHtml(errorText)}</pre>

        <p style="color:#8E95A9;margin-top:24px;font-size:.78rem;">
          Dedupe key: <code>${dedupeKey}</code> · suppressed for 5 minutes after this email.
        </p>
      </div>
    `;

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: ALERT_FROM,
        to: [ALERT_TO],
        subject,
        html,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error('[bug-monitor] Resend API error', resendRes.status, errText.slice(0, 200));
      return NextResponse.json(
        { ok: false, error: 'Resend API failed', status: resendRes.status, summary },
        { status: 502 },
      );
    }

    // Only set the dedupe key after both Claude + Resend succeeded —
    // means a transient downstream failure won't suppress retries.
    try { await kv.set(dedupeKey, '1', { ex: SMS_DEDUPE_TTL }); } catch {}

    return NextResponse.json({ ok: true, message: 'Bug reported via email', summary });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[bug-monitor] handler error:', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/** Health check — public, no secret required. Lets monitoring tools
 *  ping this endpoint without revealing the secret. */
export async function GET() {
  return NextResponse.json({ ok: true, message: 'Bug monitor is active' });
}
