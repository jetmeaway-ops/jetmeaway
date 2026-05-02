#!/usr/bin/env node
/**
 * Supplier Health Probe — Stage 4 of the Safety Net.
 *
 * Calls /api/admin/supplier-health, which proxies a small auth-required
 * call to LiteAPI, Duffel, and Travelpayouts. We do this server-side so
 * supplier API keys stay in Vercel env (not GH secrets).
 *
 * Failure → POSTs to /api/bug-monitor (same fingerprint pipeline as the
 * existing monkeys) so the owner gets one Resend email per distinct
 * outage. Exit code 1 on any supplier failure → fails the GH workflow
 * step too.
 *
 * Env:
 *   BASE                 - default https://jetmeaway.co.uk
 *   BUG_MONITOR_SECRET   - required, gates the supplier-health route + bug-monitor
 */

const BASE = (process.env.BASE || 'https://jetmeaway.co.uk').replace(/\/$/, '');
const SECRET = process.env.BUG_MONITOR_SECRET || '';

if (!SECRET) {
  console.error('supplier-health: BUG_MONITOR_SECRET not set — refusing to run');
  process.exit(2);
}

async function reportBug(message, context) {
  try {
    await fetch(`${BASE}/api/bug-monitor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-bug-monitor-secret': SECRET },
      body: JSON.stringify([{ level: 'error', message, context: context || {}, ts: new Date().toISOString() }]),
    });
  } catch {
    /* swallow — best effort */
  }
}

async function main() {
  const t0 = Date.now();
  console.log(`supplier-health — BASE=${BASE}`);

  let res;
  try {
    res = await fetch(`${BASE}/api/admin/supplier-health`, {
      headers: { 'x-bug-monitor-secret': SECRET, 'user-agent': 'jetmeaway-supplier-health/1' },
    });
  } catch (e) {
    console.error(`supplier-health: route unreachable: ${e.message}`);
    await reportBug('supplier-health route unreachable', { error: e.message });
    process.exit(1);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`supplier-health: route returned ${res.status} — ${body.slice(0, 200)}`);
    await reportBug('supplier-health route returned non-2xx', { status: res.status, body: body.slice(0, 200) });
    process.exit(1);
  }

  const data = await res.json().catch(() => null);
  if (!data || !Array.isArray(data.suppliers)) {
    console.error('supplier-health: malformed response');
    await reportBug('supplier-health malformed response', {});
    process.exit(1);
  }

  console.log('\n== Supplier checks ==');
  const failed = [];
  for (const s of data.suppliers) {
    const tag = s.ok ? 'PASS' : 'FAIL';
    const note = s.err ? ` — ${s.err}` : '';
    console.log(`  ${tag} ${s.name.padEnd(15)} status=${s.status} ${s.ms}ms${note}`);
    if (!s.ok) failed.push(s);
  }

  console.log(`\n== Summary ==`);
  console.log(`  ${data.suppliers.length - failed.length}/${data.suppliers.length} suppliers healthy`);
  console.log(`  total: ${Date.now() - t0}ms`);

  if (failed.length) {
    // One bug per failed supplier so the inbox fingerprints them separately.
    for (const s of failed) {
      await reportBug(`supplier ${s.name} unhealthy`, { status: s.status, ms: s.ms, err: s.err || null });
    }
    process.exit(1);
  }
}

main().catch((e) => { console.error('supplier-health crashed:', e); process.exit(2); });
