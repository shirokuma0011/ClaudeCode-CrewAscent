/* ミルメ（架空）見本  mirume.js  v2
   署名の動き（トップの最初の画面で一度だけ輪郭をなぞる線）は CSS だけで動く。ここでは扱わない。
   ここで扱うのは、試験運用と費用のページの相談フォームの状態だけ:
   入力中（欄ごとの印）→ エラー（足りない欄を知らせる）→ 送信中 → 送信後（見本のため送っていないことを示す）。
   送信そのものは、クルーアセントの枠（crew-frame.js）が止めて見本ダイアログを出す。JSがなくても内容は読める。 */
(function () {
  'use strict';
  /* スマホ下の固定ボタン：最初の画面のボタンが見えなくなってから出す */
  var dock = document.querySelector('.dock');
  var first = document.querySelector('.hero__acts .btn, .subhero__side .btn');
  if (dock) {
    if (first && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { dock.classList.toggle('is-on', !es[0].isIntersecting && es[0].boundingClientRect.top < 0); }).observe(first);
    } else { dock.classList.add('is-on'); }
  }
})();
(function () {
  'use strict';
  var form = document.querySelector('form[data-sample-form]');
  if (!form) return;
  var status = form.querySelector('.form__status');
  var btn = form.querySelector('button[type="submit"]');
  var label = btn ? btn.textContent : '';
  var mailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function check(el) {
    var v = (el.value || '').trim();
    var ok = el.required ? v.length > 0 : true;
    if (ok && el.type === 'email' && v) ok = mailRe.test(v);
    var field = el.closest('.field');
    if (field) field.classList.toggle('is-err', !ok);
    if (ok) el.removeAttribute('aria-invalid'); else el.setAttribute('aria-invalid', 'true');
    return ok;
  }
  function say(html) { status.innerHTML = html; status.hidden = false; }

  /* 入力中：一度エラーになった欄は、直したところで印を消す */
  form.addEventListener('input', function (e) {
    var f = e.target.closest && e.target.closest('.field');
    if (f && f.classList.contains('is-err')) check(e.target);
  });

  /* 送信：足りなければここで止める（見本ダイアログは出さない） */
  form.addEventListener('submit', function (e) {
    var bad = [];
    form.querySelectorAll('[required]').forEach(function (el) { if (!check(el)) bad.push(el); });
    if (bad.length) {
      e.preventDefault();
      e.stopPropagation();
      say('<b>' + bad.length + 'つの欄を確かめてください。</b>印の付いた欄に、入力が必要です。');
      bad[0].focus();
      return;
    }
    /* 送信中 → 送信後。送信先がない見本のため「完了」とは書かない */
    form.classList.add('is-sending');
    form.setAttribute('aria-busy', 'true');
    if (btn) { btn.disabled = true; btn.textContent = '送信中…'; }
    say('<b>送信中…</b>');
    setTimeout(function () {
      form.classList.remove('is-sending');
      form.removeAttribute('aria-busy');
      if (btn) { btn.disabled = false; btn.textContent = label; }
      say('<b>見本のため、送信はしていません。</b>入力した内容は、どこにも送られず保存もされません。実際の制作では、2営業日以内に日時の候補を返信する窓口へつなぎます。');
    }, 700);
  });
})();
