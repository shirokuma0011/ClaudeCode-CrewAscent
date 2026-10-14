/* =====================================================================
   見本サイト10件の「制作用プロンプト一式」を作り、ZIPにまとめる。

     node tools/build-sample-prompts.mjs          dist/sample-prompts/ に書き出す
     node tools/build-sample-prompts.mjs --check  正本どうしの食い違いだけ見る（書き出さない）

   正本:
     data/sample-sites.json   … 10件の架空の事業・ページ構成・アートディレクション
     data/types.json          … タイプの方針（最初の画面・優先順位・行動・避けること）
     data/type-page-specs.json… 情報の組み方・見せ方の段階・隣のタイプ
     data/occupations.json    … 業種とタイプの対応（業種がそのタイプを挙げているかを検査）
     site/plans.html          … プランごとのページ数・範囲（参考の規模として転記）
   共通の部品:
     tools/sample-kit/frame/  … クルーアセントの枠（帯・下の案内・見本ダイアログ・設計メモの見た目）
     tools/sample-kit/scripts/… 見本の検査とサムネイル撮影

   出力（1件ごと）: dist/sample-prompts/<番号>-<id>/ と同名の .zip
   ===================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { REPO, DATA, SITE } from './paths.mjs';

const CHECK = process.argv.includes('--check');
const VERSION = '20261015';
const KIT = path.join(REPO, 'tools/sample-kit');
const OUT = path.join(REPO, 'dist/sample-prompts');
const read = (p) => fs.readFileSync(p, 'utf8');
const json = (p) => JSON.parse(read(p));

const samples = json(path.join(DATA, 'sample-sites.json')).samples;
const types = new Map(json(path.join(DATA, 'types.json')).map((t) => [t.id, t]));
const specs = new Map(json(path.join(DATA, 'type-page-specs.json')).records.map((r) => [r.id, r]));
const occ = new Map(json(path.join(DATA, 'occupations.json')).categories.flatMap((c) => c.items.map((i) => [i.name, { ...i, category: c.name }])));

/* ---------- 検査: 正本どうしの食い違い ---------- */
const problems = [];
if (samples.length !== 10) problems.push(`見本は10件のはず: ${samples.length}`);
const seen = new Set();
for (const s of samples) {
  if (seen.has(s.id)) problems.push(`id が重複: ${s.id}`); seen.add(s.id);
  if (!/^sample-[a-z0-9-]+$/.test(s.id)) problems.push(`id は sample-英小文字: ${s.id}`);
  const t = types.get(s.typeId); if (!t) { problems.push(`${s.id}: タイプがない ${s.typeId}`); continue; }
  const o = occ.get(s.industry);
  if (!o) problems.push(`${s.id}: 業種ページにない業種 ${s.industry}`);
  else if (!o.types.includes(s.typeId)) problems.push(`${s.id}: 業種「${s.industry}」は ${s.typeId} を挙げていない（${o.types.join(', ')}）`);
  const want = { 'はじめて': 1, 'シンプル': 3, '標準': 5, 'おまかせ': 5 }[s.plan];
  if (!want) problems.push(`${s.id}: plan が不明 ${s.plan}`);
  else if (s.pages.length !== want) problems.push(`${s.id}: ${s.plan}は${want}ページ相当（いま ${s.pages.length}）`);
  if (s.pages[0].file !== 'index.html') problems.push(`${s.id}: 最初のページは index.html`);
  for (const k of ['palette', 'typography', 'motif', 'keyVisual', 'motion', 'layout', 'imagery', 'components']) if (!s.art[k]) problems.push(`${s.id}: art.${k} がない`);
}
const motifs = new Set(samples.map((s) => s.art.motif.split('」')[0]));
if (motifs.size !== samples.length) problems.push('署名モチーフが重複しています');
const heroColors = samples.map((s) => s.art.palette[0].hex.toLowerCase());
if (new Set(heroColors).size !== heroColors.length) problems.push('地の色が重複しています');

/* ---------- プランの範囲（site/plans.html の比較表から転記） ---------- */
const plansHtml = read(path.join(SITE, 'plans.html'));
const table = (plansHtml.match(/<table class="plan-table">[\s\S]*?<\/table>/) || [])[0] || '';
const strip = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const ROWS = {};
for (const tr of table.match(/<tr[\s\S]*?<\/tr>/g) || []) {
  const cells = (tr.match(/<t[hd][\s\S]*?<\/t[hd]>/g) || []).map(strip);
  if (cells.length === 5 && cells[0]) ROWS[cells[0]] = cells.slice(1);
}
const PLAN_NAMES = ['はじめて', 'シンプル', '標準', 'おまかせ'];
const PRICES = { 'はじめて': '80,000円', 'シンプル': '120,000円', '標準': '150,000円', 'おまかせ': '220,000円' };
for (const k of ['ページ数', '文章整理', '画像準備', '簡易ロゴ']) if (!ROWS[k]) problems.push(`plans.html の比較表に「${k}」の行が見つからない`);
for (const [name, price] of Object.entries(PRICES)) if (!plansHtml.includes(price.replace('円', ''))) problems.push(`plans.html に ${name} の ${price} が見つからない`);
const planOf = (name) => {
  const i = PLAN_NAMES.indexOf(name);
  return Object.fromEntries(Object.entries(ROWS).map(([k, v]) => [k, v[i]]));
};

if (problems.length) { console.error('正本の食い違い:\n  ' + problems.join('\n  ')); process.exit(1); }
if (CHECK) { console.log(`一致: 見本10件の正本は食い違いなし（プラン比較表 ${Object.keys(ROWS).length} 行を参照）`); process.exit(0); }

