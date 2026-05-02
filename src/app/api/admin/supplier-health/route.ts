/**
 * GET /api/admin/supplier-health
 *
 * Stage-4 Safety Net — proxies a small auth-required call to each upstream
 * supplier so the nightly monkey can detect a supplier outage before the
 * customer does. Runs server-side so we use the env vars already in Vercel
 * (LITE_API_KEY, DUFFEL_*_TOKEN, TRAVELPAYOUTS_API_TOKEN) — no new GH
 * secrets required for CI.
 *
 * Auth: x-bug-monitor-secret header, same secret the monkey nightly cron
 * already has. Reusing it avoids a second secret rotation surface.
 *
 * Response shape:
 *   { ok: true, suppliers: [
 *       { name, ok, status, ms, err? }, ...
 *     ], failed: number }
 *
 * `ok` at the top level is always true if the route itself ran — individual
 * supplier failures live in the `suppliers` array. The caller (monkey) is
 * what decides to exit non-zero / fire reportBug().
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const TIMEOUT_MS = 5000;

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function timed(name: string, fn: () => Promise<{ status: number; ok: boolean; err?: string }>): Promise<{ name: string; ok: boolean; status: number; ms: number; err?: string }> {
  const t0 = Date.now();
  try {
    const r = await fn();
    return { name, ...r, ms: Date.now() - t0 };
  } catch (e) {
    return { name, ok: false, status: 0, ms: Date.now() - t0, err: e instanceof Error ? e.message : String(e) };
  }
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function probeLiteAPI() {
  const key = process.env.LITE_API_KEY || '';
  if (!key) return { status: 0, ok: false, err: 'LITE_API_KEY unset' };
  const base = (process.env.LITE_API_BASE || 'https://api.liteapi.travel/v3.0').replace(/\/$/, '');
  const r = await fetchWithTimeout(`${base}/data/countries`, {
    headers: { 'X-API-Key': key },
  });
  return { status: r.status, ok: r.ok };
}

async function probeDuffel() {
  const token =
    process.env.DUFFEL_TEST_TOKEN ||
    process.env.DUFFEL_ACCESS_TOKEN ||
    process.env.DUFFEL_API_KEY ||
    '';
  if (!token) return { status: 0, ok: false, err: 'DUFFEL_*_TOKEN unset' };
  const r = await fetchWithTimeout('https://api.duffel.com/air/airports?limit=1', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Duffel-Version': 'v2',
      'Accept': 'application/json',
    },
  });
  return { status: r.status, ok: r.ok };
}

async function probeTravelpayouts() {
  // Marker token is non-secret (already in CLAUDE.md). Hit a cheap endpoint.
  const token = process.env.TRAVELPAYOUTS_API_TOKEN || 'cd373aa9b3cb3e9d84b7a45640adca15';
  const url = 'https://api.travelpayouts.com/aviasales/v3/get_latest_prices?currency=gbp&origin=LON&destination=BCN&limit=1&token=' + token;
  const r = await fetchWithTimeout(url, {});
  return { status: r.status, ok: r.ok };
}

export async function GET(req: NextRequest) {
  const expected = process.env.BUG_MONITOR_SECRET || '';
  if (!expected) {
    return NextResponse.json({ ok: false, error: 'BUG_MONITOR_SECRET not configured' }, { status: 503 });
  }
  const got = req.headers.get('x-bug-monitor-secret') || '';
  if (!timingSafeEqual(got, expected)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const suppliers = await Promise.all([
    timed('liteapi', probeLiteAPI),
    timed('duffel', probeDuffel),
    timed('travelpayouts', probeTravelpayouts),
  ]);

  const failed = suppliers.filter((s) => !s.ok).length;
  return NextResponse.json({ ok: true, suppliers, failed });
}
