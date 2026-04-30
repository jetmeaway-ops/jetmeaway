import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { requireAdmin } from '@/lib/admin-auth';
import { readSessionEmail } from '@/lib/session';

export const runtime = 'edge';

/**
 * Push-token registration endpoint for the mobile app (iOS + Android).
 *
 * Called once on first launch from `mobile/src/services/push.ts`. Stores the
 * Expo push token in Vercel KV under two keys:
 *   - `push:tokens` — combined Set of all live tokens (used by future
 *     deal-alert blast jobs to fan out a single notification across all users)
 *   - `push:by-platform:${platform}` — Set partitioned by platform so we can
 *     send platform-specific copy where relevant
 *
 * Returns 200 unconditionally for valid input — duplicate-token re-posts are
 * idempotent. Token format is validated loosely (must look like an Expo
 * push token starting with `ExponentPushToken[`).
 */

const ALL_TOKENS_KEY = 'push:tokens';

type TokenRecord = {
  token: string;
  platform: 'ios' | 'android' | 'web';
  appVersion: string;
  registeredAt: number;
  /** Email of the signed-in user at the moment of registration. Updated
   *  on every re-register call (mobile re-calls this route after sign-in
   *  + sign-out so the binding is always fresh). Empty string when the
   *  device is registered anonymously. */
  email?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    const platform = typeof body.platform === 'string' ? body.platform.trim().toLowerCase() : '';
    const appVersion = typeof body.appVersion === 'string' ? body.appVersion.trim().slice(0, 32) : '';

    if (!token || (!token.startsWith('ExponentPushToken[') && !token.startsWith('ExpoPushToken['))) {
      return NextResponse.json({ error: 'Invalid push token' }, { status: 400 });
    }
    if (platform !== 'ios' && platform !== 'android' && platform !== 'web') {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    }

    // Bind the token to the signed-in user when a session cookie is present.
    // Mobile re-calls this route after every sign-in / sign-out so the
    // (token → email) link stays fresh — no stale bindings to clean up.
    const sessionEmail = await readSessionEmail(req.headers.get('cookie'));

    // If the previous record had a different email, drop the token from the
    // old user's set so a sign-in handover doesn't accidentally cross-fan.
    let priorEmail: string | undefined;
    try {
      const prior = await kv.get<TokenRecord>(`push:token:${token}`);
      priorEmail = prior?.email && prior.email !== sessionEmail ? prior.email : undefined;
    } catch { /* silent */ }
    if (priorEmail) {
      try { await kv.srem(`push:by-email:${priorEmail}`, token); } catch { /* silent */ }
    }

    const record: TokenRecord = {
      token,
      platform: platform as TokenRecord['platform'],
      appVersion,
      registeredAt: Date.now(),
      email: sessionEmail || undefined,
    };

    // Per-token detail under a stable key — overwrites on re-registration.
    await kv.set(`push:token:${token}`, record);

    // Combined live-tokens list — Set semantics via KV's sadd.
    try {
      await kv.sadd(ALL_TOKENS_KEY, token);
    } catch { /* KV client variant — silent */ }

    // Per-platform partition for platform-specific blasts.
    try {
      await kv.sadd(`push:by-platform:${platform}`, token);
    } catch { /* silent */ }

    // Per-email partition. Used by /api/cron/check-saved-searches to target
    // the saved-search owner's devices specifically (not all devices).
    if (sessionEmail) {
      try { await kv.sadd(`push:by-email:${sessionEmail}`, token); } catch { /* silent */ }
    }

    return NextResponse.json({ success: true, linkedToEmail: !!sessionEmail });
  } catch (err) {
    console.error('[push-token] error', err);
    return NextResponse.json({ error: 'Could not register token' }, { status: 500 });
  }
}

/**
 * GET — admin-only token list. Used by the (future) admin dashboard to see
 * how many devices have opted in. Behind the admin secret because the token
 * list is sensitive (a leaked token can have arbitrary push notifications
 * fired at it via Expo's push API).
 */
export async function GET(req: NextRequest) {
  const unauth = requireAdmin(req);
  if (unauth) return unauth;

  try {
    const tokens = (await kv.smembers(ALL_TOKENS_KEY)) || [];
    return NextResponse.json({ count: tokens.length, tokens });
  } catch (err) {
    console.error('[push-token GET] error', err);
    return NextResponse.json({ error: 'Could not fetch tokens' }, { status: 500 });
  }
}
