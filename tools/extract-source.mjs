/* =====================================================================
   正本データを assets/js/diagnosis-data.js から取り出す（1回だけ使う道具）

     node tools/extract-source.mjs

   経緯:
     diagnosis-data.js の冒頭に「正本は questions.tsv と types.tsv」と
     書いてありますが、その2つと生成ツールが配布物に入っていませんでした。
     生成済みファイルは検査できても、同じものを作り直せない状態です。
     そこで、生成済みファイルから正本を復元します。

   出力:
     data/questions.tsv … 設問（表で扱える形。現在48問）
     data/types.json    … 36タイプ（入れ子が深いのでJSON。理由は README に記載）
     data/meta.json     … 件数など
   ===================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE, DATA } from './paths.mjs';

const ROOT = SITE;   /* 書き出し先・読み取り先は公開ディレクトリ */
const g = { window: {} }; g.window = g;
new Function('window', 'globalThis', fs.readFileSync(path.join(ROOT, 'assets/js/diagnosis-data.js'), 'utf8'))(g, g);
const { QUESTIONS, TYPES, META } = g.CrewData;

/* --- questions.tsv --- */
const cols = ['id', 'category', 'quick', 'statement'];
const tsv = [cols.join('\t')]
  .concat(QUESTIONS.map((q) => cols.map((c) => {
    const v = q[c];
    if (typeof v === 'boolean') return v ? '1' : '0';
    return String(v ?? '').replace(/[\t\r\n]/g, ' ');
  }).join('\t')))
  .join('\n') + '\n';
fs.writeFileSync(path.join(DATA, 'questions.tsv'), tsv);

/* --- types.json / meta.json --- */
fs.writeFileSync(path.join(DATA, 'types.json'), JSON.stringify(TYPES, null, 2) + '\n');
fs.writeFileSync(path.join(DATA, 'meta.json'), JSON.stringify(META, null, 2) + '\n');

console.log(`questions.tsv ${QUESTIONS.length}行 / types.json ${TYPES.length}件 / meta.json を書き出しました`);
