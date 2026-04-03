import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const trimmed = email.trim().toLowerCase();

    // Get existing subscribers list
    const subscribers = await kv.get<string[]>('deal_alert_subscribers') || [];

    // Don't add duplicates
    if (subscribers.includes(trimmed)) {
      return NextResponse.json({ success: true, message: 'Already subscribed' });
    }

    // Add to list and save
    subscribers.push(trimmed);
    await kv.set('deal_alert_subscribers', subscribers);

    return NextResponse.json({ success: true, message: 'Subscribed', count: subscribers.length });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to subscribe', detail: err.message }, { status: 500 });
  }
}

// GET endpoint to view all subscribers (for you to check)
export async function GET() {
  try {
    const subscribers = await kv.get<string[]>('deal_alert_subscribers') || [];
    return NextResponse.json({ subscribers, count: subscribers.length });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch subscribers', detail: err.message }, { status: 500 });
  }
}
