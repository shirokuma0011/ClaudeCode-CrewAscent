/* hair salon ミナモ（架空）— 見本サイトの動き
   動きは1つだけ：「写真の重なりが少しずれて入れ替わる」。
   1) 写真の重なりが、画面に入ったときに少しずれた位置から重なる（一度だけ）
   2) 番号を押すと、その写真が手前に入れ替わる（自動では入れ替えない）
   ほか：表紙の水面の線がスクロールでわずかに流れる、スマホの固定ボタン、終わりの時間の計算、問い合わせ欄の状態。
   動きを減らす設定では、ずれと線の流れを出さない。JS がなくても全文が読める。 */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var hd = document.querySelector('[data-hd]');
  function onScrollHd() { if (hd) hd.classList.toggle('is-scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScrollHd, { passive: true });
  onScrollHd();

  /* 1) 重なりのずれ */
  var collages = $$('[data-collage]');
  if (!reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { threshold: 0.2 });
    collages.forEach(function (c) {
      var r = c.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) return; /* 最初から見えているものは動かさない */
      c.setAttribute('data-ready', '');
      io.observe(c);
    });
  }

  /* 2) 番号で入れ替える */
  $$('.swap').forEach(function (sw) {
    var host = sw.closest('[data-collage]');
    sw.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-to]');
      if (!b || !host) return;
      var to = b.getAttribute('data-to');
      $$('button[data-to]', sw).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      $$('[data-ph]', host).forEach(function (ph) {
        var on = ph.getAttribute('data-ph') === to;
        ph.classList.remove('is-front');
        if (on) { void ph.offsetWidth; ph.classList.add('is-front'); }
      });
    });
  });

  /* 表紙の線がわずかに流れる */
  var drifts = $$('.drift');
  if (!reduce && drifts.length) {
    var host = drifts[0].closest('section') || document.body;
    var visible = true, ticking = false;
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(host);
    var apply = function () {
      ticking = false; if (!visible) return;
      var y = Math.min(window.scrollY, 900);
      drifts.forEach(function (g, i) { g.style.transform = 'translate3d(' + (-y * 0.05) + 'px,' + (y * 0.03 * (i % 2 ? 1 : 0.6)) + 'px,0)'; });
    };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(apply); } }, { passive: true });
  }

  /* スマホの固定ボタン：最初の画面とページの終わりでは隠す */
  var dock = document.querySelector('[data-dock]');
  var first = document.querySelector('main > section');
  var foot = document.querySelector('.endband') || document.querySelector('.ft');
  if (dock && first && 'IntersectionObserver' in window) {
    var st = { first: true, foot: false };
    var upd = function () { dock.classList.toggle('is-on', !st.first && !st.foot); };
    new IntersectionObserver(function (es) { st.first = es[0].isIntersecting; upd(); }, { rootMargin: '0px 0px -40% 0px' }).observe(first);
    if (foot) new IntersectionObserver(function (es) { st.foot = es[0].isIntersecting; upd(); }).observe(foot);
  } else if (dock) { dock.classList.add('is-on'); }

  /* 終わりの時間の計算（menu） */
  var planner = document.querySelector('[data-planner]');
  if (planner) {
    var ends = $$('[data-min]');
    var calc = function () {
      var s = planner.querySelector('input[name="start"]:checked');
      var add = planner.querySelector('input[name="first"]').checked ? 15 : 0;
      var p = (s ? s.value : '10:00').split(':');
      var base = (+p[0]) * 60 + (+p[1]);
      ends.forEach(function (el) {
        var t = base + (+el.getAttribute('data-min')) + add;
        var hh = Math.floor(t / 60), mm = t % 60;
        el.querySelector('b').textContent = hh + ':' + (mm < 10 ? '0' : '') + mm;
      });
      var out = document.querySelector('[data-planner-status]');
      if (out) out.textContent = (s ? s.value : '10:00') + 'に始めた場合の終わりの時間' + (add ? '（はじめての方の相談15分を含む）' : '') + 'を表示しています。';
    };
    planner.addEventListener('change', calc);
    calc();
  }

  /* 問い合わせ欄：入力中・エラー・送信中・送信後（見本のため送信しない） */
  $$('form[data-sample-form]').forEach(function (form) {
    var state = form.querySelector('[data-form-state]');
    var btn = form.querySelector('button[type="submit"]');
    $$('input, select, textarea', form).forEach(function (el) {
      var f = el.closest('.field');
      el.addEventListener('input', function () { if (f) { f.classList.add('is-typing'); if (el.checkValidity()) f.classList.remove('is-error'); } });
      el.addEventListener('blur', function () { if (f) f.classList.remove('is-typing'); });
    });
    form.addEventListener('submit', function (e) {
      var bad = [];
      $$('input, select, textarea', form).forEach(function (el) {
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
      e.preventDefault(); e.stopImmediatePropagation();
      btn.disabled = true; btn.querySelector('span').textContent = '送信しています…';
      state.className = 'form__state is-busy';
      state.textContent = '送信しています。画面を閉じずにお待ちください。';
      setTimeout(function () {
        btn.disabled = false; btn.querySelector('span').textContent = '空き時間を問い合わせる';
        state.className = 'form__state is-sent';
        state.textContent = 'この見本のため、送信はしていません。入力した内容は、どこにも保存されていません。';
        state.focus();
      }, 900);
    }, true);
  });
})();
