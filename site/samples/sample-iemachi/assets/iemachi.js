/* いえまち訪問看護（架空）見本  iemachi.js  v1
   左の目次で、いま読んでいる章に印をつける（aria-current）。
   JSが動かなくても、目次はふつうのページ内リンクとして使える。動きはない。 */
(function () {
  'use strict';
  if (!('IntersectionObserver' in window)) return;
  var links = {};
  document.querySelectorAll('.index a').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
  var current = null;
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      var a = links[e.target.id];
      if (!a || a === current) return;
      if (current) current.removeAttribute('aria-current');
      a.setAttribute('aria-current', 'true');
      current = a;
    });
  }, { rootMargin: '-30% 0px -60% 0px' });
  Object.keys(links).forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
})();
