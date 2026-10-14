/* =====================================================================
   トップの36タイプ空間が読む表示用データを、正本から作る。

   正本: data/types.json
   出力: site/assets/js/atelier-types.js（window.CrewAtelierTypes）

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
if (types.length !== 36) throw new Error(`タイプは36件のはず: ${types.length}`);
const coords = new Set(types.map((t) => `${t.xIndex},${t.yIndex}`));
if (coords.size !== 36) throw new Error('座標が重複しています');

const slim = types
  .slice()
  .sort((a, b) => a.id.localeCompare(b.id))
  .map((t) => Object.fromEntries(FIELDS.map((f) => {
    if (t[f] === undefined) throw new Error(`${t.id}: ${f} がありません`);
    return [f, t[f]];
  })));

const body = '/* 自動生成: tools/build-atelier-types.mjs（正本 data/types.json）。手で直さないこと。 */\n'
  + 'window.CrewAtelierTypes = ' + JSON.stringify(slim, null, 2) + ';\n';

if (process.argv.includes('--check')) {
  const now = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (now !== body) { console.error('不一致: atelier-types.js が正本から作り直されていません'); process.exit(1); }
  console.log('一致: atelier-types.js は正本と同じです（36件）');
} else {
  fs.writeFileSync(OUT, body);
  console.log(`書き出し: ${path.relative(process.cwd(), OUT)}（36件）`);
}
