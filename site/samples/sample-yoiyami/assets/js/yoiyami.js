/* よいやみ醸造（架空）見本 v3
   署名の動き「宵のグラデーション」: スクロール量で、藍の面の色を夕暮れの紫 → 宵の藍 → 深い夜へ移す（--sky）。
   最初の画面の写真にも宵の層を重ねていく（--dusk-o）。
   補助の動き: ラベルが画面に入ったとき1回だけ回って止まる／味わいチャートの銘柄の強調。
   JSが動かなくても全文が読める（色は宵の藍で固定）。動きを減らす設定では何も動かさない。 */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!reduce) {
    root.classList.add('js');
    /* 夕暮れの紫寄りの藍 → 宵の藍 → 深い夜。文字（泡の色）とのコントラストはどの段階も 9:1 以上 */
    var stops = [[46, 33, 66], [20, 26, 51], [13, 17, 38]];
    var mix = function (a, b, t) { return a.map(function (v, i) { return Math.round(v + (b[i] - v) * t); }); };
    var ticking = false;
    var update = function () {
      ticking = false;
      var max = Math.max(1, root.scrollHeight - window.innerHeight);
      var p = Math.min(1, Math.max(0, window.scrollY / max));
      var c = p < .5 ? mix(stops[0], stops[1], p / .5) : mix(stops[1], stops[2], (p - .5) / .5);
      root.style.setProperty('--sky', 'rgb(' + c.join(',') + ')');
      var h = Math.min(1, window.scrollY / Math.max(1, window.innerHeight * .9));
      root.style.setProperty('--dusk-o', (.12 + h * .5).toFixed(3));
    };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    update();

    /* ラベルが画面に入ったら1回だけ回る */
    var spins = document.querySelectorAll('.will-spin');
    if ('IntersectionObserver' in window && spins.length) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
      }, { threshold: .35 });
      spins.forEach(function (el) { io.observe(el); });
    } else { spins.forEach(function (el) { el.classList.add('is-in'); }); }
  }

  /* 味わいチャート: 銘柄ボタンで1つだけ強調（押し直すと全部表示） */
  var chart = document.querySelector('[data-chart]');
  if (chart) {
    var keys = document.querySelectorAll('[data-focus-key]');
    keys.forEach(function (btn) {
      btn.hidden = false;
      btn.addEventListener('click', function () {
        var k = btn.getAttribute('data-focus-key');
        var on = chart.getAttribute('data-focus') !== k;
        if (on) chart.setAttribute('data-focus', k); else chart.removeAttribute('data-focus');
        keys.forEach(function (b) { b.setAttribute('aria-pressed', String(on && b === btn)); });
      });
    });
  }
})();
