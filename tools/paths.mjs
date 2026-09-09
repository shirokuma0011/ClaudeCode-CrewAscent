/* =====================================================================
   置き場所を1か所で決める。

     site/  … 公開するファイルだけ（HTML・CSS・JS・画像）
     data/  … 正本（設問・タイプ・業種・公開用の確定値）
     tools/ … 生成と検査。公開されない

   以前は tools/ と data/ が site の中にあり、そのまま公開されていた。
   道具と下書きを web 上に置かないため、外へ出してある。
   ===================================================================== */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* Windows でも壊れないよう fileURLToPath を使う（new URL().pathname は "/C:/…" になる） */
const HERE = path.dirname(fileURLToPath(import.meta.url));

export const REPO = path.resolve(HERE, '..');
export const SITE = path.join(REPO, 'site');
export const DATA = path.join(REPO, 'data');
export const DOCS = path.join(REPO, 'docs');
