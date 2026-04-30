/**
 * Saved searches — POST/GET/DELETE for the account-bound search-watch list.
 *
 * Schema (per-user list in KV):
 *   `saved-searches:${email}` → SavedSearch[]
 *
 * Each SavedSearch is a snapshot of search criteria + the price the user
 * saw at save-time. A separate cron job (src/app/api/cron/check-saved-searches)
 * walks each user's list daily, re-queries today's price, and fires an Expo
 * push notification if the new price is at least 5% lower than the saved
 * price.
 *
 * Auth: requires the existing HMAC session cookie. Anonymous saves are
 * disallowed — without a stable identity we can't dedupe or notify.
 *
 * Idempotency: POST with a duplicate (type + criteria fingerprint) updates
 * the existing entry rather than creating a new one. DELETE is keyed on id.
 */
import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { readSessionEmail } from '@/lib/session';

export const runtime = 'edge';

export type SavedSearchType = 'flight' | 'hotel';

export type SavedSearch = {
  id: string;                  // sha-1 hash of (type + canonical criteria)
  type: SavedSearchType;
  label: string;               // human-readable, e.g. "London → Dubai · 12 Dec - 19 Dec"
  criteria: Record<string, string | number | undefined>;
  savedPricePence?: number;    // best price at time of save
  currency?: string;           // e.g. 'GBP'
  url: string;                 // deep link back to the search results page
  notify: boolean;             // user opt-in for push alerts on price drop
  createdAt: number;
  updatedAt: number;
  lastCheckedAt?: number;      // set by cron
  lastObservedPricePence?: number;
};

const MAX_PER_USER = 30;

function key(email: string): string {
  return `saved-searches:${email}`;
}

async function listForEmail(email: string): Promise<SavedSearch[]> {
  const raw = await kv.get<SavedSearch[]>(key(email));
  if (!raw || !Array.isArray(raw)) return [];
  return raw;
}

async function writeForEmail(email: string, list: SavedSearch[]): Promise<void> {
  await kv.set(key(email), list);
}

async function fingerprint(type: SavedSearchType, criteria: Record<string, unknown>): Promise<string> {
  // Canonical JSON: keys sorted, undefined/null stripped — so the same
  // search saved twice gets the same id regardless of property order.
  const sorted: Record<string, unknown> = {};
  Object.keys(criteria).sort().forEach((k) => {
    const v = criteria[k];
    if (v !== null && v !== undefined && v !== '') sorted[k] = v;
  });
  const text = `${type}::${JSON.stringify(sorted)}`;
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(text));
  const hex = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return hex.slice(0, 16);
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
  const type = body.type === 'flight' || body.type === 'hotel' ? body.type : null;
  const label = typeof body.label === 'string' ? body.label.trim().slice(0, 200) : '';
  const url = typeof body.url === 'string' ? body.url.trim() : '';
  const criteria = body.criteria && typeof body.criteria === 'object' ? body.criteria : null;

  if (!type || !label || !url || !criteria) {
    return NextResponse.json({ error: 'Missing required fields (type, label, url, criteria)' }, { status: 400 });
  }
  if (!url.startsWith('/')) {
    return NextResponse.json({ error: 'URL must be a relative jetmeaway.co.uk path' }, { status: 400 });
  }

  const id = await fingerprint(type, criteria as Record<string, unknown>);
  const now = Date.now();
  const list = await listForEmail(email);

  const existingIdx = list.findIndex((s) => s.id === id);
  const savedPricePence = typeof body.savedPricePence === 'number' ? Math.round(body.savedPricePence) : undefined;
  const currency = typeof body.currency === 'string' ? body.currency.trim().toUpperCase().slice(0, 3) : undefined;
  const notify = body.notify !== false;

  if (existingIdx >= 0) {
    list[existingIdx] = {
      ...list[existingIdx],
      label,
      url,
      criteria: criteria as SavedSearch['criteria'],
      savedPricePence: savedPricePence ?? list[existingIdx].savedPricePence,
      currency: currency ?? list[existingIdx].currency,
      notify,
      updatedAt: now,
    };
  } else {
    if (list.length >= MAX_PER_USER) {
      return NextResponse.json({
        error: `You can save at most ${MAX_PER_USER} searches. Delete some before adding more.`,
      }, { status: 400 });
    }
    list.unshift({
      id,
      type,
      label,
      url,
      criteria: criteria as SavedSearch['criteria'],
      savedPricePence,
      currency,
      notify,
      createdAt: now,
      updatedAt: now,
    });
  }

  await writeForEmail(email, list);
  return NextResponse.json({ success: true, id, count: list.length });
}

export async function DELETE(req: NextRequest) {
  const email = await readSessionEmail(req.headers.get('cookie'));
  if (!email) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id')?.trim() || '';
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const list = await listForEmail(email);
  const next = list.filter((s) => s.id !== id);
  if (next.length === list.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  await writeForEmail(email, next);
  return NextResponse.json({ success: true, count: next.length });
}
