import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { Resend } from 'resend';
import { requireAdmin } from '@/lib/admin-auth';

export const runtime = 'edge';

/**
 * Weekly price-drop alert digest.
 *
 * Flow:
 *  1. Fetch current hot deals from the cached `/api/flights/deals` endpoint.
 *  2. Load last-seen baseline prices from KV (keyed by route).
 *  3. For each route, compute % drop vs baseline; keep drops ≥ 5%.
 *  4. If any drops found, send a digest email to every subscriber.
 *  5. Update the baseline to current prices for the next run.
 *
 * Triggers:
 *  • Vercel cron (adds `x-vercel-cron: 1`) — weekly schedule.
 *  • Admin-only POST for manual firing (requires Authorization bearer).
 *
 * Never auto-mails on anonymous GET — would leak the mailing list and allow
 * random visitors to drain the Resend quota.
 */

const BASELINE_KEY = 'flight-deal-prices:baseline';
const LAST_SEND_KEY = 'flight-deal-prices:last-send';
const MIN_DROP_PERCENT = 5;
const MAX_DEALS_IN_EMAIL = 6;

type Deal = {
  dest: string;
  city: string;
  country: string;
  flag: string;
  price: number;
  airline: string;
  departureDate: string;
};

type Baseline = Record<string, { price: number; checkedAt: string }>;

type Drop = Deal & { oldPrice: number; dropPct: number };

async function runDigest(base: string): Promise<{
  status: 'sent' | 'no-drops' | 'no-subscribers' | 'no-deals';
  drops: Drop[];
  sent?: number;
  failed?: number;
}> {
  // 1. Fetch current deals (reuses the 6h cache — no fresh TP calls)
  const dealsRes = await fetch(`${base}/api/flights/deals`);
  if (!dealsRes.ok) throw new Error(`deals endpoint ${dealsRes.status}`);
  const { deals } = (await dealsRes.json()) as { deals: Deal[] };
  if (!deals || deals.length === 0) {
    return { status: 'no-deals', drops: [] };
  }

  // 2. Compare to baseline
  const baseline = ((await kv.get<Baseline>(BASELINE_KEY)) || {}) as Baseline;
  const drops: Drop[] = [];
  for (const d of deals) {
    const prev = baseline[d.dest];
    if (prev && prev.price > 0) {
      const dropPct = ((prev.price - d.price) / prev.price) * 100;
      if (dropPct >= MIN_DROP_PERCENT) {
        drops.push({ ...d, oldPrice: prev.price, dropPct });
      }
    }
  }
  drops.sort((a, b) => b.dropPct - a.dropPct);
  const top = drops.slice(0, MAX_DEALS_IN_EMAIL);

  // 3. Always refresh baseline so we don't repeatedly alert on the same drop
  const nextBaseline: Baseline = { ...baseline };
  const now = new Date().toISOString();
  for (const d of deals) nextBaseline[d.dest] = { price: d.price, checkedAt: now };
  await kv.set(BASELINE_KEY, nextBaseline);

  if (top.length === 0) return { status: 'no-drops', drops: [] };

  // 4. Send digest
  const subscribers = (await kv.get<string[]>('deal_alert_subscribers')) || [];
  if (subscribers.length === 0) return { status: 'no-subscribers', drops: top };

  const resendKey = process.env.RESEND_API_KEY || '';
  if (!resendKey) throw new Error('RESEND_API_KEY missing');
  const resend = new Resend(resendKey);

  const subject = `✈️ ${top[0].city} dropped ${Math.round(top[0].dropPct)}% — ${top.length - 1} more deals inside`;
  const html = renderDigest(top);

  let sent = 0;
  let failed = 0;
  // Send one-by-one rather than BCC so each recipient sees only their own address
  // and can unsubscribe. Resend handles rate-limiting.
  for (const email of subscribers) {
    try {
      await resend.emails.send({
        from: 'JetMeAway Deals <deals@jetmeaway.co.uk>',
        to: email,
        subject,
        html: html.replace('{{UNSUB_EMAIL}}', encodeURIComponent(email)),
      });
      sent++;
    } catch {
      failed++;
    }
  }

  await kv.set(LAST_SEND_KEY, { at: now, sent, failed, dropCount: top.length });
  return { status: 'sent', drops: top, sent, failed };
}

