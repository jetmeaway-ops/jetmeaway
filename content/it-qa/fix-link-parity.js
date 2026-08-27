// Repair URL/link fidelity in the Italian corpus.
// URLs are NOT translatable content — they must be byte-identical to the English source.
// Link sequences are positionally aligned between EN and IT (numbered hotel lists preserve order),
// so when the COUNT matches we can safely substitute the EN URL at each position. Prose is untouched.
// Files whose counts differ are reported, never guessed at (a link was dropped/added → re-translate).
const fs = require('fs');
const ROOT = 'C:/Users/10ban/OneDrive/Desktop/jetmeaway/.claude/worktrees/italian-planning-approach-2acd38';
const IT = ROOT + '/content/posts/it', EN = ROOT + '/content/posts';
const U = 'utf8';

const RX_INTERNAL = /\]\((\/[^)]*)\)/g;          // ](/hotels/...) and ](/blog/...)
const RX_EXTERNAL = /https?:\/\/[^\s)"'\]<>]+/g; // image CDNs, gov.uk, etc.

const grab = (t, rx) => t.match(rx) || [];
const align = (text, rx, want) => {
  let i = 0;
  return text.replace(rx, m => (i < want.length ? want[i++] : (i++, m)));
};

let fixedFiles = 0, fixedLinks = 0;
const mismatched = [];
for (const f of fs.readdirSync(IT).filter(x => x.endsWith('.mdx')).sort()) {
  const itPath = `${IT}/${f}`, enPath = `${EN}/${f}`;
  if (!fs.existsSync(enPath)) continue;
  let it = fs.readFileSync(itPath, U);
  const en = fs.readFileSync(enPath, U);
  const before = it;
  const notes = [];

  for (const [label, rx] of [['internal', RX_INTERNAL], ['external', RX_EXTERNAL]]) {
    const a = grab(en, rx), b = grab(it, rx);
    if (a.length !== b.length) { notes.push(`${label} COUNT ${b.length}/${a.length}`); continue; }
    const diffs = a.reduce((n, x, i) => n + (x !== b[i] ? 1 : 0), 0);
    if (!diffs) continue;
    it = align(it, rx, a);
    fixedLinks += diffs;
    notes.push(`${label} +${diffs} repaired`);
  }

  if (it !== before) { fs.writeFileSync(itPath, it, U); fixedFiles++; }
  const bad = notes.filter(n => n.includes('COUNT'));
  if (bad.length) mismatched.push(`${f}  ${bad.join(', ')}`);
  else if (notes.length) console.log(`  ${f}: ${notes.join(', ')}`);
}
console.log(`\nfiles repaired: ${fixedFiles}   urls corrected: ${fixedLinks}`);
if (mismatched.length) {
  console.log(`\nNEEDS MANUAL (link count differs — a link was dropped or added): ${mismatched.length}`);
  mismatched.forEach(m => console.log('  ' + m));
}
