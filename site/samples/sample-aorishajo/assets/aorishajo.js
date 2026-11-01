/* アオリ写場（架空）見本  aorishajo.js  v1
   1) 最初の画面で、三分割の線を1回だけ引く（ファインダーをのぞいた合図）
   2) 章の要素が、画面に入ったときに1回だけ静かに出る
   JSが動かなくても、すべての文章は読める。動きを減らす設定では動かさない。 */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var grid = document.querySelector('.hero__grid');
  if (grid) requestAnimationFrame(function () { requestAnimationFrame(function () { grid.classList.add('is-drawn'); }); });
  if (reduce || !('IntersectionObserver' in window)) return;
  var els = document.querySelectorAll('.plan, .range__col, .kit__lists > div, .line li, .extra');
  document.documentElement.classList.add('can-fade');
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px' });
  els.forEach(function (el, i) { el.classList.add('fade'); el.style.transitionDelay = (i % 4) * 90 + 'ms'; io.observe(el); });
})();
