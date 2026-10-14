/* =====================================================================
   見本サイトのサムネイルを撮る  shoot-thumb.mjs  v2026-10-15

   使い方（リポジトリの直下で実行）:
     node samples-kit/<番号>-<id>/scripts/shoot-thumb.mjs <id>
   出力: site/assets/img/works/<id>.jpg（1600×1000、品質82）
   動きを減らす設定で撮るので、アニメーションの途中ではなく完成形が写ります。
   ===================================================================== */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

/* ブラウザ: CHROMIUM_PATH → Playwright の既定 → 本体の検査（tools/browser-check.mjs）と同じ場所、の順に試す */
async function launchBrowser() {
  const tries = [];
  if (process.env.CHROMIUM_PATH) tries.push({ executablePath: process.env.CHROMIUM_PATH });
  tries.push({});
  const known = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  if (fs.existsSync(known)) tries.push({ executablePath: known });
  let last;
  for (const opt of tries) { try { return await chromium.launch(opt); } catch (e) { last = e; } }
  console.error('ブラウザを起動できません。CHROMIUM_PATH にChromeの場所を指定してください。\n' + (last && last.message.split('\n')[0]));
  process.exit(2);
}

const id = process.argv[2];
if (!id) { console.error('使い方: node shoot-thumb.mjs <id>'); process.exit(2); }
const ROOT = path.resolve('site');
if (!fs.existsSync(path.join(ROOT, 'samples', id, 'index.html'))) { console.error('site/samples/' + id + '/index.html がありません'); process.exit(2); }
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await launchBrowser();
const p = await (await browser.newContext({ viewport: { width: 1600, height: 1000 }, reducedMotion: 'reduce' })).newPage();
await p.goto(`http://127.0.0.1:${server.address().port}/samples/${id}/index.html`, { waitUntil: 'networkidle' });
await p.waitForTimeout(1000);
const out = path.join(ROOT, 'assets/img/works', id + '.jpg');
fs.mkdirSync(path.dirname(out), { recursive: true });
await p.screenshot({ path: out, type: 'jpeg', quality: 82 });
await browser.close(); server.close();
console.log('書き出し: ' + path.relative(process.cwd(), out));
