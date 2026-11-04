/* ふみいし特許事務所（架空）— 見本サイトの動き
   動きは1つだけ：章の順番を示す「踏み石」が、画面に入ったときに一度だけ順に灯る。
   ほか：相談の申し込み欄の状態（入力中・エラー・送信中・送信後）。
   動きを減らす設定では灯さず、はじめから灯った状態のまま。JS がなくても全文が読める。 */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* 踏み石が一度だけ灯る */
  if (!reduce && 'IntersectionObserver' in window) {
    $$('[data-stones]').forEach(function (row) {
      var stones = Array.prototype.filter.call(row.children, function (c) { return c.matches('a, li'); });
      row.setAttribute('data-ready', '');
      var io = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return;
        io.disconnect();
        stones.forEach(function (s, i) { setTimeout(function () { s.classList.add('is-lit'); }, 250 + i * 220); });
      }, { threshold: 0.4 });
      io.observe(row);
    });
  }

  /* 申し込み欄：入力が足りないときと二度押しだけ止め、正しい送信は共通の枠（見本ダイアログ）へ渡す */
  $$('form[data-sample-form]').forEach(function (form) {
    var state = form.querySelector('[data-form-state]');
    var btn = form.querySelector('button[type="submit"]');
    var label = btn ? btn.querySelector('span') : null;
    var initial = state ? state.textContent : '';
    var busy = false, pass = false;
    var ctrls = function (r) { return $$('input, select, textarea', r); };
    var valid = function (f) { return ctrls(f).every(function (x) { return x.checkValidity(); }); };
    ctrls(form).forEach(function (el) {
      var on = function () {
        var f = el.closest('.field'); if (!f) return;
        f.classList.add('is-typing');
        if (f.classList.contains('is-error') && valid(f)) f.classList.remove('is-error');
        if (state && state.classList.contains('is-sent')) { state.className = 'form__state'; state.textContent = initial; }
      };
      el.addEventListener('input', on); el.addEventListener('change', on);
      el.addEventListener('blur', function () { var f = el.closest('.field'); if (f) f.classList.remove('is-typing'); });
    });
    form.addEventListener('submit', function (e) {
      if (pass) { pass = false; return; }              /* 共通の枠（crew-frame.js）へそのまま渡す */
      e.preventDefault(); e.stopImmediatePropagation();
      if (busy) return;                                 /* 二度押しは止める */
      var bad = $$('.field', form).filter(function (f) { var ok = valid(f); f.classList.toggle('is-error', !ok); return !ok; });
      if (bad.length) {
        state.className = 'form__state is-error';
        state.textContent = '入力が足りない項目が ' + bad.length + ' つあります。赤い文字の案内をご確認ください。';
        var first = ctrls(bad[0])[0]; if (first) first.focus();
        return;
      }
      busy = true; btn.disabled = true; if (label) label.textContent = '送信しています…';
      state.className = 'form__state is-busy';
      state.textContent = '送信しています。画面を閉じずにお待ちください。';
      setTimeout(function () {
        pass = true;
        if (form.requestSubmit) form.requestSubmit(); else form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        pass = false;
        var dlg = document.getElementById('ca-sample-dialog');
        var done = function () {
          busy = false; btn.disabled = false; if (label) label.textContent = '申し込みを送る';
          state.className = 'form__state is-sent';
          state.textContent = 'この見本では、申し込みは送信していません。入力した内容は、この画面の中だけに残っています。';
        };
        if (dlg && dlg.open) dlg.addEventListener('close', done, { once: true }); else done();
      }, 700);
    }, true);
  });
})();
