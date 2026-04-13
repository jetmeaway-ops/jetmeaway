import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';
// @ts-expect-error -- web-push has no type declarations
import webpush from 'web-push';

// This route uses Node.js runtime (web-push needs Node crypto)
export const runtime = 'nodejs';

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';

webpush.setVapidDetails(
  'mailto:waqar@jetmeaway.co.uk',
  VAPID_PUBLIC,
  VAPID_PRIVATE,
);

/**
 * POST /api/push/send — Send a push notification to all subscribers.
 * Protected by a simple secret header.
 *
 * Body: { title, body, url? }
 * Header: x-push-secret: <PUSH_SECRET>
 */
export async function POST(req: NextRequest) {
  // Simple auth check
  const secret = req.headers.get('x-push-secret');
  if (!secret || secret !== process.env.PUSH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { title, body, url } = await req.json();
    if (!title || !body) {
      return NextResponse.json({ error: 'Missing title or body' }, { status: 400 });
    }

    // Get all subscription keys
    const keys: string[] = await kv.smembers('push-subs');
    if (!keys.length) {
      return NextResponse.json({ sent: 0, failed: 0, message: 'No subscribers' });
    }

    const payload = JSON.stringify({ title, body, url: url || '/' });

    let sent = 0;
    let failed = 0;
    const staleKeys: string[] = [];

    await Promise.allSettled(
      keys.map(async (key) => {
        const raw = await kv.get<string>(key);
        if (!raw) {
          staleKeys.push(key);
          return;
        }

        const sub = typeof raw === 'string' ? JSON.parse(raw) : raw;

        try {
          await webpush.sendNotification(sub, payload);
          sent++;
        } catch (err: any) {
          // 404 or 410 = subscription expired/invalid
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            staleKeys.push(key);
            await kv.del(key);
          }
          failed++;
        }
      })
    );

    // Clean up stale keys from the set
    if (staleKeys.length > 0) {
      await Promise.all(staleKeys.map(k => kv.srem('push-subs', k)));
    }

    return NextResponse.json({ sent, failed, cleaned: staleKeys.length });
  } catch (err: any) {
    console.error('[push/send]', err?.message);
    return NextResponse.json({ error: 'Failed to send notifications' }, { status: 500 });
  }
}
