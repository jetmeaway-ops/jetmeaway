// Deterministic, NO-AI repair of the Arabic corpus using the English source as truth.
// (1) Restore KEEP-Latin frontmatter fields (category/ctaCity/slug/... ) from EN.
// (2) Restore every markdown/image link target ](...) positionally from EN when counts match
//     — fixes corrupted affiliate/deep links (dropped digit, inserted space) and dropped-URL parity.
// Leaves content-loss files (dropped FAQ/images, mismatched link counts) for later re-translation.
// Run: node content/ar-qa/fix-mechanical.js
const fs = require('fs');
const matter = require('C:/Users/10ban/OneDrive/Desktop/jetmeaway/node_modules/gray-matter');
const ROOT = 'C:/Users/10ban/OneDrive/Desktop/jetmeaway/.claude/worktrees/strange-gould-788a91';
const AR = ROOT + '/content/posts/ar', EN = ROOT + '/content/posts', U = 'utf8';
const KEEP = ['slug', 'category', 'author', 'date', 'dateModified', 'heroImage', 'ctaCity', 'ctaFlightsTo'];
const files = fs.readdirSync(AR).filter(f => f.endsWith('.mdx')).sort();

const splitFm = t => { const m = t.match(/^---\r?\n([\s\S]*?)\r?\n---(\r?\n?)/); return m ? { fm: m[1], rest: t.slice(m[0].length), had: true } : { fm: '', rest: t, had: false }; };
const lineFor = (fmText, key) => { const re = new RegExp('^' + key + ':.*$', 'm'); const m = fmText.match(re); return m ? m[0].replace(/\r$/, '') : null; };

let fmFixed = 0, linkFixed = 0, linkSkipped = 0, unchanged = 0, noFm = 0;
const fmChangedFiles = [], linkChangedFiles = [], linkSkippedFiles = [];

for (const f of files) {
  const arPath = `${AR}/${f}`, enPath = `${EN}/${f}`;
  if (!fs.existsSync(enPath)) continue;
  let ar = fs.readFileSync(arPath, U);
  const en = fs.readFileSync(enPath, U);
  const before = ar;

  // --- (1) frontmatter KEEP-Latin restore (raw line copy from EN) ---
  const aS = splitFm(ar), eS = splitFm(en);
  if (aS.had && eS.had) {
    let fm = aS.fm;
    let changed = false;
    for (const k of KEEP) {
      const enLine = lineFor(eS.fm, k);
      if (enLine == null) continue;
      const re = new RegExp('^' + k + ':.*$', 'm');
      if (re.test(fm)) {
        const cur = fm.match(re)[0].replace(/\r$/, '');
        if (cur !== enLine) { fm = fm.replace(re, enLine); changed = true; }
      } else {
        fm = fm + '\n' + enLine; changed = true; // missing key -> add it
      }
    }
    if (changed) { ar = '---\n' + fm + '\n---' + (aS.rest.startsWith('\n') ? '' : '\n') + aS.rest; fmFixed++; fmChangedFiles.push(f); }
  } else if (!aS.had) { noFm++; }

  // --- (2) positional link-target restore (body only) ---
  const a2 = splitFm(ar);
  const bodyAr = a2.rest, bodyEn = splitFm(en).rest;
  const enTargets = [...bodyEn.matchAll(/\]\(([^)]*)\)/g)].map(m => m[1]);
  const arCount = (bodyAr.match(/\]\(([^)]*)\)/g) || []).length;
  if (enTargets.length && enTargets.length === arCount) {
    let i = 0, any = false;
    const newBody = bodyAr.replace(/\]\(([^)]*)\)/g, (m, g) => { const t = enTargets[i++]; if (t !== g) any = true; return '](' + t + ')'; });
    if (any) { ar = ar.slice(0, ar.length - bodyAr.length) + newBody; linkFixed++; linkChangedFiles.push(f); }
  } else if (enTargets.length !== arCount) {
    linkSkipped++; linkSkippedFiles.push(`${f} (en:${enTargets.length} ar:${arCount})`);
  }

  if (ar !== before) fs.writeFileSync(arPath, ar, U); else unchanged++;
}

console.log(`Processed ${files.length} files.`);
console.log(`  frontmatter Latin-fields restored: ${fmFixed}`);
console.log(`  link targets restored (positional): ${linkFixed}`);
console.log(`  link-fix SKIPPED (count mismatch -> needs re-translation): ${linkSkipped}`);
console.log(`  files with no detectable frontmatter block: ${noFm}`);
console.log(`  unchanged: ${unchanged}`);
fs.writeFileSync(AR + '/../ar-qa/fix-skipped-links.txt', linkSkippedFiles.sort().join('\n') + '\n', U);
console.log(`  (skipped-link files written to content/ar-qa/fix-skipped-links.txt)`);
