const fs = require('fs');
const D = 'C:/Users/10ban/OneDrive/Desktop/jetmeaway/content/posts/';
const jobs = [
  ['best-hotels-da-nang-2026.mdx', 'vietnam'],
  ['best-hotels-gothenburg-2026.mdx', 'sweden'],
  ['best-hotels-ljubljana-2026.mdx', 'slovenia'],
  ['best-hotels-rabat-2026.mdx', 'morocco'],
  ['best-hotels-warsaw-2026.mdx', 'poland'],
];
for (const [f, c] of jobs) {
  const url = 'https://www.gov.uk/foreign-travel-advice/' + c;
  const en = fs.readFileSync(D + f, 'utf8');
  const esLines = fs.readFileSync(D + 'es/' + f, 'utf8').split('\n');
  // EN anchor text
  const i = en.indexOf('](' + url + ')');
  let anchor = '?';
  if (i > -1) { const s = en.lastIndexOf('[', i); anchor = en.slice(s + 1, i); }
  console.log('=== ' + f + '\n    EN anchor: "' + anchor + '"');
  // EN line index -> same index in ES
  const enLine = en.slice(0, i).split('\n').length;
  console.log('    EN line ' + enLine);
  const fmEnd = esLines.findIndex((l, n) => n > 0 && l.trim() === '---');
  const re = /(consejo|asesoramiento|orientación|orientacion|aviso|advertencia)/i;
  const cand = [];
  esLines.forEach((l, n) => { if (n + 1 > fmEnd && re.test(l) && /Reino Unido|gobierno|FCDO/i.test(l)) cand.push([n + 1, l]); });
  cand.slice(0, 2).forEach(([n, l]) => {
    const m = l.match(/.{0,70}(consejo|asesoramiento|orientación|aviso).{0,120}/i);
    console.log('    ES L' + n + ': ...' + (m ? m[0] : l.slice(0, 150)) + '...');
  });
  if (!cand.length) console.log('    ES: no candidate line found');
}
