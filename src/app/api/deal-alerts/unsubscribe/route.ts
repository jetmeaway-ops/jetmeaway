import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const runtime = 'edge';

/**
 * One-click unsubscribe for deal-alert emails. Public by design — the link
 * must work from any email client without login. Idempotent: repeated calls
 * are safe.
 */
export async function GET(req: NextRequest) {
  const email = (req.nextUrl.searchParams.get('email') || '').trim().toLowerCase();
  if (!email) return htmlResponse('Missing email address.');

  try {
    const current = (await kv.get<string[]>('deal_alert_subscribers')) || [];
    const next = current.filter(e => e !== email);
    if (next.length !== current.length) {
      await kv.set('deal_alert_subscribers', next);
    }
    return htmlResponse(
      `You've been unsubscribed. <strong>${escapeHtml(email)}</strong> will no longer receive price-drop alerts.`,
    );
  } catch {
    return htmlResponse('Could not unsubscribe right now. Email contact@jetmeaway.co.uk and we\'ll remove you manually.');
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function htmlResponse(body: string) {
  const page = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Unsubscribed · JetMeAway</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F8FAFC;color:#1A1D2B;}
.wrap{max-width:520px;margin:80px auto;padding:40px 30px;background:#fff;border:1px solid #E8ECF4;border-radius:20px;text-align:center;}
h1{font-size:22px;margin:0 0 14px;}p{color:#5C6378;font-size:15px;line-height:1.55;}a{color:#0066FF;font-weight:700;}</style>
</head><body><div class="wrap"><h1>JetMeAway</h1><p>${body}</p>
<p style="margin-top:28px;"><a href="https://jetmeaway.co.uk">← Back to JetMeAway</a></p></div></body></html>`;
  return new NextResponse(page, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
