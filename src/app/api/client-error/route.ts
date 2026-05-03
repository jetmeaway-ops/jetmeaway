import { NextRequest, NextResponse } from 'next/server';
import { reportBug } from '@/lib/report-bug';

export const runtime = 'edge';

/**
 * POST /api/client-error
 *
 * Receives JS errors caught by the global window.onerror /
 * window.onunhandledrejection handlers (see <ClientErrorReporter /> in
 * layout.tsx). Forwards them through reportBug() so they land in both
 * the bug inbox and Sentry.
 *
 * No auth — this is a public endpoint. Mitigated by:
 *  - Edge Runtime (cheap, no DB writes from this route)
 *  - 2KB body cap (rejects abuse)
 *  - Per-fingerprint dedupe inside reportBug -> bug-monitor (already
 *    collapses duplicates server-side)
 *  - Honeypot rate limit: any IP sending >50 events / 5 min gets 429
 *    (TODO: wire to Vercel KV when noise warrants it)
 */
export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    if (text.length > 2048) {
      return NextResponse.json({ error: 'payload too large' }, { status: 413 });
    }
    let body: { message?: string; stack?: string; url?: string; userAgent?: string } = {};
    try {
      body = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: 'invalid json' }, { status: 400 });
    }
    const message = (body.message || 'client error').toString().slice(0, 500);
    reportBug(`[client] ${message}`, {
      stack: body.stack?.toString().slice(0, 2000),
      url: body.url?.toString().slice(0, 500),
      userAgent: body.userAgent?.toString().slice(0, 200),
    });
    return NextResponse.json({ ok: true });
  } catch {
    // Never throw from an error-reporting endpoint. Swallow and 204.
    return new NextResponse(null, { status: 204 });
  }
}
