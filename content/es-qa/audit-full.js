// FULL PRE-PUSH AUDIT for the Spanish blog corpus.
// Compares every content/posts/es/<slug>.mdx against its English source.
// Prints ONLY problems, grouped by severity. Exit code 1 if any BLOCKER found.
const fs = require('fs');
const MAIN = 'C:/Users/10ban/OneDrive/Desktop/jetmeaway';
const matter = require(MAIN + '/node_modules/gray-matter');
const ES = MAIN + '/content/posts/es';
const EN = MAIN + '/content/posts';
const U = 'utf8';

const EXCLUDE = new Set(['scotland-world-cup-2026.mdx']);
const files = fs.readdirSync(ES).filter(f => f.endsWith('.mdx')).sort();

const blockers = [];   // must fix before push
const warnings = [];   // review, probably fine

const rx = {
  url:      /https?:\/\/[^\s)"'\]<>]+/g,
  internal: /\]\((\/[^)]*)\)/g,
  img:      /!\[/g,
  gbp:      /£[\d,]+/g,
  mdxTag:   /<[A-Z][A-Za-z0-9]*/g,
  inv:      /[¿¡]/g,
  usted:    /\busted(es)?\b/gi,
  engTic:   /\b(genuinely|min read|Getting There|The Scout's Take)\b/g,
  trunc:    /\[continu|se continúa|Debido a(l| la) (longitud|límite)|continuing (with|the)|\[\.\.\.\]/i,
  moji:     /[\u00C3\u00C2][\u00A0-\u00BF]|\u00E2[\u0080-\u009F\u20AC]/,
};
const count = (t, r) => (t.match(r) || []).length;
const multiset = (t, r) => {
  const m = {}; for (const x of (t.match(r) || [])) m[x] = (m[x] || 0) + 1; return m;
};
const diffKeys = (a, b) => {
  const out = [];
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)]))
    if ((a[k] || 0) !== (b[k] || 0)) out.push(`${k} (en:${a[k] || 0} es:${b[k] || 0})`);
  return out;
};

