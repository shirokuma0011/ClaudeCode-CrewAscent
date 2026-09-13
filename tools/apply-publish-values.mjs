/* =====================================================================
   data/publish-values.json の確定値をサイト全体へ反映する。

     node tools/apply-publish-values.mjs            … 反映する
     node tools/apply-publish-values.mjs --dry-run  … 何が変わるかだけ表示

   やること:
     1. HTML内の「（公開前に確定: ○○）」を、確定値の文字へ置き換える
     2. assets/js/site-config.js の PUBLISH_BLOCKER を埋める
     3. canonical と og:url を各ページへ入れ、og:image を絶対URLにする
     4. sitemap.xml と robots.txt のドメインを差し替える
     5. JSON-LD に url を足す
     6. 全項目が埋まっているときだけ noindex を index,follow へ変える
        （結果・404・見本一覧は noindex のまま）

   やらないこと:
     ・値の推測。空欄の項目は印を残したまま、noindex も外しません
     ・法務文の判断。専門家の確認は別途必要です
   ===================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* Windows では new URL(...).pathname が "/C:/…" になり、パスとして壊れる。
   fileURLToPath を使うと、どのOSでも正しい絶対パスになる。 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry-run');
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const wr = (p, s) => { if (!DRY) fs.writeFileSync(path.join(ROOT, p), s); };

const NOINDEX_ALWAYS = ['result.html', '404.html', 'works.html'];

/* 印のラベル → 確定値のキー */
const MAP = {
  '正式氏名または法人名': 'legalBusinessName',
  '正式事業者名': 'legalBusinessName',
  '運営責任者': 'responsiblePerson',
  '所在地': 'postalAddress',
  '電話番号': 'telephone',
  'メール': 'email',
  '営業日': 'businessDays',
  '返信目安': 'replyEstimate',
  '対応地域': 'serviceArea',
  '公開ドメイン': 'canonicalOrigin',
  'GoogleフォームURL': 'googleFormUrl',
  '税込総額または税抜+税込併記': 'taxDisplayNote',
  '消費税の表示方針': 'taxDisplayShort',
  '負担者': 'transferFeeBearer',
  '含む/別途': 'domainFeeInclusion',
  '銀行振込・自動引落し等': 'paymentMethods',
  '連絡方法': 'cancelContactMethod',
  '原則なし等': 'monthlyRefundPolicy',
  '連絡期限': 'yearlyNoticeDeadline',
  '対応ブラウザ方針': 'browserSupport',
  'ドメイン費の扱い': 'domainFeePolicy',
  '制定日': 'policyEffectiveDate',
  '利用サービスの確定': 'processors',
  '保管期間の最終承認': 'retentionPolicy',
  '請求受付方法・手数料': 'disclosureRequest',
  '合意管轄裁判所': 'jurisdictionCourt',
};

const V = JSON.parse(rd('data/publish-values.json'));
const has = (k) => String(V[k] || '').trim().length > 0;
const val = (k) => String(V[k]).trim();
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const keys = Object.keys(V).filter((k) => !k.startsWith('_'));
const missing = keys.filter((k) => !has(k));

const origin = has('canonicalOrigin') ? val('canonicalOrigin').replace(/\/+$/, '') : null;
if (origin && !/^https:\/\/[^\/]+$/.test(origin)) {
  console.error(`canonicalOrigin は https://example.com の形で書いてください（今: ${origin}）`);
  process.exit(1);
}

const files = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html') && !f.startsWith('_'));
let filled = 0, left = 0;

for (const f of files) {
  let s = rd(f), before = s;

  /* 1. 印の置き換え */
  s = s.replace(
    /<span class="blocker-inline"[^>]*>（公開前に確定[:：]\s*([^）]*)）<\/span>/g,
    (m, label) => {
      const key = MAP[label.trim()];
      if (key && has(key)) { filled++; return esc(val(key)); }
      left++; return m;
    });

  if (origin) {
    const url = origin + '/' + (f === 'index.html' ? '' : f);
    /* 2. canonical（結果ページは付けない。noindex,follow のまま運用するため） */
    if (f !== 'result.html' && !/rel="canonical"/.test(s)) {
      s = s.replace(/(<meta name="robots"[^>]*>)/, `$1\n  <link rel="canonical" href="${url}">`);
    }
    /* 3. og:url と og:image の絶対URL化 */
    if (/property="og:title"/.test(s) && !/property="og:url"/.test(s)) {
      s = s.replace(/(<meta property="og:title"[^>]*>)/, `$1\n  <meta property="og:url" content="${url}">`);
    }
    s = s.replace(/(<meta property="og:image" content=")(?!https?:)([^"]+)(")/g, `$1${origin}/$2$3`);
    /* 4. JSON-LD に url を足す */
    s = s.replace(/("@type":"WebSite","name")/g, `"@type":"WebSite","url":"${origin}/","name"`);
  }

  /* 5. noindex の解除は、全項目が埋まったときだけ */
  if (missing.length === 0 && !NOINDEX_ALWAYS.includes(f)) {
    s = s.replace(/(<meta name="robots" content=")noindex,follow(")/, '$1index,follow$2');
  }

  if (s !== before) { wr(f, s); }
}

/* 6. site-config.js */
let cfg = rd('assets/js/site-config.js');
const CFG_KEYS = ['canonicalOrigin', 'legalBusinessName', 'responsiblePerson', 'postalAddress',
  'telephone', 'email', 'businessDays', 'replyEstimate', 'serviceArea', 'googleFormUrl',
  'domainFeePolicy'];
for (const k of CFG_KEYS) {
  if (!has(k)) continue;
  const v = k === 'canonicalOrigin' ? origin : val(k);
  cfg = cfg.replace(new RegExp(`(${k}:\\s*)'PUBLISH_BLOCKER'`), `$1'${v.replace(/'/g, "\\'")}'`);
}
if (has('paymentMethods')) {
  cfg = cfg.replace(/paymentMethods:\s*\['PUBLISH_BLOCKER'\]/,
    `paymentMethods: [${val('paymentMethods').split(/[、,]/).map((x) => `'${x.trim().replace(/'/g, "\\'")}'`).join(', ')}]`);
}
if (has('taxDisplayShort')) {
  cfg = cfg.replace(/taxMode:\s*'PUBLISH_BLOCKER'/, `taxMode: '${val('taxDisplayShort').replace(/'/g, "\\'")}'`);
}
if (missing.length === 0) {
  cfg = cfg.replace(/productionIndexingEnabled:\s*false/, 'productionIndexingEnabled: true');
}
wr('assets/js/site-config.js', cfg);

/* 7. sitemap.xml / robots.txt */
if (origin) {
  wr('sitemap.xml', rd('sitemap.xml').split('https://[DOMAIN]').join(origin));
  let rb = rd('robots.txt');
  rb = rb.replace(/^#\s*公開前に実ドメインへ差し替える.*\n/m, '');   /* 済んだ注意書きを消す */
  rb = rb.replace(/^#\s*Sitemap:.*$/m, `Sitemap: ${origin}/sitemap.xml`);
  wr('robots.txt', rb);
}

console.log(`${DRY ? '[確認のみ] ' : ''}印を埋めた: ${filled} か所 ／ 残り: ${left} か所`);
if (missing.length) {
  console.log(`未入力の項目 ${missing.length} 件のため、noindex は外していません。`);
  console.log('  ' + missing.join(', '));
} else {
  console.log('全項目が埋まりました。noindex を index,follow へ変更しました（結果・404・見本を除く）。');
  console.log('公開前に tools/publish-readiness.mjs で最終確認してください。');
}
