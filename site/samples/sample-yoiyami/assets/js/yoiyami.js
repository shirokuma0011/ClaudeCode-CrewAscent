/* よいやみ醸造（架空）見本 — 署名の動き「宵のグラデーション」と、味わいチャートの切り替え
   ・JSが動かなくても、すべての文章は読める（空は夕暮れの色のまま）
   ・動きを減らす設定では、空は宵の色で固定（CSS側で固定し、ここでは何もしない） */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 宵の空: スクロール量 0→1 を --p に。CSSは宵の層の opacity にだけ使う */
  if (!reduce) {
    var ticking = false;
    var update = function () {
      ticking = false;
      var max = Math.max(1, root.scrollHeight - window.innerHeight);
      var p = Math.min(1, Math.max(0, window.scrollY / (max * 0.8)));
      root.style.setProperty('--p', p.toFixed(3));
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* 味わいチャート: 銘柄ボタンで1つだけ強調する（押し直すと全部表示） */
  var chart = document.querySelector('[data-chart]');
  if (chart) {
    var keys = document.querySelectorAll('[data-focus-key]');
    keys.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var k = btn.getAttribute('data-focus-key');
        var on = chart.getAttribute('data-focus') !== k;
        if (on) chart.setAttribute('data-focus', k); else chart.removeAttribute('data-focus');
        keys.forEach(function (b) { b.setAttribute('aria-pressed', String(on && b === btn)); });
      });
    });
  }
})();
