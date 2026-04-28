import { NextResponse } from ‘next/server’;

export const runtime = ‘edge’;

export async function POST(req) {
try {
const body = await req.json();

```
// Handle both array and object payloads from Vercel Log Drain
const events = Array.isArray(body) ? body : [body];

// Filter for errors only
const errors = events.filter(e =>
  e.level === 'error' ||
  e.level === 'fatal' ||
  e.type === 'error' ||
  (e.message && /error|exception|failed|crash/i.test(e.message))
);

if (errors.length === 0) {
  return NextResponse.json({ ok: true, message: 'No errors' });
}

const errorText = errors
  .map(e => e.message || e.body || JSON.stringify(e))
  .join('\n')
  .slice(0, 2000);

// Ask Claude to analyse the error
const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `You are a bug analyst for Jetmeaway, a Next.js travel comparison website. 
```

A runtime error was detected on the live site. In 2-3 sentences max, explain what went wrong and how to fix it. Be very concise.

Error:
${errorText}`
}]
})
});

```
const claudeData = await claudeRes.json();
const summary = claudeData?.content?.[0]?.text || 'Could not analyse error.';

// Send SMS via Twilio
const sid = process.env.TWILIO_ACCOUNT_SID;
const token = process.env.TWILIO_AUTH_TOKEN;
const from = process.env.TWILIO_PHONE_FROM;
const to = process.env.TWILIO_PHONE_TO;

const smsBody = `🚨 Jetmeaway Bug\n\n${summary}\n\nCheck Vercel logs for details.`;

await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
  method: 'POST',
  headers: {
    'Authorization': 'Basic ' + btoa(`${sid}:${token}`),
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  body: new URLSearchParams({ From: from, To: to, Body: smsBody })
});

return NextResponse.json({ ok: true, message: 'Bug reported via SMS' });
```

} catch (err) {
return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
}
}

export async function GET() {
return NextResponse.json({ ok: true, message: ‘Bug monitor is active’ });
}