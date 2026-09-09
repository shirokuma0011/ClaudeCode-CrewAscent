/* =====================================================================
   正本から assets/js/diagnosis-data.js を作り直す

     node tools/generate-data.mjs             … 書き出す
     node tools/generate-data.mjs --check     … 現物と一致するかだけ確かめる

   正本:
     data/questions.tsv … 設問（id / category / quick / statement。現在48問）
     data/types.json    … 36タイプ
     data/meta.json     … 件数

   types を TSV にしていない理由:
     1タイプが約50項目で、入れ子（firstViewPlan、toneGuide、visualRecipe、
     seoApproach、industryReasons など）を持ちます。TSVへ入れると各セルに
     JSONを埋めることになり、表として扱えません。表で編集する意味があるのは
     設問だけなので、設問だけTSV、タイプはJSONにしています。
   ===================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE, DATA } from './paths.mjs';

const ROOT = SITE;   /* 書き出し先・読み取り先は公開ディレクトリ */
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const rdData = (p) => fs.readFileSync(path.join(DATA, p), 'utf8');
const CHECK = process.argv.includes('--check');

/* --- questions.tsv を読む --- */
const lines = rdData('questions.tsv').split('\n').filter((l) => l.trim().length);
const head = lines[0].split('\t');
const QUESTIONS = lines.slice(1).map((line, n) => {
  const cell = line.split('\t');
  if (cell.length !== head.length) throw new Error(`questions.tsv ${n + 2}行目: 列数が ${cell.length}（見出しは ${head.length}）`);
  const o = {};
  head.forEach((h, i) => {
    const v = cell[i];
    o[h] = h === 'id' ? Number(v) : h === 'quick' ? v === '1' : v;
  });
  return o;
});

const TYPES = JSON.parse(rdData('types.json'));
const META = JSON.parse(rdData('meta.json'));

/* --- 正本そのものの検査（作り直す前に壊れていないか見る） --- */
const errs = [];
if (QUESTIONS.length !== META.totalQuestions) errs.push(`設問数 ${QUESTIONS.length} が meta の ${META.totalQuestions} と違う`);
if (QUESTIONS.filter((q) => q.quick).length !== META.quickQuestions) errs.push('かんたん診断の件数が meta と違う');
if (TYPES.length !== META.typeCount) errs.push(`タイプ数 ${TYPES.length} が meta の ${META.typeCount} と違う`);
META.categories.forEach((c) => {
  const n = QUESTIONS.filter((q) => q.category === c).length;
  if (n !== QUESTIONS.length / META.categories.length) errs.push(`観点 ${c} が ${n}問（均等ではない）`);
});
const cells = new Set(TYPES.map((t) => `${t.xIndex},${t.yIndex}`));
if (cells.size !== 36) errs.push('36マスに重複または欠けがある');
const slugs = new Set(TYPES.map((t) => t.slug));
if (slugs.size !== TYPES.length) errs.push('slug が重複している');
if (errs.length) { console.error('正本に問題があります:\n  - ' + errs.join('\n  - ')); process.exit(1); }

/* --- 出力（既存ファイルの書式をそのまま保つ） --- */
const HEAD = rd('assets/js/diagnosis-data.js').split('(function (global) {')[0];
const out = HEAD + `(function (global) {
  'use strict';

  const QUESTIONS = ${JSON.stringify(QUESTIONS, null, 2)};

  const TYPES = ${JSON.stringify(TYPES, null, 2)};

  const META = ${JSON.stringify(META, null, 2)};

  global.CrewData = { QUESTIONS: QUESTIONS, TYPES: TYPES, META: META };
}(typeof globalThis !== 'undefined' ? globalThis : this));
`;

const target = path.join(ROOT, 'assets/js/diagnosis-data.js');
if (CHECK) {
  const same = fs.readFileSync(target, 'utf8') === out;
  console.log(same ? '一致: 正本から同じファイルを作り直せます'
                   : '不一致: 正本と生成済みファイルがずれています（node tools/generate-data.mjs で更新）');
  process.exit(same ? 0 : 1);
}
fs.writeFileSync(target, out);
console.log(`assets/js/diagnosis-data.js を作り直しました（設問${QUESTIONS.length} / タイプ${TYPES.length}）`);
