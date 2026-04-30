#!/usr/bin/env node
/**
 * Auto-Triage — Stage 6 of the Safety Net.
 *
 * Runs on a 6h GitHub Actions cron. Pulls the oldest open bug from the KV
 * Bug Inbox, gathers code context with grep, asks Claude (Sonnet 4.5) for a
 * minimal patch, applies it, type-checks, and opens a DRAFT pull request.
 * Owner reviews + merges. Auto-merge is intentionally not wired.
 *
 * Hard guards (the script enforces, not the model):
 *   - At most ONE bug processed per workflow run.
 *   - At most 3 open `auto-fix/*` draft PRs at any time (rate-limit so a
 *     misbehaving prompt can't carpet the repo).
 *   - Diff capped at 80 lines (Claude can also self-reject).
 *   - Edits restricted to `src/**` and `scripts/**`.
 *   - `old_string` must appear exactly once in the target file.
 *   - Skips bugs whose error text reads supplier-side
 *     (`LiteAPI`, `DOTW`, `Webbeds`, `upstream`, `502`, `504`, `ETIMEDOUT`).
 *   - Skips bugs older than 7 days (likely already fixed or obsolete).
 *   - tsc must pass before commit.
 *
 * Required env (all set in workflow secrets):
 *   ANTHROPIC_API_KEY  ADMIN_SECRET  GH_TOKEN  RESEND_API_KEY (optional)
 *   BASE               (default: https://jetmeaway.co.uk)
 */

import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE || 'https://jetmeaway.co.uk';
const ADMIN_SECRET = process.env.ADMIN_SECRET || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const MAX_OPEN_AUTO_PRS = 3;
const MAX_DIFF_LINES = 80;
const SUPPLIER_KEYWORDS = /\b(LiteAPI|DOTW|Webbeds|upstream|502|504|ETIMEDOUT|ENOTFOUND)\b/i;

if (!ADMIN_SECRET) { console.error('ADMIN_SECRET missing'); process.exit(2); }
if (!ANTHROPIC_API_KEY) { console.error('ANTHROPIC_API_KEY missing'); process.exit(2); }

function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...opts }).trim();
}

async function fetchOpenBugs() {
  const r = await fetch(`${BASE}/api/admin/bugs?status=open`, {
    headers: { Authorization: `Bearer ${ADMIN_SECRET}` },
  });
  if (!r.ok) throw new Error(`/api/admin/bugs HTTP ${r.status}`);
  const j = await r.json();
  return j.bugs || [];
}

function listOpenAutoFixPrs() {
  try {
    const out = sh('gh', ['pr', 'list', '--state', 'open', '--search', 'head:auto-fix/', '--json', 'number,title,headRefName']);
    return JSON.parse(out || '[]');
  } catch { return []; }
}

function gatherCodeContext(bug) {
  const text = `${bug.message || ''}\n${bug.errorText || ''}`;
  const phrases = new Set();
  for (const m of text.matchAll(/'([^']{6,60})'|"([^"]{6,60})"/g)) {
    phrases.add((m[1] || m[2]).trim());
  }
  for (const m of text.matchAll(/([a-zA-Z][\w]{4,30}(?:\.[a-zA-Z][\w]+)+)/g)) {
    phrases.add(m[1]);
  }
  for (const m of text.matchAll(/(src\/[\w\-./]+\.(?:ts|tsx|mjs|js))/g)) {
    phrases.add(m[1]);
  }

  const snippets = [];
  for (const p of [...phrases].slice(0, 6)) {
    try {
      const out = execFileSync('grep', ['-rn', '--max-count=3', '-C', '4', p, 'src/'], {
        encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'],
      });
      if (out) snippets.push(`# grep "${p}"\n${out.slice(0, 1800)}`);
    } catch { /* no match — fine */ }
    if (snippets.join('\n').length > 7000) break;
  }
  return snippets.join('\n\n---\n\n').slice(0, 7500);
}

