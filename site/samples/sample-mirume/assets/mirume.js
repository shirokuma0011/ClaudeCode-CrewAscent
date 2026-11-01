/* ミルメ（架空）見本  mirume.js
   署名の動き: 写真が画面に入ると、四隅の「検出の角括弧」が外側から寄ってきて、対象を1回だけ捉える。
   JSが動かなくても角括弧は表示されたまま読める。動きを減らす設定では動かさない。 */
(function () {
  'use strict';
  var figs = document.querySelectorAll('figure');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) { figs.forEach(function (f) { f.classList.add('is-seen'); }); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-seen'); io.unobserve(e.target); } });
  }, { threshold: 0.35 });
  figs.forEach(function (f) { io.observe(f); });
})();
