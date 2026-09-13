/* =====================================================================
   公開できる状態かを数えて報告する。何も書き換えません。

     node tools/publish-readiness.mjs

   見るもの:
     1. data/publish-values.json の空欄
     2. HTML内に残る「公開前に確定」の印
     3. assets/js/site-config.js の PUBLISH_BLOCKER
     4. canonical / og:url / sitemap / robots.txt / noindex の状態
   ===================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* Windows では new URL(...).pathname が "/C:/…" になり、パスとして壊れる。
   fileURLToPath を使うと、どのOSでも正しい絶対パスになる。 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const htmlFiles = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html') && !f.startsWith('_'));

/* 検索エンジンに載せるページ。結果・404・見本一覧は載せません。 */
const NOINDEX_ALWAYS = ['result.html', '404.html', 'works.html'];

let ng = 0;
const line = (ok, msg) => { if (!ok) ng++; console.log((ok ? '  ok   ' : '  未   ') + msg); };

console.log('\n■ 1. 確定値（data/publish-values.json）');
let values = {};
try { values = JSON.parse(read('data/publish-values.json')); }
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
line(!read('sitemap.xml').includes('[DOMAIN]'), 'sitemap.xml のドメインが実ドメイン');
line(/^Sitemap:/m.test(read('robots.txt')), 'robots.txt に Sitemap 行がある');

const stillNoindex = htmlFiles.filter((f) => !NOINDEX_ALWAYS.includes(f) &&
  /name="robots" content="noindex/.test(read(f)));
line(stillNoindex.length === 0, `noindex のままのページ ${stillNoindex.length} 件（結果・404・見本を除く）`);

console.log('\n' + (ng === 0
  ? '公開に必要な機械的な項目はすべて埋まっています。\n専門家の確認（terms / commercial-transactions / privacy）は別途必要です。'
  : `残り ${ng} 項目。PUBLISH_INPUT_SHEET.md に沿って data/publish-values.json を埋め、\ntools/apply-publish-values.mjs を実行してください。`) + '\n');
process.exit(0);
