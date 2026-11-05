/* いえまち訪問看護（架空）見本  iemachi.js  v2
   ・左の目次で、いま読んでいる章に印をつける（aria-current）。動きはない
   ・印刷するときは、よくある質問をすべて開く
   ・相談フォーム：入力中・エラー・送信中・送信後。止めるのは入力が足りないときと、送信中の二度押しだけ。
     正しく入力された送信は、共通の枠（crew-frame.js）まで届けて見本のダイアログを出す。
   JSが動かなくても、目次はページ内リンク、質問は開閉で読める。 */
(function () {
  'use strict';
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* 目次の印 */
  if ('IntersectionObserver' in window) {
    var links = {};
    $$('.index ol a').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var current = null;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var a = links[e.target.id];
        if (!a || a === current) return;
        if (current) current.removeAttribute('aria-current');
        a.setAttribute('aria-current', 'true');
        current = a;
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    Object.keys(links).forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* スマホでは言葉の言い換えを閉じておく（開けば読める） */
  if (window.matchMedia && window.matchMedia('(max-width: 640px)').matches) {
    $$('details[data-words]').forEach(function (d) { d.removeAttribute('open'); });
  }

  /* 印刷のときは質問を開く */
  window.addEventListener('beforeprint', function () { $$('.faq details, details[data-words]').forEach(function (d) { d.setAttribute('open', ''); }); });

  /* 相談フォーム */
  var dialog = document.getElementById('ca-sample-dialog');
  $$('form[data-sample-form]').forEach(function (form) {
    var state = form.querySelector('[data-form-state]');
    var btn = form.querySelector('button[type="submit"]');
    var label = btn.querySelector('span');
    var idle = label.textContent;
    var first = state.textContent;
    var busy = false;
    var fields = $$('input, select, textarea', form);

    fields.forEach(function (el) {
      var f = el.closest('.field');
      el.addEventListener('focus', function () { if (f) f.classList.add('is-typing'); });
      el.addEventListener('input', function () {
        if (!f) return;
        f.classList.add('is-typing');
        if (el.checkValidity()) f.classList.remove('is-error');
        if (state.classList.contains('is-sent')) { state.className = 'form__state'; state.textContent = first; }
      });
      el.addEventListener('change', function () { if (f && el.checkValidity()) f.classList.remove('is-error'); });
      el.addEventListener('blur', function () { if (f) f.classList.remove('is-typing'); });
    });

    form.addEventListener('submit', function (e) {
      if (busy) { e.preventDefault(); e.stopImmediatePropagation(); return; }   /* 二度押しを止める */
      var bad = [];
      fields.forEach(function (el) {
        var f = el.closest('.field'); var ok = el.checkValidity();
        if (f) f.classList.toggle('is-error', !ok);
        if (!ok) bad.push(el);
      });
      if (bad.length) {
        e.preventDefault(); e.stopImmediatePropagation();
        state.className = 'form__state is-error';
        state.textContent = '入力が足りない項目が ' + bad.length + ' つあります。赤い文字の案内をご確認ください。';
        bad[0].focus();
        return;
      }
      /* 正しい入力：送信中にして、そのまま共通の枠へ届ける（ダイアログが開く） */
      busy = true;
      btn.disabled = true;
      label.textContent = '送信しています…';
      state.className = 'form__state is-busy';
      state.textContent = '送信しています。';
      if (!dialog || typeof dialog.showModal !== 'function') done();
    }, true);

    function done() {
      if (!busy) return;
      busy = false;
      btn.disabled = false;
      label.textContent = idle;
      state.className = 'form__state is-sent';
      state.textContent = '送信はしていません。入力した内容はこの画面にだけ残っています。お急ぎのときはお電話ください。';
    }
    if (dialog) dialog.addEventListener('close', function () { done(); setTimeout(function () { if (state.classList.contains('is-sent')) state.focus(); }, 0); });
  });
})();
