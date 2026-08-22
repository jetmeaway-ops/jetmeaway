// Remove a duplicated markdown link on a specific line, keeping the anchor text.
// EN has the link once (later in the body); an earlier repair added a second copy in the intro.
const fs = require('fs');
const D = 'C:/Users/10ban/OneDrive/Desktop/jetmeaway/content/posts/es/';
const U = 'utf8';

// [file, 1-indexed line to unwrap, url that must be removed from that line]
const JOBS = [
  ['best-hotels-da-nang-2026.mdx', 74, 'https://www.gov.uk/foreign-travel-advice/vietnam'],
  ['best-hotels-ljubljana-2026.mdx', 76, 'https://www.gov.uk/foreign-travel-advice/slovenia'],
];

for (const [f, lineNo, url] of JOBS) {
  const p = D + f;
  const lines = fs.readFileSync(p, U).split('\n');
  const i = lineNo - 1;
  if (!lines[i] || !lines[i].includes(url)) { console.log('  line mismatch, skipped: ' + f); continue; }
  // [anchor](url)  ->  anchor
  const before = lines[i];
  lines[i] = lines[i].replace(new RegExp('\\[([^\\]]*)\\]\\(' + url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\)'), '$1');
  if (lines[i] === before) { console.log('  no link pattern on line, skipped: ' + f); continue; }
  fs.writeFileSync(p, lines.join('\n'), U);
  console.log('  unwrapped duplicate on line ' + lineNo + ': ' + f);
}
