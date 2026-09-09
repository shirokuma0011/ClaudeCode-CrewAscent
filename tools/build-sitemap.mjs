/* =====================================================================
   sitemap.xml を「いま index にしているページ」だけで作り直す。

     node tools/build-sitemap.mjs            … 作り直す
     node tools/build-sitemap.mjs --check    … 差があるかだけ見る（書き換えない）

   これまでの sitemap は手で並べていたため、noindex のページも載っていました。
   ここでは各HTMLの <meta name="robots"> を読み、index,follow のページだけを
   載せます。段階公開で解禁が進むたびに、この一覧も一緒に増えます。

   lastmod は data/sitemap-lastmod.json に持ちます。
   まだ日付の無いページだけ実行日を入れ、そのファイルへ書き戻します。
   （sitemap から一度外れたページでも、載せ直したときに日付が変わりません）
   ===================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { indexPlan } from './publish-stages.mjs';
import { SITE, DATA } from './paths.mjs';

const ROOT = SITE;   /* 書き出し先・読み取り先は公開ディレクトリ */
const CHECK = process.argv.includes('--check');
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const rdData = (p) => fs.readFileSync(path.join(DATA, p), 'utf8');

const { plan } = indexPlan(ROOT);
const robotsOf = (f) => (rd(f).match(/<meta name="robots" content="([^"]+)"/) || [])[1] || '';
const indexed = plan.filter((p) => /(^|,)index/.test(robotsOf(p.file))).map((p) => p.file);

const current = rd('sitemap.xml');
const origin = (current.match(/<loc>(https?:\/\/[^/]+)\//) || [])[1]
  || (String(JSON.parse(rdData('publish-values.json')).canonicalOrigin || '').trim().replace(/\/+$/, ''))
  || 'https://[DOMAIN]';
const LASTMOD = 'sitemap-lastmod.json';   /* data/ の中 */
const known = new Map(Object.entries(JSON.parse(rdData(LASTMOD))));
const today = new Date().toISOString().slice(0, 10);
const added = [];

/* 並びは index.html を先頭に、あとはファイル名順。手で並べ替えない */
const order = indexed.slice().sort((a, b) => (a === 'index.html' ? -1 : b === 'index.html' ? 1 : a.localeCompare(b)));

const head = `<?xml version="1.0" encoding="UTF-8"?>
<!--
  クルーアセント sitemap.xml — tools/build-sitemap.mjs が生成します。手で編集しないでください。

  載せる基準: そのページの <meta name="robots"> が index,follow であること。
  解禁の段階は tools/publish-stages.mjs に書いてあります。
  noindex のページ（result.html / 404.html / works.html / 未解禁のページ）は載りません。
  changefreq / priority は使いません。
-->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

const body = order.map((f) => {
  const loc = origin + '/' + (f === 'index.html' ? '' : f);
  if (!known.has(f)) { known.set(f, today); added.push(f); }
  const mod = known.get(f);
  return `  <url><loc>${loc}</loc><lastmod>${mod}</lastmod></url>`;
}).join('\n');

const empty = `  <!-- いま index,follow のページはありません（公開前は全ページ noindex,follow です）。
       解禁が進むと、このファイルに自動で並びます。 -->`;
const out = `${head}\n${body || empty}\n</urlset>\n`;

if (out === current && !added.length) {
  console.log(`sitemap.xml は最新です（${order.length}ページ）`);
  process.exit(0);
}
if (CHECK) {
  const listed = new Set(
    [...current.matchAll(/<loc>[^<]*?\/([^<\/]*)<\/loc>/g)].map((m) => (m[1] === '' ? 'index.html' : m[1])),
  );
  const next = new Set(order);
  const add = order.filter((f) => !listed.has(f));
  const del = [...listed].filter((f) => !next.has(f));
  console.log(`sitemap.xml に差があります。いま index,follow のページ: ${order.length}`);
  if (add.length) console.log('  載っていない: ' + add.join(', '));
  if (del.length) console.log('  noindex なのに載っている: ' + del.join(', '));
  process.exit(1);
}
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), out);
if (added.length) {
  fs.writeFileSync(
    path.join(DATA, LASTMOD),
    JSON.stringify(Object.fromEntries([...known.entries()].sort()), null, 2) + '\n',
  );
}
console.log(`sitemap.xml を作り直しました（${order.length}ページ、日付を新しく入れた: ${added.length}）`);
