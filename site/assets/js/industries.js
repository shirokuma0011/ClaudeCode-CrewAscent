/* =====================================================================
   業種からタイプを探す（industries.html）

   ・入力した文字で業種をしぼり込む
   ・該当0件のときは、その旨と全件へ戻す方法を出す
   ・JSが無くても全業種がそのまま読める。これは上乗せの機能

   検索結果は読み上げでも分かるよう、件数を aria-live で伝える。
   ===================================================================== */
(function () {
  'use strict';

  var q = document.querySelector('[data-occ-q]');
  var out = document.querySelector('[data-occ-n]');
  if (!q) return;

  var items = Array.prototype.slice.call(document.querySelectorAll('[data-occ]'));
  var secs = Array.prototype.slice.call(document.querySelectorAll('section[id^="c-"]'));
  if (!items.length) return;

  /* ひらがな・カタカナの違いで外れないよう、カタカナへ寄せて比べる */
  function norm(s) {
    return String(s).toLowerCase().replace(/[ぁ-ゖ]/g, function (c) {
      return String.fromCharCode(c.charCodeAt(0) + 0x60);
    }).replace(/[Ａ-Ｚａ-ｚ０-９]/g, function (c) {
      return String.fromCharCode(c.charCodeAt(0) - 0xFEE0);
    }).replace(/[\s・、,]/g, '');
  }

  function apply() {
    var v = norm(q.value.trim());
    var hit = 0;
    items.forEach(function (li) {
      var name = norm(li.getAttribute('data-occ'));
      var kana = norm(li.getAttribute('data-occ-kana') || '');
      var types = norm(li.textContent);
      var ok = !v || name.indexOf(v) >= 0 || kana.indexOf(v) >= 0 || types.indexOf(v) >= 0;
      li.hidden = !ok;
      if (ok) hit++;
    });
    /* 中身が全部消えた分類は、見出しごと隠す */
    secs.forEach(function (s) {
      var any = s.querySelector('[data-occ]:not([hidden])');
      s.hidden = !any;
    });
    if (out) {
      out.textContent = !v ? ''
        : (hit ? hit + '件が該当します。' : '該当する業種がありません。入力を消すと全部に戻ります。');
    }
  }

  /* 狭い画面では、分類の見出しだけを並べ、押して開く。広い画面は最初から全部開いている。
     位置指定（#c-…）で来たときは、その分類だけ開いた状態にする */
  var folds = Array.prototype.slice.call(document.querySelectorAll('details.occ-fold'));
  var narrow = window.matchMedia && window.matchMedia('(max-width: 759px)').matches;
  if (narrow && folds.length) {
    folds.forEach(function (d) { d.open = false; });
    var all = document.querySelector('[data-fold-all]');
    if (all) all.textContent = 'すべて開く';
    if (location.hash) {
      var t = null;
      try { t = document.querySelector(location.hash); } catch (e) { t = null; }
      var d0 = t && t.querySelector && t.querySelector('details.occ-fold');
      if (d0) d0.open = true;
    }
  }
  /* しぼり込み中は、該当のある分類を開いて見せる */
  var applyBase = apply;
  apply = function () {
    applyBase();
    if (q.value.trim()) {
      folds.forEach(function (d) { if (d.querySelector('[data-occ]:not([hidden])')) d.open = true; });
    }
  };

  q.addEventListener('input', apply);
  q.addEventListener('search', apply);
  apply();
}());
