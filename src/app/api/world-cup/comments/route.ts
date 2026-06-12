import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

/**
 * Fan wall for /world-cup-2026 — a lightweight public comments + Q&A store.
 *
 * Deliberately minimal KV footprint: ONE Redis list `wc:comments` (capped to
 * the latest 100) plus short-TTL rate-limit keys. No PII fields are collected
 * or stored — only a voluntary display name + city + message. The rate-limit
 * key is a non-reversible hash of the IP with a 15s TTL (abuse control only),
 * so no raw IP is persisted (Privacy Shield).
 *
 * NOTE (owner): this is an UNMODERATED public wall. Basic guards are in place
 * (length caps, a small word filter, rate limiting) but it should be monitored
 * once live. Kept behind the temporary campaign page.
 */

export const runtime = 'edge';

const LIST_KEY = 'wc:comments';
const MAX_STORED = 100;
const MAX_RETURNED = 50;
const MESSAGE_MAX = 280;
const NAME_MAX = 40;
const CITY_MAX = 40;
const RATE_TTL_S = 15;

type Comment = {
  id: string;
  name: string;
  city: string;
  message: string;
  isQuestion: boolean;
  ts: number;
};

// Tiny, conservative word filter. Not exhaustive — a backstop, not moderation.
const BLOCKED = ['fuck', 'shit', 'cunt', 'bitch', 'nigger', 'faggot', 'rape'];

function djb2(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Drop control chars + angle brackets (we render as plain text), trim, cap. */
function clean(input: unknown, max: number): string {
  if (typeof input !== 'string') return '';
  let out = '';
  for (const ch of input) {
    const c = ch.codePointAt(0) ?? 0;
    if (c >= 0x20 && c !== 0x7f) out += ch; // skip C0 control chars + DEL
  }
  return out.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}

export async function GET() {
  try {
    const raw = await kv.lrange<string>(LIST_KEY, 0, MAX_RETURNED - 1);
    const comments: Comment[] = (raw ?? [])
      .map((r) => {
        try {
          return typeof r === 'string' ? (JSON.parse(r) as Comment) : (r as Comment);
        } catch {
          return null;
        }
      })
      .filter((c): c is Comment => !!c);
    return NextResponse.json({ comments });
  } catch {
    return NextResponse.json({ comments: [] });
  }
}

export async function POST(req: NextRequest) {
  let body: { name?: string; city?: string; message?: string; isQuestion?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const message = clean(body.message, MESSAGE_MAX);
  const name = clean(body.name, NAME_MAX) || 'England fan';
  const city = clean(body.city, CITY_MAX);
  const isQuestion = body.isQuestion === true;

  if (message.length < 2) {
    return NextResponse.json({ error: 'Add a message first.' }, { status: 400 });
  }
  const lower = `${message} ${name}`.toLowerCase();
  if (BLOCKED.some((w) => lower.includes(w))) {
    return NextResponse.json({ error: 'Let’s keep it friendly — please reword.' }, { status: 422 });
  }

  // Rate-limit on a hashed IP (no raw IP persisted).
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anon';
  const rlKey = `wc:rl:${djb2(ip)}`;
  try {
    const recent = await kv.get(rlKey);
    if (recent) {
      return NextResponse.json({ error: 'Hang on a few seconds before posting again.' }, { status: 429 });
    }
    await kv.set(rlKey, 1, { ex: RATE_TTL_S });
  } catch {
    /* KV rate-limit unavailable — allow the post rather than block legit fans */
  }

  const comment: Comment = {
    id: crypto.randomUUID(),
    name,
    city,
    message,
    isQuestion,
    ts: Date.now(),
  };

  try {
    await kv.lpush(LIST_KEY, JSON.stringify(comment));
    await kv.ltrim(LIST_KEY, 0, MAX_STORED - 1);
  } catch {
    return NextResponse.json({ error: 'Could not post right now — try again.' }, { status: 503 });
  }

  return NextResponse.json({ comment });
}
