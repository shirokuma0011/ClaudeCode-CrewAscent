/* =====================================================================
   site/industries.html（業種からタイプを探す）を作る。

     node tools/build-industries.mjs

   正本: data/occupations.json（13分類 / 102業種 / 1業種につき2〜4タイプ）

   考え方:
     ・「おすすめ」と言い切らない。同じ業種でも顧客層や売り方が違えば合うタイプは変わる
     ・1業種に複数のタイプを出す。順位ではなく、選択肢として並べる
     ・36タイプすべてが最低1つの業種から到達できることを、書き出す前に検査する
     ・JSが無くても全部読める。絞り込みは上乗せの機能
   ===================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { SITE, DATA } from './paths.mjs';

const rd = (p) => fs.readFileSync(path.join(SITE, p), 'utf8');
const rdData = (p) => fs.readFileSync(path.join(DATA, p), 'utf8');

const g = { CrewData: null };
new Function('window', 'globalThis', rd('assets/js/diagnosis-data.js'))(g, g);
const { TYPES } = g.CrewData;
const BY_ID = new Map(TYPES.map((t) => [t.id, t]));

const OCC = JSON.parse(rdData('occupations.json'));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* --- 書き出す前の検査 --- */
const errs = [];
const used = new Set();
let count = 0;
for (const c of OCC.categories) {
  if (!c.key || !c.name || !Array.isArray(c.items) || !c.items.length) errs.push(`分類 ${c.name || c.key} が空`);
  for (const it of c.items) {
    count += 1;
    if (it.types.length < 2 || it.types.length > 4) errs.push(`${it.name}: タイプが ${it.types.length} 件（2〜4件にする）`);
    if (!it.kana) errs.push(`${it.name}: 読み（kana）がない。ひらがな入力で探せなくなる`);
    if (new Set(it.types).size !== it.types.length) errs.push(`${it.name}: タイプが重複`);
    for (const id of it.types) {
      if (!BY_ID.has(id)) errs.push(`${it.name}: 知らないタイプ ${id}`);
      used.add(id);
    }
  }
}
const unreached = TYPES.filter((t) => !used.has(t.id));
if (unreached.length) errs.push(`どの業種からも行けないタイプ: ${unreached.map((t) => t.id).join(', ')}`);
const names = OCC.categories.flatMap((c) => c.items.map((i) => i.name));
if (new Set(names).size !== names.length) errs.push('業種名が重複しています');
if (errs.length) { console.error('正本に問題があります:\n  - ' + errs.join('\n  - ')); process.exit(1); }

/* --- 骨組みは診断の解説ページから借りる（ヘッダー・フッターを1か所に保つ） --- */
const base = rd('diagnosis-guide.html');
const HEAD_TOP = base.slice(0, base.indexOf('  <title>'));
const AFTER_DESC = base.slice(base.indexOf('  <meta name="robots"'), base.indexOf('</head>'))
  .split('\n').filter((l) => !/diagnosis-data\.js|sample-result\.js/.test(l)).join('\n');
const HEADER = base.slice(base.indexOf('<a class="skip-link'), base.indexOf('<nav class="breadcrumb'));
const FOOTER = base.slice(base.indexOf('<footer'));

const areaClass = (x, y) => (y >= 3 ? (x >= 3 ? 'area-tr' : 'area-tl') : (x >= 3 ? 'area-br' : 'area-bl'));

const title = '業種からタイプを探す｜Web診断36';
const desc = '13の分類と102の業種から、Webサイト設計のタイプを探せます。'
  + '1つの業種に複数のタイプを示します。どれが正しいかではなく、今どちらを先にしたいかで選んでください。';

/* 分類ごとの目次 */
const nav = OCC.categories.map((c) =>
  `<li><a href="#c-${c.key}">${esc(c.name)}<span>${c.items.length}</span></a></li>`).join('');

