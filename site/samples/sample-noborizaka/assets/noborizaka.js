/* のぼりざか（架空）見本  noborizaka.js
   署名の動き: 「3か月の進め方」が画面に入ると、15度の上昇線が左下から右上へ1回だけ引かれる。
   JSが動かなくても線は描かれた状態で読める。動きを減らす設定では動かさない。 */
(function () {
  'use strict';
  var sec = document.querySelector('.steps');
  if (!sec) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) { sec.classList.add('is-in'); return; }
  var io = new IntersectionObserver(function (e) {
    if (e[0].isIntersecting) { sec.classList.add('is-in'); io.disconnect(); }
  }, { rootMargin: '0px 0px -35% 0px' });
  io.observe(sec);
})();