/* ---------- 文章の部品 ---------- */
const F = '```';
const li = (a) => a.map((x) => `- ${x}`).join('\n');
const ol = (a) => a.map((x, i) => `${i + 1}. ${x}`).join('\n');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const typeUrl = (t) => `../../type-${t.slug}.html`;

function overview() {
  const rows = samples.map((s) => {
    const t = types.get(s.typeId);
    return `| ${s.no} | ${s.typeId} ${t.name} | ${s.industry} | ${s.nameFull}（架空） | ${s.plan} | ${s.art.palette.map((p) => p.hex).join(' ')} | ${s.art.motif.split('」')[0].replace('「', '')} | ${s.art.motion.signature.split(':')[0]} |`;
  }).join('\n');
  return `# 見本サイト10件の一覧（似せないための早見表）

10件はそれぞれ別の担当（別の Claude Code のセッション）が作る想定です。
**ほかの9件と配色・モチーフ・動き・構成が似ないように**、作り始める前にこの表を見てください。
とくに、同じ「地の色」「署名モチーフ」「署名の動き」を使わないこと。

| 番号 | タイプ | 業種 | 架空の事業 | 参考の規模 | 配色（地→アクセント） | 署名モチーフ | 署名の動き |
|---|---|---|---|---|---|---|---|
${rows}

## 10件に共通すること

- クルーアセントの枠（上の帯・下の案内・見本ダイアログ・設計メモ）は全件同じ。見た目を変えない
- 事業・価格・住所・営業時間はすべて架空。実在の人物・お客様の声・実績・受賞・認証は作らない
- 写真と人物の絵は使わない。SVG・CSS・canvas で、その事業らしい図版を作る
- 外部への通信・外部フォント・CDN・外部画像は使わない
`;
}
const OVERVIEW = overview();

function brief(s, t) {
  return `# 制作ブリーフ — ${s.nameFull}（架空）

> この事業は**架空**です。実在の店舗・会社・人物とは関係ありません。
> 価格・営業時間・住所・数値はすべて見本用の設定です。

| 項目 | 内容 |
|---|---|
| 番号 / id | ${s.no} / \`${s.id}\` |
| 事業名 | ${s.nameFull}（読み: ${s.nameReading}） |
| 業種 | ${s.industry} |
| Web診断36のタイプ | ${s.typeId} ${t.name} |
| 参考の規模 | ${s.plan}プラン相当・${s.pages.length}ページ |
| 場所 | ${s.place} |

## コンセプト

${s.concept}

## 事業の説明（サイトに載せてよい文の素材）

${s.story}

## 見てほしい人

${s.audience}

## 主な行動

- 主な行動: **${s.actions.primary}**
- 次の行動: ${s.actions.secondary}
- 行動の近くに置く安心材料: ${s.actions.near}

## 商品・サービスと価格（見本用の架空）

| 名前 | 内容 | 価格 |
|---|---|---|
${s.offerings.map((o) => `| ${o.name} | ${o.detail} | ${o.price} |`).join('\n')}

## 基本情報（見本用の架空）

| 項目 | 内容 |
|---|---|
${s.facts.map((f) => `| ${f.label} | ${f.value} |`).join('\n')}

## ページ構成

${s.pages.map((p) => `### ${p.file} — ${p.title}

目的: ${p.purpose}

${ol(p.sections)}`).join('\n\n')}

さらに、クルーアセントの枠として **design-notes.html（この見本の設計メモ）** を必ず作ります（\`frame/design-notes.html\` を元に仕上げる）。

## 言葉づかい

- 調子: ${s.voice.tone}
- 見出しの案（そのまま使っても、言い換えても可）:
${li(s.voice.headlineIdeas.map((h) => `「${h}」`))}
- 使いたい言葉: ${s.voice.prefer.join('／')}
- 使わない言葉: ${s.voice.avoid.join('／')}

## この見本で避けること

${li(s.avoid)}

## 表示が必要なこと（法令・業界の観点）

${li(s.legal)}

## 10件の中での役割

${s.distinct}
`;
}

