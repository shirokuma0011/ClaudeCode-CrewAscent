/* 木組みの家 たてまえ工務店（架空）— 見本サイトの動き
   署名の動き「上棟」: 家づくりの流れを読み進めると、段階に合わせて家の骨組みが組み上がる（process.html）
   補助の動き: 墨付けの線が左から引かれる ／ 費用が決まる地点の印が一度だけ脈打つ
   （トップの骨組みが読み込み時に組み上がるのは CSS だけで一度だけ）
   動きを減らす設定・JSなし: 骨組みは完成形、線も描画済みで静止。 */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  /* 墨付けの線・脈打つ印: 画面に入ったら一度だけ */
  var once = document.querySelectorAll('.sumi[data-draw], .pulse');
  if (reduce || !hasIO) {
    once.forEach(function (el) { el.classList.add('is-drawn'); });
  } else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-drawn'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px' });
    once.forEach(function (el) { io.observe(el); });
  }

  /* 上棟: 段階に合わせて組み上がる */
  var fig = document.querySelector('.frame[data-build="stage"]');
  var steps = Array.prototype.slice.call(document.querySelectorAll('.step[data-stage]'));
  if (!fig || !steps.length) return;
  var parts = Array.prototype.slice.call(fig.querySelectorAll('[data-s]'));
  var now = document.querySelector('[data-now-out]');
  var current = 0;
  function setStage(n) {
    if (n === current) return;
    current = n;
    parts.forEach(function (p) { p.classList.toggle('on', Number(p.getAttribute('data-s')) <= n); });
    var st = steps[n - 1];
    if (now && st) now.innerHTML = '<b>' + st.getAttribute('data-now').replace(/ — /, '</b> — ');
  }
  if (reduce || !hasIO) { setStage(10); return; }
  setStage(1);
  var seen = new Map();
  var sio = new IntersectionObserver(function (es) {
    es.forEach(function (e) { seen.set(e.target, e.isIntersecting); });
    var last = 1;
    steps.forEach(function (s, i) { if (seen.get(s) || s.getBoundingClientRect().top < window.innerHeight * 0.5) last = Math.max(last, i + 1); });
    setStage(last);
  }, { rootMargin: '-45% 0px -45% 0px' });
  steps.forEach(function (s) { sio.observe(s); });
})();
