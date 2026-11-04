/* こつぶ動物病院（架空）見本  kotsubu.js  v2
   1) 時間表に「今日」の列の印と、いまの受付状況（端末の時刻。祝日は判定しない）
   2) スマホの固定の窓口：最初の画面のボタンが見えている間は隠す
   3) 予約の相談：入力中・エラー・送信中・送信後。正しい入力は共通の枠（crew-frame.js）へ渡し、見本ダイアログを出す
   JavaScript がなくても、すべての文章と時間表は読める。 */
(function () {
  'use strict';
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* 1) 今日の受付 */
  var now = new Date(), d = now.getDay(), m = now.getHours() * 60 + now.getMinutes();
  var names = ['日', '月', '火', '水', '木', '金', '土'];
  var pmOff = (d === 0 || d === 3);
  var AM0 = 540, AM1 = 720, PM0 = 960, PM1 = 1140, msg, open = false;
  if (m >= AM0 && m < AM1) { open = true; msg = 'いま午前の診療中（12:00まで）'; }
  else if (!pmOff && m >= PM0 && m < PM1) { open = true; msg = 'いま午後の診療中（19:00まで）'; }
  else if (m < AM0) { msg = '9:00 から'; }
  else if (m < PM0 && !pmOff) { msg = '午後は 16:00 から'; }
  else { msg = '診療は終わりました'; }
  $$('[data-today]').forEach(function (el) {
    el.textContent = '今日（' + names[d] + '）' + msg;
    el.classList.add(open ? 'is-open' : 'is-closed');
  });
  $$('[data-hours] [data-d="' + d + '"]').forEach(function (c) { c.classList.add('is-today'); });

  /* 2) 固定の窓口：最初の画面（受付の台・下層の最初の画面）が見えている間は出さない */
  var dock = document.querySelector('.dock'), fv = document.querySelector('[data-fv]');
  if (dock) {
    if (fv && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { dock.classList.toggle('is-on', !e.isIntersecting); });
      }).observe(fv);
    } else { dock.classList.add('is-on'); }
  }

  /* 2b) 来院の四段：トップでは、いま読んでいる章の段に印をつける */
  var steps = $$('.steps:not(.steps--sub) li');
  if (steps.length) {
    var mark = function (i) { steps.forEach(function (li, k) { li.classList.toggle('is-here', k === i); }); };
    mark(0);
    var secs = ['when', 'before', 'day'].map(function (id) { return document.getElementById(id); });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) mark(secs.indexOf(e.target)); });
      }, { rootMargin: '-45% 0px -50% 0px' });
      secs.forEach(function (el) { if (el) io.observe(el); });
    }
  }

  /* 3) 予約の相談 */
  $$('form[data-sample-form]').forEach(function (form) {
    var state = form.querySelector('[data-form-state]');
    var btn = form.querySelector('button[type="submit"]');
    var label = btn.querySelector('span');
    var idle = label.textContent, busy = false;
    var fieldOf = function (el) { return el.closest('.field'); };
    $$('input, select, textarea', form).forEach(function (el) {
      el.addEventListener('input', function () {
        var f = fieldOf(el); if (!f) return;
        f.classList.add('is-typing');
        if (el.checkValidity()) f.classList.remove('is-error');
        if (state.classList.contains('is-sent')) { state.className = 'form__state'; state.textContent = '必須の4つを入れると送れます。'; }
      });
      el.addEventListener('change', function () { var f = fieldOf(el); if (f && el.checkValidity()) f.classList.remove('is-error'); });
      el.addEventListener('blur', function () { var f = fieldOf(el); if (f) f.classList.remove('is-typing'); });
    });
    form.addEventListener('submit', function (e) {
      if (busy) { e.preventDefault(); e.stopImmediatePropagation(); return; }   /* 二度押しを止める */
      var bad = [];
      $$('input, select, textarea', form).forEach(function (el) {
        var f = fieldOf(el); if (!f) return;
        var ok = el.checkValidity();
        if (el.type === 'radio') ok = !!form.querySelector('input[name="' + el.name + '"]:checked');
        if (!ok && bad.indexOf(f) < 0) bad.push(f);
        f.classList.toggle('is-error', !ok && true);
      });
      $$('.field', form).forEach(function (f) { if (bad.indexOf(f) < 0) f.classList.remove('is-error'); });
      if (bad.length) {
        e.preventDefault(); e.stopImmediatePropagation();
        state.className = 'form__state is-error';
        state.textContent = '入力が足りない項目が ' + bad.length + ' つあります。赤い文字の案内をご確認ください。';
        var first = bad[0].querySelector('input, select, textarea'); if (first) first.focus();
        return;
      }
      /* 正しい入力：送信中にして、共通の枠へそのまま渡す（見本ダイアログが開く） */
      busy = true; btn.disabled = true; label.textContent = '送信しています…';
      state.className = 'form__state is-busy'; state.textContent = '送信しています。';
      var dlg = document.getElementById('ca-sample-dialog');
      var done = function () {
        busy = false; btn.disabled = false; label.textContent = idle;
        state.className = 'form__state is-sent';
        state.textContent = '送信後の表示です。この見本では、入力した内容はどこにも送っていません。';
      };
      if (dlg && typeof dlg.showModal === 'function') dlg.addEventListener('close', done, { once: true });
      else setTimeout(done, 600);
    }, true);
  });
})();