function typeSpec(s, t) {
  const d = t.detail, sp = specs.get(t.id);
  const fv = d.firstViewPlan;
  return `# タイプの方針 — ${t.id} ${t.name}

正本: \`data/types.json\` / \`data/type-page-specs.json\`（クルーアセント本体と同じデータ）。
本体の個別ページ: \`site/type-${t.slug}.html\`（見本からは \`${typeUrl(t)}\`）

> この方針を、架空の事業「${s.nameFull}」に**翻訳**して見本を作ります。
> 方針の言葉をそのままサイトに書くのではなく、事業の言葉に置き換えてください。
> どう置き換えたかは design-notes.html の表に書きます。

## 位置

- 領域: ${d.position.area}
- 横軸: ${d.position.xStep}
- 縦軸: ${d.position.yStep}
- 情報の組み方: ${sp ? sp.xFamily : '—'} ／ 見せ方の段階: ${sp ? sp.yModifier : '—'}
- 隣のタイプ（似せすぎない相手）: ${sp ? sp.related.map((r) => `${r.id} ${r.name}（${r.relation}）`).join('、') : '—'}

## 一言で

${t.oneLiner}

${t.summary}

- 強み: ${t.strengths.join('／')}
- 注意: ${t.tradeoff}

## 目的と、想定する訪問者

${d.recommendedPurpose}

${d.targetVisitor}

## 最初の画面に置く4つの役割（必ず満たす）

| 役割 | 方針 |
|---|---|
| 見出しの役割 | ${fv.headlineRole} |
| 添える情報 | ${fv.supportingInformation} |
| 裏づけ | ${fv.proofElement} |
| 主な行動 | ${fv.primaryAction} |

## 情報の優先順位（この順で読まれるように置く）

${ol(d.contentPriority)}

## 行動までの流れ

${ol(d.conversionFlow)}

## 行動ボタンの方針

- 主な行動（方針の言葉）: ${d.ctaStrategy.primaryCTA}
- 次の行動: ${d.ctaStrategy.secondaryCTA}
- 置く場所: ${d.ctaStrategy.placement}
- 近くに置く安心材料: ${d.ctaStrategy.reassuranceNearCTA}

この見本では → 主な行動「${s.actions.primary}」、次の行動「${s.actions.secondary}」

## 言葉の調子

- ${d.toneGuide.recommendedTone}
- 文の組み立て: ${d.toneGuide.sentenceStyle}
- 好む言葉: ${d.toneGuide.wordsToPrefer.join('／')}
- 避ける言葉: ${d.toneGuide.wordsToAvoid.join('／')}

## 見た目の方針

| 項目 | 方針 |
|---|---|
| 構成 | ${d.visualRecipe.layout} |
| 色 | ${d.visualRecipe.colorUse} |
| 文字 | ${d.visualRecipe.typography} |
| 図版 | ${d.visualRecipe.imagery} |
| 動き | ${d.visualRecipe.motion} |

- デザインの言葉: ${t.designKeywords.join('／')}
- このタイプでよく使うページ: ${t.pages.join('／')}
- よく使う機能: ${t.functions.join('／')}

## 検索の考え方

- 想定する検索: ${d.seoApproach.likelySearchIntent}
- 言葉のテーマ: ${d.seoApproach.keywordThemes.join('／')}
- 地域: ${d.seoApproach.localSeoFit}
- 注意: ${d.seoApproach.caution}
- 見本は \`noindex\` にするため検索には出ません。title と description は実際のサイトを想定して書きます

## 避けるパターン（このタイプでよく起きる失敗）

${li(d.avoidPatterns)}

## 書き出しのひな形（参考）

- 見出し: ${d.starterCopy.h1}
- 補足: ${d.starterCopy.sub}
- 注意: ${d.starterCopy.note}
`;
}

function artDirection(s, t) {
  const a = s.art;
  return `# アートディレクション — ${s.nameFull}（${t.id} ${t.name}）

この見本の「個性」です。**ここに書いたことが、ほかの9件と区別される理由**になります。
迷ったら、方針（TYPE_SPEC.md）を優先し、そのうえでこの個性を最大にしてください。

## 配色（デザイントークン）

| 変数 | 色 | 役割 |
|---|---|---|
${a.palette.map((p) => `| \`${p.token}\` | \`${p.hex}\` | ${p.role} |`).join('\n')}

- 文字と背景のコントラストは 4.5:1 以上（大きな文字は 3:1 以上）。アクセント色の上の文字は必ず計算して確かめる
- グラデーションは上の色どうしで作る。新しい色を足すときは design-notes.html に理由を書く

## 文字

| 用途 | 方針 |
|---|---|
| 見出し | ${a.typography.display} |
| 本文 | ${a.typography.body} |
| アクセント | ${a.typography.accent} |

- **外部フォントは読み込まない**（Google Fonts の \`<link>\` も不可）。OSの書体を並べた font-family で組む
  - 明朝: \`"Hiragino Mincho ProN", "Yu Mincho", "YuMincho", "Noto Serif JP", serif\`
  - ゴシック: \`"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", "YuGothic", "Noto Sans JP", sans-serif\`
  - 丸ゴシック: \`"Hiragino Maru Gothic ProN", "Zen Maru Gothic", "Yu Gothic", sans-serif\`
- より個性を出したい場合の候補（OFLライセンス）: ${a.typography.oflOptional.join('、')}
  - 使うのは、**利用者がフォントファイルを \`site/samples/${s.id}/fonts/\` に置いた場合だけ**。\`@font-face\` でローカルから読み、ライセンス文（OFL.txt）も同じ場所に置く
  - 置かれていなければ、上のOSの書体で仕上げる。報告の「要確認」に書く
- 書体に頼らない個性は、**SVGのロゴタイプ**と、字間・太さ・大きさの対比で出す
- 文字の大きさ: 本文16px以上（スマホ15px以上）、補足13px以上、ラベル12px以上。12px未満は使わない

## 署名モチーフ

${a.motif}

## 最初の画面のキービジュアル

${a.keyVisual}

## 動き

- **署名の動き**: ${a.motion.signature}
- 補助の動き:
${li(a.motion.supporting)}
- 動きを減らす設定（\`prefers-reduced-motion: reduce\`）: ${a.motion.reduced}
- 共通のきまり:
  - 外部のアニメーションライブラリは使わない（CSS・Vanilla JS・SVG・canvas のみ）
  - 動かすのは \`transform\` と \`opacity\` を基本にし、60fps を保つ
  - 常に動き続けるループは使わない。使う場合は画面外で止める（IntersectionObserver）
  - 動きで内容を隠さない。JSが動かなくても、すべての文章が読める
  - 動きの数は「署名の動き1つ＋補助2〜3つ」まで。動かしすぎも品質の不合格

## レイアウト

${a.layout}

## 図版

${a.imagery}

- 写真・ストック素材・人物の絵は使わない（実在しない人を描かない）
- 図版は SVG を基本に。\`<img>\` には alt と width/height を必ず付ける。飾りの SVG は \`aria-hidden="true"\`
- 架空の地図は SVG で描く（外部の地図は埋め込まない）

## この見本の部品

${li(a.components)}

## 簡易ロゴ

${s.plan === 'おまかせ'
    ? '- おまかせプラン相当のため、**Webサイト用の簡易ロゴ1案**を SVG で作る（見本の見どころの1つ）\n- ロゴの考え方を design-notes.html に書く'
    : `- ${s.plan}プランは「既存ロゴを使う」範囲のため、見本では**簡易なSVGロゴタイプ**を用意する\n- design-notes.html に「実際の制作では、事業者のロゴを使います」と書く`}
`;
}

