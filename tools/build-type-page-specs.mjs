/* =====================================================================
   data/type-page-specs.json を、36タイプの座標から機械的に作り直す。

     xFamily   … 情報の組み方（横軸6段階）
     yModifier … 見せ方の段階（縦軸6段階）
     related   … 軸ひとつ分だけ違う隣（上下左右、最大4件）

   3つとも座標だけで決まるので、判断も文章も入れていない。
   実行: node tools/build-type-page-specs.mjs
   ===================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { SITE, DATA } from './paths.mjs';

const g = { CrewData: null };
new Function('window', 'globalThis', fs.readFileSync(path.join(SITE, 'assets/js/diagnosis-data.js'), 'utf8'))(g, g);
const { TYPES } = g.CrewData;

/* 横軸6段階＝情報の組み方。左（実用・情報）から右（ブランド・魅力）へ */
const X_FAMILY = [
  '検索・参照アーキテクチャ',
  '案内・導入アーキテクチャ',
  '行動・成果アーキテクチャ',
  '価値・根拠アーキテクチャ',
  '魅力・体験アーキテクチャ',
  '世界観・編集アーキテクチャ',
];
/* 縦軸6段階＝見せ方。下（王道・安心）から上（先進・新しさ）へ */
const Y_MODIFIER = ['王道・端正', '堅実・信頼', '標準・明快', '今らしい・軽やか', '洗練・先取り', '先進・実験的'];

const byCell = new Map(TYPES.map((t) => [`${t.xIndex},${t.yIndex}`, t]));
const at = (x, y) => byCell.get(`${x},${y}`) || null;

const records = TYPES.map((t) => {
  const rel = [
    [at(t.xIndex - 1, t.yIndex), '情報寄りの隣接'],
    [at(t.xIndex + 1, t.yIndex), '魅力寄りの隣接'],
    [at(t.xIndex, t.yIndex - 1), '安心寄りの隣接'],
    [at(t.xIndex, t.yIndex + 1), '先進寄りの隣接'],
  ].filter(([n]) => n)
    .map(([n, relation]) => ({ slug: n.slug, id: n.id, name: n.name, relation }));
  return {
    id: t.id,
    slug: t.slug,
    xFamily: X_FAMILY[t.xIndex],
    yModifier: Y_MODIFIER[t.yIndex],
    related: rel,
  };
});

/* 検査: 端は隣が減る。中央は必ず4件 */
const inner = records.filter((r) => {
  const t = TYPES.find((x) => x.id === r.id);
  return t.xIndex > 0 && t.xIndex < 5 && t.yIndex > 0 && t.yIndex < 5;
});
const bad = inner.filter((r) => r.related.length !== 4);
if (bad.length) { console.error('内側なのに隣が4件でない:', bad.map((r) => r.id).join(', ')); process.exit(1); }
if (records.length !== 36) { console.error('36件ではありません'); process.exit(1); }

const out = { generatedAt: new Date().toISOString().slice(0, 10), records };
fs.writeFileSync(path.join(DATA, 'type-page-specs.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`data/type-page-specs.json を作りました（${records.length}件 / 隣接のべ ${records.reduce((a, r) => a + r.related.length, 0)}件）`);
