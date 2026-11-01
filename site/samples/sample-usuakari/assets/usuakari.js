/* うすあかり研究所（架空）見本  usuakari.js
   署名の動き: 「透過の層」の半透明の面が、スクロールに合わせてゆっくり数ピクセルずれる（自動では動かない）。
   JSが動かなくても面は重なった状態で読める。動きを減らす設定では動かさない。 */
(function () {
  'use strict';
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var els = Array.prototype.slice.call(document.querySelectorAll('.layered, .planes'));
  if (!els.length) return;
  var ticking = false;
  function update() {
    var vh = window.innerHeight;
    els.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      var s = ((r.top + r.height / 2) - vh / 2) / vh;
      el.style.setProperty('--s', Math.max(-1, Math.min(1, s)).toFixed(3));
    });
    ticking = false;
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
})();