function frameSnippets(s, t) {
  return `<!-- =====================================================================
     クルーアセントの枠  ${s.id}  v${VERSION}
     このファイルの4つの部品を、見本のすべてのページに入れる（design-notes.html も含む）。
     文言は変えてよい部分がない。見本のCSSで上書きしない。
     ===================================================================== -->

<!-- 1) <head> の中、見本自身のCSSより前に -->
<meta name="robots" content="noindex,nofollow">
<link rel="icon" href="../../assets/brand/icon-32.png" sizes="32x32">
<link rel="stylesheet" href="../_shared/crew-frame.css?v=${VERSION}">
<script defer src="../_shared/crew-frame.js?v=${VERSION}"></script>

<!-- 2) <body> の先頭（スキップリンクを置く場合はその次）に置く帯 -->
<div class="ca-ribbon" role="note" aria-label="見本サイトについて">
  <a class="ca-ribbon__brand" href="../../index.html" aria-label="クルーアセント（制作）"><img src="../../assets/brand/logo-onink.webp" width="360" height="278" alt=""><span class="ca-ribbon__long">クルーアセント</span></a>
  <p class="ca-ribbon__text"><b>見本サイト・架空</b><span class="ca-ribbon__long">架空の事業を想定した制作イメージです。事業・価格・住所はすべて架空です。</span></p>
  <p class="ca-ribbon__links"><a href="${typeUrl(t)}">${t.id}<span class="ca-ribbon__long"> ${esc(t.name)}</span></a><a href="design-notes.html"><span class="ca-ribbon__long">この見本の</span>設計メモ</a></p>
</div>

<!-- 3) 見本自身のフッターの「後」（</body> の前）に置く案内 -->
<aside class="ca-credit" aria-labelledby="ca-credit-title">
  <p class="ca-credit__label">この見本サイトについて</p>
  <h2 id="ca-credit-title">Web診断36「${t.id} ${esc(t.name)}」の設計方針で、クルーアセントが制作した見本です。</h2>
  <p>「${esc(s.nameFull)}」は架空の事業です。掲載している価格・営業時間・住所・数値はすべて見本用の設定で、実在の店舗・人物・お客様の声は載せていません。</p>
  <div class="ca-credit__actions">
    <a class="ca-btn ca-btn--primary" href="../../diagnosis.html?mode=quick">あなたの事業の方向を診断する（16問・無料）</a>
    <a class="ca-btn" href="design-notes.html">この見本の設計メモ</a>
    <a class="ca-link" href="../../works.html">見本サイトの一覧</a>
  </div>
  <p class="ca-credit__fine">参考の規模: ${s.plan}プラン相当（${s.pages.length}ページ）。見本の規模は参考で、特定のプランをおすすめするものではありません。</p>
  <a class="ca-credit__brand" href="../../index.html"><img src="../../assets/brand/logo.webp" width="360" height="278" alt="">クルーアセント（CREW ASCENT）</a>
</aside>

<!-- 4) </body> の直前に置く見本ダイアログ（予約・購入・送信の代わり） -->
<dialog class="ca-dialog" id="ca-sample-dialog" aria-labelledby="ca-dialog-title">
  <h2 id="ca-dialog-title">これは見本サイトです</h2>
  <p data-ca-dialog-text>この操作は、見本のため実際には行われません。</p>
  <div class="ca-dialog__actions">
    <a class="ca-btn" href="../../contact.html">クルーアセントに相談する</a>
    <button type="button" data-ca-close>閉じる</button>
  </div>
</dialog>

<!-- 使い方の例 -->
<!--   <a class="（見本のボタンのクラス）" href="#" data-sample-action="${esc(s.actions.primary.replace(/（見本）/, ''))}">${esc(s.actions.primary)}</a>   -->
<!--   <form data-sample-form="送信"> … <span class="ca-form-note">見本のため送信できません。</span> … </form>   -->
`;
}