/* 業種のカード。タイプは順位ではないので、番号を振らない */
const cats = OCC.categories.map((c) => `
  <section class="sec ${OCC.categories.indexOf(c) % 2 ? 'sec--paper2' : ''} rvsec" id="c-${c.key}">
    <div class="wrap">
      <div class="idx-head"><span class="idx-head__no">${String(OCC.categories.indexOf(c) + 1).padStart(2, '0')}</span>
        <div><h2>${esc(c.name)}</h2><p>${c.items.length}の業種</p></div></div>
      <details class="fold occ-fold" open>
        <summary class="fold__sum"><span class="fold__mk" aria-hidden="true"></span><span class="fold__t"><b>${c.items.length}の業種を見る</b></span></summary>
        <div class="fold__bd">
      <ul class="occ">${c.items.map((it) => {
        const chips = it.types.map((id) => {
          const t = BY_ID.get(id);
          return `<li><a class="occ__t ${areaClass(t.xIndex, t.yIndex)}" href="type-${t.slug}.html">`
            + `<span class="occ__id">${esc(t.id)}</span><span>${esc(t.name)}</span></a></li>`;
        }).join('');
        return `<li class="occ__i" data-occ="${esc(it.name)}" data-occ-kana="${esc(it.kana || '')}">
          <p class="occ__n">${esc(it.name)}</p>
          <ul class="occ__ts">${chips}</ul>
        </li>`;
      }).join('')}</ul>
        </div>
      </details>
    </div>
  </section>`).join('\n');

const jsonld = JSON.stringify({
  '@context': 'https://schema.org', '@type': 'CollectionPage',
  name: '業種からタイプを探す', description: desc,
  isPartOf: { '@type': 'WebSite', name: 'クルーアセント' },
});

const html = HEAD_TOP + `  <title>${esc(title)}</title>\n  <meta name="description" content="${esc(desc)}">\n`
  + AFTER_DESC.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(title)}">`)
              .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(desc)}">`)
  + `<script defer src="assets/js/industries.js?v=20260909b"></script>\n`
  + `<script type="application/ld+json">${jsonld}</script>\n</head>\n<body data-page="industries">\n`
  + HEADER
  + `<nav class="breadcrumb" aria-label="現在地"><div class="wrap"><ol>
      <li><a href="index.html">ホーム</a></li><li><a href="types.html">36タイプ一覧</a></li>
      <li aria-current="page">業種から探す</li></ol></div></nav>

  <main id="main">
  <section class="ah ah--index">
    <div class="wrap">
      <div class="ah__main">
        <p class="ah__eyebrow"><span class="lbl">Industries</span></p>
        <h1>業種からタイプを探す</h1>
        <p class="ah__lead">${esc(OCC.categories.length)}の分類・${count}の業種から、Webサイト設計のタイプを引けます。
        1つの業種に2〜4タイプを示します。<b>どれが正解かではなく、その業種でよく分かれる方向</b>です。</p>
        <p class="note note--info">同じ業種でも、顧客層や売り方が違えば合うタイプは変わります。
        自分に近いものを知りたいときは、48問または16問の診断で位置を確かめてください。</p>
        <div class="btn-row">
          <a class="btn btn--primary" href="diagnosis.html">無料診断で位置を確かめる</a>
          <a class="btn btn--line" href="types.html">36タイプの一覧を見る</a>
        </div>
      </div>
    </div>
  </section>

  <nav class="occ-nav" aria-label="分類の一覧">
    <div class="wrap">
      <p class="occ-nav__h">分類から探す</p>
      <ol class="occ-nav__l">${nav}</ol>
      <p class="occ-nav__all"><button type="button" class="btn btn--secondary btn--sm" data-fold-all>すべて閉じる</button></p>
      <div class="occ-find">
        <label for="occ-q">業種名でしぼり込む</label>
        <input type="search" id="occ-q" data-occ-q placeholder="例: 美容室、工務店、SaaS" autocomplete="off">
        <p class="occ-find__n" data-occ-n role="status" aria-live="polite"></p>
      </div>
    </div>
  </nav>
${cats}

  <section class="sec sec--ink">
    <div class="wrap">
      <div class="closing">
        <h2>業種の目安より、自分の回答のほうが正確です。</h2>
        <p class="lead">ここに出るのは、その業種でよく分かれる方向です。48問に答えると、あなたの回答から1つの位置が出ます。</p>
        <div class="cta-row"><a class="btn btn--primary" href="diagnosis.html">無料診断を始める</a><a class="btn btn--onink" href="plans.html">制作プランを見る</a></div>
      </div>
    </div>
  </section>
  </main>
` + FOOTER;

fs.writeFileSync(path.join(SITE, 'industries.html'), html);
console.log(`site/industries.html を作りました（${OCC.categories.length}分類 / ${count}業種 / 到達できるタイプ ${used.size}）`);
