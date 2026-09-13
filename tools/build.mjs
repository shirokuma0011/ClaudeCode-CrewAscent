import {mkdir,readdir,cp,readFile,writeFile,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
const root=process.cwd(),dist=resolve(root,'dist');
// Never remove arbitrary project paths. Build only into this dedicated output tree.
await mkdir(join(dist,'client'),{recursive:true});await mkdir(join(dist,'server'),{recursive:true});await mkdir(join(dist,'.openai'),{recursive:true});
for(const n of await readdir(root))if(n.endsWith('.html')||['robots.txt','sitemap.xml'].includes(n))await cp(join(root,n),join(dist,'client',n));
for(const n of ['assets','contracts'])await cp(join(root,n),join(dist,'client',n),{recursive:true});
await mkdir(join(dist,'client','data'),{recursive:true});for(const n of ['works.json','commerce-plans.json'])await cp(join(root,'data',n),join(dist,'client','data',n));
await cp(join(root,'server/api.mjs'),join(dist,'server/api.mjs'));await cp(join(root,'server/worker.mjs'),join(dist,'server/index.js'));await cp(join(root,'.openai/hosting.json'),join(dist,'.openai/hosting.json'));await cp(join(root,'drizzle'),join(dist,'.openai/drizzle'),{recursive:true});
const hashes={};async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())await walk(p);else hashes[p.slice(dist.length+1).replaceAll('\\','/')]=createHash('sha256').update(await readFile(p)).digest('hex');}}await walk(dist);
await writeFile(join(root,'.local/build-manifest.json'),JSON.stringify(hashes,null,2));
await import('../server/worker.mjs').then(m=>{if(typeof m.default.fetch!=='function')throw Error('Missing Worker fetch export');});
console.log(`Built ${Object.keys(hashes).length} files. Worker + static pages + database migrations.`);
