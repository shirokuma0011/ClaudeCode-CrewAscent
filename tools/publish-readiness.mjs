/* =====================================================================
   公開できる状態かを数えて報告する。何も書き換えません。

     node tools/publish-readiness.mjs

   見るもの:
     1. data/publish-values.json の空欄
     2. HTML内に残る「公開前に確定」の印
     3. assets/js/site-config.js の PUBLISH_BLOCKER
     4. canonical / og:url / sitemap / robots.txt の状態
     5. 段階公開（どのページが index になっていて、残りは何が理由で止まっているか）
   ===================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { indexPlan, NEVER_INDEX } from './publish-stages.mjs';
import { SITE, DATA } from './paths.mjs';

/* Windows では new URL(...).pathname が "/C:/…" になり、パスとして壊れる。
   fileURLToPath を使うと、どのOSでも正しい絶対パスになる。 */
const ROOT = SITE;   /* 書き出し先・読み取り先は公開ディレクトリ */
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const readData = (p) => fs.readFileSync(path.join(DATA, p), 'utf8');
const htmlFiles = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html') && !f.startsWith('_'));

let ng = 0;
const line = (ok, msg) => { if (!ok) ng++; console.log((ok ? '  ok   ' : '  未   ') + msg); };

console.log('\n■ 1. 確定値（data/publish-values.json）');
let values = {};
try { values = JSON.parse(readData('publish-values.json')); }
catch { console.log('  未   data/publish-values.json が読めません'); ng++; }
const keys = Object.keys(values).filter((k) => !k.startsWith('_'));
const empty = keys.filter((k) => !String(values[k] || '').trim());
line(empty.length === 0, `${keys.length - empty.length} / ${keys.length} 項目`);
if (empty.length) console.log('       空欄: ' + empty.join(', '));

console.log('\n■ 2. ページに残る「公開前に確定」の印');
let marks = 0;
const perPage = [];
for (const f of htmlFiles) {
  const n = (read(f).match(/class="blocker-inline"/g) || []).length;
  if (n) { marks += n; perPage.push(`${f}:${n}`); }
}
line(marks === 0, `${marks} か所`);
if (marks) console.log('       ' + perPage.join('  '));

console.log('\n■ 3. assets/js/site-config.js');
const cfg = read('assets/js/site-config.js');
/* 説明文と isBlocked() の中にも同じ語が出るので、代入だけを数える */
const blocked = (cfg.match(/:\s*\['?PUBLISH_BLOCKER'?\]|:\s*'PUBLISH_BLOCKER'/g) || []).length;
line(blocked === 0, `未確定の設定値 ${blocked} 件`);
line(/productionIndexingEnabled:\s*true/.test(cfg), 'productionIndexingEnabled が true');

console.log('\n■ 4. 公開まわりの仕上げ');
const idx = read('index.html');
line(/rel="canonical"/.test(idx), 'canonical が入っている');
line(/property="og:url"/.test(idx), 'og:url が入っている');
line(!/assets\/og\//.test((idx.match(/og:image" content="([^"]*)"/) || [, ''])[1]) ||
     /^https?:\/\//.test((idx.match(/og:image" content="([^"]*)"/) || [, ''])[1]),
     'og:image が絶対URL');
/* 空の sitemap は「[DOMAIN] が無い」だけで合格に見えてしまうので、URLの有無も見る */
const sitemapUrls = (read('sitemap.xml').match(/<loc>/g) || []).length;
line(sitemapUrls > 0 && !read('sitemap.xml').includes('[DOMAIN]'),
  `sitemap.xml のドメインが実ドメイン（いま ${sitemapUrls} ページ）`);
line(/^Sitemap:/m.test(read('robots.txt')), 'robots.txt に Sitemap 行がある');


console.log('\n■ 5. 段階公開（基準は tools/publish-stages.mjs）');
const { plan } = indexPlan(ROOT);
const robotsOf = (f) => (read(f).match(/<meta name="robots" content="([^"]+)"/) || [])[1] || '';
const nowIndexed = htmlFiles.filter((f) => /(^|,)index/.test(robotsOf(f)));
const base = plan.filter((p) => p.group === '基本ページ');
const types = plan.filter((p) => p.group === 'タイプページ');
const cnt = (g) => g.filter((p) => p.index).length;
line(cnt(base) === base.length, `基本ページ ${cnt(base)} / ${base.length} が index`);
console.log(`  ―    タイプページ ${cnt(types)} / ${types.length} が index` +
  (cnt(types) === 0 ? '（_switches.indexTypePages を true にすると解禁します）' : ''));
console.log(`  ―    載せないページ ${NEVER_INDEX.length} 件: ${NEVER_INDEX.join(', ')}`);

/* 基準の判定と、実際のHTMLがずれていないか */
const mismatch = plan.filter((p) => p.index !== /(^|,)index/.test(robotsOf(p.file)));
line(mismatch.length === 0,
  `基準と <meta name="robots"> の食い違い ${mismatch.length} 件` +
  (mismatch.length ? '（tools/apply-publish-values.mjs を実行してください）' : ''));

/* sitemap は index のページとちょうど同じであること */
const listed = new Set([...read('sitemap.xml').matchAll(/<loc>[^<]*?\/([^<\/]*)<\/loc>/g)]
  .map((m) => (m[1] === '' ? 'index.html' : m[1])));
const notListed = nowIndexed.filter((f) => !listed.has(f));
const overListed = [...listed].filter((f) => !nowIndexed.includes(f));
line(notListed.length === 0 && overListed.length === 0,
  `sitemap.xml と index のページが一致（載っていない ${notListed.length} 件 / noindex なのに載っている ${overListed.length} 件）`);
if (notListed.length) console.log('       載っていない: ' + notListed.join(', '));
if (overListed.length) console.log('       余分: ' + overListed.join(', '));

/* 止まっている理由を、理由ごとにまとめて出す */
const held = plan.filter((p) => !p.index && p.group !== '載せない');
if (held.length) {
  const byReason = new Map();
  for (const p of held) {
    for (const w of p.why) {
      const k = w.replace(/\d+/g, 'N');
      if (!byReason.has(k)) byReason.set(k, []);
      byReason.get(k).push(p.file);
    }
  }
  console.log('       止まっている理由:');
  for (const [reason, fs2] of byReason) {
    console.log(`         ・${reason} … ${fs2.length}ページ` + (fs2.length <= 4 ? `（${fs2.join(', ')}）` : ''));
  }
}

console.log('\n' + (ng === 0
  ? '公開に必要な機械的な項目はすべて埋まっています。\n専門家の確認（terms / commercial-transactions / privacy）は別途必要です。'
  : `残り ${ng} 項目。PUBLISH_INPUT_SHEET.md に沿って data/publish-values.json を埋め、\ntools/apply-publish-values.mjs を実行してください。`) + '\n');
process.exit(0);
