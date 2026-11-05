/* つぶさ設備（架空）見本  tsubusa.js  v2
   ・左の目次：いま読んでいる章を太字にし、読み終えた章の四角にレ点をつける（動きはこれだけ）
   ・狭い画面では目次を閉じておく（開けば読める）。印刷では開く
   ・見積もりの依頼：入力中・エラー・送信中・送信後。止めるのは入力が足りないときと、送信中の二度押しだけ。
     正しく入力された送信は、共通の枠（crew-frame.js）まで届けて見本のダイアログを出し、閉じたあとに送信していないことを示す。
   JSがなくても、目次はページ内リンクとして使え、全文が読める。 */
(function () {
  'use strict';
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* 目次 */
  var box = document.querySelector('.toc__box');
  var narrow = window.matchMedia && window.matchMedia('(max-width: 1023px)');
  if (box && narrow && narrow.matches) box.removeAttribute('open');
  window.addEventListener('beforeprint', function () { if (box) box.setAttribute('open', ''); });
  $$('.toc ol a').forEach(function (a) { a.addEventListener('click', function () { if (box && narrow && narrow.matches) box.removeAttribute('open'); }); });

  var links = $$('.toc ol a');
  var secs = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
  function update() {
    var y = window.innerHeight * 0.35, cur = 0;
    secs.forEach(function (s, i) { if (s && s.getBoundingClientRect().top <= y) cur = i; });
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) cur = secs.length - 1;
    links.forEach(function (a, i) {
      a.classList.toggle('is-done', i < cur);
      if (i === cur) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  }
  var ticking = false;
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; update(); }); } }, { passive: true });
  window.addEventListener('resize', update);
  update();

  /* 見積もりの依頼 */
  var dialog = document.getElementById('ca-sample-dialog');
  $$('form[data-sample-form]').forEach(function (form) {
    var state = form.querySelector('[data-form-state]');
    var btn = form.querySelector('button[type="submit"]');
    var label = btn.querySelector('span');
    var idle = label.textContent, first = state.textContent, busy = false;
    var fields = $$('input, select, textarea', form);

    fields.forEach(function (el) {
      var f = el.closest('.field');
      el.addEventListener('focus', function () { if (f) f.classList.add('is-typing'); });
      el.addEventListener('blur', function () { if (f) f.classList.remove('is-typing'); });
      var clear = function () {
        if (f && el.checkValidity()) { f.classList.remove('is-error'); el.removeAttribute('aria-invalid'); }
        if (state.classList.contains('is-sent') || state.classList.contains('is-error')) {
          if (!form.querySelector('.field.is-error')) { state.className = 'form__state'; state.textContent = first; }
        }
      };
      el.addEventListener('input', clear);
      el.addEventListener('change', clear);
    });

    form.addEventListener('submit', function (e) {
      if (busy) { e.preventDefault(); e.stopImmediatePropagation(); return; }   /* 二度押しを止める */
      var bad = [];
      fields.forEach(function (el) {
        var f = el.closest('.field'); var ok = el.checkValidity();
        if (f) f.classList.toggle('is-error', !ok);
        if (ok) el.removeAttribute('aria-invalid'); else el.setAttribute('aria-invalid', 'true');
        if (!ok) bad.push(el);
      });
      if (bad.length) {
        e.preventDefault(); e.stopImmediatePropagation();
        state.className = 'form__state is-error';
        state.textContent = '入力が足りない項目が ' + bad.length + ' つあります。項目の下の案内をご確認ください。';
        bad[0].focus();
        return;
      }
      /* 正しい入力：送信中にして、そのまま共通の枠へ届ける（見本のダイアログが開く） */
      busy = true;
      btn.disabled = true;
      label.textContent = '送信しています…';
      state.className = 'form__state is-busy';
      state.textContent = '送信しています。';
      if (!dialog || typeof dialog.showModal !== 'function') { e.preventDefault(); setTimeout(done, 600); }
    }, true);

    function done() {
      if (!busy) return;
      busy = false;
      btn.disabled = false;
      label.textContent = idle;
      state.className = 'form__state is-sent';
      state.textContent = '見本のため、送信していません。入力した内容は、この画面の中にだけ残っています。';
    }
    if (dialog) dialog.addEventListener('close', function () { if (!busy) return; done(); setTimeout(function () { state.focus(); }, 0); });
  });
})();
