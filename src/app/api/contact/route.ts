import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { name, email, subject, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const RESEND_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_KEY) {
      console.error('[contact] RESEND_API_KEY not set');
      return NextResponse.json({ error: 'Mail service not configured' }, { status: 500 });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'JetMeAway Contact <noreply@jetmeaway.co.uk>',
        to: ['waqar@jetmeaway.co.uk'],
        reply_to: email,
        subject: `[Contact] ${subject || 'General Enquiry'} — ${name}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;">
            <h2 style="color:#0066FF;">New Contact Form Submission</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject || 'General Enquiry'}</p>
            <hr style="border:none;border-top:1px solid #eee;margin:16px 0;" />
            <p><strong>Message:</strong></p>
            <p style="white-space:pre-wrap;">${message}</p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('[contact] Resend error:', body);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[contact]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
