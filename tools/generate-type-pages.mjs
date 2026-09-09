/* =====================================================================
   36タイプの個別ページと、その一覧ページを組み立てる。

     node tools/generate-type-pages.mjs

   正本は assets/js/diagnosis-data.js（tools/generate-data.mjs が作る）。
   ここでは HTML を組むだけで、文言は一切作りません。
   ヘッダー・フッター・読み込むCSS/JSは diagnosis-guide.html から
   そのまま写します（ナビゲーションの追加漏れを起こさないため）。
   ===================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SITE, DATA } from './paths.mjs';

/* Windows では new URL(...).pathname が "/C:/…" になり、パスとして壊れる。
   fileURLToPath を使うと、どのOSでも正しい絶対パスになる。 */
const ROOT = SITE;   /* 書き出し先・読み取り先は公開ディレクトリ */
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const rdData = (p) => fs.readFileSync(path.join(DATA, p), 'utf8');

/* --- データを読む（ブラウザ用スクリプトをそのまま評価する） --- */
const g = { window: {} };
g.window = g;
new Function('window', 'globalThis', rd('assets/js/diagnosis-data.js'))(g, g);
const { TYPES } = g.CrewData;

/* 36タイプ固有の設計（利用場面・読者・判断・見本・検索意図・根拠・隣接）
   正本: data/type-page-specs.json（設計書パッケージ 2026-08-25 由来） */
const SPECS = JSON.parse(rdData('type-page-specs.json')).records;
const SPEC_BY_ID = new Map(SPECS.map((r) => [r.id, r]));
const { TYPE_OVERLAYS } = await import(pathToFileURL(path.join(DATA, 'type-overlays.mjs')).href);
const { specimenFor } = await import(new URL('./specimen-data.mjs', import.meta.url));
const { buildSpecimen } = await import(new URL('./build-specimen.mjs', import.meta.url));

/* X軸6方式ごとの、節の並び。同じ部品でも順番を変える。 */
const X_ORDER = [
  ['position', 'specimen', 'scene', 'blueprint', 'proof', 'search', 'tone', 'cta', 'avoid', 'industry', 'starter', 'consult', 'neighbor'],
  ['position', 'scene', 'specimen', 'blueprint', 'tone', 'cta', 'proof', 'avoid', 'search', 'industry', 'starter', 'consult', 'neighbor'],
  ['position', 'scene', 'specimen', 'cta', 'blueprint', 'proof', 'tone', 'industry', 'search', 'avoid', 'starter', 'consult', 'neighbor'],
  ['position', 'scene', 'blueprint', 'specimen', 'proof', 'tone', 'cta', 'industry', 'avoid', 'search', 'starter', 'consult', 'neighbor'],
  ['position', 'scene', 'specimen', 'tone', 'blueprint', 'proof', 'cta', 'industry', 'search', 'avoid', 'starter', 'consult', 'neighbor'],
  ['position', 'scene', 'specimen', 'tone', 'proof', 'blueprint', 'cta', 'industry', 'avoid', 'search', 'starter', 'consult', 'neighbor'],
];

/* 見出しの一覧に出す短い名前。節の見出しそのものより短くする */
const TITLE_BY_KEY = {
  position: 'このタイプの位置',
  scene: 'この設計が効く場面',
  specimen: '60秒で試せる見本',
  blueprint: 'サイト設計のたたき台',
  proof: '公開前に用意する根拠',
  tone: '文章とデザインの方向',
  cta: '問い合わせへの導き方',
  search: '検索の考え方',
  avoid: '避けたい形と公開後',
  industry: '合いやすい業種',
  starter: '見出しのひな形',
  consult: '相談前に決めること',
  neighbor: 'となりのタイプとの違い',
};

/* --- 骨組みを既存ページから取り出す --- */
const base = rd('diagnosis-guide.html');
const HEAD_TOP = base.slice(0, base.indexOf('  <title>'));
/* 診断の設問データ(340KB)と結果見本のJSは、このページでは使いません。
   中身はHTMLに焼き込んであるので、読み込みから外します。 */
const AFTER_DESC = base.slice(base.indexOf('  <meta name="robots"'), base.indexOf('</head>'))
  .split('\n').filter((l) => !/diagnosis-data\.js|sample-result\.js/.test(l)).join('\n');