async function askClaude(bug, context) {
  const sys = [
    'You are an automated bug-triage agent for the jetmeaway.co.uk codebase',
    '(Next.js 16, Edge runtime, hotel comparison + booking via LiteAPI / DOTW,',
    'Stripe, Twilio IVR). You receive a production bug record from KV and',
    'grep snippets from the repo. Decide:',
    '  1. Is this a fixable code bug in this repo?',
    '  2. If yes, propose ONE minimal change.',
    '',
    'Hard rules:',
    '  - Only modify files under src/ or scripts/.',
    '  - Diff must be small (≤80 lines).',
    '  - old_string must appear EXACTLY ONCE in the target file.',
    '  - Reject (not_fixable) if: supplier-side, needs infra, multi-file,',
    '    or you are < 80 % confident in the fix.',
    '',
    'Output ONLY valid JSON, no prose, no markdown fences:',
    '{',
    '  "verdict": "fixable" | "not_fixable",',
    '  "reasoning": "1-3 sentences",',
    '  "file_path": "src/...",          // omit when not_fixable',
    '  "old_string": "...",              // omit when not_fixable',
    '  "new_string": "...",              // omit when not_fixable',
    '  "test_hint": "what reviewer should verify"',
    '}',
  ].join('\n');

  const user = `BUG (from KV inbox):\n${JSON.stringify({
    id: bug.id,
    message: bug.message,
    errorText: bug.errorText,
    context: bug.context,
    count: bug.count,
    firstSeen: bug.firstSeen,
    lastSeen: bug.lastSeen,
  }, null, 2)}\n\nCODE CONTEXT (grep results):\n${context || '(no grep matches)'}`;

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 1500,
      system: [{ type: 'text', text: sys, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!r.ok) throw new Error(`Anthropic HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const j = await r.json();
  const txt = j?.content?.[0]?.text || '';
  const cleaned = txt.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  try { return JSON.parse(cleaned); } catch (e) {
    throw new Error(`Claude returned non-JSON: ${cleaned.slice(0, 300)}`);
  }
}

function applyEdit(filePath, oldString, newString) {
  if (!filePath.startsWith('src/') && !filePath.startsWith('scripts/')) {
    throw new Error(`refused: file path ${filePath} outside src/ + scripts/`);
  }
  if (!fs.existsSync(filePath)) throw new Error(`file not found: ${filePath}`);
  const before = fs.readFileSync(filePath, 'utf8');
  const occurrences = before.split(oldString).length - 1;
  if (occurrences === 0) throw new Error(`old_string not found in ${filePath}`);
  if (occurrences > 1) throw new Error(`old_string ambiguous (${occurrences} matches) in ${filePath}`);
  const after = before.replace(oldString, newString);
  const diffLines = Math.abs(after.split('\n').length - before.split('\n').length)
                  + (oldString.split('\n').length - 1) + (newString.split('\n').length - 1);
  if (diffLines > MAX_DIFF_LINES) throw new Error(`diff too large (~${diffLines} lines, cap ${MAX_DIFF_LINES})`);
  fs.writeFileSync(filePath, after, 'utf8');
}

function tscPasses() {
  try { execSync('npx tsc --noEmit', { stdio: 'pipe' }); return true; }
  catch (e) { return { ok: false, output: String(e.stdout || e.message).slice(0, 1500) }; }
}

function shortId(bugId) {
  return bugId.replace(/[^a-z0-9]/gi, '').slice(-10).toLowerCase();
}

function openDraftPr({ bug, verdict, branch, prBody, prTitle }) {
  sh('git', ['config', 'user.email', 'auto-triage@jetmeaway.co.uk']);
  sh('git', ['config', 'user.name', 'jetmeaway-auto-triage']);
  sh('git', ['checkout', '-b', branch]);
  sh('git', ['add', '-A']);
  sh('git', ['commit', '-m', prTitle]);
  sh('git', ['push', '-u', 'origin', branch]);
  const url = sh('gh', ['pr', 'create', '--draft', '--base', 'main', '--head', branch, '--title', prTitle, '--body', prBody]);
  return url;
}

async function notify(subject, html) {
  if (!RESEND_API_KEY) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'JetMeAway Auto-Triage <noreply@jetmeaway.co.uk>',
        to: ['waqar@jetmeaway.co.uk'],
        subject,
        html,
      }),
    });
  } catch (e) { console.warn('notify failed', e.message); }
}

async function main() {
  const openPrs = listOpenAutoFixPrs();
  if (openPrs.length >= MAX_OPEN_AUTO_PRS) {
    console.log(`Skipping: ${openPrs.length} open auto-fix PRs already (cap ${MAX_OPEN_AUTO_PRS}).`);
    return;
  }

  const bugs = await fetchOpenBugs();
  if (bugs.length === 0) { console.log('Inbox empty — nothing to triage.'); return; }

  const inFlightIds = new Set(openPrs.map((p) => {
    const m = p.headRefName.match(/^auto-fix\/bug-([a-z0-9]+)$/);
    return m ? m[1] : null;
  }).filter(Boolean));

  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const bug = bugs.find((b) => {
    if (inFlightIds.has(shortId(b.id))) return false;
    if (SUPPLIER_KEYWORDS.test(`${b.message || ''} ${b.errorText || ''}`)) return false;
    if (b.firstSeen && (now - new Date(b.firstSeen).getTime()) > sevenDaysMs) return false;
    return true;
  });
  if (!bug) { console.log(`No triage-eligible bugs (${bugs.length} open, all in-flight / supplier-side / stale).`); return; }

  console.log(`Triaging ${bug.id} — ${bug.message?.slice(0, 80)}`);
  const ctx = gatherCodeContext(bug);
  const verdict = await askClaude(bug, ctx);
  console.log('Claude verdict:', verdict.verdict, '—', verdict.reasoning);

  if (verdict.verdict !== 'fixable') {
    console.log('Bug judged not_fixable — leaving in inbox for human review.');
    return;
  }
  if (!verdict.file_path || !verdict.old_string || !verdict.new_string) {
    console.log('Verdict fixable but fields missing — abort.'); return;
  }

  applyEdit(verdict.file_path, verdict.old_string, verdict.new_string);
  const tsc = tscPasses();
  if (tsc !== true) {
    console.error('tsc failed after edit — aborting.\n', tsc.output);
    sh('git', ['checkout', '--', verdict.file_path]);
    return;
  }

  const sid = shortId(bug.id);
  const branch = `auto-fix/bug-${sid}`;
  const truncMsg = (bug.message || 'unknown').slice(0, 60);
  const prTitle = `auto-fix(bug:${bug.id}): ${truncMsg}`;
  const prBody = [
    `Auto-generated by \`scripts/auto-triage.mjs\` from KV Bug Inbox entry **${bug.id}**.`,
    '',
    '## Claude analysis',
    verdict.reasoning,
    '',
    '## Test hint',
    verdict.test_hint || '_none provided_',
    '',
    '## Bug record',
    '```json',
    JSON.stringify({
      id: bug.id, message: bug.message, count: bug.count,
      firstSeen: bug.firstSeen, lastSeen: bug.lastSeen, context: bug.context,
    }, null, 2),
    '```',
    '',
    '## Verification',
    `- [ ] \`npm run typecheck\` (auto-passed in workflow)`,
    `- [ ] Targeted monkey re-run (CI: \`auto-fix-pr-monkey.yml\`)`,
    `- [ ] Reviewer confirms Claude\'s reasoning matches root cause`,
    '',
    '## On merge',
    `Bug **${bug.id}** will auto-resolve via \`auto-fix-pr-merged.yml\`.`,
  ].join('\n');

  const prUrl = openDraftPr({ bug, verdict, branch, prBody, prTitle });
  console.log('Draft PR opened:', prUrl);

  await notify(
    `Auto-triage: draft PR for bug ${bug.id}`,
    `<p>Bug <code>${bug.id}</code> — ${truncMsg}</p><p>Draft PR: <a href="${prUrl}">${prUrl}</a></p><p>${verdict.reasoning}</p>`,
  );
}

main().catch((e) => { console.error('auto-triage failed:', e.message); process.exit(1); });
