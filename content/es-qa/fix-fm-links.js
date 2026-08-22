// Strip EXTERNAL markdown links from YAML frontmatter FAQ answers.
// Verified against the English corpus: EN frontmatter contains internal ](/...) links in
// 49 files (LEGITIMATE — keep them) but NEVER external ](http...) links (0/545).
// So we strip external links only. Frontmatter block only; body untouched.
const fs = require('fs');
const ES = 'C:/Users/10ban/OneDrive/Desktop/jetmeaway/content/posts/es';
const U = 'utf8';
const LINK = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;   // EXTERNAL ONLY — never touch ](/internal)

let files = 0, stripped = 0;
for (const f of fs.readdirSync(ES).filter(x => x.endsWith('.mdx')).sort()) {
  const p = `${ES}/${f}`;
  const raw = fs.readFileSync(p, U);
  const m = raw.match(/^(---\r?\n)([\s\S]*?)(\r?\n---)/);
  if (!m) continue;
  const fm = m[2];
  if (!LINK.test(fm)) { LINK.lastIndex = 0; continue; }
  LINK.lastIndex = 0;
  let n = 0;
  const fixed = fm.replace(LINK, (_, text) => { n++; return text; });
  fs.writeFileSync(p, raw.slice(0, m.index) + m[1] + fixed + raw.slice(m.index + m[1].length + fm.length), U);
  console.log(`  ${f}: stripped ${n} link(s) from frontmatter`);
  files++; stripped += n;
}
console.log(`\nfiles changed: ${files}   links stripped: ${stripped}`);