function renderDigest(drops: Drop[]): string {
  const cards = drops
    .map(
      d => `
  <tr><td style="padding:0 0 12px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E8ECF4;border-radius:14px;background:#fff;">
      <tr>
        <td style="padding:18px 22px;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:800;color:#059669;letter-spacing:2px;text-transform:uppercase;">
            ↓ ${Math.round(d.dropPct)}% cheaper than last week
          </p>
          <p style="margin:0 0 6px;font-size:20px;font-weight:900;color:#1A1D2B;">
            ${d.flag} London → ${d.city}, ${d.country}
          </p>
          <p style="margin:0 0 10px;font-size:13px;color:#5C6378;font-weight:600;">
            ${d.airline} · from ${d.departureDate || 'flexible dates'}
          </p>
          <p style="margin:0 0 14px;font-size:13px;color:#8E95A9;">
            Was £${d.oldPrice} · Now
            <span style="font-size:22px;font-weight:900;color:#0066FF;">£${d.price}</span>
          </p>
          <a href="https://jetmeaway.co.uk/flights?origin=LON&destination=${d.dest}&source=deal-alert"
             style="display:inline-block;background:#0066FF;color:#fff;text-decoration:none;font-weight:800;font-size:13px;padding:10px 18px;border-radius:10px;">
            See this deal →
          </a>
        </td>
      </tr>
    </table>
  </td></tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 20px;">
    <div style="text-align:center;margin-bottom:24px;">
      <img src="https://jetmeaway.co.uk/jetmeaway-logo.png" alt="JetMeAway" width="150" style="display:inline-block;border:0;" />
      <p style="font-size:12px;color:#8E95A9;margin:6px 0 0;letter-spacing:2px;text-transform:uppercase;font-weight:700;">Price Drop Alert</p>
    </div>
    <h1 style="font-size:24px;font-weight:900;color:#1A1D2B;margin:0 0 8px;">Prices just dropped on your watchlist</h1>
    <p style="font-size:14px;color:#5C6378;margin:0 0 24px;line-height:1.5;">
      We scout 20 popular routes from London every six hours. These dropped at least ${MIN_DROP_PERCENT}%
      versus last week — grab them before they bounce back.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">${cards}</table>
    <p style="margin:24px 0 6px;font-size:13px;color:#5C6378;text-align:center;">
      <a href="https://jetmeaway.co.uk/flights" style="color:#0066FF;font-weight:700;text-decoration:none;">See all deals on jetmeaway.co.uk →</a>
    </p>
    <div style="text-align:center;padding:20px 0 0;border-top:1px solid #E8ECF4;margin-top:24px;">
      <p style="font-size:11px;color:#B0B8CC;margin:0 0 4px;">
        You're receiving this because you signed up for deal alerts on jetmeaway.co.uk
      </p>
      <p style="font-size:11px;color:#B0B8CC;margin:0;">
        <a href="https://jetmeaway.co.uk/api/deal-alerts/unsubscribe?email={{UNSUB_EMAIL}}" style="color:#8E95A9;">Unsubscribe</a>
        · JETMEAWAY LTD · 66 Paul Street, London
      </p>
    </div>
  </div>
</body></html>`;
}

export async function GET(req: NextRequest) {
  // Only Vercel cron may fire this on GET. Everyone else gets 401 — prevents
  // mailing-list drain from a random visitor hitting the URL.
  const isCron = req.headers.get('x-vercel-cron') === '1';
  if (!isCron) {
    const unauth = requireAdmin(req);
    if (unauth) return unauth;
  }

  try {
    const base = req.nextUrl.origin;
    const result = await runDigest(base);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'send failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const unauth = requireAdmin(req);
  if (unauth) return unauth;
  try {
    const base = req.nextUrl.origin;
    const result = await runDigest(base);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'send failed' }, { status: 500 });
  }
}
