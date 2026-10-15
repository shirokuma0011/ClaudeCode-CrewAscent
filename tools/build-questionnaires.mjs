/* =====================================================================
   相談アンケート2ページを、正本から作る。

     node tools/build-questionnaires.mjs          site/consult-form.html と site/hearing-form.html を書き出す
     node tools/build-questionnaires.mjs --check  正本と同じかだけ見る（書き出さない）

   正本: data/questionnaires.json（設問）／ data/types.json（Web診断36の選択肢）
   骨組み: site/contact.html から <head> の共通部分・ヘッダー・フッターを借りる
   動き: site/assets/js/questionnaire.js（表示の条件・入力の確認・下書き・確認画面・送り方）

   設問はHTMLに直接書き出すので、JSが動く前から読めて、支援技術でも扱える。
   ===================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { DATA, SITE } from './paths.mjs';

const CHECK = process.argv.includes('--check');
const V = '20261015d';
const rd = (p) => fs.readFileSync(path.join(SITE, p), 'utf8');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const Q = JSON.parse(fs.readFileSync(path.join(DATA, 'questionnaires.json'), 'utf8'));
const TYPES = JSON.parse(fs.readFileSync(path.join(DATA, 'types.json'), 'utf8')).sort((a, b) => a.id.localeCompare(b.id));
const BLOCK = (label) => `<span class="blocker-inline" title="公開前に確定する項目">（公開前に確定: ${label}）</span>`;

/* ---------- 正本の検査 ---------- */
const errs = [];
const TYPES_OK = ['text', 'email', 'textarea', 'radio', 'checkbox', 'select', 'consent'];
for (const f of Q.forms) {
  const ids = new Set();
  for (const s of f.sections) for (const q of s.questions) {
    if (ids.has(q.id)) errs.push(`${f.id}: 設問idが重複 ${q.id}`); ids.add(q.id);
    if (!TYPES_OK.includes(q.type)) errs.push(`${q.id}: 知らない type ${q.type}`);
    if (['radio', 'checkbox'].includes(q.type) && !Array.isArray(q.options)) errs.push(`${q.id}: options がない`);
  }
  const cond = (c, where) => { if (c && !ids.has(c.q)) errs.push(`${where}: 条件の設問 ${c.q} がない`); };
  for (const s of f.sections) { cond(s.showIf, s.id); for (const q of s.questions) cond(q.showIf, q.id); }
  if (!f.sections.some((s) => s.questions.some((q) => q.type === 'consent' && q.required))) errs.push(`${f.id}: 同意の設問がない`);
  if (!f.sections[0].questions.some((q) => q.type === 'email' && q.required)) errs.push(`${f.id}: 最初の段階に必須のメールがない`);
}
if (errs.length) { console.error('正本に問題があります:\n  - ' + errs.join('\n  - ')); process.exit(1); }

/* ---------- 骨組みは相談ページから借りる ---------- */
const base = rd('contact.html');
const HEAD_TOP = base.slice(0, base.indexOf('  <title>'));
const AFTER_DESC = base.slice(base.indexOf('  <meta name="robots"'), base.indexOf('</head>'));
const HEADER = base.slice(base.indexOf('<a class="skip-link'), base.indexOf('<nav class="breadcrumb'));
const FOOTER = base.slice(base.indexOf('<footer'));

const cond = (c) => (c ? ` data-show-if="${esc(JSON.stringify(c))}"` : '');
const req = (q) => (q.required ? '<span class="qn-req">必須</span>' : '<span class="qn-opt-tag">任意</span>');
const helpId = (q) => (q.help ? `h-${q.id}` : '');
const described = (q) => [helpId(q), `e-${q.id}`].filter(Boolean).join(' ');
const help = (q) => (q.help ? `<p class="qn-q__help" id="h-${q.id}">${esc(q.help)}</p>` : '');
const err = (q) => `<p class="qn-q__err" id="e-${q.id}"></p>`;

