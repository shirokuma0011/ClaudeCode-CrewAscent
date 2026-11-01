/* てびき舎（架空）見本  tebikisha.js
   署名の動き: 章が画面に入ると、左の「手引きの点線」が上から下へ1回だけ伸びる。
   JSが動かなくても、点線はすべて描かれた状態で読める。動きを減らす設定では動かさない。 */
(function () {
  'use strict';
  var secs = document.querySelectorAll('.route');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) {
    secs.forEach(function (s) { s.classList.add('is-in'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -30% 0px' });
  secs.forEach(function (s) { io.observe(s); });
})();