function designNotes(s, t) {
  const d = t.detail, fv = d.firstViewPlan, plan = planOf(s.plan);
  const TODO = '<span class="ca-todo">（制作後に記入）</span>';
  const row = (a, b) => `<tr><th>${a}</th><td>${b}</td></tr>`;
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>設計メモ｜${esc(s.nameFull)}（見本・架空）｜クルーアセント</title>
<meta name="description" content="架空の事業「${esc(s.nameFull)}」の見本サイトを、Web診断36の${t.id} ${esc(t.name)}の方針でどう設計したかの記録です。">
<meta name="robots" content="noindex,nofollow">
<link rel="icon" href="../../assets/brand/icon-32.png" sizes="32x32">
<link rel="stylesheet" href="../_shared/crew-frame.css?v=${VERSION}">
<script defer src="../_shared/crew-frame.js?v=${VERSION}"></script>
</head>
<body class="ca-notes">
<!-- 帯（frame/frame-snippets.html の 2) と同じもの）をここに入れる -->
<main id="main">
  <p><a href="index.html">← 見本サイトに戻る</a></p>
  <h1>「${esc(s.nameFull)}」の設計メモ</h1>
  <p class="ca-lead">この見本は架空の事業です。Web診断36の <a href="${typeUrl(t)}">${t.id} ${esc(t.name)}</a> の方針を、${esc(s.industry)}の事業に当てはめるとどうなるかを示すために作りました。</p>

  <h2><small>01</small>このタイプの方針</h2>
  <p>${esc(t.oneLiner)}${esc(t.summary)}</p>
  <table><tbody>
    ${row('位置', `${esc(d.position.area)}<br>${esc(d.position.xStep)}<br>${esc(d.position.yStep)}`)}
    ${row('デザインの言葉', t.designKeywords.map((k) => `<span class="ca-chip">${esc(k)}</span>`).join(''))}
  </tbody></table>

  <h2><small>02</small>最初の画面の4つの役割と、この見本での答え</h2>
  <table><thead><tr><th>方針</th><th>この見本では</th></tr></thead><tbody>
    ${row(`見出しの役割<br><small>${esc(fv.headlineRole)}</small>`, TODO)}
    ${row(`添える情報<br><small>${esc(fv.supportingInformation)}</small>`, TODO)}
    ${row(`裏づけ<br><small>${esc(fv.proofElement)}</small>`, TODO)}
    ${row(`主な行動<br><small>${esc(fv.primaryAction)}</small>`, `「${esc(s.actions.primary.replace(/（見本）/, ''))}」${TODO}`)}
  </tbody></table>

  <h2><small>03</small>情報の優先順位と、置いた場所</h2>
  <table><thead><tr><th>優先順位（方針）</th><th>この見本で置いた場所</th></tr></thead><tbody>
    ${d.contentPriority.map((c, i) => row(`${i + 1}. ${esc(c)}`, TODO)).join('\n    ')}
  </tbody></table>

  <h2><small>04</small>見た目の判断</h2>
  <table><tbody>
    ${row('配色', s.art.palette.map((p) => `<span class="ca-swatch" style="background:${p.hex}"></span>${p.hex} ${esc(p.role)}`).join('<br>'))}
    ${row('署名モチーフ', esc(s.art.motif))}
    ${row('署名の動き', esc(s.art.motion.signature))}
    ${row('動きを減らす設定では', esc(s.art.motion.reduced))}
    ${row('方針からの調整', TODO)}
  </tbody></table>

  <h2><small>05</small>あえて避けたこと</h2>
  <ul>
    ${[...d.avoidPatterns, ...s.avoid].map((a) => `<li>${esc(a)}</li>`).join('\n    ')}
  </ul>

  <h2><small>06</small>実際の制作で変わること</h2>
  <ul>
    <li>図版: 見本はSVGのイラストです。実際の制作では、事業者が用意した写真、または許可を得た写真を使います</li>
    <li>ロゴ: ${s.plan === 'おまかせ' ? 'おまかせプランでは、Webサイト用の簡易ロゴ1案をお作りします（この見本のロゴはその例です）' : '事業者のロゴを使います（この見本のロゴタイプは見本用です）'}</li>
    <li>価格・営業時間・住所: 事業者が確定した値を載せます</li>
    <li>予約・購入・問い合わせ: 事業者が使っている予約サービスやフォームへつなぎます（見本ではダイアログを出すだけです）</li>
    ${s.legal.map((l) => `<li>${esc(l)}</li>`).join('\n    ')}
  </ul>

  <h2><small>07</small>この見本の規模</h2>
  <p>${s.plan}プラン相当です。参考として示すもので、特定のプランをおすすめするものではありません。<a href="../../plans.html">4つのプランを比べる</a></p>
  <table><tbody>
    ${Object.entries(plan).map(([k, v]) => row(esc(k), esc(v))).join('\n    ')}
  </tbody></table>

  <h2><small>08</small>あなたの事業なら</h2>
  <p>同じ業種でも、顧客や売り方が違えば合うタイプは変わります。16問の診断で、あなたの事業の方向を確かめられます。</p>
  <p><a href="../../diagnosis.html?mode=quick">16問で診断する（無料・登録不要）</a>　／　<a href="../../works.html">ほかの見本を見る</a>　／　<a href="../../contact.html">相談する</a></p>
</main>
<!-- 下の案内（3）とダイアログ（4）をここに入れる -->
</body>
</html>
`;
}

function acceptance(s, t) {
  return `# 受け入れチェックリスト — ${s.id}

\`node samples-kit/${s.no}-${s.id}/scripts/check-sample.mjs ${s.id}\` で **不合格 0 件** にしたうえで、次を目で確かめます。

## A. クルーアセントの枠（1つでも欠けたら不合格）
- [ ] 全ページの先頭に上の帯（見本サイト・架空・${t.id}・設計メモへのリンク）がある
- [ ] 全ページの最後に下の案内（タイプ名・架空の説明・診断への入口・設計メモ・一覧）がある
- [ ] 予約・購入・送信・電話などのボタンは、押すと見本ダイアログが出る（実際には何も起きない）
- [ ] フォームは \`data-sample-form\` 付きで、送信先がない。近くに「見本のため送信できません」
- [ ] design-notes.html がある。「（制作後に記入）」が1つも残っていない
- [ ] すべてのページが \`noindex,nofollow\`

## B. 架空と誠実さ
- [ ] 実在の人物・店舗・お客様の声・実績・受賞・認証・取引先を作っていない
- [ ] 人物の写真・絵がない
- [ ] 価格・営業時間などに「見本用の架空」と分かる注記がある（ページ内に1回以上）
- [ ] 効果・成果・順位を断定する表現がない（BRIEF.md の「使わない言葉」）
- [ ] 法令・業界の表示（BRIEF.md）を満たしている

## C. タイプの方針
- [ ] 最初の画面に4つの役割（見出し・添える情報・裏づけ・主な行動）がそろっている
- [ ] 情報の優先順位の上位3つが、トップページの上から順に読める
- [ ] 主な行動「${s.actions.primary}」が、方針の置き場所（${t.detail.ctaStrategy.placement}）にある
- [ ] 主な行動の近くに安心材料（${s.actions.near}）がある
- [ ] タイプの「避けるパターン」に当てはまっていない

## D. 個性（記憶に残るか）
- [ ] 署名モチーフが、全ページで3回以上くり返されている
- [ ] 署名の動きが1つ、はっきり分かる。動きは多すぎない（署名1＋補助2〜3）
- [ ] OVERVIEW_ALL_10.md のほかの9件と、配色・モチーフ・動きが似ていない
- [ ] SVGのロゴタイプがある
- [ ] 業種名を伏せても、何の事業かが図版と言葉から分かる
- [ ] テンプレートの寄せ集めに見えない（カードを3つ並べただけの章が続かない）

## E. 使いやすさ
- [ ] 320 / 390 / 768 / 1280px で崩れない（横スクロールなし）
- [ ] キーボードだけで全部の操作ができ、フォーカスが見える
- [ ] 動きを減らす設定で、繰り返し動くものがない。内容はすべて読める
- [ ] JSを切っても文章と主な情報が読める
- [ ] 外部への通信が0件。外部フォント・CDN・外部画像なし
- [ ] 1ページの転送量の目安 600KB 以下

## F. 一覧への登録（INTEGRATION.md）
- [ ] サムネイル \`site/assets/img/works/${s.id}.jpg\`（1600×1000）
- [ ] \`site/data/works.json\` に1件追加（id の重複なし）
- [ ] 本体の \`npm run check\` と \`npm test\` が通る（本体ページを変えていないこと）
`;
}