function options(q) {
  if (q.options !== '@types') return q.options;
  return null;
}
function field(q) {
  const common = `name="${q.id}" aria-describedby="${described(q)}"${q.required ? ' required aria-required="true"' : ''}`;
  if (q.type === 'text' || q.type === 'email') {
    return `<div class="qn-q" data-qn-q="${q.id}"${cond(q.showIf)}>
          <label class="qn-q__label" for="q-${q.id}">${esc(q.label)}${req(q)}</label>${help(q)}
          <input class="qn-input" id="q-${q.id}" type="${q.type}" ${common} maxlength="${q.type === 'email' ? 254 : 200}"${q.autocomplete ? ` autocomplete="${q.autocomplete}"` : ''}${q.placeholder ? ` placeholder="${esc(q.placeholder)}"` : ''}${q.type === 'email' ? ' inputmode="email"' : ''}>
          ${err(q)}
        </div>`;
  }
  if (q.type === 'textarea') {
    return `<div class="qn-q" data-qn-q="${q.id}"${cond(q.showIf)}>
          <label class="qn-q__label" for="q-${q.id}">${esc(q.label)}${req(q)}</label>${help(q)}
          <textarea class="qn-input" id="q-${q.id}" ${common} rows="${q.rows || 3}" maxlength="2000"${q.placeholder ? ` placeholder="${esc(q.placeholder)}"` : ''}></textarea>
          ${err(q)}
        </div>`;
  }
  if (q.type === 'select') {
    const opts = q.options === '@types'
      ? TYPES.map((t) => `<option value="${esc(t.id + ' ' + t.name)}" data-slug="${t.slug}">${esc(t.id + ' ' + t.name)}</option>`).join('')
        + '<option value="利用していない">利用していない</option><option value="結果を覚えていない">結果を覚えていない</option>'
      : q.options.map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join('');
    return `<div class="qn-q" data-qn-q="${q.id}"${cond(q.showIf)}>
          <label class="qn-q__label" for="q-${q.id}">${esc(q.label)}${req(q)}</label>${help(q)}
          <select class="qn-input qn-select" id="q-${q.id}" ${common}${q.options === '@types' ? ' data-qn-types' : ''}><option value="">選んでください</option>${opts}</select>
          ${err(q)}
        </div>`;
  }
  if (q.type === 'radio' || q.type === 'checkbox') {
    const opts = options(q).map((o, i) => `<label class="qn-choice"><input type="${q.type}" name="${q.id}" value="${esc(o)}" id="q-${q.id}-${i}"><span>${esc(o)}</span></label>`).join('\n            ');
    const other = q.other
      ? `\n            <label class="qn-choice"><input type="${q.type}" name="${q.id}" value="その他" data-qn-other-toggle><span>その他</span></label>
            <input class="qn-input qn-other" type="text" name="${q.id}__other" maxlength="200" aria-label="${esc(q.label)}：その他の内容" placeholder="その他の内容" hidden>`
      : '';
    return `<fieldset class="qn-q" data-qn-q="${q.id}"${cond(q.showIf)} aria-describedby="${described(q)}">
          <legend class="qn-q__label">${esc(q.label)}${req(q)}${q.type === 'checkbox' ? '<span class="qn-multi">いくつでも</span>' : ''}</legend>${help(q)}
          <div class="qn-choices">
            ${opts}${other}
          </div>
          ${err(q)}
        </fieldset>`;
  }
  /* consent */
  return `<div class="qn-q qn-consent" data-qn-q="${q.id}">
          <p class="qn-q__label" id="l-${q.id}">${esc(q.label)}${req(q)}</p>
          <label class="qn-choice qn-choice--consent"><input type="checkbox" name="${q.id}" value="同意する" required aria-required="true" aria-describedby="l-${q.id} e-${q.id}"><span>${esc(q.text)}</span></label>
          <p class="qn-q__help"><a href="privacy.html" target="_blank" rel="noopener">プライバシーポリシーを読む（新しいタブで開きます）</a></p>
          ${err(q)}
        </div>`;
}

