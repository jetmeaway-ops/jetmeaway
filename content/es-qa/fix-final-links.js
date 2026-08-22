// Final targeted link restorations: wrap an existing Spanish phrase in a markdown link.
// IMPORTANT: these FAQ texts appear TWICE — once in the YAML frontmatter and once in the
// body. The link belongs in the BODY only (EN keeps external links out of frontmatter),
// so we search strictly AFTER the closing --- of the frontmatter.
const fs = require('fs');
const D = 'C:/Users/10ban/OneDrive/Desktop/jetmeaway/content/posts/es/';
const U = 'utf8';

// [file, phrase to wrap, url]
const FIXES = [
  ['best-hotels-agadir-2026.mdx', 'el consejo de viajes de Marruecos de la Oficina de Relaciones Exteriores del Reino Unido', 'https://www.gov.uk/foreign-travel-advice/morocco'],
  ['best-hotels-krabi-2026.mdx', 'verifica la asignación actual y cualquier requisito de registro antes de volar', 'https://www.gov.uk/foreign-travel-advice/thailand'],
  ['best-hotels-rovinj-2026.mdx', 'el consejo de viaje de Croacia del gobierno del Reino Unido', 'https://www.gov.uk/foreign-travel-advice/croatia'],
];

const bodyStart = t => {
  const m = t.match(/^---\r?\n[\s\S]*?\r?\n---/);
  return m ? m[0].length : 0;
};

for (const [f, phrase, url] of FIXES) {
  const p = D + f;
  const t = fs.readFileSync(p, U);
  const start = bodyStart(t);
  let idx = -1, from = start;
  while (true) {
    const i = t.indexOf(phrase, from);
    if (i === -1) break;
    if (t[i - 1] !== '[') { idx = i; break; }   // skip if already linked
    from = i + phrase.length;
  }
  if (idx === -1) { console.log('  NO unlinked BODY occurrence: ' + f); continue; }
  const out = t.slice(0, idx) + '[' + phrase + '](' + url + ')' + t.slice(idx + phrase.length);
  fs.writeFileSync(p, out, U);
  console.log('  FIXED (body) ' + f);
}
