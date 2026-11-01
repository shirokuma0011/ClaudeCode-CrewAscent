/* 木組みの家 たてまえ工務店（架空）— 見本サイトの動き v4
   署名の動き「上棟」: 家づくりの流れのページで、段取りの一覧を読み進めると、
   右の線画の家が段階に合わせて組み上がる。
   動きを減らす設定・JSなし: 線画は完成形で静止。 */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;
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
    steps.forEach(function (s, i) { s.classList.toggle('is-now', i === n - 1); });
    var st = steps[n - 1];
    if (now && st) now.innerHTML = '<b>' + st.getAttribute('data-now').replace(/ — /, '</b> — ');
  }
  if (reduce || !hasIO) { setStage(10); steps[9] && steps[9].classList.remove('is-now'); return; }
  setStage(1);
  var tick = false;
  function update() {
    tick = false;
    var line = window.innerHeight * 0.55, last = 1;
    steps.forEach(function (s, i) { if (s.getBoundingClientRect().top < line) last = i + 1; });
    setStage(last);
  }
  var visible = false;
  new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) update(); }).observe(steps[0].parentNode);
  window.addEventListener('scroll', function () { if (visible && !tick) { tick = true; requestAnimationFrame(update); } }, { passive: true });
})();
