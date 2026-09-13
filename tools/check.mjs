import {readFile,readdir,stat} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd();const pages=(await readdir(root)).filter(n=>n.endsWith('.html')).concat((await readdir(resolve(root,'contracts'))).filter(n=>n.endsWith('.html')).map(n=>'contracts/'+n));
const errors=[],warnings=[];const html=new Map();
for(const p of pages)html.set(p,await readFile(resolve(root,p),'utf8'));
let refs=0;
for(const [p,rawSource]of html){
 const s=rawSource.replace(/<!--[\s\S]*?-->/g,'');
 if((s.match(/<h1(?:\s|>)/g)||[]).length!==1)errors.push(p+': h1 is not unique');
 if(!/<html[^>]+lang="ja"/.test(s))errors.push(p+': missing Japanese language');
 if(!/<meta name="viewport"/.test(s))errors.push(p+': missing viewport');
 if(!s.includes('noindex'))errors.push(p+': preview must stay noindex');
 const ids=[...s.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);if(new Set(ids).size!==ids.length)errors.push(p+': duplicate id');
 for(const m of s.matchAll(/(?:href|src)="([^"<>]+)"/g)){
  const value=m[1].replaceAll('&amp;','&');if(/^(?:https?:|data:|mailto:|tel:|javascript:)/i.test(value))continue;
  const [raw,hash]=value.split('#');const file=raw.split('?')[0];if(!file&&(!hash||hash===''))continue;const target=resolve(dirname(resolve(root,p)),file||p.split('/').pop());
  if(target!==root&&!target.startsWith(root+'\\')&&!target.startsWith(root+'/')){errors.push(p+': outside-root '+value);continue;}
  try{await stat(target);refs++;}catch{errors.push(p+': missing '+value);continue;}
  if(hash&&!['main','top'].includes(hash)){const content=await readFile(target,'utf8');if(!content.includes('id="'+hash+'"'))warnings.push(p+': anchor '+value);}
 }
}
const contracts=pages.filter(p=>p.startsWith('contracts/'));assert.equal(contracts.length,8);assert.equal(pages.filter(p=>p.startsWith('checkout-')).length,4);assert.equal(pages.filter(p=>p.startsWith('type-')).length,36);
console.log(JSON.stringify({pages:pages.length,contracts:contracts.length,typePages:36,localReferences:refs,errors,warnings},null,2));
if(errors.length)process.exitCode=1;
