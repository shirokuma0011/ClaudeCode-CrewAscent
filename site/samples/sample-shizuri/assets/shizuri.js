/* サロン しずり（見本）: 章が画面に入ったら、リネンのしわと要素をゆっくり現す（動きを減らす設定では最初から表示） */
(function () {
  var els = document.querySelectorAll('.linen, .rv');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('is-in'); }); return; }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -12% 0px' });
  els.forEach(function (e) { io.observe(e); });
})();
