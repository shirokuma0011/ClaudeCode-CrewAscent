/* hair salon ミナモ（架空）— 見本サイトの動き
   1) スクロールで、KVの線がわずかに流れる（transform のみ・画面外では計算しない）
   2) メニューの絞り込み（押した位置から波紋が一度だけ広がる）
   署名の動き「ツヤの光」は CSS だけで一度だけ再生する。
   動きを減らす設定では 1) と波紋を出さない。JSがなくても全文が読める。 */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ヘッダーの下線（スクロールしたら罫を出す） */
  var hd = document.querySelector('[data-hd]');
  function onScrollHd() { if (hd) hd.classList.toggle('is-scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScrollHd, { passive: true });
  onScrollHd();

  /* 1) 線がわずかに流れる（表紙の水色の面の中だけ） */
  var drifts = Array.prototype.slice.call(document.querySelectorAll('.drift'));
  if (!reduce && drifts.length) {
    var host = drifts[0].closest('section');
    var visible = true, ticking = false;
    if ('IntersectionObserver' in window && host) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(host);
    }
    var apply = function () {
      ticking = false;
      if (!visible) return;
      var y = Math.min(window.scrollY, 900);
      drifts.forEach(function (g, i) {
        g.style.transform = 'translate3d(' + (-y * 0.05) + 'px,' + (y * 0.035 * (i % 2 ? 1 : 0.6)) + 'px,0)';
      });
    };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(apply); } }, { passive: true });
  }

  /* 2) メニューの絞り込み */
  var box = document.querySelector('[data-filter]');
  if (box) {
    var rows = Array.prototype.slice.call(document.querySelectorAll('.mtable tbody tr'));
    var status = document.querySelector('[data-filter-status]');
    var names = { all: 'すべてのメニュー', short: '「時間がない」に合うメニュー', gloss: '「ツヤを出したい」に合うメニュー', color: '「色を変えたい」に合うメニュー' };
    box.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-f]');
      if (!b) return;
      var f = b.getAttribute('data-f');
      box.querySelectorAll('button[data-f]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      var n = 0;
      rows.forEach(function (r) {
        var show = f === 'all' || (' ' + r.getAttribute('data-tags') + ' ').indexOf(' ' + f + ' ') > -1;
        r.hidden = !show; if (show) n++;
      });
      if (status) status.textContent = names[f] + '（' + n + '件）を表示しています。';
      if (!reduce) {
        var rect = b.getBoundingClientRect();
        var x = (e.clientX || rect.left + rect.width / 2) - rect.left;
        var y = (e.clientY || rect.top + rect.height / 2) - rect.top;
        var s = document.createElement('span');
        s.className = 'ripple'; s.setAttribute('aria-hidden', 'true');
        s.style.left = x + 'px'; s.style.top = y + 'px';
        b.appendChild(s);
        requestAnimationFrame(function () { s.classList.add('go'); });
        setTimeout(function () { s.remove(); }, 900);
      }
    });
  }
})();
