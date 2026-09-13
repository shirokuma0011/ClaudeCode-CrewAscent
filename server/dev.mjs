import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8','.xml':'application/xml','.md':'text/plain; charset=utf-8'};
http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://127.0.0.1:4310');
    if(url.pathname.startsWith('/api/')){
      const {handleLocal}=await import('./local-api.mjs');
      return await handleLocal(req,res);
    }
    const name=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);
    if(!/^\/(?:[a-zA-Z0-9_-]+\.html|assets\/[a-zA-Z0-9_./-]+|contracts\/[a-zA-Z0-9_.-]+\.(?:html|md)|data\/(?:works|commerce-plans)\.json|robots\.txt|sitemap\.xml)$/.test(name)||name.includes('..')){res.writeHead(404);return res.end('Not found');}
    const target=resolve(root,'.'+name);
    const data=await readFile(target);
    res.writeHead(200,{'content-type':mime[extname(target)]||'application/octet-stream','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(data);
  }catch(e){res.writeHead(e.code==='ENOENT'?404:500);res.end(e.code==='ENOENT'?'Not found':'Server unavailable');}
}).listen(4310,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4310'));
