/* ノキシタ設計室（架空）見本  nokishita.js  v1
   署名の動き「軒の影」: 画像が画面に入ると、上辺の斜めの影が軒の方向からゆっくり落ちてくる（1回）。
   JSが動かなくても、すべての文章と画像は見える。動きを減らす設定では、影は最初から置いておく。 */
(function () {
  'use strict';
  var els = document.querySelectorAll('.eave');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) { els.forEach(function (el) { el.classList.add('is-in'); }); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { threshold: .25 });
  els.forEach(function (el) { io.observe(el); });
})();
