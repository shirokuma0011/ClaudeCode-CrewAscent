/* はがため歯科（見本・架空）
   動きは開閉と現在地の表示だけ。ここでは次の2つだけを行う。
   1) 予約の入力欄：入力中・エラー・送信中・送信後。止めるのは入力が足りないときと二度押しだけで、
      正しく入力された送信は共通の枠（crew-frame.js）へそのまま渡し、見本のダイアログを出す。
   2) 印刷するときは、よくある質問をすべて開く。JS がなくても全文が読める。 */
(function () {
  'use strict';
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  $$('form[data-sample-form]').forEach(function (form) {
    var state = form.querySelector('[data-form-state]');
    var btn = form.querySelector('button[type="submit"]');
    var label = btn.querySelector('span');
    var idle = label.textContent;
    var busy = false;
    var slots = form.querySelector('[data-slots]');
    var dialog = document.getElementById('ca-sample-dialog');

    function checkSlots() {
      var ok = $$('input[name="slot"]:checked', form).length > 0;
      slots.classList.toggle('is-error', !ok);
      return ok;
    }
    $$('input, select, textarea', form).forEach(function (el) {
      var f = el.closest('.field');
      var on = function () {
        if (!f) return;
        if (el.type !== 'radio' && el.type !== 'checkbox') f.classList.add('is-typing');
        if (el.name === 'slot') { if ($$('input[name="slot"]:checked', form).length) f.classList.remove('is-error'); }
        else if (el.checkValidity()) f.classList.remove('is-error');
        if (state.classList.contains('is-sent')) { state.className = 'form__state'; state.textContent = '内容を書き直しています。送るまで、どこにも届きません。'; }
      };
      el.addEventListener('input', on);
      el.addEventListener('change', on);
      el.addEventListener('blur', function () { if (f) f.classList.remove('is-typing'); });
    });

    form.addEventListener('submit', function (e) {
      if (busy) { e.preventDefault(); e.stopImmediatePropagation(); return; }   /* 二度押しを止める */
      var bad = [];
      $$('input[required], select[required], textarea[required]', form).forEach(function (el) {
        var f = el.closest('.field'); var ok = el.checkValidity();
        if (el.type === 'radio') ok = !!form.querySelector('input[name="' + el.name + '"]:checked');
        if (f) f.classList.toggle('is-error', !ok);
        if (!ok && bad.indexOf(el) < 0) bad.push(el);
      });
      if (!checkSlots()) bad.push(form.querySelector('input[name="slot"]'));
      if (bad.length) {                                                          /* 入力が足りない */
        e.preventDefault(); e.stopImmediatePropagation();
        state.className = 'form__state is-error';
        state.textContent = '入力が足りない欄が ' + bad.length + ' か所あります。赤い文字の案内をご確認ください。';
        bad[0].focus();
        return;
      }
      /* 正しく入力された送信：送信中の表示にして、共通の枠へ渡す（ここでは止めない） */
      busy = true;
      btn.disabled = true; label.textContent = '送っています…';
      state.className = 'form__state is-busy';
      state.textContent = '送っています。画面を閉じずにお待ちください。';
      var done = function () {
        busy = false; btn.disabled = false; label.textContent = idle;
        state.className = 'form__state is-sent';
        state.textContent = 'この見本では、予約の希望は医院へ送られていません。入力した内容は、この画面の中だけに残っています。';
        state.focus();
      };
      if (dialog && typeof dialog.showModal === 'function') dialog.addEventListener('close', done, { once: true });
      else setTimeout(done, 900);
    });
  });

  window.addEventListener('beforeprint', function () { $$('.faq details').forEach(function (d) { d.open = true; }); });
})();
