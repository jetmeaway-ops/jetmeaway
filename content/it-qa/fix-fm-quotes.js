// Surgical fix for YAML-broken Italian frontmatter where the BODY is complete.
// Root cause: inner straight double-quotes inside a double-quoted scalar, or an
// unquoted scalar that contains ": ", or a scalar opened with " but not closed.
// We only touch the frontmatter block; the body is left byte-for-byte.
// Writes only if the result parses with gray-matter; otherwise reports for re-translation.
const fs = require('fs');
const matter = require('C:/Users/10ban/OneDrive/Desktop/jetmeaway/node_modules/gray-matter');
const IT = 'content/posts/it';
const files = process.argv.slice(2);

const fixLine = (line) => {
  // key:  or  - key:   prefix, then the value
  const m = line.match(/^(\s*(?:- )?[A-Za-z][\w]*:\s+)(.*)$/);
  if (!m) return line;
  const prefix = m[1];
  let val = m[2];
  const trailing = val.match(/\s*$/)[0];
  val = val.replace(/\s*$/, '');
  if (val === '') return line;
  if (val[0] === '"') {
    // quoted (maybe unterminated). Take inner = everything after first " up to last " (if closed) else to end.
    let inner, closed;
    if (val.length > 1 && val[val.length - 1] === '"') { inner = val.slice(1, -1); closed = true; }
    else { inner = val.slice(1); closed = false; }
    // escape any raw " inside inner that isn't already escaped
    inner = inner.replace(/\\"/g, '\uE000').replace(/"/g, '\\"').replace(/\uE000/g, '\\"');
    return prefix + '"' + inner + '"' + trailing;
  }
  // unquoted: quote it if it contains a colon-space or a leading char YAML dislikes
  if (/: /.test(val) || /^[\[\]{}#&*!|>%@`]/.test(val) || /"/.test(val)) {
    const inner = val.replace(/\\"/g, '\uE000').replace(/"/g, '\\"').replace(/\uE000/g, '\\"');
    return prefix + '"' + inner + '"' + trailing;
  }
  return line;
};

for (const s of files) {
  const p = `${IT}/${s}.mdx`;
  const raw = fs.readFileSync(p, 'utf8');
  const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) { console.log(`${s}: no frontmatter block`); continue; }
  const nl = raw.includes('\r\n') ? '\r\n' : '\n';
  const fixed = fm[1].split(/\r?\n/).map(fixLine).join(nl);
  const out = raw.replace(fm[1], fixed);
  try { matter(out); fs.writeFileSync(p, out, 'utf8'); console.log(`${s}: FIXED (parses)`); }
  catch (e) { console.log(`${s}: STILL BROKEN -> re-translate (${String(e.message).split('\n')[0]})`); }
}
