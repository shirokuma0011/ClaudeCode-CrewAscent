/* =====================================================================
   見本サイト1件の検査  check-sample.mjs  v2026-10-15

   使い方（リポジトリの直下で実行）:
     node samples-kit/<番号>-<id>/scripts/check-sample.mjs <id>
     例) node samples-kit/07-sample-madonohi/scripts/check-sample.mjs sample-madonohi
   ブラウザの場所を指定したいとき:  CHROMIUM_PATH=/path/to/chrome node …（未指定なら自動で探す）

   見るもの（site/samples/<id>/ の全ページ × 320/390/768/1280px）
     ・横のはみ出し、コンソールエラー、読み込み失敗、外部への通信（1件でも不合格）
     ・title / description / robots noindex / lang / h1 が1つ
     ・クルーアセントの枠（帯・下の案内・見本ダイアログ）と「架空」の表示
     ・フォームは data-sample-form 付きで、送信できないこと
     ・文字の大きさ（12px未満は不合格）、コントラスト（4.5:1、大きな文字は3:1）
     ・押せる大きさ（24px未満は不合格、44px未満は注意）
     ・画像の alt と width/height
     ・動きを減らす設定で、繰り返し動くアニメーションが残っていないこと
     ・ページの転送量（600KB超で注意、1MB超で不合格）
   外部へは何も送りません。ローカルで配信して開くだけです。
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
if (!id) { console.error('使い方: node check-sample.mjs <id>'); process.exit(2); }
const ROOT = path.resolve('site');
const DIR = path.join(ROOT, 'samples', id);
if (!fs.existsSync(DIR)) { console.error(`見つかりません: ${DIR}（リポジトリの直下で実行してください）`); process.exit(2); }
const pages = fs.readdirSync(DIR).filter((f) => f.endsWith('.html')).sort();
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/samples/${id}/`;
const browser = await launchBrowser();
const issues = [], warns = [];
const ng = (m) => issues.push(m), warn = (m) => warns.push(m);
const titles = new Map();

for (const file of pages) {
  for (const w of [320, 390, 768, 1280]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: w < 600 ? 844 : 900 } });
    const p = await ctx.newPage();
    const errs = [], external = [], failed = []; let bytes = 0;
    p.on('pageerror', (e) => errs.push(e.message));
    p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    p.on('request', (r) => { const u = new URL(r.url()); if (!['127.0.0.1', 'localhost'].includes(u.hostname) && !u.protocol.startsWith('data') && !u.protocol.startsWith('blob')) external.push(r.url()); });
    p.on('response', async (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); try { bytes += (await r.body()).length; } catch {} });
    await p.goto(base + file, { waitUntil: 'networkidle' });
    await p.waitForTimeout(1200);
    const tag = `${file} @${w}`;
    errs.forEach((e) => ng(`${tag} エラー: ${e}`));
    external.forEach((u) => ng(`${tag} 外部への通信: ${u}`));
    failed.forEach((u) => ng(`${tag} 読み込み失敗: ${u}`));
    const r = await p.evaluate(() => {
      const out = { ng: [], warn: [] };
      const de = document.documentElement;
      if (de.scrollWidth > de.clientWidth) out.ng.push(`横にはみ出し ${de.scrollWidth - de.clientWidth}px`);
      const meta = (n) => (document.querySelector(`meta[name="${n}"]`) || {}).content || '';
      out.title = document.title;
      if (!document.title.trim()) out.ng.push('title がない');
      if (!meta('description').trim()) out.ng.push('meta description がない');
      if (!/noindex/.test(meta('robots'))) out.ng.push('robots に noindex がない');
      if (de.lang !== 'ja') out.ng.push('html lang="ja" でない');
      const h1 = document.querySelectorAll('h1').length; if (h1 !== 1) out.ng.push(`h1 が ${h1} 個`);
      if (!document.querySelector('link[href*="_shared/crew-frame.css"]')) out.ng.push('crew-frame.css を読んでいない');
      const ribbon = document.querySelector('.ca-ribbon');
      if (!ribbon) out.ng.push('上の帯（.ca-ribbon）がない');
      else if (document.body.firstElementChild !== ribbon && !(document.body.firstElementChild && document.body.firstElementChild.matches('.skip, .skip-link, a[href^="#"]') && document.body.children[1] === ribbon)) out.ng.push('上の帯が body の先頭にない（スキップリンクの次まで可）');
      if (!document.querySelector('.ca-credit')) out.ng.push('下の案内（.ca-credit）がない');
      if (!document.getElementById('ca-sample-dialog')) out.ng.push('見本ダイアログ（#ca-sample-dialog）がない');
      if (!/架空/.test(document.body.innerText)) out.ng.push('「架空」の表示がない');
      if (/制作後に記入/.test(document.body.innerText)) out.ng.push('「（制作後に記入）」が残っている');
      if (ribbon) { const cs = getComputedStyle(ribbon); if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 1 || ribbon.getBoundingClientRect().height < 40) out.ng.push('上の帯が隠れている・小さい'); }
      document.querySelectorAll('form').forEach((f) => { if (!f.hasAttribute('data-sample-form')) out.ng.push('data-sample-form のないフォーム'); if (f.getAttribute('action') && !/^#?$/.test(f.getAttribute('action'))) out.ng.push(`フォームの送信先がある: ${f.getAttribute('action')}`); });
      document.querySelectorAll('img').forEach((im) => { if (!im.hasAttribute('alt')) out.ng.push(`alt のない画像: ${im.getAttribute('src')}`); if (!im.getAttribute('width') || !im.getAttribute('height')) out.warn.push(`width/height のない画像: ${im.getAttribute('src')}`); });
      const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; };
      const lum = ({ r, g, b }) => { const f = (x) => { x /= 255; return x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
      const over = (t, b) => ({ r: t.r * t.a + b.r * (1 - t.a), g: t.g * t.a + b.g * (1 - t.a), b: t.b * t.a + b.b * (1 - t.a), a: 1 });
      const bgOf = (el) => { const st = []; for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.backgroundImage !== 'none' && !e.matches('html,body')) return null; const c = parse(cs.backgroundColor); if (c && c.a > 0) { st.push(c); if (c.a >= 1) break; } } let col = { r: 255, g: 255, b: 255, a: 1 }; for (let i = st.length - 1; i >= 0; i--) col = over(st[i], col); return col; };
      const seen = new Set(); let lowC = 0, tiny = 0;
      const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n; (n = tw.nextNode());) {
        const t = n.textContent.trim(); if (!t) continue; const el = n.parentElement; if (!el || seen.has(el)) continue; seen.add(el);
        if (el.closest('[hidden],dialog:not([open]),[aria-hidden="true"],svg,noscript,.sr-only,.visually-hidden')) continue;
        const cs = getComputedStyle(el); const rc = el.getBoundingClientRect(); if (cs.visibility === 'hidden' || rc.width < 2 || rc.height < 2 || parseFloat(cs.opacity) === 0) continue;
        const size = parseFloat(cs.fontSize);
        if (size < 12 && tiny < 6) { tiny++; out.ng.push(`12px未満の文字 (${size}px): ${t.slice(0, 20)}`); }
        const fg = parse(cs.color), bg = bgOf(el); if (!fg || !bg) continue;
        const f2 = fg.a < 1 ? over(fg, bg) : fg; const L1 = lum(f2), L2 = lum(bg); const ratio = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
        const large = size >= 24 || (Number(cs.fontWeight) >= 700 && size >= 18.66);
        if (ratio < (large ? 3 : 4.5) && lowC < 6) { lowC++; out.ng.push(`コントラスト ${ratio.toFixed(2)}: ${t.slice(0, 20)}`); }
      }
      document.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex="0"]').forEach((e) => {
        const rc = e.getBoundingClientRect(); const cs = getComputedStyle(e);
        if (!rc.width || cs.visibility === 'hidden' || e.closest('[hidden],dialog:not([open])')) return;
        const inline = cs.display === 'inline' && e.closest('p,li,dd,td');
        if (!inline && (rc.width < 24 || rc.height < 24)) out.ng.push(`押せる範囲が24px未満: ${Math.round(rc.width)}x${Math.round(rc.height)} ${(e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 16)}`);
        else if (!inline && (rc.width < 44 || rc.height < 44)) out.warn.push(`押せる範囲が44px未満: ${Math.round(rc.width)}x${Math.round(rc.height)} ${(e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 16)}`);
      });
      const loops = document.getAnimations().filter((a) => a.playState === 'running' && a.effect && a.effect.getComputedTiming().iterations === Infinity).length;
      if (loops > 4) out.warn.push(`繰り返し動くアニメーションが ${loops} 個（画面外では止める）`);
      return out;
    });
    r.ng.forEach((m) => ng(`${tag} ${m}`));
    if (w === 1280) r.warn.forEach((m) => warn(`${tag} ${m}`));
    if (w === 1280) { if (titles.has(r.title)) ng(`${file} title が ${titles.get(r.title)} と同じ`); titles.set(r.title, file); }
    if (bytes > 1024 * 1024) ng(`${tag} 転送量 ${Math.round(bytes / 1024)}KB（1MB超）`);
    else if (bytes > 600 * 1024 && w === 1280) warn(`${tag} 転送量 ${Math.round(bytes / 1024)}KB（600KB超）`);
    await ctx.close();
  }
  /* 動きを減らす設定 */
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(base + file, { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  const loops = await p.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect && a.effect.getComputedTiming().iterations === Infinity).length);
  if (loops) ng(`${file} 動きを減らす設定でも、繰り返し動くアニメーションが ${loops} 個`);
  errs.forEach((e) => ng(`${file} 動きを減らす設定でエラー: ${e}`));
  await ctx.close();
}
await browser.close(); server.close();

const uniq = (a) => [...new Set(a)];
console.log(`\n見本 ${id}: ${pages.length}ページ × 4画面幅 + 動きを減らす設定`);
uniq(issues).forEach((m) => console.log('  不合格  ' + m));
uniq(warns).slice(0, 30).forEach((m) => console.log('  注意    ' + m));
console.log(`\n不合格 ${uniq(issues).length} 件 ／ 注意 ${uniq(warns).length} 件`);
process.exit(uniq(issues).length ? 1 : 0);
