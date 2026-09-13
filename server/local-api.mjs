import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {handleApi} from './api.mjs';
import {sqliteBinding} from './sqlite.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const db=sqliteBinding(resolve(root,'.local/crew.sqlite'),resolve(root,'drizzle'));
function envValues(){let result={SITE_MODE:'preview',ACCEPT_SUBMISSIONS:'true',SITE_ORIGIN:'http://127.0.0.1:4310',LOCAL_CLIENT_IP:'127.0.0.1',DB:db};for(const f of ['.env','.env.local']){if(existsSync(resolve(root,f)))for(const l of readFileSync(resolve(root,f),'utf8').split(/\r?\n/)){const m=l.match(/^([A-Z_0-9]+)=(.*)$/);if(m)result[m[1]]=m[2].replace(/^['"]|['"]$/g,'');}}return {...result,...process.env,DB:db};}
export async function handleLocal(req,res){const chunks=[];let total=0;for await(const chunk of req){total+=chunk.length;if(total>256000){res.writeHead(413);return res.end('Too large');}chunks.push(chunk);}const request=new Request('http://127.0.0.1:4310'+req.url,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});const response=await handleApi(request,envValues(),{waitUntil:promise=>promise.catch(()=>{})});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}
