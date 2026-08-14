/**
 * Favourite hotels — the account-bound copy of a visitor's saved hotels.
 *
 * Schema (per-user list in KV, mirroring saved-searches):
 *   `favourites:${email}` → Favourite[]
 *
 * This is a NEW key. No existing key, field or stored shape is touched.
 *
 * Signed-out visitors can favourite too — that copy lives in localStorage on
 * their device (see src/lib/favourites.ts) and never reaches this route. When
 * they later sign in, the client POSTs the local list here via `merge` so the
 * hotels they picked before signing in are not silently lost, which is the
 * whole reason anonymous favouriting is worth having.
 *
 * Auth: the same HMAC session cookie as saved-searches. Anonymous writes are
 * rejected — without a stable identity there is nothing to attach them to.
 *
 * Idempotency: POST is keyed on hotelId, so saving the same hotel twice
 * updates the entry instead of duplicating it. DELETE is keyed on hotelId.
 */
import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { readSessionEmail } from '@/lib/session';

export const runtime = 'edge';

export type Favourite = {
  /** LiteAPI hotel id, e.g. "la_lp87def". The identity of the record. */
  hotelId: string;
  name: string;
  city?: string;
  thumbnail?: string;
  stars?: number;
  /**
   * Price the visitor saw when they saved it, in minor units. Displayed as
   * "£X when you saved it" and never as a current price — rates move daily and
   * claiming otherwise would be a lie to the customer.
   */
  savedPricePence?: number;
  currency?: string;
  /** Straight back to the hotel, carrying the dates they were looking at. */
  url: string;
  createdAt: number;
};

const MAX_PER_USER = 100;

function key(email: string): string {
  return `favourites:${email}`;
}

async function listForEmail(email: string): Promise<Favourite[]> {
  const raw = await kv.get<Favourite[]>(key(email));
  if (!raw || !Array.isArray(raw)) return [];
  return raw;
}

async function writeForEmail(email: string, list: Favourite[]): Promise<void> {
  await kv.set(key(email), list);
}

/** Accept only what we're prepared to render, and bound every string. */
function sanitise(input: unknown): Favourite | null {
  if (!input || typeof input !== 'object') return null;
  const o = input as Record<string, unknown>;

  const hotelId = typeof o.hotelId === 'string' ? o.hotelId.trim().slice(0, 64) : '';
  const name = typeof o.name === 'string' ? o.name.trim().slice(0, 200) : '';
  const url = typeof o.url === 'string' ? o.url.trim().slice(0, 2000) : '';
  if (!hotelId || !name || !url) return null;
  // Relative paths only — an absolute URL here would let a caller store an
  // off-site link that we'd then render as one of the customer's own saves.
  if (!url.startsWith('/')) return null;

  const thumbnail = typeof o.thumbnail === 'string' && /^https:\/\//.test(o.thumbnail)
    ? o.thumbnail.slice(0, 2000)
    : undefined;
  const stars = typeof o.stars === 'number' && o.stars >= 0 && o.stars <= 5 ? Math.round(o.stars) : undefined;
  const savedPricePence = typeof o.savedPricePence === 'number' && Number.isFinite(o.savedPricePence)
    ? Math.max(0, Math.round(o.savedPricePence))
    : undefined;

  return {
    hotelId,
    name,
    city: typeof o.city === 'string' ? o.city.trim().slice(0, 120) : undefined,
    thumbnail,
    stars,
    savedPricePence,
    currency: typeof o.currency === 'string' ? o.currency.trim().toUpperCase().slice(0, 3) : undefined,
    url,
    createdAt: typeof o.createdAt === 'number' && Number.isFinite(o.createdAt) ? o.createdAt : Date.now(),
  };
}

export async function GET(req: NextRequest) {
  const email = await readSessionEmail(req.headers.get('cookie'));
  if (!email) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const list = await listForEmail(email);
  return NextResponse.json({ success: true, items: list });
}

export async function POST(req: NextRequest) {
  const email = await readSessionEmail(req.headers.get('cookie'));
  if (!email) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  // `merge` — the sign-in hand-off. Existing entries win, so signing in can
  // never overwrite an account favourite with a staler local copy.
  if (Array.isArray(body?.merge)) {
    const incoming = body.merge.map(sanitise).filter((f: Favourite | null): f is Favourite => f !== null);
    const list = await listForEmail(email);
    const have = new Set(list.map((f) => f.hotelId));
    const added = incoming.filter((f: Favourite) => !have.has(f.hotelId));
    if (added.length > 0) {
      const next = [...added, ...list]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, MAX_PER_USER);
      await writeForEmail(email, next);
      return NextResponse.json({ success: true, merged: added.length, count: next.length });
    }
    return NextResponse.json({ success: true, merged: 0, count: list.length });
  }

  const fav = sanitise(body);
  if (!fav) {
    return NextResponse.json({ error: 'Missing or invalid fields (hotelId, name, url)' }, { status: 400 });
  }

  const list = await listForEmail(email);
  const idx = list.findIndex((f) => f.hotelId === fav.hotelId);

  if (idx >= 0) {
    // Keep the original createdAt — "saved on" should mean the first time.
    list[idx] = { ...fav, createdAt: list[idx].createdAt };
  } else {
    if (list.length >= MAX_PER_USER) {
      return NextResponse.json({
        error: `You can save at most ${MAX_PER_USER} hotels. Remove some before adding more.`,
      }, { status: 400 });
    }
    list.unshift(fav);
  }

  await writeForEmail(email, list);
  return NextResponse.json({ success: true, hotelId: fav.hotelId, count: list.length });
}

export async function DELETE(req: NextRequest) {
  const email = await readSessionEmail(req.headers.get('cookie'));
  if (!email) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const hotelId = req.nextUrl.searchParams.get('hotelId')?.trim() || '';
  if (!hotelId) return NextResponse.json({ error: 'Missing hotelId' }, { status: 400 });

  const list = await listForEmail(email);
  const next = list.filter((f) => f.hotelId !== hotelId);
  if (next.length === list.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  await writeForEmail(email, next);
  return NextResponse.json({ success: true, count: next.length });
}
