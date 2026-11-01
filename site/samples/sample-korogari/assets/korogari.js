/* ころがり商会（架空）見本  korogari.js
   現在地の表示: いま読んでいる章を、ヘッダーの案内に下線で示す（短い切り替えだけ。自動では動かない）。
   JSが動かなくても、すべての情報は読める。 */
(function () {
  'use strict';
  var links = {};
  document.querySelectorAll('.head-nav a[href^="#"]').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
  if (!('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var a = links[e.target.id];
      Object.keys(links).forEach(function (k) { links[k].classList.remove('is-current'); links[k].removeAttribute('aria-current'); });
      if (a) {
        a.classList.add('is-current'); a.setAttribute('aria-current', 'location');
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  Object.keys(links).concat(['top']).forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
})();
