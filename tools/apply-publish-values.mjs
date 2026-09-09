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
     6. 段階公開の基準（tools/publish-stages.mjs）を満たしたページだけ
        noindex を index,follow へ変える
     7. sitemap.xml を、いま index にしているページだけで作り直す

   やらないこと:
     ・値の推測。空欄の項目は印を残したまま、noindex も外しません
     ・法務文の判断。専門家の確認は別途必要です
   ===================================================================== */
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { indexPlan } from './publish-stages.mjs';
import { SITE, DATA } from './paths.mjs';

/* Windows では new URL(...).pathname が "/C:/…" になり、パスとして壊れる。
   fileURLToPath を使うと、どのOSでも正しい絶対パスになる。 */
const ROOT = SITE;   /* 書き出し先・読み取り先は公開ディレクトリ */
const DRY = process.argv.includes('--dry-run');
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const rdData = (p) => fs.readFileSync(path.join(DATA, p), 'utf8');
const wr = (p, s) => { if (!DRY) fs.writeFileSync(path.join(ROOT, p), s); };

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

const V = JSON.parse(rdData('publish-values.json'));
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
const out = new Map();   /* 書き換えたあとの内容。段階公開の判定に使う */

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

  out.set(f, s);
  if (s !== before) { wr(f, s); }
}

/* 5. index の解禁は段階ごとに。基準は tools/publish-stages.mjs */
const { plan } = indexPlan(ROOT, out);
const opened = [];
const held = [];
for (const p of plan) {
  let s = out.get(p.file);
  const before = s;
  s = s.replace(/(<meta name="robots" content=")(?:no)?index,follow(")/,
    `$1${p.index ? 'index' : 'noindex'},follow$2`);
  if (p.index) opened.push(p.file); else held.push(p);
  if (s !== before) { out.set(p.file, s); wr(p.file, s); }
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
  console.log(`未入力の項目 ${missing.length} 件`);
  console.log('  ' + missing.join(', '));
}

console.log(`\n段階公開: index にしたページ ${opened.length} / ${plan.length}`);
if (held.length) {
  /* なぜ出せないのかを、ページごとではなく理由ごとにまとめる（同じ理由が並ぶため） */
  const byReason = new Map();
  for (const p of held) {
    for (const w of p.why) {
      const k = w.replace(/\d+/g, 'N');
      if (!byReason.has(k)) byReason.set(k, []);
      byReason.get(k).push(p.file);
    }
  }
  for (const [reason, fs2] of byReason) {
    console.log(`  ${reason} … ${fs2.length}ページ${fs2.length <= 4 ? '（' + fs2.join(', ') + '）' : ''}`);
  }
}

/* 8. sitemap は index にしたページだけで作り直す */
if (!DRY) {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tools/build-sitemap.mjs')], { encoding: 'utf8' });
  process.stdout.write(r.stdout || '');
  if (r.status !== 0) process.stdout.write(r.stderr || '');
} else {
  console.log('[確認のみ] sitemap.xml は書き換えていません（node tools/build-sitemap.mjs で作り直します）');
}
console.log('\n公開前に tools/publish-readiness.mjs で最終確認してください。');
