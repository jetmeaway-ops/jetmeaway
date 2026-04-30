import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { listBugs, resolveBug } from '@/lib/bug-inbox';

export const runtime = 'edge';

/**
 * GET  /api/admin/bugs?status=open|resolved   → list bugs (newest first)
 * POST /api/admin/bugs                        → resolve a bug
 *   body: { id: string, note?: string, resolvedBy?: string }
 *
 * Auth: Authorization: Bearer <ADMIN_SECRET> (see src/lib/admin-auth.ts).
 *
 * Designed for autonomous Claude triage — pull open bugs, fix in code,
 * mark resolved with the commit ref as the note. Owner can also drive it
 * via curl from the terminal.
 */

export async function GET(req: NextRequest) {
  const unauth = requireAdmin(req);
  if (unauth) return unauth;

  const url = new URL(req.url);
  const status = url.searchParams.get('status') === 'resolved' ? 'resolved' : 'open';
  try {
    const bugs = await listBugs(status);
    return NextResponse.json({ ok: true, status, count: bugs.length, bugs });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to list bugs';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const unauth = requireAdmin(req);
  if (unauth) return unauth;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const id = typeof body?.id === 'string' ? body.id : '';
  const note = typeof body?.note === 'string' ? body.note : null;
  const resolvedBy = typeof body?.resolvedBy === 'string' ? body.resolvedBy : 'admin';
  if (!id) return NextResponse.json({ ok: false, error: 'id is required' }, { status: 400 });

  try {
    const updated = await resolveBug(id, note, resolvedBy);
    if (!updated) return NextResponse.json({ ok: false, error: 'Bug not found' }, { status: 404 });
    return NextResponse.json({ ok: true, bug: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to resolve bug';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
