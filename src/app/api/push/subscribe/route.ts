import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * POST /api/push/subscribe — Save a push subscription to Vercel KV.
 * Each subscription is stored by its endpoint hash as key.
 */
export async function POST(req: NextRequest) {
  try {
    const sub = await req.json();
    if (!sub?.endpoint) {
      return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });
    }

    // Hash the endpoint to create a unique key
    const encoder = new TextEncoder();
    const data = encoder.encode(sub.endpoint);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    const key = `push-sub:${hash}`;

    // Store subscription with 90-day TTL
    await kv.set(key, JSON.stringify(sub), { ex: 90 * 24 * 60 * 60 });

    // Also add to the set of all subscription keys for easy enumeration
    await kv.sadd('push-subs', key);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[push/subscribe]', err?.message);
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }
}

/**
 * DELETE /api/push/subscribe — Remove a push subscription.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { endpoint } = await req.json();
    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(endpoint);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    const key = `push-sub:${hash}`;

    await kv.del(key);
    await kv.srem('push-subs', key);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[push/unsubscribe]', err?.message);
    return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 });
  }
}
