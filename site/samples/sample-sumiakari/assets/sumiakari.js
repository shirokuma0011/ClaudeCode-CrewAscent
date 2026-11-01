/* 書の教室 墨灯（架空） 見本サイト  sumiakari.js
   ・一筆（署名の動き）: 最初の画面で筆の線を一度だけ書き、落款を押す
   ・章の縦書き見出しを、行ごとに静かに出す（1回）
   何も送信しない。JSがなくても全文が読める。 */
(function () {
  'use strict';
  var targets = document.querySelectorAll('.hero__stroke, .sec__head');
  if (!('IntersectionObserver' in window)) {
    targets.forEach(function (t) { t.classList.add('is-in'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.25 });
  targets.forEach(function (t) { io.observe(t); });
})();
