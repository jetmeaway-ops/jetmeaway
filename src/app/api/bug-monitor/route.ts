import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const runtime = 'edge';

/**
 * Bug monitor — receives Vercel log-drain (or any error webhook) events,
 * filters for actual errors, asks Claude for a 2-sentence root-cause +
 * fix summary, then SMS-pings the owner via Twilio.
 *
 * HARDENING (2026-04-29):
 *  - Auth: requires `x-bug-monitor-secret` header matching env var.
 *    Without this, anyone could hit the endpoint and burn through our
 *    Anthropic + Twilio credit.
 *  - Rate limit: same error fingerprint suppressed for 5 min so a burst
 *    of identical errors doesn't flood the phone with SMS.
 *  - Prompt cache: system prompt is stable, so we tag it with
 *    cache_control to cut input-token cost on repeated invocations.
 *  - Current model: claude-sonnet-4-5 (was the retired
 *    claude-3-5-sonnet-20241022 in the original .js draft).
 *  - TypeScript + typed event shape.
 *  - Soft-fail: if Twilio env vars are missing we still analyse the
 *    error and return the summary, just skip the SMS leg.
 *
 * Required env vars on Vercel:
 *  - ANTHROPIC_API_KEY
 *  - BUG_MONITOR_SECRET (any random string; set the same value in
 *    whatever's posting to this endpoint)
 *  - TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_FROM /
 *    TWILIO_PHONE_TO (optional — SMS leg skipped if any are missing)
 */

const CLAUDE_MODEL = 'claude-sonnet-4-5';
const SMS_DEDUPE_TTL = 60 * 5; // 5 min — same error fingerprint suppressed

interface BugEvent {
  level?: string;
  type?: string;
  message?: string;
  body?: string;
  [k: string]: unknown;
}

/** Stable hash for SMS de-dup. Same error text → same key → no spam. */
function fingerprint(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return `bug:dedupe:${Math.abs(hash)}`;
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

    // Rate-limit: same error fingerprint, only 1 SMS per 5 min.
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

    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE_FROM;
    const to = process.env.TWILIO_PHONE_TO;

    // Soft-fail when Twilio env is incomplete — still return the analysis
    // so the caller (or a Vercel function-log retention layer) can capture
    // it even without SMS.
    if (!sid || !token || !from || !to) {
      console.warn('[bug-monitor] Twilio env missing — analysed but SMS skipped');
      try { await kv.set(dedupeKey, '1', { ex: SMS_DEDUPE_TTL }); } catch {}
      return NextResponse.json({
        ok: true,
        message: 'Analysed but SMS skipped (Twilio not configured)',
        summary,
      });
    }

    const smsBody = 'JetMeAway Bug: ' + summary;
    const twilioRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + btoa(sid + ':' + token),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ From: from, To: to, Body: smsBody }).toString(),
      },
    );

    if (!twilioRes.ok) {
      const errText = await twilioRes.text();
      console.error('[bug-monitor] Twilio API error', twilioRes.status, errText.slice(0, 200));
      return NextResponse.json(
        { ok: false, error: 'Twilio API failed', status: twilioRes.status, summary },
        { status: 502 },
      );
    }

    // Only set the dedupe key after both Claude + Twilio succeeded —
    // means a transient downstream failure won't suppress retries of
    // the same error.
    try { await kv.set(dedupeKey, '1', { ex: SMS_DEDUPE_TTL }); } catch {}

    return NextResponse.json({ ok: true, message: 'Bug reported via SMS', summary });
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