function integration(s, t) {
  const entry = {
    id: s.id,
    name: `${s.nameFull}（架空）`,
    industry: s.industry,
    typeId: t.id,
    typeName: t.name,
    plan: s.plan,
    pages: `${s.pages.length}ページ`,
    summary: s.works.summary,
    points: s.works.points,
    thumb: `assets/img/works/${s.id}.jpg`,
    url: `samples/${s.id}/index.html`,
  };
  return `# 本体サイトへの組み込み — ${s.id}

## 置き場所

| 置くもの | 場所 |
|---|---|
| 見本のページ | \`site/samples/${s.id}/\`（${s.pages.map((p) => p.file).join('、')}、design-notes.html） |
| 見本の画像・CSS・JS | \`site/samples/${s.id}/assets/\` の中だけ |
| 共通の枠（10件で共有） | \`site/samples/_shared/crew-frame.css\` と \`crew-frame.js\` |
| サムネイル | \`site/assets/img/works/${s.id}.jpg\` |
| 一覧のデータ | \`site/data/works.json\` の \`items\` に1件 |

**本体のページ・CSS・JSは変更しません。** 例外は works.json への1件追加だけです。

## 共通の枠の置き方

1. \`site/samples/_shared/\` がなければ作り、このパッケージの \`frame/crew-frame.css\` と \`frame/crew-frame.js\` をコピーする
2. すでにあれば、ファイル先頭の \`v2026-10-15\` を比べる。同じなら触らない。パッケージの方が新しいときだけ上書きする
3. 見本のページから \`../_shared/crew-frame.css?v=${VERSION}\` と \`../_shared/crew-frame.js?v=${VERSION}\` で読む

## works.json に足す1件（そのまま貼り付け）

${F}json
${JSON.stringify(entry, null, 2)}
${F}

「架空の事業を想定した見本」の表示は、一覧側（\`assets/js/works.js\`）が強制します。

## サムネイル

${F}
node samples-kit/${s.no}-${s.id}/scripts/shoot-thumb.mjs ${s.id}
${F}

## 検査

${F}
node samples-kit/${s.no}-${s.id}/scripts/check-sample.mjs ${s.id}   # 見本（不合格 0 件まで直す）
npm run check && npm test                                          # 本体が壊れていないこと
${F}

## ナビゲーションへの追加（この作業ではしない）

見本サイトの一覧（works.html）へのリンクを本体のヘッダー・フッターに出す作業は、
全ページに関わるため**この作業では行いません**。手順は \`docs/WORKS_連携手順.md\` §3 にあります。
報告に「一覧に出せる状態になった」と書いてください。
`;
}

