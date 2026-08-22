const fs=require('fs'), path=require('path');
const MAIN='C:/Users/10ban/OneDrive/Desktop/jetmeaway';
const matter=require(MAIN+'/node_modules/gray-matter');
const esDir=MAIN+'/content/posts/es';
const srcDir=MAIN+'/content/posts';
const U='utf8';
const files=fs.readdirSync(esDir).filter(f=>f.endsWith('.mdx')).sort();
const QC=(t,rx)=>(t.match(rx)||[]).length;
const moji=/[\u00C3\u00C2][\u00A0-\u00BF]|\u00E2[\u0080-\u009F\u20AC]/;
const trunc=/\[continu|se continúa|Debido a(l| la) (longitud|límite)|continuing (with|the)/i;
let okParse=0, fails=[];
for(const f of files){
  const es=fs.readFileSync(path.join(esDir,f),U);
  const enP=path.join(srcDir,f);
  let p; try{ p=matter(es); }catch(e){ fails.push(f+'  [YAML: '+String(e.message).split('\n')[0]+']'); continue; }
  if(!p.data||!p.data.slug){ fails.push(f+'  [no slug]'); continue; }
  okParse++;
  if(!fs.existsSync(enP)){ console.log(f+'  parsed OK (no EN source?)'); continue; }
  const en=fs.readFileSync(enP,U);
  const enS=matter(en);
  const probs=[];
  const el=en.split('\n').length, esl=es.split('\n').length;
  if(esl < el*0.9 || esl > el*1.15) probs.push('lines '+esl+'/'+el);
  const enF=QC(en,/^\s*-\s*q:/gm), esF=QC(es,/^\s*-\s*q:/gm);
  if(enF!==esF) probs.push('FAQ '+esF+'/'+enF);
  const enI=QC(en,/!\[/g), esI=QC(es,/!\[/g);
  if(enI!==esI) probs.push('img '+esI+'/'+enI);
  if((enS.data.slug||'')!==(p.data.slug||'')) probs.push('SLUG-DIFF');
  if(moji.test(es)) probs.push('MOJIBAKE');
  if(trunc.test(es)) probs.push('TRUNCATED');
  if(QC(es,/\bgenuinely\b/g)>0) probs.push('genuinely');
  if(QC(es,/\bmin read\b/g)>0) probs.push('min-read-EN');
  const usted=QC(es,/\busted\b/gi), inv=QC(es,/[¿¡]/g);
  console.log((f.replace(/\.mdx$/,'')+'                                          ').slice(0,44)+(probs.length?'FAIL '+probs.join(', '):'OK')+'  [¿¡='+inv+' usted='+usted+']');
}
console.log('\nparsed OK '+okParse+'/'+files.length+'   YAML/slug FAILS '+fails.length);
fails.forEach(x=>console.log('  '+x));
