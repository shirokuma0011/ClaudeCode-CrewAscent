/* よいやみ醸造（架空）見本 v4
   署名の動き「刷られるラベル」: 瓶の写真やラベルの見本が画面に入ったとき、一色刷りのラベルの文字と罫が一度だけ浮かび上がる。
   JSが動かないとき・動きを減らす設定では、最初から刷られた状態で表示する。 */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) return;
  var els = document.querySelectorAll('.will-print');
  if (!els.length) return;
  document.documentElement.classList.add('js');
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { threshold: .3 });
  els.forEach(function (el) { io.observe(el); });
})();