function prompt(s, t) {
  const pages = s.pages.map((p) => `\`${p.file}\`（${p.title}）`).join('、');
  return `# Claude Code への指示 — 見本サイト ${s.no}「${s.nameFull}」（${t.id} ${t.name}）

あなたは、クルーアセント（小規模事業者向けのWeb制作事務所）の**見本サイト**を1件作るデザイナー兼フロントエンドエンジニアです。
このパッケージ（このファイルがあるフォルダ）と、クルーアセント本体のリポジトリ（このリポジトリ）だけを使って作業します。

## ゴール

架空の事業「**${s.nameFull}**」（${s.industry}）の見本サイトを、Web診断36の **${t.id} ${t.name}** の方針で作る。

1. **その事業の魅力が最大限に伝わる、個性的で記憶に残るサイト**にする。業種名を伏せても何の事業か分かり、ほかの9件と見間違えないこと
2. **クルーアセントの存在を、上品に、確実に伝える**。上の帯・下の案内・設計メモで「誰が・どのタイプの方針で作ったか」を示し、見た人が自分の事業でも診断したくなる入口を置く
3. 主役は見本の事業。クルーアセントの枠は控えめな大きさで、ただし消さない・薄めない

## 作るもの

- \`site/samples/${s.id}/\` に ${pages}、それに **design-notes.html（設計メモ）**
- 参考の規模: **${s.plan}プラン相当（${s.pages.length}ページ）**
- 共通の枠 \`site/samples/_shared/crew-frame.css\`・\`crew-frame.js\`（なければコピー）
- サムネイル \`site/assets/img/works/${s.id}.jpg\` と、\`site/data/works.json\` への1件追加

## 読む順番

1. \`README.md\`（このパッケージの説明）
2. \`BRIEF.md\` … 架空の事業・ページ構成・言葉づかい
3. \`TYPE_SPEC.md\` … タイプの方針（最初の画面・優先順位・行動・避けること）
4. \`ART_DIRECTION.md\` … 配色・文字・署名モチーフ・動き（この見本の個性）
5. \`CREW_ASCENT_FRAME.md\` と \`frame/\` … クルーアセントの枠（全ページ共通・変更不可）
6. \`OVERVIEW_ALL_10.md\` … ほかの9件（似せないため）
7. \`ACCEPTANCE_CHECKLIST.md\` … 合格の条件
8. \`INTEGRATION.md\` … 置き場所と、一覧への登録

## 絶対に守ること

1. **認証・外部サービスに接続しない。** ログイン、APIキー、外部フォーム、外部の地図・動画・フォント・CDN・画像を使わない。ネットから何も取得しない
2. **本体のページ・CSS・JSを変更しない。** 書き込むのは \`site/samples/${s.id}/\`、\`site/samples/_shared/\`（なければ作成）、\`site/assets/img/works/${s.id}.jpg\`、\`site/data/works.json\`（1件追加）だけ
3. **架空であることを隠さない。** 枠の帯・下の案内・設計メモを全ページに入れる。文言を変えない。見本のCSSで上書きしない
4. **作り話の信用材料を入れない。** 実在の人物・店舗、お客様の声、実績の数、受賞、認証、取引先、ランキングを作らない。人物の写真・絵も使わない
5. **何も送信しない。** 予約・購入・送信・電話のボタンは \`data-sample-action\` を付けて見本ダイアログを出す。フォームは \`data-sample-form\` を付け、送信先を書かない
6. **すべてのページを \`noindex,nofollow\`** にする
7. 動きは CSS・Vanilla JS・SVG・canvas だけ。\`prefers-reduced-motion\` で止める。常に動き続けるループは画面外で止める。動きで内容を隠さない
8. 文字は本文16px以上（スマホ15px以上）、補足13px以上、ラベル12px以上。コントラスト4.5:1以上。押せる範囲44px以上を目安に
9. タイプの方針の「避けるパターン」と、BRIEF.md の「使わない言葉」を使わない
10. 不明な点があっても止まらない。**仮定**を置いて進め、報告の「要確認」に書く

## 作業の手順

1. このパッケージをリポジトリ直下の \`samples-kit/${s.no}-${s.id}/\` に置いた状態で始める（検査スクリプトが本体の playwright を使うため）
2. **設計を先に書く**: \`samples-kit/${s.no}-${s.id}/PLAN.md\` に、各ページの章の順番、デザイントークン、SVG部品の一覧、動きの一覧（どこで・何が・いつ・動きを減らす設定では）を書く
3. 共通の枠を置く（INTEGRATION.md の手順）
4. デザイントークン（CSS変数）、SVGのロゴタイプ、署名モチーフ、キービジュアルを作る
5. ページを作る。最初の画面から作り、TYPE_SPEC.md の4つの役割を満たしているかを確かめながら進める
6. 署名の動きと補助の動きを入れる。動きを減らす設定で静止することを確かめる
7. \`frame/design-notes.html\` を元に \`site/samples/${s.id}/design-notes.html\` を仕上げる。「（制作後に記入）」をすべて、実際に作ったものの説明に置き換える
8. 検査 \`node samples-kit/${s.no}-${s.id}/scripts/check-sample.mjs ${s.id}\` を**不合格0件**まで直す。続けて \`npm run check && npm test\`
9. サムネイル \`node samples-kit/${s.no}-${s.id}/scripts/shoot-thumb.mjs ${s.id}\`
10. \`site/data/works.json\` に INTEGRATION.md の1件を追加する
11. ACCEPTANCE_CHECKLIST.md を上から確かめ、報告する

## 報告の形（日本語）

- 作ったファイルの一覧
- 署名要素（ロゴタイプ・モチーフ・キービジュアル・署名の動き）を一言ずつ
- タイプの方針をどう翻訳したか（最初の画面の4つの役割）
- 検査の結果（不合格・注意の件数。実行していない検査を「合格」と書かない）
- ほかの9件と似ないようにした点
- 仮定と要確認（フォントを置いていない、など）
`;
}

function readme(s, t) {
  return `# 見本サイト制作パッケージ ${s.no} — ${s.nameFull}（架空）

クルーアセントの見本サイト10件のうちの1件を、Claude Code で作るためのパッケージです。

- タイプ: **${t.id} ${t.name}**
- 業種: ${s.industry}
- 参考の規模: ${s.plan}プラン相当・${s.pages.length}ページ＋設計メモ
- 出力先: \`site/samples/${s.id}/\`

## 使い方

1. クルーアセント本体のリポジトリを開き、直下に \`samples-kit/\` を作る
2. このZIPを \`samples-kit/\` の中に展開する（\`samples-kit/${s.no}-${s.id}/\` になる）
3. Claude Code に次のように伝える

${F}
samples-kit/${s.no}-${s.id}/CLAUDE_CODE_PROMPT.md を読んで、その指示どおりに見本サイトを作ってください。
${F}

\`samples-kit/\` は公開物（\`site/\`）の外にあるので、公開されません。

## 入っているもの

| ファイル | 内容 |
|---|---|
| CLAUDE_CODE_PROMPT.md | Claude Code への指示（最初に読ませる） |
| BRIEF.md | 架空の事業・ページ構成・言葉づかい |
| TYPE_SPEC.md | タイプの方針（本体の正本データから生成） |
| ART_DIRECTION.md | 配色・文字・署名モチーフ・キービジュアル・動き |
| CREW_ASCENT_FRAME.md | クルーアセントの枠の説明 |
| OVERVIEW_ALL_10.md | 10件の早見表（似せないため） |
| ACCEPTANCE_CHECKLIST.md | 合格の条件 |
| INTEGRATION.md | 置き場所・works.json の1件・サムネイル |
| sample.json | この見本の正本データ（機械用） |
| frame/ | 枠のCSS・JS、貼り付け用HTML、設計メモの下書き |
| scripts/ | 検査（check-sample.mjs）とサムネイル撮影（shoot-thumb.mjs） |
| MANIFEST.json | ファイル一覧とハッシュ |

生成元: クルーアセント本体の \`tools/build-sample-prompts.mjs\`（\`data/sample-sites.json\` と \`data/types.json\` から作成）。
`;
}