let checked = 0;
for (const f of files) {
  const esPath = `${ES}/${f}`, enPath = `${EN}/${f}`;
  const es = fs.readFileSync(esPath, U);
  if (!fs.existsSync(enPath)) { blockers.push([f, 'ORPHAN: no English source']); continue; }
  const en = fs.readFileSync(enPath, U);
  checked++;
  const B = m => blockers.push([f, m]);
  const W = m => warnings.push([f, m]);

  // 1. YAML parses + frontmatter fidelity
  let pe, pn;
  try { pe = matter(es); } catch (e) { B('YAML PARSE: ' + String(e.message).split('\n')[0]); continue; }
  try { pn = matter(en); } catch (e) { W('EN source YAML unparsable — skipping fm compare'); }
  const d = pe.data || {};
  if (!d.slug) B('frontmatter: missing slug');
  if (pn) {
    const s = pn.data || {};
    // These MUST be byte-identical (routing / data integrity)
    for (const k of ['slug', 'category', 'author', 'date', 'dateModified', 'heroImage', 'ctaCity', 'ctaFlightsTo']) {
      const a = s[k] === undefined ? undefined : String(s[k]);
      const b = d[k] === undefined ? undefined : String(d[k]);
      if (a !== b) B(`frontmatter ${k} CHANGED: en="${a}" es="${b}"`);
    }
    for (const k of ['title', 'excerpt', 'readTime']) if (s[k] !== undefined && d[k] === undefined) B(`frontmatter ${k} MISSING in ES`);
    const ef = Array.isArray(s.faqs) ? s.faqs.length : 0, sf = Array.isArray(d.faqs) ? d.faqs.length : 0;
    if (ef !== sf) W(`FAQ count ${sf}/${ef}`);
    if (sf && d.faqs.some(q => !q || !q.q || !q.a)) B('frontmatter: an FAQ entry is missing q or a');
  }

  // 2. Link / asset integrity — affiliate + image URLs must survive byte-for-byte
  const uDiff = diffKeys(multiset(en, rx.url), multiset(es, rx.url));
  if (uDiff.length) B('EXTERNAL URLS CHANGED: ' + uDiff.slice(0, 3).join('; ') + (uDiff.length > 3 ? ` (+${uDiff.length - 3})` : ''));
  const iDiff = diffKeys(multiset(en, rx.internal), multiset(es, rx.internal));
  if (iDiff.length) B('INTERNAL LINKS CHANGED: ' + iDiff.slice(0, 3).join('; ') + (iDiff.length > 3 ? ` (+${iDiff.length - 3})` : ''));

  // 3. Structure parity
  const ei = count(en, rx.img), si = count(es, rx.img);
  if (ei !== si) B(`IMAGES ${si}/${ei}`);
  const et = count(en, rx.mdxTag), st = count(es, rx.mdxTag);
  if (et !== st) B(`MDX component tags ${st}/${et}`);
  const eg = count(en, rx.gbp), sg = count(es, rx.gbp);
  if (eg !== sg) W(`£ amounts ${sg}/${eg}`);

  // 4. Completeness — catch stubs / partial translations
  const ew = en.split(/\s+/).length, sw = es.split(/\s+/).length;
  const ratio = sw / ew;
  if (ratio < 0.55) B(`STUB/TRUNCATED: ES is ${Math.round(ratio * 100)}% of EN words (${sw}/${ew})`);
  else if (ratio < 0.75) W(`short: ES ${Math.round(ratio * 100)}% of EN words`);

  // 4b. BODY FAQ block present? (EN repeats the FAQs in the body as **Question** lines.)
  //     A matching frontmatter FAQ count does NOT prove the body block survived translation.
  if (pn) {
    const bodyOf = t => { const m = t.match(/^---\r?\n[\s\S]*?\r?\n---/); return m ? t.slice(m[0].length) : t; };
    const qCount = t => (bodyOf(t).match(/^\*\*[¿A-Z][^*]*\*\*\s*$/gm) || []).length;
    const eq = qCount(en), sq = qCount(es);
    if (eq >= 5 && sq < eq * 0.5) B(`BODY FAQ BLOCK MISSING: ${sq}/${eq} questions in body`);
    else if (eq >= 5 && sq < eq * 0.9) W(`body FAQ questions ${sq}/${eq}`);
  }

  // 5. Language quality
  if (count(es, rx.inv) === 0) B('NOT SPANISH? zero ¿/¡ in file');
  const us = count(es, rx.usted); if (us) B(`USTED used ${us}x (must be tú)`);
  const tic = es.match(rx.engTic); if (tic) B(`ENGLISH LEAK: ${[...new Set(tic)].join(', ')}`);
  if (rx.trunc.test(es)) B('TRUNCATION/agent note marker found');
  if (rx.moji.test(es)) B('MOJIBAKE bytes');
  if (es === en) B('IDENTICAL to English source (untranslated copy)');
}

// Coverage
const missing = fs.readdirSync(EN).filter(f => f.endsWith('.mdx'))
  .filter(f => !EXCLUDE.has(f) && !fs.existsSync(`${ES}/${f}`));
missing.forEach(f => blockers.push([f, 'MISSING Spanish translation']));

const show = (label, arr) => {
  console.log(`\n===== ${label}: ${arr.length} =====`);
  const by = {};
  arr.forEach(([f, m]) => { (by[f] = by[f] || []).push(m); });
  Object.keys(by).sort().forEach(f => console.log(`  ${f}\n      - ${by[f].join('\n      - ')}`));
};
console.log(`Audited ${checked} Spanish files against English sources.`);
console.log(`Excluded by plan: ${[...EXCLUDE].join(', ')}`);
show('BLOCKERS (must fix before push)', blockers);
show('WARNINGS (review)', warnings);
console.log(`\nRESULT: ${blockers.length === 0 ? 'PASS — no blockers' : 'FAIL — ' + blockers.length + ' blocker(s)'}`);
process.exit(blockers.length ? 1 : 0);
