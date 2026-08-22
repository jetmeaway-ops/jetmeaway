// Revert ES frontmatter fields that MUST match the English source byte-for-byte.
// These are routing/data-integrity fields — German (live) keeps them English.
// Only rewrites the frontmatter block; body untouched. Idempotent.
const fs = require('fs');
const MAIN = 'C:/Users/10ban/OneDrive/Desktop/jetmeaway';
const ES = MAIN + '/content/posts/es', EN = MAIN + '/content/posts';
const U = 'utf8';
const KEYS = ['slug', 'category', 'author', 'date', 'dateModified', 'heroImage', 'ctaCity', 'ctaFlightsTo'];

const fmBlock = raw => raw.match(/^(---\r?\n)([\s\S]*?)(\r?\n---)/);
// read a top-level scalar key line from a frontmatter block
const readKey = (fm, k) => {
  const m = fm.match(new RegExp(`^${k}:[ \\t]*(.*)$`, 'm'));
  return m ? m[1] : null;
};

let changed = 0, edits = 0;
const log = [];
for (const f of fs.readdirSync(ES).filter(x => x.endsWith('.mdx')).sort()) {
  const esPath = `${ES}/${f}`, enPath = `${EN}/${f}`;
  if (!fs.existsSync(enPath)) continue;
  const esRaw = fs.readFileSync(esPath, U), enRaw = fs.readFileSync(enPath, U);
  const em = fmBlock(esRaw), nm = fmBlock(enRaw);
  if (!em || !nm) { log.push(`SKIP (no frontmatter): ${f}`); continue; }
  let esFm = em[2];
  const enFm = nm[2];
  let n = 0;
  for (const k of KEYS) {
    const enVal = readKey(enFm, k);
    const esVal = readKey(esFm, k);
    if (enVal === null) continue;            // key absent in EN -> leave ES alone
    if (esVal === null) continue;            // key absent in ES -> don't invent it
    if (enVal === esVal) continue;           // already correct
    esFm = esFm.replace(new RegExp(`^${k}:[ \\t]*.*$`, 'm'), `${k}: ${enVal}`);
    log.push(`  ${f}: ${k}  ${esVal}  ->  ${enVal}`);
    n++;
  }
  if (n) {
    fs.writeFileSync(esPath, esRaw.slice(0, em.index) + em[1] + esFm + esRaw.slice(em.index + em[1].length + em[2].length), U);
    changed++; edits += n;
  }
}
log.forEach(l => console.log(l));
console.log(`\nfiles changed: ${changed}   field edits: ${edits}`);
