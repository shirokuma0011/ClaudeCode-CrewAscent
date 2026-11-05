/* ひとよ（架空）見本  hitoyo.js  v2
   1) 章の始まりの水平線が、画面に入ったときに1回だけ左から伸びる（署名の動き）。
      JSが動かなくても線は最初から引かれている。動きを減らす設定では動かさない。
   2) 空室の確認の入力欄：入力中・エラー・送信中・送信後。
      止めるのは、入力が足りないときと、送信中の二度押しだけ。
      正しく入力された送信は、共通の枠（crew-frame.js）まで届けて見本のダイアログを出す。
      ダイアログを閉じたあとに、入力欄の下へ1行だけ結果を出す（ダイアログと同時には出さない）。 */
(function () {
  'use strict';
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* 1) 水平線 */
  var lines = $$('.horizon');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) {
    lines.forEach(function (l) { l.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -10% 0px' });
    lines.forEach(function (l) { io.observe(l); });
  }

  /* 2) 入力欄 */
  var dialog = document.getElementById('ca-sample-dialog');
  $$('form[data-sample-form]').forEach(function (form) {
    var state = form.querySelector('[data-form-state]');
    var btn = form.querySelector('button[type="submit"]');
    var label = btn ? btn.querySelector('span') : null;
    var idle = label ? label.textContent : '';
    var busy = false, pass = false;
    var fields = $$('input, select, textarea', form);

    fields.forEach(function (el) {
      var f = el.closest('.field');
      var on = function () {
        if (!f) return;
        f.classList.add('is-typing');
        if (el.checkValidity()) f.classList.remove('is-error');
        if (state && state.classList.contains('is-sent')) { state.className = 'form__state'; state.textContent = ''; }
      };
      el.addEventListener('input', on);
      el.addEventListener('change', on);
      el.addEventListener('blur', function () { if (f) f.classList.remove('is-typing'); });
    });

    function done() {
      busy = false;
      if (btn) btn.disabled = false;
      if (label) label.textContent = idle;
      state.className = 'form__state is-sent';
      state.textContent = '見本のため、この内容はどこにも送っていません。入力した内容は、この画面に残っています。';
    }

    form.addEventListener('submit', function (e) {
      if (pass) { pass = false; return; }          /* 2回目は共通の枠へ届ける */
      e.preventDefault(); e.stopImmediatePropagation();
      if (busy) return;                            /* 送信中の二度押し */
      var bad = [];
      fields.forEach(function (el) {
        var f = el.closest('.field'); var ok = el.checkValidity();
        if (f) f.classList.toggle('is-error', !ok);
        if (!ok) bad.push(el);
      });
      if (bad.length) {
        state.className = 'form__state is-error';
        state.textContent = '入力が足りない項目が ' + bad.length + ' つあります。各項目の案内をご確認ください。';
        bad[0].focus();
        return;
      }
      busy = true;
      if (btn) btn.disabled = true;
      if (label) label.textContent = '送っています…';
      state.className = 'form__state is-busy';
      state.textContent = '送っています。画面を閉じずにお待ちください。';
      setTimeout(function () {
        state.className = 'form__state'; state.textContent = '';
        pass = true;
        if (btn) btn.disabled = false;
        if (typeof form.requestSubmit === 'function') form.requestSubmit(); else form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        if (btn) btn.disabled = true;
        if (dialog && dialog.open) {
          dialog.addEventListener('close', function once() { dialog.removeEventListener('close', once); done(); });
        } else { done(); }
      }, 700);
    });
  });
})();
