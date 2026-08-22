// Fix Haiku's frontmatter mistake: a value wrapped in «…» or curly “…” instead
// of YAML "…". Rewrap as a proper double-quoted YAML scalar, escaping any inner
// ASCII quote. Operates ONLY on the frontmatter block. Args: file paths.
const fs=require('fs');
const OPEN=/[«“]/, // wrapper openers Haiku used
      // value line: KEY: <wrapper>...<wrapper>
      LINE=/^(\s*(?:-\s*)?[A-Za-z0-9_]+:\s*)([«“])(.*)([»”])\s*$/;
let changed=0;
for(const p of process.argv.slice(2)){
  const raw=fs.readFileSync(p,'utf8');
  const m=raw.match(/^(---\r?\n[\s\S]*?\r?\n---)(\r?\n[\s\S]*)$/);
  if(!m){ console.log('no frontmatter: '+p); continue; }
  let n=0;
  const fm=m[1].split('\n').map(line=>{
    const g=line.match(LINE);
    if(!g) return line;
    n++;
    const inner=g[3].replace(/"/g,'\\"'); // escape inner ASCII quotes for YAML
    return g[1]+'"'+inner+'"';
  }).join('\n');
  if(n>0){ fs.writeFileSync(p, fm+m[2], 'utf8'); changed++; console.log('fixed '+n+' values: '+p.split(/[\/]/).pop()); }
  else console.log('nothing to fix: '+p.split(/[\/]/).pop());
}
console.log('files changed: '+changed);
