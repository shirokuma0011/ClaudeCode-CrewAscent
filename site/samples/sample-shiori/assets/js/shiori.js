/* しおり会計事務所（架空）見本 v5
   1) 状況の選択：3つの状況（開業前後・個人事業主・法人）から選ぶと、
      そのページの要点・持ち物・料金の行・よくある質問の印が入れ替わる。選んだ状況はページをまたいで引き継ぐ
   2) 読んでいる章を示す栞（右端）
   3) 予約の申し込み：入力中・エラー・送信中・送信後。正しく入力された送信は共通の枠のダイアログへ渡す
   JavaScript が動かないときは、すべての状況の内容がそのまま読める */
(function () {
  'use strict';
  var doc = document.documentElement;
  doc.classList.add('js');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var NAME = { start: '開業前後', indiv: '個人事業主', corp: '法人' };

  /* ---- 1) 状況の選択 ---- */
  var store = {
    get: function () { try { return sessionStorage.getItem('shiori-sit'); } catch (e) { return null; } },
    set: function (v) { try { sessionStorage.setItem('shiori-sit', v); } catch (e) { /* 保存できなくても動く */ } }
  };
  var fromUrl = null;
  try { fromUrl = new URLSearchParams(location.search).get('s'); } catch (e) { fromUrl = null; }
  var current = NAME[fromUrl] ? fromUrl : (NAME[store.get()] ? store.get() : 'start');
  var touchedForm = false;

  function rise(el, i) {
    if (reduce) return;
    el.classList.remove('in'); el.style.setProperty('--i', i); void el.offsetWidth; el.classList.add('in');
  }
  function apply(sit, animate) {
    current = sit;
    $$('[data-sit]').forEach(function (a) {
      if (a.getAttribute('data-sit') === sit) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
    $$('[data-sit-panel]').forEach(function (p) {
      var on = p.getAttribute('data-sit-panel') === sit;
      p.hidden = !on;
      if (on && animate) $$('li', p).forEach(function (li, i) { rise(li, i); });
    });
    $$('[data-sit-list]').forEach(function (list) {
      var i = 0;
      Array.prototype.forEach.call(list.children, function (li) {
        var want = li.getAttribute('data-s');
        var on = !want || want.split(' ').indexOf(sit) > -1;
        li.hidden = !on;
        if (on && animate && want) rise(li, i++);
      });
    });
    $$('[data-row-sit]').forEach(function (tr, i, all) {
      var list = tr.getAttribute('data-row-sit').split(' ');
      tr.classList.toggle('is-now', tr.classList.contains('fee__first') && list.length < 3 && list.indexOf(sit) > -1);
    });
    $$('[data-faq]').forEach(function (g) { g.classList.toggle('is-now', g.getAttribute('data-faq') === sit); });
    $$('[data-sit-label]').forEach(function (el) { el.textContent = 'いまの状況：' + NAME[sit]; });
    if (!touchedForm) {
      var r = document.querySelector('form [name="sit"][value="' + sit + '"]');
      if (r) r.checked = true;
    }
    store.set(sit);
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-sit]');
    if (!a) return;
    e.preventDefault();
    apply(a.getAttribute('data-sit'), true);
    /* 狭い画面では、入れ替わった内容が見えるところまで寄せる */
    var panel = document.querySelector('[data-sit-panel="' + current + '"]');
    if (panel && window.innerWidth < 1100) {
      var rc = panel.getBoundingClientRect();
      if (rc.top > window.innerHeight - 120) panel.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
    }
  });
  apply(current, false);

  /* ---- 2) 読んでいる章を示す栞 ---- */
  var chaps = $$('[data-chap]');
  var links = $$('.shiori a');
  var sp = document.querySelector('.shiori-sp i');
  function mark(idx) {
    links.forEach(function (a, i) { if (i === idx) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    if (sp && chaps.length) { sp.style.setProperty('--t', (idx / chaps.length * 100) + '%'); sp.style.setProperty('--h', (100 / chaps.length) + '%'); }
  }
  if (chaps.length) {
    mark(0);
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) mark(chaps.indexOf(en.target)); });
      }, { rootMargin: '-45% 0px -50% 0px' });
      chaps.forEach(function (c) { io.observe(c); });
    }
  }

  /* ---- 印刷 ---- */
  $$('[data-print]').forEach(function (b) { b.addEventListener('click', function () { window.print(); }); });

  /* ---- 3) 予約の申し込み ---- */
  $$('form.form[data-sample-form]').forEach(function (form) {
    var state = form.querySelector('[data-form-state]');
    var btn = form.querySelector('button[type="submit"]');
    var label = btn.querySelector('span');
    var idle = label.textContent;
    var busy = false;
    var dialog = document.getElementById('ca-sample-dialog');
    var fieldOf = function (el) { return el.closest('.field'); };
    var check = function (f) {
      var ok = $$('input, select, textarea', f).every(function (el) {
        if (el.type === 'radio') return !el.required || !!f.querySelector('input[name="' + el.name + '"]:checked');
        return el.checkValidity();
      });
      f.classList.toggle('is-error', !ok);
      return ok;
    };
    $$('input, select, textarea', form).forEach(function (el) {
      var f = fieldOf(el);
      var onInput = function () {
        touchedForm = true;
        if (!f) return;
        if (el.type !== 'radio') f.classList.add('is-typing');
        if (f.classList.contains('is-error')) check(f);
        if (state.classList.contains('is-sent')) { state.className = 'form__state'; state.textContent = ''; }
      };
      el.addEventListener('input', onInput);
      el.addEventListener('change', onInput);
      el.addEventListener('blur', function () { if (f) f.classList.remove('is-typing'); });
    });
    form.addEventListener('submit', function (e) {
      if (busy) { e.preventDefault(); e.stopImmediatePropagation(); return; }   /* 二度押しを止める */
      var bad = $$('.field', form).filter(function (f) { return !check(f); });
      if (bad.length) {
        e.preventDefault(); e.stopImmediatePropagation();
        state.className = 'form__state is-error';
        state.textContent = '入力が足りない項目が ' + bad.length + ' つあります。赤い文字の案内をご確認ください。';
        var first = bad[0].querySelector('input, select, textarea');
        if (first) first.focus();
        return;
      }
      /* 正しく入力された送信は、そのまま共通の枠（crew-frame.js）へ届けて見本のダイアログを出す */
      busy = true;
      btn.disabled = true; label.textContent = '送信しています…';
      state.className = 'form__state is-busy';
      state.textContent = '送信しています。画面を閉じずにお待ちください。';
      var done = function () {
        busy = false; btn.disabled = false; label.textContent = idle;
        state.className = 'form__state is-sent';
        state.textContent = 'この見本では、送信はしていません。入力した内容は、この画面の中にだけ残っています。';
        state.focus();
      };
      if (dialog && typeof dialog.showModal === 'function') {
        dialog.addEventListener('close', function once() { dialog.removeEventListener('close', once); setTimeout(done, 300); });
      } else {
        e.preventDefault();
        setTimeout(done, 900);
      }
    });
  });
})();
