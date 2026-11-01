/* 書の教室 墨灯（架空） 見本サイト v3  sumiakari.js
   署名の動き（一画が書かれ、落款が押される）は CSS だけで1回。
   ここでは補助の動き: 縦書きの章見出しが、画面に入ったら行ごとに静かに現れる（1回）。
   JSがなくても全文が読める（.js が付いたときだけ隠してから出す）。 */
(function () {
  'use strict';
  var items = document.querySelectorAll('.ttl');
  if (!('IntersectionObserver' in window)) {
    items.forEach(function (t) { t.classList.add('is-in'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.2 });
  items.forEach(function (t) { io.observe(t); });
})();