function page(f, other) {
  const total = f.sections.reduce((n, s) => n + s.questions.length, 0);
  const steps = f.mode === 'steps';
  const title = f.pageTitle, desc = f.description;
  const sections = f.sections.map((s, i) => `
      <section class="qn-sec" id="sec-${s.id}" data-qn-section="${i}"${cond(s.showIf)} aria-labelledby="t-${s.id}">
        <h2 class="qn-sec__title" id="t-${s.id}" tabindex="-1"><span class="qn-sec__no">${String(i + 1).padStart(2, '0')}</span>${esc(s.title)}</h2>
        ${s.questions.map(field).join('\n        ')}
      </section>`).join('\n');
  return HEAD_TOP + `  <title>${esc(title)}</title>\n  <meta name="description" content="${esc(desc)}">\n`
    + AFTER_DESC.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(title)}">`)
                .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(desc)}">`)
    + `  <script defer src="assets/js/questionnaire.js?v=${V}"></script>\n</head>\n<body data-page="${f.id}-form">\n`
    + HEADER
    + `<nav class="breadcrumb" aria-label="現在地"><div class="wrap"><ol>
      <li><a href="index.html">ホーム</a></li><li><a href="contact.html">無料相談・お問い合わせ</a></li>
      <li aria-current="page">${esc(f.title)}</li></ol></div></nav>

  <main id="main">
  <section class="ah ah--trust">
    <div class="wrap ah__inner"><p class="eyebrow">${esc(f.who)}</p><h1>${esc(f.title)}</h1><p class="ah__lead">${esc(f.lead)}</p></div>
    <div class="ah__band"><dl class="ah__facts ah__facts--row">
      <div><dt>目安</dt><dd class="ah__facts__txt">${esc(f.minutes)}</dd></div>
      <div><dt>質問</dt><dd class="ah__facts__txt">${total}問${steps ? `（${f.sections.length}の段階）` : ''}・必須は${f.sections.flatMap((s) => s.questions).filter((q) => q.required).length}問だけ</dd></div>
      <div><dt>送り方</dt><dd class="ah__facts__txt">確認画面のあと、メールで送ります</dd></div>
    </dl></div>
  </section>

  <section class="sec">
    <div class="wrap container--mid">
      <noscript><p class="note note--info">このアンケートの確認画面と送信にはJavaScriptを使います。使えない場合は、メール ${BLOCK('メール')} でご相談ください。</p></noscript>
      <p class="qn-intro">分からない項目は空欄のままで構いません。入力した内容は<b>この端末にだけ下書きとして保存</b>し（30日間）、送る操作をするまで外部へは送られません。送信は契約の申し込みではありません。</p>
      <div class="qn-draft" data-qn-draft hidden><p data-qn-draft-text></p><button type="button" class="btn btn--line btn--sm" data-qn-clear>下書きを消して最初から</button></div>
      ${steps ? `<div class="qn-progress" data-qn-progress hidden><p class="qn-progress__text" aria-live="polite" data-qn-progress-text></p><div class="qn-progress__bar" aria-hidden="true"><i data-qn-progress-bar></i></div>
        <details class="qn-toc"><summary>段階の一覧</summary><ol data-qn-toc></ol></details></div>` : ''}
      <form class="qn" id="qn" data-qn="${f.id}" data-qn-mode="${f.mode}" data-qn-subject="${esc(f.subject)}" data-qn-title="${esc(f.title)}" novalidate>
${sections}
        <div class="qn-hp" aria-hidden="true"><label>この欄は空のままにしてください<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
        <p class="qn-errors" data-qn-errors role="alert" hidden></p>
        <div class="qn-nav" data-qn-nav>
          ${steps ? '<button type="button" class="btn btn--line" data-qn-prev>戻る</button><button type="button" class="btn btn--primary" data-qn-next>次へ</button>' : ''}
          <button type="submit" class="btn btn--primary" data-qn-review-btn>入力内容を確認する</button>
        </div>
      </form>

      <section class="qn-review" data-qn-review hidden aria-labelledby="qn-review-title">
        <h2 id="qn-review-title" tabindex="-1">入力内容の確認</h2>
        <p class="caption">内容を確かめてから、下の方法で送ってください。直したいときは「修正する」を押してください。</p>
        <div class="qn-review__list" data-qn-review-list></div>
        <div class="qn-send" data-qn-send>
          <h3>送る</h3>
          <p class="qn-send__to">送信先: <span data-qn-to>${BLOCK('メール')}</span></p>
          <div class="qn-send__actions" data-qn-send-actions></div>
          <p class="qn-send__msg" data-qn-send-msg aria-live="polite"></p>
        </div>
        <p><button type="button" class="btn btn--line" data-qn-back>入力に戻る</button></p>
      </section>

      <section class="qn-done" data-qn-done hidden aria-labelledby="qn-done-title">
        <h2 id="qn-done-title" tabindex="-1">ありがとうございました</h2>
        <p data-qn-done-text>内容を確認し、メールでご連絡します。</p>
        <p><button type="button" class="btn btn--line" data-qn-clear>この端末の下書きを消す</button></p>
        <p><a class="alink" href="index.html">トップへ戻る</a></p>
      </section>
    </div>
  </section>

  <section class="sec sec--paper2">
    <div class="wrap container--mid">
      <div class="stack">
        <p class="note"><b>どちらのアンケートか迷ったら</b> — ${esc(f.id === 'consult' ? 'サイトのイメージが固まっている方は' : 'サイトのイメージがまだ固まっていない方は')}<a href="${other.file}">${esc(other.title)}（${esc(other.minutes)}）</a>をご利用ください。迷う場合は、短い相談アンケートで構いません。</p>
        <p class="note note--info"><b>送信＝契約ではありません</b> — アンケートの送信は、契約の申し込みではありません。内容を確認し、見積もりと進め方をメールでご案内します。</p>
        <p class="note note--calm"><b>個人情報の利用目的</b> — いただいた内容は、お問い合わせへの回答、見積もり、制作内容の確認、契約・連絡のために利用します。詳しくは<a href="privacy.html">プライバシーポリシー</a>をご確認ください。</p>
      </div>
    </div>
  </section>
  </main>
  ` + FOOTER;
}

const outputs = Q.forms.map((f, i) => [f.file, page(f, Q.forms[1 - i])]);
if (CHECK) {
  const bad = outputs.filter(([file, html]) => !fs.existsSync(path.join(SITE, file)) || rd(file) !== html).map(([f]) => f);
  if (bad.length) { console.error('不一致: 正本から作り直されていません: ' + bad.join(', ')); process.exit(1); }
  console.log(`一致: 相談アンケート ${outputs.length}ページは正本と同じです`);
} else {
  for (const [file, html] of outputs) fs.writeFileSync(path.join(SITE, file), html);
  console.log('書き出し: ' + outputs.map(([f]) => 'site/' + f).join('、'));
}
