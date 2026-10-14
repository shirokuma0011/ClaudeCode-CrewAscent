/* =====================================================================
   トップの36タイプ空間が読む表示用データを、正本から作る。

   正本: data/types.json（タイプ）／ data/occupations.json（業種）
   出力: site/assets/js/atelier-types.js
         window.CrewAtelierTypes          … 36タイプ（表示用の項目＋業種）
         window.CrewAtelierIndustryGroups … 「業種」の並びの分類（業種ページと同じ13分類）

   「業種」の並びは、各タイプを業種ページで最もよく挙がる分類に置く。
   1つの業種に2〜4タイプを挙げているので、上位にあるほど重く数える（4件中1番目=4点…）。
   同点なら業種ページの分類順で先のもの。1つのタイプは複数の業種に合うため、
   選択欄には「よく挙がる業種」を別に出す（industries）。

   引き継ぎ（2026-10-14）の types.js は正本と全36件・全項目で一致していた。
   手で写すと次に正本を直したときにずれるので、ここから生成する。
     node tools/build-atelier-types.mjs          書き出す
     node tools/build-atelier-types.mjs --check  正本と一致しているかだけ見る
   ===================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { DATA, SITE } from './paths.mjs';

const FIELDS = ['id', 'slug', 'name', 'xIndex', 'yIndex', 'oneLiner', 'summary', 'tradeoff', 'designKeywords', 'pages', 'strengths'];
const OUT = path.join(SITE, 'assets/js/atelier-types.js');

const types = JSON.parse(fs.readFileSync(path.join(DATA, 'types.json'), 'utf8'));
const occupations = JSON.parse(fs.readFileSync(path.join(DATA, 'occupations.json'), 'utf8')).categories;

/* 並びのラベルは狭い画面でも1行に収まる短い名前（正式名は業種ページと同じ name） */
const SHORT = {
  food: '飲食・食品', beauty: '美容・健康', medical: '医療・歯科', care: '介護・福祉',
  professional: '士業・相談', construction: '建設・住宅', living: '修理・生活', school: '教室・習い事',
  retail: '小売・工芸', btob: 'BtoB・法人', industry: '製造・技術', culture: '観光・文化', creator: 'クリエイター',
};
const score = new Map(), listed = new Map();
occupations.forEach((cat, ci) => cat.items.forEach((item) => item.types.forEach((id, rank) => {
  const s = score.get(id) || new Map();
  s.set(cat.key, (s.get(cat.key) || 0) + (item.types.length - rank));
  score.set(id, s);
  const l = listed.get(id) || [];
  l.push({ name: item.name, rank, ci });
  listed.set(id, l);
})));
const groupOf = (id) => {
  const s = score.get(id);
  if (!s) throw new Error(`${id}: 業種ページのどこにも出てきません`);
  return occupations.map((c) => c.key).reduce((best, key) => ((s.get(key) || 0) > (s.get(best) || 0) ? key : best));
};
const industriesOf = (id) => listed.get(id)
  .sort((a, b) => a.rank - b.rank || a.ci - b.ci)
  .slice(0, 6).map((x) => x.name);
for (const c of occupations) if (!SHORT[c.key]) throw new Error(`短い名前がありません: ${c.key}`);
const groups = occupations.map((c) => ({ key: c.key, name: c.name, short: SHORT[c.key] }));
if (types.length !== 36) throw new Error(`タイプは36件のはず: ${types.length}`);
const coords = new Set(types.map((t) => `${t.xIndex},${t.yIndex}`));
if (coords.size !== 36) throw new Error('座標が重複しています');

const slim = types
  .slice()
  .sort((a, b) => a.id.localeCompare(b.id))
  .map((t) => Object.fromEntries(FIELDS.map((f) => {
    if (t[f] === undefined) throw new Error(`${t.id}: ${f} がありません`);
    return [f, t[f]];
  })))
  .map((t) => ({ ...t, industryGroup: groupOf(t.id), industries: industriesOf(t.id) }));
for (const g of groups) if (!slim.some((t) => t.industryGroup === g.key)) throw new Error(`タイプが1つも入らない分類: ${g.name}`);

const body = '/* 自動生成: tools/build-atelier-types.mjs（正本 data/types.json・data/occupations.json）。手で直さないこと。 */\n'
  + 'window.CrewAtelierTypes = ' + JSON.stringify(slim, null, 2) + ';\n'
  + 'window.CrewAtelierIndustryGroups = ' + JSON.stringify(groups, null, 2) + ';\n';

if (process.argv.includes('--check')) {
  const now = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (now !== body) { console.error('不一致: atelier-types.js が正本から作り直されていません'); process.exit(1); }
  console.log('一致: atelier-types.js は正本と同じです（36件）');
} else {
  fs.writeFileSync(OUT, body);
  console.log(`書き出し: ${path.relative(process.cwd(), OUT)}（36件）`);
}
