/* 野あそび保育 ねっこ（見本・架空）
   1) 見学の申し込み欄：入力中・エラー・送信中・送信後の状態
      入力が足りないときと、送信中の二度押しだけを止める。正しい送信は共通の枠（crew-frame.js）まで届け、見本のダイアログを出す。
      ダイアログを閉じたあとに、欄の下へ一度だけ結果を書く（ダイアログと同時には出さない）。
   2) 揺れる小枝は CSS だけ。画面の外では止める。 */
(function () {
  'use strict';
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  $$('form[data-sample-form]').forEach(function (form) {
    var state = form.querySelector('[data-form-state]');
    var btn = form.querySelector('button[type="submit"]');
    var label = btn && btn.querySelector('span');
    var idle = label ? label.textContent : '';
    var busy = false;
    var dialog = document.getElementById('ca-sample-dialog');

    $$('input, select, textarea', form).forEach(function (el) {
      var f = el.closest('.field');
      var on = function () {
        if (!f) return;
        f.classList.add('is-typing');
        if (el.checkValidity()) f.classList.remove('is-error');
      };
      el.addEventListener('input', on);
      el.addEventListener('change', on);
      el.addEventListener('blur', function () { if (f) f.classList.remove('is-typing'); });
    });

    form.addEventListener('submit', function (e) {
      if (busy) { e.preventDefault(); e.stopImmediatePropagation(); return; }
      var bad = [];
      $$('input, select, textarea', form).forEach(function (el) {
        var f = el.closest('.field'); var ok = el.checkValidity();
        if (f) f.classList.toggle('is-error', !ok);
        if (!ok) bad.push(el);
      });
      if (bad.length) {
        e.preventDefault(); e.stopImmediatePropagation();
        state.className = 'form__state is-error';
        state.textContent = '入力が足りない項目が ' + bad.length + ' つあります。各欄の下の案内をご確認ください。';
        bad[0].focus();
        return;
      }
      /* 正しい送信：送信中の状態にして、共通の枠へそのまま届ける（ここでは止めない） */
      busy = true;
      if (btn) btn.disabled = true;
      if (label) label.textContent = '送っています…';
      state.className = 'form__state is-busy';
      state.textContent = '送信しています。';
      var done = function () {
        busy = false;
        if (btn) btn.disabled = false;
        if (label) label.textContent = idle;
        state.className = 'form__state is-sent';
        state.textContent = '見本のため、送信はしていません。実際には、見学の日の候補をメールでお送りします。';
      };
      if (dialog && typeof dialog.showModal === 'function') {
        dialog.addEventListener('close', function once() { dialog.removeEventListener('close', once); setTimeout(done, 0); });
      } else {
        setTimeout(done, 600);
      }
    });
  });

  /* 時刻の帯の根の線：帯の下端から、絵の地面（絵の下端の少し上）まで下ろす */
  var day = document.querySelector('.fv__day'), art = document.querySelector('.fv__art');
  if (day && art) {
    var fit = function () {
      var h = art.getBoundingClientRect().bottom - day.getBoundingClientRect().bottom - 18;
      day.style.setProperty('--root-h', (h > 40 ? Math.round(h) : 0) + 'px');
    };
    fit();
    window.addEventListener('resize', fit);
    window.addEventListener('load', fit);
  }

  /* 揺れる小枝：画面の外では止める */
  var sprigs = $$('.sprig');
  if ('IntersectionObserver' in window && sprigs.length) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { en.target.style.animationPlayState = en.isIntersecting ? 'running' : 'paused'; });
    });
    sprigs.forEach(function (s) { io.observe(s); });
  }
})();