const HEADER = base.slice(base.indexOf('<a class="skip-link'), base.indexOf('<nav class="breadcrumb'));
const FOOTER = base.slice(base.indexOf('<footer'));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const li = (a) => a.map((x) => `<li>${esc(x)}</li>`).join('');
const AREA = {
  'area-tl': '実用・情報 × 先進・新しさ', 'area-tr': 'ブランド・魅力 × 先進・新しさ',
  'area-bl': '実用・情報 × 王道・安心', 'area-br': 'ブランド・魅力 × 王道・安心',
};
const areaClass = (x, y) => (y >= 3 ? (x >= 3 ? 'area-tr' : 'area-tl') : (x >= 3 ? 'area-br' : 'area-bl'));
const CELL = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5];

/* 近い3タイプ: 座標の距離が近い順（結果ページと同じ考え方） */
function nearest(t) {
  return TYPES.filter((o) => o.slug !== t.slug)
    .map((o) => ({ t: o, d: Math.hypot(CELL[o.xIndex] - CELL[t.xIndex], CELL[o.yIndex] - CELL[t.yIndex]) }))
    .sort((a, b) => a.d - b.d).slice(0, 3).map((o) => o.t);
}

/* 6×6の地図。当該タイプの位置に印を付ける */
function map6(t) {
  let cells = '';
  for (let y = 5; y >= 0; y--) {
    for (let x = 0; x <= 5; x++) {
      const o = TYPES.find((z) => z.xIndex === x && z.yIndex === y);
      const here = o.slug === t.slug;
      cells += `<li class="tp-map__c ${areaClass(x, y)}${here ? ' is-here' : ''}"${here ? ' aria-current="true"' : ''}>` +
        (here ? `<b>${esc(o.id)}</b>` : `<a href="type-${o.slug}.html"><span>${esc(o.id)}</span></a>`) + '</li>';
    }
  }
  return `<div class="tp-map"><p class="tp-map__ax tp-map__ax--t" aria-hidden="true">↑ 先進・新しさ</p>` +
    `<ol class="tp-map__grid" aria-label="36タイプの位置。このページのタイプを強調しています。">${cells}</ol>` +
    `<p class="tp-map__ax tp-map__ax--b" aria-hidden="true">↓ 王道・安心</p>` +
    `<p class="tp-map__ax tp-map__ax--x" aria-hidden="true"><span>← 実用・情報</span><span>ブランド・魅力 →</span></p></div>`;
}

/* 節。先頭3つは開いたまま、残りは畳んで出す。
   畳んでも中身はHTMLにそのまま入っているので、検索にも載るしJSが無くても開ける。
   スマホで「見出しは全部見えて、読みたい所だけ開く」形にするための作り。 */
const OPEN_COUNT = 3;

/* いま組み立てている節の { id, folded }。節を作る関数は13個あって引数を増やすと
   全部の呼び出しを書き換えることになるので、直前にここへ置いて sec() が読む。
   1ページずつ順番に組み立てるだけなので、取り違えは起きない。 */
let CURRENT = null;

function sec(no, title, lead, body, cls) {
  const id = CURRENT && CURRENT.id;
  const folded = !!(CURRENT && CURRENT.folded);
  const head = `<div class="idx-head"><span class="idx-head__no">${no}</span><div><h2>${esc(title)}</h2>${lead ? `<p>${esc(lead)}</p>` : ''}</div></div>`;
  if (!folded) {
    return `
  <section class="sec ${cls || ''} rvsec"${id ? ` id="${id}"` : ''}>
    <div class="wrap">
      ${head}
      ${body}
    </div>
  </section>`;
  }
  return `
  <section class="sec sec--fold ${cls || ''} rvsec"${id ? ` id="${id}"` : ''}>
    <div class="wrap">
      <details class="fold">
        <summary class="fold__sum">
          <span class="idx-head__no">${no}</span>
          <span class="fold__t"><b>${esc(title)}</b>${lead ? `<span class="fold__lead">${esc(lead)}</span>` : ''}</span>
          <span class="fold__mk" aria-hidden="true"></span>
        </summary>
        <div class="fold__bd">
          ${body}
        </div>
      </details>
    </div>
  </section>`;
}
const dl = (rows) => `<dl class="tp-dl">${rows.filter((r) => r[1]).map(
  ([k, v]) => `<div><dt>${esc(k)}</dt><dd>${Array.isArray(v) ? `<ul class="marker-list">${li(v)}</ul>` : esc(v)}</dd></div>`).join('')}</dl>`;

