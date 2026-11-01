/* コトワケ（架空）見本サイト — 動きと小さな道具。外部へは何も送らない */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 署名の動き（レーン整列）と、言い分け線を描く動き。画面に入ったら1回だけ */
  var targets = document.querySelectorAll('.app, .draw');
  function done(el) { el.classList.add(el.classList.contains('app') ? 'is-aligned' : 'is-drawn'); }
  if (reduce || !('IntersectionObserver' in window)) {
    targets.forEach(done);
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        io.unobserve(el);
        /* 最初の画面の台帳は、散った札を一瞬見せてから列へ並べる */
        setTimeout(function () { done(el); }, el.classList.contains('app') ? 350 : 0);
      });
    }, { threshold: 0.2 });
    targets.forEach(function (el) { io.observe(el); });
  }

  /* 下層の目次: いま読んでいる章に印を付ける */
  var railLinks = document.querySelectorAll('.rail a[href^="#"]');
  if (railLinks.length && 'IntersectionObserver' in window) {
    var map = {};
    railLinks.forEach(function (a) { var t = document.getElementById(a.getAttribute('href').slice(1)); if (t) map[t.id] = a; });
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        railLinks.forEach(function (a) { a.classList.remove('is-here'); });
        if (map[e.target.id]) map[e.target.id].classList.add('is-here');
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    Object.keys(map).forEach(function (id) { rio.observe(document.getElementById(id)); });
  }

  /* 機能: 困りごとで絞り込む（ページの中だけで処理） */
  var filter = document.getElementById('need-filter');
  if (filter) {
    var boxes = filter.querySelectorAll('input[type=checkbox]');
    var items = document.querySelectorAll('.feat[data-needs]');
    var count = document.getElementById('need-count');
    var empty = document.getElementById('need-empty');
    var reset = document.getElementById('need-reset');
    var apply = function () {
      var on = [];
      boxes.forEach(function (b) { if (b.checked) on.push(b.value); });
      var shown = 0;
      items.forEach(function (it) {
        var needs = it.getAttribute('data-needs').split(' ');
        var hit = !on.length || on.some(function (n) { return needs.indexOf(n) > -1; });
        it.hidden = !hit;
        if (hit) shown++;
      });
      count.textContent = on.length ? items.length + '件のうち ' + shown + '件を表示しています' : items.length + '件すべてを表示しています';
      empty.hidden = shown > 0;
    };
    boxes.forEach(function (b) { b.addEventListener('change', apply); });
    reset.addEventListener('click', function () { boxes.forEach(function (b) { b.checked = false; }); apply(); });
    apply();
  }

  /* 料金: 月額シミュレーター（入力時だけ数字が滑らかに変わる） */
  var sim = document.getElementById('sim');
  if (sim) {
    var users = document.getElementById('sim-users');
    var books = document.getElementById('sim-books');
    var support = document.getElementById('sim-support');
    var outPlan = document.getElementById('sim-plan');
    var outMonth = document.getElementById('sim-month');
    var outFirst = document.getElementById('sim-first');
    var outYear = document.getElementById('sim-year');
    var outMsg = document.getElementById('sim-msg');
    var current = 0, anim = null;
    var yen = function (n) { return Math.round(n).toLocaleString('ja-JP'); };
    var clamp = function (el) {
      var v = parseInt(el.value, 10); var min = +el.min, max = +el.max;
      if (isNaN(v)) v = min; v = Math.max(min, Math.min(max, v)); el.value = v; return v;
    };
    var tween = function (to) {
      if (anim) cancelAnimationFrame(anim);
      if (reduce) { current = to; outMonth.textContent = yen(to); return; }
      var from = current, t0 = null;
      var step = function (t) {
        if (!t0) t0 = t;
        var k = Math.min(1, (t - t0) / 420); k = 1 - Math.pow(1 - k, 3);
        current = from + (to - from) * k; outMonth.textContent = yen(current);
        if (k < 1) anim = requestAnimationFrame(step); else anim = null;
      };
      anim = requestAnimationFrame(step);
    };
    var calc = function (animate) {
      var u = clamp(users), b = clamp(books), s = support.checked;
      var plan, month, msg = '', warn = false;
      if (u <= 2 && b <= 1) { plan = 'スタータープラン'; month = 1100; msg = '台帳1つ・利用者2人までの範囲です。'; }
      else if (u <= 10 && b <= 5) { plan = 'スタンダードプラン'; month = 3300; msg = '台帳5つ・利用者10人まで、予約受付ページが含まれます。'; }
      else { plan = 'スタンダードプラン＋ご相談'; month = 3300; warn = true; msg = 'スタンダードプランの上限（台帳5つ・利用者10人）を超えています。表示の月額は上限までの金額です。超える分は、資料請求・お問い合わせからご相談ください（見本上の設定）。'; }
      var once = s ? 11000 : 0;
      outPlan.textContent = plan;
      outFirst.textContent = yen(month + once) + '円';
      outYear.textContent = yen(month * 12 + once) + '円';
      outMsg.textContent = msg;
      outMsg.classList.toggle('warn', warn);
      if (animate) tween(month); else { current = month; outMonth.textContent = yen(month); }
    };
    sim.querySelectorAll('[data-step]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var el = document.getElementById(btn.getAttribute('data-for'));
        el.value = (parseInt(el.value, 10) || 0) + parseInt(btn.getAttribute('data-step'), 10);
        calc(true);
      });
    });
    [users, books].forEach(function (el) { el.addEventListener('input', function () { if (el.value !== '') calc(true); }); el.addEventListener('change', function () { calc(true); }); });
    support.addEventListener('change', function () { calc(true); });
    calc(false);
  }
})();
