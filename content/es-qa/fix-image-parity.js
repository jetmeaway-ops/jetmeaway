// Align IMAGE urls positionally with the English source.
// Image markdown is ![alt](url): the alt text is translated (leave it), but the URL is
// data — it must be byte-identical to EN, and image order == hotel order, so the Nth ES
// image URL must equal the Nth EN image URL. Only rewrites when the image COUNT matches.
const fs = require('fs');
const MAIN = 'C:/Users/10ban/OneDrive/Desktop/jetmeaway';
const ES = MAIN + '/content/posts/es', EN = MAIN + '/content/posts';
const U = 'utf8';
const IMG = /(!\[[^\]]*\]\()([^)]*)(\))/g;

let files = 0, fixed = 0;
for (const f of fs.readdirSync(ES).filter(x => x.endsWith('.mdx')).sort()) {
  const p = `${ES}/${f}`, q = `${EN}/${f}`;
  if (!fs.existsSync(q)) continue;
  const es = fs.readFileSync(p, U), en = fs.readFileSync(q, U);
  const enUrls = [...en.matchAll(IMG)].map(m => m[2]);
  const esUrls = [...es.matchAll(IMG)].map(m => m[2]);
  if (enUrls.length !== esUrls.length || !enUrls.length) continue;
  const diffs = enUrls.reduce((n, u, i) => n + (u !== esUrls[i] ? 1 : 0), 0);
  if (!diffs) continue;
  let i = 0;
  const out = es.replace(IMG, (m, a, _u, c) => a + (enUrls[i++] ?? _u) + c);
  fs.writeFileSync(p, out, U);
  console.log(`  ${f}: ${diffs} image url(s) corrected`);
  files++; fixed += diffs;
}
console.log(`\nfiles changed: ${files}   image urls corrected: ${fixed}`);
