/* とおみ事務所（架空）見本  toomi.js
   左の目次で、いま読んでいる章を示す（現在地の表示）。動きはない。
   JSが動かなくても、目次と本文はそのまま読める。 */
(function () {
  'use strict';
  if (!('IntersectionObserver' in window)) return;
  var links = {};
  document.querySelectorAll('.toc a[href^="#"]').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      Object.keys(links).forEach(function (k) { links[k].removeAttribute('aria-current'); });
      var a = links[e.target.id]; if (a) a.setAttribute('aria-current', 'true');
    });
  }, { rootMargin: '-35% 0px -60% 0px' });
  Object.keys(links).forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
})();
