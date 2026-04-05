import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { MARKUP_GBP } from '@/lib/travel-logic';

export const runtime = 'edge';

const RESEND_KEY = process.env.RESEND_API_KEY || '';

/**
 * POST /api/test-email
 * Sends a test booking confirmation email to verify Resend integration.
 * Body: { to: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { to } = await req.json();
    if (!to) return NextResponse.json({ error: 'Missing "to" email' }, { status: 400 });
    if (!RESEND_KEY) return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 503 });

    // Mock booking data
    const bookingReference = 'JMA-TEST-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    const airlineName = 'British Airways';
    const origin = 'LHR';
    const originCity = 'London';
    const dest = 'BCN';
    const destCity = 'Barcelona';
    const depTime = '08:45';
    const arrTime = '12:10';
    const depDate = 'Fri, 15 May 2026';
    const retDepTime = '17:30';
    const retArrTime = '18:55';
    const retDate = 'Tue, 19 May 2026';
    const duration = '2h 25m';
    const stops = 'Direct';
    const paxName = 'John Smith';
    const paxDob = '1990-05-15';
    const basePerPerson = 142.50;
    const totalPerPerson = basePerPerson + MARKUP_GBP;
    const totalAll = totalPerPerson;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 20px;">

    <div style="text-align:center;margin-bottom:32px;">
      <img src="https://jetmeaway.co.uk/jetmeaway-logo.png" alt="JetMeAway" width="160" style="display:inline-block;height:auto;max-width:160px;border:0;outline:none;text-decoration:none;" />
      <p style="font-size:13px;color:#8E95A9;margin:8px 0 0;">Your travel scout</p>
    </div>

    <div style="background:linear-gradient(135deg,#059669,#10B981);border-radius:16px;padding:24px;text-align:center;margin-bottom:24px;">
      <h2 style="font-size:20px;font-weight:800;color:#fff;margin:0 0 4px;">Booking Confirmed!</h2>
      <p style="font-size:13px;color:rgba(255,255,255,0.85);margin:0;">Your e-ticket will be sent separately by ${airlineName}</p>
    </div>

    <div style="background:#fff;border:1px solid #E8ECF4;border-radius:16px;padding:20px;margin-bottom:16px;">
      <p style="font-size:11px;font-weight:700;color:#8E95A9;text-transform:uppercase;letter-spacing:2px;margin:0 0 4px;">Booking Reference</p>
      <p style="font-size:22px;font-weight:800;color:#1A1D2B;margin:0;letter-spacing:1px;">${bookingReference}</p>
    </div>

    <div style="background:#fff;border:1px solid #E8ECF4;border-radius:16px;padding:20px;margin-bottom:16px;">
      <p style="font-size:11px;font-weight:700;color:#8E95A9;text-transform:uppercase;letter-spacing:2px;margin:0 0 12px;">Outbound Flight</p>
      <p style="font-size:14px;font-weight:700;color:#5C6378;margin:0 0 8px;">${airlineName} &middot; ${stops}</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:22px;font-weight:800;color:#1A1D2B;">${depTime} ${origin}</td>
          <td style="text-align:center;font-size:12px;color:#8E95A9;">${duration}</td>
          <td style="text-align:right;font-size:22px;font-weight:800;color:#1A1D2B;">${arrTime} ${dest}</td>
        </tr>
      </table>
      <p style="font-size:13px;color:#5C6378;margin:8px 0 0;">${originCity} &rarr; ${destCity}</p>
      <p style="font-size:12px;color:#8E95A9;margin:4px 0 0;">${depDate}</p>

      <div style="margin-top:16px;padding-top:16px;border-top:1px solid #E8ECF4;">
        <p style="font-size:11px;font-weight:700;color:#8E95A9;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px;">Return Flight</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:18px;font-weight:800;color:#1A1D2B;">${retDepTime} ${dest}</td>
            <td style="text-align:center;font-size:12px;color:#8E95A9;">${duration}</td>
            <td style="text-align:right;font-size:18px;font-weight:800;color:#1A1D2B;">${retArrTime} ${origin}</td>
          </tr>
        </table>
        <p style="font-size:12px;color:#8E95A9;margin:4px 0 0;">${retDate}</p>
      </div>
    </div>

    <div style="background:#fff;border:1px solid #E8ECF4;border-radius:16px;padding:20px;margin-bottom:16px;">
      <p style="font-size:11px;font-weight:700;color:#8E95A9;text-transform:uppercase;letter-spacing:2px;margin:0 0 12px;">Passengers</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <th style="text-align:left;padding:8px 12px;font-size:11px;font-weight:700;color:#8E95A9;border-bottom:2px solid #E8ECF4;">Name</th>
          <th style="text-align:left;padding:8px 12px;font-size:11px;font-weight:700;color:#8E95A9;border-bottom:2px solid #E8ECF4;">DOB</th>
        </tr>
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #F1F3F7;font-size:14px;color:#1A1D2B;">1. ${paxName}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #F1F3F7;font-size:14px;color:#5C6378;">${paxDob}</td>
        </tr>
      </table>
    </div>

    <div style="background:#fff;border:1px solid #E8ECF4;border-radius:16px;padding:20px;margin-bottom:24px;">
      <p style="font-size:11px;font-weight:700;color:#8E95A9;text-transform:uppercase;letter-spacing:2px;margin:0 0 12px;">Price Summary</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#5C6378;">Flight (per person)</td>
          <td style="padding:6px 0;font-size:14px;font-weight:700;color:#1A1D2B;text-align:right;">&pound;${basePerPerson.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#5C6378;">JetMeAway fee</td>
          <td style="padding:6px 0;font-size:14px;font-weight:700;color:#1A1D2B;text-align:right;">&pound;${MARKUP_GBP.toFixed(2)}</td>
        </tr>
        <tr>
          <td colspan="2" style="border-top:2px solid #E8ECF4;padding:12px 0 0;"></td>
        </tr>
        <tr>
          <td style="font-size:16px;font-weight:800;color:#1A1D2B;">Total Paid</td>
          <td style="font-size:20px;font-weight:800;color:#059669;text-align:right;">&pound;${totalAll.toFixed(2)}</td>
        </tr>
      </table>
    </div>

    <div style="text-align:center;padding:16px 0;border-top:1px solid #E8ECF4;">
      <p style="font-size:12px;color:#8E95A9;margin:0 0 4px;">Questions? Contact us at <a href="mailto:waqar@jetmeaway.co.uk" style="color:#0066FF;">waqar@jetmeaway.co.uk</a></p>
      <p style="font-size:11px;color:#B0B8CC;margin:0;">JetMeAway &middot; jetmeaway.co.uk &middot; [TEST EMAIL]</p>
    </div>

  </div>
</body>
</html>`;

    const resend = new Resend(RESEND_KEY);
    const result = await resend.emails.send({
      from: 'JetMeAway <bookings@jetmeaway.co.uk>',
      to,
      subject: `[TEST] Booking Confirmed — ${origin} to ${dest} | JetMeAway`,
      html,
    });

    return NextResponse.json({ success: true, result, bookingReference });
  } catch (err: any) {
    console.error('Test email error:', err);
    return NextResponse.json({ error: err.message || 'Failed to send test email' }, { status: 500 });
  }
}
