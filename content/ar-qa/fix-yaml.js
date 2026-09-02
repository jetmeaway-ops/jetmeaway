// Targeted, NO-AI YAML frontmatter repair for the 11 parse-fail files.
// (a) unterminated double-quoted scalar -> append closing "
// (b) title/excerpt wrapped in « » (unquoted, contains ':') -> wrap in "
// (c) duplicated consecutive q:/a: key -> drop the first
// Verifies each file parses after repair; only writes if it now parses.
const fs = require('fs');
const matter = require('C:/Users/10ban/OneDrive/Desktop/jetmeaway/node_modules/gray-matter');
const AR = 'C:/Users/10ban/OneDrive/Desktop/jetmeaway/.claude/worktrees/strange-gould-788a91/content/posts/ar';
const FILES = ['best-hotels-copenhagen-2026','best-hotels-santorini-2026'].map(s => s + '.mdx');

const splitFm = t => { const m = t.match(/^---\r?\n([\s\S]*?)\r?\n---(\r?\n?)/); return m ? { fm: m[1], rest: t.slice(m[0].length), had: true } : { had: false }; };

let fixed = 0, still = [];
for (const f of FILES) {
  const p = `${AR}/${f}`;
  let t = fs.readFileSync(p, 'utf8');
  const s = splitFm(t);
  if (!s.had) { still.push(f + ' (no fm block)'); continue; }
  let lines = s.fm.split('\n').map(l => l.replace(/\r$/, ''));
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    let l = lines[i];
    // (c) drop a line that duplicates the previous key at same indent (e.g. two a:)
    const km = l.match(/^(\s*)(q|a):\s/);
    const pm = out.length ? out[out.length - 1].match(/^(\s*)(q|a):\s/) : null;
    if (km && pm && km[1] === pm[1] && km[2] === pm[2]) { continue; } // skip duplicate
    // (b) « » wrapped title/excerpt -> double-quote
    const g = l.match(/^(\s*(?:-\s*)?(?:title|excerpt|q|a):\s*)«\s*(.*?)\s*»\s*$/);
    if (g) { l = `${g[1]}"${g[2]}"`; }
    // (a) starts a double-quoted scalar but has an ODD number of unescaped " -> append closing "
    const vm = l.match(/^\s*(?:-\s*)?(?:title|excerpt|readTime|category|q|a):\s*"(.*)$/);
    if (vm) {
      const quotes = (l.match(/"/g) || []).length;
      if (quotes % 2 === 1) l = l + '"';
    }
    out.push(l);
  }
  const newFm = out.join('\n');
  const cand = '---\n' + newFm + '\n---' + (s.rest.startsWith('\n') ? '' : '\n') + s.rest;
  try { const d = matter(cand).data; if (!d.slug) throw new Error('no slug'); fs.writeFileSync(p, cand, 'utf8'); fixed++; }
  catch (e) { still.push(f + ' :: ' + e.message.split('\n')[0]); }
}
console.log(`YAML-repaired & now parsing: ${fixed}/${FILES.length}`);
if (still.length) { console.log('STILL failing:'); still.forEach(x => console.log('  ' + x)); }
