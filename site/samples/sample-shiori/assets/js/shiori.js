/* しおり会計事務所（架空）見本 v4
   1) 署名の動き「栞が下りる」は CSS のみ（最初の画面の写真に、赤い栞が一度だけ下りる）
   2) 状況の質問: 答えに合う「聞くこと」「用意するもの」だけを1行ずつ出す（送信しない・端末の中だけ）
   3) 印刷: 結果・持ち物リストだけを印刷用に整える（print CSS）
   JSが動かないときは、すべての項目がそのまま表示される */
(function () {
  'use strict';
  var doc = document.documentElement;
  doc.classList.add('js');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- 2) 状況で絞り込む（質問チャート・持ち物リスト共通） ---- */
  var LABEL = {
    s: { start: '開業前後', indiv: '個人事業主', corp: '法人' },
    b: { yes: '帳簿はつけている', no: '帳簿はまだ', unsure: '帳簿は分からない' },
    q: { deadline: '気になるのは申告の期限', invoice: '気になるのはインボイス', incorp: '気になるのは法人化', labor: '気になるのは記帳の手間' }
  };
  document.querySelectorAll('[data-filter]').forEach(function (form) {
    var target = document.getElementById(form.getAttribute('data-filter'));
    if (!target) return;
    var sit = target.querySelector('[data-sit]');
    var apply = function (animate) {
      var val = {};
      ['s', 'b', 'q'].forEach(function (k) {
        var c = form.querySelector('input[name="' + k + '"]:checked');
        if (c) val[k] = c.value;
      });
      target.querySelectorAll('[data-s],[data-b],[data-q]').forEach(function (li) { li.hidden = false; });
      target.querySelectorAll('.lines, .checks').forEach(function (list) {
        var i = 0;
        Array.prototype.forEach.call(list.children, function (li) {
          var ok = ['s', 'b', 'q'].every(function (k) {
            var want = li.getAttribute('data-' + k);
            return !want || !val[k] || want.split(' ').indexOf(val[k]) > -1;
          });
          /* まだ何も選んでいないときは、全員に共通の項目だけを出す */
          if (!Object.keys(val).length && (li.hasAttribute('data-s') || li.hasAttribute('data-b') || li.hasAttribute('data-q'))) ok = false;
          li.hidden = !ok;
          li.classList.remove('in');
          if (ok && animate && !reduce) { li.style.setProperty('--i', i++); void li.offsetWidth; li.classList.add('in'); }
        });
      });
      if (sit) {
        var parts = Object.keys(val).map(function (k) { return LABEL[k][val[k]]; });
        sit.textContent = parts.length ? 'あなたの状況: ' + parts.join('／') : 'まだ選ばれていません。いまは、どの状況にも共通の項目だけを表示しています。';
      }
    };
    form.addEventListener('change', function () { apply(true); });
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    apply(false);
    /* 入口のタブから来たとき */
    document.querySelectorAll('[data-pick]').forEach(function (a) {
      a.addEventListener('click', function () {
        var r = form.querySelector('input[name="s"][value="' + a.getAttribute('data-pick') + '"]');
        if (r) { r.checked = true; apply(true); }
      });
    });
  });

  /* ---- 3) 印刷 ---- */
  document.querySelectorAll('[data-print]').forEach(function (b) {
    b.addEventListener('click', function () { window.print(); });
  });
})();
