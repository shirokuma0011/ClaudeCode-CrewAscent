/* 書の教室 墨灯（架空） 見本サイト v4  sumiakari.js
   署名の動き（一画が一度だけ引かれ、落款が置かれる）は CSS だけ。ここでは申し込みの欄の状態だけを扱う。
   入力中・誤り・送信中・送信後。止めるのは、入力が足りないときと、送信中の二度押しだけ。
   正しい送信は共通の枠（crew-frame.js）まで届け、見本のダイアログを出す。ダイアログを閉じたあとに、送信後の表示を出す。 */
(function () {
  'use strict';
  var form = document.querySelector('form[data-sample-form]');
  if (!form) return;
  var state = form.querySelector('[data-form-state]');
  var btn = form.querySelector('button[type="submit"]');
  var label = btn.querySelector('span');
  var idle = label.textContent;
  var busy = false;
  var fields = form.querySelectorAll('input, select');

  function setState(kind, text) { state.className = 'form__state is-' + kind; state.textContent = text; }
  function clearState() { state.className = 'form__state'; state.textContent = ''; }

  Array.prototype.forEach.call(fields, function (el) {
    var f = el.closest('.field');
    var ev = el.tagName === 'SELECT' || el.type === 'radio' ? 'change' : 'input';
    el.addEventListener(ev, function () {
      if (!f) return;
      f.classList.add('is-typing');
      if (el.checkValidity()) { f.classList.remove('is-error'); el.removeAttribute('aria-invalid'); }
      if (state.classList.contains('is-sent') || state.classList.contains('is-error')) clearState();
    });
    el.addEventListener('blur', function () { if (f) f.classList.remove('is-typing'); });
  });

  function finish() {
    if (!busy) return;
    busy = false;
    btn.disabled = false; label.textContent = idle;
    var who = form.querySelector('input[name="who"]:checked');
    var day = form.querySelector('select[name="day"]');
    setState('sent', '入力された内容（' + (who ? who.value : '') + '・' + day.value + '）は、見本のため送信していません。どこにも保存されていません。');
    state.focus();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy) { e.stopImmediatePropagation(); return; }           /* 二度押しを止める */
    var bad = [];
    Array.prototype.forEach.call(fields, function (el) {
      var f = el.closest('.field'); var ok = el.checkValidity();
      if (f) f.classList.toggle('is-error', !ok);
      if (ok) el.removeAttribute('aria-invalid'); else { el.setAttribute('aria-invalid', 'true'); bad.push(el); }
    });
    if (bad.length) {                                              /* 入力が足りない：ここで止める */
      e.stopImmediatePropagation();
      setState('error', '入力が足りない項目が ' + bad.length + ' つあります。各欄の下の案内をご確認ください。');
      bad[0].focus();
      return;
    }
    busy = true;                                                   /* 送信中：共通の枠へそのまま届ける */
    btn.disabled = true; label.textContent = '送っています…';
    setState('busy', '申し込みの内容を確かめています。');
    var dialog = document.getElementById('ca-sample-dialog');
    if (dialog && typeof dialog.showModal === 'function') {
      dialog.addEventListener('close', function () { setTimeout(finish, 0); }, { once: true });
    } else {
      setTimeout(finish, 900);
    }
  });
})();
/* 印刷するときは、よくある問いの答えをすべて開く */
window.addEventListener('beforeprint', function () {
  document.querySelectorAll('details').forEach(function (d) { d.open = true; });
});
