import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { Resend } from 'resend';
import { requireAdmin } from '@/lib/admin-auth';

const RESEND_KEY = process.env.RESEND_API_KEY || '';
// Matches the sender already used by /api/deal-alerts/send (no new
// DNS / Resend domain verification needed).
const FROM_ADDRESS = 'JetMeAway Deals <deals@jetmeaway.co.uk>';

/** Plain-text-friendly HTML welcome email. Looks fine in any client
 *  including Gmail's text view, Outlook plain mode, and Apple Mail. */
function buildWelcomeHtml(email: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Welcome to JetMeAway Deal Alerts</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1A1D2B;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:40px 32px;box-shadow:0 8px 24px -12px rgba(0,0,0,0.08);">
        <tr><td>
          <p style="margin:0 0 8px 0;font-size:11px;font-weight:800;letter-spacing:2.5px;text-transform:uppercase;color:#c2410c;">Welcome aboard</p>
          <h1 style="margin:0 0 20px 0;font-size:26px;font-weight:900;line-height:1.15;color:#0a1628;">You're on the list.</h1>
          <p style="margin:0 0 16px 0;font-size:16px;line-height:1.55;color:#374151;">Thanks for joining JetMeAway Deal Alerts. We'll only email when there's a genuinely good UK travel deal worth your inbox &mdash; never spam, never sold on.</p>
          <p style="margin:0 0 20px 0;font-size:16px;line-height:1.55;color:#374151;">Here's what's coming your way:</p>
          <ul style="margin:0 0 24px 0;padding:0 0 0 20px;color:#374151;font-size:15px;line-height:1.75;">
            <li>Flash hotel rates from 15+ trusted providers</li>
            <li>Cheap flight windows our scouts spot before the algorithms do</li>
            <li>Niche guides for Pakistan, Baku, Cabo Verde, eSIMs, halal travel and more</li>
          </ul>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px 0;">
            <tr>
              <td style="background:#c2410c;border-radius:10px;">
                <a href="https://jetmeaway.co.uk/hotels" style="display:inline-block;padding:14px 28px;color:#ffffff;font-weight:900;font-size:14px;text-decoration:none;border-radius:10px;">Compare Hotels Now &rarr;</a>
              </td>
              <td style="width:8px;"></td>
              <td style="background:#ffffff;border:1px solid #E8ECF4;border-radius:10px;">
                <a href="https://jetmeaway.co.uk/flights" style="display:inline-block;padding:14px 28px;color:#0066FF;font-weight:800;font-size:14px;text-decoration:none;border-radius:10px;">Search Flights &rarr;</a>
              </td>
            </tr>
          </table>
          <p style="margin:0 0 8px 0;font-size:13px;line-height:1.55;color:#5C6378;">A real human reads every reply &mdash; if you ever want a custom price hunt for a route or a hotel, just hit reply to this email.</p>
          <p style="margin:24px 0 0 0;font-size:13px;color:#5C6378;">&mdash; The JetMeAway team</p>
          <hr style="margin:28px 0 16px 0;border:none;border-top:1px solid #E8ECF4;" />
          <p style="margin:0;font-size:11px;color:#8E95A9;line-height:1.6;">JETMEAWAY LTD &middot; Company No. 17140522 &middot; 66 Paul Street, London EC2A 4NA<br />You're receiving this because <strong>${email}</strong> signed up at jetmeaway.co.uk. To unsubscribe, just reply with the word "unsubscribe".</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Fire-and-forget welcome email. Never fails the subscription if email
 *  send fails — the subscriber is already in the KV list, the email is
 *  the cherry on top. Failure is logged for monitoring. */
async function sendWelcomeEmail(email: string): Promise<boolean> {
  if (!RESEND_KEY) {
    console.warn('subscribe: RESEND_API_KEY not set, skipping welcome email');
    return false;
  }
  try {
    const resend = new Resend(RESEND_KEY);
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: email,
      subject: "You're in — welcome to JetMeAway Deal Alerts",
      html: buildWelcomeHtml(email),
      replyTo: 'contact@jetmeaway.co.uk',
    });
    return true;
  } catch (err) {
    console.error('subscribe: welcome email failed', err);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const trimmed = email.trim().toLowerCase();

    // Get existing subscribers list
    const subscribers = await kv.get<string[]>('deal_alert_subscribers') || [];

    // Don't add duplicates — and don't re-send the welcome email either
    if (subscribers.includes(trimmed)) {
      return NextResponse.json({ success: true, message: 'Already subscribed' });
    }

    // Add to list and save FIRST — never lose a sub because email failed
    subscribers.push(trimmed);
    await kv.set('deal_alert_subscribers', subscribers);

    // Fire welcome email. If it fails, sub still went through (logged only).
    const emailSent = await sendWelcomeEmail(trimmed);

    return NextResponse.json({
      success: true,
      message: 'Subscribed',
      count: subscribers.length,
      welcomeEmailSent: emailSent,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to subscribe', detail: err.message }, { status: 500 });
  }
}

// ADMIN ONLY — requires Authorization: Bearer <ADMIN_SECRET>
// Lists all subscribers. Previously this was public and leaked the mailing list.
export async function GET(req: NextRequest) {
  const unauth = requireAdmin(req);
  if (unauth) return unauth;

  try {
    const subscribers = await kv.get<string[]>('deal_alert_subscribers') || [];
    return NextResponse.json({ subscribers, count: subscribers.length });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch subscribers', detail: err.message }, { status: 500 });
  }
}
