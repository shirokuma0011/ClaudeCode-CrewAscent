/* ハレノマ（架空）見本  harenoma.js
   結びの線が、画面に入ったときに1回だけ描かれる（2本が1点で結ばれる）。
   JSが動かなくても線は最初から描かれている。動きを減らす設定では動かさない。 */
(function () {
  'use strict';
  var lines = document.querySelectorAll('.knot');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) { lines.forEach(function (l) { l.classList.add('is-in'); }); return; }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -10% 0px' });
  lines.forEach(function (l) { io.observe(l); });
})();
