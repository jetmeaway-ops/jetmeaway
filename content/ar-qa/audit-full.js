// FULL AUDIT for the Arabic (ar) blog corpus.
// Compares every content/posts/ar/<slug>.mdx against its English source.
// Prints ONLY problems, grouped by severity. Exit 1 if any BLOCKER found.
// Run from the worktree: node content/ar-qa/audit-full.js
const fs = require('fs');
const ROOT = 'C:/Users/10ban/OneDrive/Desktop/jetmeaway/.claude/worktrees/strange-gould-788a91';
const matter = require('C:/Users/10ban/OneDrive/Desktop/jetmeaway/node_modules/gray-matter');
const AR = ROOT + '/content/posts/ar';
const EN = ROOT + '/content/posts';
const U = 'utf8';

const EXCLUDE = new Set(['scotland-world-cup-2026.mdx']);
const files = fs.readdirSync(AR).filter(f => f.endsWith('.mdx')).sort();

const blockers = [];
const warnings = [];

const rx = {
  url:      /https?:\/\/[^\s)"'\]<>]+/g,
  internal: /\]\((\/[^)]*)\)/g,
  img:      /!\[/g,
  gbp:      /£[\d,]+/g,
  mdxTag:   /<[A-Z][A-Za-z0-9]*/g,
  arabic:   /[\u0600-\u06FF]/g,
  // English descriptor / tic leaks that must be Arabised
  engTic:   /\b(genuinely|min read|four-star|five-star|three-star|two-star|self-catering|all-inclusive|design-led|live page|reviews?)\b/gi,
  // agent note / truncation markers (EN or AR)
  trunc:    /\[continu|\[\.\.\.\]|continuing (with|the)|بقية النص المترجم|تابع الترجمة|بسبب تجاوز الحد|الحد الأقصى للأحرف/i,
  moji:     /[\u00C3\u00C2][\u00A0-\u00BF]|\u00E2[\u0080-\u009F\u20AC]/,
  // body FAQ question = a standalone bold line (symmetric for EN + AR)
  faqQ:     /^\*\*[^*\n]+\*\*[ \t]*$/gm,
};
const count = (t, r) => (t.match(r) || []).length;
const multiset = (t, r) => { const m = {}; for (const x of (t.match(r) || [])) m[x] = (m[x] || 0) + 1; return m; };
const diffKeys = (a, b) => {
  const out = [];
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)]))
    if ((a[k] || 0) !== (b[k] || 0)) out.push(`${k} (en:${a[k] || 0} ar:${b[k] || 0})`);
  return out;
};

