/**
 * site-config.js — 公開前の未確定値(PUBLISH-BLOCKER)を1か所へ集約。
 *
 * 方針:
 *  - "PUBLISH_BLOCKER" のままの項目は本人確認・入力が必要。値を推測で埋めない。
 *  - いずれかが "PUBLISH_BLOCKER" の間は productionIndexingEnabled を false のままにし、
 *    全ページを noindex で公開しない(HTML側の <meta robots> も noindex)。
 *  - JS無効でも事業説明・料金・相談方法は各HTMLに直接書いてあるため読める。
 *    この設定は主に「相談フォームURL」「解析」「OGP絶対URL」等のJS機能に使う。
 *
 * 正本テンプレート: docs/crew-ascent-site-blueprint/data/site-config.template.json
 */
window.CREW_CONFIG = {

  /* ---- 言語設定（Round 1 で追加） ----
     enabledLocales に 'en' を足し、content/en/ を用意した時だけ
     言語切替UIと hreflang が出ます。空の英語ページは公開しません。 */
  defaultLocale: 'ja',
  enabledLocales: ['ja'],
  localeMeta: {
    ja: { htmlLang: 'ja', ogLocale: 'ja_JP', siteName: 'クルーアセント', pathPrefix: '' },
    en: { htmlLang: 'en', ogLocale: 'en_US', siteName: 'Crew Ascent', pathPrefix: '/en' },
  },
  siteName: 'クルーアセント',
  siteAlternateName: 'CREW ASCENT',

  // ---- 以下は公開前に本人が確定する(PUBLISH-BLOCKER) ----
  canonicalOrigin: 'PUBLISH_BLOCKER',   // 例: https://example.com

  /* --- スクロール速度の上限（トラックパッドの慣性対策） ---------------
     true にすると、勢いよく操作しても最高速度が一定以上に上がりません。
     普段の操作（ゆっくり／やや速い）は素通しなので、操作感は変わりません。
     URLに ?steady=1 / ?steady=0 を付ければ、切り替えて比べられます。
     詳しくは SCROLL_FIX.md 第7版。 */
  /* --- 動き（モーション）の入り切り -----------------------------------
     'on'  … 罫が引かれ、章の英字が現れ、図の現在地が点く（既定）
     'off' … いっさい動かさない。内容は同じ
     URLに ?motion=off を付ければ、その場で切って比べられます。
     OS側で「動きを減らす」を選んでいる場合は、この設定に関係なく止まります。
     詳しくは MOTION_PLAN_2026-08-19.md */
  motion: 'on',

  steadyScroll: false,
  // steadyStepCap: 120,   // 1イベントで受け付ける最大px
  // steadySpeedCap: 60,   // 1コマの上限px（60 = 毎秒3600px）
  // steadyEase: 0.26,     // 大きいほど機敏
  legalBusinessName: 'PUBLISH_BLOCKER', // 正式事業者名 / 法人名
  responsiblePerson: 'PUBLISH_BLOCKER', // 運営責任者
  postalAddress: 'PUBLISH_BLOCKER',
  telephone: 'PUBLISH_BLOCKER',
  email: 'PUBLISH_BLOCKER',
  businessDays: 'PUBLISH_BLOCKER',
  replyEstimate: 'PUBLISH_BLOCKER',
  serviceArea: 'PUBLISH_BLOCKER',
  googleFormUrl: 'contact.html',      // 相談フォームURL
  officialLineUrl: '',
  socialUrls: [],
  taxMode: 'PUBLISH_BLOCKER',            // 'included' | 'excluded' 等
  paymentMethods: ['PUBLISH_BLOCKER'],
  domainFeePolicy: 'PUBLISH_BLOCKER',

  // ---- 確定済み(資料に基づく) ----
  logoHorizontalReference: 'assets/brand/crew-ascent-logo-horizontal-reference.png',
  logoSymbolReference: 'assets/brand/crew-ascent-logo-symbol-reference.png',

  analytics: { ga4MeasurementId: '', enabled: false },
  searchConsoleVerification: '',
  productionIndexingEnabled: false,      // PUBLISH-BLOCKER が残る間は false
};

/** 値が未確定(PUBLISH_BLOCKER)か */
window.CREW_CONFIG.isBlocked = function (key) {
  const v = window.CREW_CONFIG[key];
  return v === 'PUBLISH_BLOCKER' || (Array.isArray(v) && v.includes('PUBLISH_BLOCKER'));
};
