/* =====================================================================
   ブラウザで全ページを見て回る検査。

     node tools/browser-check.mjs
     node tools/browser-check.mjs --widths=390,1280

   見るもの（1つでも当たれば不合格）:
     ・横スクロール（overflow:hidden で隠れているものは数えない）
     ・読み込めなかった画像
     ・11px未満の文字
     ・JSエラー / console.error
     ・404 になった読み込み

   site/ を自前で配信するので、事前にサーバーを立てる必要はありません。
   ===================================================================== */
import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import pw from 'playwright';
import { SITE } from './paths.mjs';

const { chromium } = pw;
const WIDTHS = (process.argv.find((a) => a.startsWith('--widths='))?.split('=')[1] || '320,390,768,1280')
  .split(',').map(Number);

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8' };
const server = createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  const file = path.join(SITE, rel);
  if (!file.startsWith(SITE) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;

const files = fs.readdirSync(SITE).filter((f) => f.endsWith('.html') && !f.startsWith('_')).sort();
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
let bad = 0, n = 0;
for (const w of WIDTHS) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push('JS: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  p.on('response', (r) => { if (r.status() >= 400) errs.push(`${r.status()} ${r.url().replace(BASE, '')}`); });
  for (const f of files) {
    errs.length = 0;
    await p.goto(`${BASE}/${f}`, { waitUntil: 'networkidle' });
    const r = await p.evaluate(() => {
      const wide = [...document.querySelectorAll('body *')].filter((el) => {
        let a = el.parentElement, clipped = false;
        while (a) { const o = getComputedStyle(a).overflowX; if (['hidden', 'clip', 'auto', 'scroll'].includes(o)) { clipped = true; break; } a = a.parentElement; }
        return !clipped && el.getBoundingClientRect().right > document.documentElement.clientWidth + 1;
      }).map((el) => el.tagName + '.' + String(el.className).split(' ')[0]);
      const broken = [...document.images].filter((i) => i.complete && i.naturalWidth === 0)
        .map((i) => (i.currentSrc || i.src).split('/').pop());
      const tiny = [...document.querySelectorAll('body *')].filter((el) => {
        if (!el.offsetParent) return false;
        const t = [...el.childNodes].filter((x) => x.nodeType === 3).map((x) => x.textContent.trim()).join('');
        return t && parseFloat(getComputedStyle(el).fontSize) < 11;
      }).map((el) => String(el.className) || el.tagName);
      return {
        ovf: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        wide: [...new Set(wide)].slice(0, 3),
        broken: [...new Set(broken)].slice(0, 3),
        tiny: [...new Set(tiny)].slice(0, 3),
      };
    });
    n += 1;
    if (r.ovf > 0 || r.wide.length || r.broken.length || r.tiny.length || errs.length) {
      bad += 1;
      console.log(`NG ${String(w).padStart(4)} ${f}`, JSON.stringify(r), errs.slice(0, 2));
    }
  }
  await ctx.close();
}
await b.close();
server.close();
console.log(`確認 ${n} 通り（${files.length}ページ × ${WIDTHS.length}画面幅）／ 問題 ${bad} 件`);
process.exit(bad ? 1 : 0);