function frameDoc(s, t) {
  return `# クルーアセントの枠 — 全ページ共通・変更不可

見本サイトは、**見本の事業が主役**です。クルーアセントは「誰が作ったか」を控えめに、確実に伝えます。

| 部品 | 置く場所 | 役割 |
|---|---|---|
| 上の帯 \`.ca-ribbon\` | \`<body>\` の先頭（スキップリンクの次まで可） | 見本であること・架空であること・タイプ（${t.id}）・設計メモへのリンク |
| 下の案内 \`.ca-credit\` | 見本自身のフッターの後 | 「${t.id} ${t.name}の方針でクルーアセントが制作」・診断への入口・設計メモ・一覧 |
| 見本ダイアログ \`#ca-sample-dialog\` | \`</body>\` の直前 | 予約・購入・送信の代わりに「見本なので実際には動かない」と伝える |
| 設計メモ \`design-notes.html\` | 見本の中の1ページ | タイプの方針をどう翻訳したか。**クルーアセントの考え方を伝える一番の宣伝** |

- 貼り付けるHTMLは \`frame/frame-snippets.html\`（この見本用に文言を埋めてあります）
- 見た目は \`frame/crew-frame.css\`（クルーアセントの配色で固定）。見本側のCSSで上書きしない
- 帯の高さは44px前後。**見本の最初の画面の印象を壊さないよう、帯の下から見本のデザインを始める**
- 見本自身のヘッダーを固定（sticky）にする場合も、帯は通常の流れに置き、スクロールで流れてよい

## 宣伝と主役のバランス

- クルーアセントの名前が出るのは「帯」「下の案内」「設計メモ」の3か所だけ。見本の本文には出さない
- 見本の本文は、その事業の魅力を伝えることに集中する
- 設計メモでは、方針→この見本での答え、を表で示す。読んだ人が「自分の事業ならどうなるか」を知りたくなるように書く
`;
}

/* ---------- 書き出し ---------- */
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const zipList = [];
for (const s of samples) {
  const t = types.get(s.typeId);
  const dirName = `${s.no}-${s.id}`;
  const dir = path.join(OUT, dirName);
  const files = {
    'README.md': readme(s, t),
    'CLAUDE_CODE_PROMPT.md': prompt(s, t),
    'BRIEF.md': brief(s, t),
    'TYPE_SPEC.md': typeSpec(s, t),
    'ART_DIRECTION.md': artDirection(s, t),
    'CREW_ASCENT_FRAME.md': frameDoc(s, t),
    'OVERVIEW_ALL_10.md': OVERVIEW,
    'ACCEPTANCE_CHECKLIST.md': acceptance(s, t),
    'INTEGRATION.md': integration(s, t),
    'sample.json': JSON.stringify({ ...s, type: { id: t.id, slug: t.slug, name: t.name }, planScope: planOf(s.plan), generated: VERSION }, null, 2) + '\n',
    'frame/frame-snippets.html': frameSnippets(s, t),
    'frame/design-notes.html': designNotes(s, t),
    'frame/crew-frame.css': read(path.join(KIT, 'frame/crew-frame.css')),
    'frame/crew-frame.js': read(path.join(KIT, 'frame/crew-frame.js')),
    'scripts/check-sample.mjs': read(path.join(KIT, 'scripts/check-sample.mjs')),
    'scripts/shoot-thumb.mjs': read(path.join(KIT, 'scripts/shoot-thumb.mjs')),
  };
  const manifest = [];
  for (const [rel, body] of Object.entries(files)) {
    const p = path.join(dir, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, body);
    manifest.push({ path: rel, bytes: Buffer.byteLength(body), sha256: crypto.createHash('sha256').update(body).digest('hex') });
  }
  fs.writeFileSync(path.join(dir, 'MANIFEST.json'), JSON.stringify({ package: dirName, type: t.id, generated: VERSION, files: manifest }, null, 2) + '\n');
  const zip = `${dirName}.zip`;
  const r = spawnSync('zip', ['-q', '-r', '-X', zip, dirName], { cwd: OUT, encoding: 'utf8' });
  if (r.status !== 0) { console.error(`zip に失敗: ${zip}\n${r.stderr || r.error}`); process.exit(1); }
  zipList.push(`${zip}（${Math.round(fs.statSync(path.join(OUT, zip)).size / 1024)}KB）`);
}
/* 10件をまとめたZIP（早見表つき） */
fs.writeFileSync(path.join(OUT, '00-OVERVIEW_ALL_10.md'), OVERVIEW + `
## パッケージの使い方（共通）

1. クルーアセント本体のリポジトリ直下に \`samples-kit/\` を作り、作りたい見本のZIPを展開する
2. Claude Code に「samples-kit/<番号>-<id>/CLAUDE_CODE_PROMPT.md を読んで、その指示どおりに見本サイトを作ってください」と伝える
3. 1件ずつ、別のセッションで作るのがおすすめです（それぞれの個性を保つため）
`);
const all = 'all-10-sample-prompts.zip';
const r2 = spawnSync('zip', ['-q', '-X', all, '00-OVERVIEW_ALL_10.md', ...samples.map((s) => `${s.no}-${s.id}.zip`)], { cwd: OUT, encoding: 'utf8' });
if (r2.status !== 0) { console.error(`zip に失敗: ${all}`); process.exit(1); }
console.log(`dist/sample-prompts/ に10件を書き出しました:\n  ` + zipList.join('\n  ') + `\n  ${all}（10件まとめ）`);
