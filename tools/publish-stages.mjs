/* =====================================================================
   どのページを、どの条件で検索エンジンに載せるか（index解禁の基準）。

   これまでは「確定値が全部そろったら、結果・404・見本以外を一斉に index」
   でした。36タイプの個別ページが増えたので、一斉解禁をやめ、段階に分けます。

   段階1 基本ページ
     ・公開ドメインが決まっている
     ・法務コア4ページ（privacy / terms / commercial-transactions / contact）に
       「公開前に確定」の印が1つも残っていない
     ・そのページ自身にも印が残っていない
     この3つを満たしたページから index,follow にします。

   段階2 タイプページ（type-*.html と types.html）
     段階1に加えて、
     ・診断の入口（diagnosis.html）が段階1を満たしている
     ・そのページの本文が 2,000字以上ある（中身の薄いページを一括で出さない）
     ・data/publish-values.json の _switches.indexTypePages が true
       （36ページを世に出す判断は、機械ではなく運営者がします）

   載せないページ
     result.html（個人の回答が出るため）/ 404.html / works.html（実物が未掲載）

   このファイルは判定だけを持ちます。書き換えは apply-publish-values.mjs、
   一覧の出力は build-sitemap.mjs、報告は publish-readiness.mjs が行います。
   ===================================================================== */
import fs from 'node:fs';
import path from 'node:path';

export const NEVER_INDEX = ['result.html', '404.html', 'works.html'];
export const LEGAL_CORE = ['privacy.html', 'terms.html', 'commercial-transactions.html', 'contact.html'];
export const TYPE_BODY_MIN = 2000;

const MARK = /（公開前に確定[:：]/;

/** 本文のおおよその文字数。タグ・スクリプト・空白を除いて数える */
export function bodyLength(html) {
  const body = (html.match(/<body[\s\S]*<\/body>/i) || [''])[0]
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, '');
  return body.length;
}

export function isTypePage(file) {
  return /^type-.+\.html$/.test(file) || file === 'types.html';
}

/**
 * 各HTMLについて「今 index にしてよいか」と、その理由を返す。
 * 何も書き換えません。
 */
export function indexPlan(ROOT, htmlOverride) {
  const files = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html') && !f.startsWith('_')).sort();
  /* 書き換えたあとの内容で判定したいときは、呼び出し側から Map で渡せる（--dry-run 用） */
  const html = new Map(files.map((f) => [
    f, (htmlOverride && htmlOverride.get(f)) || fs.readFileSync(path.join(ROOT, f), 'utf8'),
  ]));

  let values = {};
  try { values = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/publish-values.json'), 'utf8')); }
  catch { values = {}; }
  const keys = Object.keys(values).filter((k) => !k.startsWith('_'));
  const originSet = String(values.canonicalOrigin || '').trim().length > 0;
  const switches = values._switches || {};
  const typeSwitch = switches.indexTypePages === true;

  const marksLeft = (f) => (html.get(f) || '').split(MARK).length - 1;
  const legalLeft = LEGAL_CORE.filter((f) => html.has(f) && marksLeft(f) > 0);

  const plan = files.map((file) => {
    const why = [];
    if (NEVER_INDEX.includes(file)) {
      return { file, group: '載せない', index: false, why: ['このページは公開後も載せません'] };
    }
    if (!originSet) why.push('公開ドメインが未確定');
    if (marksLeft(file) > 0) why.push(`このページに「公開前に確定」が ${marksLeft(file)} か所`);
    if (legalLeft.length) why.push('法務コアが未確定: ' + legalLeft.join(', '));

    const group = isTypePage(file) ? 'タイプページ' : '基本ページ';
    if (group === 'タイプページ') {
      const len = bodyLength(html.get(file));
      if (len < TYPE_BODY_MIN) why.push(`本文が ${len}字（${TYPE_BODY_MIN}字未満）`);
      if (html.has('diagnosis.html') && marksLeft('diagnosis.html') > 0) why.push('診断の入口が未確定');
      if (!typeSwitch) why.push('_switches.indexTypePages が false');
    }
    return { file, group, index: why.length === 0, why };
  });

  return { plan, originSet, keys, missing: keys.filter((k) => !String(values[k] || '').trim()), typeSwitch };
}
