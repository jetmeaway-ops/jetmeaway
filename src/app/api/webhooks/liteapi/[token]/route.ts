/**
 * POST /api/webhooks/liteapi/[token] — LiteAPI webhook receiver (path-auth).
 *
 * Why this exists (in addition to the parent /api/webhooks/liteapi route):
 *   LiteAPI's dashboard has TWO bugs that block every other auth strategy:
 *     1. The "Authentication Token" field is saved but its value is never
 *        forwarded in the Authorization header — every real webhook arrives
 *        with `Authorization: ` empty.
 *     2. Saved webhook URLs have their ?query strings stripped before POST.
 *        So `?k=SECRET` query auth also fails.
 *   The ONE thing LiteAPI does preserve is the URL path. So we put the shared
 *   secret IN the path: `/api/webhooks/liteapi/<SECRET>`. The token is a 56-
 *   char random string (jma_whk_...), so the path itself is unguessable and
 *   serves as the authentication material. Constant-time compared to prevent
 *   timing attacks.
 *
 * Setup:
 *   Set LITEAPI_WEBHOOK_SECRET (or LITE_API_WEBHOOK_SECRET) env var to any
 *   strong random token (we use jma_whk_<48 hex chars>). In the LiteAPI
 *   dashboard, register the webhook URL as:
 *     https://jetmeaway.co.uk/api/webhooks/liteapi/<that-same-token>
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  processLiteApiWebhook,
  timingSafeEqual,
} from '@/lib/liteapi-webhook-handler';

export const runtime = 'edge';

const WEBHOOK_SECRET =
  process.env.LITEAPI_WEBHOOK_SECRET ||
  process.env.LITE_API_WEBHOOK_SECRET ||
  '';

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;

  if (!WEBHOOK_SECRET) {
    console.warn(
      '[liteapi-webhook/token] LITEAPI_WEBHOOK_SECRET unset — refusing to accept unsigned payload',
    );
    return NextResponse.json(
      { received: false, error: 'Webhook secret not configured' },
      { status: 503 },
    );
  }

  if (!token || !timingSafeEqual(token, WEBHOOK_SECRET)) {
    console.warn(
      '[liteapi-webhook/token] auth failed — token mismatch (got len=%d, expected len=%d)',
      token?.length ?? 0,
      WEBHOOK_SECRET.length,
    );
    return NextResponse.json(
      { received: false, error: 'Invalid token' },
      { status: 401 },
    );
  }

  // Authenticated — delegate to shared handler.
  const rawBody = await req.text();
  const result = await processLiteApiWebhook(rawBody);
  return NextResponse.json(result);
}

// Friendly GET for the LiteAPI dashboard "Test webhook" button.
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const ok = Boolean(WEBHOOK_SECRET && token && timingSafeEqual(token, WEBHOOK_SECRET));
  return NextResponse.json({
    ok,
    endpoint: 'liteapi-webhook/token',
    authenticated: ok,
  });
}
