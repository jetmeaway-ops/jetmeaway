/**
 * KV Bug Inbox — persistent storage for production errors.
 *
 * Every call to /api/bug-monitor is mirrored here so Claude (or the owner)
 * can pull open bugs, triage, and mark resolved without grepping Vercel
 * logs or trawling email.
 *
 * KV shape:
 *   bugs:open          → string[]   list of bug IDs (newest first, capped 200)
 *   bugs:resolved      → string[]   list of resolved bug IDs (capped 100)
 *   bugs:item:<id>     → BugRecord  full record
 *
 * IDs are `bug:<fingerprint>` so identical errors collapse to one record;
 * `count` and `lastSeen` increment instead of appending duplicates.
 */
import { kv } from '@vercel/kv';

export interface BugRecord {
  id: string;
  message: string;
  errorText: string;
  summary: string | null;
  context: Record<string, unknown> | null;
  count: number;
  firstSeen: string;
  lastSeen: string;
  status: 'open' | 'resolved';
  resolvedAt?: string;
  resolvedBy?: string;
  resolvedNote?: string;
}

const OPEN_KEY = 'bugs:open';
const RESOLVED_KEY = 'bugs:resolved';
const OPEN_CAP = 200;
const RESOLVED_CAP = 100;

function fingerprint(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return `bug:${Math.abs(hash)}`;
}

export function bugIdFor(errorText: string): string {
  return fingerprint(errorText);
}

/**
 * Record a bug. If a bug with the same fingerprint already exists and is
 * still open, increment its `count` and bump `lastSeen` instead of creating
 * a duplicate. Returns the bug id.
 */
export async function recordBug(input: {
  message: string;
  errorText: string;
  summary?: string | null;
  context?: Record<string, unknown> | null;
}): Promise<string> {
  const id = bugIdFor(input.errorText);
  const itemKey = `bugs:item:${id}`;
  const now = new Date().toISOString();

  const existing = await kv.get<BugRecord>(itemKey);
  if (existing && existing.status === 'open') {
    const updated: BugRecord = {
      ...existing,
      count: (existing.count || 1) + 1,
      lastSeen: now,
      summary: input.summary ?? existing.summary ?? null,
      context: input.context ?? existing.context ?? null,
    };
    await kv.set(itemKey, updated);
    return id;
  }

  const record: BugRecord = {
    id,
    message: input.message,
    errorText: input.errorText.slice(0, 4000),
    summary: input.summary ?? null,
    context: input.context ?? null,
    count: 1,
    firstSeen: now,
    lastSeen: now,
    status: 'open',
  };
  await kv.set(itemKey, record);

  // Push to head, dedupe, cap.
  const list = (await kv.get<string[]>(OPEN_KEY)) || [];
  const filtered = list.filter((x) => x !== id);
  filtered.unshift(id);
  await kv.set(OPEN_KEY, filtered.slice(0, OPEN_CAP));
  return id;
}

export async function listBugs(status: 'open' | 'resolved' = 'open'): Promise<BugRecord[]> {
  const key = status === 'open' ? OPEN_KEY : RESOLVED_KEY;
  const ids = (await kv.get<string[]>(key)) || [];
  if (ids.length === 0) return [];
  const records = await Promise.all(ids.map((id) => kv.get<BugRecord>(`bugs:item:${id}`)));
  return records.filter((r): r is BugRecord => r !== null);
}

export async function resolveBug(
  id: string,
  note: string | null,
  resolvedBy: string,
): Promise<BugRecord | null> {
  const itemKey = `bugs:item:${id}`;
  const record = await kv.get<BugRecord>(itemKey);
  if (!record) return null;

  const updated: BugRecord = {
    ...record,
    status: 'resolved',
    resolvedAt: new Date().toISOString(),
    resolvedBy,
    resolvedNote: note ?? undefined,
  };
  await kv.set(itemKey, updated);

  const open = (await kv.get<string[]>(OPEN_KEY)) || [];
  await kv.set(OPEN_KEY, open.filter((x) => x !== id));

  const resolved = (await kv.get<string[]>(RESOLVED_KEY)) || [];
  const next = [id, ...resolved.filter((x) => x !== id)].slice(0, RESOLVED_CAP);
  await kv.set(RESOLVED_KEY, next);

  return updated;
}