let checked = 0;
for (const f of files) {
  const arPath = `${AR}/${f}`, enPath = `${EN}/${f}`;
  const ar = fs.readFileSync(arPath, U);
  if (!fs.existsSync(enPath)) { blockers.push([f, 'ORPHAN: no English source']); continue; }
  const en = fs.readFileSync(enPath, U);
  checked++;
  const B = m => blockers.push([f, m]);
  const W = m => warnings.push([f, m]);

  // 1. YAML parses + frontmatter fidelity
  let pa, pn;
  try { pa = matter(ar); } catch (e) { B('YAML PARSE: ' + String(e.message).split('\n')[0]); continue; }
  try { pn = matter(en); } catch (e) { W('EN source YAML unparsable — skipping fm compare'); }
  const d = pa.data || {};
  if (!d.slug) B('frontmatter: missing slug');
  if (pn) {
    const s = pn.data || {};
    for (const k of ['slug', 'category', 'author', 'date', 'dateModified', 'heroImage', 'ctaCity', 'ctaFlightsTo']) {
      const a = s[k] === undefined ? undefined : String(s[k]);
      const b = d[k] === undefined ? undefined : String(d[k]);
      if (a !== b) B(`frontmatter ${k} CHANGED: en="${a}" ar="${b}"`);
    }
    for (const k of ['title', 'excerpt', 'readTime']) if (s[k] !== undefined && d[k] === undefined) B(`frontmatter ${k} MISSING in AR`);
    const ef = Array.isArray(s.faqs) ? s.faqs.length : 0, sf = Array.isArray(d.faqs) ? d.faqs.length : 0;
    if (ef !== sf) W(`FAQ count ${sf}/${ef}`);
    if (sf && d.faqs.some(q => !q || !q.q || !q.a)) B('frontmatter: an FAQ entry is missing q or a');
    // Arabic-specific: ctaCity (kept Latin) should still appear Latin in the body — else likely transliterated
    if (s.ctaCity && !new RegExp('\\b' + String(s.ctaCity).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(ar))
      W(`city name "${s.ctaCity}" not found in Latin in body — possible transliteration`);
  }

  // 2. Link / asset integrity
  const uDiff = diffKeys(multiset(en, rx.url), multiset(ar, rx.url));
  if (uDiff.length) B('EXTERNAL URLS CHANGED: ' + uDiff.slice(0, 3).join('; ') + (uDiff.length > 3 ? ` (+${uDiff.length - 3})` : ''));
  const iDiff = diffKeys(multiset(en, rx.internal), multiset(ar, rx.internal));
  if (iDiff.length) B('INTERNAL LINKS CHANGED: ' + iDiff.slice(0, 3).join('; ') + (iDiff.length > 3 ? ` (+${iDiff.length - 3})` : ''));

  // 3. Structure parity
  const ei = count(en, rx.img), si = count(ar, rx.img);
  if (ei !== si) B(`IMAGES ${si}/${ei}`);
  const et = count(en, rx.mdxTag), st = count(ar, rx.mdxTag);
  if (et !== st) B(`MDX component tags ${st}/${et}`);
  const eg = count(en, rx.gbp), sg = count(ar, rx.gbp);
  if (eg !== sg) W(`£ amounts ${sg}/${eg}`);

  // 4. Completeness
  const arabicChars = count(ar, rx.arabic);
  if (arabicChars < 300) B(`NOT TRANSLATED / stub: only ${arabicChars} Arabic chars`);
  const ew = en.split(/\s+/).length, sw = ar.split(/\s+/).length;
  const ratio = sw / ew;
  if (ratio < 0.45) B(`STUB/TRUNCATED: AR is ${Math.round(ratio * 100)}% of EN words (${sw}/${ew})`);
  else if (ratio < 0.65) W(`short: AR ${Math.round(ratio * 100)}% of EN words`);

  // 4b. BODY FAQ block present?
  if (pn) {
    const bodyOf = t => { const m = t.match(/^---\r?\n[\s\S]*?\r?\n---/); return m ? t.slice(m[0].length) : t; };
    const eq = count(bodyOf(en), rx.faqQ), sq = count(bodyOf(ar), rx.faqQ);
    if (eq >= 5 && sq < eq * 0.5) B(`BODY FAQ BLOCK MISSING: ${sq}/${eq} questions in body`);
    else if (eq >= 5 && sq < eq * 0.9) W(`body FAQ questions ${sq}/${eq}`);
  }

  // 5. Language quality
  const tic = ar.match(rx.engTic); if (tic) W(`ENGLISH LEAK: ${[...new Set(tic.map(x => x.toLowerCase()))].join(', ')}`);
  if (rx.trunc.test(ar)) B('TRUNCATION/agent note marker found');
  if (rx.moji.test(ar)) B('MOJIBAKE bytes');
  if (ar === en) B('IDENTICAL to English source (untranslated copy)');
}

// Coverage
const missing = fs.readdirSync(EN).filter(f => f.endsWith('.mdx'))
  .filter(f => !EXCLUDE.has(f) && !fs.existsSync(`${AR}/${f}`));
missing.forEach(f => blockers.push([f, 'MISSING Arabic translation']));

const show = (label, arr) => {
  console.log(`\n===== ${label}: ${arr.length} =====`);
  const by = {};
  arr.forEach(([f, m]) => { (by[f] = by[f] || []).push(m); });
  Object.keys(by).sort().forEach(f => console.log(`  ${f}\n      - ${by[f].join('\n      - ')}`));
};
console.log(`Audited ${checked} Arabic files against English sources.`);
console.log(`Excluded by plan: ${[...EXCLUDE].join(', ')}`);
show('BLOCKERS (must fix before push)', blockers);
show('WARNINGS (review)', warnings);
console.log(`\nRESULT: ${blockers.length === 0 ? 'PASS — no blockers' : 'FAIL — ' + blockers.length + ' blocker(s)'}`);
process.exit(blockers.length ? 1 : 0);