function page(t) {
  const d = t.detail, ac = areaClass(t.xIndex, t.yIndex), near = nearest(t);
  const spec = SPEC_BY_ID.get(t.id) || {};
  const ov = TYPE_OVERLAYS[t.id] || {};
  const title = `${t.id} ${t.name}｜Web診断36の36タイプ`;
  const desc = `${t.name}（${t.id}）は${AREA[ac]}の方向です。${ov.seoIntent || t.oneLiner}`
    + `どんな場面で効くか、60秒で試せる設計の見本、必要な根拠、隣のタイプとの違いまでまとめています。`;

  /* 節をキーで用意し、X軸の方式に合わせて順番だけ入れ替える */
  const S = {};

  S.position = (no) => sec(no, 'このタイプの位置', d.position.summary3min,
    `<div class="tp-cols">${map6(t)}${dl([['領域', AREA[ac]], ['横軸', d.position.xStep], ['縦軸', d.position.yStep],
      ['情報の組み方', spec.xFamily], ['見せ方の段階', spec.yModifier]])}</div>`, 'sec--paper2');

  /* 利用場面・読者・判断。ここがタイプごとに最も違う */
  S.scene = (no) => sec(no, 'この設計が効く場面', ov.scenario,
    dl([['主な読者', ov.audience], ['読み終えて決められること', ov.decision],
        ['活きる場面', t.strengths], ['偏りを防ぐ視点', t.tradeoff]]));

  /* 60秒の見本。X軸の方式ごとに操作の種類そのものが変わる */
  S.specimen = (no) => sec(no, '60秒で試せる、この方式の見本', ov.specimen,
    buildSpecimen(t, specimenFor(t, ov)), 'sec--paper2');

  S.blueprint = (no) => sec(no, 'サイト設計のたたき台', d.recommendedPurpose,
    dl([['想定する訪問者', d.targetVisitor],
        ['最初の画面：見出しの役割', d.firstViewPlan.headlineRole],
        ['最初の画面：添える情報', d.firstViewPlan.supportingInformation],
        ['最初の画面：根拠として置くもの', d.firstViewPlan.proofElement],
        ['最初の画面：主要な行動', d.firstViewPlan.primaryAction],
        ['情報の優先順', d.contentPriority],
        ['問い合わせまでの経路', d.conversionFlow],
        ['想定するページ構成', t.pages],
        ['よく使う機能', t.functions]]));

  /* 用意すべき根拠。「無い場合は載せない」を明示する */
  S.proof = (no) => sec(no, '公開前に用意する根拠', null,
    `<ol class="tp-proof">${(ov.proof || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ol>`
    + `<p class="note note--warn">用意できない項目は、載せずに残します。`
    + `実績・件数・満足度など、確かめられない数字を作って埋めることはしません。</p>`, 'sec--paper2');

  S.tone = (no) => sec(no, '文章とデザインの方向', d.toneGuide.recommendedTone,
    dl([['文の書き方', d.toneGuide.sentenceStyle],
        ['使いやすい言葉', d.toneGuide.wordsToPrefer],
        ['避けたい言葉', d.toneGuide.wordsToAvoid],
        ['組み方', d.visualRecipe.layout],
        ['配色', d.visualRecipe.colorUse],
        ['文字', d.visualRecipe.typography],
        ['画像', d.visualRecipe.imagery],
        ['動き', d.visualRecipe.motion],
        ['デザインの言葉', t.designKeywords]]));

  S.cta = (no) => sec(no, '問い合わせへの導き方', null,
    dl([['主要な行動', d.ctaStrategy.primaryCTA], ['次点の行動', d.ctaStrategy.secondaryCTA],
        ['置く場所', d.ctaStrategy.placement], ['そばに添える一言', d.ctaStrategy.reassuranceNearCTA]]));

  S.search = (no) => sec(no, '検索の考え方', ov.seoIntent || d.seoApproach.likelySearchIntent,
    `<p class="lbl">この設計課題で探されている言葉</p><ul class="marker-list">${li(ov.queries || [])}</ul>`
    + dl([['言葉のまとまり', d.seoApproach.keywordThemes], ['ページの題材', d.seoApproach.pageTopics],
          ['地域を書くとき', d.seoApproach.localSeoFit]])
    + `<p class="note note--info">${esc(d.seoApproach.caution)}</p>`, 'sec--paper2');

  S.avoid = (no) => sec(no, '避けたい形と、公開後にすること', null,
    `<div class="ed ed--6-6"><div><p class="lbl">避けたい形</p><ul class="marker-list">${li(d.avoidPatterns)}</ul></div>`
    + `<div><p class="lbl">公開後にすること</p><ul class="marker-list">${li(d.operationTips)}</ul></div></div>`);

  S.industry = (no) => sec(no, '合いやすい業種と、成り立つ条件', d.industryReasons.primary,
    `<p class="note note--info">業種は目安です。先に見るのは条件のほうで、`
    + `${esc(ov.decision || '読み手が決めたいこと')}が同じなら、業種が違っても同じ設計が働きます。</p>`
    + dl([['特に合いやすい', t.primaryIndustries], ['条件が合えば', t.alsoIndustries]])
    + `<p>${esc(d.industryReasons.also)}</p><p class="note">${esc(d.industryReasons.caution)}</p>`, 'sec--paper2');

  S.starter = (no) => sec(no, '見出しのひな形', null,
    `<div class="tp-tmpl"><p class="tp-tmpl__h">${esc(d.starterCopy.h1)}</p><p class="tp-tmpl__s">${esc(d.starterCopy.sub)}</p></div>`
    + `<p class="note note--warn">${esc(d.starterCopy.note)}</p>`);

  S.consult = (no) => sec(no, '相談前に決めておくこと', null,
    `<ol class="tp-q">${d.consultationQuestions.map((q) => `<li>${esc(q)}</li>`).join('')}</ol>`, 'sec--paper2');

  /* 隣接は「一軸一段だけ違う」タイプ。上下左右で並べる */
  S.neighbor = (no) => {
    const rel = (spec.related || []).map((r) => `<li><a href="type-${r.slug}.html">`
      + `<span class="tp-near__id">${esc(r.id)}</span><b>${esc(r.name)}</b>`
      + `<span>${esc(r.relation)}。軸ひとつ分だけ違います。</span></a></li>`).join('');
    const far = near.filter((n) => !(spec.related || []).some((r) => r.slug === n.slug))
      .map((n) => `<li><a href="type-${n.slug}.html"><span class="tp-near__id">${esc(n.id)}</span>`
      + `<b>${esc(n.name)}</b><span>${esc(n.oneLiner)}</span></a></li>`).join('');
    return sec(no, 'となりのタイプとの違い',
      'いずれも優劣ではありません。軸ひとつ分だけ置き方が違うので、読み比べると自分の方向がはっきりします。',
      `<ul class="tp-near">${rel}${far}</ul>`);
  };

  const order = X_ORDER[t.xIndex];
  /* 見出しの一覧。畳んだ節へも飛べるようにする（飛び先が閉じていれば main.js が開く） */
  const secId = (k) => 's-' + k;
  const rendered = order.map((k, i) => {
    const no = String(i + 1).padStart(2, '0');
    CURRENT = { id: secId(k), folded: i >= OPEN_COUNT };
    const html = S[k](no);
    CURRENT = null;
    return { key: k, no, html };
  });
  const toc = `
  <nav class="tp-toc" aria-label="このページの内容">
    <div class="wrap">
      <p class="tp-toc__h">このページの内容</p>
      <ol class="tp-toc__l">${rendered.map((r) => {
        const title = TITLE_BY_KEY[r.key] || r.key;
        return `<li><a href="#${secId(r.key)}"><span>${r.no}</span>${esc(title)}</a></li>`;
      }).join('')}</ol>
      <button type="button" class="btn btn--secondary btn--sm tp-toc__all" data-fold-all>すべて開く</button>
    </div>
  </nav>`;
  const body = toc + rendered.map((r) => r.html).join('\n');

  const closing = `
  <section class="sec sec--ink">
    <div class="wrap">
      <div class="closing">
        <h2>このタイプかどうかは、16問で確かめられます。</h2>
        <p class="lead">36タイプは優劣ではなく、今どちらを先にするかの整理です。2〜3分で自分の位置を確認できます。</p>
        <div class="cta-row"><a class="btn btn--primary" href="diagnosis.html">無料診断を始める</a><a class="btn btn--onink" href="plans.html">制作プランを見る</a></div>
      </div>
    </div>
  </section>`;

  const jsonld = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'Article',
    headline: `${t.id} ${t.name}`, description: t.oneLiner,
    isPartOf: { '@type': 'WebSite', name: 'クルーアセント' },
  });

  return HEAD_TOP + `  <title>${esc(title)}</title>\n  <meta name="description" content="${esc(desc)}">\n` +
    AFTER_DESC.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(title)}">`)
              .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(desc)}">`) +
    `<script defer src="assets/js/type-specimen.js?v=20260825"></script>\n` +
    `<script type="application/ld+json">${jsonld}</script>\n</head>\n` +
    `<body data-page="type" data-archetype="product" data-x="${t.xIndex + 1}" data-y="${t.yIndex + 1}"` +
    ` class="pg pg--product pg-sub pg-type x${t.xIndex + 1} y${t.yIndex + 1}">\n\n` + HEADER +
    `<nav class="breadcrumb" aria-label="パンくず"><div class="wrap"><ol>` +
    `<li><a href="index.html">ホーム</a></li><li><a href="diagnosis.html">診断</a></li>` +
    `<li><a href="types.html">36タイプ</a></li><li aria-current="page">${esc(t.id)}</li></ol></div></nav>\n` +
    `  <main id="main">\n\n  <section class="ah ah--type ah--${ac}">\n` +
    `      <div class="wrap ah__inner"><div class="ah__main">` +
    `<p class="eyebrow">Web診断36 ／ ${esc(AREA[ac])}</p>` +
    `<h1>${esc(t.name)}</h1><p class="ah__lead">${esc(t.oneLiner)}</p>` +
    `<p class="ah__facts2"><span><b>情報の組み方</b>${esc(spec.xFamily || '')}</span>` +
    `<span><b>見せ方</b>${esc(spec.yModifier || '')}</span>` +
    `<span><b>座標</b>横${t.xIndex + 1} / 縦${t.yIndex + 1}</span></p>` +
    `<p class="ah__meta">この診断はWebサイトで何を先にするかの整理です。性格・能力・適性・成果を測るものではありません。</p>` +
    `</div></div>\n    </section>\n` + body + closing + `\n\n  </main>\n  ` + FOOTER;
}

