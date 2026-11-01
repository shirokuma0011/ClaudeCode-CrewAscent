/* はなしば英会話（架空）見本  hanashiba.js  v1
   1) 上部ナビで、いま読んでいる章（現在地）を吹き出しの色で示す
   2) 吹き出しの形の要素が、画面に入ったときに1回だけふわっと出る
   JSが動かなくても、すべての文章は読める。動きを減らす設定では 2) を行わない。 */
(function () {
  'use strict';
  if (!('IntersectionObserver' in window)) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 1) 現在地 */
  var links = {};
  document.querySelectorAll('.head-nav a[data-nav]').forEach(function (a) { links[a.getAttribute('data-nav')] = a; });
  var current = null;
  var spy = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var id = e.target.id;
      if (current === id) return;
      if (current && links[current]) links[current].removeAttribute('aria-current');
      if (links[id]) links[id].setAttribute('aria-current', 'true');
      current = id;
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  Object.keys(links).concat(['top']).forEach(function (id) { var s = document.getElementById(id); if (s) spy.observe(s); });

  /* 2) 吹き出しが出る */
  if (reduce) return;
  var targets = document.querySelectorAll('.card, .talk li, .news, .ways > div, .three li');
  document.documentElement.classList.add('can-pop');
  var pop = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      pop.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  targets.forEach(function (el, i) {
    el.classList.add('pop');
    el.style.transitionDelay = (i % 4) * 70 + 'ms';
    pop.observe(el);
  });
})();
