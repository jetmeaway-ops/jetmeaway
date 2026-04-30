import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { Resend } from 'resend';

export const runtime = 'edge';

const RESEND_KEY = process.env.RESEND_API_KEY || '';
const FROM_ADDRESS = 'JetMeAway Deals <deals@jetmeaway.co.uk>';
const SITE_ORIGIN = 'https://jetmeaway.co.uk';

/**
 * Lead-magnet endpoint for blog PDF downloads. Email-gates the download
 * and double-converts the lead by also opting them into the main deal-
 * alerts list. Per-slug list lets us segment future re-marketing (e.g.
 * "everyone who downloaded the Seville guide" → Seville flight deals).
 *
 * Sources of truth:
 *   - Per-slug list:    KV `pdf-leads:${slug}`  (string[] of emails)
 *   - Combined list:    KV `deal_alert_subscribers` (existing, shared with /api/subscribe)
 *
 * The PDF itself lives at `public/downloads/${slug}.pdf` and is served
 * statically by Vercel's CDN. We email the URL — no per-token gating —
 * because the lead value is the email capture, not the file scarcity.
 */

function buildPdfEmailHtml({ email, city, slug, title }: { email: string; city: string; slug: string; title: string }): string {
  const pdfUrl = `${SITE_ORIGIN}/downloads/${slug}.pdf`;
  const blogUrl = `${SITE_ORIGIN}/blog/${slug}`;
  const hotelsUrl = `${SITE_ORIGIN}/hotels?city=${encodeURIComponent(city)}`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Your ${city} Intelligence Report</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1A1D2B;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:40px 32px;box-shadow:0 8px 24px -12px rgba(0,0,0,0.08);">
        <tr><td>
          <p style="margin:0 0 8px 0;font-size:11px;font-weight:800;letter-spacing:2.5px;text-transform:uppercase;color:#0066FF;">Your download</p>
          <h1 style="margin:0 0 20px 0;font-size:26px;font-weight:900;line-height:1.15;color:#0a1628;">${title}</h1>
          <p style="margin:0 0 24px 0;font-size:16px;line-height:1.55;color:#374151;">Here's your printable PDF — every hotel, every neighbourhood, every booking tip we covered, in one document. Click below to open or save it:</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px 0;">
            <tr>
              <td style="background:#0066FF;border-radius:10px;">
                <a href="${pdfUrl}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-weight:900;font-size:14px;text-decoration:none;border-radius:10px;">Download the PDF &rarr;</a>
              </td>
            </tr>
          </table>
          <hr style="margin:24px 0;border:none;border-top:1px solid #E8ECF4;" />
          <p style="margin:0 0 12px 0;font-size:15px;line-height:1.55;color:#374151;font-weight:700;">Found a hotel you like?</p>
          <p style="margin:0 0 20px 0;font-size:15px;line-height:1.55;color:#374151;">Compare live ${city} prices across 15+ trusted providers — no booking fees, no markups, no follow-up spam.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px 0;">
            <tr>
              <td style="background:#ffffff;border:1px solid #0066FF;border-radius:10px;">
                <a href="${hotelsUrl}" style="display:inline-block;padding:12px 24px;color:#0066FF;font-weight:800;font-size:14px;text-decoration:none;border-radius:10px;">Compare ${city} Hotels &rarr;</a>
              </td>
              <td style="width:8px;"></td>
              <td style="background:#ffffff;border:1px solid #E8ECF4;border-radius:10px;">
                <a href="${blogUrl}" style="display:inline-block;padding:12px 24px;color:#5C6378;font-weight:800;font-size:14px;text-decoration:none;border-radius:10px;">Re-read the Guide &rarr;</a>
              </td>
            </tr>
          </table>
          <p style="margin:0 0 8px 0;font-size:13px;line-height:1.55;color:#5C6378;">You're now on our deal alerts — we only email when there's a genuinely good deal worth your inbox. Reply with the word &quot;unsubscribe&quot; any time to opt out.</p>
          <p style="margin:24px 0 0 0;font-size:13px;color:#5C6378;">&mdash; The JetMeAway team</p>
          <hr style="margin:28px 0 16px 0;border:none;border-top:1px solid #E8ECF4;" />
          <p style="margin:0;font-size:11px;color:#8E95A9;line-height:1.6;">JETMEAWAY LTD &middot; Company No. 17140522 &middot; 66 Paul Street, London EC2A 4NA<br />Sent to <strong>${email}</strong> because you requested the PDF at jetmeaway.co.uk.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendPdfEmail(args: { email: string; city: string; slug: string; title: string }): Promise<boolean> {
  if (!RESEND_KEY) {
    console.warn('pdf-download: RESEND_API_KEY not set, skipping send');
    return false;
  }
  try {
    const resend = new Resend(RESEND_KEY);
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: args.email,
      subject: `Your ${args.city} Intelligence Report PDF`,
      html: buildPdfEmailHtml(args),
      replyTo: 'contact@jetmeaway.co.uk',
    });
    return true;
  } catch (err) {
    console.error('pdf-download: email send failed', err);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
    const city = typeof body.city === 'string' ? body.city.trim() : '';

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }
    // Slug allow-list pattern: letters, digits, hyphens. Rejects path traversal.
    if (!slug || !/^[a-z0-9-]{3,80}$/.test(slug)) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }
    if (!city || city.length > 60) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    // Per-slug list — for future per-city re-marketing.
    const perSlugKey = `pdf-leads:${slug}`;
    const slugList = (await kv.get<string[]>(perSlugKey)) || [];
    if (!slugList.includes(email)) {
      slugList.push(email);
      await kv.set(perSlugKey, slugList);
    }

    // Combined deal-alerts list — same key /api/subscribe writes to.
    const combined = (await kv.get<string[]>('deal_alert_subscribers')) || [];
    if (!combined.includes(email)) {
      combined.push(email);
      await kv.set('deal_alert_subscribers', combined);
    }

    // Title is derived from city for the email subject; keeps the API
    // surface narrow (no client-controlled email subject text).
    const title = `${city} Intelligence Report`;
    const sent = await sendPdfEmail({ email, city, slug, title });

    return NextResponse.json({ success: true, emailSent: sent });
  } catch (err) {
    console.error('pdf-download: route error', err);
    return NextResponse.json({ error: 'Could not process your request.' }, { status: 500 });
  }
}