/* 一覧ページ用のマップ。36マスすべてがリンク。名前も出して、番号だけに頼らない */
function map6All() {
  let cells = '';
  for (let y = 5; y >= 0; y--) {
    for (let x = 0; x <= 5; x++) {
      const o = TYPES.find((z) => z.xIndex === x && z.yIndex === y);
      cells += `<li class="tp-map__c ${areaClass(x, y)}">`
        + `<a href="type-${o.slug}.html" title="${esc(o.name)}"><span>${esc(o.id)}</span></a></li>`;
    }
  }
  return `<div class="tp-map tp-map--all"><p class="tp-map__ax tp-map__ax--t" aria-hidden="true">↑ 先進・新しさ</p>`
    + `<ol class="tp-map__grid" aria-label="36タイプの位置。マスを選ぶとそのタイプのページへ進みます。">${cells}</ol>`
    + `<p class="tp-map__ax tp-map__ax--b" aria-hidden="true">↓ 王道・安心</p>`
    + `<p class="tp-map__ax tp-map__ax--x" aria-hidden="true"><span>← 実用・情報</span><span>ブランド・魅力 →</span></p></div>`;
}

/* --- 一覧ページ --- */
function hub() {
  const groups = [['area-tl', '実用・情報 × 先進・新しさ'], ['area-tr', 'ブランド・魅力 × 先進・新しさ'],
                  ['area-bl', '実用・情報 × 王道・安心'], ['area-br', 'ブランド・魅力 × 王道・安心']];
  const body = groups.map(([k, label], i) => sec(String(i + 1).padStart(2, '0'), label, null,
    `<ul class="tp-list">${TYPES.filter((t) => areaClass(t.xIndex, t.yIndex) === k)
      .map((t) => `<li><a href="type-${t.slug}.html"><span class="tp-list__id">${esc(t.id)}</span>` +
        `<b>${esc(t.name)}</b><span class="tp-list__s">${esc(t.oneLiner)}</span></a></li>`).join('')}</ul>`,
    i % 2 ? 'sec--paper2' : '')).join('\n');

  /* 一覧に入ってすぐ、36タイプのどれへも行けるようにする。
     マス（座標で探す）と業種（自分の仕事から探す）の2通りを先頭に置く。 */
  const finder = `
  <section class="sec sec--paper2 rvsec" id="find">
    <div class="wrap">
      <div class="idx-head"><span class="idx-head__no">00</span>
        <div><h2>36タイプへ、ここから</h2><p>マスを選ぶか、業種から引くか、どちらでも同じ36タイプに行き着きます。</p></div></div>
      <div class="tp-find">
        <div class="tp-find__map">
          <p class="tp-find__h">マスから選ぶ</p>
          ${map6All()}
        </div>
        <div class="tp-find__occ">
          <p class="tp-find__h">業種から引く</p>
          <p>13の分類・102の業種から、よく分かれる方向を引けます。1つの業種に2〜4タイプを示します。
          どれが正解かではなく、その業種で分かれやすい置き方です。</p>
          <a class="btn btn--primary" href="industries.html">業種からタイプを探す</a>
          <p class="note">同じ業種でも、顧客層や売り方が違えば合うタイプは変わります。
          自分に近いものは、48問または16問の診断で確かめられます。</p>
        </div>
      </div>
    </div>
  </section>`;

  const title = '36タイプ一覧｜Web診断36';
  const desc = 'Web診断36で判定する36タイプの一覧です。二つの軸（実用・情報⇄ブランド・魅力／王道・安心⇄先進・新しさ）を6段階に分け、6×6＝36通りで表します。各タイプの向く状況と設計のたたき台を掲載しています。';
  return HEAD_TOP + `  <title>${esc(title)}</title>\n  <meta name="description" content="${esc(desc)}">\n` +
    AFTER_DESC.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(title)}">`)
              .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(desc)}">`) +
    `</head>\n<body data-page="types" data-archetype="editorial" class="pg pg--editorial pg-sub">\n\n` + HEADER +
    `<nav class="breadcrumb" aria-label="パンくず"><div class="wrap"><ol><li><a href="index.html">ホーム</a></li>` +
    `<li><a href="diagnosis.html">診断</a></li><li aria-current="page">36タイプ一覧</li></ol></div></nav>\n` +
    `  <main id="main">\n\n  <section class="ah ah--editorial">\n` +
    `      <div class="wrap ah__inner"><div class="ah__main"><p class="eyebrow">Web診断36</p>` +
    `<h1>36タイプ一覧</h1><p class="ah__lead">二つの軸を6段階に分けるので、6×6＝36通りになります。優劣はありません。` +
    `どれも「今どちらを先にするか」の置き方の違いです。</p>` +
    `<p class="ah__meta">全36タイプ ／ 4つの領域</p></div></div>\n    </section>\n` + finder + body +
    `\n  <section class="sec sec--ink">\n` +
    `    <div class="wrap"><div class="closing"><h2>自分がどこに入るかは、16問で分かります。</h2>` +
    `<p class="lead">2〜3分です。登録もログインも必要ありません。</p>` +
    `<div class="cta-row"><a class="btn btn--primary" href="diagnosis.html">無料診断を始める</a>` +
    `<a class="btn btn--onink" href="diagnosis-guide.html">診断の仕組みを読む</a></div></div></div>\n  </section>\n` +
    `\n  </main>\n  ` + FOOTER;
}

let n = 0;
for (const t of TYPES) { fs.writeFileSync(path.join(ROOT, `type-${t.slug}.html`), page(t)); n++; }
fs.writeFileSync(path.join(ROOT, 'types.html'), hub());
console.log(`${n} タイプページ + 一覧1ページ を出力しました`);
